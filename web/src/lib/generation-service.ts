import { db } from "@/db/db";
import { getGenerationByConfigId } from "@/db/db-fns";
import { generationsTable, GenerationStatus } from "@/db/schema";
import { makeSignedUrl } from "@/lib/r2";
import { GenerationState, GenerationStateItems } from "@/types";
import { S3Client } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";

export class GenerationService {
  constructor(
    private readonly r2: S3Client,
    private readonly bucketName: string = process.env.BUCKET_NAME!
  ) {}

  async getOrCreateGenerationState(
    configId: string,
    userGoogleId: string
  ): Promise<GenerationState> {
    const generation = await getGenerationByConfigId(configId, userGoogleId);

    console.log("getOrCreateGenerationState:", generation);

    if (!generation) {
      const id = `gen-${crypto.randomUUID().slice(0, 4)}`;

      await db.insert(generationsTable).values({
        id,
        configId,
        userGoogleId,
        status: "pending",
      });

      return { id, status: "pending" };
    }

    return {
      id: generation.id,
      script: generation.generatedScript
        ? {
            scenes: generation.generatedScript.script,
            scriptId: generation.generatedScript.id,
          }
        : undefined,
      speech: generation.speechUrl
        ? {
            url: generation.speechUrl,
            signedUrl: await makeSignedUrl(
              this.r2,
              generation.speechUrl.split(".com/")[1],
              this.bucketName
            ),
          }
        : undefined,
      images: generation.images,
      captions: generation.captionsUrl
        ? {
            url: generation.captionsUrl,
            signedUrl: await makeSignedUrl(
              this.r2,
              generation.captionsUrl.split(".com/")[1],
              this.bucketName
            ),
          }
        : undefined,
      status: generation.status,
      error: generation.error as string | undefined,
    };
  }

  async updateGenerationState(
    generationId: string,
    state: Partial<GenerationState>
  ) {
    if (state.script?.scriptId) {
      const dbState = await db
        .update(generationsTable)
        .set({
          speechUrl: state.speech?.url,
          captionsUrl: state.captions?.url,
          images: state.images,
          status: state.status,
          error: state.error,
          scriptId: state.script?.scriptId,
        })
        .where(eq(generationsTable.id, generationId))
        .returning();
      console.log("<-----------dbState ---->");
      console.log("dbState:", dbState);
    }

    const dbState = await db
      .update(generationsTable)
      .set({
        speechUrl: state.speech?.url,
        captionsUrl: state.captions?.url,
        images: state.images,
        status: state.status,
        error: state.error,
      })
      .where(eq(generationsTable.id, generationId))
      .returning();

    console.log("<-----------dbState ---->");
    console.log("dbState:", dbState);
  }

  isStateComplete(state: GenerationState): boolean {
    return !!(
      state.script &&
      state.speech &&
      state.images &&
      state.images.length === state.script.scenes.length &&
      state.captions
    );
  }

  getMissingStages(state: GenerationState): Array<GenerationStateItems> {
    const stages: Array<GenerationStateItems> = [
      "script",
      "speech",
      "images",
      "captions",
    ];

    return stages.filter((stage) => {
      switch (stage) {
        case "script":
          return !state.script;
        case "speech":
          return !state.speech;
        case "images":
          return (
            !state.images ||
            (state.script && state.images.length < state.script.scenes.length)
          );
        case "captions":
          return !state.captions;
        default:
          return false;
      }
    });
  }

  async executeStage(
    stage: GenerationStateItems | "error",
    state: GenerationState,
    generationId: string,
    stageCallback: (
      state: GenerationState,
      generationId: string
    ) => Promise<GenerationState>
  ) {
    if (stage === "error") {
      return {
        ...state,
        status: this.getStatusForStage("error"),
      };
    }

    try {
      const newState = await stageCallback(state, generationId);
      const updatedState = {
        ...state,
        ...newState,
        status: this.getStatusForStage(stage),
      };

      await this.updateGenerationState(state.id, updatedState);

      return updatedState;
    } catch (error) {
      console.error(`Error executing stage ${stage}:`, error);
      throw error;
    }
  }

  private getStatusForStage(
    stage: GenerationStateItems | "error"
  ): GenerationStatus {
    const stageStatusMap: Record<
      GenerationStateItems | "error",
      GenerationStatus
    > = {
      script: "script_ready",
      speech: "speech_ready",
      images: "images_ready",
      captions: "complete",
      error: "failed",
    };
    return stageStatusMap[stage];
  }
}
