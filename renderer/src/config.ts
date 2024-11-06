export const CONFIG = {
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || "development",
  VERSION: process.env.VERSION || "1.0.0",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
} as const;
