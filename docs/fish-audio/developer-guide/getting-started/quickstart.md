> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fish.audio/llms.txt
> Use this file to discover all available pages before exploring further.

# Quick Start

> Generate your first AI voice with Fish Audio in under 5 minutes

## Overview

This guide will walk you through generating your first text-to-speech audio with Fish Audio. By the end, you'll have converted text into natural-sounding speech using our API.

> [!NOTE]
>
> **Already using the OpenAI, OpenRouter, ElevenLabs, or Groq SDK?** Swap in a
> Fish Audio base URL and API key and it keeps working.
> [Migrate to Fish Audio](https://docs.fish.audio/developer-guide/getting-started/migration.md) has the
> URL for each SDK.

## Prerequisites

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

## Your First TTS Request

The examples on this page use the free [`s2.1-pro-free`](https://docs.fish.audio/developer-guide/models-pricing/models-overview) model, so they work on a new account before you add any API credit. Choose your preferred method to generate speech:

> [tab] cURL
>
> **1. Set your API key**
>
> Store your API key as an environment variable (recommended approach):
>
> ```bash theme={null}
> export FISH_API_KEY="replace_me"
> ```
>
> **2. Make the TTS request**
>
> Run this [cURL](https://curl.se/) command to generate your first speech:
>
> ```bash theme={null}
> curl -X POST https://api.fish.audio/v1/tts \
>   -H "Authorization: Bearer $FISH_API_KEY" \
>   -H "Content-Type: application/json" \
>   -H "model: s2.1-pro-free" \
>   -d '{
>     "text": "Hello! Welcome to Fish Audio. This is my first AI-generated voice.",
>     "format": "mp3"
>   }' \
>   --output welcome.mp3
> ```
>
> **3. Play your audio**
>
> The audio has been saved as `welcome.mp3`. You can play it by:
>
> * Double-clicking the file or opening it in any media player
> * Or using the command line:
>
> ```bash theme={null}
> # On macOS
> afplay welcome.mp3
>
> # On Linux
> mpg123 welcome.mp3
>
> # On Windows
> start welcome.mp3
> ```

> [tab] Python
>
> **1. Install the SDK**
>
> ```bash theme={null}
> pip install fish-audio-sdk
> ```
>
> **2. Generate speech**
>
> Create a Python script:
>
> ```python theme={null}
> from fishaudio import FishAudio
> from fishaudio.utils import save
>
> # Initialize with your API key
> client = FishAudio()  # reads FISH_API_KEY
>
> # Generate speech with the free model
> audio = client.tts.convert(
>     text="Hello! Welcome to Fish Audio.",
>     model="s2.1-pro-free",
> )
> save(audio, "welcome.mp3")
>
> print("✓ Audio saved to welcome.mp3")
> ```
>
> **3. Run the script**
>
> ```bash theme={null}
> python generate_speech.py
> ```
>
> **4. Play your audio**
>
> The audio has been saved as `welcome.mp3`. You can play it by:
>
> * Double-clicking the file or opening it in any media player
> * Or using the command line:
>
> ```bash theme={null}
> # On macOS
> afplay welcome.mp3
>
> # On Linux
> mpg123 welcome.mp3
>
> # On Windows
> start welcome.mp3
> ```

> [tab] JavaScript
>
> **1. Install the SDK**
>
> ```bash theme={null}
> npm install fish-audio
> ```
>
> **2. Generate speech**
>
> Create a JavaScript script:
>
> ```javascript theme={null}
> import { FishAudioClient } from "fish-audio";
> import { writeFile } from "fs/promises";
>
> const fishAudio = new FishAudioClient({ apiKey: process.env.FISH_API_KEY });
>
> // The second argument is the model: s2.1-pro-free is free to use
> const audio = await fishAudio.textToSpeech.convert(
>   { text: "Hello, world!" },
>   "s2.1-pro-free",
> );
>
> const buffer = Buffer.from(await new Response(audio).arrayBuffer());
> await writeFile("welcome.mp3", buffer);
>
> console.log("✓ Audio saved to welcome.mp3");
> ```
>
> **3. Run the script**
>
> ```bash theme={null}
> node generate_speech.mjs
> ```
>
> **4. Play your audio**
>
> The audio has been saved as `welcome.mp3`. You can play it by:
>
> * Double-clicking the file or opening it in any media player
> * Or using the command line:
>
> ```bash theme={null}
> # On macOS
> afplay welcome.mp3
>
> # On Linux
> mpg123 welcome.mp3
>
> # On Windows
> start welcome.mp3
> ```

## If your first request fails

| Status | Likely cause | Fix |
| - | - | - |
| `401` | Invalid or missing API key | Check `FISH_API_KEY` and your key on [API Keys](https://fish.audio/app/api-keys). |
| `402` | No API credit for the model you called | On a \$0 balance, use the model `s2.1-pro-free`. For paid models, add API credit on [API Billing](https://fish.audio/app/developers/billing/). |
| `400` | Bad `reference_id` / parameters | Verify the voice id; read the error `message`. |
| `429` | Rate limit | Wait and retry with backoff. |

See [Errors](https://docs.fish.audio/api-reference/errors.md) for the full table and retry handling.

## Customizing Your Voice

The examples above use the default voice. To use a different voice, add the `reference_id` parameter with a model ID from [fish.audio](https://fish.audio). You can find the model ID in the URL or use the copy button when viewing any voice.

Choose a voice to try:

> [tab] E-Girl Voice
>
> From: [https://fish.audio/m/ca3007f96ae7499ab87d27ea3599956a](https://fish.audio/m/ca3007f96ae7499ab87d27ea3599956a)
>
> ```bash theme={null}
> export REFERENCE_ID="ca3007f96ae7499ab87d27ea3599956a"
> ```

> [tab] Energetic Male
>
> From: [https://fish.audio/m/9a9cf47702da476aa4629e2506d4a857](https://fish.audio/m/9a9cf47702da476aa4629e2506d4a857)
>
> ```bash theme={null}
> export REFERENCE_ID="9a9cf47702da476aa4629e2506d4a857"
> ```

Then generate speech with your chosen voice:

> [tab] cURL
>
> ```bash theme={null}
> curl -X POST https://api.fish.audio/v1/tts \
>   -H "Authorization: Bearer $FISH_API_KEY" \
>   -H "Content-Type: application/json" \
>   -H "model: s2.1-pro-free" \
>   -d '{
>     "text": "This is a custom voice from Fish Audio! You can explore hundreds of different voices on the platform, or even create your own.",
>     "reference_id": "'"$REFERENCE_ID"'",
>     "format": "mp3"
>   }' \
>   --output custom_voice.mp3
> ```

> [tab] Python
>
> ```python theme={null}
> import os
> from fishaudio import FishAudio
> from fishaudio.utils import save
>
> client = FishAudio()  # reads FISH_API_KEY
>
> # Generate speech with custom voice
> audio = client.tts.convert(
>     text="This is a custom voice from Fish Audio! You can explore hundreds of different voices on the platform, or even create your own.",
>     reference_id=os.environ.get("REFERENCE_ID"),
>     model="s2.1-pro-free",
> )
> save(audio, "custom_voice.mp3")
> ```

> [tab] JavaScript
>
> ```javascript theme={null}
> import { FishAudioClient } from "fish-audio";
> import { writeFile } from "fs/promises";
>
> const fishAudio = new FishAudioClient({ apiKey: process.env.FISH_API_KEY });
>
> const audio = await fishAudio.textToSpeech.convert(
>   {
>     text: "This is a custom voice from Fish Audio! You can explore hundreds of different voices on the platform, or even create your own.",
>     reference_id: process.env.REFERENCE_ID,
>   },
>   "s2.1-pro-free",
> );
>
> const buffer = Buffer.from(await new Response(audio).arrayBuffer());
> await writeFile("custom_voice.mp3", buffer);
>
> console.log("✓ Audio saved to custom_voice.mp3");
> ```

## Support

Need help? Check out these resources:

* [API Reference](https://docs.fish.audio/api-reference/introduction.md) - Complete API documentation
* [Create a Voice Clone](https://docs.fish.audio/api-reference/endpoint/model/create-model.md) - Create a voice clone model
* [Generate Speech](https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech.md) - Generate realistic speech
* [Real-time Streaming](https://docs.fish.audio/features/realtime-streaming.md) - WebSocket for real-time streaming
* [Discord Community](https://discord.com/invite/dF9Db2Tt3Y) - Get help from the community
* [Support Email](mailto:support@fish.audio) - Contact our support team


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.