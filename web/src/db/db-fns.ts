import { randomUUID } from "crypto";
import { db } from "@/db/db";
import {
  Config,
  configTable,
  GeneratedScript,
  generatedScriptsTable,
  Generation,
  generationsTable,
} from "./schema";
import { eq, and, desc } from "drizzle-orm";
import { CreateVideoScriptConfig } from "@/lib/validations";
import { config } from "process";
export async function storeConfig(
  configId: string,
  config: CreateVideoScriptConfig,
  userGoogleId: string
): Promise<string> {
  const result = await db
    .insert(configTable)
    .values({
      configId,
      topic: config.topic,
      duration: config.duration,
      style: config.style,
      userGoogleId,
    })
    .returning({ id: configTable.configId });
  return result[0].id;
}

export async function storeScript(
  script: { imagePrompt: string; textContent: string }[],
  configId: string,
  userGoogleId: string
): Promise<string> {
  const scriptId = randomUUID();
  await db.insert(generatedScriptsTable).values({
    id: scriptId,
    script: script,
    userGoogleId,
    configId,
  });

  return scriptId;
}

export async function storeGeneration(data: {
  speechUrl: string;
  captionsUrl: string | null;
  images: string[];
  configId: string;
  scriptId: string;
  userGoogleId: string;
}): Promise<string> {
  const generationId = randomUUID();
  await db.insert(generationsTable).values({
    id: generationId,
    speechUrl: data.speechUrl,
    captions_url: data.captionsUrl ?? "",
    images: data.images,
    configId: data.configId,
    scriptId: data.scriptId,
    userGoogleId: data.userGoogleId,
    video_url: null,
  });
  return generationId;
}

export async function storeGeneratedVideo({
  r2Url,
  configId,
  userGoogleId,
}: {
  r2Url: string;
  configId: string;
  userGoogleId: string;
}) {
  return db
    .update(generationsTable)
    .set({ video_url: r2Url })
    .where(
      and(
        eq(generationsTable.configId, configId),
        eq(generationsTable.userGoogleId, userGoogleId)
      )
    )
    .returning({ url: generationsTable.video_url });
}

export async function getGenerationById(id: string, userGoogleId: string) {
  const result = await db
    .select({
      generation: generationsTable,
      config: configTable,
      script: generatedScriptsTable,
    })
    .from(generationsTable)
    .leftJoin(configTable, eq(generationsTable.configId, configTable.configId))
    .leftJoin(
      generatedScriptsTable,
      eq(generationsTable.configId, configTable.configId)
    )
    .where(
      and(
        eq(generationsTable.id, id),
        eq(generationsTable.userGoogleId, userGoogleId)
      )
    )
    .limit(1);

  return result[0];
}

export async function getAllGenerations(userGoogleId: string) {
  const listGenerationsQuery = db
    .select({
      id: generationsTable.id,
      images: generationsTable.images,
      configId: generationsTable.configId,
      topic: configTable.topic,
      duration: configTable.duration,
    })
    .from(generationsTable)
    .leftJoin(configTable, eq(generationsTable.configId, configTable.configId))
    .leftJoin(
      generatedScriptsTable,
      eq(generationsTable.scriptId, generatedScriptsTable.id)
    )
    .where(eq(generationsTable.userGoogleId, userGoogleId))
    .orderBy(desc(generationsTable.createdAt));

  return listGenerationsQuery;
}

export async function getAllGenerationsByConfigId(
  configId: string,
  userGoogleId: string
) {
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
      eq(generatedScriptsTable.configId, configTable.configId)
    )
    .leftJoin(
      generationsTable,
      eq(generationsTable.configId, configTable.configId)
    )
    .where(
      and(
        eq(configTable.configId, configId),
        eq(configTable.userGoogleId, userGoogleId)
      )
    )
    .limit(1);
  return result[0];
}

export async function getConfigByParams(
  params: CreateVideoScriptConfig,
  userGoogleId: string
) {
  console.log("inside getConfigByParams:", params, "googleId", userGoogleId);

  const config = await db
    .select({
      config: configTable,
    })
    .from(configTable)
    .where(
      and(
        eq(configTable.topic, params.topic),
        eq(configTable.duration, params.duration),
        eq(configTable.style, params.style),
        eq(configTable.userGoogleId, userGoogleId)
      )
    );

  console.log("inside getConfigByParams:", config);

  if (!config.length) return null;
  return {
    config: config[0].config,
  };
}

export async function getGenerationByConfigId(
  configId: string,
  userGoogleId: string
) {
  console.log("inside getGenerationByConfigId:", { configId, userGoogleId });

  const q = await db
    .select({
      generation: generationsTable,
      genratedScript: generatedScriptsTable,
    })
    .from(generationsTable)
    .leftJoin(
      generatedScriptsTable,
      eq(generationsTable.scriptId, generatedScriptsTable.id)
    )
    .where(
      and(
        eq(generationsTable.configId, configId),
        eq(generationsTable.userGoogleId, userGoogleId)
      )
    )
    .limit(1);

  console.log("inside getGenerationByConfigId:", q);

  if (!q.length) return null;

  return { ...q[0].generation, generatedScript: q[0].genratedScript };
}

export async function updateGenerationStatus(
  id: string,
  status: Generation["status"],
  error?: string
) {
  await db
    .update(generationsTable)
    .set({ status, error, updatedAt: new Date().toISOString() })
    .where(eq(generationsTable.id, id));
}
