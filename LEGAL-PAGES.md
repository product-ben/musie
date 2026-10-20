# Imprint, privacy policy and cookies · PRD

Two pages, three places that link to them, and — since Ben's second brief the
same day — a consent card in front of PostHog. Written 2026-10-20, the week
before real testers start and the week `musie.org` lands. **Product document —
no code.** The engineering plan is `LEGAL-PAGES-PLAN.md` beside it and is not
written yet.

Readable copy: https://claude.ai/code/artifact/be18d479-d0e2-4463-8997-8e9ba07914de

The brief (Ben, 2026-10-20), verbatim:

> *We need the legally required Imprint, Privacy Policy & Cookie Law/ cookie
> banner things. Write a PRD for this and make a suggestion where in the app to
> add this in the least obtrusive way possible.*

And the second, after the first draft said no banner was needed:

> *I need session replays. So lets include a cookie law and if the user
> refuses, it switches to cookieless_mode: 'always', EU cloud.*

**The headline answer to the last part is: one line of small text at the foot of
the nav drawer, and the same line at the foot of the two screens you can reach
without an account.** Nothing new on any screen of the app itself, no header
icon, no footer under the exercises — §5.

**The headline answer to the middle part changed within the day, and the reason
is worth keeping.** Musie's own storage needs no consent — every key it writes
is the login or a preference the user set, which `§ 25 Abs. 2 Nr. 2 TDDDG`
exempts (§4.3). PostHog's does. And **session replay cannot be had without it**:
PostHog disables replay in cookieless mode, because replay needs a session id in
storage. So *replay* and *no banner* are alternatives, not a trade-off to split
— Ben chose replay, so a consent card ships. Accept and PostHog runs in full;
refuse and it runs `cookieless_mode: 'always'`, with no replay and nothing
written to the device (§4.4, §4.5, §4.6).

**Not legal advice.** This is a build spec: it says which pages exist, where
they are linked, what facts about this repo they must state, and who supplies
what. The German texts need a lawyer or a reputable generator before they go
up — §10.

---

## 1 · Why now

**Three clocks, and two of them have already run out.**

- **`/beta` collects a first name and an email address today** and says one
  sentence about it (`beta.privacy`, rendered at `BetaSignup.tsx:282`) with no
  policy behind it. Art. 13 DSGVO asks for the controller's identity, the legal
  basis, the retention period and the data subject's rights *at the moment of
  collection*. One true sentence is not that.
- **Testers keep accounts from next week** (`RELEASE-CHANNELS.md` §1), and what
  they put in them is free text about how they feel plus, on the reflect step,
  speech streamed to a US provider. That is the most sensitive category the
  DSGVO has, and the app currently says four things about it in-product and
  nothing anywhere else.
- **`musie.org` is about to answer on the open internet** — a public page with a
  sign-up button (`RELEASE-CHANNELS.md` §4). The moment it does, `§ 5 DDG`
  applies to it: a business-like digital service needs an Impressum that is
  *leicht erkennbar, unmittelbar erreichbar und ständig verfügbar*. A missing
  one is the cheapest thing in German web law to be sued over, and it is sued
  over by strangers rather than by users.

**There is nothing in the repo today.** Grepped, not remembered: no
`impressum`, no `datenschutz`, no privacy or cookie copy outside the four
in-product promises in `i18n/en.ts` (§6) and one descriptive page in the
documentation site (`apps/docs/architecture/security.md`).

**And the thing that makes this cheap is already built.** `/beta` proves that a
page can be served with no account, no session and no router, above
`AuthProvider` — `lib/publicRoute.ts` carries the argument, and the legal pages
need exactly that property for exactly the same reason: a stranger reading the
Impressum must not create an `auth.users` row by reading it.

---

## 2 · What ships

| # | Thing | Where |
|---|---|---|
| 1 | `/impressum` — the Impressum, bilingual | A public page, like `/beta` |
| 2 | `/privacy` — the privacy policy, bilingual | A public page, like `/beta` |
| 3 | A two-link line at the foot of the nav drawer | `NavDrawer.tsx`, under the preferences |
| 4 | The same line on `/beta` and on the sign-in gate | `BetaSignup.tsx`, `SignInGate.tsx` |
| 5 | The same two links in the documentation site's footer | `apps/docs/.vitepress/config.*` |
| 6 | One corrected in-product promise about the voice | `i18n/en.ts` + `de.ts` — §6 |
| 7 | A one-time analytics consent card, on first run **inside** the app | §4.4, placed in §5.6 |
| 8 | An *Analytics & session replay* switch, so consent can be withdrawn | `MenuPreferences.tsx`, beside dark mode |
| 9 | `profiles.analytics_consent` + timestamp + policy version | A new migration — CLAUDE.md rule 4 |
| 10 | PostHog configured as §4.5 says, replacing the stub already in the tree | `apps/web/src/lib/posthog.ts` |

**No banner on any public page**, because no public page loads analytics (§4.6).
No new header control. No footer on any screen of the app. The consent card is
asked once, inside the app, and never over a running session.

Three further things the law wants are **not pages and not in this**, and §8
names them so they are not lost: a processor contract with each of the three
providers, an Art. 30 record of processing, and the explicit consent that
Art. 9 asks for before somebody speaks into the microphone.

---

## 3 · The Impressum

### 3.1 · What goes on it

