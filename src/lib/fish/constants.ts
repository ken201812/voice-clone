/** Values shared by the browser UI and the server-side Fish client. */

export const TTS_MODEL_VALUES = [
  "s2.1-pro-free",
  "s2.1-pro",
  "s2-pro",
  "drama-3",
] as const;

export type TtsModel = (typeof TTS_MODEL_VALUES)[number];

export const TTS_MODELS = [
  { value: "s2.1-pro-free", label: "S2.1 Pro Free（免费，开发自用）" },
  { value: "s2.1-pro", label: "S2.1 Pro（付费，生产）" },
  { value: "s2-pro", label: "S2 Pro（上一代）" },
  { value: "drama-3", label: "Drama 3（导演式控制）" },
] as const satisfies ReadonlyArray<{ value: TtsModel; label: string }>;

export const AUDIO_FORMAT_VALUES = ["mp3", "wav"] as const;

export type AudioFormat = (typeof AUDIO_FORMAT_VALUES)[number];

export const AUDIO_FORMATS = [
  { value: "mp3", label: "MP3（默认）" },
  { value: "wav", label: "WAV（无损）" },
] as const satisfies ReadonlyArray<{ value: AudioFormat; label: string }>;

export const VOICE_STATE_LABELS: Record<string, string> = {
  created: "已创建",
  training: "训练中",
  trained: "可用",
  failed: "训练失败",
};

export const VOICE_STATES_IN_PROGRESS = new Set(["created", "training"]);

export const RECENT_GENERATIONS_LIMIT = 12;
