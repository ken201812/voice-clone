import fs from "node:fs";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { defineConfig } from "drizzle-kit";
import { getPaths } from "./src/lib/paths";

// Next.js reads .env.local, but drizzle-kit does not. Load it explicitly so
// `npm run db:*` and the app always point at the same SQLite file.
const envLocal = path.resolve(process.cwd(), ".env.local");
const envDefault = path.resolve(process.cwd(), ".env");

if (fs.existsSync(envLocal)) {
  loadEnvFile(envLocal);
} else if (fs.existsSync(envDefault)) {
  loadEnvFile(envDefault);
}

const { dbPath } = getPaths();

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: dbPath,
  },
});
