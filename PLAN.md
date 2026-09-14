# POC: "Guess the track" — Spotify Web Playback SDK with delayed name reveal

## Context

`product-ben/musie` is an empty repo. The POC: a visitor clicks **Play**, the Spotify
track [`2tazKVVJBWqFOAAlFzfQe5`](https://open.spotify.com/track/2tazKVVJBWqFOAAlFzfQe5)
plays **in the page** via the Spotify integration, and the track's name stays hidden
until they click **Pause** — a guess-the-song mechanic. Functionality only: plain HTML
elements, minimal styling.

**This session cannot build it.** Rule 1 forbids guessing endpoints and field names,
and this container's network policy 403s `developer.spotify.com`, so the OpenAPI
schema is unreadable here. The policy was updated, but it binds at container creation,
so it only takes effect in a **new session**. Confirmed blocked via both `curl` and
`WebFetch` after the change.

So this session's job is a clean handoff; the next session builds.

Decisions already made, carried forward:

- **Premium-only.** The no-Premium fallback was dropped: it required covering
  Spotify's iframe embed with an opaque overlay to hide the title, conflicting with
  the embed display requirements in the Developer Terms (rule 9). The Web Playback SDK
  has no such tension — it hands the page raw audio with no mandated UI, so showing no
  title is our design choice, not an alteration of Spotify's.
- **Client ID:** `6796456706bf44168a52d61b46d7c11e` (public by design in PKCE; safe to
  commit). Prefill it as the default, keep the field editable. No Client Secret is
  involved anywhere — PKCE has no use for one.
- **Redirect URI:** `http://127.0.0.1:5173/` — already registered in the dashboard.

## Step 1 — this session: commit the handoff

Create on branch `claude/sharp-babbage-5xhh77` and push:

- `PLAN.md` — this document, so the new session reads it instead of you re-explaining
- `README.md` — the setup and verification checklist below

Then start a new session pointed at this branch. Its first instruction: *read PLAN.md
and build it.*

## Step 2 — next session: verify the spec, then build

**Before writing code**, fetch `open-api-schema.yaml` and verify these two endpoints —
the only ones the POC touches. Neither is deprecated, so rule 7 isn't engaged (nothing
here goes near playlists or library):

| Purpose | Call | Fields relied on |
|---|---|---|
| Start the track | `PUT /me/player/play` | query `device_id`; body `uris` |
| Reveal the name | `GET /tracks/{id}` | `name`, `artists[].name`, `external_urls.spotify` |

If the schema contradicts any of this, the schema wins.

### Build

No build step, no npm dependencies. **Files:** `server.js`, `index.html`, `app.js`.
A ~30-line Node static server is required because `file://` breaks both OAuth
redirects and the SDK.

**Auth — Authorization Code with PKCE (rule 2).** `crypto.subtle` SHA-256 challenge
plus a `state` parameter for CSRF. Redirect URI is the literal loopback IP, the one
non-HTTPS form rule 3 permits — never `localhost`, never a wildcard.

**Scopes (rule 4)** — four, each load-bearing:

| Scope | Why it's required |
|---|---|
| `streaming` | play audio through the Web Playback SDK |
| `user-read-email`, `user-read-private` | the SDK requires both to initialise |
| `user-modify-playback-state` | `PUT /me/player/play` |

Deliberately *not* requested: `user-read-playback-state` (the SDK's own state listener
covers it), and every playlist/library scope.

**Token management (rule 5).** Access token in-memory only, never in storage. Refresh
token in `sessionStorage`, cleared on tab close. PKCE verifier and `state` in
`sessionStorage`, deleted immediately after exchange. Refresh via
`grant_type=refresh_token` on expiry and on 401; when the refresh token is itself
rejected (`invalid_grant`), clear tokens and re-authorize.

*Honest limitation:* a browser-only PKCE app cannot store a refresh token truly
securely — anything reachable by JS is reachable by XSS. The real fix is a backend
holding tokens in an httpOnly cookie. Out of scope for a POC; document as the upgrade
path.

**One `spotifyFetch()` wrapper (rules 6, 8)** so the policy lives in one place:

- **429** → honour `Retry-After` exactly, exponential backoff on repeats, cap 3
  attempts. No immediate retries, no tight loops.
- **401** → refresh once, retry once, then re-authorize.
- **403** → surface Spotify's `error.message`; the usual "Premium required" signal.
- **404** → stale device; reconnect the player and say so.
- **5xx** → exponential backoff, then surface.

Messages come from Spotify's `{error:{status,message}}` body, never invented strings.

**Playback and reveal.**

1. `window.onSpotifyWebPlaybackSDKReady` → `new Spotify.Player(...)` → `connect()` →
   the `ready` event yields `device_id`, registering the page as a Connect device.
2. **Play** → `player.activateElement()` first (Safari/mobile autoplay rules), then
   `PUT /me/player/play`.
3. **Pause** → `player.pause()`, *then* `GET /tracks/{id}`, then write the name in.

Fetching the name **at pause time rather than at load** is deliberate: the title stays
out of the page source, the DOM and the network log until the moment of reveal.

**Attribution and caching (rule 9).** "Powered by Spotify" on the page; the revealed
title links to `external_urls.spotify` with artist names shown. Metadata lives in a JS
variable for the reveal only — never persisted, cleared on reset. Nothing cached
beyond immediate use, nothing used for model training.

## Known limitations

- **The hiding is UI-level, not secure.** The track URI is visible in devtools to
  anyone who looks. Real concealment needs a server-side proxy.
- **Premium required.** A free account gets 403 from `/me/player/play`; the POC
  surfaces Spotify's own message rather than failing silently.

## Verification

**Next session, automated:** diff endpoint paths, parameters and field names against
the fetched schema; `node --check` each JS file; serve every route; and with the SDK
stubbed, assert the button state machine works and that `#reveal` holds no track name
before pause.

**Only you can confirm** — the sandbox can't reach Spotify and has no Premium account:

1. `node server.js` → open `http://127.0.0.1:5173/`
2. **Log in with Spotify** → consent → redirected back, connected
3. **Play** → audio starts in the page, name still hidden
4. **Pause** → audio stops, name appears with artist and Spotify link

Steps 2–3 are where first-run OAuth problems surface; the error Spotify returns points
straight at the fix.
