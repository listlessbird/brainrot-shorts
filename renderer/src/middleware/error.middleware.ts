import { Elysia } from "elysia";
import { logger } from "../logger";
import { handleError } from "../utils/error";

export function setupErrorHandling(app: Elysia) {
  return app
    .onBeforeHandle(({ request }) => {
      logger.info(
        {
          method: request.method,
          url: request.url,
        },
        "Incoming request"
      );
    })
    .onAfterHandle(({ request }) => {
      logger.info(
        {
          method: request.method,
          url: request.url,
        },
        "Incoming request"
      );
    })
    .onError(({ code, error, set }) => {
      const appError = handleError(error);
      logger.error({ error: appError, code }, "Request error");

      set.status = appError.statusCode;

      return {
        error: appError.message,
        code: appError.code,
        timestamp: new Date().toISOString(),
      };
    });
}