`§ 5 DDG` (which replaced `§ 5 TMG` in May 2024). **Ben filled this in on
2026-10-20**, in the readable copy, while this document was being written — so
the right-hand column is content now rather than a list of asks.

| Field | Required | What it says |
|---|---|---|
| Name | Always | **Benjamin Lipinski und Lucy von Damnitz** |
| Full postal address — a street address, never a PO box | Always | Strehleranger 7, 81735 München |
| Email address | Always | `bl@musie.org` |
| A second fast route: phone, or a contact form | Always, one of the two | A phone number. See the note below — this is more than the law asks for |
| Legal form, represented by, register, VAT ID | If a company | **None of them.** Two private individuals, so these four rows came out of the table |
| Supervisory authority | Only for licensed trades | n/a |
| Responsible for editorial content (`§ 18 Abs. 2 MStV`) | Only for journalistic-editorial offerings | n/a — Musie publishes exercises, not journalism |
| EU dispute-resolution notice (`§ 36 VSBG`) | Only once there is a consumer trader relationship | n/a today; **revisit when payments land** |

**The page is no longer blocked**, and two consequences of the answer are worth
putting to a lawyer rather than assuming — both of them invisible until somebody
asks:

- **Two people jointly offering a service are a GbR by default under German
  law.** That changes who is named here and who is liable for it, and it makes
  both of them **joint controllers** under Art. 26, which wants a short written
  agreement on who answers a data subject's request.
- **A private mobile number is now printed where anyone can read it.** `§ 5 DDG`
  does not require a phone number — an email address plus a contact form
  satisfies the *second fast route* — so publishing one is a choice worth making
  deliberately rather than by default.

### 3.2 · What the page must be called

**The German label is `Impressum`, not a translation of it.** It is the word
courts, strangers and German users all look for, and the one thing about this
page that is genuinely settled law. In English the link reads `Legal notice` and
the page keeps `Impressum` in its heading as well, because that is the term the
obligation is named after.

The canonical path is `/impressum`. `/imprint` resolves to the same page, in the
same forgiving way `lib/publicRoute.ts` already accepts `/beta/`, `/Beta` and
`/BETA` — and for the same reason: Cloudflare answers every unmatched path with
`index.html`, so the alternative to accepting a spelling is not a 404 but the
sign-in gate appearing to somebody who typed a legal page's address correctly.

### 3.3 · Two clicks, from everywhere, without an account

The standard is *unmittelbar erreichbar* — in practice no more than two clicks
from any page, and reachable without logging in. §5 is written to that
constraint and nothing else; it is the whole reason the links go where they go.

---

## 4 · The privacy policy

### 4.1 · It is read back from the code, not written from a template

The policy must match what this repo actually does, and this repo already
states promises in-product that a generated template will contradict. What
follows is the inventory, read back on 2026-10-20. **It is the content brief for
the page.**

| What | Where it lands | Why | Special category? |
|---|---|---|---|
| Email address, password hash | `auth.users`, Supabase Frankfurt | There is an account | No |
| Language, theme, "here as", canary preference | `public.profiles` | The app remembers your settings | No |
| Which exercise, when, which step, outcome | `public.sessions` | Your diary | No |
| **Free text about how you feel** | `public.reflections.body` | Your diary | **Yes — Art. 9, health** |
| **Which feelings you picked, before and after** | `public.session_feelings` | Your diary | **Yes — Art. 9, health** |
| First name, email, reason for joining | `public.beta_signups` | The waiting list | No |
| **Microphone audio, while you hold the button** | **Streamed to OpenAI, US** — `features/voice/src/config.ts:17` | Speech-to-text | **Yes** |
| A photo you take on the reflect step | **Nowhere.** It stays on the device | — | n/a |
| IP address, user agent, request time | Cloudflare and Supabase server logs | Serving and defending the service | No |
| **Which screens, which presses, how long** | PostHog EU, **only with consent** | Finding where people get stuck | Inferable — §4.5 |
| **A masked recording of the screen** | PostHog EU, **only with consent** | Session replay | Inferable — §4.5 |

Four properties of that table are worth stating in the policy because they are
unusually good, and they are all verifiable rather than claimed:

- **Only text is stored for a spoken answer.** `reflections.body` is the only
  column — `20260919120000_sessions.sql:149`. No bucket, no recording, no audio
  anywhere in the schema.
- **Nobody else can read a diary.** Row-level security scopes every row to its
  own account, and `pnpm test:db` proves it rather than the policy asserting it.
- **No advertising, no profiling, no automated decisions, nothing sold or
  shared.** Analytics and session replay exist, and they are **off until the
  person says yes** — §4.4. This bullet said *no tracking, no analytics script*
  until 2026-10-20, and a privacy promise that stops being true is the exact
  failure §6 is about. It is rewritten here rather than quietly kept.
- **Fonts are self-hosted.** `index.html` preloads `/fonts/*.woff2` from our own
  origin, so no font CDN ever sees a visitor's IP address. This is the single
  most common reason a German site needs a consent banner, and it does not
  apply here.

### 4.2 · The four processors, and the two transfers that need a sentence

