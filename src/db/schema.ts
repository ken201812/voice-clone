import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

/**
 * A voice model registered with Fish Audio.
 * `fishModelId` is the `_id` returned by POST /model.
 */
export const voices = sqliteTable("voices", {
  id: text("id").primaryKey(),
  fishModelId: text("fish_model_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  state: text("state").notNull().default("created"),
  visibility: text("visibility").notNull().default("private"),
  languages: text("languages"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * One successful Text-to-Speech call. The audio file lives on disk;
 * only its relative path is stored here.
 */
export const generations = sqliteTable(
  "generations",
  {
    id: text("id").primaryKey(),
    voiceId: text("voice_id").references(() => voices.id, {
      onDelete: "set null",
    }),
    fishModelId: text("fish_model_id"),
    text: text("text").notNull(),
    model: text("model").notNull(),
    format: text("format").notNull().default("mp3"),
    speed: real("speed").notNull().default(1),
    filePath: text("file_path").notNull(),
    fileSize: integer("file_size").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("generations_created_at_idx").on(table.createdAt),
    index("generations_voice_id_idx").on(table.voiceId),
  ],
);

export type VoiceRow = typeof voices.$inferSelect;
export type GenerationRow = typeof generations.$inferSelect;
