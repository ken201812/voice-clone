> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fish.audio/llms.txt
> Use this file to discover all available pages before exploring further.

# WebSocket Realtime Speech to Text

> Stream audio over a WebSocket and receive transcripts turn by turn, with turn detection, live drafts and conversation context

> [!NOTE]
>
> Connect to `wss://api.fish.audio/v1/asr/realtime` with a WebSocket client.
> Every message in both directions is one MessagePack map in a binary frame. A
> normal HTTP GET request does not start a session. For an introduction, see
> [Realtime Speech to Text](https://docs.fish.audio/features/speech-to-text/realtime.md).

> [!NOTE]
>
> `transcribe-stream-1` is in preview.

## Before you start

You need a [Fish Audio API key](https://docs.fish.audio/developer-guide/getting-started/api-key.md) and a WebSocket client that can set request headers. The API key travels in a request header, so connect from your server, not from a browser; to capture audio in a browser, relay it through your server as in [Transcribe a live audio stream](https://docs.fish.audio/developer-guide/sdk-guide/cookbook/realtime-transcription.md#capture-from-a-browser-microphone). The examples on these pages use Python with `websockets` and `msgpack`, and Node.js with `ws` and `@msgpack/msgpack`.

This endpoint is separate from the realtime endpoints of the [compatible APIs](https://docs.fish.audio/developer-guide/compat/capabilities.md), which use manual commit and have no server-side turn detection.

## Connect

```text theme={null}
GET wss://api.fish.audio/v1/asr/realtime
Authorization: Bearer <API key>
model: transcribe-stream-1
```

| Header | Required | Description |
| - | - | - |
| `Authorization` | Yes | `Bearer <API key>`. Write the scheme exactly as `Bearer`, followed by a space and the key. |
| `model` | No | `transcribe-stream-1` (Preview), the default and the only realtime model. The legacy name `transcribe-1-pro-realtime` reaches the same model. |

Each open connection counts against the same concurrency limit as your other API requests, from the moment it opens until it closes, even while you send no audio. See [Concurrent request limits](https://docs.fish.audio/developer-guide/models-pricing/pricing-and-rate-limits.md#concurrent-request-limits). A session cannot be resumed: a new connection is a new session.

Sessions are billed per second of session duration, as Realtime ASR. See [ASR pricing](https://docs.fish.audio/developer-guide/models-pricing/pricing-and-rate-limits.md#automatic-speech-recognition-asr-models).

If the server refuses the upgrade, it answers with a plain HTTP response whose JSON body is `{"status": <int>, "message": <str>}`:

| Status | Meaning | What to do |
| - | - | - |
| 401 | The API key is missing or invalid, or the `Authorization` header does not start with `Bearer `. | Check the key and the header. |
| 402 | Insufficient API credit. | Top up your balance. |
| 429 | Your team is at its concurrency limit, or the service is at capacity. | Retry with backoff. Honor `Retry-After` when present. |
| 503 | The service is restarting. | Retry. |

The `101 Switching Protocols` response carries an `x-request-id` header, and so do the capacity 429 and 503 refusals. It is the same value as `request_id` in `session_started`, `error` and `session_done`. Log it, and include it when you contact support. Refusals for the key, balance and your concurrency limit (401, 402 and concurrency 429) happen before a session is assigned and carry no `x-request-id`.

## Framing

* Every message is **one binary WebSocket frame holding one MessagePack map** with a `type` field. Audio bytes are MessagePack `bin`. Do not send text frames. JSON is not accepted, in text frames or in binary frames.
* Every server message carries `seq`, which increases by one per message within the session.
* Times are `*_ms` integers: milliseconds of session audio since the first audio byte, in your audio's own time at the `sample_rate` you configured.
* WebSocket ping and pong frames are allowed at any time, including before `config`. The server answers pings, and a ping counts as client activity for the 30-second idle limit. Pings do not extend the 10-second deadline for the first `config`.

## Session flow

```text theme={null}
Client → config                 first message, within 10 s of connecting
Server → session_started
Client → audio, audio, ...      plus finalize, configure, context_add, keepalive, agent_speaking at any time

Per turn:
Server → speech_start
         draft*                 only with results.drafts: true
         user_turn_taken        auto mode only
         eager_end_of_turn      with turn_detection.eager: true; turn_resumed cancels it
         committed              the final transcript of the turn
Server → user_backchannel       auto mode, while your agent is speaking

Client → audio_done
Server → committed              the open turn, reason "audio_done"
         session_done
         close 1000
```

In `auto` mode, `draft` messages can come before and after `user_turn_taken`, and `eager_end_of_turn` followed by `turn_resumed` can repeat before the turn commits. After `audio_done`, the server first finishes its turn decisions on the audio already sent, so you can still receive `speech_start`, `user_turn_taken` and `committed` for earlier turns.

## Client messages

### `config`

The first message on the connection. Send it within 10 seconds of connecting, then wait for `session_started` before you send audio.

Audio sent before `session_started` is not lost: once the session has started, the server reads it in order, and it counts as received audio like any other. If the `config` is refused, none of it is processed. Waiting for `session_started` is still the reliable way to know that your `config` was accepted, and to receive its error and close code if it was not.

```json theme={null}
{
  "type": "config",
  "audio": { "format": "pcm_s16le", "sample_rate": 16000, "channels": 1 },
  "turn_detection": { "mode": "auto", "eager": true },
  "results": { "drafts": true, "ignore_timestamps": false },
  "context": {
    "history": [{ "role": "assistant", "text": "Hi, how can I help?" }],
    "terms": ["Fish Audio", "transcribe-stream-1"]
  },
  "client_reference_id": "call-8f2c"
}
```

| Field | Required | Default | Description |
| - | - | - | - |
| `protocol_version` | No | `1` | Only `1` is valid. |
| `audio.format` | Yes | | `pcm_s16le`: 16-bit little-endian PCM. |
| `audio.sample_rate` | Yes | | One of 8000, 12000, 16000, 22050, 24000, 32000, 44100, 48000. See [Audio format](#audio-format). |
| `audio.channels` | Yes | | `1` (mono). |
| `turn_detection.mode` | No | `"auto"` | `"auto"`, `"vad"` or `"manual"`. See [Turn detection modes](#turn-detection-modes). |
| `turn_detection.eager` | No | `false` | `true` sends [`eager_end_of_turn`](#eager_end_of_turn) in `auto` mode. |
| `turn_detection.silence_timeout_ms` | No | Depends on mode | See [`silence_timeout_ms`](#silence_timeout_ms). |
| `results.drafts` | No | `false` | `true` sends live [`draft`](#draft) messages. |
| `results.ignore_timestamps` | No | `true` | `false` adds word timings (`words`) to `committed`. |
| `results.diarize` | No | `true` | `true`, `false` or `"auto"` (same as `true`); the strings `"true"` and `"false"` are accepted too. `false` removes speaker tags from the text. See [Speakers](#speakers). |
| `results.tag_audio_events` | No | `true` | `false` removes sound tags such as `[laughter]` from the text. See [Sound tags](#sound-tags). |
| `results.vad_events` | No | `false` | `true` sends [`vad`](#vad) messages. |
| `results.eot_events` | No | `false` | `true` sends [`eot_prob`](#eot_prob) messages. |
| `context.history` | No | `[]` | Earlier conversation, oldest first: up to 32 items of `{ "role": "user" \| "assistant", "text": str }`, each up to 2,000 characters. |
| `context.terms` | No | `[]` | Up to 100 terms of up to 32 characters each: names, products and jargon to recognize. |
| `client_reference_id` | No | | Your own ID for the session, up to 256 characters. It is recorded with the session and not sent back. |

A value of the wrong type for `ignore_timestamps` or `tag_audio_events` (both take only `true` or `false`), or a `diarize` value other than those listed, is `invalid_config`. So is an unknown field, including a misspelled one; the error's `message` names the field. `invalid_config` closes the connection with 4400. Send only the fields listed here: not every other field is refused, so check `session_started.config`, which shows the settings in effect.

#### Audio format

Send 16-bit little-endian PCM, mono, at one of the listed sample rates. Other encodings (such as μ-law, A-law or Opus) and stereo audio are `unsupported_audio`; decode phone audio in μ-law or A-law to 16-bit PCM first, and send it at 8000 Hz as is. Audio at 16000 Hz is used as is; every other rate is converted on the server, so you never need to resample. The conversion adds at most about 20 ms of delay. Every `*_ms` value is in milliseconds of your audio, whatever its rate.

An `audio` message can hold any number of bytes; an odd trailing byte waits for the next message. Anything from 20 to 100 ms of audio per message works and gives the same results, but each result waits for the message that carries its audio, so smaller messages give lower latency. For live audio, 20–40 ms per message is a good size. A message can be at most 1 MiB, which holds 65.5 seconds of audio at 8 kHz or 10.9 seconds at 48 kHz.

#### Turn detection modes

| Mode | A turn ends when | Use it for |
| - | - | - |
| `auto` | The server's turn detection judges that the speaker has finished, from what was said and how. | Voice agents and conversations. The default. |
| `vad` | `silence_timeout_ms` of silence has passed (default 700 ms). | Fixed silence-based endpointing. |
| `manual` | You send `finalize`. | Push-to-talk, or your own endpointing. |

**`auto`.** A turn opens as soon as voice activity is detected. The server then judges whether this is the user taking their turn. If it is, the server sends `user_turn_taken`, and it ends the turn when the speaker has finished, not on silence alone. A short pause in the middle of a sentence usually does not end the turn; a speaker who stops mid-sentence and does not go on has the turn ended about 2 seconds after they stopped. `silence_timeout_ms` is only a safety net here.

Other sounds, usually noise, a TV or other people talking nearby, end after a short quiet, or after 20 seconds at the latest, and are committed as non-user turns with `user_turn: false`. When the user starts speaking during such a sound, the sound before the speech is usually committed first as a non-user turn, and the speech opens a new turn. A sound that began shortly before the speech stays in the user's turn. A turn you end with `finalize` or `audio_done` before `user_turn_taken` is not split: all of it becomes one user turn.

This judgement needs `auto` in the **first** `config`; a `config` without `mode` has it. A session that starts in `vad` or `manual` and switches to `auto` later makes every turn a user turn as it opens (`user_turn_taken` right after `speech_start`, never `user_turn: false`). A session that starts in `auto` keeps the judgement when it switches away and back. In rare cases every turn of a session is treated as a user turn; `user_turn_taken` then follows `speech_start` immediately.

**`vad`.** A turn ends after `silence_timeout_ms` of silence, with `reason: "eot"`. Every turn is a user turn.

**`manual`.** A turn ends when you send `finalize`. A turn that has been silent for `silence_timeout_ms` ends too; at the default (60000) that never happens, because the 60-second turn limit comes first. Every turn is a user turn.

In every mode, a turn ends after 60 seconds at the latest, and an `auto` turn without `user_turn_taken` after 20 seconds (`reason: "max_turn_duration"`).

#### `silence_timeout_ms`

The default, the allowed range (inclusive) and the meaning depend on the mode:

| Mode | Default | Allowed | Meaning |
| - | - | - | - |
| `auto` | 5000 | 3000–60000 | A safety net for user turns: a user turn with no voice activity for this long ends with `reason: "silence_timeout"`. Turn detection normally ends a turn long before that. Non-user turns do not use it. |
| `vad` | 700 | 300–60000 | The silence that ends a turn (`reason: "eot"`). |
| `manual` | 60000 | 300–60000 | A safety net: a turn silent for this long ends with `reason: "silence_timeout"`. At 60000 it never fires. |

* In `vad` mode, every pause of this length ends the turn, including a pause inside a sentence. At short values, one sentence can arrive as several turns, and a word that starts softly right after such a pause can be split across two turns; both happen more often the shorter the value. For conversational speech, start with 500 ms or more.
* If you leave it out, the mode's default applies. `session_started` and `configured` always show the value in effect.
* The value must be a whole number inside the range of the mode it will run under: the `mode` in the same message, or else the current mode. In `config` the current mode is `auto`, so a `config` with `silence_timeout_ms: 700` and no `mode` is refused.
* Outside the range, `config` gets `error` with `invalid_config` and the connection closes with 4400; the message gives the range, for example "turn\_detection.silence\_timeout\_ms must be between 3000 and 60000 in auto mode". A `configure` gets `configured` with `ok: false` and the same message, and nothing in that `configure` is applied.
* A value that is not a non-negative integer is `invalid_config` in `config`, and a recoverable `invalid_request` (nothing applied) in `configure`.
* A `configure` that switches `mode` without `silence_timeout_ms` resets it to the new mode's default. To switch and keep your own value, send both.
* A new value takes effect at once, for the open turn too, from the point in the audio where the `configure` arrives.

### `audio`

```json theme={null}
{ "type": "audio", "data": "<bin: PCM bytes>" }
```

Audio in the format from `config`. `data` must be MessagePack `bin` holding the raw PCM bytes. Do not base64-encode the audio, and do not send it as a string or an array of numbers. If you do, you receive a recoverable `invalid_request`, and those messages are dropped: nothing in them is transcribed or counted as received audio.

Send audio after `session_started` (see [`config`](#config) for audio sent earlier). For live audio, send it as it is captured, 20–40 ms per message (see [Audio format](#audio-format)). If your client batches small writes (Nagle's algorithm), turn that off with `TCP_NODELAY`; browsers and common WebSocket libraries already send each message right away. You can send faster than real time, for example from a file: the server accepts it and reads it at a bounded rate, and results keep following the audio.

### `finalize`

```json theme={null}
{ "type": "finalize" }
```

Commit the current turn now, with `reason: "finalize"`. In `auto` mode, the server first settles its turn decisions on the audio already sent: a turn they already ended (possibly with `user_turn: false`) is not reopened, and if no turn is open after that, `finalize` is ignored. The turn `finalize` ends is always a user turn; `user_turn_taken` is sent first if it has not been.

**Push-to-talk:** use `mode: "manual"` and send `finalize` when the button is released. Send audio while the button is held; a turn opens on voice activity, so if none was detected, no turn is open and `finalize` is ignored. While the button is up you can send no audio, which keeps other sounds from opening turns; send `keepalive` then.

### `configure`

```json theme={null}
{
  "type": "configure",
  "turn_detection": { "mode": "vad", "silence_timeout_ms": 900 },
  "results": { "drafts": false },
  "context": { "terms": ["Fish Audio", "Main Street"] }
}
```

Change settings during the session. `turn_detection`, `results` and `context` take the same values as in `config`; every field is optional, and a field you leave out keeps its current value. `context` accepts `terms` only, and the new list replaces the old one; send earlier lines with [`context_add`](#context_add). The server answers with [`configured`](#configured). If any value is invalid, nothing in the message is applied.

`audio` is fixed for the session: to change the audio format, open a new session. A `configure` with an unknown field, with an `audio` that differs from the session's, or with `context.history` gets `configured` with `ok: false`, and nothing in it is applied. An `audio` identical to the session's is accepted. As with `config`, send only the fields listed here; `configured.config` shows the settings in effect.

* A change to `ignore_timestamps`, `diarize` or `tag_audio_events` applies to turns that open after `configured`. A turn that is already open keeps the settings it started with, so its `eager_end_of_turn` and `committed` always agree.
* When `mode` changes to or from `auto`, the server first settles its turn decisions on the audio already sent, so `configured` can take a few seconds.
* A turn's `user_turn` status follows the mode it opened in: a turn opened in `vad` or `manual` mode is always a user turn and gets no `user_turn_taken`. How an open turn ends follows the current mode.
* Switching away from `auto` settles an open turn that has no `user_turn_taken` yet: it becomes a user turn (`user_turn_taken` is sent) if there was speech in about the last second; otherwise it is committed at once with `user_turn: false`.

### `context_add`

```json theme={null}
{
  "type": "context_add",
  "items": [{ "role": "assistant", "text": "Sure. Which day works for you?" }],
  "reset_history": false
}
```

Add conversation context. The server keeps the session's conversation and uses the recent part of it to recognize names and follow-ups. Every committed user turn is added as a `user` item automatically; non-user turns are not added. Send what the other party said, for a voice agent each line it speaks, as `assistant` items, ideally right after the `committed` it answers. Items follow the `context.history` limits (up to 32 items of up to 2,000 characters per message). `reset_history: true` first drops the items you added before. There is no reply.

### `keepalive`

```json theme={null}
{ "type": "keepalive" }
```

Keeps an idle session open. A session closes after 30 seconds without any client message. A WebSocket ping counts as client activity too, so a client library that sends pings on its own keeps the session open.

### `audio_done`

```json theme={null}
{ "type": "audio_done" }
```

No more audio. The server commits the open turn (`reason: "audio_done"`), sends `session_done`, and closes the connection with 1000. In `auto` mode it first settles its turn decisions on the audio already sent; the turn `audio_done` ends is always a user turn, as with `finalize`.

### `agent_speaking`

```json theme={null}
{ "type": "agent_speaking", "speaking": true }
```

For voice agents in `auto` mode: tell the server when your agent's reply is in progress, so it can tell a short acknowledgement from the user taking the turn. While the agent is speaking, a "mm-hm" or "yeah" from the user does not take the turn: the server sends [`user_backchannel`](#user_backchannel) instead of `user_turn_taken`, and the turn commits as a non-user turn with `turn_kind: "backchannel"`.

* **When to send `true`:** when you commit to playing a reply, typically on `committed`, or, for a reply you prepared on `eager_end_of_turn`, when you start playing it. Preparing a reply is not speaking: do not send `true` on `eager_end_of_turn` itself, since the turn can still resume. "Speaking" covers the wait for your speech synthesis and the gaps between sentences.
* **When to send `false`:** when the last audio sample of the reply has played to the user, or when you stop the reply (barge-in). If you start playing a reply before `committed` and `turn_resumed` then cancels it, stop it and send `false`.
* **Pauses:** if a reply pauses for more than about 2 seconds, send `false` for the pause and `true` again when it goes on.
* **Default:** not speaking. Without this message, every acknowledgement can take the turn. Send it only when the value changes; repeating it changes nothing.
* **Timing:** it applies at the point in the audio where it arrives: after the audio you sent before it. Send it on the same connection as your audio, at the moment the reply starts or stops.
* **Other modes:** in `vad` and `manual` mode it is accepted and remembered, and has no effect. After a switch to `auto`, the remembered value applies.
* `speaking` must be a boolean. Anything else, or a message without it, is a recoverable `invalid_request` and changes nothing.
* Keep acoustic echo cancellation on. Without it, the agent's own voice can reach the microphone, open turns, and be taken for the user.

## Server messages

`draft`, `committed` and `progress` carry three watermarks, in milliseconds of audio: `audio_received_ms` (audio the server has received), `audio_processed_ms` (audio it has processed, never more than it received) and `audio_committed_ms` (the end of the audio covered by committed turns). The difference between the first two shows how far processing is behind your audio.

### `session_started`

| Field | Type | Description |
| - | - | - |
| `session_id` | string | The session's ID. |
| `request_id` | string | The same value as the `x-request-id` header. Include it when you contact support. |
| `config` | map | The effective configuration, with defaults filled in. |
| `limits` | map | `max_session_ms`, `max_turn_ms` and `max_frame_bytes`. See [Limits](#limits). |

Send audio after this message.

### `speech_start`

| Field | Type | Description |
| - | - | - |
| `turn_index` | integer | The turn that opened, counting from 0. |
| `audio_ms` | integer | Where the turn starts, slightly before the speech. |

A turn opened: voice activity began. It is sent shortly after voice activity begins. In `auto` mode, noise and other voices open turns too, so wait for `user_turn_taken` before treating it as the user's turn. In `auto` mode it can come later if you stream faster than real time or in messages of about 0.3 seconds or more; the turns are the same as for a real-time stream. If the speaker is still talking when a turn ends, the next turn starts at that turn's `audio_end_ms`.

### `user_turn_taken`

| Field | Type | Description |
| - | - | - |
| `turn_index` | integer | The turn. |
| `audio_ms` | integer | Where the server judged that the user took the turn. |

`auto` mode only: the server judged that the user is taking their turn. It usually comes within the first second or so of speech, and at the latest right before `committed` (always for a turn ended by `finalize` or `audio_done`). At most once per turn. When the sound before the user's speech is committed on its own, this turn's `speech_start` and `user_turn_taken` come right after that `committed`.

### `draft`

| Field | Type | Description |
| - | - | - |
| `turn_index` | integer | The turn. |
| `text` | string | The whole turn so far. Not final. |
| `settled_text` | string | The beginning of `text` that the server is confident will not change. Can be empty. See [Settled text](#settled-text). |
| `language` | string | Optional. The language's English name. See [Language](#language). |
| `language_code` | string | Optional. ISO 639-1 code. See [Language](#language). |
| `audio_ms` | integer | The audio position the draft covers up to. |

Each draft **replaces** the previous one for the turn. Drafts are best effort and only sent with `results.drafts: true`. Turn them on for live captions; an agent that acts on `eager_end_of_turn` and `committed` does not need them. Drafts may pause during long background sounds and resume when `user_turn_taken` comes.

#### Settled text

`settled_text` is the beginning of the draft's `text` that the server is confident will not change. The draft's `text` always starts with it. The server extends it only when it is confident, so it trails `text` and is often empty, especially early in a turn and in short turns.

Within a turn, `settled_text` normally only grows. Occasionally the server revises it, and a later draft's `settled_text` is shorter or empty. Always render from the latest draft.

For live captions or live translation, treat `settled_text` as stable and the rest of `text` as tentative. The rest can start with a space. `eager_end_of_turn` and `committed` usually begin with the last `settled_text` sent before them, but not always: take the final text from `committed`.

### `eager_end_of_turn`

| Field | Type | Description |
| - | - | - |
| `turn_index` | integer | The turn. |
| `text` | string | The turn's text. Can be empty. |
| `language` | string | Optional. See [Language](#language). |
| `language_code` | string | Optional. See [Language](#language). |
| `audio_ms` | integer | Optional. The audio position of the signal. |

With `turn_detection.eager: true` in `auto` mode, and only after `user_turn_taken`: the turn has probably ended. `text` and the language are exactly what `committed` will say unless `turn_resumed` follows, so you can start preparing your response early. Not every user turn has one. It usually comes some time before `committed`, and sometimes right before it.

### `turn_resumed`

| Field | Type | Description |
| - | - | - |
| `turn_index` | integer | The turn. |

The speaker went on after `eager_end_of_turn`: discard that text. If you already started playing a reply to it and sent `agent_speaking: true`, stop the reply and send `agent_speaking: false`.

### `user_backchannel`

| Field | Type | Description |
| - | - | - |
| `turn_index` | integer | The open turn, or, if no turn is open, the index the next turn will get. |
| `audio_ms` | integer | Where the acknowledgement is in the audio. |

`auto` mode only, while your agent is speaking (see [`agent_speaking`](#agent_speaking)): the user acknowledged ("mm-hm", "yeah", "right") without taking the turn. Keep talking. One message per acknowledgement. It always comes before the named turn's `committed`, and it can come before that turn's `speech_start`. A backchannel counts for the turn that contains it; that turn commits with `user_turn: false` and `turn_kind: "backchannel"` unless the user goes on to take the turn. A turn that opened in `vad` or `manual` mode never counts an acknowledgement. When your agent is not speaking, an acknowledgement takes the turn (`user_turn_taken`).

### `committed`

| Field | Type | Description |
| - | - | - |
| `turn_index` | integer | The turn. |
| `text` | string | The final transcript of the turn. Can be empty. |
| `words` | array | Present when `ignore_timestamps` is `false`: `[{ "text", "start_ms", "end_ms" }]`, or `[]` when there is nothing to align. |
| `language` | string | Optional. See [Language](#language). |
| `language_code` | string | Optional. See [Language](#language). |
| `audio_start_ms` | integer | Where the turn starts. |
| `audio_end_ms` | integer | Where the turn ends. |
| `reason` | string | Why the turn ended: `eot`, `finalize`, `silence_timeout`, `max_turn_duration` or `audio_done`. See [Why a turn ended](#why-a-turn-ended). |
| `degraded` | boolean | `true` when the final pass failed. See [Degraded commits](#degraded-commits). |
| `user_turn` | boolean | `true` for the user's turn; `false` for a non-user turn. Always `true` in `vad` and `manual` mode. If it is ever missing, treat it as `true`. |
| `turn_kind` | string | `"user"` (exactly when `user_turn` is true), `"backchannel"` (a non-user turn holding an acknowledgement) or `"other"` (noise, another voice, unclear). |

The final transcript of the turn. Decide whether to answer a turn by `user_turn`, never by `reason`: a turn the server ends itself (for example on `server_restarting`) has `reason: "finalize"` and may have `user_turn: false`. Treat a `turn_kind` you do not recognize like `"other"` when `user_turn` is false. A non-user turn is usually noise or another voice, often with empty `text`.

### `vad`

| Field | Type | Description |
| - | - | - |
| `audio_ms` | integer | The audio position. |
| `score` | number | Voice activity, from 0 to 1. |

Up to 10 per second, with `results.vad_events: true`.

### `eot_prob`

| Field | Type | Description |
| - | - | - |
| `turn_index` | integer | The turn. |
| `audio_ms` | integer | The audio position. |
| `prob` | number | End-of-turn likelihood, from 0 to 1. |

With `results.eot_events: true`, for display only. In `vad` mode it is 0.7 × the silence so far ÷ `silence_timeout_ms`: the turn ends where it reaches 0.7.

### `configured`

| Field | Type | Description |
| - | - | - |
| `ok` | boolean | `false` means nothing changed. |
| `config` | map | The configuration in effect after the `configure`. |
| `message` | string | Present when `ok` is `false`: why, in English, for humans. |

The reply to `configure`. `ok: false` comes for an invalid value, such as a `silence_timeout_ms` outside the mode's range, or a value over a limit, and for an unknown field, a changed `audio` or `context.history`.

### `progress`

Watermarks only. Sent every 5 seconds while the client sends nothing.

### `error`

| Field | Type | Description |
| - | - | - |
| `code` | integer | An HTTP-style status: 400, 408, 413, 500, 503 or 504. |
| `error_type` | string | What went wrong. See [Errors and close codes](#errors-and-close-codes). |
| `message` | string | A short English description, for humans. Do not parse it. |
| `request_id` | string | The session's request ID. |
| `recoverable` | boolean | `true` when the session continues, except `server_restarting`: see below. |

### `session_done`

| Field | Type | Description |
| - | - | - |
| `stats` | map | `audio_ms` (audio received), `turns` (every committed turn, user turn or not) and `request_id`. |

Sent after `audio_done`, just before the server closes the connection with 1000.

## Guarantees

* Every turn has exactly one `speech_start` and one `committed`, and nothing about that turn follows its `committed`.
* `user_turn_taken` comes at most once per turn, between `speech_start` and `committed`, and before any `eager_end_of_turn`. For a turn opened in `auto` mode, `user_turn` is true exactly when `user_turn_taken` was sent.
* A turn has at most one `eager_end_of_turn` that no `turn_resumed` follows. If it has one, `committed.text` and `committed.language_code` equal its own.
* `user_turn` is true exactly when `turn_kind` is `"user"`.
* `user_backchannel` comes only in `auto` mode, while your agent is speaking, and before its turn's `committed`.
* Every `draft` has `settled_text`, possibly empty, and the draft's `text` starts with it.
* `language` and `language_code` are both present or both absent.
* `committed.words` is present exactly when `ignore_timestamps` was `false` when the turn opened and the commit is not degraded.
* With `tag_audio_events` `false` when the turn opened, no text of the turn contains an opening tag bracket (`[`, U+FF3B or U+3010).

## Why a turn ended

`committed.reason` depends on the mode:

| Mode | `eot` | `silence_timeout` |
| - | - | - |
| `auto` | Turn detection ended the turn: the speaker finished, or stopped mid-sentence and did not go on (about 2 seconds later). Non-user turns, such as a sound that went quiet, end with `eot` too. | The safety net ended a user turn (`silence_timeout_ms`, default 5000). |
| `vad` | `silence_timeout_ms` of silence (default 700). | Never. |
| `manual` | Never. | `silence_timeout_ms` of silence (never at the default 60000). |

In every mode:

* `finalize`: you sent `finalize`, or the server ended the session (`server_restarting`, `max_duration_exceeded`).
* `max_turn_duration`: the turn reached 60 seconds, or 20 seconds for an `auto` turn without `user_turn_taken`.
* `audio_done`: you sent `audio_done`.

**Treat a `reason` you do not recognize like `eot`.** To decide whether to answer a turn, use `user_turn`, not `reason`.

## Speakers

`text` can contain speaker tags `<|speaker:N|>` (N = 0, 1, ...). Numbers are stable within a session and start over in a new one. Strip the tags if you only need the words, or send `results.diarize: false` to get text without them. With `diarize: false`, whitespace in the text, line breaks included, is collapsed to single spaces and trimmed; sound tags stay unless `tag_audio_events` is `false` (see [Sound tags](#sound-tags)).

Whitespace right after a speaker tag is not significant and can vary, for example `<|speaker:0|>Can you` or `<|speaker:0|> Can you`. To get each speaker's text, split the text on the tags, then trim each segment. If you only need the words, remove the tags, then trim the text and collapse runs of whitespace into one space.

## Sound tags

`text` can contain sound tags in square brackets, such as `[laughter]`, `[laughs]`, `[sighs]` or `[pause]`, in every turn detection mode and whether `diarize` is on or off. The set is open: a tag can be any short description, sometimes several words long or in the language of the speech. A tag can also come in full-width square brackets (U+FF3B and U+FF3D) or lenticular brackets (U+3010 and U+3011) instead of `[` and `]`. A turn's text can be a tag alone.

Tags are sounds, not words. Strip them when you need only the words, for example for search, word counts, or deciding whether there is anything to answer: remove every match of the regular expression `\[[^\[\]]*\]|\uFF3B[^\uFF3B\uFF3D]*\uFF3D|\u3010[^\u3010\u3011]*\u3011`, then trim the text and collapse runs of whitespace into one space. If you keep them for a language model, tell it that they are sounds, and do not answer a turn that holds only tags.

Or send `results.tag_audio_events: false` to get no sound tags at all. Every tag, in any of the three kinds of brackets and whatever is inside it, is then removed from every text of the turn (`draft`, `eager_end_of_turn` and `committed`), as are the `words` entries that belong to a tag, and whitespace is collapsed and trimmed as with `diarize: false`:

* An opening bracket is closed only by its own kind: `[` by `]`, U+FF3B by U+FF3D, U+3010 by U+3011. A closing bracket ends the tag of the nearest opening bracket of its kind that is still open, and everything between them is removed with it, brackets of the other kinds included. A tag inside a tag of the same kind goes with the outer one. A closing bracket with no opening bracket of its kind open before it is ordinary text and stays.
* An opening bracket that nothing closes depends on the message. In a `draft` it is taken for the start of a tag that is still being written: it and the rest of that draft, speaker tags included, are not shown until a later draft closes it. In `eager_end_of_turn` and `committed`, the turn's final text, only that bracket is removed: the text after it is shown, and its `words` are kept.

Speaker tags still depend on `diarize` alone. A turn that holds only tags still gets its `committed`, without a language, and with a `text` that is empty with `diarize: false`, or holds only the turn's speaker tags with `diarize` on.

## Language

`draft`, `eager_end_of_turn` and `committed` carry the language of their own `text`. Use `language_code` (ISO 639-1) in your code; `language` is its English name, for display, with the same names as [`POST /v1/asr`](https://docs.fish.audio/api-reference/endpoint/openapi-v1/speech-to-text). The language is detected from that message's text alone, ignoring speaker tags, sound tags in `[` and `]`, and interjections such as "okay", "hmm" or "uh". With `tag_audio_events: false`, the label can also reflect text that is not shown: the rest of a draft after an unclosed opening bracket, the inside of a tag that holds another tag, or a tag in full-width or lenticular brackets. It is one of:

`ar`, `zh`, `cs`, `da`, `nl`, `en`, `fi`, `fr`, `de`, `el`, `hi`, `hu`, `id`, `it`, `ja`, `ko`, `mk`, `ms`, `fa`, `pl`, `pt`, `ro`, `ru`, `es`, `sv`, `tl`, `th`, `tr`, `vi`.

Both fields are omitted when the text is empty, too short to tell or ambiguous. Replies such as "Okay" or "Yes." usually get no label, and other text of only a few words often does not get one either; keep the last label you saw. Mixed-language text gets one label, the dominant language. Drafts are labeled one by one and may change; `committed` is final.

## Degraded commits

If the final pass for a turn fails, you receive `error` with `engine_error` and `recoverable: true`, and then a `committed` with `degraded: true`. Its `text` and language are those of the turn's last draft (empty and without a language when the turn had no draft, as with `results.drafts: false`), and it has no `words`. With `tag_audio_events: false`, an unclosed opening bracket in that draft is handled as in any `committed`: only the bracket is removed, so the text after it, and its language, can appear even if that draft showed none. The session continues.

## Errors and close codes

| `error_type` | `code` | Recoverable | Then |
| - | - | - | - |
| `invalid_config` | 400 | No | Close 4400. The first message is not a readable `config` (for example a text frame or JSON), or the `config` is invalid, for example with an unknown field, a value over a limit, or `silence_timeout_ms` outside the mode's range. |
| `unsupported_audio` | 400 | No | Close 4400. A sample rate not in the list, a format other than `pcm_s16le`, or more than one channel. |
| `invalid_request` | 400 | Yes | The session continues. After `config`: a text frame, an unreadable message, an `audio` message whose `data` is not `bin` (the message is dropped), an over-limit `context_add`, a second `config`, or `agent_speaking` without a boolean `speaking`. |
| `idle_timeout` | 408 | No | Close 4408: 30 seconds without any client message, or no `config` within 10 seconds of connecting. |
| `max_duration_exceeded` | 413 | No | The open turn is committed (`reason: "finalize"`), then close 4413. |
| `frame_too_large` | 413 | No | Close 1009. A message over `limits.max_frame_bytes`. |
| `engine_error` | 500, 503 or 504 | Yes | A [degraded `committed`](#degraded-commits) follows (503: temporarily unavailable; 504: timed out). If the session could not start: `recoverable: false`, close 4500. |
| `internal` | 500 | No | Close 4500. |
| `server_restarting` | 503 | Yes | The open turn is committed (`reason: "finalize"`), then close 1012. Reconnect for a new session. |

`server_restarting` is the one recoverable error that closes the connection: the session cannot go on, but you can reconnect at once for a new one. If the first message is not a readable `config`, you get `invalid_config` with `recoverable: false` and close 4400.

A normal end is `session_done`, then close 1000. Match on `error_type`, not on `message`. In `auto` mode, a turn the server commits before closing may have `user_turn: false`.

## Limits

| Limit | Value |
| - | - |
| Audio | `pcm_s16le`, mono, at 8000, 12000, 16000, 22050, 24000, 32000, 44100 or 48000 Hz |
| Session length | 3,600 seconds (`limits.max_session_ms`) |
| Turn length | 60 seconds (`limits.max_turn_ms`); 20 seconds for an `auto` turn without `user_turn_taken` |
| `silence_timeout_ms` | `auto`: 3000–60000; `vad` and `manual`: 300–60000 |
| Message size | 1 MiB (`limits.max_frame_bytes`) |
| First `config` | Within 10 seconds of connecting; otherwise `idle_timeout` and close 4408 |
| Idle | 30 seconds without any client message |
| Drafts | At most every 250 ms |
| Context | 32 items × 2,000 characters per message; 100 terms × 32 characters |

## Example

A session in `auto` mode with eager end of turn, drafts and word timings. `C` is the client and `S` the server; fields are abbreviated.

```text theme={null}
C → config {audio: {format: "pcm_s16le", sample_rate: 16000, channels: 1},
            turn_detection: {mode: "auto", eager: true},
            results: {drafts: true, ignore_timestamps: false}}
S → session_started {seq: 0, session_id: "s_ab12…", request_id: "…", config: {…}, limits: {…}}
C → audio {data: <bin>} …
S → speech_start {seq: 1, turn_index: 0, audio_ms: 300}
S → draft {seq: 2, turn_index: 0, text: "what's the", settled_text: "", audio_ms: 900, …}
S → user_turn_taken {seq: 3, turn_index: 0, audio_ms: 1280}
S → draft {seq: 4, turn_index: 0, text: "what's the weather like", settled_text: "",
           language: "English", language_code: "en", audio_ms: 1800, …}
S → eager_end_of_turn {seq: 5, turn_index: 0, text: "What's the weather like?",
                       language: "English", language_code: "en", audio_ms: 2240}
S → committed {seq: 6, turn_index: 0, text: "What's the weather like?", words: […],
               language: "English", language_code: "en", audio_start_ms: 300,
               audio_end_ms: 2880, reason: "eot", degraded: false, user_turn: true,
               turn_kind: "user", …}
C → agent_speaking {speaking: true}
C → context_add {items: [{role: "assistant", text: "Sunny, 24 degrees, and a light breeze."}]}
S → speech_start {seq: 7, turn_index: 1, audio_ms: 3520}
S → user_backchannel {seq: 8, turn_index: 1, audio_ms: 3840}
S → committed {seq: 9, turn_index: 1, text: "Mm-hm.", audio_start_ms: 3520, audio_end_ms: 6080,
               reason: "eot", degraded: false, user_turn: false, turn_kind: "backchannel", …}
C → agent_speaking {speaking: false}
S → speech_start {seq: 10, turn_index: 2, audio_ms: 7040}
S → committed {seq: 11, turn_index: 2, text: "", audio_start_ms: 7040, audio_end_ms: 8640,
               reason: "eot", degraded: false, user_turn: false, turn_kind: "other", …}
C → audio_done
S → session_done {seq: 12, stats: {audio_ms: 8960, turns: 3, request_id: "…"}}
    close 1000
```

Turn 0 is the user's turn. The agent prepared its reply on `eager_end_of_turn`; once the turn commits, it starts playing the reply and sends `agent_speaking: true`. The first draft has no language: "what's the" is too short to tell. Both drafts have an empty `settled_text`, as is usual early in a turn. Turn 1 is the user saying "mm-hm" while the agent speaks: the server sends `user_backchannel`, so the agent keeps talking, and the turn commits as a non-user turn that is not added to the context. When the reply has played out, the agent sends `agent_speaking: false`. Turn 2 is a non-user turn, a sound such as a cough: the agent ignores it.

## Compatibility rules

* **Ignore fields and message types you do not know in server messages.** Version 1 only ever adds them. Breaking changes get a new path (`/v2/...`).
* Treat an unknown `reason` like `eot`, and an unknown `turn_kind` like `"other"` when `user_turn` is `false`.
* Match errors on `error_type`, not on `message`.

## Related

* [Realtime Speech to Text](https://docs.fish.audio/features/speech-to-text/realtime.md): what the realtime model does and when to use it.
* [Transcribe a live audio stream](https://docs.fish.audio/developer-guide/sdk-guide/cookbook/realtime-transcription.md): a complete client in Python and Node.js, and a browser microphone relay.
* [Build a realtime voice agent](https://docs.fish.audio/developer-guide/sdk-guide/cookbook/realtime-voice-agent.md): turn-taking, barge-in and backchannels.
* [Speech to Text](https://docs.fish.audio/api-reference/endpoint/openapi-v1/speech-to-text.md): transcribe a complete audio file with `POST /v1/asr`.


## AsyncAPI

````yaml api-reference/asyncapi-asr-realtime.yml asrRealtime
id: asrRealtime
title: Asr realtime
description: >
  Realtime speech-to-text channel. Clients stream audio and receive

  transcripts turn by turn, with turn detection, optional live drafts and

  conversation context.


  ## Connection Headers

  - `Authorization: Bearer <api_key>` - Required for authentication (see
  security section)

  - `model: transcribe-stream-1` (Preview) - Optional; the default


  Every message in both directions is one MessagePack map in a binary

  frame, with a `type` field. Send `config` first, wait for

  `session_started`, then stream `audio`. Ignore fields and message types

  you do not know in server messages: version 1 only adds them.
servers:
  - id: production
    protocol: wss
    host: api.fish.audio
    bindings: []
    variables: []
address: /v1/asr/realtime
parameters: []
bindings:
  - protocol: ws
    version: latest
    value:
      headers:
        type: object
        properties:
          model:
            type: string
            enum:
              - transcribe-stream-1
            default: transcribe-stream-1
            description: >-
              Realtime speech-to-text model. Optional; `transcribe-stream-1`
              (Preview) is the default and the only realtime model. The legacy
              name `transcribe-1-pro-realtime` reaches the same model.
    schemaProperties:
      - name: headers
        type: object
        required: false
        properties:
          - name: model
            type: string
            description: >-
              Realtime speech-to-text model. Optional; `transcribe-stream-1`
              (Preview) is the default and the only realtime model. The legacy
              name `transcribe-1-pro-realtime` reaches the same model.
            enumValues:
              - transcribe-stream-1
            required: false
operations:
  - &ref_2
    id: receiveAsrClientMessages
    title: Receive asr client messages
    description: >
      Server receives configuration, audio and control messages from the client.


      **Message Sequence:**

      1. Client sends `config` once, as the first message, within 10 seconds of
      connecting

      2. Client streams `audio` after `session_started`, 20–40 ms per message
      for live audio

      3. Client can send `finalize`, `configure`, `context_add`, `keepalive` and
      `agent_speaking` at any time

      4. Client sends `audio_done` when there is no more audio
    type: receive
    messages:
      - &ref_4
        id: config
        contentType: application/msgpack
        payload:
          - name: Configure the Session
            description: |
              The first message on the connection. Send it within 10 seconds of
              connecting, then wait for `session_started` before sending audio.
              An invalid `config`, including one with an unknown field, is
              answered with an `error` (`invalid_config` or `unsupported_audio`)
              and close code 4400. A first message that is not a readable
              `config` (for example a text frame or JSON) gets `invalid_config`
              and close code 4400 too. Send only the documented fields: not
              every other field is refused, so check `session_started.config`,
              which shows the settings in effect.
            type: object
            properties:
              - name: type
                type: string
                description: Message type identifier
                required: true
              - name: protocol_version
                type: integer
                description: Optional. Only `1` is valid.
                required: false
              - name: audio
                type: object
                required: true
                properties:
                  - name: format
                    type: string
                    description: 16-bit little-endian PCM.
                    required: true
                  - name: sample_rate
                    type: integer
                    description: >-
                      Sample rate in Hz. Rates other than 16000 are converted on
                      the server; you never need to resample.
                    enumValues:
                      - 8000
                      - 12000
                      - 16000
                      - 22050
                      - 24000
                      - 32000
                      - 44100
                      - 48000
                    required: true
                  - name: channels
                    type: integer
                    description: Mono only.
                    required: true
              - name: turn_detection
                type: object
                required: false
                properties:
                  - name: mode
                    type: string
                    description: >
                      auto: the server's turn detection decides when the user
                      has

                      finished, and tells user turns from noise and other
                      voices.

                      vad: a turn ends after `silence_timeout_ms` of silence.

                      manual: a turn ends when you send `finalize`.
                    enumValues:
                      - auto
                      - vad
                      - manual
                    required: false
                  - name: eager
                    type: boolean
                    description: Send `eager_end_of_turn` in auto mode.
                    required: false
                  - name: silence_timeout_ms
                    type: integer
                    description: >
                      auto: default 5000, allowed 3000–60000 (a safety net for
                      user

                      turns). vad: default 700, allowed 300–60000 (the silence
                      that

                      ends a turn). manual: default 60000, allowed 300–60000 (a
                      safety

                      net). Checked against the mode it will run under.
                    required: false
              - name: results
                type: object
                required: false
                properties:
                  - name: drafts
                    type: boolean
                    description: Send live `draft` messages.
                    required: false
                  - name: ignore_timestamps
                    type: boolean
                    description: '`false` adds `words` with timings to `committed`.'
                    required: false
                  - name: diarize
                    type: oneOf
                    description: >-
                      Speaker tags in the text. `auto` is the same as `true`;
                      `false` removes them. The strings `"true"` and `"false"`
                      are accepted too.
                    required: false
                  - name: tag_audio_events
                    type: boolean
                    description: >-
                      Sound tags such as `[laughter]` in the text; `false`
                      removes them. Only `true` or `false`.
                    required: false
                  - name: vad_events
                    type: boolean
                    description: Send `vad` messages.
                    required: false
                  - name: eot_events
                    type: boolean
                    description: Send `eot_prob` messages.
                    required: false
              - name: context
                type: object
                required: false
                properties:
                  - name: history
                    type: array
                    description: Earlier conversation, oldest first.
                    required: false
                    properties:
                      - name: role
                        type: string
                        enumValues:
                          - user
                          - assistant
                        required: true
                      - name: text
                        type: string
                        required: true
                  - name: terms
                    type: array
                    description: Names, products and jargon to recognize.
                    required: false
                    properties:
                      - name: item
                        type: string
                        required: false
              - name: client_reference_id
                type: string
                description: >-
                  Your own ID for the session. Recorded with the session; not
                  sent back.
                required: false
        headers: []
        jsonPayloadSchema:
          type: object
          required:
            - type
            - audio
          properties:
            type:
              type: string
              const: config
              description: Message type identifier
              x-parser-schema-id: <anonymous-schema-2>
            protocol_version:
              type: integer
              const: 1
              default: 1
              description: Optional. Only `1` is valid.
              x-parser-schema-id: <anonymous-schema-3>
            audio:
              type: object
              required:
                - format
                - sample_rate
                - channels
              properties:
                format:
                  type: string
                  const: pcm_s16le
                  description: 16-bit little-endian PCM.
                  x-parser-schema-id: <anonymous-schema-4>
                sample_rate:
                  type: integer
                  enum:
                    - 8000
                    - 12000
                    - 16000
                    - 22050
                    - 24000
                    - 32000
                    - 44100
                    - 48000
                  description: >-
                    Sample rate in Hz. Rates other than 16000 are converted on
                    the server; you never need to resample.
                  x-parser-schema-id: <anonymous-schema-5>
                channels:
                  type: integer
                  const: 1
                  description: Mono only.
                  x-parser-schema-id: <anonymous-schema-6>
              x-parser-schema-id: AsrAudioFormat
            turn_detection:
              type: object
              properties:
                mode:
                  type: string
                  enum:
                    - auto
                    - vad
                    - manual
                  default: auto
                  description: |
                    auto: the server's turn detection decides when the user has
                    finished, and tells user turns from noise and other voices.
                    vad: a turn ends after `silence_timeout_ms` of silence.
                    manual: a turn ends when you send `finalize`.
                  x-parser-schema-id: <anonymous-schema-7>
                eager:
                  type: boolean
                  default: false
                  description: Send `eager_end_of_turn` in auto mode.
                  x-parser-schema-id: <anonymous-schema-8>
                silence_timeout_ms:
                  type: integer
                  description: >
                    auto: default 5000, allowed 3000–60000 (a safety net for
                    user

                    turns). vad: default 700, allowed 300–60000 (the silence
                    that

                    ends a turn). manual: default 60000, allowed 300–60000 (a
                    safety

                    net). Checked against the mode it will run under.
                  x-parser-schema-id: <anonymous-schema-9>
              x-parser-schema-id: AsrTurnDetection
            results:
              type: object
              properties:
                drafts:
                  type: boolean
                  default: false
                  description: Send live `draft` messages.
                  x-parser-schema-id: <anonymous-schema-10>
                ignore_timestamps:
                  type: boolean
                  default: true
                  description: '`false` adds `words` with timings to `committed`.'
                  x-parser-schema-id: <anonymous-schema-11>
                diarize:
                  oneOf:
                    - type: boolean
                      x-parser-schema-id: <anonymous-schema-13>
                    - type: string
                      enum:
                        - auto
                        - 'true'
                        - 'false'
                      x-parser-schema-id: <anonymous-schema-14>
                  default: true
                  description: >-
                    Speaker tags in the text. `auto` is the same as `true`;
                    `false` removes them. The strings `"true"` and `"false"` are
                    accepted too.
                  x-parser-schema-id: <anonymous-schema-12>
                tag_audio_events:
                  type: boolean
                  default: true
                  description: >-
                    Sound tags such as `[laughter]` in the text; `false` removes
                    them. Only `true` or `false`.
                  x-parser-schema-id: <anonymous-schema-15>
                vad_events:
                  type: boolean
                  default: false
                  description: Send `vad` messages.
                  x-parser-schema-id: <anonymous-schema-16>
                eot_events:
                  type: boolean
                  default: false
                  description: Send `eot_prob` messages.
                  x-parser-schema-id: <anonymous-schema-17>
              x-parser-schema-id: AsrResults
            context:
              type: object
              properties:
                history:
                  type: array
                  maxItems: 32
                  items: &ref_0
                    type: object
                    required:
                      - role
                      - text
                    properties:
                      role:
                        type: string
                        enum:
                          - user
                          - assistant
                        x-parser-schema-id: <anonymous-schema-19>
                      text:
                        type: string
                        maxLength: 2000
                        x-parser-schema-id: <anonymous-schema-20>
                    x-parser-schema-id: AsrContextItem
                  description: Earlier conversation, oldest first.
                  x-parser-schema-id: <anonymous-schema-18>
                terms:
                  type: array
                  maxItems: 100
                  items:
                    type: string
                    maxLength: 32
                    x-parser-schema-id: <anonymous-schema-22>
                  description: Names, products and jargon to recognize.
                  x-parser-schema-id: <anonymous-schema-21>
              x-parser-schema-id: AsrContext
            client_reference_id:
              type: string
              maxLength: 256
              description: >-
                Your own ID for the session. Recorded with the session; not sent
                back.
              x-parser-schema-id: <anonymous-schema-23>
          x-parser-schema-id: <anonymous-schema-1>
        title: Configure the Session
        description: |
          The first message on the connection. Send it within 10 seconds of
          connecting, then wait for `session_started` before sending audio.
          An invalid `config`, including one with an unknown field, is
          answered with an `error` (`invalid_config` or `unsupported_audio`)
          and close code 4400. A first message that is not a readable
          `config` (for example a text frame or JSON) gets `invalid_config`
          and close code 4400 too. Send only the documented fields: not
          every other field is refused, so check `session_started.config`,
          which shows the settings in effect.
        example: |-
          {
            "type": "config",
            "audio": {
              "format": "pcm_s16le",
              "sample_rate": 16000,
              "channels": 1
            },
            "turn_detection": {
              "mode": "auto",
              "eager": true
            },
            "context": {
              "terms": [
                "Fish Audio"
              ]
            }
          }
        bindings: []
        extensions:
          - id: x-parser-unique-object-id
            value: config
      - &ref_5
        id: audio
        contentType: application/msgpack
        payload:
          - name: Send Audio
            description: >
              Audio in the format from `config`. Send it after
              `session_started`.

              Anything from 20 to 100 ms of audio per message works, and smaller

              messages give lower latency; for live audio, 20–40 ms per message
              is a

              good size. A message can be at most 1 MiB.
            type: object
            properties:
              - name: type
                type: string
                description: Message type identifier
                required: true
              - name: data
                type: string
                description: |
                  The raw PCM bytes in the configured format, as MessagePack
                  `bin`. Do not base64-encode the audio, and do not send it as a
                  string or an array of numbers. If you do, you receive a
                  recoverable `invalid_request`, and those messages are dropped:
                  nothing in them is transcribed or counted as received audio.
                  Any length; an odd trailing byte waits for the next message.
                required: true
        headers: []
        jsonPayloadSchema:
          type: object
          required:
            - type
            - data
          properties:
            type:
              type: string
              const: audio
              description: Message type identifier
              x-parser-schema-id: <anonymous-schema-25>
            data:
              type: string
              format: binary
              description: |
                The raw PCM bytes in the configured format, as MessagePack
                `bin`. Do not base64-encode the audio, and do not send it as a
                string or an array of numbers. If you do, you receive a
                recoverable `invalid_request`, and those messages are dropped:
                nothing in them is transcribed or counted as received audio.
                Any length; an odd trailing byte waits for the next message.
              x-parser-schema-id: <anonymous-schema-26>
          x-parser-schema-id: <anonymous-schema-24>
        title: Send Audio
        description: |
          Audio in the format from `config`. Send it after `session_started`.
          Anything from 20 to 100 ms of audio per message works, and smaller
          messages give lower latency; for live audio, 20–40 ms per message is a
          good size. A message can be at most 1 MiB.
        example: |-
          {
            "type": "audio",
            "data": "<binary PCM audio>"
          }
        bindings: []
        extensions:
          - id: x-parser-unique-object-id
            value: audio
      - &ref_6
        id: finalize
        contentType: application/msgpack
        payload:
          - name: Commit the Current Turn
            description: >
              Commits the current turn now, with `reason: "finalize"`. Ignored
              when

              no turn is open. In auto mode the turn it ends is always a user
              turn.

              Use it for push-to-talk (manual mode) when the button is released.
            type: object
            properties:
              - name: type
                type: string
                description: Message type identifier
                required: true
        headers: []
        jsonPayloadSchema:
          type: object
          required:
            - type
          properties:
            type:
              type: string
              const: finalize
              description: Message type identifier
              x-parser-schema-id: <anonymous-schema-28>
          x-parser-schema-id: <anonymous-schema-27>
        title: Commit the Current Turn
        description: |
          Commits the current turn now, with `reason: "finalize"`. Ignored when
          no turn is open. In auto mode the turn it ends is always a user turn.
          Use it for push-to-talk (manual mode) when the button is released.
        example: |-
          {
            "type": "finalize"
          }
        bindings: []
        extensions:
          - id: x-parser-unique-object-id
            value: finalize
      - &ref_7
        id: configure
        contentType: application/msgpack
        payload:
          - name: Change Settings
            description: >
              Changes settings during the session. Answered by `configured`.
              Every

              field is optional, and a field you leave out keeps its current
              value.

              The one exception: switching `mode` without `silence_timeout_ms`

              resets it to the new mode's default. If any value is invalid,

              nothing in the message is applied. `audio` is fixed for the

              session: a `configure` with an unknown field, with an `audio` that

              differs from the session's, or with `context.history` gets

              `configured` with `ok: false`, and nothing in it is applied. An

              `audio` identical to the session's is accepted. As with `config`,

              send only the documented fields; `configured.config` shows the

              settings in effect. When `mode` changes to or from `auto`,

              `configured` can take a few seconds.
            type: object
            properties:
              - name: type
                type: string
                description: Message type identifier
                required: true
              - name: turn_detection
                type: object
                description: >-
                  Turn detection changes in `configure`. Omitted fields keep
                  their current values.
                required: false
                properties:
                  - name: mode
                    type: string
                    description: >
                      auto: the server's turn detection decides when the user
                      has

                      finished, and tells user turns from noise and other
                      voices.

                      vad: a turn ends after `silence_timeout_ms` of silence.

                      manual: a turn ends when you send `finalize`.
                    enumValues:
                      - auto
                      - vad
                      - manual
                    required: false
                  - name: eager
                    type: boolean
                    description: Send `eager_end_of_turn` in auto mode.
                    required: false
                  - name: silence_timeout_ms
                    type: integer
                    description: >
                      auto: default 5000, allowed 3000–60000 (a safety net for
                      user

                      turns). vad: default 700, allowed 300–60000 (the silence
                      that

                      ends a turn). manual: default 60000, allowed 300–60000 (a
                      safety

                      net). Checked against the mode it will run under.
                    required: false
              - name: results
                type: object
                description: >-
                  Result changes in `configure`. Omitted fields keep their
                  current values.
                required: false
                properties:
                  - name: drafts
                    type: boolean
                    description: Send live `draft` messages.
                    required: false
                  - name: ignore_timestamps
                    type: boolean
                    description: '`false` adds `words` with timings to `committed`.'
                    required: false
                  - name: diarize
                    type: oneOf
                    description: >-
                      Speaker tags in the text. `auto` is the same as `true`;
                      `false` removes them. The strings `"true"` and `"false"`
                      are accepted too.
                    required: false
                  - name: tag_audio_events
                    type: boolean
                    description: >-
                      Sound tags such as `[laughter]` in the text; `false`
                      removes them. Only `true` or `false`.
                    required: false
                  - name: vad_events
                    type: boolean
                    description: Send `vad` messages.
                    required: false
                  - name: eot_events
                    type: boolean
                    description: Send `eot_prob` messages.
                    required: false
              - name: context
                type: object
                description: |
                  Only `terms` is accepted here. A `configure` with `history`
                  gets `configured` with `ok: false`; send earlier lines with
                  `context_add`.
                required: false
                properties:
                  - name: terms
                    type: array
                    description: Replaces the list of terms.
                    required: false
                    properties:
                      - name: item
                        type: string
                        required: false
        headers: []
        jsonPayloadSchema:
          type: object
          required:
            - type
          properties:
            type:
              type: string
              const: configure
              description: Message type identifier
              x-parser-schema-id: <anonymous-schema-30>
            turn_detection:
              description: >-
                Turn detection changes in `configure`. Omitted fields keep their
                current values.
              type: object
              properties:
                mode:
                  type: string
                  enum:
                    - auto
                    - vad
                    - manual
                  description: |
                    auto: the server's turn detection decides when the user has
                    finished, and tells user turns from noise and other voices.
                    vad: a turn ends after `silence_timeout_ms` of silence.
                    manual: a turn ends when you send `finalize`.
                  x-parser-schema-id: <anonymous-schema-31>
                eager:
                  type: boolean
                  description: Send `eager_end_of_turn` in auto mode.
                  x-parser-schema-id: <anonymous-schema-32>
                silence_timeout_ms:
                  type: integer
                  description: >
                    auto: default 5000, allowed 3000–60000 (a safety net for
                    user

                    turns). vad: default 700, allowed 300–60000 (the silence
                    that

                    ends a turn). manual: default 60000, allowed 300–60000 (a
                    safety

                    net). Checked against the mode it will run under.
                  x-parser-schema-id: <anonymous-schema-33>
              x-parser-schema-id: AsrTurnDetectionUpdate
            results:
              description: >-
                Result changes in `configure`. Omitted fields keep their current
                values.
              type: object
              properties:
                drafts:
                  type: boolean
                  description: Send live `draft` messages.
                  x-parser-schema-id: <anonymous-schema-34>
                ignore_timestamps:
                  type: boolean
                  description: '`false` adds `words` with timings to `committed`.'
                  x-parser-schema-id: <anonymous-schema-35>
                diarize:
                  oneOf:
                    - type: boolean
                      x-parser-schema-id: <anonymous-schema-37>
                    - type: string
                      enum:
                        - auto
                        - 'true'
                        - 'false'
                      x-parser-schema-id: <anonymous-schema-38>
                  description: >-
                    Speaker tags in the text. `auto` is the same as `true`;
                    `false` removes them. The strings `"true"` and `"false"` are
                    accepted too.
                  x-parser-schema-id: <anonymous-schema-36>
                tag_audio_events:
                  type: boolean
                  description: >-
                    Sound tags such as `[laughter]` in the text; `false` removes
                    them. Only `true` or `false`.
                  x-parser-schema-id: <anonymous-schema-39>
                vad_events:
                  type: boolean
                  description: Send `vad` messages.
                  x-parser-schema-id: <anonymous-schema-40>
                eot_events:
                  type: boolean
                  description: Send `eot_prob` messages.
                  x-parser-schema-id: <anonymous-schema-41>
              x-parser-schema-id: AsrResultsUpdate
            context:
              type: object
              properties:
                terms:
                  type: array
                  maxItems: 100
                  items:
                    type: string
                    maxLength: 32
                    x-parser-schema-id: <anonymous-schema-44>
                  description: Replaces the list of terms.
                  x-parser-schema-id: <anonymous-schema-43>
              description: |
                Only `terms` is accepted here. A `configure` with `history`
                gets `configured` with `ok: false`; send earlier lines with
                `context_add`.
              x-parser-schema-id: <anonymous-schema-42>
          x-parser-schema-id: <anonymous-schema-29>
        title: Change Settings
        description: |
          Changes settings during the session. Answered by `configured`. Every
          field is optional, and a field you leave out keeps its current value.
          The one exception: switching `mode` without `silence_timeout_ms`
          resets it to the new mode's default. If any value is invalid,
          nothing in the message is applied. `audio` is fixed for the
          session: a `configure` with an unknown field, with an `audio` that
          differs from the session's, or with `context.history` gets
          `configured` with `ok: false`, and nothing in it is applied. An
          `audio` identical to the session's is accepted. As with `config`,
          send only the documented fields; `configured.config` shows the
          settings in effect. When `mode` changes to or from `auto`,
          `configured` can take a few seconds.
        example: |-
          {
            "type": "configure",
            "turn_detection": {
              "mode": "vad",
              "silence_timeout_ms": 900
            }
          }
        bindings: []
        extensions:
          - id: x-parser-unique-object-id
            value: configure
      - &ref_8
        id: contextAdd
        contentType: application/msgpack
        payload:
          - name: Add Conversation Context
            description: >
              Adds conversation context. Committed user turns are added

              automatically; send what the other party (your agent) said,
              ideally

              right after the `committed` it answers. No reply.
            type: object
            properties:
              - name: type
                type: string
                description: Message type identifier
                required: true
              - name: items
                type: array
                description: >-
                  Conversation items, oldest first. Send each line your agent
                  speaks as an `assistant` item.
                required: true
                properties:
                  - name: role
                    type: string
                    enumValues:
                      - user
                      - assistant
                    required: true
                  - name: text
                    type: string
                    required: true
              - name: reset_history
                type: boolean
                description: First drop the items you added before.
                required: false
        headers: []
        jsonPayloadSchema:
          type: object
          required:
            - type
            - items
          properties:
            type:
              type: string
              const: context_add
              description: Message type identifier
              x-parser-schema-id: <anonymous-schema-46>
            items:
              type: array
              maxItems: 32
              items: *ref_0
              description: >-
                Conversation items, oldest first. Send each line your agent
                speaks as an `assistant` item.
              x-parser-schema-id: <anonymous-schema-47>
            reset_history:
              type: boolean
              default: false
              description: First drop the items you added before.
              x-parser-schema-id: <anonymous-schema-48>
          x-parser-schema-id: <anonymous-schema-45>
        title: Add Conversation Context
        description: |
          Adds conversation context. Committed user turns are added
          automatically; send what the other party (your agent) said, ideally
          right after the `committed` it answers. No reply.
        example: |-
          {
            "type": "context_add",
            "items": [
              {
                "role": "assistant",
                "text": "Sure. Which day works for you?"
              }
            ]
          }
        bindings: []
        extensions:
          - id: x-parser-unique-object-id
            value: contextAdd
      - &ref_9
        id: keepalive
        contentType: application/msgpack
        payload:
          - name: Keep the Session Open
            description: >
              Keeps an idle session open. A session closes after 30 seconds
              without

              any client message. A WebSocket ping counts as client activity
              too,

              so a client library that sends pings on its own keeps the session

              open.
            type: object
            properties:
              - name: type
                type: string
                description: Message type identifier
                required: true
        headers: []
        jsonPayloadSchema:
          type: object
          required:
            - type
          properties:
            type:
              type: string
              const: keepalive
              description: Message type identifier
              x-parser-schema-id: <anonymous-schema-50>
          x-parser-schema-id: <anonymous-schema-49>
        title: Keep the Session Open
        description: |
          Keeps an idle session open. A session closes after 30 seconds without
          any client message. A WebSocket ping counts as client activity too,
          so a client library that sends pings on its own keeps the session
          open.
        example: |-
          {
            "type": "keepalive"
          }
        bindings: []
        extensions:
          - id: x-parser-unique-object-id
            value: keepalive
      - &ref_10
        id: audioDone
        contentType: application/msgpack
        payload:
          - name: End of Audio
            description: >
              No more audio. The server commits the open turn

              (`reason: "audio_done"`), sends `session_done`, and closes with
              1000.
            type: object
            properties:
              - name: type
                type: string
                description: Message type identifier
                required: true
        headers: []
        jsonPayloadSchema:
          type: object
          required:
            - type
          properties:
            type:
              type: string
              const: audio_done
              description: Message type identifier
              x-parser-schema-id: <anonymous-schema-52>
          x-parser-schema-id: <anonymous-schema-51>
        title: End of Audio
        description: |
          No more audio. The server commits the open turn
          (`reason: "audio_done"`), sends `session_done`, and closes with 1000.
        example: |-
          {
            "type": "audio_done"
          }
        bindings: []
        extensions:
          - id: x-parser-unique-object-id
            value: audioDone
      - &ref_11
        id: agentSpeaking
        contentType: application/msgpack
        payload:
          - name: Agent Speaking State
            description: >
              For voice agents in auto mode. While the agent is speaking, a
              short

              acknowledgement from the user produces `user_backchannel` instead
              of

              `user_turn_taken`. Applies at its position in the audio stream;
              send

              it on the same connection as your audio, only when the value
              changes.

              No effect in vad and manual mode.
            type: object
            properties:
              - name: type
                type: string
                description: Message type identifier
                required: true
              - name: speaking
                type: boolean
                description: |
                  `true` when you commit to playing a reply (typically on
                  `committed`); `false` when its last sample has played or you
                  stop it. Default: not speaking.
                required: true
        headers: []
        jsonPayloadSchema:
          type: object
          required:
            - type
            - speaking
          properties:
            type:
              type: string
              const: agent_speaking
              description: Message type identifier
              x-parser-schema-id: <anonymous-schema-54>
            speaking:
              type: boolean
              description: |
                `true` when you commit to playing a reply (typically on
                `committed`); `false` when its last sample has played or you
                stop it. Default: not speaking.
              x-parser-schema-id: <anonymous-schema-55>
          x-parser-schema-id: <anonymous-schema-53>
        title: Agent Speaking State
        description: |
          For voice agents in auto mode. While the agent is speaking, a short
          acknowledgement from the user produces `user_backchannel` instead of
          `user_turn_taken`. Applies at its position in the audio stream; send
          it on the same connection as your audio, only when the value changes.
          No effect in vad and manual mode.
        example: |-
          {
            "type": "agent_speaking",
            "speaking": true
          }
        bindings: []
        extensions:
          - id: x-parser-unique-object-id
            value: agentSpeaking
    bindings: []
    extensions: &ref_1
      - id: x-parser-unique-object-id
        value: asrRealtime
  - &ref_3
    id: sendAsrServerMessages
    title: Send asr server messages
    description: >
      Server sends session, turn and transcript messages to the client.


      **Event Flow:**

      - Server sends `session_started` once, after a valid `config`

      - For each turn: `speech_start`, then optional `draft` messages,
      `user_turn_taken` (auto mode), optional `eager_end_of_turn` /
      `turn_resumed`, and exactly one `committed`

      - Server sends `user_backchannel` in auto mode while the client reports
      `agent_speaking: true`

      - Server sends `session_done` after `audio_done`, then closes with 1000

      - Clients should ignore unknown messages and fields to support future
      protocol extensions
    type: send
    messages:
      - &ref_12
        id: sessionStarted
        contentType: application/msgpack
        payload:
          - name: Session Started
            description: |
              The session is ready. Send audio after this message.
            type: object
            properties:
              - name: type
                type: string
                description: Message type identifier
                required: true
              - name: seq
                type: integer
                description: Message sequence number, increasing by one per server message.
                required: true
              - name: session_id
                type: string
                description: The session's ID.
                required: true
              - name: request_id
                type: string
                description: >-
                  Same as the `x-request-id` response header. Include it when
                  you contact support.
                required: true
              - name: config
                type: object
                description: The effective configuration, with defaults filled in.
                required: true
              - name: limits
                type: object
                required: true
                properties:
                  - name: max_session_ms
                    type: integer
                    description: Maximum session length (3600000).
                    required: false
                  - name: max_turn_ms
                    type: integer
                    description: Maximum turn length (60000).
                    required: false
                  - name: max_frame_bytes
                    type: integer
                    description: Maximum message size (1048576).
                    required: false
        headers: []
        jsonPayloadSchema:
          type: object
          required:
            - type
            - seq
            - session_id
            - request_id
            - config
            - limits
          properties:
            type:
              type: string
              const: session_started
              description: Message type identifier
              x-parser-schema-id: <anonymous-schema-57>
            seq:
              type: integer
              description: Message sequence number, increasing by one per server message.
              x-parser-schema-id: <anonymous-schema-58>
            session_id:
              type: string
              description: The session's ID.
              x-parser-schema-id: <anonymous-schema-59>
            request_id:
              type: string
              description: >-
                Same as the `x-request-id` response header. Include it when you
                contact support.
              x-parser-schema-id: <anonymous-schema-60>
            config:
              type: object
              description: The effective configuration, with defaults filled in.
              x-parser-schema-id: <anonymous-schema-61>
            limits:
              type: object
              properties:
                max_session_ms:
                  type: integer
                  description: Maximum session length (3600000).
                  x-parser-schema-id: <anonymous-schema-62>
                max_turn_ms:
                  type: integer
                  description: Maximum turn length (60000).
                  x-parser-schema-id: <anonymous-schema-63>
                max_frame_bytes:
                  type: integer
                  description: Maximum message size (1048576).
                  x-parser-schema-id: <anonymous-schema-64>
              x-parser-schema-id: AsrLimits
          x-parser-schema-id: <anonymous-schema-56>
        title: Session Started
        description: |
          The session is ready. Send audio after this message.
        example: |-
          {
            "type": "session_started",
            "seq": 0,
            "session_id": "s_ab12cd34",
            "request_id": "0b6f4c1e-7d2a-4e8b-9f3c-5a1d2e3f4b6c",
            "config": {
              "protocol_version": 1,
              "model": "transcribe-stream-1",
              "audio": {
                "format": "pcm_s16le",
                "sample_rate": 16000,
                "channels": 1
              },
              "turn_detection": {
                "mode": "auto",
                "eager": true,
                "silence_timeout_ms": 5000
              },
              "results": {
                "drafts": true,
                "ignore_timestamps": true,
                "diarize": true,
                "tag_audio_events": true,
                "vad_events": false,
                "eot_events": false
              }
            },
            "limits": {
              "max_session_ms": 3600000,
              "max_turn_ms": 60000,
              "max_frame_bytes": 1048576
            }
          }
        bindings: []
        extensions:
          - id: x-parser-unique-object-id
            value: sessionStarted
      - &ref_13
        id: speechStart
        contentType: application/msgpack
        payload:
          - name: Turn Opened
            description: >
              A turn opened on voice activity. In auto mode, noise and other
              voices

              open turns too: wait for `user_turn_taken` before treating it as
              the

              user's turn.
            type: object
            properties:
              - name: type
                type: string
                description: Message type identifier
                required: true
              - name: seq
                type: integer
                required: true
              - name: turn_index
                type: integer
                description: The turn that opened, counting from 0.
                required: true
              - name: audio_ms
                type: integer
                description: Where the turn starts, slightly before the speech.
                required: true
        headers: []
        jsonPayloadSchema:
          type: object
          required:
            - type
            - seq
            - turn_index
            - audio_ms
          properties:
            type:
              type: string
              const: speech_start
              description: Message type identifier
              x-parser-schema-id: <anonymous-schema-66>
            seq:
              type: integer
              x-parser-schema-id: <anonymous-schema-67>
            turn_index:
              type: integer
              description: The turn that opened, counting from 0.
              x-parser-schema-id: <anonymous-schema-68>
            audio_ms:
              type: integer
              description: Where the turn starts, slightly before the speech.
              x-parser-schema-id: <anonymous-schema-69>
          x-parser-schema-id: <anonymous-schema-65>
        title: Turn Opened
        description: |
          A turn opened on voice activity. In auto mode, noise and other voices
          open turns too: wait for `user_turn_taken` before treating it as the
          user's turn.
        example: |-
          {
            "type": "speech_start",
            "seq": 1,
            "turn_index": 0,
            "audio_ms": 300
          }
        bindings: []
        extensions:
          - id: x-parser-unique-object-id
            value: speechStart
      - &ref_14
        id: userTurnTaken
        contentType: application/msgpack
        payload:
          - name: User Took the Turn
            description: >
              Auto mode only: the server judged that the user is taking their
              turn.

              At most once per turn, before any `eager_end_of_turn`. For a voice

              agent that is speaking, this is the signal to stop (barge-in).
            type: object
            properties:
              - name: type
                type: string
                description: Message type identifier
                required: true
              - name: seq
                type: integer
                required: true
              - name: turn_index
                type: integer
                required: true
              - name: audio_ms
                type: integer
                description: Where the server judged that the user took the turn.
                required: true
        headers: []
        jsonPayloadSchema:
          type: object
          required:
            - type
            - seq
            - turn_index
            - audio_ms
          properties:
            type:
              type: string
              const: user_turn_taken
              description: Message type identifier
              x-parser-schema-id: <anonymous-schema-71>
            seq:
              type: integer
              x-parser-schema-id: <anonymous-schema-72>
            turn_index:
              type: integer
              x-parser-schema-id: <anonymous-schema-73>
            audio_ms:
              type: integer
              description: Where the server judged that the user took the turn.
              x-parser-schema-id: <anonymous-schema-74>
          x-parser-schema-id: <anonymous-schema-70>
        title: User Took the Turn
        description: |
          Auto mode only: the server judged that the user is taking their turn.
          At most once per turn, before any `eager_end_of_turn`. For a voice
          agent that is speaking, this is the signal to stop (barge-in).
        example: |-
          {
            "type": "user_turn_taken",
            "seq": 3,
            "turn_index": 0,
            "audio_ms": 1280
          }
        bindings: []
        extensions:
          - id: x-parser-unique-object-id
            value: userTurnTaken
      - &ref_15
        id: draft
        contentType: application/msgpack
        payload:
          - name: Draft Transcript
            description: >
              Live draft of the open turn, with `results.drafts: true`. Best
              effort.

              For live captions, show `settled_text` as stable and the rest of

              `text` as tentative; take the final text from `committed`.
            type: object
            properties:
              - name: type
                type: string
                description: Message type identifier
                required: true
              - name: seq
                type: integer
                required: true
              - name: turn_index
                type: integer
                required: true
              - name: text
                type: string
                description: The whole turn so far. Replaces the previous draft. Not final.
                required: true
              - name: settled_text
                type: string
                description: >
                  The beginning of `text` that the server is confident will not

                  change; `text` always starts with it. Often empty, especially

                  early in a turn and in short turns. Within a turn it normally

                  only grows, but the server can occasionally revise it, so
                  render

                  from the latest draft.
                required: true
              - name: language
                type: string
                description: Optional. English name of the detected language.
                required: false
              - name: language_code
                type: string
                description: Optional. ISO 639-1 code of the detected language.
                required: false
              - name: audio_ms
                type: integer
                description: The audio position the draft covers up to.
                required: true
              - name: audio_received_ms
                type: integer
                required: false
              - name: audio_processed_ms
                type: integer
                required: false
              - name: audio_committed_ms
                type: integer
                required: false
        headers: []
        jsonPayloadSchema:
          type: object
          required:
            - type
            - seq
            - turn_index
            - text
            - settled_text
            - audio_ms
          properties:
            type:
              type: string
              const: draft
              description: Message type identifier
              x-parser-schema-id: <anonymous-schema-76>
            seq:
              type: integer
              x-parser-schema-id: <anonymous-schema-77>
            turn_index:
              type: integer
              x-parser-schema-id: <anonymous-schema-78>
            text:
              type: string
              description: The whole turn so far. Replaces the previous draft. Not final.
              x-parser-schema-id: <anonymous-schema-79>
            settled_text:
              type: string
              description: |
                The beginning of `text` that the server is confident will not
                change; `text` always starts with it. Often empty, especially
                early in a turn and in short turns. Within a turn it normally
                only grows, but the server can occasionally revise it, so render
                from the latest draft.
              x-parser-schema-id: <anonymous-schema-80>
            language:
              type: string
              description: Optional. English name of the detected language.
              x-parser-schema-id: <anonymous-schema-81>
            language_code:
              type: string
              description: Optional. ISO 639-1 code of the detected language.
              x-parser-schema-id: <anonymous-schema-82>
            audio_ms:
              type: integer
              description: The audio position the draft covers up to.
              x-parser-schema-id: <anonymous-schema-83>
            audio_received_ms:
              type: integer
              x-parser-schema-id: <anonymous-schema-84>
            audio_processed_ms:
              type: integer
              x-parser-schema-id: <anonymous-schema-85>
            audio_committed_ms:
              type: integer
              x-parser-schema-id: <anonymous-schema-86>
          x-parser-schema-id: <anonymous-schema-75>
        title: Draft Transcript
        description: |
          Live draft of the open turn, with `results.drafts: true`. Best effort.
          For live captions, show `settled_text` as stable and the rest of
          `text` as tentative; take the final text from `committed`.
        example: |-
          {
            "type": "draft",
            "seq": 4,
            "turn_index": 0,
            "text": "what's the weather like",
            "settled_text": "",
            "language": "English",
            "language_code": "en",
            "audio_ms": 1800,
            "audio_received_ms": 1900,
            "audio_processed_ms": 1800,
            "audio_committed_ms": 0
          }
        bindings: []
        extensions:
          - id: x-parser-unique-object-id
            value: draft
      - &ref_16
        id: eagerEndOfTurn
        contentType: application/msgpack
        payload:
          - name: Eager End of Turn
            description: >
              With `turn_detection.eager: true` in auto mode, after

              `user_turn_taken`: the turn has probably ended. Start preparing
              your

              response; `turn_resumed` cancels it. Not every turn has one.
            type: object
            properties:
              - name: type
                type: string
                description: Message type identifier
                required: true
              - name: seq
                type: integer
                required: true
              - name: turn_index
                type: integer
                required: true
              - name: text
                type: string
                description: >-
                  Exactly what `committed` will say unless `turn_resumed`
                  follows. Can be empty.
                required: true
              - name: language
                type: string
                required: false
              - name: language_code
                type: string
                required: false
              - name: audio_ms
                type: integer
                description: Optional. The audio position of the signal.
                required: false
        headers: []
        jsonPayloadSchema:
          type: object
          required:
            - type
            - seq
            - turn_index
            - text
          properties:
            type:
              type: string
              const: eager_end_of_turn
              description: Message type identifier
              x-parser-schema-id: <anonymous-schema-88>
            seq:
              type: integer
              x-parser-schema-id: <anonymous-schema-89>
            turn_index:
              type: integer
              x-parser-schema-id: <anonymous-schema-90>
            text:
              type: string
              description: >-
                Exactly what `committed` will say unless `turn_resumed` follows.
                Can be empty.
              x-parser-schema-id: <anonymous-schema-91>
            language:
              type: string
              x-parser-schema-id: <anonymous-schema-92>
            language_code:
              type: string
              x-parser-schema-id: <anonymous-schema-93>
            audio_ms:
              type: integer
              description: Optional. The audio position of the signal.
              x-parser-schema-id: <anonymous-schema-94>
          x-parser-schema-id: <anonymous-schema-87>
        title: Eager End of Turn
        description: |
          With `turn_detection.eager: true` in auto mode, after
          `user_turn_taken`: the turn has probably ended. Start preparing your
          response; `turn_resumed` cancels it. Not every turn has one.
        example: |-
          {
            "type": "eager_end_of_turn",
            "seq": 5,
            "turn_index": 0,
            "text": "What's the weather like?",
            "language": "English",
            "language_code": "en",
            "audio_ms": 2240
          }
        bindings: []
        extensions:
          - id: x-parser-unique-object-id
            value: eagerEndOfTurn
      - &ref_17
        id: turnResumed
        contentType: application/msgpack
        payload:
          - name: Turn Resumed
            description: >
              The speaker went on after `eager_end_of_turn`: discard that text.
              If

              you already started playing a reply, stop it and send

              `agent_speaking: false`.
            type: object
            properties:
              - name: type
                type: string
                description: Message type identifier
                required: true
              - name: seq
                type: integer
                required: true
              - name: turn_index
                type: integer
                required: true
        headers: []
        jsonPayloadSchema:
          type: object
          required:
            - type
            - seq
            - turn_index
          properties:
            type:
              type: string
              const: turn_resumed
              description: Message type identifier
              x-parser-schema-id: <anonymous-schema-96>
            seq:
              type: integer
              x-parser-schema-id: <anonymous-schema-97>
            turn_index:
              type: integer
              x-parser-schema-id: <anonymous-schema-98>
          x-parser-schema-id: <anonymous-schema-95>
        title: Turn Resumed
        description: |
          The speaker went on after `eager_end_of_turn`: discard that text. If
          you already started playing a reply, stop it and send
          `agent_speaking: false`.
        example: |-
          {
            "type": "turn_resumed",
            "seq": 6,
            "turn_index": 0
          }
        bindings: []
        extensions:
          - id: x-parser-unique-object-id
            value: turnResumed
      - &ref_18
        id: userBackchannel
        contentType: application/msgpack
        payload:
          - name: User Backchannel
            description: >
              Auto mode only, while your agent is speaking: the user
              acknowledged

              ("mm-hm", "yeah") without taking the turn. Keep talking.
            type: object
            properties:
              - name: type
                type: string
                description: Message type identifier
                required: true
              - name: seq
                type: integer
                required: true
              - name: turn_index
                type: integer
                description: >-
                  The open turn, or the index the next turn will get when no
                  turn is open.
                required: true
              - name: audio_ms
                type: integer
                description: Where the acknowledgement is in the audio.
                required: true
        headers: []
        jsonPayloadSchema:
          type: object
          required:
            - type
            - seq
            - turn_index
            - audio_ms
          properties:
            type:
              type: string
              const: user_backchannel
              description: Message type identifier
              x-parser-schema-id: <anonymous-schema-100>
            seq:
              type: integer
              x-parser-schema-id: <anonymous-schema-101>
            turn_index:
              type: integer
              description: >-
                The open turn, or the index the next turn will get when no turn
                is open.
              x-parser-schema-id: <anonymous-schema-102>
            audio_ms:
              type: integer
              description: Where the acknowledgement is in the audio.
              x-parser-schema-id: <anonymous-schema-103>
          x-parser-schema-id: <anonymous-schema-99>
        title: User Backchannel
        description: |
          Auto mode only, while your agent is speaking: the user acknowledged
          ("mm-hm", "yeah") without taking the turn. Keep talking.
        example: |-
          {
            "type": "user_backchannel",
            "seq": 8,
            "turn_index": 1,
            "audio_ms": 3840
          }
        bindings: []
        extensions:
          - id: x-parser-unique-object-id
            value: userBackchannel
      - &ref_19
        id: committed
        contentType: application/msgpack
        payload:
          - name: Committed Turn
            description: >
              The final transcript of a turn. Every turn has exactly one, and
              nothing

              about the turn follows it.
            type: object
            properties:
              - name: type
                type: string
                description: Message type identifier
                required: true
              - name: seq
                type: integer
                required: true
              - name: turn_index
                type: integer
                required: true
              - name: text
                type: string
                description: >-
                  The final transcript of the turn. Can contain speaker tags
                  such as `<|speaker:0|>` (unless `results.diarize` is `false`)
                  and sound tags such as `[laughter]` (unless
                  `results.tag_audio_events` is `false`). Can be empty.
                required: true
              - name: words
                type: array
                description: >-
                  Present when `results.ignore_timestamps` is `false` and the
                  commit is not degraded.
                required: false
                properties:
                  - name: text
                    type: string
                    required: true
                  - name: start_ms
                    type: integer
                    required: true
                  - name: end_ms
                    type: integer
                    required: true
              - name: language
                type: string
                required: false
              - name: language_code
                type: string
                required: false
              - name: audio_start_ms
                type: integer
                required: true
              - name: audio_end_ms
                type: integer
                required: true
              - name: reason
                type: string
                description: Why the turn ended. Treat an unknown value like `eot`.
                enumValues:
                  - eot
                  - finalize
                  - silence_timeout
                  - max_turn_duration
                  - audio_done
                required: true
              - name: degraded
                type: boolean
                description: >-
                  `true` when the final pass failed and the text comes from the
                  last draft.
                required: true
              - name: user_turn
                type: boolean
                description: >-
                  `true` for the user's turn. Decide whether to answer by this
                  field. Treat a missing value as `true`.
                required: true
              - name: turn_kind
                type: string
                description: >-
                  `user` exactly when `user_turn` is true. Treat an unknown
                  value like `other` when `user_turn` is false.
                enumValues:
                  - user
                  - backchannel
                  - other
                required: true
              - name: audio_received_ms
                type: integer
                required: false
              - name: audio_processed_ms
                type: integer
                required: false
              - name: audio_committed_ms
                type: integer
                required: false
        headers: []
        jsonPayloadSchema:
          type: object
          required:
            - type
            - seq
            - turn_index
            - text
            - audio_start_ms
            - audio_end_ms
            - reason
            - degraded
            - user_turn
            - turn_kind
          properties:
            type:
              type: string
              const: committed
              description: Message type identifier
              x-parser-schema-id: <anonymous-schema-105>
            seq:
              type: integer
              x-parser-schema-id: <anonymous-schema-106>
            turn_index:
              type: integer
              x-parser-schema-id: <anonymous-schema-107>
            text:
              type: string
              description: >-
                The final transcript of the turn. Can contain speaker tags such
                as `<|speaker:0|>` (unless `results.diarize` is `false`) and
                sound tags such as `[laughter]` (unless
                `results.tag_audio_events` is `false`). Can be empty.
              x-parser-schema-id: <anonymous-schema-108>
            words:
              type: array
              items:
                type: object
                required:
                  - text
                  - start_ms
                  - end_ms
                properties:
                  text:
                    type: string
                    x-parser-schema-id: <anonymous-schema-110>
                  start_ms:
                    type: integer
                    x-parser-schema-id: <anonymous-schema-111>
                  end_ms:
                    type: integer
                    x-parser-schema-id: <anonymous-schema-112>
                x-parser-schema-id: AsrWord
              description: >-
                Present when `results.ignore_timestamps` is `false` and the
                commit is not degraded.
              x-parser-schema-id: <anonymous-schema-109>
            language:
              type: string
              x-parser-schema-id: <anonymous-schema-113>
            language_code:
              type: string
              x-parser-schema-id: <anonymous-schema-114>
            audio_start_ms:
              type: integer
              x-parser-schema-id: <anonymous-schema-115>
            audio_end_ms:
              type: integer
              x-parser-schema-id: <anonymous-schema-116>
            reason:
              type: string
              enum:
                - eot
                - finalize
                - silence_timeout
                - max_turn_duration
                - audio_done
              description: Why the turn ended. Treat an unknown value like `eot`.
              x-parser-schema-id: <anonymous-schema-117>
            degraded:
              type: boolean
              description: >-
                `true` when the final pass failed and the text comes from the
                last draft.
              x-parser-schema-id: <anonymous-schema-118>
            user_turn:
              type: boolean
              description: >-
                `true` for the user's turn. Decide whether to answer by this
                field. Treat a missing value as `true`.
              x-parser-schema-id: <anonymous-schema-119>
            turn_kind:
              type: string
              enum:
                - user
                - backchannel
                - other
              description: >-
                `user` exactly when `user_turn` is true. Treat an unknown value
                like `other` when `user_turn` is false.
              x-parser-schema-id: <anonymous-schema-120>
            audio_received_ms:
              type: integer
              x-parser-schema-id: <anonymous-schema-121>
            audio_processed_ms:
              type: integer
              x-parser-schema-id: <anonymous-schema-122>
            audio_committed_ms:
              type: integer
              x-parser-schema-id: <anonymous-schema-123>
          x-parser-schema-id: <anonymous-schema-104>
        title: Committed Turn
        description: >
          The final transcript of a turn. Every turn has exactly one, and
          nothing

          about the turn follows it.
        example: |-
          {
            "type": "committed",
            "seq": 6,
            "turn_index": 0,
            "text": "What's the weather like?",
            "language": "English",
            "language_code": "en",
            "audio_start_ms": 300,
            "audio_end_ms": 2880,
            "reason": "eot",
            "degraded": false,
            "user_turn": true,
            "turn_kind": "user",
            "audio_received_ms": 3000,
            "audio_processed_ms": 2900,
            "audio_committed_ms": 2880
          }
        bindings: []
        extensions:
          - id: x-parser-unique-object-id
            value: committed
      - &ref_20
        id: vad
        contentType: application/msgpack
        payload:
          - name: Voice Activity
            description: >
              Voice activity, up to 10 per second, with `results.vad_events:
              true`.
            type: object
            properties:
              - name: type
                type: string
                description: Message type identifier
                required: true
              - name: seq
                type: integer
                required: true
              - name: audio_ms
                type: integer
                required: true
              - name: score
                type: number
                description: Voice activity.
                required: true
        headers: []
        jsonPayloadSchema:
          type: object
          required:
            - type
            - seq
            - audio_ms
            - score
          properties:
            type:
              type: string
              const: vad
              description: Message type identifier
              x-parser-schema-id: <anonymous-schema-125>
            seq:
              type: integer
              x-parser-schema-id: <anonymous-schema-126>
            audio_ms:
              type: integer
              x-parser-schema-id: <anonymous-schema-127>
            score:
              type: number
              minimum: 0
              maximum: 1
              description: Voice activity.
              x-parser-schema-id: <anonymous-schema-128>
          x-parser-schema-id: <anonymous-schema-124>
        title: Voice Activity
        description: |
          Voice activity, up to 10 per second, with `results.vad_events: true`.
        example: |-
          {
            "type": "vad",
            "seq": 12,
            "audio_ms": 1100,
            "score": 0.93
          }
        bindings: []
        extensions:
          - id: x-parser-unique-object-id
            value: vad
      - &ref_21
        id: eotProb
        contentType: application/msgpack
        payload:
          - name: End-of-Turn Likelihood
            description: >
              End-of-turn likelihood for display, with `results.eot_events:
              true`.
            type: object
            properties:
              - name: type
                type: string
                description: Message type identifier
                required: true
              - name: seq
                type: integer
                required: true
              - name: turn_index
                type: integer
                required: true
              - name: audio_ms
                type: integer
                required: true
              - name: prob
                type: number
                required: true
        headers: []
        jsonPayloadSchema:
          type: object
          required:
            - type
            - seq
            - turn_index
            - audio_ms
            - prob
          properties:
            type:
              type: string
              const: eot_prob
              description: Message type identifier
              x-parser-schema-id: <anonymous-schema-130>
            seq:
              type: integer
              x-parser-schema-id: <anonymous-schema-131>
            turn_index:
              type: integer
              x-parser-schema-id: <anonymous-schema-132>
            audio_ms:
              type: integer
              x-parser-schema-id: <anonymous-schema-133>
            prob:
              type: number
              minimum: 0
              maximum: 1
              x-parser-schema-id: <anonymous-schema-134>
          x-parser-schema-id: <anonymous-schema-129>
        title: End-of-Turn Likelihood
        description: |
          End-of-turn likelihood for display, with `results.eot_events: true`.
        example: |-
          {
            "type": "eot_prob",
            "seq": 13,
            "turn_index": 0,
            "audio_ms": 2200,
            "prob": 0.42
          }
        bindings: []
        extensions:
          - id: x-parser-unique-object-id
            value: eotProb
      - &ref_22
        id: configured
        contentType: application/msgpack
        payload:
          - name: Configure Result
            description: |
              The reply to `configure`.
            type: object
            properties:
              - name: type
                type: string
                description: Message type identifier
                required: true
              - name: seq
                type: integer
                required: true
              - name: ok
                type: boolean
                description: '`false` means nothing changed.'
                required: true
              - name: config
                type: object
                description: The configuration in effect.
                required: true
              - name: message
                type: string
                description: Present when `ok` is `false`. Why, in English, for humans.
                required: false
        headers: []
        jsonPayloadSchema:
          type: object
          required:
            - type
            - seq
            - ok
            - config
          properties:
            type:
              type: string
              const: configured
              description: Message type identifier
              x-parser-schema-id: <anonymous-schema-136>
            seq:
              type: integer
              x-parser-schema-id: <anonymous-schema-137>
            ok:
              type: boolean
              description: '`false` means nothing changed.'
              x-parser-schema-id: <anonymous-schema-138>
            config:
              type: object
              description: The configuration in effect.
              x-parser-schema-id: <anonymous-schema-139>
            message:
              type: string
              description: Present when `ok` is `false`. Why, in English, for humans.
              x-parser-schema-id: <anonymous-schema-140>
          x-parser-schema-id: <anonymous-schema-135>
        title: Configure Result
        description: |
          The reply to `configure`.
        example: |-
          {
            "type": "configured",
            "seq": 1,
            "ok": false,
            "config": {
              "turn_detection": {
                "mode": "auto",
                "eager": false,
                "silence_timeout_ms": 5000
              }
            },
            "message": "turn_detection.silence_timeout_ms must be between 3000 and 60000 in auto mode"
          }
        bindings: []
        extensions:
          - id: x-parser-unique-object-id
            value: configured
      - &ref_23
        id: progress
        contentType: application/msgpack
        payload:
          - name: Progress
            description: |
              Watermarks only, every 5 seconds while the client sends nothing.
            type: object
            properties:
              - name: type
                type: string
                description: Message type identifier
                required: true
              - name: seq
                type: integer
                required: true
              - name: audio_received_ms
                type: integer
                required: false
              - name: audio_processed_ms
                type: integer
                required: false
              - name: audio_committed_ms
                type: integer
                required: false
        headers: []
        jsonPayloadSchema:
          type: object
          required:
            - type
            - seq
          properties:
            type:
              type: string
              const: progress
              description: Message type identifier
              x-parser-schema-id: <anonymous-schema-142>
            seq:
              type: integer
              x-parser-schema-id: <anonymous-schema-143>
            audio_received_ms:
              type: integer
              x-parser-schema-id: <anonymous-schema-144>
            audio_processed_ms:
              type: integer
              x-parser-schema-id: <anonymous-schema-145>
            audio_committed_ms:
              type: integer
              x-parser-schema-id: <anonymous-schema-146>
          x-parser-schema-id: <anonymous-schema-141>
        title: Progress
        description: |
          Watermarks only, every 5 seconds while the client sends nothing.
        example: |-
          {
            "type": "progress",
            "seq": 30,
            "audio_received_ms": 12000,
            "audio_processed_ms": 12000,
            "audio_committed_ms": 9600
          }
        bindings: []
        extensions:
          - id: x-parser-unique-object-id
            value: progress
      - &ref_24
        id: error
        contentType: application/msgpack
        payload:
          - name: Error
            description: |
              An error. When `recoverable` is `false`, the server closes the
              connection (close codes 4400, 4408, 4413, 4500 or 1009).
              `idle_timeout` (close 4408) comes after 30 seconds without any
              client message, or when no `config` arrives within 10 seconds of
              connecting. `server_restarting` is recoverable but still closes
              with 1012: reconnect for a new session.
            type: object
            properties:
              - name: type
                type: string
                description: Message type identifier
                required: true
              - name: seq
                type: integer
                required: true
              - name: code
                type: integer
                description: HTTP-style status.
                enumValues:
                  - 400
                  - 408
                  - 413
                  - 500
                  - 503
                  - 504
                required: true
              - name: error_type
                type: string
                description: Match on this field, not on `message`.
                enumValues:
                  - invalid_config
                  - unsupported_audio
                  - invalid_request
                  - idle_timeout
                  - max_duration_exceeded
                  - frame_too_large
                  - engine_error
                  - internal
                  - server_restarting
                required: true
              - name: message
                type: string
                description: A short English description, for humans. Do not parse it.
                required: true
              - name: request_id
                type: string
                required: true
              - name: recoverable
                type: boolean
                description: |
                  `true` when the session continues, except for
                  `server_restarting`, which commits the open turn and closes
                  with 1012 so you can reconnect.
                required: true
        headers: []
        jsonPayloadSchema:
          type: object
          required:
            - type
            - seq
            - code
            - error_type
            - message
            - request_id
            - recoverable
          properties:
            type:
              type: string
              const: error
              description: Message type identifier
              x-parser-schema-id: <anonymous-schema-148>
            seq:
              type: integer
              x-parser-schema-id: <anonymous-schema-149>
            code:
              type: integer
              enum:
                - 400
                - 408
                - 413
                - 500
                - 503
                - 504
              description: HTTP-style status.
              x-parser-schema-id: <anonymous-schema-150>
            error_type:
              type: string
              enum:
                - invalid_config
                - unsupported_audio
                - invalid_request
                - idle_timeout
                - max_duration_exceeded
                - frame_too_large
                - engine_error
                - internal
                - server_restarting
              description: Match on this field, not on `message`.
              x-parser-schema-id: <anonymous-schema-151>
            message:
              type: string
              description: A short English description, for humans. Do not parse it.
              x-parser-schema-id: <anonymous-schema-152>
            request_id:
              type: string
              x-parser-schema-id: <anonymous-schema-153>
            recoverable:
              type: boolean
              description: |
                `true` when the session continues, except for
                `server_restarting`, which commits the open turn and closes
                with 1012 so you can reconnect.
              x-parser-schema-id: <anonymous-schema-154>
          x-parser-schema-id: <anonymous-schema-147>
        title: Error
        description: |
          An error. When `recoverable` is `false`, the server closes the
          connection (close codes 4400, 4408, 4413, 4500 or 1009).
          `idle_timeout` (close 4408) comes after 30 seconds without any
          client message, or when no `config` arrives within 10 seconds of
          connecting. `server_restarting` is recoverable but still closes
          with 1012: reconnect for a new session.
        example: |-
          {
            "type": "error",
            "seq": 1,
            "code": 400,
            "error_type": "unsupported_audio",
            "message": "audio.sample_rate must be one of 8000, 12000, 16000, 22050, 24000, 32000, 44100, 48000",
            "request_id": "0b6f4c1e-7d2a-4e8b-9f3c-5a1d2e3f4b6c",
            "recoverable": false
          }
        bindings: []
        extensions:
          - id: x-parser-unique-object-id
            value: error
      - &ref_25
        id: sessionDone
        contentType: application/msgpack
        payload:
          - name: Session Done
            description: |
              Sent after `audio_done`, just before the server closes with 1000.
            type: object
            properties:
              - name: type
                type: string
                description: Message type identifier
                required: true
              - name: seq
                type: integer
                required: true
              - name: stats
                type: object
                required: true
                properties:
                  - name: audio_ms
                    type: integer
                    description: Audio received in the session.
                    required: false
                  - name: turns
                    type: integer
                    description: Every committed turn, user turn or not.
                    required: false
                  - name: request_id
                    type: string
                    required: false
        headers: []
        jsonPayloadSchema:
          type: object
          required:
            - type
            - seq
            - stats
          properties:
            type:
              type: string
              const: session_done
              description: Message type identifier
              x-parser-schema-id: <anonymous-schema-156>
            seq:
              type: integer
              x-parser-schema-id: <anonymous-schema-157>
            stats:
              type: object
              properties:
                audio_ms:
                  type: integer
                  description: Audio received in the session.
                  x-parser-schema-id: <anonymous-schema-159>
                turns:
                  type: integer
                  description: Every committed turn, user turn or not.
                  x-parser-schema-id: <anonymous-schema-160>
                request_id:
                  type: string
                  x-parser-schema-id: <anonymous-schema-161>
              x-parser-schema-id: <anonymous-schema-158>
          x-parser-schema-id: <anonymous-schema-155>
        title: Session Done
        description: |
          Sent after `audio_done`, just before the server closes with 1000.
        example: |-
          {
            "type": "session_done",
            "seq": 12,
            "stats": {
              "audio_ms": 8960,
              "turns": 3,
              "request_id": "0b6f4c1e-7d2a-4e8b-9f3c-5a1d2e3f4b6c"
            }
          }
        bindings: []
        extensions:
          - id: x-parser-unique-object-id
            value: sessionDone
    bindings: []
    extensions: *ref_1
sendOperations:
  - *ref_2
receiveOperations:
  - *ref_3
sendMessages:
  - *ref_4
  - *ref_5
  - *ref_6
  - *ref_7
  - *ref_8
  - *ref_9
  - *ref_10
  - *ref_11
receiveMessages:
  - *ref_12
  - *ref_13
  - *ref_14
  - *ref_15
  - *ref_16
  - *ref_17
  - *ref_18
  - *ref_19
  - *ref_20
  - *ref_21
  - *ref_22
  - *ref_23
  - *ref_24
  - *ref_25
extensions:
  - id: x-parser-unique-object-id
    value: asrRealtime
securitySchemes:
  - id: bearerAuth
    name: bearerAuth
    type: http
    description: |
      API key authentication using Bearer token.

      Get your API key from https://fish.audio/app/api-keys

      Pass the token in the Authorization header:
      `Authorization: Bearer YOUR_API_KEY`
    scheme: bearer
    extensions: []

````

This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.