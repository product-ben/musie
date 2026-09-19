# BUILD-PLAN.md

The remaining steps, reshaped against what the repo actually holds on
2026-09-19. **Revised twice later the same day**, after the Method → Exercise
rename, the track re-key and then its split into `tracks` + `exercise_tracks`,
the content re-cut and the drawer iteration — see *Landed after this plan was
first written* below, and the notes inside A.4, A.5, B.2, C.1, C.3, C.5, C.6,
D.5 and E.4.

Supersedes the **Build steps** tab of *Musie: Prototype → Production Build
Plan*. That plan was written before phases 0–2 were built; roughly eighteen of
its forty-one steps are done, several turned out differently from the way they
were specified, and [DOMAIN-MODEL.md](DOMAIN-MODEL.md) has since replaced its
session design. The reasoning on that plan's **Plan** tab still holds and is
not repeated here.

Same shape as before: one step is one Claude Code session, every step ends with
something you can check yourself, steps inside a phase run in order.

---

## What is already done

Not "started" — done, in the working tree, and verified by `pnpm check`.

| Original step | State |
|---|---|
| 0.1 Monorepo skeleton | Done, **minus `CLAUDE.md`, Prettier and tests in `pnpm check`** |
| 0.2 Supabase project | Local stack only. **No hosted project linked** |
| 0.3 Deploy pipeline | Netlify for the app, GitHub Pages for Storybook. **No test step** |
| 1.1 Inventory + move in | Done — see `reference/INVENTORY.md` |
| 1.2 Self-host the fonts | Done, with a documented preload and a 221 KB budget |
| 1.3 Storybook boots | Done |
| 1.4 Global decorators | **Partial** — side-by-side light/dark works; there is no theme toolbar, and the base-ui app-shell setup lives in the app rather than in a decorator |
| 1.5 Foundations pages | Done, and stronger than specified: two verify scripts fail `pnpm check` if a token loses its page |
| 1.6 Reference story + conventions | Done |
| 1.7–1.11 Story batches A–E | Done — 26 components, 258 stories, 118 questions logged |
| 1.12 a11y pass | **Not started** |
| 1.13 Cleanup pass | **Not started** |
| 2.1 App skeleton and routes | Done |
| 2.2 Supabase client and the single user | Done, and better: real anonymous auth per browser, not a hard-coded UUID |
| 2.3 Content schema and seed | Done, and larger: sibling `_i18n` tables, column grants, a `missing_translations` view |
| 2.4 Content fetch layer | Done |
| 2.5 Nav drawer and settings sheet | Done — and the language picker **works**, rather than opening a not-implemented dialog |
| 2.6 The safety net | **Not started.** There are no tests in this repo |
| 2.7 IA and session state | **Not started.** This is the next real piece of product work |

**Done and never planned:** a whole i18n layer — two typed catalogues, a
resolution order tied to `profiles.language`, `<html lang>` tracking the locale,
and content that re-fetches in the new language with no reload. The original
plan had language as a Phase 6 afterthought. It is finished.

**Landed after this plan was first written, on 19 September:**

| Change | What it means for the steps below |
|---|---|
| **Method → Exercise**, everywhere | Schema, seed, routes, catalogues, types. `method` survives as an identifier nowhere in the product |
| **Tracks split in two** | `card_audio` became `tracks` (the recording, stored **once**, opaque `trk-NN` ids) plus `exercise_tracks` (which exercise-and-card reaches it). The same card plays a different file in a different exercise; the same recording used twice is one row and two pairings. `card_id` is nullable — null is an exercise's own track — under `unique nulls not distinct` |
| **The content re-cut** | `listening` and `question` follow the **exercise**, not the card. `card_i18n` keeps only `feeling`. Eighteen per-card strings were dropped; six exercise-level ones are owed |
| **`sessions.track_id`** | The session records what actually played, in every exercise — not only where a track is linked to a session. See DOMAIN-MODEL.md, CHANGED ⑥ |
| **The nav drawer, iterated** | Action-first order, rules rather than gaps, `aria-current` on the page beneath, `/menu` and `/diary` as routes |
| **First change to `packages/design-system`** | `CtaButton` gained `align?: 'center' \| 'start'`, and the app's one geometry override is deleted. The app now overrides the design system nowhere |

