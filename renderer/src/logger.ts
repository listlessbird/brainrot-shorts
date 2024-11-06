import { pino } from "pino";
import { CONFIG } from "./config";

export const logger = pino({
  level: "debug",
  transport:
    CONFIG.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
  base: {
    env: CONFIG.NODE_ENV,
    version: CONFIG.VERSION,
  },
});
