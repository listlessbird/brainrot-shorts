import { randomUUID } from "crypto";
import { db } from "@/db/db";
import { configTable, generatedScriptsTable, generationsTable } from "./schema";
import { eq, and, desc } from "drizzle-orm";
import { CreateVideoScriptConfig } from "@/lib/validations";

export async function storeConfig(
  configId: string,
  config: CreateVideoScriptConfig
): Promise<string> {
  await db.insert(configTable).values({
    id: configId,
    topic: config.topic,
    duration: config.duration,
    style: config.style,
  });
  return configId;
}

export async function storeScript(
  script: { imagePrompt: string; textContent: string }[],
  configId: string
): Promise<string> {
  const scriptId = randomUUID();
  await db.insert(generatedScriptsTable).values({
    id: scriptId,
    script: script,
  });
  await db
    .update(configTable)
    .set({ scriptId })
    .where(eq(configTable.id, configId));
  return scriptId;
}

export async function storeGeneration(data: {
  speechUrl: string;
  captionsUrl: string | null;
  images: string[];
  configId: string;
  scriptId: string;
}): Promise<string> {
  const generationId = randomUUID();
  await db.insert(generationsTable).values({
    id: generationId,
    speechUrl: data.speechUrl,
    captions_url: data.captionsUrl ?? "",
    images: data.images,
    configId: data.configId,
    scriptId: data.scriptId,
  });
  return generationId;
}

export async function storeGeneratedVideo({
  r2Url,
  configId,
}: {
  r2Url: string;
  configId: string;
}) {
  return db
    .update(generationsTable)
    .set({ video_url: r2Url })
    .where(eq(generationsTable.configId, configId))
    .returning({ url: generationsTable.video_url });
}

export async function getConfigByParams(params: CreateVideoScriptConfig) {
  const result = await db
    .select({
      config: configTable,
      script: generatedScriptsTable,
    })
    .from(configTable)
    .leftJoin(
      generatedScriptsTable,
      eq(configTable.scriptId, generatedScriptsTable.id)
    )
    .where(
      and(
        eq(configTable.topic, params.topic),
        eq(configTable.duration, params.duration),
        eq(configTable.style, params.style)
      )
    )
    .limit(1);

  return result[0];
}

export async function getGenerationByConfigId(configId: string) {
  const result = await db
    .select()
    .from(generationsTable)
    .where(eq(generationsTable.configId, configId))
    .limit(1);

  return result[0];
}

export async function getGenerationById(id: string) {
  const result = await db
    .select({
      generation: generationsTable,
      config: configTable,
      script: generatedScriptsTable,
    })
    .from(generationsTable)
    .leftJoin(configTable, eq(generationsTable.configId, configTable.id))
    .leftJoin(
      generatedScriptsTable,
      eq(generationsTable.scriptId, generatedScriptsTable.id)
    )
    .where(eq(generationsTable.id, id))
    .limit(1);

  return result[0];
}

export async function getAllGenerations() {
  const listGenerationsQuery = db
    .select({
      id: generationsTable.id,
      images: generationsTable.images,
      configId: generationsTable.configId,
      topic: configTable.topic,
      duration: configTable.duration,
    })
    .from(generationsTable)
    .leftJoin(configTable, eq(generationsTable.configId, configTable.id))
    .leftJoin(
      generatedScriptsTable,
      eq(generationsTable.scriptId, generatedScriptsTable.id)
    )
    .orderBy(desc(generationsTable.createdAt));

  return listGenerationsQuery;
}

export async function getAllGenerationsByConfigId(configId: string) {
  const result = await db
    .select({
      id: generationsTable.id,
      createdAt: generationsTable.createdAt,
      speechUrl: generationsTable.speechUrl,
      captionsUrl: generationsTable.captions_url,
      videoUrl: generationsTable.video_url,
      images: generationsTable.images,
      configId: generationsTable.configId,
      scriptId: generationsTable.scriptId,
      topic: configTable.topic,
      duration: configTable.duration,
      style: configTable.style,
      script: generatedScriptsTable.script,
    })
    .from(configTable)
    .leftJoin(
      generatedScriptsTable,
      eq(generatedScriptsTable.id, configTable.scriptId)
    )
    .leftJoin(generationsTable, eq(generationsTable.configId, configTable.id))
    .where(eq(configTable.id, configId))
    .limit(1);
  return result[0];
}