---

## Four things the old plan says that are no longer true

Read these before working from the old tabs.

**1 · `Message`, `Badge` and `VoiceNote` were not deleted.** The plan's step 1.1
said three components were being cut. All three are present and exported, and
`Message` could not have been cut — `RadioGroupText`, `RadioGroupImage` and
`RadioCards` each import it for their own `error` prop. So two items on the
to-do tab are already answered: **what replaces `Badge`** (nothing — it is
still there) and **what shows a persistent error** (`Message`, which
`/exercises` already uses for exactly that). One real gap survives: `Message`'s
visually hidden status word is a hardcoded German constant with no prop, so an
English screen reader hears *"Fehler: This content could not be loaded"*. That
is one line of API, folded into B.2.

**2 · The session schema has two incompatible descriptions.** The build-steps
tab says `completed_at` + `ended_reason` (`completed` / `cancelled`).
DOMAIN-MODEL.md says `status` (`started` / `finished` / `abandoned`) +
`started_at` / `ended_at`. They express the same product rule and cannot both
be built. DOMAIN-MODEL.md is newer and is the one used below.

**3 · Voice reflections contradict the plan's own privacy position.** The Plan
tab states it plainly: *"the app never holds a recording of anyone's voice"*,
and *"no `audio_path` column anywhere — its absence is the design"*.
DOMAIN-MODEL.md's `reflections` table has `mode: voice` and a `media_path`.
Those are different products. This is decision D1 and it is bigger than either
document admits — it decides whether Phase F stores anything at all.

**4 · The routes are already half-renamed.** Method → Exercise is done in the
schema, the seed, the catalogues and the routes. `/` is already *About Musie*
and `/about` is already *About you*; they just do not carry the canonical
names yet. C.5 is a rename, not a restructure.

---

## Phase A · Close the gaps

The things phases 0–2 skipped. None of them adds a feature; all of them make
every later step reviewable.

**Localhost only, and that is now a decision rather than a constraint.** The
Netlify build allowance is exhausted until the week of 22 September, so nothing
deploys in this phase. Separately and more usefully: D12 records that every
content change so far has been made by **editing the existing migrations in
place** and re-running `supabase db reset`, which is safe only while no hosted
project is linked. The schema is still moving — `sessions`, `reflections` and
six owed content strings are all ahead. So the deploy waits, both halves of it,
and the freedom to rewrite migrations is kept for as long as it is worth having.

**What that means for every step below:** verify against `supabase start` and
`pnpm --filter web dev`, never against a URL. Do not create a hosted project.
Do not run `supabase link`.

- [ ] **A.1 Commit what exists.** Roughly twenty new files and the whole
  `supabase/` tree are untracked, in one undifferentiated working tree. Split
  into honest commits — shell, auth and profile, i18n, content and the track
  re-cut, overlays, the design-system `align` change, the two planning
  documents. *Done when:* `git status` is clean and `git log` reads as the
  story of phases 0–2. **Sequential, and first:** every step after this one is
  reviewed as a diff against it.

- [ ] **A.2 `CLAUDE.md`.** The guardrail the old 0.1 specified and never
  landed. It must say: the app imports only from `@musie/design-system` and
  never a raw `--sand-*`; every migration that creates a table also enables
  RLS, writes its policies and grants privileges to `authenticated`; never
  disable RLS to make something work; while nothing is deployed, content
  migrations are edited in place and verified with `supabase db reset`;
  `<html lang>` follows the active locale; **a missing German string is
  written, not reported** — see A.4; every user-visible string is passed
  explicitly, because the system's own defaults are a mix of German and
  English; `pnpm check` passes before anything is called done. *Done when:* a
  new session reads it without being told to, and it contradicts nothing in
  the repo.

