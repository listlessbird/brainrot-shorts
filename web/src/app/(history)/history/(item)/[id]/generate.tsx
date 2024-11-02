"use client";

import { useState, useTransition } from "react";
import { startGeneration } from "@/app/(history)/history/(item)/[id]/action";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { GeneratedAssetType } from "@/types";

export function Generate({ asset }: { asset: GeneratedAssetType }) {
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  async function handleGeneration() {
    setProgress(0);
    setStatus("Starting...");
    setError("");
    setUrl("");

    startTransition(async () => {
      try {
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
            setError(data.error);
            setStatus("Error");
          }
        }
      } catch (err) {
        console.error("Error during generation:", err);
        setError("An unexpected error occurred during generation.");
        setStatus("Error");
      }
    });
  }

  return (
    <Card className="w-full mt-8">
      <CardHeader>
        <CardTitle>Generate Video</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p>
            Video for this generation is not generated yet. <br /> Click the
            button below to generate it.
          </p>
          <Button
            onClick={handleGeneration}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Video"
            )}
          </Button>
          {(status || progress > 0) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{status}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {url && !error && (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success</AlertTitle>
              <AlertDescription className="text-green-700">
                Video generation completed successfully!
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      {url && (
        <CardFooter>
          <video controls className="w-full rounded-lg shadow-lg">
            <source src={url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </CardFooter>
      )}
    </Card>
  );
}
