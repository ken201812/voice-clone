> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fish.audio/llms.txt
> Use this file to discover all available pages before exploring further.

# SDK Quickstart

> Install a Fish Audio SDK, authenticate, and generate your first audio in under a minute

The fastest path from zero to playable audio with the official Fish Audio SDKs. By the end you'll have a script that turns text into an MP3.

> [!NOTE]
>
> The Python SDK is the recommended starting point and is fully covered below.
> The JavaScript SDK is in early release. See the [JavaScript SDK
> guide](https://docs.fish.audio/api-reference/sdk/javascript/api-reference.md) for its current
> surface.

## 1. Install

```bash Python theme={null}
pip install fish-audio-sdk

# optional: local audio playback (needs ffmpeg)
pip install "fish-audio-sdk[utils]"
```

```bash JavaScript theme={null}
npm install fish-audio
```

## 2. Authenticate

> [accordion] Create a Fish Audio account
>
> Sign up for a free Fish Audio account to get started with our API.
>
> 1. [Sign up on fish.audio](https://fish.audio/app/developers/get-started/?utm_source=docs\&utm_medium=prerequisites\&utm_content=sign-up)
> 2. Fill in your details to create an account, complete steps to verify your account.
> 3. Log in to your account and open [Get Started](https://fish.audio/app/developers/get-started/?utm_source=docs\&utm_medium=prerequisites\&utm_content=developer-dashboard)

> [accordion] Get your API key
>
> Once you have an account, you'll need an API key to authenticate your requests.
>
> 1. Log in and open [Get Started](https://fish.audio/app/developers/get-started/?utm_source=docs\&utm_medium=prerequisites\&utm_content=get-api-key)
>
> 2. Click "Get your API key": the key is created in one click and shown only once
>
> 3. Copy your key and store it securely
>
> > [!WARNING]
> >
> > Keep your API key secret! Never commit it to version control or share it publicly.

Both SDKs read your key from the `FISH_API_KEY` environment variable:

```bash theme={null}
export FISH_API_KEY=your_api_key_here
```

## 3. Generate your first audio

```python Python theme={null}
from fishaudio import FishAudio
from fishaudio.utils import save

client = FishAudio()  # reads FISH_API_KEY

audio = client.tts.convert(text="Hello from Fish Audio!", model="s2.1-pro-free")  # free model
save(audio, "output.mp3")
```

```javascript JavaScript theme={null}
import { FishAudioClient, play } from "fish-audio";

const client = new FishAudioClient(); // reads FISH_API_KEY
const audio = await client.textToSpeech.convert({ text: "Hello from Fish Audio!" }, "s2.1-pro-free"); // free model
await play(audio);
```

Run it, and you'll have `output.mp3` (Python) or local playback (JavaScript).

> [!TIP]
>
> Want async in Python? Every method mirrors onto `AsyncFishAudio`: `async with
>     AsyncFishAudio() as client: audio = await client.tts.convert(text="...", model="s2.1-pro-free")`.

## Next steps

> [card] [Text-to-Speech](https://docs.fish.audio/features/text-to-speech.md)
>
> Voices, formats, prosody, and model selection

> [card] [Voice Cloning](https://docs.fish.audio/features/voice-cloning.md)
>
> Instant cloning and persistent voice models

> [card] [Realtime WebSocket](https://docs.fish.audio/features/realtime-streaming.md)
>
> Stream LLM tokens to speech as they arrive

> [card] [Errors & Retries](https://docs.fish.audio/developer-guide/sdk-guide/python/errors.md)
>
> Exception types, retries, and timeouts

> [card] [Cookbook](https://docs.fish.audio/developer-guide/sdk-guide/cookbook/streaming-to-file.md)
>
> Task-focused recipes

> [card] [API Reference](https://docs.fish.audio/api-reference/sdk/python/overview.md)
>
> Full Python SDK reference


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.