- [ ] **A.3 A test harness that runs.** Vitest, wired into `pnpm check`. Two
  targets to prove it, both pure and both already written: `translate()`'s
  interpolation and missing-slot behaviour, and `pickTranslation()`'s
  fall-back-and-warn. *Done when:* `pnpm check` runs tests, and deleting the
  English fallback from `lib/content.ts` turns one red.

- [ ] **A.4 Real German, everywhere.** The policy changes: **a missing or
  placeholder German string is written, to a written standard, rather than
  flagged and left.** Three parts:
  1. `docs/GERMAN-UI-WRITING.md` first, so "best practice" is a rule and not a
     mood — du (which `de.ts` already assumes) or Sie, sentence case,
     verb-first for actions, no *Bitte*, the ~30% length budget against
     `--measure-body`, and what to do with a compound that will not break.
  2. `apps/web/src/i18n/de.ts` re-read against it. This copy is **ours and
     permanent**; it was written by an implementer and has never had a native
     read.
  3. All 21 remaining `[DE] ` prefixes out of
     `20260918150600_content_seed.sql`, replaced with real German. This copy is
     **provisional** — the Mindfulness Cards spreadsheet will overwrite it — so
     the seed carries a comment saying so, which is the signal the `[DE] `
     prefix used to carry and must not simply be lost.

  **Do not touch `tracks`.** A title and an artist name are not translated,
  which is why that table has no `_i18n` sibling. `Morgenlicht` stays
  `Morgenlicht`.

  The runtime English fallback in `pickTranslation()` **stays**. It is a safety
  net that should now never fire; A.5 is what proves it does not. *Done when:*
  `select * from public.missing_translations` returns zero rows, no `[DE] `
  survives anywhere, and you have read the German.

- [ ] **A.5 The security and parity safety net.** The old 2.6, retro-fitted, on
  A.3's harness. Row-level isolation between two anonymous users; content
  tables refusing a write; EN/DE key parity; `missing_translations` empty and
  no `[DE] ` prefix in the seed.

  **The track protection is now two mechanisms, and both need a test.** The
  split moved the grant and added a second line of defence:
  1. The column grant on `tracks` — `id, src, duration_seconds, licence_ref`
     only. Test `?select=title`, `select=*`, filtering by it and aliasing it;
     all four must fail. `exercise_tracks` is granted whole and needs no column
     grant, because it holds only ids.
  2. **The opaque ids are part of the security model, not a naming
     preference.** `exercise_tracks.track_id` *is* readable by the client, so
     `morgenlicht` as an id would hand over the answer the grant withholds.
     Assert every `tracks.id` matches `^trk-\d+$` and shares no word with its
     own title — otherwise the next person to seed a track undoes this without
     noticing.

  Tests the security model, not the code — a migration in session thirty can
  silently undo a policy written in session eight, and reading diffs will not
  catch it. *Done when:* deliberately dropping a policy turns a test red, and
  you have watched it happen.

- [ ] **A.6 Deploy, the week of 22 September.** Not now. When the build
  allowance returns and the schema has stopped moving — realistically after
  C.3 — create the hosted project, `supabase link`, push the migrations, put
  the URL and anon key into Netlify. From that day, migrations stack rather
  than being rewritten. *Done when:* the Netlify URL signs a visitor in
  anonymously and lists three exercises from the hosted database, and a
  deliberately broken type blocks the deploy.

### What can run in parallel

A.1 lands first and alone. A.2, A.3 and A.4 then write to **disjoint files**,
which is the whole test of whether parallel is safe:

| Step | Writes to |
|---|---|
| A.2 | `CLAUDE.md` |
| A.3 | root + `apps/web` `package.json`, a Vitest config, `*.test.ts` |
| A.4 | `docs/GERMAN-UI-WRITING.md`, `i18n/de.ts`, the seed migration |

A.5 waits for both A.3 (it needs the harness) and A.4 (it asserts A.4's
result). Review each agent's diff separately even when all three land together —
batching only buys you anything if you keep reviewing in batches.

