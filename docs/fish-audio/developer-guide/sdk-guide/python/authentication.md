> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fish.audio/llms.txt
> Use this file to discover all available pages before exploring further.

# Authentication

> Configure API authentication for the Fish Audio Python SDK

## Get Your API Key

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

## Client Initialization

Initialize the [`FishAudio`](https://docs.fish.audio/api-reference/sdk/python/client#fishaudio-objects) client with your API key:

Install the Python SDK first: `pip install fish-audio-sdk`.

> [tab] Environment Variable (Recommended)
>
> The most secure approach is using environment variables:
>
> ```python theme={null}
> from fishaudio import FishAudio
>
> # Automatically reads from FISH_API_KEY environment variable
> client = FishAudio()
> ```
>
> Set the environment variable in your shell:
>
> ```bash theme={null}
> export FISH_API_KEY=your_api_key_here
> ```
>
> Or create a `.env` file in your project root:
>
> ```bash theme={null}
> FISH_API_KEY=your_api_key_here
> ```
>
> Then load it using `python-dotenv`:
>
> ```python theme={null}
> from dotenv import load_dotenv
> from fishaudio import FishAudio
>
> # Load environment variables from .env file
> load_dotenv()
>
> client = FishAudio()
> ```
>
> > [!TIP]
> >
> > Using environment variables keeps your API key out of your codebase and makes it easy to use different keys for development and production.

> [tab] Direct API Key
>
> Provide the API key directly when initializing the client:
>
> ```python theme={null}
> from fishaudio import FishAudio
>
> client = FishAudio(api_key="your_api_key_here")
> ```
>
> > [!WARNING]
> >
> > This approach is less secure. Never commit code containing your actual API key. Use this only for quick testing or when loading the key from a secure secrets manager.

> [tab] Custom Base URL
>
> If you're using a proxy or custom endpoint:
>
> ```python theme={null}
> from fishaudio import FishAudio
>
> client = FishAudio(
>     api_key="your_api_key",
>     base_url="https://your-proxy-domain.com"
> )
> ```
>
> This is useful for:
>
> * Corporate proxies
> * Development/staging environments
> * Self-hosted deployments

## Verifying Authentication

Test your authentication by making a simple API call to check your account credits:

```python focus={7-9} theme={null}
from fishaudio import FishAudio
from fishaudio.exceptions import AuthenticationError

try:
    client = FishAudio()

    # Check account credits (requires valid authentication)
    credits = client.account.get_credits()
    print(f"Authentication successful! Credits: {credits.credit}")

except AuthenticationError:
    print("Authentication failed. Check your API key.")
```

Handle [`AuthenticationError`](https://docs.fish.audio/api-reference/sdk/python/exceptions#authenticationerror-objects) when verifying authentication. The example uses [`get_credits()`](https://docs.fish.audio/api-reference/sdk/python/resources#get_credits) to verify the authentication works.

## Next Steps

> [card] [Text-to-Speech](https://docs.fish.audio/features/text-to-speech.md)
>
> Generate speech with the authenticated client

> [card] [Voice Cloning](https://docs.fish.audio/features/voice-cloning.md)
>
> Clone voices and create custom models

> [card] [Account Management](https://docs.fish.audio/api-reference/sdk/python/resources.md#account)
>
> Check credits and manage your account

> [card] [Error Handling](https://docs.fish.audio/api-reference/sdk/python/exceptions.md)
>
> Handle authentication errors properly


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.