"use client";

import { startGeneration } from "@/app/(main)/history/[id]/action";
import { Button } from "@/components/ui/button";
import { GeneratedAssetType } from "@/types";
import { useState, useTransition } from "react";

export function Generate({ asset }: { asset: GeneratedAssetType }) {
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [url, setUrl] = useState("");
  async function handleGeneration() {
    setProgress(0);
    setStatus("Starting...");

    startTransition(async () => {
      const stream = await startGeneration({ asset });
      const reader = stream.getReader();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const data = JSON.parse(new TextDecoder().decode(value));

        console.log(data);

        if (data.progress) {
          setProgress(data.progress);
        }

        if (data.status) {
          setStatus(data.status);
        }

        if (data.path) {
          console.log("Data at", data.path);
          setStatus(`Data at ${data.path}`);
        }

        if (data.signedUrl) {
          console.log("SignedUrl", data.signedUrl);
          setUrl(data.signedUrl);
        }

        if (data.error) {
          console.error("Error", data.error);
          setStatus("Error");
        }
      }
    });
  }

  return (
    <div>
      <Button onClick={handleGeneration} disabled={isPending}>
        {isPending ? "Generating..." : "Generate"}
      </Button>
      <div className="p-4">
        <p>Status: {status}</p>
        <p>Progress: {progress}%</p>
      </div>
      {url.length > 1 && (
        <video controls className="w-full">
          <source src={url} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
