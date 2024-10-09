import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const generationsTable = sqliteTable("generations", {
  id: text("id").primaryKey(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  speechUrl: text("speech_url").notNull(),
  captions_url: text("captions_url").notNull(),
  images: text("images", { mode: "json" })
    .notNull()
    .$type<string[]>()
    .default(sql`[]`),
  configId: text("config_id").references(() => configTable.id),
  scriptId: text("script_id").references(() => generatedScriptsTable.id),
});

export const configTable = sqliteTable("config", {
  id: text("id").primaryKey(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  topic: text("topic").notNull(),
  duration: integer("duration", { mode: "number" })
    .notNull()
    .default(sql`30`),
  style: text("style").notNull(),
  //   promptId
  scriptId: text("script_id").references(() => generatedScriptsTable.id),
});

export const generatedScriptsTable = sqliteTable("generated_script", {
  id: text("id").primaryKey(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  script: text("script", { mode: "json" })
    .notNull()
    .$type<{ imagePrompt: string; textContent: string }[]>()
    .default(sql`[]`),
});
