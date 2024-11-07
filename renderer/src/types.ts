import { z } from "zod";
import { GeneratedAssetSchema } from "./schema";
import { t, type Static } from "elysia";

export type VideoGenerationRequest = Static<typeof GeneratedAssetSchema>;
export type ProgressCallback = (data: ProgressData) => Promise<void>;

export interface HealthCheckResponse {
  status: "ok";
  timestamp: string;
  version: string;
  uptime: number;
}

export type ProgressStage = "STARTING" | "RENDERING" | "ENCODING" | "COMPLETE";

export type ProgressData = {
  progress: number;
  stage: ProgressStage;
  details?: {
    renderedFrames: number;
    encodedFrames?: number;
    renderedDoneIn?: number;
    encodedDoneIn?: number;
  };
};
