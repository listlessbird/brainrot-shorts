import { Elysia, t } from "elysia";
import { VideoService } from "../services/video.service";
import { logger } from "../logger";
import { GeneratedAssetSchema } from "../schema";
import { AppError, handleError } from "../utils/error";
import Stream from "@elysiajs/stream";

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

        const progressQueue: number[] = [];
        let done = false;
        let error: Error | null = null;

        function getNextProgress() {
          if (progressQueue.length > 0) {
            return Promise.resolve(progressQueue.shift()!);
          }

          return new Promise<number>((resolve) => {
            function checkQueue() {
              if (progressQueue.length > 0) {
                resolve(progressQueue.shift()!);
              } else if (done) {
                resolve(-1);
              } else {
                setTimeout(checkQueue, 1000);
              }
            }
            checkQueue();
          });
        }

        videoService
          .renderVideo(body, async (progress) => {
            progressQueue.push(progress);
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
            const progress = await getNextProgress();

            if (progress >= 0) {
              yield formatSSE({
                progress: Math.round(progress),
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
