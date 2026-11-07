> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fish.audio/llms.txt
> Use this file to discover all available pages before exploring further.

# AI Coding Assistants

> Install the Fish Audio skill so your coding agent writes correct SDK and API code

Install the Fish Audio **agent skill**, and your coding agent (Claude Code, Cursor, Codex, and others) writes correct, current Fish Audio code: right method names, units, and error types, instead of guessing.

## Install the skill

```bash theme={null}
npx skills add https://docs.fish.audio
```

This installs both Fish Audio skills into your agent (a canonical copy in `.agents/skills/`, with symlinks for Claude Code and Cursor). Run `npx skills update` later to refresh them.

> [card] fish-audio-sdk
>
> Python (`fish-audio-sdk`) and JavaScript (`fish-audio`): exact method signatures and defaults, sync + async, model selection, and the real exception types.

> [card] fish-audio-api
>
> Raw REST + WebSocket for any language or edge runtime: auth, endpoints, MessagePack/JSON/multipart rules, and the streaming protocol.

### Install options

```bash All skills theme={null}
npx skills add https://docs.fish.audio
```

```bash One skill theme={null}
npx skills add https://docs.fish.audio --skill fish-audio-sdk
```

```bash Target an agent theme={null}
# claude-code, cursor, codex, ...
npx skills add https://docs.fish.audio -a claude-code
```

```bash List / inspect first theme={null}
npx skills add https://docs.fish.audio --list
```

Want to read them before installing? The skills are served at [/.well-known/agent-skills/index.json](https://docs.fish.audio/.well-known/agent-skills/index.json), with each skill's markdown at `/.well-known/agent-skills/<name>/SKILL.md`.

## Try it

Once installed, ask your agent in plain language; it will use the correct client, methods, and error types:

> [card] TTS in a cloned voice
>
> "Generate speech with Fish Audio in a cloned voice and save it to a file."

> [card] Transcribe with timestamps
>
> "Transcribe `speech.wav` with Fish Audio and print the segments."

> [card] Stream from an LLM
>
> "Stream an LLM's tokens to Fish Audio TTS over the WebSocket."

> [card] Raw API, any language
>
> "Call the Fish Audio TTS REST API from Go, no SDK."

## Or connect via MCP

The [Fish Audio MCP server](https://docs.fish.audio/overview/mcp.md) at `https://api.fish.audio/mcp` gives your agent tools instead of docs: it can search the voice library, clone voices, generate speech, transcribe audio, create images and videos, and produce Story Studio projects with your Fish Audio account (OAuth sign-in, no API key). See the [MCP server guide](https://docs.fish.audio/overview/mcp.md) for client setup and the [tool list](https://docs.fish.audio/overview/mcp/tools.md) for what the agent can call.

> [!NOTE]
>
> This site also exposes [llms.txt](https://docs.fish.audio/llms.txt) and [llms-full.txt](https://docs.fish.audio/llms-full.txt) for agents that fetch docs directly.

## Next steps

> [card] [Get your API key](https://docs.fish.audio/developer-guide/getting-started/api-key.md)
>
> Create a key and make your first request.

> [card] [Text to Speech](https://docs.fish.audio/features/text-to-speech.md)
>
> Voices, formats, streaming, and the direct API.

> [card] [API reference](https://docs.fish.audio/api-reference/introduction.md)
>
> Endpoints, parameters, and the OpenAPI schema.

> [card] [Errors](https://docs.fish.audio/api-reference/errors.md)
>
> Status codes, retries, and SDK exception handling.

## Support

* **Technical support**: [support@fish.audio](mailto:support@fish.audio)
* **Issues**: [GitHub](https://github.com/fishaudio)
* **Community**: [Discord](https://discord.gg/dF9Db2Tt3Y)


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.