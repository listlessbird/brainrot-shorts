import { bundle } from "@remotion/bundler";
import path from "node:path";
import { logger } from "./logger";
import { AppError, handleError } from "./utils/error";
export async function bundleProject(): Promise<string> {
  try {
    return await bundle({
      entryPoint: path.join(process.cwd(), "./src/remotion/index.ts"),
      onProgress: async (progress: number) => {
        logger.debug({ progress }, "Bundling progress");
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
