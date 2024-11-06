import { z } from "zod";
import { GeneratedAssetSchema } from "./schema";
import { t, type Static } from "elysia";

export type VideoGenerationRequest = Static<typeof GeneratedAssetSchema>;
export type ProgressCallback = (progress: number) => Promise<void>;

export interface HealthCheckResponse {
  status: "ok";
  timestamp: string;
  version: string;
  uptime: number;
}
