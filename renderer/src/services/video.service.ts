import { getCompositions, renderMedia } from "@remotion/renderer";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { type VideoGenerationRequest, type ProgressCallback } from "../types";
import { logger } from "../logger";
import { AppError, handleError } from "../utils/error";
import type { BunFile } from "bun";
import { ProgressService } from "./progress.service";
import { VideoStatusService } from "./video-status.service";

export class VideoService {
  private readonly outputDir: string;
  private readonly progressService: ProgressService;
  private readonly statusService: VideoStatusService;

  private readonly bundled: string;
  constructor(bundled: string) {
    this.outputDir = path.join(process.cwd(), "output");
    this.progressService = new ProgressService();
    this.statusService = new VideoStatusService();
    this.bundled = bundled;
  }

  async renderVideo(data: VideoGenerationRequest): Promise<string> {
    logger.info({ configId: data.configId }, "Starting video generation");

    const existingStatus = await this.statusService.getVideoStatus(
      data.configId
    );

    if (existingStatus?.status === "COMPLETED" && existingStatus.path) {
      const file = Bun.file(existingStatus.path);
      if (await file.exists()) {
        logger.info(
          { configId: data.configId },
          "Video already exitst, skipping rendering"
        );

        return existingStatus.path;
      }
    }

    await this.statusService.setVideoStatus({
      configId: data.configId,
      status: "PENDING",
    });

    try {
      const captions = await this.fetchCaptions(data.captionsUrl);
      const inputProps = { ...data, captions };
      const composition = await this.getVideoComposition(
        this.bundled,
        inputProps
      );
      const outputPath = await this.renderToFile(
        composition,
        this.bundled,
        inputProps,
        data.configId
      );

      await this.statusService.setVideoStatus({
        configId: data.configId,
        status: "COMPLETED",
        path: outputPath,
        // lastAccessed: Date.now(),
      });

      await this.progressService.publishProgress(data.configId, {
        progress: 100,
        stage: "COMPLETE",
      });

      logger.info(
        { configId: data.configId, outputPath },
        "Video generation completed"
      );
      return outputPath;
    } catch (error) {
      const appError = handleError(error);

      await this.statusService.setVideoStatus({
        configId: data.configId,
        status: "FAILED",
        error: appError.message,
      });

      logger.error(
        { error: appError, configId: data.configId },
        "Video generation failed"
      );

      throw appError;
    }
  }

  private async fetchCaptions(url: string): Promise<any> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new AppError(
          `Failed to fetch captions: ${response.statusText}`,
          "CAPTIONS_FETCH_ERROR",
          500
        );
      }
      const text = await response.text();
      return JSON.parse(text);
    } catch (error) {
      const appError = handleError(error);
      logger.error({ error: appError, url }, "Captions fetch failed");
      throw new AppError(
        `Captions fetch failed: ${appError.message}`,
        "CAPTIONS_FETCH_ERROR",
        500
      );
    }
  }

  private async getVideoComposition(bundled: string, inputProps: any) {
    try {
      console.log("bundled", bundled);

      const comps = await getCompositions(bundled, { inputProps });
      const composition = comps.find((c) => c.id === "VideoGeneration");

      if (!composition) {
        throw new AppError(
          "VideoGeneration composition not found",
          "COMPOSITION_NOT_FOUND",
          404
        );
      }
      return composition;
    } catch (error) {
      const appError = handleError(error);
      logger.error({ error: appError }, "Composition setup failed");
      throw new AppError(
        `Composition setup failed: ${appError.message}`,
        "COMPOSITION_ERROR",
        500
      );
    }
  }

  private async renderToFile(
    composition: any,
    bundled: string,
    inputProps: any,
    configId: string
  ): Promise<string> {
    const outputLocation = path.join(this.outputDir, `${configId}.mp4`);

    try {
      await mkdir(this.outputDir, { recursive: true });

      await renderMedia({
        composition,
        serveUrl: bundled,
        codec: "h265",
        outputLocation,
        inputProps,
        timeoutInMilliseconds: 30 * 1000,
        onProgress: async ({
          progress,
          stitchStage,
          renderedFrames,
          renderedDoneIn,
          encodedFrames,
          encodedDoneIn,
        }) => {
          logger.debug(
            {
              progress,
              stitchStage,
              renderedFrames,
              encodedFrames,
              renderedDoneIn,
              encodedDoneIn,
            },
            "Rendering progress"
          );

          const stage = stitchStage === "encoding" ? "RENDERING" : "ENCODING";

          await this.progressService.publishProgress(configId, {
            progress: 50 + progress * 50,
            stage,
            details: {
              renderedFrames,
              encodedFrames,
              // @ts-ignore
              renderedDoneIn,
              // @ts-ignore
              encodedDoneIn,
            },
          });
        },
      });

      return outputLocation;
    } catch (error) {
      const appError = handleError(error);
      logger.error({ error: appError, outputLocation }, "Rendering failed");
      throw new AppError(
        `Video rendering failed: ${appError.message}`,
        "RENDER_ERROR",
        500
      );
    }
  }

  async getVideoFile(configId: string): Promise<BunFile | null> {
    try {
      // const videoPath = path.join(this.outputDir, `${configId}.mp4`);
      // const file = Bun.file(videoPath);

      const status = await this.statusService.getVideoStatus(configId);

      if (!status?.path) {
        return null;
      }

      const file = Bun.file(status.path);

      if (await file.exists()) {
        await this.statusService.updateLastAccessed(configId);
        return file;
      }
      return null;
    } catch (error) {
      const appError = handleError(error);
      logger.error({ error: appError, configId }, "Error accessing video file");
      throw new AppError(
        `Error accessing video file: ${appError.message}`,
        "FILE_ACCESS_ERROR",
        500
      );
    }
  }
}
