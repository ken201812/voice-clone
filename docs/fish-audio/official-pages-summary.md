# 官方页面摘要（指定链接）

抓取时间：2026-11-07
抓取方式：WebFetch（页面渲染内容）+ 官方 `.md` 源文件（见 `manifest.json`）

---

## 1. https://docs.fish.audio

> 页面定位：“Everything Fish Audio can do, and how to build with it.”

### 产品能力

| 能力 | 说明 |
|---|---|
| [Text to Speech](https://docs.fish.audio/features/text-to-speech.md) | 用 `s2.1-pro`、`s2-pro` 或已弃用的 `s1` 将文本转为语音 |
| [Speech to Text](https://docs.fish.audio/features/speech-to-text.md) | `transcribe-1-pro` 支持多说话人、长录音、情感线索、可选时间戳 |
| [Voice Cloning](https://docs.fish.audio/features/voice-cloning.md) | 从一段音频即时克隆，或训练持久声音模型 |
| [Realtime Streaming](https://docs.fish.audio/features/realtime-streaming.md) | 边生成边输出音频，适合实时应用与语音 Agent |
| [Manage Voices](https://docs.fish.audio/features/manage-voices.md) | 列出、查看、更新、删除声音模型 |

### 仅网页端功能

- Professional Voice Clone：真人验证的录音室级克隆（需发布流程）
- Voice Design：用文字描述生成原创角色声音
- Voice Changer：把现有音频转换为另一种声音
- Story Studio：长篇多说话人有声书/旁白
- Music & Sound Effects：根据提示生成音乐与音效
- Audio Separation：分离音轨

### 模型

**TTS**

| 模型 | 说明 |
|---|---|
| `s2.1-pro` | 生产推荐，质量/延迟/吞吐优于 S2-Pro |
| `s2.1-pro-free` | 同模型免费档，无 TTFA/DPA 保证 |
| `s2-pro` | 上一代，多说话人 + 自然语言表达控制 |
| `s1` | 旧模型，`(parenthesis)` 情感标签；2026-12-31 退役，之后由 `s2.1-pro` 承接 |

**ASR**（通过 `POST /v1/asr` 的 `model` 头选择）

| 模型 | 说明 |
|---|---|
| `transcribe-1-pro` | 推荐；短音频到 60 分钟多说话人录音，支持说话人标签/轮次/情感线索；必须显式指定 |
| `transcribe-1` | 通用短录音；`model` 头缺失或不匹配时默认走这里 |
| `transcribe-stream-1` | Preview；WebSocket 实时转写，带轮次检测，面向语音 Agent |

### 四条上手路径

1. [使用网页应用](https://docs.fish.audio/overview/platform.md) — 无代码
2. [使用 SDK](https://docs.fish.audio/developer-guide/sdk-guide/quickstart.md) — 官方 Python 库
3. [调用 API](https://docs.fish.audio/api-reference/introduction.md) — REST + WebSocket
4. [使用 AI 编码代理](https://docs.fish.audio/developer-guide/resources/coding-agents.md) — 安装 Fish Audio skill

完整索引：https://docs.fish.audio/llms.txt

---

## 2. https://docs.fish.audio/api-reference/introduction

### API Key

在 https://fish.audio/app/developers/get-started 创建。

### 错误格式

错误返回 JSON，包含 `message` 与 `status`，部分端点还有额外字段。
边缘层产生的某些 `413` / `5xx` 可能没有 JSON body。
完整状态码表与重试建议：https://docs.fish.audio/api-reference/errors.md

### OpenAPI Schema

官方规范地址：**https://api.fish.audio/openapi.json**
建议在给 AI 编码代理/IDE 的提示或项目上下文中提供该 URL。

### 分布式追踪

推理 API 接受 W3C `traceparent` 头，可与业务侧 trace 共用 trace ID。
详见：https://docs.fish.audio/api-reference/observability.md

### 核心端点

| 用途 | 端点 | 文档 |
|---|---|---|
| 创建声音克隆 | `POST /model` | `api-reference/endpoint/model/create-model.md` |
| 生成语音 | `POST /v1/tts` | `api-reference/endpoint/openapi-v1/text-to-speech.md` |
| 根据提示设计声音 | `POST /v1/voice-design` | `api-reference/endpoint/openapi-v1/voice-design.md` |

### 实时流式

通过 Python SDK / JavaScript SDK 使用 WebSocket：
https://docs.fish.audio/features/realtime-streaming.md

### 限流

按端点列在 GitHub 的 Rate Limits 章节：
https://docs.fish.audio/developer-guide/models-pricing/pricing-and-rate-limits.md

---

## 3. 补充：OpenAI 兼容端点（context7 发现，官方文档确认）

来源：`developer-guide/compat/migrate-from-openai.md`

```
base_url = https://api.fish.audio/compat/v1
auth     = Authorization: Bearer <FISH_API_KEY>（WebSocket 也可 ?api_key=<key>）
```

| 功能 | 支持 |
|---|---|
| 流式 TTS（`POST /v1/audio/speech`） | ✓ |
| STT + 词级时间戳（REST） | ✓ |
| 字幕（srt / vtt） | ✓ |
| Chat 模态音频 | ✓ |
| Realtime WebSocket（TTS + STT） | ✓ |
| 模型目录 | ✓ |
| TTS 字符级时间戳 | – |
| 声音库列表 | – |

模型名使用 `fish-audio/s2.1-pro-free`（免费）或 `fish-audio/s2.1-pro`（生产）。
