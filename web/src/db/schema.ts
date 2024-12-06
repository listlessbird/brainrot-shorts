import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  integer,
  varchar,
  uuid,
  pgEnum,
  serial,
  jsonb,
} from "drizzle-orm/pg-core";
import { type InferSelectModel } from "drizzle-orm";

export const generationStatusEnum = pgEnum("generation_status", [
  "pending",
  "script_ready",
  "speech_ready",
  "images_ready",
  "captions_ready",
  "complete",
  "failed",
]);

export type GenerationStatus =
  | "pending"
  | "script_ready"
  | "speech_ready"
  | "images_ready"
  | "captions_ready"
  | "complete"
  | "failed";

export const generationsTable = pgTable("generations", {
  id: text("id").notNull().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  speechUrl: text("speech_url"),
  captionsUrl: text("captions_url"),
  videoUrl: text("video_url"),
  images: text("images")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  configId: text("config_id")
    .notNull()
    .references(() => configTable.configId, { onDelete: "cascade" }),
  scriptId: uuid("script_id").references(() => generatedScriptsTable.id),
  userGoogleId: text("user_google_id")
    .notNull()
    .references(() => userTable.googleId, { onDelete: "cascade" }),
  status: generationStatusEnum("status").notNull().default("pending"),
  error: text("error"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const configTable = pgTable("config", {
  configId: text("id").notNull().primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  topic: text("topic").notNull(),
  duration: integer("duration").notNull().default(30),
  style: text("style").notNull(),
  userGoogleId: text("user_google_id")
    .notNull()
    .references(() => userTable.googleId, { onDelete: "cascade" }),
});

export const generatedScriptsTable = pgTable("generated_script", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  script: jsonb("script")
    .$type<Array<{ imagePrompt: string; textContent: string }>>()
    .notNull()
    .default([]),
  userGoogleId: text("user_google_id")
    .notNull()
    .references(() => userTable.googleId, { onDelete: "cascade" }),
  configId: text("config_id").references(() => configTable.configId, {
    onDelete: "cascade",
  }),
});

export const userTable = pgTable("user", {
  googleId: text("google_id").primaryKey(),
  email: text("email").notNull(),
  username: text("username").notNull(),
  picture: text("picture").notNull(),
});

export const sessionTable = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.googleId, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
});

export const youtubeCredentialsTable = pgTable("yt_credentials", {
  userId: text("user_id")
    .primaryKey()
    .references(() => userTable.googleId, { onDelete: "cascade" }),
  encryptedAccessToken: text("enc_access_token").notNull(),
  encryptedRefreshToken: text("enc_refresh_token").notNull(),
  channelId: text("channel_id").notNull(),
  createdId: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const youtubeCredentialsRelations = relations(
  youtubeCredentialsTable,
  ({ one }) => ({
    user: one(userTable, {
      fields: [youtubeCredentialsTable.userId],
      references: [userTable.googleId],
    }),
  })
);

export const userRelations = relations(userTable, ({ many }) => ({
  sessions: many(sessionTable),
  generations: many(generationsTable),
  configs: many(configTable),
  generatedScripts: many(generatedScriptsTable),
}));

export const sessionRelations = relations(sessionTable, ({ one }) => ({
  user: one(userTable, {
    fields: [sessionTable.userId],
    references: [userTable.googleId],
  }),
}));

export const generatedScriptsRelations = relations(
  generatedScriptsTable,
  ({ one, many }) => ({
    user: one(userTable, {
      fields: [generatedScriptsTable.userGoogleId],
      references: [userTable.googleId],
    }),
    config: one(configTable, {
      fields: [generatedScriptsTable.configId],
      references: [configTable.configId],
    }),
    generation: many(generationsTable),
  })
);

export const configRelations = relations(configTable, ({ one, many }) => ({
  user: one(userTable, {
    fields: [configTable.userGoogleId],
    references: [userTable.googleId],
  }),
  generations: many(generationsTable),
  generatedScriptsRelations: many(generatedScriptsTable),
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
