import { randomUUID } from "crypto";
import { db } from "@/db/db";
import { configTable, generatedScriptsTable, generationsTable } from "./schema";
import { eq, and } from "drizzle-orm";
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
