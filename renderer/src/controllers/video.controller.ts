import { Elysia, t } from "elysia";
import { VideoService } from "../services/video.service";
import { logger } from "../logger";
import { GeneratedAssetSchema } from "../schema";
import { AppError, handleError } from "../utils/error";
import Stream from "@elysiajs/stream";
import type { ProgressData } from "../types";
import { ProgressService } from "../services/progress.service";
import { ctx } from "..";
export function setupVideoRoutes(app: Elysia) {
  const videoService = new VideoService(ctx.bundled);
  const progressService = new ProgressService();

  return app
    .post(
      "/render/:configId",
      async function ({ body, params: { configId } }) {
        videoService.renderVideo(body).catch((error) => {
          logger.error({ error, configId }, "Render process failed");
        });

        return {
          message: "Rendering started",
          progressUrl: `/progress/${configId}`,
        };
      },
      {
        body: GeneratedAssetSchema,
      }
    )
    .get(
      "/progress/:configId",
      async function* ({ params: { configId }, set }) {
        set.headers = {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
        };

        const formatSSE = (data: any) => `data: ${JSON.stringify(data)}\n\n`;

        yield `Sending sse from ${configId}`;

        const progressStream =
          progressService.subscribeToProgressUpdates(configId);

        try {
          for await (const progress of progressStream) {
            // if (set.socket?.destroyed) {
            //   logger.debug(
            //     { configId },
            //     "Client disconnected, stopping progress updates"
            //   );
            //   break;
            // }

            if (isErrorProgress(progress)) {
              yield formatSSE({
                error: progress.error,
                status: "failed",
              });
              break;
            }

            if (progress.stage === "COMPLETE") {
              yield formatSSE({
                progress: 100,
                status: "complete",
                path: `/assets/${configId}`,
              });
              break;
            }

            yield formatSSE(progress);
          }
        } catch (error) {
          const appError = handleError(error);
          logger.error(
            { error: appError, configId },
            "Error streaming progress"
          );
          set.status = appError.statusCode;
          yield formatSSE({
            error: appError.message,
            status: "failed",
            code: appError.code,
          });
        }
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
    })
    .get("/sse-test", async function* ({ set }) {
      if (process.env.NODE_ENV !== "development") {
        yield "Ok";
        return;
      }

      set.headers = {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      };

      for (let i = 0; i < 1000000; i++) {
        console.log("should be sending progress", i);

        yield `data: ${JSON.stringify({
          progress: i,
          stage: "RENDERING",
        })}\n\n`;
      }
    });
}

function isErrorProgress(
  progress: ProgressData
): progress is ProgressData<"ERROR"> {
  return progress.stage === "ERROR";
}
