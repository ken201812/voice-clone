import fs from "node:fs";
import path from "node:path";

export interface DataPaths {
  dataDir: string;
  dbPath: string;
  audioDir: string;
  migrationsDir: string;
}

/**
 * Single source of truth for every on-disk location.
 * Evaluated lazily so drizzle.config.ts can load .env.local first.
 */
export function getPaths(): DataPaths {
  const dataDir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(process.cwd(), "data");

  return {
    dataDir,
    dbPath: process.env.DATABASE_PATH
      ? path.resolve(process.env.DATABASE_PATH)
      : path.join(dataDir, "app.db"),
    audioDir: path.join(dataDir, "audio"),
    migrationsDir: path.join(process.cwd(), "drizzle"),
  };
}

export function ensureDataDirs() {
  const { dataDir, audioDir } = getPaths();
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(audioDir, { recursive: true });
}
