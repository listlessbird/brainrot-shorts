import { registerRoot } from "remotion";
import { GeneratedAssetSchema } from "./schema";
import { z } from "zod";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import path from "node:path";

async function renderVideo(
  data: z.infer<typeof GeneratedAssetSchema>,
  progressCallback: (progress: number) => void
): Promise<string> {
  const validatedData = GeneratedAssetSchema.parse(data);

  const captionsResponse = await fetch(validatedData.captionsUrl);
  const captionsText = await captionsResponse.text();
  const captions = JSON.parse(captionsText);

  const inputProps = {
    ...validatedData,
    captions,
  };

  const bundled = await bundle({
    entryPoint: path.join(process.cwd(), "./src/remotion/index.ts"),
    onProgress: (progress: number) => {
      console.log(`Webpack bundling progress: ${progress}%`);
      progressCallback(progress / 2);
    },
  });

  const comps = await getCompositions(bundled, {
    inputProps,
  });
  const composition = comps.find((c) => c.id === "VideoGeneration");

  console.log({ comps, composition });
  if (!composition) {
    throw new Error("Composition not found");
  }

  const outputLocation = path.join(
    import.meta.dir,
    `../output/${validatedData.configId}.mp4`
  );
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation,
    inputProps,
    timeoutInMilliseconds: 10 * 1000,
    onProgress: ({ progress }) => {
      console.log(`Rendering progress: ${progress}%`);
      progressCallback(50 + progress * 50);
    },
  });

  return outputLocation;
}

const server = Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    if (req.method === "POST" && pathname === "/render") {
      const body = await req.json();
      console.log(body);

      const responseStream = new TransformStream();
      const writer = responseStream.writable.getWriter();
      const encoder = new TextEncoder();

      async function sendProgress(progress: number) {
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ progress })}\n\n`)
        );
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
            await writer.write(
              encoder.encode(
                `data: ${JSON.stringify({
                  progress: 100,
                  status: "complete",
                  path: `/asset/${body.configId}`,
                })}\n\n`
              )
            );

            await writer.close();
          })
          .catch(async (error) => {
            console.error("Error rendering video:", error);
            await writer.write(
              encoder.encode(
                `data: ${JSON.stringify({ error: error.message })}\n\n`
              )
            );
            await writer.close();
          });
        return response;
      } catch (error) {
        console.error("Error setting up video rendering:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    } else if (req.method === "GET" && pathname.startsWith(`/assets/`)) {
      let configId = pathname.split("/").pop();
      // handle -> host/assets/id/
      if (!(configId && configId?.length > 1)) {
        const split = pathname.split("/");
        configId = split[split.length - 2];
      }

      const videoPath = path.join(process.cwd(), `output/${configId}.mp4`);

      console.log({ configId, videoPath, cwd: process.cwd() });

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
    } else {
      return new Response("Method not allowed", { status: 405 });
    }
  },
});

console.log(`Listening on http://localhost:${server.port} ...`);
