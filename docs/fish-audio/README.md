# Fish Audio API 文档（本地快照）

- **来源**：https://docs.fish.audio （官方 Mintlify 文档）
- **指定核对页面**：https://docs.fish.audio 、 https://docs.fish.audio/api-reference/introduction
- **抓取时间**：2026-11-07
- **OpenAPI 规范**：[`openapi.json`](./openapi.json)（OpenAPI 3.1.0，46 个路径）
- **完整索引**：[`llms.txt`](./llms.txt)

## 本次产物

| 文件 | 内容 |
|---|---|
| `official-pages-summary.md` | **两个指定官方链接**的页面内容摘要 |
| `context7-query-results.md` | **context7 查询结果** + 与官方文档的差异核对 |
| `README.md` | 本文件：索引与中文速查 |
| `openapi.json` | 官方 OpenAPI 3.1.0 全量规范（最权威） |
| `llms.txt` | 官方全站文档索引 |
| `manifest.json` | 本地文件 ↔ 官方 URL 映射 |
| `api-reference/` | REST/WebSocket 端点文档（含 errors、observability） |
| `developer-guide/` | TTS/克隆/情感/SDK/模型/价格/兼容层指南 |
| `features/` | 功能说明 |
| `overview.md` | 平台总览 |

> 官方对多个 SDK 路径返回同一份合并文档，因此部分 `.md` 内容相同。

## 核心 API 速查

### 鉴权与基础地址

```
Base URL: https://api.fish.audio
Header:   Authorization: Bearer $FISH_API_KEY
```

API Key：https://fish.audio/app/developers/get-started （只显示一次）

OpenAI 兼容层：`https://api.fish.audio/compat/v1`（见 `developer-guide/compat/migrate-from-openai.md`）

### 文本转语音 `POST /v1/tts`

- Content-Type：`application/json` 或 `application/msgpack`
  （JSON 不能内联二进制参考音频；零样本克隆需 MessagePack）
- 模型通过 **HTTP 头 `model`** 选择：
  `s1`（已弃用）、`s2-pro`、`s2.1-pro`、`s2.1-pro-free`、`drama-3`
  省略或无法识别时回退 `s2.1-pro`
- 必填：`text`；声音二选一：`reference_id`（模型 ID）或 `references`（零样本）

| 参数 | 默认 | 说明 |
|---|---|---|
| `temperature` | 0.7 | 0–1 |
| `top_p` | 0.7 | 核采样 |
| `prosody.speed` | 1 | 0.5–2.0 |
| `prosody.volume` | 0 | dB |
| `prosody.normalize_loudness` | true | 仅 S2 系列生效 |
| `format` | mp3 | `mp3`/`wav`/`pcm`/`opus` |
| `sample_rate` | 44100 | opus 默认 48000 |
| `mp3_bitrate` | 128 | 64/128/192 |
| `opus_bitrate` | -1000 | 自动；24000/32000/48000/64000 |
| `latency` | normal | `low`/`normal`/`balanced` |
| `chunk_length` | 300 | 100–300 |
| `normalize` | true | 数字/日期/单位口语化 |
| `language` | null | BCP-47；仅影响文本归一化 |
| `max_new_tokens` | 1024 | 每段最大音频 token |
| `repetition_penalty` | 1.2 | >1 抑制重复 |
| `min_chunk_length` | 50 | 0–100 |
| `condition_on_previous_chunks` | true | 长文一致性 |
| `early_stop_threshold` | 1 | 0–1 |
| `features` | [] | `["quality-guard"]` 开启质量守卫 |
| `pronunciation_dictionary` | null | 最多 3 个 |

- 多说话人：`reference_id` 传数组 + `<|speaker:0|>` / `<|speaker:1|>`；
  仅 S2 系列与 `drama-3`，`s1` 不支持

### 声音克隆 `POST /model`

