import { Elysia } from "elysia";
import { logger } from "./logger";
import { CONFIG } from "./config";
import { setupVideoRoutes } from "./controllers/video.controller";
import { setupHealthRoutes } from "./controllers/health.controller";
import { setupErrorHandling } from "./middleware/error.middleware";

const app = new Elysia()
  .use(setupErrorHandling)
  .use(setupHealthRoutes)
  .use(setupVideoRoutes)
  .listen(CONFIG.PORT);

logger.info({ port: CONFIG.PORT, env: CONFIG.NODE_ENV }, "Server started");

process.on("uncaughtException", (error) => {
  logger.fatal({ error }, "Uncaught Exception");
  console.error(error);
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  logger.fatal({ error }, "Unhandled Rejection");
  console.error(error);
  process.exit(1);
});

export type App = typeof app;