One honest caveat, and it is the old plan's own: **parallel agents cost more
tokens, not fewer**, because each re-orients from scratch. Here the files are
small and the saving is wall-clock, not spend.

**Checkpoint.** Break a type on purpose and confirm `pnpm check` stops it
locally. This is the safety net for every step after.

---

## Phase B · Decide, then finish the design system

The two Phase 1 steps that were deliberately left for you, plus the decisions
that block them.

- [x] **B.1 The four decisions.** ANSWERED 2026-09-19 — written up in
  `packages/design-system/stories/OPEN-QUESTIONS.md`, "Phase B.1 — the four
  decisions, answered". In short: the accents become `--interactive-accent`
  plus a second, warning-safe accent still to be named, renamed in Layer 1 and
  re-signed; `ProcessVisualisation` is retired and Carousel is built in B.2;
  component defaults become English; G3 is
  `--interactive-ghost-border-hover`.

  <details><summary>The original four questions</summary>

  **B.1 The four decisions.** No code — a conversation, then a written
  answer per item:
  - **What are `accent-placeholder1` and `accent-placeholder2` for?** Every
    accent prop in the system carries the literal word *placeholder*, and it is
    in the public API. A find-and-replace across dozens of call sites today;
    hundreds after Phase D.
  - **`ProcessVisualisation` — retired or shipped?** The CSS section says
    RETIRED, the export and the docs say live. Decide with it: the ~200 lines
    of Carousel CSS with no component behind them, which D.1 needs.
  - **German or English component defaults?** Currently half each.
  - **Gap G3's name** — `--border-strong-hover`, or
    `--interactive-ghost-border-hover` inside the existing family.

  </details>

- [ ] **B.2 Apply them, plus the API holes that remain.** One of the three is
  already closed: `CtaButton` now takes `align`, and the app's
  `justify-content` override is gone. The renames, the
  Carousel resolution, one language for the defaults, `--border-strong-hover`
  replacing both raw `--sand-8` references, and a `statusWord?: string` prop on
  `Message` so its screen-reader word follows the locale. *Done when:* a grep
  for `--sand-`, `--terracotta-`, `--ocher-` and `--purple-` in component CSS
  returns nothing, `accent-placeholder` appears nowhere, and the app passes
  `t('status.error')` to `Message`.

- [ ] **B.3 The accessibility pass.** The old 1.12. `@storybook/addon-a11y`,
  then one "all states" story per interactive component on the `data-force`
  harness — remembering it goes on the base-ui part, not the wrapper. *Done
  when:* axe is clean on every story in both themes. Give this its own session:
  it audits but cannot fix, and every fix lands in component CSS.

**Checkpoint.** Walk Storybook like a design review. This is the last moment
where fixing a component is cheap.

---

## Phase C · The session spine

The real next work, and where DOMAIN-MODEL.md lands. The flow now ends in the
Diary, so the Diary is on the critical path rather than a final phase.

- [ ] **C.1 Answer the open decisions.** No code. The set has grown to twelve
  and two are already answered and built:

  - **Resolved.** D8 — a cardless exercise's track is a pairing row with a
    null `card_id`. D9 — the listening instruction and the question follow the
    **exercise**, which turned a re-key into a re-cut of the content model.

    > **D8's text in DOMAIN-MODEL.md no longer describes the schema.** It says
    > "`tracks.card_id` is nullable" and "the two-table alternative was
    > rejected"; `tracks` now has no `card_id`, and there are two tables. The
    > *decision* survives intact — one pairing row per (exercise, card), null
    > for a cardless exercise, `nulls not distinct` — but CHANGED ⑦ split the
    > table for a different reason (a recording is licensed once) than the one
    > D8 rejected. Worth rewriting before anyone builds from it.
  - **Blocks the migration outright.** D1 — whether reflections are stored at
    all, and whether voice is among them.
  - **One column or one screen each.** D2, D5, D6, D7, D10.
  - **Cheaper than they were.** D3 and D4 — a second listening instruction and
    a second question used to mean eighteen more strings on the card; after the
    re-cut they are six on the exercise.
  - **New, and worth settling before C.3.** D11 — how a track is chosen when it
    is not looked up, because "at random" needs a repeat rule and that rule
    reads the diary. D12 — the migrations are being *rewritten* in place rather
    than stacked, which is only safe while nothing is deployed; A.5 ends that.

  See [DOMAIN-MODEL.md](DOMAIN-MODEL.md).

