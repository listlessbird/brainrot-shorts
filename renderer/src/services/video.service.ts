import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { type VideoGenerationRequest, type ProgressCallback } from "../types";
import { logger } from "../logger";
import { AppError, handleError } from "../utils/error";
import type { BunFile } from "bun";

export class VideoService {
  private readonly outputDir: string;

  constructor() {
    this.outputDir = path.join(process.cwd(), "output");
  }

  async renderVideo(
    data: VideoGenerationRequest,
    progressCallback: ProgressCallback
  ): Promise<string> {
    logger.info({ configId: data.configId }, "Starting video generation");

    try {
      const captions = await this.fetchCaptions(data.captionsUrl);
      const inputProps = { ...data, captions };

      const bundled = await this.bundleProject(progressCallback);
      const composition = await this.getVideoComposition(bundled, inputProps);
      const outputPath = await this.renderToFile(
        composition,
        bundled,
        inputProps,
        data.configId,
        progressCallback
      );

      logger.info(
        { configId: data.configId, outputPath },
        "Video generation completed"
      );
      return outputPath;
    } catch (error) {
      const appError = handleError(error);
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

  private async bundleProject(
    progressCallback: ProgressCallback
  ): Promise<string> {
    try {
      return await bundle({
        entryPoint: path.join(process.cwd(), "./src/remotion/index.ts"),
        onProgress: async (progress: number) => {
          logger.debug({ progress }, "Bundling progress");
          await progressCallback(progress / 2);
        },
      });
    } catch (error) {
      const appError = handleError(error);
      logger.error({ error: appError }, "Bundling failed");
      throw new AppError(
        `Bundling failed: ${appError.message}`,
        "BUNDLE_ERROR",
        500
      );
    }
  }

  private async getVideoComposition(bundled: string, inputProps: any) {
    try {
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
    configId: string,
    progressCallback: ProgressCallback
  ): Promise<string> {
    const outputLocation = path.join(this.outputDir, `${configId}.mp4`);

    try {
      await mkdir(this.outputDir, { recursive: true });

      await renderMedia({
        composition,
        serveUrl: bundled,
        codec: "h264",
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

          await progressCallback(50 + progress * 50);
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
      const videoPath = path.join(this.outputDir, `${configId}.mp4`);
      const file = Bun.file(videoPath);

      if (await file.exists()) {
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