| Provider | Role | Where | What it needs |
|---|---|---|---|
| Supabase | Database, auth, Edge Functions | Project `xliwtiiopwyfunxkdmxh`, **Frankfurt** | Art. 28 processor agreement; US parent, so confirm the transfer basis |
| Cloudflare | Serves the app, assets-only Worker (`wrangler.jsonc`) | Edge | Art. 28 processor agreement; confirm the transfer basis |
| OpenAI | Speech-to-text, **only while recording** | **United States** | Art. 28 processor agreement; transfer basis; confirm the API's no-training-by-default and retention terms in writing |
| PostHog | Product analytics and session replay, **only with consent** | **EU Cloud, Frankfurt** — `eu.i.posthog.com` | Art. 28 agreement; US parent, so confirm the transfer basis for support access; a retention period set deliberately rather than left at the default |
| Resend | Sign-in codes by email — **not wired yet**, but `wrangler.jsonc` says the domain was registered for it | To confirm | Art. 28 agreement and a transfer basis before the first code is sent. A login code to an address is processing, and the policy has to name it |

**OpenAI is the one that needs its own paragraph in the policy.** PostHog's
transfer is support access to a Frankfurt dataset, which is ordinary. This one
is not: it is the only case where the data itself leaves the EU, and the only
case where the thing leaving is a person's voice saying how they feel. The audio goes **from the
browser straight to `wss://api.openai.com/v1/realtime`** — the app mints a
ten-minute ephemeral credential through the `realtime-token` Edge Function so
the API key never reaches the bundle, but the audio path itself is
browser-to-OpenAI. The policy must say so plainly, and §6 fixes the one
in-product line that currently implies otherwise.

### 4.3 · Everything this app writes to your device

**This is the cookie section, and it is also the whole § 25 TDDDG analysis.**
`§ 25` covers *storing information in a terminal device* — not only cookies, so
`localStorage` and `sessionStorage` count exactly the same. Read back from the
code on 2026-10-20:

| Key | Store | What it is for | Consent needed? |
|---|---|---|---|
| `sb-<ref>-auth-token` | local | **The login itself.** Set by `supabase-js` — `lib/supabase.ts` | No — strictly necessary |
| `musy-theme` | local | Light or dark, **because you chose it**. Read pre-paint in `index.html` | No — a preference you set |
| `musie-locale` | local | German or English, **because you chose it**. Read pre-paint, and `<html lang>` depends on it (CLAUDE.md 5) | No — a preference you set |
| `musie-goal` | local | The goal filter you picked — `lib/goals.ts:46` | No — a preference you set |
| `musie-deck-guide` | local | Whether you have already seen the deck's one-time guide — `lib/deckGuide.ts:32` | No — the service you asked for |
| `musie-scanned-code` | session | A scanned card, held for this tab until the session opens — `lib/scan.ts:91` | No — the service you asked for |
| `musie-helper:<session>:<question>` | session | Whether you opened a question's helper text — `lib/questions.ts:205` | No — the service you asked for |
| `musie-identity-recovery` | session | One recovery attempt per tab when a token names a deleted user — `lib/identity.ts:62` | No — strictly necessary |
| `ph_<project key>_posthog` + cookie | local + cookie | **PostHog**, and only after an explicit yes — §4.4 | **Yes, and that is what the card is for** |
| The consent decision itself | `profiles`, mirrored locally | Remembering the answer so the card is asked once | No — storing a consent decision is permitted, and refusing to remember it would mean asking again forever |

**Musie itself writes no cookies.** Not one `document.cookie` write in the app,
the design system or the voice package — every key of ours is `localStorage` or
`sessionStorage`, which § 25 treats identically. Cloudflare may set its own
bot-management or rate-limiting cookies once a real zone is in front of the app;
those are Cloudflare's own strictly-necessary set, and §7 makes verifying it a
step rather than an assumption.

**The line through that table is the line the consent card sits on.** The first
eight rows are either the login or a choice the person made inside the product
— `§ 25 Abs. 2 Nr. 2 TDDDG` exempts them, and asking permission for them would
be theatre. The last two are PostHog, they are not exempt, and nothing writes
them until somebody has said yes. So the obligation splits: **transparency** for
the eight, which is this table in plain words on the privacy page, and
**consent** for the two, which is §4.4.

### 4.4 · The banner: this section inverted on 2026-10-20

**It said there should be no banner, and the first draft was right about the
app as it then stood.** Nothing in §4.3 has changed: the eight keys Musie writes
are all exempt, and a consent dialog in front of them would still be a dialog
asking permission for the login. What changed is the product — and §4.4's own
condition named this exact event: *the day anything loads from a domain we do
not own, or anything measures behaviour beyond serving a request, this decision
is void.* PostHog arrived the same afternoon, so the condition fired as written.

**Session replay settles the rest of the argument, and it is PostHog's own
behaviour rather than a legal opinion.** Replay is disabled in cookieless mode,
because it needs a session id in storage. So the two options are not *banner* or
*no banner* with replay on both sides; they are:

| | What runs | What you get |
|---|---|---|
| **Accept** | Cookie + `localStorage`, person profiles, **session replay**, feature flags | The whole product-analytics picture, masked as §4.5 requires |
| **Refuse** | `cookieless_mode: 'always'` — nothing on the device, identity is a rotating server-side hash | Counts, screens, funnels within a visit. **No replay**, no `identify()`, no surveys, no persistent feature flags, no GeoIP |
| **Before they choose** | Nothing captured, nothing stored | Nothing, deliberately |

**Ben's call, 2026-10-20: replay is needed, so the consent card ships.**