- [ ] **C.2 The privacy copy.** Moved forward from the old 6.1, because the
  moment a reflection is stored and shown, *"Nothing leaves your device until
  you share it"* is false — and with the Share step gone there is no longer a
  sharing step to qualify it. Write what is true, in both languages. *Done
  when:* you and your co-founder have signed off the strings, and they are in
  `en.ts` and `de.ts`. Nothing else in this phase starts first.

- [ ] **C.3 The sessions and reflections migration.** `sessions` with
  `status`, `step`, `started_at`, `ended_at`, nullable `card_id`,
  `situation_id` **and `track_id`**; the partial unique index that allows one
  `started` row per user; `reflections` with its exactly-one-of check; RLS,
  policies and grants on both; `on delete cascade` throughout.

  `track_id` records what actually played rather than deriving it from the
  pair — so a later content edit cannot rewrite what a diary entry claims you
  heard, and resuming cannot re-roll the music. It points at **`tracks`, the
  recording** — not at `exercise_tracks`, the pairing. "What did I listen to"
  is answered by the recording.

  > **`track_id` is `text`, not `uuid`.** DOMAIN-MODEL.md's session table still
  > types it `uuid`, which was right while a track id was
  > `gen_random_uuid()`. Since the split, `tracks.id` is `text` (`trk-01`) and
  > only `exercise_tracks.id` is a uuid. Written as `uuid` this migration will
  > not apply. Fix the document or fix it here, but notice it before you run
  > it.

  **A.6 changes the cost of this step.** Before a hosted project exists, a
  field added tomorrow is a rewrite of this migration; after, it is an
  `alter table` against live rows. If more fields are still arriving (D12),
  this step is cheaper now than it will ever be again — which is an argument
  for doing it *before* the deploy, not after.

  *Done when:* a second `started` session is refused **by the database**,
  deleting a session removes its reflection in one statement, and a second
  anonymous user sees neither.

- [ ] **C.4 The session state machine — no UI.** A `useReducer` and pure
  functions: the four steps, the completed-steps list, the back stack, finish
  and cancel. Not twenty `useState` calls, which is the default if nobody says
  otherwise. *Done when:* unit tests cover forward, back, resume, finish and
  cancel, and they pass.

- [ ] **C.5 The canonical route paths.** Smaller than it was: the *titles* are
  already canonical — `/` is About Musie, `/about` is About you, `/diary` is
  Your diary, `/session/:id/:step` is Current session — and `/exercises`,
  `/diary`, `/menu` and `/settings` all exist. What remains is the **paths**:
  `/about` → `/about-you`, and deciding whether `/` stays About Musie or
  redirects to `/about-musie`. `/done` is still there and still unreachable;
  delete it when D.5 routes finishing into the Diary instead. *Done when:*
  every URL loads directly, browser back works through the set, and no route
  name exists in two spellings.

- [ ] **C.6 The active session, in the navigation.** Mostly built already: the
  drawer chooses between *Start a session* and *Continue session* from a single
  `activeSession` value, and exactly one of the two is ever in the list. What
  is missing is one query — replace `readActiveSession()`'s honest `null` in
  `lib/session.ts` with the real read. The drawer switches
  *Start session* ⇄ *Continue session*; cancel is offered both there and inside
  the session screen, because with one session open the drawer offers no other
  exit. *Done when:* creating a session hides *Start session* everywhere,
  *Continue session* returns to the exact step you left, and cancelling brings
  *Start session* back.

