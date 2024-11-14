import { Elysia } from "elysia";
import { type HealthCheckResponse } from "../types";
import { CONFIG } from "../config";
import { VideoStatusService } from "../services/video-status.service";
import { handleError } from "../utils/error";

export function setupHealthRoutes(app: Elysia) {
  const statusService = new VideoStatusService();
  const startTime = Date.now();

  return app
    .get("/health", (): HealthCheckResponse => {
      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        version: CONFIG.VERSION,
        uptime: Date.now() - startTime,
      };
    })
    .get("/health/redis", async ({ set }) => {
      try {
        await statusService.redis.ping();
        return { status: "healthy" };
      } catch (error) {
        const apperror = handleError(error);
        set.status = 503;
        return { status: "unhealthy", error: apperror.message };
      }
    });
}