In code the switch is one flag rather than two code paths: initialise with
`cookieless_mode: 'on_reject'` and `opt_out_capturing_by_default: true`, and let
the card call `opt_in_capturing()`. *Refusing switches it to
`cookieless_mode: 'always'`* is precisely what `on_reject` does — Ben's brief and
PostHog's flag are the same mechanism under two names.

**Five rules the card has to obey, because a consent that breaks any of them is
not a consent and the collection behind it is unlawful:**

- **Refuse is as easy and as prominent as accept.** One press each, the same
  weight, nothing pre-ticked, no *manage preferences* maze where the second
  button should be.
- **Nothing is captured before the choice.** Not a pageview, not an exception.
- **It is withdrawable as easily as it was given** (Art. 7(3)) — the switch in
  the drawer's preferences, beside dark mode and language.
- **It is recorded**: who, when, and which version of the policy they were
  shown. `profiles.analytics_consent` (`null` | `granted` | `refused`) plus a
  timestamp and a version string — a new migration, so CLAUDE.md rule 4, and
  `pnpm db:sync` to send it.
- **It is not bundled with anything required to use the app.** Analytics is
  optional and refusing costs the person nothing — no nag, no second ask, no
  degraded exercise. The Art. 9 consent of §8 is a *different* decision and must
  not be presented as one tick with this.

### 4.5 · PostHog, as it must be configured

| Setting | Value | Why |
|---|---|---|
| Region | **EU Cloud**, `https://eu.i.posthog.com` | Frankfurt, same as Supabase. The US cloud is a third-country transfer we have no reason to make |
| `cookieless_mode` | `'on_reject'` | The whole of §4.4's switch |
| `opt_out_capturing_by_default` | `true` | Nothing before the choice |
| `session_recording.maskAllInputs` | `true` | Pinned, not inherited |
| `session_recording.maskTextSelector` | `'*'` | **Every text node masked.** The text on these screens is somebody's diary |
| `.ph-no-capture` | On the reflect field, the voice transcript, the diary list and entry, and the feelings sheet | Blocked outright, not masked — replaced by a block of the same size |
| Network capture | Bodies off, and `maskCapturedNetworkRequestFn` scrubbing Supabase REST payloads | **A diary row in a response body is a diary entry in the replay** |
| Autocapture | Off, or at minimum capturing no element text | Our element text is feeling words and exercise titles |
| `identify()` | The user id, never the email | An email in PostHog is an identifier we did not need to send |
| `capture_exceptions` | Keep, but strip message bodies — and pick one error channel | `RELEASE-CHANNELS.md` §11.2 says error reports go into **our own** database. Two channels for one thing is drift; decide which, in that document or this one |
| `defaults: '2026-05-30'` | Replaced by explicit flags | Rule 7's habit applied to a third party: never let a default through. A dated bundle changes meaning the day somebody bumps the date |

**What masked replay actually gives you, so nobody is surprised:** shapes,
timings, taps, scrolls, the pause before a press and the screen somebody left
from. **Not readable words.** That is what *where did they get stuck* needs, and
it is the only version of replay defensible on a diary of feelings. If the hope
was to read a reflection back, the answer is to ask the tester — recording them
instead is the thing the DSGVO is about.

### 4.5.1 · What the PostHog wizard already wrote, and the two lines that must not ship

**This was not a hypothetical risk from the table above. It was in the working
tree, uncommitted, on 2026-10-20 — and both lines came out the same day, on
Ben's say-so, with `pnpm check` green after.** The finding is kept in full
rather than deleted, because the next wizard run will write it again.

PostHog's setup wizard added
`lib/posthog.ts`, `lib/posthogLogs.ts` and capture calls across eight files.
Most of it is good and should stay — `session_started`, `session_completed`,
`session_abandoned`, `onboarding_completed`, `beta_signup_completed`, each with
at most an `exercise_kind`. Two of them are not.

**1 · The spoken reflection is being sent to PostHog in full.**
`components/VoiceTranscript.tsx` captures an `$ai_generation` event carrying
`$ai_output_choices: [{ role: 'assistant', content: transcript }]` — the
transcript, verbatim. That is what the person just said about how they feel,
leaving for a third party as an LLM-observability event. It is Art. 9 data, it
has no consent behind it, and `privacy.voiceShort` promises the opposite on the
very screen it fires from.

**Fixed 2026-10-20.** The event stays — the model and the count are worth
having, since OpenAI bills per minute and fails hard at the spend cap — and the
property is gone. The guarantee was then moved one level down, which is the part
worth keeping: `features/voice`'s `onTranscriptionCompleted` now takes **no
text at all**, so the transcript is not merely unsent, it never reaches the
analytics callback. Adding the property back means changing a signature in
another package first. Same shape as the argument in
`apps/docs/architecture/security.md`: *a screen cannot leak the title by
accident — the browser does not have it.*

**2 · The tester's email address becomes a PostHog person property.**
`AuthProvider.tsx` calls `posthog.identify(userId, { email })`. The wizard's own
comment says *email is a person property, never event data*, which answers a
different question than the one that matters: whether to send it anywhere. The
Supabase user id is already a stable identifier, and PostHog does not need to
know who it belongs to.

**Fixed 2026-10-20**: `posthog.identify(state.userId)`, with `state.email` out
of the effect's dependencies as well, so nothing re-runs it when an address
arrives.

And three things about the module itself:

