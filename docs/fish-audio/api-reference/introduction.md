> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fish.audio/llms.txt
> Use this file to discover all available pages before exploring further.

# Introduction

> How to use the Fish Audio API

## Welcome

You can generate a new API key on [Get Started](https://fish.audio/app/developers/get-started/?utm_source=docs\&utm_medium=api-reference\&utm_content=get-api-key).

## Quick Start

See our [Quick Start](https://docs.fish.audio/developer-guide/getting-started/quickstart.md) guide to generate audio in under 2 minutes.

## Errors

Errors return a JSON body with a `message` and a `status`; some endpoints add fields. Errors from the network edge in front of the API, such as some `413` or `5xx` responses, may not have a JSON body. See [Errors](https://docs.fish.audio/api-reference/errors.md) for the full status-code table, retry guidance, and SDK exception handling.

## OpenAPI Schema

Fish Audio publishes a canonical OpenAPI schema at [https://api.fish.audio/openapi.json](https://api.fish.audio/openapi.json).
When working with AI coding agents or IDE assistants, mention this schema URL as part of your prompt or project context so the agent can understand Fish Audio's endpoints, request and response models, authentication requirements, and supported parameters directly from the machine-readable API contract.

## Distributed Tracing

Fish Audio inference APIs accept the W3C `traceparent` header so your business-side trace and Fish Audio's inference-side trace can share the same trace ID. See [Tracing & Performance Analysis](https://docs.fish.audio/api-reference/observability.md) for supported endpoints, examples, and enterprise performance analysis details.

## Create a Voice Clone

Use our [/model endpoint](https://docs.fish.audio/api-reference/endpoint/model/create-model.md) to create a voice clone model.

## Generate Speech

Use our [/v1/tts endpoint](https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech.md) to generate speech.

## Design a Voice

Use our [/v1/voice-design endpoint](https://docs.fish.audio/api-reference/endpoint/openapi-v1/voice-design.md) to generate candidate voices from a prompt.

## Real-time Streaming

Use our [Python SDK](https://docs.fish.audio/features/realtime-streaming.md) or [JavaScript SDK](https://docs.fish.audio/features/realtime-streaming.md) for real-time audio streaming with WebSocket.

## Rate Limits

You can find the rate limits for each endpoint in the [Rate Limits](https://docs.fish.audio/developer-guide/models-pricing/pricing-and-rate-limits.md) section.


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.