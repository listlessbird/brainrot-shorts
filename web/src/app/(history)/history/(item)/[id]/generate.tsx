"use client";

import { useState, useTransition, useEffect } from "react";
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
import { Loader2, AlertCircle, CheckCircle2, RefreshCcw } from "lucide-react";
import { GeneratedAssetType } from "@/types";

interface GenerationError {
  error: string;
  details?: string;
  recoverable?: boolean;
}

const statusMessages = {
  starting: "Preparing to start video generation...",
  retrying: (count: number) => `Attempt ${count} of 3 to retry generation...`,
  rendering: (frames: number) => `Rendering video... (${frames} frames)`,
  encoding: (frames: number) => `Encoding video... (${frames} frames)`,
  complete: "Video generation completed!",
  processing: "Processing...",
  error: "An error occurred during generation.",
};

export function Generate({ asset }: { asset: GeneratedAssetType }) {
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<GenerationError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  function setStatusMessage(stage: string, details?: any) {
    switch (stage) {
      case "STARTING":
        setStatus(statusMessages.starting);
        break;
      case "RENDERING":
        setStatus(statusMessages.rendering(details?.renderedFrames));
        break;
      case "ENCODING":
        setStatus(statusMessages.encoding(details?.encodedFrames));
        break;
      case "COMPLETE":
        setStatus(statusMessages.complete);
        setUrl(details?.signedUrl || "");
        break;
      default:
        setStatus(statusMessages.processing);
    }
  }

  async function handleGeneration(isRetry = false) {
    if (!isRetry) resetState();
    else {
      setRetryCount((prev) => prev + 1);
      setStatus(statusMessages.retrying(retryCount + 1));
      setError(null);
    }

    startTransition(async () => {
      try {
        const stream = await startGeneration({ asset });
        const reader = stream.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const data = JSON.parse(new TextDecoder().decode(value));
          console.table({ data });
          setProgress(data.progress ?? progress);
          setStatusMessage(data.stage, data.details);
        }
      } catch (err) {
        const errorDetails = err as GenerationError;
        setError({
          error: errorDetails.error || statusMessages.error,
          details: errorDetails.details,
          recoverable: errorDetails.recoverable,
        });
        setStatus(statusMessages.error);
      }
    });
  }

  function resetState() {
    setProgress(0);
    setStatus(statusMessages.starting);
    setError(null);
    setUrl("");
    setRetryCount(0);
  }

  const canRetry = error?.recoverable || retryCount < 3;
  const isRetrying = error?.recoverable && retryCount < 3;

  return (
    <Card className="w-full mt-8">
      <CardHeader>
        <CardTitle>Generate Video</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isPending || progress > 0 ? (
            <p>
              Video generation is in progress. Please be patient, as this may
              take several minutes.
            </p>
          ) : (
            <p>No video generated yet. Click the button below to start.</p>
          )}

          <Button
            onClick={() => handleGeneration(false)}
            disabled={isPending || progress === 100 || isRetrying}
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isRetrying ? `Retrying (${retryCount}/3)...` : "Generating..."}
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
              <AlertDescription className="space-y-2">
                <p>{error.error}</p>
                {error.details && (
                  <p className="text-sm opacity-80">{error.details}</p>
                )}
                {canRetry && (
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGeneration(true)}
                      disabled={isRetrying}
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Retry Generation
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {url && !error && (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success</AlertTitle>
              <AlertDescription className="text-green-700">
                Video generation completed successfully! Your video is ready to
                view.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>

      {url && (
        <CardFooter>
          <video
            controls
            className="w-full rounded-lg shadow-lg"
            onError={() => {
              setError({
                error: "Failed to load video.",
                details:
                  "The video could not be played. Please try regenerating.",
                recoverable: true,
              });
            }}
          >
            <source src={url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </CardFooter>
      )}
    </Card>
  );
}