- **It is imported at the top of `main.tsx`, above the public-path branch**, so
  it initialises on `/beta`, on the sign-in gate and on the two pages this
  document adds — before any consent exists, and on pages §4.6 says carry no
  analytics at all. It has to move inside the authenticated tree.
- **It throws at module import in dev when the env vars are missing.** That is
  the exact failure `lib/supabase.ts` refuses by design — *an import-time throw
  takes the whole app down to a blank page, which hides the reason.* Same
  treatment: no vars, no PostHog, no throw.
- **It sets no region, no masking, no cookieless mode and no consent gate**, and
  `posthogEnabled` means *the env vars are set*, not *the person said yes*.
  Which is what §4.4 and the table above are for.

**One judgment call is left, and it is Ben's rather than mine.**
`routes/Diary.tsx` captures `session_mood_feedback_submitted` with
`feeling_change`. It is an enum and not free text, so it passes the rule below
— but what it records is whether somebody felt better after an exercise, which
is the health inference this document keeps warning about, tied to an identified
user. It is defensible with consent and it is the one remaining event that a
reader of §4.1 might not expect. Left in place; named here.

**The general rule this suggests, and it is cheaper than reviewing every call
site forever:** no PostHog event carries content — not a transcript, not a
reflection, not a feeling word, not an email, not a track title. Event names
and enums only. A wizard that instruments an app cannot know which of its
strings are a diary; we can, and this is the one place to write it down.

### 4.6 · Analytics runs inside the app only

`/beta`, the sign-in gate, `/impressum`, `/privacy` and `musie.org` load **no
analytics at all**. Four things follow, and they are the reason this is the
recommendation rather than an omission:

- **No banner on any public page**, which keeps the brief's *least obtrusive*
  intact where it matters most: the first screen a stranger sees.
- **The legal pages stay what they are** — the two pages somebody reads without
  being measured while reading them.
- **The consent record has a home**: by the time the card is shown there is a
  `profiles` row to write it to, so it survives a new device and can be audited.
- **The cost is the sign-up funnel.** No measurement of `/beta`. At twenty
  testers that is a question answered by asking them.

If the sign-up funnel is wanted later, a real banner appears on the public pages
and the consent record needs a home that exists before login. Flagged, not
decided — §10.

---

## 5 · Where the links go — the least obtrusive placement

### 5.1 · The constraint that rules out a footer

**Every screen in this app is a stage, not a document.** `.musie-stage` is a
centred column sized against `--viewport-block`, the measured viewport written
pre-paint in `index.html`; `/session/:id/:step` is a full-height focus surface;
`/exercises` is a deck you deal with. A persistent footer would take vertical
space from all of them on a 393px phone, and it would put *Impressum* under the
exercise somebody is in the middle of. That is the opposite of the brief.

**The app already has exactly one piece of chrome that is on every screen: the
menu.** One header button opens it (`shell.menuLabel` is the only one left),
every screen has it, and it is already where the things you *set* live rather
than the places you *go* — dark mode, language and the account moved into it on
2026-09-24 when `/settings` was deleted.

### 5.2 · The recommendation

**One line of small text at the foot of the nav drawer, below the preferences
block, after the hairline that already separates that block from the
navigation.** Two text links separated by a middot, at `body-sm`, in the muted
foreground:

```
                Impressum · Datenschutz
```

- It is **one tap from every screen in the app**, which satisfies *unmittelbar
  erreichbar* with a click to spare.
- It costs **no pixels on any screen**, because the drawer is already there and
  `.musie-drawer__prefs` already sits at the foot of the viewport on an auto top
  margin.
- It is **not a navigation row.** The drawer's rows are `CtaButton`s — 44px
  targets that read as destinations you choose between. These two are not that;
  they are the small print, and they should look like it. `InlineLink` is the
  design system's component for a link that lives inside a line of text, which
  is what this is.
- It needs **no new header icon**, which was the other obvious place and the one
  that costs the most: a third control in a one-control header, for a page
  somebody opens once.

### 5.3 · And on the two screens you can reach without an account

This is the half that is load-bearing rather than tidy, because **a legal page
behind a login is not *ständig verfügbar*, and a privacy notice that appears
after the email address has been typed is too late.**

| Screen | Where | Why |
|---|---|---|
| `/beta` | One line under the form, directly below the existing `beta.privacy` sentence, which gains a link to `/privacy` | It collects a name and an email. Art. 13 wants the policy *here* |
| The sign-in gate | One line under the submit button | For a stranger with no account this is the entire website, so it has to carry the Impressum |
| `musie.org` | The foot of the sign-in gate, which **is** what a stranger now meets there | `wrangler.jsonc` attached the **root** domain straight to the Worker on 2026-10-20, so there is no separate marketing page in front of the app. `RELEASE-CHANNELS.md` §4 planned `app.musie.org` with a page at the root; the root is the app. Whatever lands at the root later needs the same line |
| `product-ben.github.io/musie/` | VitePress `themeConfig.footer` | A public website is a public website. One config line |

### 5.4 · Three placements, compared

| Option | For | Against |
|---|---|---|
| **Drawer foot + the two public screens** (recommended) | Nothing on any screen; one tap from everywhere; uses chrome that exists | Two code sites instead of one, because the public screens are outside the router by design |
| A footer on every screen | One place, impossible to miss | Takes height from every stage; lands under a running exercise; the thing the brief asked to avoid |
| Rows inside `/about` or `/about-you` | No new UI at all | Both are **behind the gate** — fails the no-account rule outright, and buries a legal page two taps deep inside a page about something else |

