# musie — "Guess the track" POC

A proof-of-concept web app: click **Play** and a Spotify track streams inside the
page; the track's name stays hidden until you click **Pause**.

Track: [`2tazKVVJBWqFOAAlFzfQe5`](https://open.spotify.com/track/2tazKVVJBWqFOAAlFzfQe5)

## Status: not yet implemented

This repo currently contains only the approved design. See **[PLAN.md](PLAN.md)** for
the full implementation plan and **[CLAUDE.md](CLAUDE.md)** for the binding Spotify
API rules.

The build was deliberately deferred. [CLAUDE.md](CLAUDE.md) rule 1 forbids guessing
endpoints or field names, and the session that drafted this plan had
`developer.spotify.com` blocked by its network egress policy, making the OpenAPI
schema unreadable. A network policy binds when the container is created, so the fix is
to **start a new session** with Spotify egress allowed, then:

> Read PLAN.md and build it.

## Design in one paragraph

Static page plus a dependency-free Node static server on `http://127.0.0.1:5173`. Auth
is Authorization Code with PKCE — no client secret anywhere. The
[Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk)
registers the page as a Spotify Connect device so audio plays in the tab, giving real
programmatic play/pause. The track's name is fetched **at pause time**, not at load, so
the title never appears in the page source, the DOM, or the network log until the
reveal.

## Setup (already done once)

1. App created at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Redirect URI registered: `http://127.0.0.1:5173/` — the literal loopback IP, not
   `localhost`, which Spotify rejects
3. Client ID: `6796456706bf44168a52d61b46d7c11e`

The Client ID is public by design in PKCE, so it is safe in this repo. There is **no
Client Secret** in this project — PKCE does not use one, and it must never reach
browser code.

## Running it (once implemented)

```sh
node server.js
# open http://127.0.0.1:5173/
```

## Verification checklist

Automated checks (endpoint/field names diffed against the fetched schema, syntax,
routes served, and an assertion that the reveal element holds no track name before
pause) will run in the build session.

These four steps need a human with a Premium account and a browser:

1. `node server.js` → open `http://127.0.0.1:5173/`
2. **Log in with Spotify** → consent → redirected back, connected
3. **Play** → audio starts in the page, name still hidden
4. **Pause** → audio stops, name appears with artist and a link to Spotify

Steps 2–3 are where first-run OAuth problems surface. The error Spotify returns points
straight at the cause.

## Known limitations

- **Spotify Premium is required.** The Web Playback SDK will not stream to a free
  account; `PUT /me/player/play` returns 403, and the app surfaces Spotify's own
  message rather than failing silently. A no-Premium fallback using the iframe embed
  was considered and rejected: hiding the title would mean covering Spotify's embed,
  which conflicts with the embed display requirements in the Developer Terms.
- **The hiding is UI-level, not secure.** The track URI is visible in devtools to
  anyone who looks for it. Real concealment needs a server-side proxy.
- **Refresh tokens in a browser-only app are not truly secure.** Anything reachable by
  JS is reachable by XSS. The upgrade path is a backend holding tokens in an httpOnly
  cookie.

---

Music content and metadata are provided by Spotify.
