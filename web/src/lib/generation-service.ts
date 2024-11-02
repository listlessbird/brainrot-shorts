import { db } from "@/db/db";
import { getGenerationByConfigId } from "@/db/db-fns";
import { generationsTable } from "@/db/schema";
import { makeSignedUrl } from "@/lib/r2";
import { GenerationState } from "@/types";
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
      captions: generation.captions_url
        ? {
            url: generation.captions_url,
            signedUrl: await makeSignedUrl(
              this.r2,
              generation.captions_url.split(".com/")[1],
              this.bucketName
            ),
          }
        : undefined,
      status: generation.status,
      error: generation.error as string | undefined,
    };
  }

  async updateGenerationState(id: string, state: Partial<GenerationState>) {
    await db
      .update(generationsTable)
      .set({
        speechUrl: state.speech?.url,
        captions_url: state.captions?.url,
        images: state.images,
        status: state.status,
        error: state.error,
      })
      .where(eq(generationsTable.id, id));
  }
}
