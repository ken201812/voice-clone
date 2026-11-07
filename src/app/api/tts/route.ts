import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { generations, voices } from "@/db/schema";
import { jsonError } from "@/lib/api-error";
import { rejectCrossOrigin } from "@/lib/api-guard";
import { synthesizeSpeech } from "@/lib/fish/client";
import { toGenerationView } from "@/lib/serialize";
import {
  audioDir,
  ensureStorage,
  resolveDataPath,
  saveAudio,
} from "@/lib/storage";
import { ttsRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  try {
    const input = ttsRequestSchema.parse(await request.json());

    const voice = db
      .select()
      .from(voices)
      .where(eq(voices.id, input.voiceId))
      .get();

    if (!voice) {
      return Response.json({ error: "声音不存在" }, { status: 404 });
    }
    if (voice.state !== "trained") {
      return Response.json(
        {
          error:
            voice.state === "failed"
              ? "该声音训练失败，无法使用"
              : "该声音尚未训练完成，请稍后再试",
        },
        { status: 409 },
      );
    }

    // Fail before spending Fish credits if the output directory is unusable.
    try {
      ensureStorage();
      fs.accessSync(audioDir, fs.constants.W_OK);
    } catch {
      return Response.json(
        {
          error:
            "音频目录不可写，请检查 data/audio 的权限或磁盘空间后再试。",
        },
        { status: 500 },
      );
    }

    const result = await synthesizeSpeech({
      text: input.text,
      referenceId: voice.fishModelId,
      model: input.model,
      format: input.format,
      speed: input.speed,
    });

    const id = randomUUID();
    let stored: ReturnType<typeof saveAudio>;
    try {
      stored = saveAudio(id, input.format, result.audio);
    } catch (error) {
      // Fish has already billed this request; report it clearly.
      console.error("[tts] failed to save generated audio", error);
      return Response.json(
        {
          error:
            "音频已生成，但保存失败。请检查磁盘空间和 data/audio 权限。",
        },
        { status: 500 },
      );
    }
    const now = new Date();

    const row = {
      id,
      voiceId: voice.id,
      fishModelId: voice.fishModelId,
      text: input.text,
      model: input.model,
      format: input.format,
      speed: input.speed,
      filePath: stored.relativePath,
      fileSize: stored.fileSize,
      createdAt: now,
    };

    try {
      db.insert(generations).values(row).run();
    } catch (error) {
      // Remove the orphan file if the metadata write fails.
      try {
        fs.rmSync(resolveDataPath(stored.relativePath), { force: true });
      } catch (cleanupError) {
        console.error("[tts] failed to clean up orphan audio file", cleanupError);
      }
      throw error;
    }

    return Response.json(
      { generation: toGenerationView(row, voice.title) },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
