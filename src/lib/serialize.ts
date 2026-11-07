import type { GenerationRow, VoiceRow } from "@/db/schema";

export interface VoiceView {
  id: string;
  fishModelId: string;
  title: string;
  description: string | null;
  state: string;
  visibility: string;
  languages: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GenerationView {
  id: string;
  voiceId: string | null;
  voiceTitle: string | null;
  text: string;
  model: string;
  format: string;
  speed: number;
  fileSize: number;
  createdAt: string;
  audioUrl: string;
}

function parseLanguages(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function toVoiceView(row: VoiceRow): VoiceView {
  return {
    id: row.id,
    fishModelId: row.fishModelId,
    title: row.title,
    description: row.description,
    state: row.state,
    visibility: row.visibility,
    languages: parseLanguages(row.languages),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toGenerationView(
  row: GenerationRow,
  voiceTitle: string | null = null,
): GenerationView {
  return {
    id: row.id,
    voiceId: row.voiceId,
    voiceTitle,
    text: row.text,
    model: row.model,
    format: row.format,
    speed: row.speed,
    fileSize: row.fileSize,
    createdAt: row.createdAt.toISOString(),
    audioUrl: `/api/audio/${row.id}`,
  };
}
