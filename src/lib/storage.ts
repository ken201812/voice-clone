import fs from "node:fs";
import path from "node:path";
import { getPaths } from "@/lib/paths";

const { dataDir, audioDir } = getPaths();

export { audioDir, dataDir };

export function ensureStorage() {
  fs.mkdirSync(audioDir, { recursive: true });
}

/** Persist generated audio and return a DB-friendly POSIX relative path. */
export function saveAudio(
  id: string,
  format: string,
  data: Buffer,
): { relativePath: string; fileSize: number } {
  ensureStorage();
  const safeFormat = format.replace(/[^a-z0-9]/gi, "") || "mp3";
  // Store forward slashes so the database stays portable across platforms.
  const relativePath = path.posix.join("audio", `${id}.${safeFormat}`);
  const absolutePath = path.join(dataDir, relativePath);
  fs.writeFileSync(absolutePath, data);
  return { relativePath, fileSize: data.byteLength };
}

/** Resolve a relative path without allowing traversal outside data/. */
export function resolveDataPath(relativePath: string): string {
  const root = path.resolve(dataDir);
  const full = path.resolve(root, relativePath);
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new Error("非法的文件路径");
  }
  return full;
}

export const AUDIO_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  pcm: "audio/pcm",
  opus: "audio/ogg",
};

export function mimeForFormat(format: string): string {
  return AUDIO_MIME[format] ?? "application/octet-stream";
}
