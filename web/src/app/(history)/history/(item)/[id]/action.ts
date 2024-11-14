"use server";
import { storeGeneratedVideo } from "@/db/db-fns";
import { validateRequest } from "@/lib/auth";
import { uploadVideoToR2 } from "@/lib/r2";
import { GeneratedAssetType } from "@/types";
import { revalidatePath } from "next/cache";

const TIMEOUT_MS = 10 * 60 * 1000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;
const CONNECTION_TIMEOUT_MS = 30000;

class GenerationError extends Error {
  constructor(message: string, public readonly details?: any) {
    super(message);
    this.name = "GenerationError";
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  attempts = RETRY_ATTEMPTS
): Promise<Response> {
  console.log(
    `[fetchWithRetry] Attempt ${RETRY_ATTEMPTS - attempts + 1} for URL: ${url}`
  );

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      CONNECTION_TIMEOUT_MS
    );

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  } catch (error) {
    console.log(`[fetchWithRetry] Error during fetch:`, error);

    if (error instanceof Error && error.name === "AbortError") {
      throw new GenerationError("Connection timeout exceeded");
    }

    if (attempts <= 1) {
      throw new GenerationError("Failed to connect to renderer service", error);
    }

    console.log(`[fetchWithRetry] Retrying in ${RETRY_DELAY_MS}ms`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return fetchWithRetry(url, options, attempts - 1);
  }
}

export async function startGeneration({
  asset,
}: {
  asset: GeneratedAssetType;
}) {
  console.log(`[startGeneration] Starting generation for asset:`, asset);
  const { user } = await validateRequest();
  if (!user) throw new Error("Unauthorized");

  const encoder = new TextEncoder();
  let abortController: AbortController | null = null;

  const stream = new ReadableStream({
    start: async (controller) => {
      const sendError = (error: unknown) => {
        console.log(`[stream] Sending error:`, error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              error: "Generation failed",
              details: errorMessage,
              recoverable: error instanceof GenerationError,
            }) + "\n"
          )
        );
      };

      const sendStatus = (status: string, data = {}) => {
        console.log(`[stream] Sending status: ${status}`, data);
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              status,
              ...data,
            }) + "\n"
          )
        );
      };

      try {
        abortController = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log(`[stream] Timeout reached after ${TIMEOUT_MS}ms`);
          abortController?.abort();
        }, TIMEOUT_MS);

        // First, start the render process
        const renderResponse = await fetchWithRetry(
          `${process.env.RENDERER_URL}/render/${asset.configId}`,
          {
            method: "POST",
            body: JSON.stringify(asset),
            headers: {
              "Content-Type": "application/json",
            },
            signal: abortController.signal,
          }
        );

        if (!renderResponse.ok) {
          throw new GenerationError("Failed to start render process");
        }

        // Then connect to progress stream
        const progressResponse = await fetchWithRetry(
          `${process.env.RENDERER_URL}/progress/${asset.configId}`,
          {
            headers: {
              Accept: "text/event-stream",
              Connection: "keep-alive",
              "Cache-Control": "no-cache",
            },
            signal: abortController.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!progressResponse.body) {
          throw new GenerationError("No response body received from renderer");
        }

        const reader = progressResponse.body.getReader();
        let buffer = "";
        let lastEventTime = Date.now();
        let lastProgress = 0;
        let lastStage = "STARTING";

        const heartbeatInterval = setInterval(() => {
          const now = Date.now();
          if (now - lastEventTime > 30000) {
            clearInterval(heartbeatInterval);
            controller.error(
              new GenerationError("Connection stalled - no data received")
            );
          }
        }, 5000);

        try {
          while (true) {
            const { value, done } = await reader.read();

            if (done) break;

            lastEventTime = Date.now();
            buffer += new TextDecoder().decode(value, { stream: true });
            const messages = buffer.split("\n\n");
            buffer = messages.pop() || "";

            for (const message of messages) {
              if (!message.startsWith("data: ")) continue;

              try {
                const data = JSON.parse(message.slice(6));
                console.log(`[stream] Received message:`, data);

                if (data.progress) lastProgress = data.progress;
                if (data.stage) lastStage = data.stage;

                if (data.error) {
                  throw new GenerationError(data.error);
                }

                if (data.status === "complete") {
                  sendStatus("Uploading to R2...", {
                    progress: Math.min(lastProgress + 5, 99),
                    stage: lastStage,
                    status: "Uploading to storage...",
                  });

                  const { url, signedUrl } = await uploadVideoToR2(
                    `${process.env.RENDERER_URL}/assets/${asset.configId}`,
                    asset.configId!
                  );

                  await storeGeneratedVideo({
                    r2Url: url,
                    configId: asset.configId!,
                    userGoogleId: user.googleId,
                  });

                  sendStatus("complete", {
                    signedUrl,
                    progress: 100,
                    stage: "COMPLETE",
                  });
                  revalidatePath(`/history/${asset.configId}`);
                  break;
                } else {
                  controller.enqueue(
                    encoder.encode(JSON.stringify(data) + "\n")
                  );
                }
              } catch (error) {
                console.log(
                  `[stream] Error processing message:`,
                  error,
                  message
                );
                if (error instanceof GenerationError) {
                  sendError(error);
                  return;
                }
                continue;
              }
            }
          }
        } finally {
          clearInterval(heartbeatInterval);
        }
      } catch (error) {
        console.log(`[stream] Fatal stream error:`, error);
        sendError(error);
      } finally {
        controller.close();
      }
    },

    cancel() {
      console.log(`[stream] Stream cancelled by client`);
      abortController?.abort();
    },
  });

  return stream;
}
