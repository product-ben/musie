# Musie Setup

How the running system is wired: the hosted project, the host, the build, the
gate, and the accounts. Written on 2026-09-23, when phase H's unblocked half
landed and the beta became something a tester could be handed.

**What this is not.** It is not the plan (`BUILD-PLAN.md`), not the rules
(`CLAUDE.md`), and not the record of decisions (`apps/web/OPEN-QUESTIONS.md`).
It is the answer to "what is switched on, where, and how do I change it".

**Everything here was read back from the live services rather than remembered.**
Where a value is quoted it was fetched; where something is unverified it says so.

---

## 1 · The pieces

| Piece | Value | Notes |
|---|---|---|
| Supabase project | `project-musie` · `xliwtiiopwyfunxkdmxh` · Frankfurt | Hosted. The local stack is a separate database with the same migrations |
| Host | Cloudflare Workers, Worker `musie` | Assets-only: it serves `apps/web/dist` and runs no code |
| Worker tag | `629280cc52d246849eb7992482b1c839` | The id Access policies attach to |
| Cloudflare account | `ad53c20621825a671e3095c9ecf37c51` | |
| workers.dev subdomain | `lipinskib` | So production is `musie.lipinskib.workers.dev` |
| Zero Trust org | `dry-dew-8f76.cloudflareaccess.com` | Enabled 2026-09-23 |
| Spare host | `netlify.toml`, untouched | Both hosts build `main` by design |

There is **no custom domain**. The domain is still undecided, and
`BUILD-PLAN.md`'s footer warns that printing a QR code fixes it permanently, so
the decision waits for print day.

---

## 2 · The gate, which is the thing to understand first

`VITE_REQUIRE_ACCOUNT` decides how somebody gets in.

- **On** — no anonymous session is ever created. No session means the sign-in
  form, and there is no way past it. Accounts are handed out by hand.
- **Off or unset** — the app signs the visitor in anonymously, as it always did.
  The first exercise costs nobody an email address.

It is read at **build** time, not run time: the value is compiled into the
bundle. Changing it means rebuilding and redeploying, not restarting anything.

**On hosted, "off" is not merely open — it is broken.** Anonymous sign-ins are a
*dashboard* setting on the Supabase project and they are **disabled** there;
`POST /auth/v1/signup` answers `anonymous_provider_disabled`. So with the flag
off, a visitor to the hosted app cannot get in by any route at all. With the
flag on, the app never calls `signInAnonymously()` and that setting stops
mattering.

Accepted spellings: `true` / `1` / `on` / `yes`, case-insensitive. Anything else
non-empty is treated as **off** and warned about in the browser console — a flag
meant to be on that silently reads as off is the failure that matters.

---

## 3 · Environment variables

### Cloudflare — the production build

Set per **build trigger**, not in `wrangler.jsonc`. Build variables are
available to the build and not at run time, which is exactly right: this is a
static bundle and there is no run time.

Both triggers carry all three:

| Trigger | uuid | Branches |
|---|---|---|
| Production | `c616f890-2093-4287-8211-2b6e7f5234ef` | `main` |
| Non-production | `22dc2063-0a7c-4ef7-8255-f01f0412214a` | `*` |

```
VITE_REQUIRE_ACCOUNT   = true
VITE_SUPABASE_URL      = https://xliwtiiopwyfunxkdmxh.supabase.co
VITE_SUPABASE_ANON_KEY = sb_publishable_fnUseGppvXi7_…
```

None is a secret. The publishable key ships in the browser bundle by design and
is constrained by row level security; the flag is a feature switch. Marking
either secret would hide it from you and from nobody else.

Dashboard path: **Workers & Pages → musie → Settings → Build → Variables and
secrets**. Changing one does not rebuild; push or re-run a build.

**The service-role key is not here and must never be.** It bypasses RLS and
every column grant. It lives in the Supabase dashboard and is pasted for one
command at a time.

### Local — `apps/web/.env.local`

Gitignored, per checkout, and it decides which database `pnpm --filter web dev`
talks to. Copy `apps/web/.env.example`. Anon key only —
`apps/web/src/lib/supabase.ts` refuses to start if it finds a secret key.

**This file also decides what `getSupabase()` returns inside tests**, which is
a trap worth knowing: a `*.db.test.ts` that calls `getSupabase()` tests whichever
project this file names, while `pnpm test:db` is aimed wherever
`supabase status` or the `SUPABASE_TEST_*` variables point. Those two can differ,
and when they do the suite can pass while testing nothing. A db test uses
`anonClient()` from `db.support.ts`, never `getSupabase()`.

---

## 4 · Deploying

**Workers Builds is connected to the GitHub repository, so a push to `main`
builds and deploys on its own.** There is no deploy step to run and no GitHub
Actions workflow for it — `.github/workflows/` holds CI and Storybook only.

```
build:  pnpm check && pnpm --filter web build
deploy: npx wrangler deploy
root:   /
```

The build command runs the full gate, so a red test stops a deploy.

To deploy by hand from a laptop instead, `pnpm --filter web build && npx wrangler
deploy` — and note it uses **your `.env.local`**, so check what it points at
first. A build made while that file pointed at a LAN address would ship an app
that only works on one wifi network.

### Exposure

Two lines at the foot of `wrangler.jsonc` govern who can reach it:

