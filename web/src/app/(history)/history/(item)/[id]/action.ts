"use server";
import { storeGeneratedVideo } from "@/db/db-fns";
import { validateRequest } from "@/lib/auth";
import { uploadVideoToR2 } from "@/lib/r2";
import { GeneratedAssetType } from "@/types";
import { revalidatePath } from "next/cache";

const TIMEOUT_MS = 5 * 60 * 1000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  attempts = RETRY_ATTEMPTS
): Promise<Response> {
  console.log(
    `[fetchWithRetry] Attempt ${RETRY_ATTEMPTS - attempts + 1} for URL: ${url}`
  );
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      console.log(
        `[fetchWithRetry] Failed attempt with status: ${response.status}`
      );
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    console.log(`[fetchWithRetry] Successful response received`);
    return response;
  } catch (error) {
    console.log(`[fetchWithRetry] Error during fetch:`, error);
    if (attempts <= 1) throw error;
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
  if (!user) {
    console.log(`[startGeneration] Authorization failed - no user found`);
    throw new Error("Unauthorized");
  }
  console.log(`[startGeneration] User authorized:`, user.googleId);

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

        console.log(
          `[stream] Initiating renderer request to ${process.env.RENDERER_URL}/render/${asset.configId}/`
        );
        const response = await fetchWithRetry(
          `${process.env.RENDERER_URL}/render/${asset.configId}/`,
          {
            method: "POST",
            body: JSON.stringify(asset),
            headers: {
              "Content-Type": "application/json",
              Accept: "text/event-stream",
              Connection: "keep-alive",
              "Cache-Control": "no-cache",
            },
            signal: abortController.signal,
          }
        );

        clearTimeout(timeoutId);
        console.log(`[stream] Renderer response received`);

        if (!response.body) {
          console.log(`[stream] No response body received from renderer`);
          throw new Error("No response body received from renderer");
        }

        const reader = response.body.getReader();
        let buffer = "";
        let lastEventTime = Date.now();

        const heartbeatInterval = setInterval(() => {
          const now = Date.now();
          console.log(
            `[stream] Heartbeat check - Time since last event: ${
              now - lastEventTime
            }ms`
          );
          if (now - lastEventTime > 30000) {
            console.log(
              `[stream] Connection stalled - no data received for 30s`
            );
            clearInterval(heartbeatInterval);
            controller.error(
              new Error("Connection stalled - no data received")
            );
          }
        }, 5000);

        try {
          while (true) {
            const { value, done } = await reader.read();

            if (done) {
              console.log(`[stream] Reader completed`);
              break;
            }
            lastEventTime = Date.now();

            buffer += new TextDecoder().decode(value, { stream: true });
            const messages = buffer.split("\n\n");
            buffer = messages.pop() || "";

            for (const message of messages) {
              if (!message.startsWith("data: ")) continue;

              try {
                const data = JSON.parse(message.slice(6));
                console.log(`[stream] Received message:`, data);

                if (data.error) {
                  console.log(`[stream] Renderer error:`, data.error);
                  sendError(data.error);
                  return;
                }

                if (data.path) {
                  const lastProgress = data.progress || 0;
                  const lastStage = data.stage || "ENCODING";
                  console.log(
                    `[stream] Upload stage - Progress: ${lastProgress}, Stage: ${lastStage}`
                  );

                  sendStatus("Uploading to R2...", {
                    progress: Math.min(lastProgress + 5, 99),
                    stage: lastStage,
                    status: "Uploading to storage...",
                  });

                  try {
                    console.log(
                      `[stream] Starting R2 upload for configId:`,
                      asset.configId
                    );
                    const { url, signedUrl } = await uploadVideoToR2(
                      `${process.env.RENDERER_URL}/assets/${asset.configId}`,
                      asset.configId!
                    );
                    console.log(`[stream] R2 upload complete - URL:`, url);

                    console.log(`[stream] Storing video in database`);
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
                    console.log(
                      `[stream] Generation complete for configId:`,
                      asset.configId
                    );
                  } catch (error) {
                    console.log(`[stream] R2 upload error:`, error);
                    sendError(error);
                  }
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
                continue;
              }
            }
          }
        } finally {
          clearInterval(heartbeatInterval);
          console.log(`[stream] Stream processing completed`);
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