- `multipart/form-data`
- 必填：`type=tts`、`title`、`train_mode=fast`、`voices`（1–20 个文件）
- 可选：`description`、`texts`、`visibility`（`private`/`unlist`/`public`，
  `public` 会被降级）、`enhance_audio_quality`（默认 true）、`generate_sample`、
  `tags`、`cover_image`、`voice_design_signatures`
- 支持 `.wav` `.mp3` `.m4a` `.opus`；每段 ≥10 秒，1–2 分钟更佳
- 返回 201：`_id`（即 `reference_id`）、`state`
  （`created` → `training` → `trained`/`failed`）

### 声音设计 `POST /v1/voice-design`

- 仅 JSON，必须带 `model: voice-design-1`
- `instruction` 1–2000 字符；`reference_text` ≤150；`n` 1–4
- 返回 `candidates[].audio_base64`
- $0.01 / 次成功请求

### 实时 TTS WebSocket

```
wss://api.fish.audio/v1/tts/live
wss://api.fish.audio/v1/tts/live/with-timestamp
```

事件：客户端 `start` → 多次 `text` → `flush` → `stop`；服务端多条 `audio`。

### 语音转文字

```
POST https://api.fish.audio/v1/asr        # multipart/form-data
wss://api.fish.audio/v1/asr/realtime
```

- `transcribe-1-pro`（推荐，≤60 分钟、多说话人/时间戳）
- `transcribe-1`（短音频；缺省或无法识别时使用）
- `transcribe-stream-1`（实时，WebSocket 默认）

### 错误格式

```json
{ "status": 401, "message": "Invalid token", "reason": null }
```

- 缺失/格式错误的 Authorization：裸 401 + `WWW-Authenticate: Bearer`
- 边缘层部分 413/5xx 可能无 JSON body

## 模型与价格（2026-11）

| 模型 | 价格 | 说明 |
|---|---|---|
| `s2.1-pro` | $15 / 百万 UTF-8 字节 | 生产推荐，83 语言，多说话人 |
| `s2.1-pro-free` | $0 | 同质量，公平使用限制，无 TTFA/DPA |
| `s2-pro` | $15 | 上一代 S2，80+ 语言 |
| `drama-3` | $50（2026-11-30 前 $10） | 自然语言导演式控制 |
| `s1` | $15 | 2026-12-31 退役 |

ASR：$0.36/音频小时；Voice Design：$0.01/次
并发：< $100 → 5；≥ $100 → 15；≥ $1,000 → 50；超限 429（无 `Retry-After`）

## SDK

### Python

```bash
pip install fish-audio-sdk          # 包 fishaudio，>= 1.0.0
pip install fish-audio-sdk[utils]
```

```python
from fishaudio import FishAudio
from fishaudio.utils import save

client = FishAudio()  # 读取 FISH_API_KEY
audio = client.tts.convert(text="Hello from Fish Audio!", model="s2.1-pro-free")
save(audio, "out.mp3")
```

`client.tts` / `client.voices` / `client.asr` / `client.account`；
异步用 `AsyncFishAudio`。SDK 不传 `model=` 时默认 `s2-pro`。

### JavaScript

```bash
npm install fish-audio
```

```javascript
import { FishAudioClient } from "fish-audio";
const client = new FishAudioClient({ apiKey: process.env.FISH_API_KEY });
const stream = await client.textToSpeech.convert({ text: "Hello!" }, "s2.1-pro");
```

`fish-audio` 0.1.0 默认模型是 `s1`（已弃用），请显式传模型。

## 参考链接

- 官方文档：https://docs.fish.audio
- API 简介：https://docs.fish.audio/api-reference/introduction
- OpenAPI：https://api.fish.audio/openapi.json
- 错误：https://docs.fish.audio/api-reference/errors.md
- 追踪：https://docs.fish.audio/api-reference/observability.md
- Python SDK：https://github.com/fishaudio/fish-audio-python
- 控制台：https://fish.audio/app/developers/get-started
