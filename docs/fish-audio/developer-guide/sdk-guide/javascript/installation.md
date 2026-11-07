> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fish.audio/llms.txt
> Use this file to discover all available pages before exploring further.

# JavaScript SDK Reference

> Complete reference for Fish Audio JavaScript SDK

## Client

Import and initialize the client:

```typescript theme={null}
import { FishAudioClient, type Backends } from "fish-audio";
const fishAudio = new FishAudioClient({ apiKey: process.env.FISH_API_KEY });
```

## Text to Speech

### convert()

Generate speech from text.

```typescript theme={null}
const audio = await fishAudio.textToSpeech.convert({ text: "Hello" }, "s2.1-pro-free" as Backends);
```

Parameters: `request` (TTSRequest), `model?` (Backends) \

Returns: `Promise<ReadableStream<Uint8Array>>`

### convertRealtime()

Realtime streaming TTS over WebSocket.

```typescript theme={null}
async function* textStream() { yield "Hello, "; yield "world!"; }
const conn = await fishAudio.textToSpeech.convertRealtime({ text: "" }, textStream(), "s2.1-pro-free" as Backends);
```

Parameters: `request` (TTSRequest with `text: ""`), `textStream` (`AsyncIterable<string>`), `backend?` (Backends) \

Returns: `RealtimeConnection` (`EventEmitter`-like connection) emitting `RealtimeEvents`

## Speech to Text

### convert()

Transcribe audio to text.

```typescript theme={null}
const res = await fishAudio.speechToText.convert(
  { audio: myAudio },
  { headers: { model: "transcribe-1-pro" } }
);
console.log(res.text);
```

Parameters: `request` (STTRequest), `requestOptions?` (for example `headers` and `timeoutInSeconds`) \

Returns: `STTResponse`

Select the model with the `model` header in `requestOptions.headers`. Without it, the request is served and billed as `transcribe-1`. See [Speech to Text](https://docs.fish.audio/features/speech-to-text.md).

## Voices

### search()

List/search available voice models.

```typescript theme={null}
const results = await fishAudio.voices.search();
```

Parameters: `request?` (ModelListRequest) \

Returns: `ModelListResponse`

### get()

Get model details.

```typescript theme={null}
const model = await fishAudio.voices.get("model_id");
```

Parameters: `voiceId` (string) \

Returns: `ModelEntity`

### ivc.create()

Create a new voice model from audio samples.

```typescript theme={null}
const res = await fishAudio.voices.ivc.create({ title, voices: [file], cover_image: file });
```

Parameters: `request` (ModelCreateRequest) \

Returns: `ModelEntity`

### update()

Update model metadata.

```typescript theme={null}
await fishAudio.voices.update("model_id", { title: "New Title" });
```

Parameters: `voiceId` (string), `request` (UpdateModelRequest) \

Returns: `UpdateVoiceResponse`

### delete()

Delete a model.

```typescript theme={null}
await fishAudio.voices.delete("model_id");
```

Parameters: `voiceId` (string) \

Returns: `DeleteVoiceResponse`

## User

### get\_api\_credit()

Check API credit balance.

```typescript theme={null}
await fishAudio.user.get_api_credit();
```

Returns: `APICreditResponse`

### get\_package()

Get subscription package details.

```typescript theme={null}
await fishAudio.user.get_package();
```

Returns: `PackageResponse`

## Request Classes

### TTSRequest

Text-to-speech parameters.

```typescript theme={null}
{
  text: "Hello",
  reference_id: "model_id",
  references: [ { audio: File, text: "sample" } ],
  format: "mp3",
  prosody: { speed: 1.0, volume: 0 },
}
```

Fields: `text`, `reference_id`, `references`, `format`, `mp3_bitrate`, `opus_bitrate`, `sample_rate`, `prosody`, `latency`, `chunk_length`, `normalize`, `temperature`, `top_p`

### STTRequest

Speech-to-text parameters.

```typescript theme={null}
{ audio: File, language?: "en", ignore_timestamps?: boolean }
```

Fields: `audio`, `language?`, `ignore_timestamps?`

### ReferenceAudio

Reference audio for voice cloning.

```typescript theme={null}
{ audio: File, text: "spoken text" }
```

Fields: `audio`, `text`

### Prosody

Speed and volume control.

```typescript theme={null}
{ speed: 1.2, volume: 5 }
```

Fields: `speed` (0.5–2.0), `volume` (-20 to 20)

### Backends

The backend model to use.

```typescript theme={null}
Backends = 's1' | 's2-pro';
```

The API also accepts `s2.1-pro` and `s2.1-pro-free`; the SDK's `Backends` type has not been updated yet, so pass them with a type assertion (for example `'s2.1-pro' as Backends`) or call the [REST API](https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech.md) directly.

## Response Classes

### STTResponse

Transcription result.

```typescript theme={null}
response.text      // Complete transcription
response.duration  // Duration in seconds
response.segments  // ASRSegment[]
```

### ASRSegment

Timestamped text segment.

Fields: `text` (string), `start` (number, seconds), `end` (number, seconds)

### ModelEntity

Voice model information.

Fields: `_id`, `title`, `description`, `visibility`, `created_at`, `updated_at`, `tags`

### ModelListResponse

List response for voices.

Fields: `items` (ModelEntity\[]), `total` (number)

### APICreditResponse

API credit information.

Fields: `_id` (string), `user_id` (string), `credit` (string), `created_at` (string), `updated_at` (string), `has_phone_sha256` (boolean), `has_free_credit?` (boolean)

### PackageResponse

Subscription package details.

Fields: `user_id` (string), `type` (string), `total` (number), `balance` (number), `created_at` (string), `updated_at` (string), `finished_at` (string)

## WebSocket Classes

### RealtimeEvents

Events emitted by `convertRealtime` connections.

| Event | Meaning |
| - | - |
| `OPEN` | Connection established |
| `AUDIO_CHUNK` | Audio chunk received |
| `ERROR` | Error occurred |
| `CLOSE` | Connection closed |

## Event Classes

### StartEvent

Stream start event.

Fields: `event` ("start"), `request` (TTSRequest)

### TextEvent

Text chunk event.

Fields: `event` ("text"), `text` (string)

### FlushEvent

Flush text chunks event.

Fields: `event` ("flush")

### CloseEvent

Stream close event.

Fields: `event` ("stop")

## Exceptions

### FishAudioError

Generic error with status code, body, rawResponse.

### FishAudioTimeoutError

Connection timeout error.


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.