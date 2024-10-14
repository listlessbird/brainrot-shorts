"use server";

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

      while (true) {
        const { value, done } = await reader.read();
        console.log(value);
        if (done) {
          controller.close();
          break;
        }

        const string = new TextDecoder().decode(value);
        const lines = string.split("\n\n");
        console.log(lines);
        for (const line of lines) {
          console.log(line);
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
          }
        }
      }
    },
  });

  return stream;
}