### 5.5 · What the pages themselves are

- **Public, by the same mechanism `/beta` uses.** `lib/publicRoute.ts` becomes a
  three-entry allowlist — still a string comparison, still decided above
  `AuthProvider`, so reading the Impressum can never create an account. In
  practice `isPublicPath` becomes `publicPage(pathname)` returning which page,
  and `main.tsx` renders one of three inside `PublicLocaleProvider`.
- **Bilingual, with their own language control**, exactly as `/beta` has one:
  the drawer that holds the app's switch is behind the gate, so these pages
  carry their own `SegmentedControl` and set their own `document.title`.
- **Rendered with what exists.** `.musie-stage` + `ContentBox` for the `<h1>` +
  the existing `Markdown` component for the body — it takes arbitrary Markdown
  and `.musie-md` already styles headings, paragraphs, ordered lists and
  `strong`. **The parser deliberately has no link branch** (`lib/markdown.ts`),
  so v1 writes email addresses and provider URLs as plain text, which is normal
  for an Impressum and costs nothing. Adding an anchor branch is a real option
  later; it is not a precondition.
- **A way back.** A ghost `CtaButton` rendering a plain `<a href="/">`, since
  there is no router on these pages — a full page load, which is correct here.
- **Not editable at `/maintenance`, ever.** These two pages are chrome: ours,
  permanent, and bundled. Routing them through the content tables would make a
  legal text a thing an operator can change between deploys.

### 5.6 · And the consent card, which is the one new thing on a screen

**It is not a banner on a public page**, because no public page loads analytics
(§4.6). It is a one-time card on first run **inside** the app:

- **A `Lightbox` over the first screen after sign-in**, not a strip at the foot
  of the viewport. A consent ask has to be answered to mean anything, and a
  dismissible strip over a stage layout is both easier to ignore and harder to
  place than the overlay pattern this app already has.
- **Two actions of equal weight**, side by side: *Yes, help improve Musie* and
  *No thanks*. Not a filled primary beside a ghost — equal prominence is a
  condition of valid consent, and `ButtonGroup` already renders a pair without
  ranking them.
- **Closing it without choosing is a refusal**, and refusal means cookieless. No
  second ask and no nag on the next run; the drawer switch is how somebody
  changes their mind.
- **Never over a running session.** First run, on the entry or library screen,
  before anybody is mid-exercise.
- **Withdrawal lives in the drawer**, as a switch in `MenuPreferences` beside
  dark mode and language — directly above the legal links of §5.2. One block
  holds the things you set and the two pages you read.

---

## 6 · One in-product promise is now misleading, and this fixes it

`i18n/en.ts` renders three privacy promises at the control they are about
rather than on a page — a decision from 2026-10-13, and a good one. One of them
no longer matches the code:

> `privacy.voiceShort`: *Musie saves only the text, never the voice message.*

**Every word of that is true and the sentence is still misleading.** Musie
stores only text — but the audio goes from the browser to OpenAI in the United
States to become that text, and a reader of this line will conclude their voice
never left the phone. That is the exact failure the `privacy.account` /
`privacy.browserBound` rewrite was about in the same file: *a privacy promise
that is false for the people currently testing*.

**In scope here, because it is one line in two catalogues and it is the only
in-product copy that contradicts the policy this document is specifying.** It
has to say both halves: the text is kept, the voice is not, and the speech is
turned into text by a service outside the EU — with the detail on `/privacy`,
one tap away. The German is written to `docs/GERMAN-UI-WRITING.md` (CLAUDE.md
rule 6), and this is the one screen where **precision outranks brevity** — the
file already says so in that block.

