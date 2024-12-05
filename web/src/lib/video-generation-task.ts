import { storeScript } from "@/db/db-fns";
import { User } from "@/db/schema";
import { GenerationService } from "@/lib/generation-service";
import {
  generateCaptions,
  generateImages,
  generateScriptWithAI,
  synthesizeSpeech,
  uploadAudioToR2,
  uploadCaptionsToR2,
} from "@/lib/generation-utils";
import { r2 } from "@/lib/r2";
import { Progress } from "@/lib/send-progress";
import { CreateVideoScriptConfig } from "@/lib/validations";
import { GenerationState, GenerationStateItems } from "@/types";

const { GOOGLE_API_KEY } = process.env;

const MAX_ITERATIONS = 3;
const STAGE_TIMEOUT = 5 * 60 * 1000;

function runWithTimeout<T>(
  callback: () => Promise<T>,
  timeoutMs: number = STAGE_TIMEOUT
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Stage timeout")), timeoutMs);
  });
  return Promise.race([callback(), timeoutPromise]);
}

export async function videoGenerationTask(
  generationId: string,
  validated: CreateVideoScriptConfig,
  user: User
) {
  const generationService = new GenerationService(r2);
  let state = await generationService.getOrCreateGenerationState(
    generationId,
    user.googleId
  );

  console.log("Initial state:", state);

  const stageCompletionCallbackMap: Record<
    GenerationStateItems,
    (
      state: GenerationState,
      generationId: string
    ) => Promise<Partial<GenerationState>>
  > = {
    script: async (state: GenerationState, generationId: string) => {
      await Progress.phase(generationId, "Script Generation");
      const { object } = await generateScriptWithAI(validated, generationId);
      const scriptId = await storeScript(
        object.scenes,
        generationId,
        user.googleId
      );
      await Progress.success(
        generationId,
        "Script generation completed successfully"
      );
      return {
        script: { scenes: object.scenes, scriptId },
        status: "script_ready",
      };
    },
    speech: async (state: GenerationState, generationId: string) => {
      if (!state.script) {
        throw new Error("Script must be generated before speech synthesis");
      }

      await Progress.phase(generationId, "Synthesizing Speech");
      const fullText = state.script.scenes.map((s) => s.textContent).join(" ");
      const speech = await synthesizeSpeech(
        fullText,
        GOOGLE_API_KEY!,
        generationId
      );
      const audioUploadResult = await uploadAudioToR2(
        speech.audioContent,
        generationId
      );
      return {
        speech: {
          url: audioUploadResult.url,
          signedUrl: audioUploadResult.signedUrl,
        },
        status: "speech_ready",
      };
    },
    images: async (state: GenerationState, generationId: string) => {
      if (!state.script) {
        throw new Error("Script must be generated before image generation");
      }

      await Progress.phase(generationId, "Generating Images");
      const missingImagePrompts = state.script.scenes
        .map((s) => s.imagePrompt)
        .slice(state.images?.length || 0);

      const newImages = await generateImages(missingImagePrompts, generationId);
      return {
        images: [...(state.images || []), ...newImages],
        status: "images_ready",
      };
    },
    captions: async (state: GenerationState, generationId: string) => {
      if (!state.script || !state.speech) {
        throw new Error("Script and speech must be generated before captions");
      }

      await Progress.phase(generationId, "Generating Captions");
      const captions = await generateCaptions(
        state.speech.signedUrl,
        generationId
      );

      if (captions.words) {
        const captionUpload = await uploadCaptionsToR2(
          captions.words,
          generationId
        );
        return {
          captions: {
            url: captionUpload.url,
            signedUrl: captionUpload.signedUrl,
          },
          status: "captions_ready",
        };
      }
      return {
        status: "failed",
        error: "No captions generated",
      };
    },
  };

  let iterationCount = 0;

  try {
    while (
      !generationService.isStateComplete(state) &&
      iterationCount < MAX_ITERATIONS
    ) {
      iterationCount++;
      console.log(`Starting iteration ${iterationCount}/${MAX_ITERATIONS}`);

      const missingStages = generationService.getMissingStages(state);
      console.log("Missing stages:", missingStages);

      for (const stage of missingStages) {
        try {
          console.log(`Executing stage: ${stage}`);
          const cb = stageCompletionCallbackMap[stage];

          const stageResult = await runWithTimeout(async () =>
            cb(state, generationId)
          );

          const updatedState = {
            ...state,
            ...stageResult,
            id: state.id,
          };

          await generationService.updateGenerationState(
            generationId,
            updatedState
          );
          state = updatedState;

          console.log(`Stage ${stage} completed. New state:`, state);

          await Progress.success(
            generationId,
            `${stage.charAt(0).toUpperCase() + stage.slice(1)} stage completed`
          );
        } catch (stageError) {
          console.error(`Error in stage ${stage}:`, stageError);

          const errorState = {
            ...state,
            status: "failed" as const,
            error:
              stageError instanceof Error
                ? stageError.message
                : "Unknown error in stage",
          };

          await generationService.updateGenerationState(state.id, errorState);
          state = errorState;

          await Progress.error(
            generationId,
            `Generation failed at ${stage} stage: ${state.error}`
          );

          throw stageError;
        }
      }
    }

    if (iterationCount >= MAX_ITERATIONS) {
      const error = "Maximum generation iterations exceeded";
      const errorState = {
        ...state,
        status: "failed" as const,
        error,
      };
      await generationService.updateGenerationState(state.id, errorState);
      state = errorState;
      await Progress.error(generationId, error);
      throw new Error(error);
    }

    if (generationService.isStateComplete(state)) {
      const completeState = {
        ...state,
        status: "complete" as const,
      };
      await generationService.updateGenerationState(state.id, completeState);
      state = completeState;
      await Progress.success(generationId, "Generation completed successfully");
    }
  } catch (error) {
    console.error("Fatal error in video generation:", error);

    const errorState = {
      ...state,
      status: "failed" as const,
      error: error instanceof Error ? error.message : "Unknown error",
    };

    await generationService.updateGenerationState(state.id, errorState);
    state = errorState;
    await Progress.error(generationId, `Generation failed: ${state.error}`);
    throw error;
  }

  return state;
}
