import { z } from "zod";
import {
  AUDIO_FORMAT_VALUES,
  TTS_MODEL_VALUES,
} from "@/lib/fish/constants";

export const VOICE_ALLOWED_EXT = /\.(wav|mp3|m4a|opus)$/i;
export const VOICE_MAX_FILES = 20;
export const VOICE_MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
export const VOICE_MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100 MB
export const VOICE_MAX_TITLE = 100;
export const VOICE_MAX_DESCRIPTION = 500;

export const TTS_TEXT_MAX = 5000;
export const TTS_SPEED_MIN = 0.5;
export const TTS_SPEED_MAX = 2;

export const VISIBILITY_VALUES = ["private", "unlist", "public"] as const;

export const ttsRequestSchema = z.object({
  text: z.string().trim().min(1).max(TTS_TEXT_MAX),
  voiceId: z.string().min(1),
  model: z.enum(TTS_MODEL_VALUES).default("s2.1-pro-free"),
  format: z.enum(AUDIO_FORMAT_VALUES).default("mp3"),
  speed: z.coerce.number().min(TTS_SPEED_MIN).max(TTS_SPEED_MAX).default(1),
});

export const voicePatchSchema = z.object({
  title: z.string().trim().min(1).max(VOICE_MAX_TITLE).optional(),
  description: z.string().trim().max(VOICE_MAX_DESCRIPTION).optional(),
  visibility: z.enum(VISIBILITY_VALUES).optional(),
});

export type VoiceFileValidation =
  | { ok: true }
  | { ok: false; error: string };

/** Shared by the upload dialog and POST /api/voices. */
export function validateVoiceFiles(files: File[]): VoiceFileValidation {
  if (files.length === 0) {
    return { ok: false, error: "请至少上传一个音频文件" };
  }
  if (files.length > VOICE_MAX_FILES) {
    return {
      ok: false,
      error: `一次最多上传 ${VOICE_MAX_FILES} 个音频文件`,
    };
  }

  let totalSize = 0;

  for (const file of files) {
    if (file.size === 0) {
      return { ok: false, error: `文件 ${file.name} 是空文件` };
    }
    if (file.size > VOICE_MAX_FILE_SIZE) {
      return { ok: false, error: `文件 ${file.name} 超过 25MB` };
    }
    if (!VOICE_ALLOWED_EXT.test(file.name)) {
      return {
        ok: false,
        error: `文件 ${file.name} 格式不支持，请使用 wav / mp3 / m4a / opus`,
      };
    }
    totalSize += file.size;
  }

  if (totalSize > VOICE_MAX_TOTAL_SIZE) {
    return { ok: false, error: "上传文件总大小不能超过 100MB" };
  }

  return { ok: true };
}
