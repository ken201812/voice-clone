> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fish.audio/llms.txt
> Use this file to discover all available pages before exploring further.

# Overview

> Everything Fish Audio can do, and how to build with it

Fish Audio is a voice AI platform. Every core feature is available three ways: in the [web app](https://docs.fish.audio/overview/platform.md) (no code), through the [REST API](https://docs.fish.audio/api-reference/introduction.md), and via the official [SDK](https://docs.fish.audio/developer-guide/sdk-guide/quickstart.md).

## Core features

> [card] [Text to Speech](https://docs.fish.audio/features/text-to-speech.md)
>
> Convert text into lifelike speech with the `s2.1-pro`, `s2-pro`, and deprecated `s1` models.

> [card] [Speech to Text](https://docs.fish.audio/features/speech-to-text.md)
>
> Transcribe audio with `transcribe-1-pro`: multi-speaker conversations, long recordings, emotion cues, and optional timestamps.

> [card] [Voice Cloning](https://docs.fish.audio/features/voice-cloning.md)
>
> Clone a voice instantly from a clip, or train a persistent model.

> [card] [Realtime Streaming](https://docs.fish.audio/features/realtime-streaming.md)
>
> Stream audio as it generates, for voice agents and live apps.

> [card] [Manage Voices](https://docs.fish.audio/features/manage-voices.md)
>
> List, inspect, update, and delete your voice models.

## Also in the web app

These run in the browser, no code required. See the [Platform guide](https://docs.fish.audio/overview/platform.md).

> [card] [Professional Voice Clone](https://docs.fish.audio/overview/platform/create-voice/professional-voice-clone.md)
>
> Clone a real, verified voice at studio quality, then release it.

> [card] [Voice Design](https://docs.fish.audio/overview/platform/create-voice/voice-design.md)
>
> Design a voice from a plain-text description. Best for original characters.

> [card] [Voice Changer](https://docs.fish.audio/overview/platform.md)
>
> Transform existing audio into a different voice.

> [card] [Story Studio](https://docs.fish.audio/overview/platform.md)
>
> Produce multi-speaker, long-form audio: audiobooks and narration.

> [card] [Music & Sound Effects](https://docs.fish.audio/overview/platform.md)
>
> Generate music and cinematic sound effects from a prompt.

> [card] [Audio Separation](https://docs.fish.audio/overview/platform.md)
>
> Split audio into stems, and related processing utilities.

## Models

These text-to-speech models power most capabilities:

* **`s2.1-pro`**: the recommended production model, with improved quality, latency, and throughput over S2-Pro.
* **`s2.1-pro-free`**: the same model at \$0 for testing, prototyping, development, and smaller businesses, without TTFA or DPA guarantees.
* **`s2-pro`**: the previous-generation S2 model, with multi-speaker and natural-language expression control.
* **`s1`**: the previous generation, with `(parenthesis)` emotion tags. S1 is deprecated and will be retired on December 31, 2026. After that date, requests that specify `s1` are served by `s2.1-pro`. See [Migrate from S1](https://docs.fish.audio/developer-guide/models-pricing/migrate-from-s1.md).

For speech to text, select the model with the `model` header on `POST /v1/asr`:

* **`transcribe-1-pro`**: the recommended model, for everything from short clips to multi-speaker conversations (speaker markers and speaker turns) and long recordings, with inline emotion cues. Send `model: transcribe-1-pro` explicitly.
* **`transcribe-1`**: general transcription of short recordings. A request whose `model` header is missing or not an exact match is served by this model.

To transcribe live audio, `transcribe-stream-1` (Preview) streams transcripts turn by turn over a WebSocket, with turn detection for voice agents. It is available through the API; see [Realtime Speech to Text](https://docs.fish.audio/features/speech-to-text/realtime.md).

See [Models Overview](https://docs.fish.audio/developer-guide/models-pricing/models-overview.md) and [Choosing a Model](https://docs.fish.audio/developer-guide/models-pricing/choosing-a-model.md) for the full lineup and languages, and [Speech to Text](https://docs.fish.audio/features/speech-to-text.md#input-audio) for transcription formats and limits.

## Pick your path

> [card] [Use the web app](https://docs.fish.audio/overview/platform.md)
>
> No code: generate audio, clone voices, and produce projects in your browser.

> [card] [Build with the SDK](https://docs.fish.audio/developer-guide/sdk-guide/quickstart.md)
>
> The Python library for your application.

> [card] [Call the API](https://docs.fish.audio/api-reference/introduction.md)
>
> Raw REST and WebSocket endpoints for any language.

> [card] [Use your AI coding agent](https://docs.fish.audio/developer-guide/resources/coding-agents.md)
>
> Install the Fish Audio skill so your agent writes correct code.


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.