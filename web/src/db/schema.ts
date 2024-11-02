import { InferSelectModel, relations, sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  SQLiteText,
  SQLiteInteger,
} from "drizzle-orm/sqlite-core";

export const generationsTable = sqliteTable("generations", {
  id: text("id").notNull().primaryKey(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  speechUrl: text("speech_url"),
  captions_url: text("captions_url"),
  video_url: text("video_url"),
  images: text("images", { mode: "json" })
    .notNull()
    .$type<string[]>()
    .default(sql`'[]'`),
  configId: text("config_id")
    .notNull()
    .references(() => configTable.configId, { onDelete: "cascade" }),
  scriptId: text("script_id").references(() => generatedScriptsTable.id),
  userGoogleId: text("user_google_id")
    .notNull()
    .references(() => userTable.googleId, { onDelete: "cascade" }),
  status: text("status", {
    enum: [
      "pending",
      "script_ready",
      "speech_ready",
      "images_ready",
      "captions_ready",
      "complete",
      "failed",
    ],
  })
    .notNull()
    .default("pending"),
  error: text("error"),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const configTable = sqliteTable("config", {
  configId: text("id").notNull().primaryKey(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  topic: text("topic").notNull(),
  duration: integer("duration").notNull().default(30),
  style: text("style").notNull(),
  userGoogleId: text("user_google_id")
    .notNull()
    .references(() => userTable.googleId, { onDelete: "cascade" }),
});

export const generatedScriptsTable = sqliteTable("generated_script", {
  id: text("id").notNull().primaryKey(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  script: text("script", { mode: "json" })
    .notNull()
    .$type<Array<{ imagePrompt: string; textContent: string }>>()
    .default(sql`'[]'`),
  userGoogleId: text("user_google_id")
    .notNull()
    .references(() => userTable.googleId, { onDelete: "cascade" }),
  configId: text("config_id").references(() => configTable.configId, {
    onDelete: "cascade",
  }),
});

export const userTable = sqliteTable("user", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  username: text("username").notNull(),
  googleId: text("google_id").notNull().unique(),
  picture: text("picture").notNull(),
});

export const sessionTable = sqliteTable("session", {
  id: text("id").notNull().primaryKey(),
  userId: integer("user_id", { mode: "number" })
    .notNull()
    .references(() => userTable.id),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

// Relations remain the same
export const userRelations = relations(userTable, ({ many }) => ({
  sessions: many(sessionTable),
  generations: many(generationsTable),
  configs: many(configTable),
  generatedScripts: many(generatedScriptsTable),
}));

export const sessionRelations = relations(sessionTable, ({ one }) => ({
  user: one(userTable, {
    fields: [sessionTable.userId],
    references: [userTable.id],
  }),
}));

export const generatedScriptsRelations = relations(
  generatedScriptsTable,
  ({ one, many }) => ({
    user: one(userTable, {
      fields: [generatedScriptsTable.userGoogleId],
      references: [userTable.googleId],
    }),
    generations: many(generationsTable),
    configs: one(configTable),
  })
);

export const configRelations = relations(configTable, ({ one, many }) => ({
  user: one(userTable, {
    fields: [configTable.userGoogleId],
    references: [userTable.googleId],
  }),
  script: one(generatedScriptsTable),
  generations: many(generationsTable),
}));

export const generationsRelations = relations(generationsTable, ({ one }) => ({
  user: one(userTable, {
    fields: [generationsTable.userGoogleId],
    references: [userTable.googleId],
  }),
  config: one(configTable, {
    fields: [generationsTable.configId],
    references: [configTable.configId],
  }),
  generatedScript: one(generatedScriptsTable, {
    fields: [generationsTable.scriptId],
    references: [generatedScriptsTable.id],
  }),
}));

export type User = InferSelectModel<typeof userTable>;
export type Session = InferSelectModel<typeof sessionTable>;
export type Generation = InferSelectModel<typeof generationsTable>;
export type Config = InferSelectModel<typeof configTable>;
export type GeneratedScript = InferSelectModel<typeof generatedScriptsTable>;
