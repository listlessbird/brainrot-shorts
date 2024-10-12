import { registerRoot } from "remotion";
import { GeneratedAssetSchema } from "./schema";
import { z } from "zod";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import path from "node:path";

async function renderVideo(
  data: z.infer<typeof GeneratedAssetSchema>
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
  });

  return outputLocation;
}

const server = Bun.serve({
  port: 3001,
  async fetch(req) {
    if (req.method === "POST") {
      const body = await req.json();
      console.log(body);
      try {
        const videoPath = await renderVideo(body);
        return new Response(JSON.stringify({ videoPath }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Error rendering video:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response("Method not allowed", { status: 405 });
    }
  },
});

console.log(`Listening on http://localhost:${server.port} ...`);
