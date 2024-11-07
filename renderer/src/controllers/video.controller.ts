import { Elysia, t } from "elysia";
import { VideoService } from "../services/video.service";
import { logger } from "../logger";
import { GeneratedAssetSchema } from "../schema";
import { AppError, handleError } from "../utils/error";
import Stream from "@elysiajs/stream";
import type { ProgressData } from "../types";

export function setupVideoRoutes(app: Elysia) {
  const videoService = new VideoService();
  return app
    .post(
      "/render/:configId",
      async function* ({ body, set }) {
        set.headers = {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
        };

        function formatSSE(data: any) {
          return `data: ${JSON.stringify(data)}\n\n`;
        }

        const progressQueue: ProgressData[] = [];
        let done = false;
        let error: Error | null = null;

        function getNextProgress(): Promise<ProgressData | null> {
          if (progressQueue.length > 0) {
            return Promise.resolve(progressQueue.shift()!);
          }

          return new Promise<ProgressData | null>((resolve) => {
            function checkQueue() {
              if (progressQueue.length > 0) {
                resolve(progressQueue.shift()!);
              } else if (done) {
                resolve(null);
              } else {
                setTimeout(checkQueue, 1000);
              }
            }

            checkQueue();
          });
        }

        videoService
          .renderVideo(body, async (progressData) => {
            progressQueue.push(progressData);
          })
          .then(() => {
            done = true;
          })
          .catch((err) => {
            error = err;
            done = true;
          });

        try {
          while (!done) {
            const progressData = await getNextProgress();

            if (progressData && progressData.details) {
              yield formatSSE({
                progress: Math.round(progressData.progress),
                stage: progressData.stage,
                details: progressData.details,
              });
            } else if (progressData) {
              yield formatSSE({
                progress: Math.round(progressData.progress),
                stage: progressData.stage,
              });
            }
          }

          if (error) {
            console.error(error);
            const appError = handleError(error);
            logger.error(
              { error: appError },
              `Rendering failed for session ${body.configId}`
            );

            yield formatSSE({
              error: appError.message,
              code: appError.code,
              status: "failed",
            });
          } else {
            yield formatSSE({
              progress: 100,
              status: "complete",
              path: `/assets/${body.configId}`,
            });
          }
        } catch (error) {
          const appError = handleError(error);
          logger.error({ error: appError }, "Stream setup failed");
          console.error(error);
          set.status = appError.statusCode;

          yield formatSSE({
            error: appError.message,
            code: appError.code,
          });
        }
      },
      {
        body: GeneratedAssetSchema,
      }
    )
    .get("/assets/:configId", async ({ params: { configId }, set }) => {
      try {
        logger.info({ configId }, "Serving video");
        const file = await videoService.getVideoFile(configId);
        if (!file) {
          set.status = 404;
          return {
            error: "File not found",
            code: "FILE_NOT_FOUND",
          };
        }
        set.headers = {
          "content-type": "video/mp4",
          "content-length": file.size.toString(),
          "content-disposition": "inline",
          "accept-ranges": "bytes",
        };
        const stream = file.stream();

        return new Response(stream);
      } catch (error) {
        const appError = handleError(error);
        logger.error({ error: appError, configId }, "Error serving video");
        set.status = appError.statusCode;
        return {
          error: appError.message,
          code: appError.code,
        };
      }
    });
}
