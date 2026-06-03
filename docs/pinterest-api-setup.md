# Pinterest API Setup

This project publishes Pins through the official Pinterest API only. Do not use browser automation, login automation, or follow/like/comment automation.

Official references:

- Authentication and OAuth: https://developer.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/
- Create boards and Pins: https://developer.pinterest.com/docs/work-with-organic-content-and-users/create-boards-and-pins/
- Sandbox: https://developer.pinterest.com/docs/developer-tools/sandbox/
- Official OpenAPI description: https://github.com/pinterest/api-description

## 1. Create a Pinterest Developer App

1. Open https://developer.pinterest.com/ and sign in with the Pinterest account that owns the boards.
2. Create a new app from My apps.
3. Select Pinterest API v5 when requesting API access.
4. Add a fixed Redirect URI, for example:

```text
http://localhost/
```

5. Store the App ID and Client secret securely. Do not commit them to Git.

## 2. Get an Access Token

Request these OAuth scopes so the script can read boards and create Pins:

```text
boards:read,boards:write,pins:read,pins:write
```

Use this safe manual OAuth flow. The exchange script only requests a token; it does not publish any Pin.

1. Add this exact Redirect URI in the Pinterest Developer App:

```text
http://localhost/
```

2. Open this OAuth URL manually in your browser after replacing `CLIENT_ID`:

```text
https://www.pinterest.com/oauth/?client_id=CLIENT_ID&redirect_uri=http%3A%2F%2Flocalhost%2F&response_type=code&scope=boards:read,boards:write,pins:read,pins:write&state=front-yard-aura
```

3. After approval, Pinterest redirects to a URL like this:

```text
http://localhost/?code=AUTHORIZATION_CODE&state=front-yard-aura
```

Copy only the `code` value from the redirected URL.

4. Put the OAuth values in `.env`:

```text
PINTEREST_CLIENT_ID=your_app_id_here
PINTEREST_CLIENT_SECRET=your_client_secret_here
PINTEREST_REDIRECT_URI=http://localhost/
PINTEREST_AUTH_CODE=AUTHORIZATION_CODE_FROM_REDIRECT_URL
```

5. Run the exchange token script:

```bash
node scripts/pinterest-exchange-token.mjs
```

The script exchanges `PINTEREST_AUTH_CODE` through `https://api.pinterest.com/v5/oauth/token` and prints only `access_token`, `refresh_token` if Pinterest returns one, and `expires_in`. It never prints the App Secret.

## 3. Map Boards To board_id

List boards through the official API:

```bash
curl --request GET "https://api.pinterest.com/v5/boards?page_size=100" \
  --header "Authorization: Bearer PINTEREST_ACCESS_TOKEN" \
  --header "Content-Type: application/json"
```

Copy the example board map:

```bash
cp data/pinterest/pinterest-boards.example.json data/pinterest/pinterest-boards.json
```

Fill `data/pinterest/pinterest-boards.json` so every `board_slug` from `data/pinterest/pinterest-schedule.csv` maps to the real Pinterest board ID:

```json
{
  "curb-appeal-landscaping-ideas": "123456789012345678",
  "front-yard-flower-bed-ideas": "234567890123456789"
}
```

You can also set `PINTEREST_BOARD_MAP_JSON` instead of using the file.

## 4. Fill .env

Add the access token to `.env`:

```bash
PINTEREST_ACCESS_TOKEN=pina_your_access_token_here
PINTEREST_PUBLISH_DELAY_MS=15000
```

Optional Sandbox mode:

```bash
PINTEREST_ENV=sandbox
```

## 5. Run Dry Run

Dry-run is the default mode and does not publish anything:

```bash
node scripts/pinterest-api-publish.mjs --dry-run
```

Or:

```bash
npm run pinterest:dry-run
```

The script reads only Pins scheduled for today's date from `data/pinterest/pinterest-schedule.csv`, joins their metadata from `data/pinterest/pinterest-pins.csv`, and validates images in `public/pins/`.

## 6. Run Real Publishing

Use real publishing only after reviewing the dry-run report and confirming `pinterest-boards.json` and `.env`:

```bash
node scripts/pinterest-api-publish.mjs --publish
```

Or:

```bash
npm run pinterest:publish
```

Safety checks:

- Publishes only Pins scheduled for today's date.
- Never exceeds the number of Pins scheduled today.
- Waits between Pins using `PINTEREST_PUBLISH_DELAY_MS`.
- Does not retry aggressively after a failed Pin.
- Records successful publishes in `data/pinterest/published-history.json`.
- Skips any Pin already present in history to avoid duplicate publishing.

To test a specific date without publishing:

```bash
node scripts/pinterest-api-publish.mjs --dry-run --date=2026-06-03
```