- [ ] **C.7 The Diary, minimally.** `/diary` listing the user's non-running
  sessions newest first, and `/diary/:id` showing one — because the flow ends
  there and a happy path that ends on a blank page is not a happy path. A
  cancelled session appears like any other, marked unfinished. *Done when:* a
  finished session and a cancelled one both read back correctly, and the empty
  state reads well.

**Checkpoint.** Create a session, leave it, come back through *Continue
session*, cancel it, and find it in the Diary. The whole spine, with no
content in it yet.

---

## Phase D · The flow, screen by screen

Old Phase 3. For each screen: open the prototype's markup, find the components
in `reference/design_system/docs/09-clickdummy-handoff.md`'s map, write the
React screen, delete the markup, compare in a browser. Ask for the component
list it used at the end of each one — a name that is not in the design system
means something was invented.

- [ ] **D.1 About Musie.** The chat cadence, the five-slide carousel, the CTA
  that stays locked until the last slide has been seen. Needs B.1's Carousel
  answer: there is CSS and no component. *Done when:* it matches the prototype,
  and a returning visitor skips it.

- [ ] **D.2 About you.** The four user types from the database, the
  not-implemented lightbox for the three unbuilt ones. *Done when:* picking the
  built one writes `profiles.user_type_id` and advances.

- [ ] **D.3 Exercises.** `RadioCards`, the fact chips with tooltips, the
  legend, "Surprise me", and the detail lightbox bound to database rows rather
  than fixed copy. *Done when:* the lightbox shows the row, in the active
  locale.

- [ ] **D.4 Wizard chrome.** The four-step rail, the session context column,
  the panel, and a route per step. *Done when:* you can reload on
  `/session/:id/reflect` and land in the right place.

- [ ] **D.5 Intro, Scan (simulated) and Reflect.** Text and photo modes only;
  voice is Phase F.

  **Blocked on copy, not code.** The listen step reads
  `exercise_i18n.listening` and the reflect step reads `.question`, and both
  are **null for all three exercises** — the re-cut moved them from the card to
  the exercise and the source has no exercise-level version. Six strings, from
  the spreadsheet. Sessions and reflections persist; finishing routes into
  that session's Diary entry, carrying the acknowledgement the prototype's end
  screen used to hold. *Done when:* a full run leaves a complete `sessions` row
  and a `reflections` row, and lands you in the Diary entry with no end screen
  in between.

- [ ] **D.6 One end-to-end test.** A single Playwright walk of a whole session
  that then asserts the rows landed in Postgres. Run twice, once per locale —
  the German run is what catches strings hardcoded in a hurry. One test, not a
  suite. *Done when:* deleting a line from the reducer makes it fail.

**Checkpoint.** The big one. Run the whole flow on your phone, in both themes,
in both languages, next to the prototype.

---

## Phase E · Scan and listen

Unchanged from the original Phase 4. Two independent halves: scanning needs
nothing from anyone, listening needs nine cleared tracks.

- [ ] **E.1 Manual code entry.** A `Field` that takes `MC-01` and loads the
  card. Before the camera, not after. *Done when:* typing a code advances to
  Listen and the simulate button is gone.
- [ ] **E.2 Camera scanning.** `getUserMedia` + `BarcodeDetector`, with
  permission-denied, no-camera and no-HTTPS states all falling back to E.1.
- [ ] **E.3 Safari fallback.** A wasm decoder where `BarcodeDetector` is
  missing. *Done when:* it scans on iPhone Safari.
- [ ] **E.4 Audio storage and playback.** Tracks into a Supabase bucket, the
  transport on signed URLs, the simulated clock kept for missing files.
  Remember there are two tables: `tracks` is the recording and
  `exercise_tracks` is when it plays. Upload one file per `tracks` row, not
  per pairing. The licensing ask is **up to eleven** recordings — nine for the
  deck plus one each for Breathing Score and Body Scan Soundwalk — and fewer
  if any recording is shared between exercises, which the split now allows.
  `select count(*) from tracks` is the number to quote.
- [ ] **E.5 The reveal gate.** The `reveal-track` Edge Function and the
  three-scroll Listen step. *Done when:* the Network tab shows no title or
  artist until you scroll to the reveal.

