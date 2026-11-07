import fs from "node:fs";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { ensureDataDirs, getPaths } from "@/lib/paths";
import * as schema from "./schema";

const paths = getPaths();

ensureDataDirs();

type DbBundle = {
  sqlite: Database.Database;
  db: BetterSQLite3Database<typeof schema>;
};

const globalForDb = globalThis as unknown as {
  __voiceCloneDb?: DbBundle;
};

function sleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Next.js build workers evaluate this module in parallel. Serialize the first
 * migration with a directory lock so only one worker creates the tables.
 */
function acquireMigrationLock(): string {
  const lockPath = `${paths.dbPath}.migrate.lock`;
  const deadline = Date.now() + 30_000;

  while (true) {
    try {
      fs.mkdirSync(lockPath);
      return lockPath;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw error;

      try {
        const stat = fs.statSync(lockPath);
        if (Date.now() - stat.mtimeMs > 60_000) {
          fs.rmdirSync(lockPath);
          continue;
        }
      } catch {
        // The lock was released between mkdir and stat; retry.
      }

      if (Date.now() > deadline) {
        throw new Error("等待数据库迁移锁超时，请删除 data/app.db.migrate.lock 后重试。");
      }
      sleep(100);
    }
  }
}

function createBundle(): DbBundle {
  if (!fs.existsSync(paths.migrationsDir)) {
    throw new Error(
      `缺少数据库迁移目录：${paths.migrationsDir}。请先运行 npm run db:generate。`,
    );
  }

  const lockPath = acquireMigrationLock();
  try {
    const sqlite = new Database(paths.dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("busy_timeout = 5000");
    sqlite.pragma("foreign_keys = ON");

    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: paths.migrationsDir });

    return { sqlite, db };
  } finally {
    try {
      fs.rmdirSync(lockPath);
    } catch {
      // Best effort: a stale lock is cleaned up by age on the next run.
    }
  }
}

const bundle = (globalForDb.__voiceCloneDb ??= createBundle());

export const db = bundle.db;
export const sqlite = bundle.sqlite;
export const { dataDir, dbPath } = paths;
