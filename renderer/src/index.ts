import { GeneratedAssetSchema } from "./schema";
import { z } from "zod";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import path from "node:path";
import { mkdir } from "node:fs/promises";

async function renderVideo(
  data: z.infer<typeof GeneratedAssetSchema>,
  progressCallback: (progress: number) => void
): Promise<string> {
  try {
    const validatedData = GeneratedAssetSchema.parse(data);

    let captions;
    try {
      const captionsResponse = await fetch(validatedData.captionsUrl);
      if (!captionsResponse.ok) {
        throw new Error(
          `Failed to fetch captions: ${captionsResponse.statusText}`
        );
      }
      const captionsText = await captionsResponse.text();
      captions = JSON.parse(captionsText);
    } catch (error) {
      console.error("Error fetching captions:", error);
      throw new Error(`Captions fetch failed: ${error.message}`);
    }

    const inputProps = {
      ...validatedData,
      captions,
    };

    let bundled;
    try {
      bundled = await bundle({
        entryPoint: path.join(process.cwd(), "./src/remotion/index.ts"),
        onProgress: (progress: number) => {
          console.log(`Webpack bundling progress: ${progress}%`);
          progressCallback(progress / 2);
        },
      });
    } catch (error) {
      console.error("Bundling error:", error);
      throw new Error(`Bundling failed: ${error.message}`);
    }

    let composition;
    try {
      const comps = await getCompositions(bundled, {
        inputProps,
      });
      composition = comps.find((c) => c.id === "VideoGeneration");

      if (!composition) {
        throw new Error("VideoGeneration composition not found");
      }
    } catch (error) {
      console.error("Composition error:", error);
      throw new Error(`Composition setup failed: ${error.message}`);
    }

    const outputLocation = path.join(
      import.meta.dir,
      `../output/${validatedData.configId}.mp4`
    );

    try {
      await mkdir(path.dirname(outputLocation), { recursive: true });
    } catch (error) {
      console.error("Directory creation error:", error);
      throw new Error(`Failed to create output directory: ${error.message}`);
    }

    try {
      await renderMedia({
        composition,
        serveUrl: bundled,
        codec: "h264",
        outputLocation,
        inputProps,
        timeoutInMilliseconds: 30 * 1000,
        onProgress: ({
          progress,
          stitchStage,
          renderedFrames,
          renderedDoneIn,
          encodedFrames,
          encodedDoneIn,
        }) => {
          if (stitchStage === "encoding") {
            console.log("Encoding...");
          } else if (stitchStage === "muxing") {
            console.log("Muxing audio...");
          }
          console.log(`${renderedFrames} rendered`);
          console.log(`${encodedFrames} encoded`);
          if (renderedDoneIn !== null) {
            console.log(`Rendered in ${renderedDoneIn}ms`);
          }
          if (encodedDoneIn !== null) {
            console.log(`Encoded in ${encodedDoneIn}ms`);
          }
          progressCallback(50 + progress * 50);
        },
      });
    } catch (error) {
      console.error("Rendering error:", error);
      throw new Error(`Video rendering failed: ${error.message}`);
    }

    return outputLocation;
  } catch (error) {
    console.error("Video generation error:", error);
    throw error;
  }
}

const server = Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    if (req.method === "POST" && pathname.startsWith("/render/")) {
      let body;
      try {
        body = await req.json();
        console.log("Received render request:", body.configId);
      } catch (error) {
        console.error("JSON parse error:", error);
        return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const responseStream = new TransformStream();
      const writer = responseStream.writable.getWriter();
      const encoder = new TextEncoder();

      async function sendProgress(progress: number) {
        try {
          await writer.write(
            encoder.encode(`data: ${JSON.stringify({ progress })}\n\n`)
          );
        } catch (error) {
          console.error("Error sending progress:", error);
        }
      }

      try {
        const response = new Response(responseStream.readable, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });

        renderVideo(body, sendProgress)
          .then(async (outPath) => {
            try {
              await writer.write(
                encoder.encode(
                  `data: ${JSON.stringify({
                    progress: 100,
                    status: "complete",
                    path: `/assets/${body.configId}`,
                  })}\n\n`
                )
              );
            } finally {
              await writer.close();
            }
          })
          .catch(async (error) => {
            console.error("Render process error:", error);
            try {
              await writer.write(
                encoder.encode(
                  `data: ${JSON.stringify({
                    error: error.message,
                    status: "failed",
                  })}\n\n`
                )
              );
            } finally {
              await writer.close();
            }
          });

        return response;
      } catch (error) {
        console.error("Stream setup error:", error);
        return new Response(
          JSON.stringify({
            error: "Internal server error",
            details: error.message,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } else if (req.method === "GET" && pathname.startsWith("/assets/")) {
      try {
        let configId = pathname.split("/").pop();
        if (!(configId && configId?.length > 1)) {
          const split = pathname.split("/");
          configId = split[split.length - 2];
        }

        const videoPath = path.join(process.cwd(), `output/${configId}.mp4`);
        console.log("Serving video:", { configId, videoPath });

        const file = Bun.file(videoPath);
        if (!file.exists()) {
          return new Response("File not found", { status: 404 });
        }

        const stream = file.stream();
        return new Response(stream, {
          headers: {
            "Content-Type": "video/mp4",
            "Content-Length": file.size.toString(),
          },
        });
      } catch (error) {
        console.error("Video serving error:", error);
        return new Response(
          JSON.stringify({
            error: "Error serving video",
            details: error.message,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } else {
      return new Response("Method not allowed", { status: 405 });
    }
  },
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
});

console.log(`Listening on http://localhost:${server.port} ...`);