The other two lines are checked and stand: `privacy.written` ("nobody else can
see it") is what RLS enforces and `pnpm test:db` proves, and `privacy.photo`
("stays on your device") is true — there is no upload path for it.

`beta.privacy` is true and gains a link rather than a rewrite.

---

## 7 · Done when

**Built on 2026-10-20, on the branch `the-pages-the-law-asks-for`.** What the
code does and does not yet cover:

- **Both pages exist and were walked in a real browser** at 393px, in German
  and English, at all four spellings (`/impressum`, `/imprint`, `/privacy`,
  `/datenschutz`). `<html lang>` follows the locale, so the German hyphenates
  at German break points (rule 5), and the console is clean.
- **The phone number is deliberately NOT on the Impressum.** `§ 5 DDG` names
  an email address as the fast contact route and the ECJ has held that is
  enough; the number in the readable copy could not be transcribed
  unambiguously, and a wrong digit in an Impressum is somebody else's phone.
  It is one string in `legal.imprint.body`, in both catalogues, whenever Ben
  wants it there.
- **The privacy page describes the Art. 9 position truthfully rather than
  claiming a consent that does not exist yet.** It says the explicit step is
  being built and that, until it is, the diary is processed because the person
  asked for the service. That sentence comes out when §8's flow lands.
- **The consent card, the drawer switch and `profiles.analytics_consent` are
  written but not verified against a database**, because the migration needs
  `supabase db reset` and that is denied to agents by `.claude/settings.json`
  (rule 9 — one stack, many worktrees). Ben runs the reset, `pnpm gen:types`
  and `pnpm test:db`; `database.types.ts` carries the three columns by hand
  until he does, which is also what makes that run a real check rather than a
  formality.
- **PostHog needs one dashboard step the code cannot do**: cookieless mode has
  to be enabled in the project's own settings for `cookieless_mode` to work.
  Until it is, a refusal means no capture at all rather than cookieless
  capture — which is the safe direction to fail in, and still wrong.


- [ ] `/impressum` answers for a visitor with no account, in German and in
      English, with every `§ 5 DDG` field filled from Ben's facts
- [ ] `/privacy` answers the same way, and its inventory matches §4.1, §4.2 and
      §4.3 line for line
- [ ] Neither page creates an `auth.users` row — checked by opening both in a
      clean browser profile and reading `auth.users` after
- [ ] `Impressum · Datenschutz` sits at the foot of the nav drawer, on every
      screen, one tap from the header
- [ ] The same line is on `/beta` and on the sign-in gate; `beta.privacy` links
      to `/privacy`
- [ ] The documentation site's footer carries both links
- [ ] `privacy.voiceShort` is rewritten in `en.ts` and `de.ts`, and says the
      speech leaves the device
- [ ] The consent card is asked once, inside the app, with refuse as prominent
      as accept, and closing it counts as a refusal
- [ ] **Refusing produces no device storage** — verified by clearing site data,
      refusing, using the app, and finding no `ph_*` key in either store
- [ ] **Accepting produces a replay in which nothing is readable** — verified by
      writing a real reflection, then watching the recording back
- [ ] No analytics request leaves `/beta`, the sign-in gate, `/impressum` or
      `/privacy` — checked in the network tab, not assumed
- [ ] The *Analytics & session replay* switch in the drawer turns it off again,
      and off means off on the next load
- [ ] `profiles.analytics_consent` records the answer, the moment and the policy
      version; the migration is new, and `pnpm test:db` passes after it
- [ ] PostHog is on EU Cloud, with a retention period set deliberately
- [x] **No PostHog event carries content** — done 2026-10-20: the
      `$ai_generation` transcript property is gone, the voice callback no longer
      receives the text, `identify()` passes the id alone, and a grep of
      `posthog.capture(` shows event names and enums only (§4.5.1)
- [ ] A processor agreement is in place with Supabase, Cloudflare, OpenAI **and
      PostHog**, and the transfer basis for each is written down
- [ ] The Art. 30 record of processing exists as an internal document — §4.1 is
      most of it already
- [ ] Verified against a real Cloudflare zone: what, if anything, Cloudflare
      sets in the browser, and that cookie-setting analytics is off
- [ ] `pnpm check` passes (CLAUDE.md rule 8), and both pages are walked at 393px
      in both languages on `pnpm --filter web dev`

---

## 8 · Not in this, and named so it is not lost

- **Art. 9 explicit consent before the first recording.** The strongest legal
  basis for a diary of feelings and a voice stream to a US provider is explicit
  consent, given once, knowingly, with a record of it. The policy can describe
  the processing; it cannot be the consent. **This is the largest remaining gap
  and it should be a PRD of its own, before testers arrive** — most likely one
  checkbox at account creation plus one line at the record button.
- **Terms of service / AGB.** Not legally required. Worth having before money
  or more than twenty people, and it is where the next item lives.
- **A "this is not therapy" disclaimer.** Musie hands somebody an exercise about
  how they feel. That is not a medical device and this document is not claiming
  it is — but the sentence saying so belongs in the product, and it is a
  decision about what Musie *is*, not a legal page. Flagged deliberately.
- **Data export, Art. 15 and Art. 20.** Deleting everything already exists on
  `/diary`; downloading everything does not. Doable by hand at twenty testers,
  which is the same ceiling `docs/MUSIE-SETUP.md` §6 names for password resets.
- **A data protection impact assessment, Art. 35.** Special-category data, but
  not *large scale* at beta size, so the likely answer is a two-page threshold
  note concluding no DPIA is required — written, so the conclusion exists on
  paper. Reassess before any public launch.
- **A data protection officer.** Not required at this size on the headcount
  test; name the fact in the policy rather than leaving the question open.
- **Consumer dispute resolution and withdrawal rights.** The day there is a
  price.
- **Content licensing.** The Epidemic Sound master is a subscription licence and
  the closed beta rests on it (`wrangler.jsonc`); it is a terms question, not a
  privacy one.

---

## 9 · Risks

| Risk | What we do |
|---|---|
| **A reflection reaches PostHog as event data** — this was true in the working tree on 2026-10-20 (§4.5.1) | **Done the same day**, and pushed one level down: the voice package hands the callback no text, so the property cannot be added back at the call site alone. The no-content rule is what stops the next wizard run reintroducing it |
| **A session replay carries somebody's diary** — the sharpest risk in this document, because it is silent, it is retroactive, and by then the recording is on a third party's disk | §4.5's masking is default-deny: every text node masked, the four content surfaces blocked outright, network bodies dropped. Verified by watching a real recording back (§7), never by reading the config |
| Analytics fires before the card is answered | `opt_out_capturing_by_default`, and the stub moves out of `main.tsx`'s top-level import (§4.5). The network-tab check in §7 is what proves it |
| **An Impressum claim arrives before the page does** — strangers bring these, not users, and `musie.org` is about to answer publicly | Land §2.1–§2.4 *with* the domain, not after it. This is the one item with a hard external clock |
| The policy says something the code does not do, or the reverse | §4.1 is read back from the schema and the bundle, and §6 fixes the one line that already drifted. A template filled in from memory is how this goes wrong |
| Somebody speaks into the microphone before the consent in §8 exists | Policy first, consent next, and both before the testers of `RELEASE-CHANNELS.md` §1. If only one can land, land the honest copy of §6 |
| A third-party script arrives and quietly voids §4.4 | The condition is written in §4.4 and belongs in `CLAUDE.md` once this ships, because by then nobody will re-read this file |
| The legal pages end up behind the gate during a refactor | They are in `publicRoute.ts`, which exists for exactly this and explains itself. A test that loads both with no session is cheap and proves it |
| Cloudflare sets a cookie we did not know about and the "no cookies" line becomes false | §7 makes it a verification step against a real zone, not an assumption |
| The German reads like a machine wrote it, on the two pages where trust is the product | A lawyer or a reputable generator supplies the base text; it is then read back against `docs/GERMAN-UI-WRITING.md` like every other string here |

---

## 10 · What only Ben can answer

1. ~~**Is the operator you, personally, or a company?**~~ **Answered
   2026-10-20**: two private individuals — no company, no register entry, no VAT
   ID. §3.1 is filled in from your own edit, and the GbR and joint-controller
   notes beneath it are what the answer raised.
2. ~~**What postal address and what contact route go on it?**~~ **Answered
   2026-10-20**: Strehleranger 7, 81735 München, `bl@musie.org`, plus a phone
   number. Two things to confirm: the spelling of the street as it will be
   printed, and whether you want the mobile number public when the law does not
   ask for it.
3. **Lawyer, generator, or draft-and-review?** Recommendation: a reputable
   generator for the base German text, then read back against this document's
   §4 so the inventory is ours rather than the template's — it is the facts in
   §4.1–§4.3 that a generator cannot know.
4. **Does the banner question go to a lawyer regardless?** §4.4 recommends no
   banner and gives the fallback. If the answer has to come from counsel, it is
   the one question worth paying for, because it is the only one with a visible
   cost to every user.
5. **Does the Art. 9 consent flow (§8) get a PRD this week or next?** It is the
   biggest remaining gap, the testers arrive on a date, and it is a *separate*
   decision from the analytics consent that must not be bundled with it (§4.4).
6. **Is masked replay enough for what you wanted replay for?** §4.5 is explicit
   that you get shapes and timings, not words. If the intent was to read what
   people wrote back, this configuration will disappoint — and the honest fix is
   asking the tester, not recording them.
7. **Does the sign-up funnel need measuring?** §4.6 keeps analytics out of the
   public pages, which is what keeps a banner off them. Changing that means a
   real banner on `/beta` and on `musie.org`.
8. **PostHog or our own database for error reports?** `RELEASE-CHANNELS.md`
   §11.2 chose ours; the PostHog stub turns on exception capture. One of the two
   documents is now wrong, and it should not be settled by whichever ships last.

---

## 11 · Where this comes from

Read back from the repo on 2026-10-20, not remembered:

- `apps/web/src/lib/publicRoute.ts` and `main.tsx` — how a page is served with
  no account, and why that must not rest on a deploy variable
- `apps/web/src/components/BetaSignup.tsx`, `SignInGate.tsx` — the two screens a
  stranger can see, and the layout the legal pages copy
- `apps/web/src/components/NavDrawer.tsx`, `MenuPreferences.tsx`,
  `apps/web/src/shell.css` — the drawer, `.musie-drawer__prefs`, and the
  hairline §5.2 puts the line under
- `apps/web/src/i18n/en.ts` — the privacy block, and the sentence §6 corrects
- `features/voice/src/config.ts`, `supabase/functions/realtime-token/index.ts` —
  the audio path to OpenAI, and the key that does not travel with it
- `supabase/migrations/20260919120000_sessions.sql`,
  `20261006120000_beta_signups.sql` — what a diary and a waiting list actually
  hold
- `apps/web/src/lib/supabase.ts`, `goals.ts`, `deckGuide.ts`, `scan.ts`,
  `questions.ts`, `identity.ts`, `i18n/index.ts`, `apps/web/index.html` — every
  key in §4.3
- `wrangler.jsonc` — Cloudflare, the assets-only Worker, and the exposure
  argument
- `RELEASE-CHANNELS.md` §4 and §11 — `musie.org`, `app.musie.org`, and error
  reports staying in our own database
- `apps/docs/architecture/security.md` — the privacy position as the product
  already states it
- `apps/web/src/lib/markdown.ts`, `components/Markdown.tsx` — what the prose
  renderer can and cannot do, which is why §5.5 writes URLs as text
- `apps/web/src/lib/posthog.ts`, `apps/web/package.json`,
  `apps/web/.env.example` — the PostHog stub as it landed on 2026-10-20, which
  §4.5 replaces
- PostHog's own documentation, read 2026-10-20: `persistence` defaults to
  `localStorage+cookie`; `cookieless_mode` takes `'always'` or `'on_reject'` and
  must also be enabled in the project's settings; **session replay, `identify()`,
  surveys, persistent feature flags and GeoIP are all unavailable in cookieless
  mode**; `maskTextSelector: '*'` masks every text node
- `CLAUDE.md` rules 1, 4, 5, 6, 7, 8 — the component boundary, migrations,
  `<html lang>`, the German, the strings, the gate
