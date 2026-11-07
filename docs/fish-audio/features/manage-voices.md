> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fish.audio/llms.txt
> Use this file to discover all available pages before exploring further.

# Manage Voices

> List, inspect, update, and delete your voice models

Every voice you [clone](https://docs.fish.audio/features/voice-cloning.md) becomes a model you own. List your library, look up a model's details, rename or re-share it, and delete what you no longer need, all from the API directly, the Python library, or JavaScript.

> [card] [Use it in the web app](https://fish.audio/app/my-voices)
>
> No code: manage voices in the browser.

> [card] [API reference](https://docs.fish.audio/api-reference/endpoint/model/list-models.md)
>
> Every endpoint for voice models.

> [card] [Cookbooks](https://docs.fish.audio/developer-guide/sdk-guide/cookbook/discover-library-voice.md)
>
> Search and reuse Library voices.

## When to use it

> [card] Browse your library
>
> List the voices you've created or saved.

> [card] Find a voice id
>
> Look up the `reference_id` to use in [Text to Speech](https://docs.fish.audio/features/text-to-speech.md).

> [card] Update metadata
>
> Rename, re-tag, or change a model's visibility.

> [card] Clean up
>
> Delete models you no longer use.

## List your voices

Page through your library. The response carries the `total` count and the `items` for the current page.

Install the Python SDK first: `pip install fish-audio-sdk`.

```python Python theme={null}
from fishaudio import FishAudio

client = FishAudio()  # reads FISH_API_KEY

page = client.voices.list(self_only=True, page_size=20)

print(f"{page.total} voices")
for v in page.items:
    print(v.id, v.title, v.state, v.visibility)
```

```bash API (curl) theme={null}
curl "https://api.fish.audio/model?self=true&page_size=20" \
  --header "Authorization: Bearer $FISH_API_KEY"

# Response: { "total": 42, "items": [ ... ], "has_more": true }
```

```javascript JavaScript theme={null}
import { FishAudioClient } from "fish-audio";

const client = new FishAudioClient({ apiKey: process.env.FISH_API_KEY });

const page = await client.voices.search({ page_size: 20 });

console.log(`${page.total} voices`);
for (const v of page.items) {
  console.log(v._id ?? v.id, v.title, v.state, v.visibility);
}
```

## Get, update, and delete

Use a voice **id** to inspect a single model, change its metadata, or remove it.

```python Python theme={null}
# Inspect one model
voice = client.voices.get("YOUR_VOICE_ID")
print(voice.title, voice.state)

# Update metadata (only the fields you pass change)
client.voices.update(
    "YOUR_VOICE_ID",
    title="Updated title",
    visibility="unlist",
)

# Delete
client.voices.delete("YOUR_VOICE_ID")
```

```bash API (curl) theme={null}
# Inspect one model
curl https://api.fish.audio/model/YOUR_VOICE_ID \
  --header "Authorization: Bearer $FISH_API_KEY"

# Update metadata
curl --request PATCH https://api.fish.audio/model/YOUR_VOICE_ID \
  --header "Authorization: Bearer $FISH_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{ "title": "Updated title", "visibility": "unlist" }'

# Delete
curl --request DELETE https://api.fish.audio/model/YOUR_VOICE_ID \
  --header "Authorization: Bearer $FISH_API_KEY"
```

## Implementation details

### Filtering and pagination

Narrow the list with `title`, `tags`, or `language`, and page with `page_size` and `page_number`. Omit `self_only` (API: `self`) to search the public [Voice Library](https://docs.fish.audio/overview/platform.md) instead of just your own models.

```python Python theme={null}
page = client.voices.list(
    self_only=True,
    title="narration",
    page_size=50,
    page_number=2,
)
```

```bash API (curl) theme={null}
curl "https://api.fish.audio/model?self=true&title=narration&page_size=50&page_number=2" \
  --header "Authorization: Bearer $FISH_API_KEY"
```

### Visibility

Switch a model between `private`, `unlist` (shareable link), and `public` (listed in the Voice Library) with `update`. Publishing a model lets anyone use it as a `reference_id`.

## Going further

> [card] [Clone a voice](https://docs.fish.audio/features/voice-cloning.md)
>
> Create a new model from audio samples.

> [card] [Speak with a voice](https://docs.fish.audio/features/text-to-speech.md)
>
> Use any voice id as `reference_id`.

> [card] [Voice Models API](https://docs.fish.audio/api-reference/endpoint/model/list-models.md)
>
> Every endpoint for listing and managing models.

> [card] [Python reference](https://docs.fish.audio/api-reference/sdk/python/resources.md)
>
> The full `voices` resource surface.


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.