---

## Phase F · Voice

Old Phase 5, with one addition: **the voice POC is not in this repository.** It
lives in `product-ben/musie-voice-to-text-demo`, and nothing here references it
except a source-notes document. Bringing it in is a step, not an assumption.

Before F.1: add a payment method to the OpenAI account. The free tier allows
three requests a minute; this feature needs far more, and it fails in a way
that looks exactly like a bug.

- [ ] **F.0 Bring the POC into the monorepo.** `features/voice/`, imports
  repointed at `@musie/design-system`, the private `MusieToast` deleted in
  favour of the real one, the demo scaffolding left behind. *Done when:*
  `pnpm check` passes with it in and nothing imports a relative path into
  `packages/`.
- [ ] **F.1 The token function.** `realtime-token` Edge Function, the OpenAI key
  as a Supabase secret. *Done when:* a `curl` returns a token and the real key
  appears nowhere in the browser bundle.
- [ ] **F.2 Wire the core to tokens.** The only edit: `connectRealtime` takes a
  token, not an API key. *Done when:* you speak and words appear, with no key
  field anywhere.
- [ ] **F.3 Tests for the two pure files.** `segmentation.ts` and
  `transcript/fillers.ts` — German abbreviations, the `um`/`äh` split, the
  whole-statement-was-hesitation case.
- [ ] **F.4 The editor UI.** `MusieTranscriptWorkspace` and
  `MusieStatementCard`, on the real `Toast` and `DraggableList`.
- [ ] **F.5 Keyboard parity.** Restore what the Musie card lost against the lab
  version: lift-and-move, merge-with-previous, the `aria-live` announcements.
  *Done when:* you can reorder and merge without a mouse.
- [ ] **F.6 Persist the statements.** `onSentenceFinal` becomes the Supabase
  write. It fires on four paths, so it must be idempotent. *Done when:* editing
  a statement updates its row rather than inserting a second.

**Checkpoint.** Record a real reflection on an iPhone. iOS is the untested
surface: nothing documents `AudioContext` under Safari, background tabs or the
user-gesture requirement. Budget a session for surprises.

---

## Phase G · The Diary, finished

Reduced, because C.7 already built the part the flow depends on.

- [ ] **G.1 The timeline at a month's scale.** Grouping, filtering, and an
  empty state that reads well after thirty sessions rather than on day one.
- [ ] **G.2 Deletion.** One session, and everything, both with confirmation.
  The cascade does the work. *Done when:* deleting leaves no orphaned rows and
  no orphaned files in storage.

**Checkpoint.** Read the privacy copy from C.2 next to what the app actually
does, line by line. If a sentence is doing work the code does not, fix the
code rather than softening the sentence.

---

## Size

Thirty-four steps, against the original plan's forty-one with eighteen already
banked — and three of those thirty-four have shrunk since this was written:
C.5 is now paths only, C.6 is one query, and B.2 lost one of its three API
holes. The expensive, easy-to-get-wrong part — the design system and its
Storybook — is behind you, which is the half of the original plan most likely
to have been skipped and regretted.

Phases E and F do not depend on each other. If the music licensing stalls, run
F first.

## Still blocked by someone other than Claude Code

| Blocker | Blocks |
|---|---|
| Up to **eleven** recordings cleared for commercial use — nine for the deck, plus one each for Breathing Score and Body Scan Soundwalk. Fewer if any is shared; `count(*) from tracks` is the number | E.4, E.5 |
| Which vision model reads handwriting — or ship photo as session-only | D.5 |
| The privacy copy, with your co-founder | C.2, and everything after it |
| The real Mindfulness Cards spreadsheet | The content is placeholder until it lands; all German content rows are `[DE] `-prefixed. **The re-cut also left six strings with no source at all** — `listening` and `question` per exercise, in both locales — which D.5 needs |
| The four user-type artworks | D.2 uses `RadioGroupImage` properly only once they exist |
| D1 in DOMAIN-MODEL.md, and ideally D11 | C.3 |
