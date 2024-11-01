import { db } from "@/db/db";
import { getGenerationByConfigId } from "@/db/db-fns";
import { generationsTable } from "@/db/schema";
import { S3Client } from "@aws-sdk/client-s3";

export class GenerationService {
  constructor(
    private readonly r2: S3Client,
    private readonly bucketName: string = process.env.BUCKET_NAME!
  ) {}

  async getOrCreateGenerationState(configId: string, userGoogleId: string) {
    const generation = await getGenerationByConfigId(configId, userGoogleId);

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
  }
}
