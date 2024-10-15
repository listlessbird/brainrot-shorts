"use server";

import { storeGeneratedVideo } from "@/db/db-fns";
import { uploadVideoToR2 } from "@/lib/r2";
import { GeneratedAssetType } from "@/types";

export async function startGeneration({
  asset,
}: {
  asset: GeneratedAssetType;
}) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start: async (controller) => {
      const response = await fetch(
        `http://localhost:3001/render/${asset.configId}/`,
        { method: "POST", body: JSON.stringify(asset) }
      );

      if (!response.body) {
        controller.close();
        return;
      }

      const reader = response.body.getReader();
      let videoPath: string | null = null;

      while (true) {
        const { value, done } = await reader.read();
        // console.log(value);
        if (done) {
          // controller.close();
          break;
        }

        const string = new TextDecoder().decode(value);
        const lines = string.split("\n\n");
        console.log(lines);
        for (const line of lines) {
          console.log(line);
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.path) {
              videoPath = data.path;
            }

            controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
          }
        }
      }

      if (videoPath) {
        try {
          controller.enqueue(
            encoder.encode(JSON.stringify({ status: "Uploading to R2..." }))
          );

          console.log({ videoPath });

          const { url, signedUrl } = await uploadVideoToR2(
            `http://localhost:3001/assets/${asset.configId}`,
            asset.configId!
          ).then(async ({ key, signedUrl, url }) => {
            const storedUrl = await storeGeneratedVideo({
              r2Url: url,
              configId: asset.configId!,
            });

            console.log("Stored db record", storedUrl);

            return { dbUrl: storedUrl, key, signedUrl, url };
          });

          controller.enqueue(
            encoder.encode(
              JSON.stringify({ status: "Upload complete", signedUrl }) + "\n"
            )
          );
        } catch (error) {
          console.error("Error uploading to R2:", error);
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ error: "Failed to upload to R2" }) + "\n"
            )
          );
        }
      } else {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ error: "Video generation failed" }) + "\n"
          )
        );
      }
      controller.close();
    },
  });

  return stream;
}
