# context7 查询结果与官方文档核对

- **查询时间**：2026-11-07
- **查询工具**：context7 MCP（已连接）
- **使用的库 ID**：
  - `/websites/fish_audio` — 官方文档镜像，4948 个代码片段
  - `/fishaudio/fish-audio-python` — 官方 Python SDK，514 个代码片段
- **核对基准**：本地抓取的官方 `.md` 源文件与 `openapi.json`

> context7 适合快速获取 API 骨架与 SDK 示例；但部分内容是旧版或聚合页的二手描述，
> 与当前官方 OpenAPI 存在冲突。参数/字段请以 `openapi.json` 为准。

## 1. 查询记录

| # | 库 | 查询 |
|---|---|---|
| 1 | `/websites/fish_audio` | REST API authentication base URL and POST /v1/tts request parameters, model header, output formats |
| 2 | `/websites/fish_audio` | voice cloning: create model endpoint POST /model multipart audio upload, reference_id, model state |
| 3 | `/fishaudio/fish-audio-python` | Python SDK installation authentication tts convert stream websocket and voice cloning examples |
| 4 | `/websites/fish_audio` | API introduction: authentication API key, base URL, errors, OpenAPI schema, endpoints overview |

## 2. context7 返回的核心信息

### 2.1 基础事实

```
Base URL: https://api.fish.audio
Auth:     Authorization: Bearer <FISH_API_KEY>
TTS:      POST /v1/tts（model 通过 HTTP 头指定，缺省 s2.1-pro）
ASR:      POST /v1/asr（Content-Type: multipart/form-data）
Models:   GET/POST /model, GET/PATCH/DELETE /model/{id}
Realtime: wss://api.fish.audio/v1/tts/live
```

补充发现：**OpenAI 兼容端点** `https://api.fish.audio/compat/v1`
（`POST /v1/audio/speech` 等，官方文档 `developer-guide/compat/migrate-from-openai.md` 确认）。

### 2.2 POST /v1/tts 示例

```bash
curl --request POST \
  --url https://api.fish.audio/v1/tts \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --header 'model: s2.1-pro-free' \
  --data '{
    "text": "Hello! Welcome to Fish Audio.",
    "reference_id": "model-id",
    "temperature": 0.7,
    "top_p": 0.7,
    "prosody": { "speed": 1, "volume": 0, "normalize_loudness": true },
    "chunk_length": 300,
    "normalize": true,
    "format": "mp3",
    "sample_rate": 44100,
    "mp3_bitrate": 128,
    "latency": "normal",
    "max_new_tokens": 1024,
    "repetition_penalty": 1.2,
    "min_chunk_length": 50,
    "condition_on_previous_chunks": true,
    "early_stop_threshold": 1
  }'
```

### 2.3 声音克隆示例

```bash
curl --request POST https://api.fish.audio/model \
  --header "Authorization: Bearer $FISH_API_KEY" \
  --form type=tts \
  --form title="My Voice" \
  --form "description=Cloned from a studio sample" \
  --form visibility=private \
  --form train_mode=fast \
  --form voices=@sample.wav

# 返回新模型，含 "_id" 与 "state"
```

### 2.4 Python SDK 示例

```python
from fishaudio import FishAudio
from fishaudio.types import ReferenceAudio
from fishaudio import TextEvent, FlushEvent, WebSocketOptions
from fishaudio.exceptions import WebSocketError

client = FishAudio()

# 即时克隆
with open("reference.wav", "rb") as f:
    audio = client.tts.convert(
        text="Cloned voice speaking",
        references=[ReferenceAudio(audio=f.read(), text="Text spoken in reference")],
    )

# 持久化声音模型
with open("voice_sample.wav", "rb") as f:
    voice = client.voices.create(title="My Voice", voices=[f.read()])
audio = client.tts.convert(text="Using my saved voice", reference_id=voice.id)

# WebSocket 流式
def events():
    yield TextEvent(text="First sentence. ")
    yield TextEvent(text="Second sentence.")
    yield FlushEvent()

for chunk in client.tts.stream_websocket(events(), ws_options=WebSocketOptions()):
    handle_chunk(chunk)
```

### 2.5 认证错误行为（context7 补充）

- 缺失或格式错误的 `Authorization`：裸 `401` + `WWW-Authenticate: Bearer`，无 body
- 凭证无效/过期：JSON `{"status": 401, "message": "Invalid token" | "Token expired"}`

### 2.6 Python 客户端默认值

```python
FishAudio(api_key=None, base_url="https://api.fish.audio", timeout=240.0, httpx_client=None)
```

## 3. 与官方文档的冲突及处理

| # | 项目 | context7 说法 | 官方文档（2026-11-07） | 以谁为准 |
|---|---|---|---|---|
| 1 | `POST /model` 的 `type` | `tts` 或 `svc` | 请求 schema `const: tts`，只接受 `tts` | **官方** |
| 2 | `train_mode` | 可选，默认 `fast` | 请求 schema **必填**，且 `const: fast` | **官方** |
| 3 | `visibility` | `public` / `private` | `public` / `unlist` / `private`；`public` 会被降级 | **官方** |
| 4 | 创建模型响应 | 某片段写 200 + `{"id"}` | **201** + 完整对象，ID 为 `_id` | **官方** |
| 5 | `/v1/tts` Content-Type | 某片段写必须是 `application/json` | `application/json` **或** `application/msgpack`；零样本克隆必须 MessagePack | **官方** |
| 6 | `/v1/tts` 的 `reference_id` | 某片段标为 Required | 非必填；与 `references` 二选一 | **官方** |
| 7 | TTS 模型列表 | 漏了 `drama-3` | 包含 `drama-3` | **官方** |
| 8 | Python SDK 默认模型 | 类型存根显示 `model="s2.1-pro"` | 指南写默认 `s2-pro` | 版本差异；**显式传 `model`** |
| 9 | 价格/限流/Voice Design | 未覆盖 | 完整说明见 `README.md` | **官方** |

## 4. 官方文档中 context7 未覆盖的关键信息

- 价格：`s2.1-pro` $15/百万 UTF-8 字节；`s2.1-pro-free` $0；
  `drama-3` $50（2026-11-30 前 $10）；ASR $0.36/音频小时；Voice Design $0.01/次
- 并发限流：按累计付费 5 / 15 / 50；超限 429 且无 `Retry-After`
- Voice Design：必须带 `model: voice-design-1`，返回 base64 候选音频
- 多说话人：`<|speaker:0|>` 标签，仅 S2 系列与 `drama-3`
- 发音词典：`pronunciation_dictionary` 最多 3 个，支持 `phoneme` / `alias`
- S1 退役：2026-12-31 后由 `s2.1-pro` 承接

## 5. 结论

1. 参数/字段以 `openapi.json` 为唯一事实来源。
2. context7 适合查 SDK 用法、示例和错误行为。
3. 计费、限流、模型退役等运营信息只看官方 `developer-guide/models-pricing/`。
4. 生产请求显式指定 `model` 与 `format`，不要依赖默认值。
