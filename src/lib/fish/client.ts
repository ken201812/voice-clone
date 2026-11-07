/**
 * Minimal Fish Audio REST client for the two features we use:
 * - POST   /model          create a persistent voice clone (multipart)
 * - GET    /model/{id}     read model state
 * - PATCH  /model/{id}     update title/description/visibility
 * - DELETE /model/{id}     delete a model
 * - POST   /v1/tts         synthesize speech (JSON, binary response)
 *
 * Source of truth: docs/fish-audio/openapi.json
 * Quick reference: docs/fish-audio/context7-query-results.md
 */

import type { AudioFormat, TtsModel } from "./constants";

export {
  AUDIO_FORMATS,
  TTS_MODELS,
  type AudioFormat,
  type TtsModel,
} from "./constants";

const API_BASE = "https://api.fish.audio";

const TIMEOUT_MS = {
  createModel: 120_000,
  readModel: 30_000,
  updateModel: 30_000,
  deleteModel: 30_000,
  tts: 180_000,
} as const;

export type FishVoiceState = "created" | "training" | "trained" | "failed";
export type FishVisibility = "public" | "unlist" | "private";

export interface FishModel {
  _id: string;
  type?: string;
  title: string;
  description?: string;
  state: FishVoiceState;
  visibility?: FishVisibility;
  languages?: string[];
  created_at?: string;
  updated_at?: string;
}

export class FishApiError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status = 502, detail?: string) {
    super(message);
    this.name = "FishApiError";
    this.status = status;
    this.detail = detail;
  }
}

function apiKey(): string {
  const key = process.env.FISH_API_KEY;
  if (!key) {
    throw new FishApiError(
      "未配置 FISH_API_KEY，请在 .env.local 中填入你的 Fish Audio API Key。",
      500,
    );
  }
  return key;
}

async function fishFetch(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new FishApiError(
        "Fish Audio 响应超时，请稍后重试。",
        504,
      );
    }
    throw new FishApiError(
      `无法连接 Fish Audio：${error instanceof Error ? error.message : "网络错误"}`,
      502,
    );
  }
}

async function toApiError(res: Response): Promise<FishApiError> {
  let message = `Fish Audio 请求失败（HTTP ${res.status}）`;
  let detail: string | undefined;

  // Read the body exactly once. Calling res.json() first would consume it and
  // make a later res.text() throw "Body has already been read".
  let raw = "";
  try {
    raw = await res.text();
  } catch {
    // Some edge errors have no readable body.
  }

  if (raw) {
    try {
      const body = JSON.parse(raw) as {
        message?: string;
        reason?: string;
      };
      if (body.message) message = body.message;
      detail = body.reason ?? undefined;
    } catch {
      detail = raw.slice(0, 500);
    }
  }

  const friendly =
    res.status === 401
      ? "API Key 无效或已过期。"
      : res.status === 402
        ? "余额不足，请充值或改用 s2.1-pro-free。"
        : res.status === 404
          ? "请求的资源不存在，可能已在 Fish Audio 上删除。"
          : res.status === 429
            ? "并发超限，请稍后重试。"
            : res.status === 503
              ? "Fish Audio 服务繁忙，请稍后重试。"
              : message;

  return new FishApiError(friendly, res.status, detail);
}

async function readModel(res: Response): Promise<FishModel> {
  let raw: string;
  try {
    raw = await res.text();
  } catch (error) {
    throw new FishApiError(
      "读取 Fish Audio 响应失败，请重试。",
      502,
      error instanceof Error ? error.message : undefined,
    );
  }

  try {
    const model = JSON.parse(raw) as FishModel;
    if (!model || typeof model._id !== "string") {
      throw new Error("Missing model _id");
    }
    return model;
  } catch {
    throw new FishApiError(
      "Fish Audio 返回了无法解析的模型数据。",
      502,
      raw.slice(0, 500),
    );
  }
}

export interface CreateVoiceInput {
  title: string;
  description?: string;
  visibility?: FishVisibility;
  files: File[];
}

export async function createVoiceModel(
  input: CreateVoiceInput,
): Promise<FishModel> {
  const form = new FormData();
  form.set("type", "tts");
  form.set("title", input.title);
  form.set("train_mode", "fast");
  form.set("visibility", input.visibility ?? "private");
  if (input.description) form.set("description", input.description);

  for (const file of input.files) {
    form.append("voices", file, file.name);
  }

  // Do not set Content-Type: the runtime must add the multipart boundary.
  const res = await fishFetch(
    `${API_BASE}/model`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey()}` },
      body: form,
    },
    TIMEOUT_MS.createModel,
  );

  if (!res.ok) throw await toApiError(res);
  return readModel(res);
}

export async function getVoiceModel(id: string): Promise<FishModel> {
  const res = await fishFetch(
    `${API_BASE}/model/${encodeURIComponent(id)}`,
    { headers: { Authorization: `Bearer ${apiKey()}` } },
    TIMEOUT_MS.readModel,
  );
  if (!res.ok) throw await toApiError(res);
  return readModel(res);
}

export async function updateVoiceModel(
  id: string,
  patch: Partial<Pick<FishModel, "title" | "description" | "visibility">>,
): Promise<FishModel> {
  const res = await fishFetch(
    `${API_BASE}/model/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    },
    TIMEOUT_MS.updateModel,
  );
  if (!res.ok) throw await toApiError(res);

  // The official OpenAPI documents PATCH /model/{id} 200 without a response
  // body, so parsing it would throw on a successful update. Re-read the model
  // to get the effective values (e.g. Fish may downgrade visibility to private).
  return getVoiceModel(id);
}

export async function deleteVoiceModel(id: string): Promise<void> {
  const res = await fishFetch(
    `${API_BASE}/model/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey()}` },
    },
    TIMEOUT_MS.deleteModel,
  );
  // Treat already-deleted models as success.
  if (!res.ok && res.status !== 404) throw await toApiError(res);
}

export interface SynthesizeInput {
  text: string;
  referenceId: string;
  model: TtsModel;
  format: AudioFormat;
  speed: number;
}

export interface SynthesizeResult {
  audio: Buffer;
  contentType: string;
}

export async function synthesizeSpeech(
  input: SynthesizeInput,
): Promise<SynthesizeResult> {
  const res = await fishFetch(
    `${API_BASE}/v1/tts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        model: input.model,
      },
      body: JSON.stringify({
        text: input.text,
        reference_id: input.referenceId,
        format: input.format,
        prosody: { speed: input.speed },
        normalize: true,
      }),
    },
    TIMEOUT_MS.tts,
  );

  if (!res.ok) throw await toApiError(res);

  let audioBuffer: ArrayBuffer;
  try {
    audioBuffer = await res.arrayBuffer();
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new FishApiError("下载 Fish Audio 音频超时，请重试。", 504);
    }
    throw new FishApiError(
      "读取 Fish Audio 音频失败，请重试。",
      502,
      error instanceof Error ? error.message : undefined,
    );
  }

  const audio = Buffer.from(audioBuffer);
  if (audio.byteLength === 0) {
    throw new FishApiError("Fish Audio 返回了空音频。", 502);
  }

  return {
    audio,
    contentType:
      res.headers.get("content-type") ??
      (input.format === "wav" ? "audio/wav" : "audio/mpeg"),
  };
}
