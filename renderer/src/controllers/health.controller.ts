import { Elysia } from "elysia";
import { type HealthCheckResponse } from "../types";
import { CONFIG } from "../config";

export function setupHealthRoutes(app: Elysia) {
  const startTime = Date.now();

  return app.get("/health", (): HealthCheckResponse => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: CONFIG.VERSION,
      uptime: Date.now() - startTime,
    };
  });
}
