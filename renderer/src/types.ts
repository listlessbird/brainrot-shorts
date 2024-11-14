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

export type ProgressStage =
  | "STARTING"
  | "RENDERING"
  | "ENCODING"
  | "COMPLETE"
  | "ERROR";

// export type ProgressData = {
//   progress: number;
//   stage: ProgressStage;
//   details?: {
//     renderedFrames: number;
//     encodedFrames?: number;
//     renderedDoneIn?: number;
//     encodedDoneIn?: number;
//   };
// };

type ProgressDetails = {
  renderedFrames: number;
  encodedFrames?: number;
  renderedDoneIn?: number;
  encodedDoneIn?: number;
};

type StageFields<T extends ProgressStage> = T extends "RENDERING" | "ENCODING"
  ? { details: ProgressDetails }
  : T extends "ERROR"
  ? { error: string }
  : {};

export type ProgressData<T extends ProgressStage = ProgressStage> = {
  progress: number;
  stage: T;
} & StageFields<T>;

export type VideoStatus = {
  configId: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  path?: string;
  lastAccessed?: number;
  error?: string;
};
