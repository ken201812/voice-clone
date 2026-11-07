> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fish.audio/llms.txt
> Use this file to discover all available pages before exploring further.

# Migrate from S1

> Fish Audio S1 will be retired on December 31, 2026. Move your text-to-speech requests from s1 to s2.1-pro.

This guide is for you if your text-to-speech requests set the model to `s1`.

## What is changing

S1 is deprecated and will be retired on December 31, 2026. After that date, requests that specify `s1` are served by `s2.1-pro`.

We recommend that you switch to `s2.1-pro` before then, so you can test your output on your own schedule.

## What happens if you do nothing

After December 31, 2026, requests that specify `model: s1` are automatically served by `s2.1-pro` and billed as `s2.1-pro`. Both models have the same price, \$15.00 / M UTF-8 bytes, so your cost does not change. See [Pricing & Rate Limits](https://docs.fish.audio/developer-guide/models-pricing/pricing-and-rate-limits.md).

Your audio can still change, because S2.1-Pro treats some input and defaults differently than S1:

* S1-style `(happy)` emotion tags are not interpreted as tags, and the API does not convert them.
* Loudness normalization is applied to the output.
* `repetition_penalty` has no effect.

The steps below cover each of these changes.

## Migrate to S2.1-Pro

### Switch the model to `s2.1-pro`

In the API, you select the model with the `model` request header. Change `s1` to `s2.1-pro` wherever you set the model, including SDK and integration settings.

If you use the JavaScript SDK (`fish-audio` on npm) without passing a model, your requests use `s1`, because that is the SDK's default backend. Pass the model explicitly.

This example also converts the emotion tags, as described in the next step:

```bash Before (S1) theme={null}
curl --request POST https://api.fish.audio/v1/tts \
  --header "Authorization: Bearer $FISH_API_KEY" \
  --header "Content-Type: application/json" \
  --header "model: s1" \
  --data '{
    "text": "(happy) What a beautiful day! (laughing) I did not expect that.",
    "reference_id": "9a9cf47702da476aa4629e2506d4a857",
    "format": "mp3"
  }' \
  --output out.mp3
```

```bash After (S2.1-Pro) theme={null}
curl --request POST https://api.fish.audio/v1/tts \
  --header "Authorization: Bearer $FISH_API_KEY" \
  --header "Content-Type: application/json" \
  --header "model: s2.1-pro" \
  --data '{
    "text": "[happy] What a beautiful day! [laughing] I did not expect that.",
    "reference_id": "9a9cf47702da476aa4629e2506d4a857",
    "format": "mp3"
  }' \
  --output out.mp3
```

### Convert emotion tags

S1 uses `(parenthesis)` tags, such as `(happy)`. S2 uses `[bracket]` tags, such as `[happy]`, and accepts free-form natural language, such as `[whispers sweetly]`.

The API does not convert old tags. S1-style `(happy)` text sent to S2 is not interpreted as a tag, so replace each `(tag)` in your text with `[tag]`:

```text theme={null}
S1: (happy) What a beautiful day! (laughing) I did not expect that.
S2: [happy] What a beautiful day! [laughing] I did not expect that.
```

For more on S2 tags and examples, see [Emotion Control](https://docs.fish.audio/developer-guide/core-features/emotions.md).

### Generate multi-speaker dialogue in one request

With S1, multi-speaker audio meant generating each speaker's segment separately and stitching the audio together. S2.1-Pro supports multi-speaker dialogue natively in one request: add `<|speaker:N|>` markers to `text`, and pass `reference_id` as an array with one voice ID per speaker. For details and an example, see `reference_id` in the [Text to Speech API reference](https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech.md).

### Check output loudness

`normalize_loudness` in the `prosody` object defaults to `true`. It had no effect on S1, but it is applied on S2, so your output loudness can change after you migrate.

If you need to turn it off, set `prosody.normalize_loudness` to the boolean `false`:

```json theme={null}
{
  "text": "[happy] What a beautiful day!",
  "prosody": { "normalize_loudness": false }
}
```

### Check `repetition_penalty`

`repetition_penalty` applies to S1 but has no effect on S2.1-Pro. If you tuned it to reduce repeated sounds in S1 output, that setting no longer changes your audio after you switch. Listen to your output after you migrate.

## Support

Need help? Check out these resources:

* [API Reference](https://docs.fish.audio/api-reference/introduction.md) - Complete API documentation
* [Create a Voice Clone](https://docs.fish.audio/api-reference/endpoint/model/create-model.md) - Create a voice clone model
* [Generate Speech](https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech.md) - Generate realistic speech
* [Real-time Streaming](https://docs.fish.audio/features/realtime-streaming.md) - WebSocket for real-time streaming
* [Discord Community](https://discord.com/invite/dF9Db2Tt3Y) - Get help from the community
* [Support Email](mailto:support@fish.audio) - Contact our support team


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.