```jsonc
"workers_dev":  // production musie.lipinskib.workers.dev
"preview_urls"  // every non-production branch build gets its own URL
```

**A dashboard toggle does not hold** — the next deploy restores whatever the
file says. This file is the switch.

---

## 5 · Cloudflare Access

Enabled 2026-09-23. One application:

- **Musie — preview deployments** · `6993b74e-c4a1-4554-8345-bff40d825d4a`
- Destination: `preview_worker` on Worker `629280cc…` — **previews only**
- Policy: allow, include *login method = Cloudflare*, whose IdP has
  `restrict_to_account_members: true`. So it means "whoever can sign in to this
  Cloudflare account", with no email list to maintain.
- Session: 24h

**Why previews only, and not production.** Production is closed by the app's own
sign-in gate. Putting Access in front of it as well would make every tester
authenticate twice — a Cloudflare one-time PIN and then the app — and their
addresses would have to be kept in an Access allowlist *as well as* in
`auth.users`. Previews are the sharp edge: every branch build otherwise gets its
own public URL, which is the exposure nobody would notice.

To change it: **Workers & Pages → musie → Access**, or the app id above.

---

## 6 · Tester accounts

`apps/web/scripts/create-tester.mjs`. Service role, `email_confirm: true`, **no
mail on any path** — no provider, no sending domain, no DNS record. That is what
lets the beta run while the domain question is still open.

Get the key from **Supabase → project-musie → Project Settings → API keys**, and
take a **Secret key** (`sb_secret_…`) rather than the legacy `service_role` JWT.
The dashboard says why beside the old one, and the difference is what a leak
costs: a secret key is revoked on its own, while a `service_role` JWT is signed
by the project's JWT secret, so containing that leak means rotating the secret
and invalidating every token the project has issued. Verified on 2026-09-23 that
`auth.admin.createUser` accepts the secret key exactly like the JWT.

Then, from `apps/web`:

```bash
SUPABASE_URL=https://xliwtiiopwyfunxkdmxh.supabase.co \
SUPABASE_SECRET_KEY='sb_secret_…' \
  node scripts/create-tester.mjs tester1@example.com tester2@example.com
```

`SUPABASE_SERVICE_ROLE_KEY` is still accepted, so older runs keep working.
Both variables or neither. A half-set silently creates the accounts on the
**local** stack instead — which looks like it worked and leaves the tester unable
to sign in. **The script prints its target before it writes anything; read that
line.** `setopt HIST_IGNORE_SPACE` and a leading space keeps the key out of
shell history.

One address failing does not stop the others, and the exit code still reports it.
Passwords are generated per tester from an alphabet with no `0/O`, `1/l/I` or
`5/S`, because they are read aloud and typed on phones by people who did not
choose them.

### Two rules that travel with the password

1. **Sign in before the first session.** An exercise done before signing in is
   saved to that browser's anonymous account and **cannot be moved** —
   `updateUser` is refused with `email_exists` once an address is taken, so a
   pre-created account can never be converted into. The tester lands in an empty
   diary and it looks exactly like data loss.
2. **A forgotten password is reset in the Supabase dashboard.** There is no
   reset mail and no reset screen. That is fine at twenty testers and it is also
   the ceiling.

---

## 7 · Running it locally

```bash
cd apps/web
supabase start                       # the local stack, from the repo root
node scripts/create-tester.mjs you@musie.test
npx vite --port 5174 --strictPort    # pin the port; 5173 may be in use
```

Point `.env.local` at `http://127.0.0.1:54321` with the anon key from
`supabase status -o json`, and set `VITE_REQUIRE_ACCOUNT` to taste. **Restart
after changing it** — it is read when the server starts.

### Two devices, without deploying

The local API binds to `0.0.0.0:54321`, so a phone on the same wifi can reach it.
Put the Mac's LAN address in **both** URLs — `127.0.0.1` means the phone itself:

```bash
# VITE_SUPABASE_URL=http://<mac-lan-ip>:54321
npx vite --host --port 5174 --strictPort
```

**The microphone and camera will not work this way.** iOS treats a plain-HTTP
LAN address as insecure, so `getUserMedia` is blocked. Sign-in and the diary are
unaffected. Recording has to be tested over HTTPS — a deployed URL or a tunnel.

---

## 8 · What is deliberately absent

Not missing, not forgotten — each needs a sending provider and a sending domain,
and the domain is undecided:

- self-service sign-up
- password reset and magic links
- email change
- OAuth

They are H.1 and H.3. Until then a pre-created account is one-way: it can be
signed into and never converted into.

**A person's name is in the copy.** The wrong-password message ends "gib Ben
Bescheid" / "let Ben know", because in a beta with no reset that is the only
true next step. It comes out at H.1, and both catalogue entries say so.

---

## 9 · Still open

- **The second-device test.** H.0 and H.0b are both *done when* one account reads
  one diary on two devices. Everything so far was verified on one machine.
- **F's iPhone checkpoint**, which was meant to precede H.0b. Recoverable: leave
  `VITE_REQUIRE_ACCOUNT` unset and the entrance is the one every earlier hand
  test used.
- **The privacy page.** `privacy.account` and `privacy.browserBound` were
  rewritten to be true for both kinds of account, and **nothing renders them** —
  there is no privacy screen yet.
- **The domain**, which fixes the QR codes permanently.
