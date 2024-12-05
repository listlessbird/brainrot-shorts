"use server";

import {
  createVideConfigSchema,
  CreateVideoScriptConfig,
} from "@/lib/validations";
import {
  getConfigByParams,
  getGenerationByConfigId,
  storeConfig,
} from "@/db/db-fns";
import { getCurrentSession } from "@/lib/auth";
import { Progress } from "@/lib/send-progress";
import { videoGenerationTask } from "@/lib/video-generation-task";

const generateSessionId = () => `session-${crypto.randomUUID().slice(0, 4)}`;

export async function createVideoScriptAction(values: CreateVideoScriptConfig) {
  const { user } = await getCurrentSession();

  if (!user || !user.googleId) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  console.log(
    "Starting createVideoScriptAction",
    JSON.stringify({ values, user }, null, 2)
  );

  let generationId: string | null = null;
  let isComplete = false;
  try {
    const validated = createVideConfigSchema.parse(values);

    const existingConfig = await getConfigByParams(validated, user.googleId);
    console.log("existingConfig:", existingConfig);
    if (existingConfig) {
      console.log(
        "existingConfig.config.configId:",
        existingConfig.config.configId
      );

      const existingGeneration = await getGenerationByConfigId(
        existingConfig.config.configId,
        user.googleId
      );

      if (existingGeneration?.status === "complete") {
        isComplete = true;
      }
    }

    generationId =
      existingConfig?.config.configId ||
      (await storeConfig(generateSessionId(), validated, user.googleId));

    videoGenerationTask(generationId, validated, user).catch((error) => {
      console.error("Error in videoGenerationTask:", error);
      Progress.error(
        generationId!,
        `Error in video generation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    });
    return { generationId, isComplete };
  } catch (error) {
    console.error("Error in createVideoScriptAction:", error);
    if (generationId) {
      await Progress.error(
        generationId,
        `Error in video generation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
    throw error;
  }
}
