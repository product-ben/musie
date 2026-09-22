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

- [ ] **A.6 The first deploy — TWO HALVES, and they are independent.** Begun
  2026-09-21, after Phase D rather than in Phase A: the point of deploying is
  to find where hosted Postgres disagrees with the local stack, and that is
  worth doing once there are real screens to disagree about.

  **Half 1 — the hosted database. No build minutes, so it went first.** Create
  the project, `supabase link`, `supabase db push`, point `.env.local` at it
  and run everything against it from `pnpm dev`. This is where the bugs are,
  because the local stack is *more permissive* than hosted: it ships
  `alter default privileges … grant all on tables`, so a table with a missing
  `grant` works locally and 403s hosted — which reads exactly like broken RLS.

  - [x] Project created, `project-musie` / `xliwtiiopwyfunxkdmxh`, Frankfurt,
        with *Automatically expose new tables* **off** (which is what makes the
        explicit grants a real test) and *automatic RLS* **off** (the
        migrations enable it themselves, and a hosted-only trigger would be a
        new divergence on the day we came to remove divergences).
  - [x] All 8 migrations pushed; `migration list` shows both columns matching.
  - [ ] **Divergence 1, found before the app was even opened:** anonymous
        sign-ins are a *dashboard* setting hosted, and `config.toml`'s
        `enable_anonymous_sign_ins = true` governs only the local stack.
        `POST /auth/v1/signup` returned `anonymous_provider_disabled`.
  - [ ] `db.support.ts` taught to point anywhere — it currently reads its keys
        from `supabase status`, which only ever describes the local stack.
  - [ ] `pnpm test:db` and `pnpm test:e2e`, green against hosted.
  - [ ] Security and Performance Advisors read on the new project.

  **Half 2 — Netlify and a domain.** When the build allowance returns. It
  tests different things: the SPA redirect on deep links, theme and `lang`
  landing before first paint on a cold CDN load, the font preload paths in a
  production build, and the flow on a phone over mobile data. *Done when:* the
  app is live on its own domain, signs a visitor in, lists three exercises
  from the hosted database, and a deliberately broken type blocks the deploy.

  **From the moment of `db push`, migrations stack.** The content schema is no
  longer editable in place; every change is its own `alter table`.

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
  Carousel resolution, ~~one language for the defaults~~ (**done differently in
  C.10 — a locale catalogue, which is a better answer than picking a
  language**), `--border-strong-hover`
  replacing both raw `--sand-8` references, and ~~a `statusWord?: string` prop on
  `Message`~~ — **C.10 added that prop, and the same one on `Badge`.** *Done when:* a grep
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

## Phase C · The session spine — DONE 2026-09-19

The spine is built and the schema has stopped moving. `pnpm check` is green
(59 unit tests), `pnpm test:db` is green (61 tests across 4 files), and the
whole spine was walked end to end against the local stack.

**The phase grew by two steps and shrank by one.** C.1 was answered in
conversation rather than costing a session; C.0 and C.9/C.10 appeared because
two of Ben's answers turned out to be schema and design-system work rather
than screen work.

- [x] **C.1 Answer the open decisions.** Done in conversation, no code. Nine of
  twelve answered, three still open (D11 deferred, plus two NEW ones the work
  surfaced — D13, what a photo answer is FOR if it is never kept, and D14,
  whether a cardless exercise shows three steps or four). All of it is written
  up in [DOMAIN-MODEL.md](DOMAIN-MODEL.md)'s Resolved section, which was also
  **corrected in four places where it no longer described the schema**.

- [x] **C.0 The exercise copy re-cut.** NEW, and it came out of D3/D4's answer:
  each of the four steps carries 1–3 sentences as a bullet list, and there is
  ONE question shown on both the listen and the reflect step. So
  `exercise_i18n` lost `guideline` and `listening` and gained `intro_text`,
  `scan_text`, `listen_text` and `reflect_text` as `text[]`, edited in place
  per rule 4. **The owed-string count went from 6 to 28**, which was the known
  cost of that answer.

- [x] **C.2 The privacy copy.** Written, in both languages, as
  `privacy.*` in `en.ts` and `de.ts`. It is smaller than it was because only
  text is ever stored, and every sentence is true of the code today AND after
  voice lands. **Still needs your and your co-founder's sign-off** — that is
  the one part of this step nobody but you can do.

- [x] **C.3 The sessions and reflections migration.** Both tables, eight
  policies, the partial unique index, and a `check ((status = 'started') =
  (ended_at is null))` that no document proposed. `track_id` is `text`.
  `reflections` has no `media_path` and `mode` has two values, not three.

- [x] **C.4 The session state machine — no UI.** Pure reducer, 41 tests.
  `FINISH` is refused anywhere but the last step, so a session cannot sit in
  the Diary claiming a reflection that never happened.

- [x] **C.5 The canonical route paths.** `/about` → `/about-you`, with the
  catalogue keys renamed to match so no route name exists in two spellings.
  `/` stays *About Musie*. `/done` is still there — D.5 deletes it.

- [x] **C.6 The active session, in the navigation.** The honest `null` is a
  real query. The drawer's action row now has THREE states: a pending or
  failed read means *we do not know*, and the row renders busy and disabled
  rather than offering to start a second session.

- [x] **C.7 The Diary, minimally.** `/diary` groups by day with `Timeline` +
  `LinkList`; `/diary/:id` shows one. An abandoned session appears in the list
  marked unfinished, and says which step it stopped at.

- [x] **C.9 `LinkList` and `Timeline`.** NEW. An inventory found the design
  system had no navigable list-item and nothing that groups by date, so the
  Diary would have been a custom pattern. Built basic and measured — rows are
  exactly 44px, Timeline's 32/16 gap ladder passes L2's doubling check exactly.
  G.1 does the visual detail.

- [x] **C.10 The system's own words, as a locale layer.** NEW. `Badge` and
  `Message` hardcoded `Hinweis`/`Fehler` with NO PROP, and `DraggableList`
  hardcoded `Save`/`Discard`/`Edit`/`Delete` the same way — no discipline in
  `apps/web` could reach them. Now a `MusyLocaleProvider` + catalogue across 19
  components, with per-call props still winning. **This supersedes B.2's "one
  language for the defaults"**, which was the weaker answer to the same
  question. It also extracted the wizard's reachability rule so the rail and
  the reducer share one implementation instead of two.

**Checkpoint — walked, 2026-09-19.** Start a session, leave it at the listen
step, come back to the exact step, be refused a second one by the database,
cancel it, find it in the Diary marked unfinished, then a finished session with
its answer reading back and its reflection cascading on delete. 17 assertions,
all passing. Driven at the data layer rather than through the UI, because the
screens that create a session are Phase D.

**What Phase D inherits.** The spine works and has nothing in it: no exercise
says what to do at any step (28 strings owed), no track plays, and nothing
creates a session except a script. See [MOCKUPS.md](MOCKUPS.md).


## Phase D · The flow, screen by screen — DONE 2026-09-20

Every screen in the flow is built and all three suites are green: `pnpm check`
(89 unit tests, twenty of them new), `pnpm test:db` (64) and the new
`pnpm test:e2e` — one Playwright walk of a whole session, run once per locale,
asserting the rows it left in Postgres. Both bundles build.

**The phase grew one step and split another.** D.0 appeared because three of
the five screens were blocked on design-system work that B.1 had already
assigned to B.2 and that B.2 had not done. D.5 split in three because it
omitted Listen, which is the largest screen in the prototype.

**Four things in this section's original text turned out to be wrong about the
repo**, and each is written up in `apps/web/OPEN-QUESTIONS.md` rather than
quietly worked around: D.1 was blocked on unbuilt code rather than on a
decision; D.3's fact chips could not be built from the app at all; D.5's "six
strings" was stale by a whole re-cut (it is 28); and the prototype's end screen
carried a Share step that C.2 cut.

- [x] **D.0 Finish B.2.** NEW, and Phase D's entry ticket. **Carousel** built
  (~200 lines of CSS had no component; not one line of CSS was written for it),
  **`RadioCards.facts` and `glyphLegend`** added (same story — the stylesheet
  and §7.13's anatomy were complete, the React API was absent), the wizard's
  **fifth `skipped` state** (D14 — a dash, not a second grey, so it survives
  greyscale), and **G3** (`--interactive-ghost-border-hover`), which retires the
  last two raw scale tokens in component CSS. `ProcessVisualisation` is deleted.
  *Done:* `grep -nE '\-\-(sand|terracotta|ocher|purple)-[0-9]'` on
  `musy-components.css` returns nothing.

- [x] **D.1 About Musie.** The chat cadence (greeting at 1s, typing dots, the
  carousel at 4s, replayed on every arrival rather than only on first load),
  the five-slide carousel, and the CTA locked until the last slide has been
  SEEN — `seenMax` is monotonic, so scrolling back does not re-lock it. A
  returning visitor skips it, and "returning" is `profiles.user_type_id`,
  which is the column the drawer already forks on.

- [x] **D.2 About you.** The four user types from the database, writing
  `profiles.user_type_id` on the pick rather than on Continue, so the choice
  survives whether or not anyone presses it. The three unbuilt types open a
  not-implemented lightbox **here** and are accepted **in /settings** — Ben's
  decision, commented in both files. Still `RadioGroupText`: the artwork is the
  one part of this step still waiting on somebody.

- [x] **D.3 Exercises.** `RadioCards` with the fact chips and the glyph legend
  D.0 built, "Let Musie pick an exercise" (among the IMPLEMENTED ones — the
  prototype picked among all three and opened the not-implemented lightbox two
  times in three), and the detail lightbox bound to database rows. The
  Guideline row is gone: `guideline` became `scan_text`, which is the scan
  step's own copy, and showing it here would put the same sentence on screen
  twice in one session. This screen performs the first write, and handles the
  `23505` the one-running-session index raises as an offer rather than an error.

- [x] **D.4 Wizard chrome.** The four-step rail with `scan` visibly skipped for
  a cardless exercise, the session context box, a route per step, and the seam
  between three sources of truth: **the URL says which step is on screen, the
  reducer says which are allowed, the row is what survives a closed tab.**
  Reconciled in one effect and one direction. `completed` is DERIVED from
  `step` rather than stored — `sessions` has no column for it — and the first
  version of that derivation had a real off-by-one that a unit test caught.
  Closing is reachable from inside the panel, which the unique index makes
  mandatory.

- [x] **D.5a Intro and Scan.** The instruction copy, the dashed QR viewport,
  and the simulated scan as a `Message variant="info"` carrying its own
  control. The READ is simulated; the WRITE is real — one update setting
  `card_id` and `track_id` together, because they are decided by one act.

- [x] **D.5b Listen — the stage only.** Copy, the question, `TrackButton`, the
  90-second gate and the CTA handover. The prototype's other two viewports —
  the "do not get influenced by the track name" interstitial and the details
  view — are **E.5**, because reaching the third one IS the reveal, and the
  reveal is what `reveal-track` exists to gate. Nothing here has to be undone
  when they arrive.

- [x] **D.5c Reflect and finish.** Three modes, and only text can complete the
  step: voice and photo write nothing and say so on screen. Declining is an
  answer and finishes the session (Ben, 2026-09-19) — no `reflections` row,
  `status = 'finished'`. The reflection is written BEFORE the status, so a
  failed answer leaves a retryable session rather than a finished one claiming
  a reflection that was never stored. Finishing lands in that session's diary
  entry; `/done` is deleted.

- [x] **D.6 One end-to-end test.** `apps/web/e2e/session.spec.ts` — one
  Playwright walk of a whole session that then asserts the rows in Postgres,
  run twice, once per locale. Beside `test:db` rather than inside `pnpm check`,
  for the same reason: CI has no Supabase and a suite that silently skips is
  worse than no suite. **It has never been executed** — see the checkpoint.

**Checkpoint — walked by machine, not yet by hand.**

`pnpm test:e2e` drives the whole flow twice and then reads the rows back: a
`finished` session with a real `card_id` and `track_id` paired correctly
(mc-08 → trk-08), `ended_at` set, and the reflection stored with the right
body in the right language.

**It found two real defects that nothing else did**, which is the argument for
having written it:

1. **The listen step was a dead end.** With no audio file — the product's
   actual state until E.4 — `play()` rejects, and the element fires `pause` on
   its way down AFTER the step has decided to simulate. The handler read a
   stale `false`, set `playing` back, and the interval never started: the
   transport flipped to playing and instantly back, and the gate could never
   open. Fixed by mirroring the flag on a ref and unmounting the dead element.
2. **The reconciliation refused every forward move** — see D.4.

Neither was visible to `tsc`, to lint, or to 89 unit tests.

**Still to do by hand, and it is the part a machine cannot do:** run the whole
flow on your phone, in both themes, in both languages, next to the prototype.
That is what this checkpoint was always for, and it is the only thing left in
Phase D.

## Running E and F in parallel

**Added 2026-09-21.** This plan's own rule is *one step is one Claude Code
session, and steps inside a phase run in order*. E and F are where that stops
being the fastest reading of it: the plan already says they do not depend on
each other. What follows is the only split that survives what they SHARE.

**Two tracks, each in its own git worktree off `main`. Not more than two.**

| | Track A | Track B |
|---|---|---|
| Steps | **E.0 + E.1** — payload, generator, dev sheet, `/s/:code`, manual entry | **F.0 + F.3** — the voice POC into `features/voice/`, tests for the two pure files |
| Touches the database | no | no |
| Blocked by anyone | no | no |
| Owns | `SessionScan.tsx`, `Session.tsx`, `content.ts`, i18n under `session.scan.*` | `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `packages/design-system` |

Both are deliberately **database-free**, which is not a coincidence — it is
the constraint that picked them.

### What they share, and the rule for each

1. **One local Supabase stack, on fixed ports.** Two agents running
   `supabase db reset` or `pnpm test:db` at once corrupt each other's runs, and
   the failure looks like a flaky test rather than a collision. *Rule: nothing
   under `supabase/` goes in a parallel track. E.4 and E.5 run serially,
   afterwards, in the main session.*
2. **`pnpm-lock.yaml`.** Both tracks want a dependency — a QR library, the
   POC's. A lockfile conflict across worktrees is the worst merge available
   here. *Rule: Track B owns the lockfile. Track A asks before adding anything,
   and E.3's wasm decoder is deliberately not in Track A for this reason.*
3. **`apps/web/src/i18n/{en,de}.ts`.** Both add keys, to one file each, in both
   languages. Mergeable only if they append in different places. *Rule: Track A
   writes under `session.scan.*` and `scan.*`; Track B under `voice.*`. Neither
   reorders existing keys.*
4. **Migration timestamps.** Rule 4 makes these a shared namespace, and two
   agents both reaching for `20260922…` is a drift bug that passes every check.
   *Rule: only the main session writes migrations.*
5. **`pnpm check` needs its own `pnpm install` per worktree**, which is not
   free. *Rule: budget it once per track, at the start.*

### What is NOT parallelised, and why

**E.2, E.3 and the whole of the audio half stay serial.** E.2 and E.3 are
sequential by construction — the wasm fallback is a fallback *to* something —
and both end in a hand test on a real iPhone, which no agent can close.
**E.4 and E.5 own the Supabase stack**, per rule 1. **F.1 and F.2 are blocked**
on the OpenAI payment method, and F.4–F.6 follow F.0 rather than run beside it.

The honest expected gain is **one session of wall-clock**, not four. The value
is that the two things with no blockers and no shared state get done at once;
everything else in E and F has a real reason to be in order.

## Phase E · Scan and listen

**Revised 2026-09-21.** The old header read *"scanning needs nothing from
anyone, listening needs nine cleared tracks"*, and both halves of that turned
out to be wrong. Scanning needs a decision nobody had made — what the QR code
on the paper card actually **says** — and listening has four recordings, which
is neither nine nor none.

Two independent halves still. **E.0 is new, and is this phase's entry ticket.**

- [x] **E.0 The QR payload, the codes, and the deep link.** NEW. E.1, E.2 and
  E.3 all decode something, and nothing in this repo ever said what. `cards.code`
  is `MC-01`, and `20260918150500_content_schema.sql` calls it *"the code
  printed on the paper card, beside its QR code"* — so the QR is a **print
  artifact**, and the repo has never held one: no generator, no decoder, no
  library, no mention outside that comment.

  **The deck is not printed yet (Ben, 2026-09-21), so the payload is ours to
  choose — and the choice has a tail.** A QR carrying a URL,
  `https://<domain>/s/MC-01`, deep-links from the phone's own camera app, so
  the common way in never opens the in-app scanner at all. That demotes E.2 and
  E.3 from *the* way in to *a* way in, and it needs a route this app does not
  have. A QR carrying the bare code cannot ever do that. Once the deck is
  printed the decision is unreprintable, which is why this is E.0 and not E.4.

  **BUILT WITHOUT A DOMAIN, AND TESTED WITHOUT ONE** (Ben, 2026-09-21 — there
  is no domain yet). This is a constraint that improves the design rather than
  bending it, because the domain turns out to matter in exactly one place:

  - **The decoder never needs it.** It takes whatever was scanned and extracts
    the code — last path segment for a URL, the whole string for a bare code —
    then validates the shape. `https://anything/s/MC-01` and `MC-01` both yield
    `MC-01`, so no host is ever compared and a decoder test needs no network.
  - **The route never needs it.** `/s/:code` is same-origin, so it resolves on
    `localhost:5173`, on a Netlify preview, and on the real domain, unchanged.
  - **Only the PRINTED code needs it**, and that is the one artefact nobody can
    make yet anyway.

  So the generator takes a base URL rather than containing one, defaulting to
  `window.location.origin`. The dev-only QR sheet then **generates its codes
  from whatever origin it was loaded from** — open it on the laptop, scan it
  with the phone against the LAN dev server, and it works, with no domain and
  no configuration. Print day is one run of the same script with `--base-url`.

  Three deliverables. The `/s/:code` route. The generator, committed as a
  script rather than nine pasted files. And the dev-only sheet, because E.2 and
  E.3 cannot be developed or hand-tested without something to point a camera
  at. All three ways in — deep link, camera, typed code — converge on
  `getCardByCode()`, which `apps/web/src/lib/content.ts` already has and
  nothing yet calls.

  *Done when:* `pnpm test:e2e` walks `/s/MC-01` into a session carrying that
  card, on localhost, with no domain configured anywhere; the decoder's unit
  tests cover both payload forms and a malformed one; and scanning the dev
  sheet with the iPhone camera opens the right card by hand.

- [x] **E.1 Manual code entry.** A `Field` that takes `MC-01` and loads the
  card. Before the camera, not after. *Done when:* typing a code advances to
  Listen and the simulate button is gone.
- [x] **E.2 Camera scanning.** `getUserMedia` + `BarcodeDetector`, with
  permission-denied, no-camera and no-HTTPS states all falling back to E.1.
  Testable without a camera and without a domain: Chromium takes
  `--use-fake-device-for-media-stream` and
  `--use-file-for-fake-video-capture=<file>.y4m`, so a recorded clip of a
  generated code drives the real decode path under Playwright. E.0's generator
  is what produces the code in that clip.
- [x] **E.3 Safari fallback.** `zxing-wasm` where `BarcodeDetector` is missing,
  which is Safari and desktop Chrome on macOS. Lazily loaded and **self-hosted**
  — the package fetches its binary from jsDelivr by default, overridden with a
  Vite `?url` import so the 954 kB lands as one of the app's own assets, same
  origin and same deploy. None of it is in the main bundle; nothing downloads
  it until the camera is asked for.

  ***Done when:* it scans on iPhone Safari — CONFIRMED BY BEN, 2026-09-21**,
  through an HTTPS tunnel, which is the only way to test it: `getUserMedia`
  needs a secure context, and `http://192.168.x.x:5173` is not one. A LAN
  address makes the step render `cameraInsecure`, correctly, and a tester
  reads right behaviour as a bug. `vite.config.ts` carries the tunnel note and
  the `allowedHosts` entry that makes the next device test need no edit.

  **Two things the device pass did not measure**, and they matter before a
  pilot rather than now: how long the 954 kB binary takes on mobile data rather
  than wifi, and decode speed on an older phone. Both are first-visit costs
  only.

  **The native `BarcodeDetector` branch is covered by nothing anywhere** —
  macOS Chrome does not implement it, so the wasm path is what every test and
  every hand check has exercised. Only Android Chrome runs the other one.
  Logged in `apps/web/OPEN-QUESTIONS.md`; an Android phone closes it.
- [ ] **E.4 Audio storage and playback.** Tracks into a Supabase bucket, the
  transport on signed URLs, the simulated clock kept for missing files.
  Remember there are two tables: `tracks` is the recording and
  `exercise_tracks` is when it plays. Upload one file per `tracks` row, not
  per pairing.

  **PARTLY UNBLOCKED, 2026-09-21 — four recordings landed.** Epidemic Sound,
  staged in `~/musie-audio/`, which is outside the repository deliberately:
  licensed masters cannot be taken back out of git history, and anything under
  `apps/web/public/` ships in the Netlify bundle at a guessable public URL with
  no access control. Their ID3 tags carry real title, artist and **mood**, so
  the card assignment is mood-matched rather than arbitrary (Ben chose this
  over a random draw, same day):

  | Track | Card | Tagged mood |
  |---|---|---|
  | Little Yellow Petals — Rachel Sandy, 3:39 | MC-01 Joy | happy, hopeful |
  | Wait for It — Jon Björk, 1:43 | MC-02 Sadness | sad, marching |
  | High Sierra Call — Roy Edwin Williams, 3:11 | MC-05 Calm | laid back |
  | Bats and Rats — Ludvig Moulin, 2:48 | MC-04 Fear | quirky, mysterious |

  The other **five** cards stay silent and keep the simulated clock. Anger,
  Longing, Gratitude, Hope and Loneliness.

  **Three things the seed has wrong**, all fixed by this step's migration as a
  NEW file rather than an edit (rule 4): `duration_seconds` is invented
  throughout — the real values are 219, 102, 191 and 168; `title` and `artist`
  are invented throughout; and `src` points at `assets/audio/…` paths that must
  become bucket keys named by **track** id. `trk-01.mp3`, never
  `mc-01-joy.mp3` — a filename naming the card and the feeling leaks exactly
  what the opaque `trk-` ids were chosen to protect.

  **Wait for It is 102 seconds against a 90-second gate.** It works, because
  `SessionListen` caps the gate at the track's own length — but twelve seconds
  of headroom means one pause puts the reflection out of reach without a
  replay. Tune `listen_gate_seconds` once you have heard them.

  Epidemic Sound is a **subscription** licence, not the per-track clearance
  this plan assumed everywhere it says "cleared". `licence_ref` holds the ES
  track identifier until something better exists.
  `select count(*) from tracks` is still the number to quote when asking for
  more.
- [~] **E.5 The reveal gate — HALF DONE, and the tick was wrong (2026-09-22).**
  The `reveal-track` Edge Function is built, deployed and proven. **The
  three-scroll Listen step is not**, and E.5's own sentence names it: *"the
  `reveal-track` Edge Function AND the three-scroll Listen step"*. D.5b
  deferred two viewports here by name and MOCKUPS spelled them out. I built a
  reveal block at the foot of the stage instead, and ticked the step. Ben found
  it on the first hand walk.

  **What is built:** the function, its three checks, the silent-card refusal,
  and a walk that watches the network — which also caught the `licence_ref`
  leak. That half stands.

- [x] **E.5b The three-scroll Listen step.** NEW, 2026-09-22, and only new
  because E.5 was ticked without it.

  **Scroll 0 · the stage** — unchanged, plus a *Track details and player*
  button that makes the two views below reachable.

  **Scroll 1 · the Störer** — a full viewport that INTERRUPTS rather than a
  notice that warns, and the button order is the argument: *Continue the
  exercise* is primary and goes back up; *Show details and player* is the
  quiet secondary. The prototype puts the discouraged path second on purpose,
  and the same words in a `Message` would be a footnote people scroll past.

  **Scroll 2 · the details** — the full `MusicPlayer` with a live scrubber,
  the reveal, and the card and listening words in a `ContentList`. The player
  is why this view could not exist before E.5: its `title` is required and
  VISIBLE, so until `reveal-track` there was nothing truthful to put in it. It
  carries *Your track* before the gate and the recording's own name after,
  which makes the title CHANGING the reveal rather than a line of text being
  the reveal.

  **THE GATE IS SOFT, AND THAT IS THE PRODUCT DECISION IN THIS STEP** (Ben,
  2026-09-22). Dragging the scrubber past ninety seconds opens the gate. It
  keeps people from STUMBLING into the answer, not from CHOOSING it — full
  control of their own exercise, and a deliberate decision is not the failure
  the gate exists to prevent. It cost nothing because the gate was already
  written the right way: it latches on position and never asks who moved it,
  so the element, the clock and now the scrubber are three sources of one fact.

  **No scroll-snap**, deliberately: snap takes the scroll away from the person,
  and a thumb that wanted the middle of the details view gets thrown to its
  edge. Buttons offer the jumps; the scroll stays theirs. Same posture as the
  soft gate.

  **The stage is the one view that is not a full viewport**, and that is
  structural rather than inconsistent. `WizardPanel` owns the action row and
  renders it after this component's children, so a 100svh stage puts *Start
  reflection* one screen down, reachable only by scrolling past a Störer that
  exists to discourage scrolling. Measured, then fixed. The prototype sizes its
  stage to a computed height for the same reason.

  *Done when:* the three views are reachable, the scrubber opens the gate, and
  the title appears in the player only after it. **Two controls now announce
  the same track** — the stage's `TrackButton` and the details `MusicPlayer` —
  which Playwright's strict mode caught and a person would not; both walks are
  scoped to the stage.

  **The endpoint takes a SESSION id and never a track id**, which is the whole
  design: one accepting a track id would let anyone signed in walk
  `trk-01`…`trk-09` and collect all nine titles without listening to
  anything — the column grant undone by the thing built to complete it. The
  track is read from the row on the server, so there is nowhere to put a
  question about a recording you were not given. Three checks, each refusing
  someone different: a valid JWT, the session is yours, and it reached the
  listening. The third is honestly the weakest — `step` records which screen
  was reached, not that anyone listened — and the function says so in its own
  header.

  A row with **no file names nothing**. The five silent cards still carry the
  seed's invented title and artist, and handing those over would be the one
  thing this endpoint must never do: a fact somebody cannot check, about a
  recording that did not play, in the moment the product promised to tell them
  the truth.

  ***Done when:* the Network tab shows no title or artist until you scroll to
  the reveal — PROVEN, and it failed first.** `e2e/reveal.spec.ts` records
  every response body the page receives and asserts on what is IN them, because
  that done-when is a claim about bytes rather than pixels: a screen can look
  perfectly withholding while the answer sits in a payload it chose not to
  render. Standing on the listen step with nothing named on screen, it found
  the title AND the artist inside `licence_ref` — see `20260921170000`.
  Fixed by revoking the column; the walk now proves the title arrives in
  exactly one response, and that response is `reveal-track`.

---

## Phase F · Voice

Old Phase 5, with one addition: **the voice POC is not in this repository.** It
lives in `product-ben/musie-voice-to-text-demo`, and nothing here references it
except a source-notes document. Bringing it in is a step, not an assumption.

Before F.1: add a payment method to the OpenAI account. The free tier allows
three requests a minute; this feature needs far more, and it fails in a way
that looks exactly like a bug.

- [x] **F.0 Bring the POC into the monorepo.** `features/voice/`, imports
  repointed at `@musie/design-system`, the private `MusieToast` deleted in
  favour of the real one, the demo scaffolding left behind. *Done when:*
  `pnpm check` passes with it in and nothing imports a relative path into
  `packages/`.
- [x] **F.1 The token function.** `realtime-token` Edge Function, the OpenAI
  key as a Supabase secret, set with `--env-file` so the value never enters a
  command line. Both halves of the done-when are verified: a `curl` returns an
  `ek_…` expiring in 600 seconds, and a grep of `apps/web/dist` for the key and
  for anything key-shaped comes back empty.

  **THE ENDPOINT IN THE OLD DOCS IS GONE.** `POST /v1/realtime/transcription_sessions`
  answers `404 Invalid URL`, and so does `/v1/realtime/sessions`. The live one
  is `/v1/realtime/client_secrets`; the model goes at
  `session.audio.input.transcription.model` and the token comes back at the
  TOP level as `value`, not at `client_secret.value`. All three were probed
  against the real API, because a wrong endpoint fails exactly like a bad key.

  429 and 402 are mapped to `rateLimited` and `noCredits` rather than being
  flattened into a generic failure — the $50 cap fails requests hard when it is
  reached, and "out of budget" reaching a person as "the connection dropped"
  sends them to their wifi rather than to their invoice.
- [x] **F.2 Wire the core to tokens — THE CODE, NOT YET THE PROOF.**
  `connectRealtime` takes `token`, and it really was one parameter; the POC's
  own comment predicted that. Renamed rather than left as `apiKey` holding a
  token, because a name that lies is worse than one that is vague — the next
  person to read the subprotocol line needs to know which of the two is in it.
  `apps/web/src/lib/realtimeToken.ts` is the client half, minting one token per
  recording rather than caching one: a token lives ten minutes, a reflection
  takes two, and a stale one closes the socket seconds after somebody starts
  speaking, which reads as "the microphone broke".

  ***Done when:* you speak and words appear, with no key field anywhere —
  NOT YET SHOWN.** Nothing renders the voice feature: `@musie/voice` exports
  hooks and no components, by F.0's design. The wiring is complete and
  unexercised end to end until F.4 builds the editor, and that is the honest
  state rather than a tick.
- [x] **F.3 Tests for the two pure files.** `segmentation.ts` and
  `transcript/fillers.ts` — German abbreviations, the `um`/`äh` split, the
  whole-statement-was-hesitation case.
- [x] **F.4 The editor UI.** Built as `apps/web/src/components/VoiceTranscript.tsx`
  on the real `Toast` and `DraggableList` — a rewrite against the design
  system rather than a port, which is what "on the real…" always meant. The
  POC's `useDragList` (281 lines) and `MusieStatementCard` (194) stayed in the
  demo repo: they are §7.24 rewritten by hand, and F.0 left them for this
  reason. The thirteen `voice.*` strings F.0 wrote and never rendered now
  render.
- [x] **F.5 Keyboard parity — and most of it was already there.** Space/Enter
  lifts, arrows move, `M` merges into the row above, Escape cancels, and all
  five announce themselves in `DraggableList`'s live region, in the reader's
  language. The app got every one of them by passing `items`, which is the
  argument F.0 made when it refused to import the POC's card.

  **What was missing was focus**, and it is a change to
  `packages/design-system/src/DraggableList.tsx`: `M` is pressed on the source
  row's handle and Delete inside the source row's own menu, so both end the
  row holding focus. React unmounts that button and focus falls to `<body>` —
  which made "reorder and merge without a mouse" true exactly once per page
  load. The surviving neighbour's handle now takes focus after the commit. In
  the component because a screen cannot reach a row's controls without doing
  what rule 1 and L7 forbid.

  ***Done when:* you can reorder and merge without a mouse — CODE ONLY.** No
  screen reader has heard it and nothing in this repo can render a component
  under test (see `apps/web/OPEN-QUESTIONS.md`, and the ruling it asks for).
- [ ] **F.6 Persist the statements.** `onSentenceFinal` becomes the Supabase
  write. It fires on four paths, so it must be idempotent. *Done when:* editing
  a statement updates its row rather than inserting a second.

**Checkpoint.** Record a real reflection on an iPhone. iOS is the untested
surface: nothing documents `AudioContext` under Safari, background tabs or the
user-gesture requirement. Budget a session for surprises.

### The voice memo — F.7–F.11, added 2026-09-22

**New scope, and it reverses a decision rather than extending one.** Ben asked
for a switch on the reflect step — off by default — that also keeps the
recording of a spoken answer. The design is
[docs/VOICE-MEMO.md](docs/VOICE-MEMO.md), written before any of the code, and
these five steps are that document's edit list.

What it reverses is **D1**, which is not a gap but an answered question: *"No
`media_path`, no Storage bucket, no retention policy."* It is answered in three
places — the decision itself, the `sessions` migration's comment on why the
column is absent rather than nullable, and `privacy.voice`, which promises a
person that *"the recording itself is never stored."* An opt-in switch does not
keep that promise; it makes it conditional. Which is why the first step here is
the promise, not the column.

**These five follow F.6 and do not overlap it.** F.6 writes the transcript, and
a memo is an attachment to a transcript that must already save —
`reflections.body` stays `not null`, so a memo can never be an answer on its
own. That is the part of D1 worth keeping: text is the record.

- [ ] **F.7 The promise, before the code that breaks it.** D16 into
  DOMAIN-MODEL.md, D1 marked superseded rather than deleted, `privacy.voice`
  rewritten in both locales, and the six other keys §3 of the design document
  writes out in full.

  **Alone, and first, deliberately.** If the migration lands before the copy
  there is a window in which the app can store a recording while the privacy
  page still says it never does — which is precisely the failure Phase G's
  checkpoint exists to catch, walked into on purpose. *Done when:* `pnpm check`
  passes — `de.ts` is typed against `en.ts`, so a key written on one side only
  is a typecheck error — and the privacy page reads true against a build that
  still stores nothing.

- [ ] **F.8 The column, the bucket, and four policies.** One new migration;
  rule 4, they stack. `media_path` and `media_expires_at`, both or neither by
  check constraint — a path with no expiry is a recording nobody will delete,
  an expiry with no path is a promise about nothing. The expiry is **stored,
  not computed** from `created_at`: a row keeps the promise it was written
  under rather than silently inheriting a new one.

  The bucket follows `20260921160000_track_audio.sql` exactly — created here
  rather than in `config.toml` so `supabase db push` creates it on the hosted
  project, private, size- and mime-limited. **What is new is that this is the
  first bucket a client writes to.** `tracks` has a select policy and nothing
  else, because uploading there is an operator act; here the person is the
  uploader, so select, insert, update and delete are all theirs, scoped by
  `{user_id}/` leading the object key. `update` is granted on purpose: the
  reflect step can be returned to, which is why `saveReflection` is already an
  upsert.

  *Done when:* `pnpm test:db` proves a second anonymous user cannot read,
  write or delete under the first's prefix — four tests, each failing for its
  own reason — and that **deleting a session leaves the object behind.** That
  last one asserts an orphan rather than a cascade, because the orphan is the
  fact F.9 is built on, and a test written expecting a cascade would pass for
  the wrong reason.

- [ ] **F.9 Deletion and the sweep — BEFORE anything can be captured.** The
  order looks inverted and is not: the moment F.10 ships, files accumulate that
  nothing deletes. Building the deleter first means nothing a person creates is
  ever un-deletable, and it is testable with no UI at all — the harness uploads
  its fixtures with the service role.

  Three layers, and they are not redundant. The **client** removes the object
  before the row in `deleteSession` and `deleteAllSessions`, both of which
  currently carry a paragraph saying *"there is no storage half to this: D1
  settled that nothing is ever uploaded, so there are no files to orphan"* —
  that comment goes with the code. The **read** refuses anything past
  `media_expires_at` whatever is still in the bucket, so the promise is true
  from the moment the timestamp passes rather than from the moment a sweep
  happens to run. And a scheduled Edge Function is the **backstop**.

  **The backstop is the layer that earns the phase**, because of a failure mode
  this app makes uniquely likely: accounts are browser-bound — `privacy.
  browserBound` — so clearing browser data strands audio owned by an identity
  nobody can ever sign in as again. No client-side deletion can reach those
  files. It deletes through the Storage API and never by deleting rows from
  `storage.objects`, which leaves the file behind and builds a bucket that
  reports empty and bills full.

  *Done when:* a row past its expiry is not offered even with the file present,
  and the sweep removes both an expired object and an object with no row.

- [ ] **F.10 Capture: the switch, the WAV, the upload.** `Switch` exists and is
  exported, with `Mic` / `MicOff` as the `onGlyph` / `offGlyph` pair so the knob
  says *what* is switching rather than only that something is. It renders above
  `RecordButton` in `VoiceTranscript.tsx`; `Switch` has no `description` prop,
  so its sentence goes in the `musie-note` paragraph that file already uses
  twice.

  **The switch is read before the microphone opens, and locked while it runs.**
  Retroactive opt-in would mean buffering every session on the chance it is
  wanted, which is exactly what the promise forbids. `begin()` reads the value
  once, at the top, so the value governing a recording is the one that was on
  screen when it started.

  The audio is the PCM that already flows — `recorder.ts` emits base64 PCM16
  every ~40 ms — accumulated and encoded as WAV in the browser. No new
  dependency, no second microphone consumer, no new permission. 24 kHz mono is
  48 KB/s, so the 60 s `SESSION_SECONDS` ceiling is ~2.9 MB, and that ceiling
  bounds the buffer even if a stop path is missed. `MediaRecorder` / opus is a
  tenth of the size and is **deferred rather than rejected**: it is the exact
  iOS Safari surface the checkpoint above already says to budget for, and this
  feature should not be what discovers it.

  `keepExisting: true` means *Record more* adds to the transcript, so a
  reflection can be several runs against one `unique (session_id)` row. They
  concatenate — same format, same rate, append the samples, rewrite one header.
  Upload **then** write the row: a file with no row is invisible and swept
  within the day, while a row pointing at a file that never arrived is a
  visibly broken diary entry.

  *Done when:* the switch off creates no object, the switch on creates one at
  `{user_id}/{session_id}.wav` that plays back, and the switch cannot be moved
  mid-recording.

- [ ] **F.11 Playback, which is mostly already built.** `VoiceNote` (§7.19) is
  in the design system, exported, and **unused by the app** — the reflect step
  chose `RecordButton` + `DraggableList` because the transcript is the product.
  Its `recorded` state is the player this needs: a `Progress`-backed position,
  play/pause and delete, already story-covered and already accessible. So this
  is wiring in `DiaryEntry`, with a signed URL minted the way `lib/audio.ts`
  already mints one for a track.

  Rule 7 with teeth: `VoiceNote` defaults **every** copy prop to the package's
  German locale catalogue. All of them get passed. *Done when:* a memo plays
  from the diary entry, and an entry whose memo has expired says so rather than
  quietly losing a control.

**Checkpoint.** The upload, on mobile data, with a stopwatch. §5's size
question is settled by that number and not by the design document: 2.9 MB after
a reflection on a train is the most likely first complaint, and it is the one
thing that sends F.10 back for `MediaRecorder`.

---

## Phase G · The Diary, finished

Reduced, because C.7 already built the part the flow depends on.

- [x] **G.1 The timeline at a month's scale.** Grouping, filtering, and an
  empty state that reads well after thirty sessions rather than on day one.
- [x] **G.2 Deletion — the first half 2026-09-20, the second 2026-09-21.** Deleting ONE session landed in
  Phase D: a trash control in the diary entry, an inline confirmation, and the
  cascade taking the reflection with it. `useDiary` re-reads on arrival, which
  is what stops the list showing a row that is gone.

  **The other half landed 2026-09-21**, and the "orphaned files in storage"
  part of the old done-when was moot — D1 settled that nothing is ever
  uploaded, so there is no storage to orphan.

  **Delete-everything lives in `/settings`, not in the diary**, which is the
  one decision in this step: `/diary` IS the thing being destroyed, so a
  control that empties it while you scroll thirty rows past it is the
  definition of easy to hit by accident. Reaching settings is already two
  deliberate acts, so the inline confirmation is a third line of defence
  rather than the only one. The argument is written above `DeleteEverything`
  in `apps/web/src/SettingsSheet.tsx`.

  It takes a **running** session too, and the navigate to `/diary` afterwards
  is what stops that stranding you on a step whose row no longer exists.

  ***Done when:* a delete-everything control leaves no `sessions` and no
  `reflections` rows — PROVEN, and the third test is the one that matters.**
  `deleteAllSessions` names no row (`.delete().not('id','is',null)`), so RLS
  is the only thing between it and the whole table. `diary.db.test.ts` now
  spins up a second anonymous user, runs the unqualified delete as the first,
  and asserts the stranger's rows survive. That is the test that goes red the
  day `sessions_delete_own` is weakened — where the app would otherwise start
  deleting other people's diaries in silence.

**Checkpoint.** Read the privacy copy from C.2 next to what the app actually
does, line by line. If a sentence is doing work the code does not, fix the
code rather than softening the sentence.

---

## Phase H · Accounts

**Last, deliberately.** The MVP is a complete, functional product on its own
domain first; accounts are what turn it from a thing you test into a thing
people keep. Nothing before this phase is written differently because this
phase exists — the schema already carries `user_id` everywhere, which is the
whole reason this is a phase rather than a migration.

**The fact the phase rests on:** `updateUser({ email, password })` on an
anonymous user converts it in place and **keeps the same `auth.users.id`**. So
`profiles`, `sessions` and `reflections` all still point at it, and somebody
who does three sessions anonymously and then signs up **keeps their diary**.
That is the right product behaviour — the first session is what convinces
anyone, and asking for an email before it is how you lose them — and it is
free only because the schema was written this way from the start.

[auth.ts](apps/web/src/lib/auth.ts) is already compatible: it calls
`getSession()` first and only falls back to `signInAnonymously()` when there
is none, so a real session is simply used.

- [ ] **H.1 The provider, and who sends the mail.** Email + password, magic
  link, or OAuth. The second decision is the one with a tail: Supabase's
  built-in SMTP is rate-limited to a handful of messages an hour and is
  explicitly not for production, so real signup means a sending provider and a
  sending domain. If OAuth is wanted, `enable_manual_linking` has to go true —
  email conversion does not need it.

- [ ] **H.2 Convert, never create — and prove it before building any UI.** A
  test that runs sessions as an anonymous user, converts that user, and reads
  the same rows back under the same id. If this does not hold, every screen in
  H.3 is built on a wrong assumption. *Done when:* the test passes and the id
  before and after are identical.

- [ ] **H.3 The screens.** Sign up, sign in, sign out, password reset — in
  both languages, every string through the catalogue, no component default
  leaking through. *Done when:* a returning user on a second device sees their
  own diary.

- [ ] **H.4 What an account changes elsewhere.** `profiles.theme` stops being
  a write-only column — [SettingsSheet](apps/web/src/SettingsSheet.tsx) says
  it *"becomes readable the day an account spans devices"*, and this is that
  day, which means answering the reconciliation question it flags. The
  settings sheet grows an account section. And the privacy copy changes again:
  *saved on this device* becomes *saved to your account*.

- [ ] **H.5 Anonymous cleanup, on a schedule.** Every browser that ever opened
  the app left a permanent `auth.users` row, and they count toward monthly
  active users. Delete stale anonymous users that own no sessions. *Done
  when:* it runs unattended and an anonymous user with a diary is never
  touched.

> **Before then, during MVP testing:** anonymous rows piling up is a cleanup
> query, not an architecture problem — delete anonymous users with no sessions
> whenever it bothers you. The one thing accounts would buy you *early* is
> knowing **which tester said what**, since every tester is otherwise an opaque
> uuid. If that turns out to matter for the pilot, that is the reason to pull
> H forward, and the only one.

---

## Size

Thirty-five steps to the MVP, against the original plan's forty-one with
eighteen already banked — **thirty-four until E.0 was added on 2026-09-21**,
which is the second time this plan has grown a `.0` entry ticket for work an
earlier phase assumed somebody had already decided. Three of them have shrunk
since this was written: C.5 is now paths only, C.6 is one query, and B.2 lost
one of its three API holes. The expensive, easy-to-get-wrong part — the design
system and its Storybook — is behind you, which is the half of the original
plan most likely to have been skipped and regretted.

**Phase H's five steps are not part of that count.** The MVP is done when the
app is functional and live on its own domain, which is the end of A.6's second
half. Accounts come after that line, not before it.

**F.7–F.11 are not in it either, and where they belong is an open question.**
The voice memo was added on 2026-09-22 — after the count was taken, and after
the decision it reverses was made. It is the first work in this plan that
un-decides something rather than building on it, which is why it carries a
design document of its own. Whether it sits inside the MVP line or after it is
Ben's, and it is the only scope question this plan currently leaves open.

Phases E and F do not depend on each other. If the music licensing stalls, run
F first — and see **Running E and F in parallel** above for the two tracks that
can actually run at once, and the five things they share that decide which two
those are.

## Still blocked by someone other than Claude Code

| Blocker | Blocks |
|---|---|
| **Five more recordings.** Four landed 2026-09-21 (Epidemic Sound), leaving five of the nine deck cards silent, plus one each for Breathing Score and Body Scan Soundwalk still wanted. `count(*) from tracks` is the number to quote | E.4 in full. **E.5 is not blocked by this** — the reveal gates `title` and `artist`, which the seed already carries, so it can be built and its done-when checked with no audio at all |
| **The domain.** A printed QR code locks it in permanently, and A.6's second half — Netlify and a domain — has not run. Nothing goes to print until it is chosen, and the Netlify build allowance returns the week of 22 September | **The printed deck, and nothing else.** E.0 is built and end-to-end tested against `window.location.origin`, so no code, route, test or dev sheet waits on this. Print day is one run of the generator with `--base-url` |
| Which vision model reads handwriting — or ship photo as session-only | D.5 |
| **Sign-off** on the privacy copy — it is written, in both languages, and waiting | nothing is blocked; it is a promise already in the catalogue |
| The real Mindfulness Cards spreadsheet | The content is placeholder until it lands; all German content rows are `[DE] `-prefixed. **The re-cut then the step re-cut left TWENTY-EIGHT strings with no source** — four step lists plus one question per exercise, in both locales — which D.4 and D.5 need |
| The four user-type artworks | D.2 uses `RadioGroupImage` properly only once they exist |
| Which vision model reads the handwriting — D13 settled that a photo BECOMES TEXT, so this is now the only thing between photo mode and working | D.5's reflect step |
| D15 — may the Diary NAME the track you heard, given the column grant withholds the title | the diary entry page's *Listen again* control |
| **Thirty days or ninety** — how long a voice memo is kept. Thirty is recommended, with the argument in [docs/VOICE-MEMO.md](docs/VOICE-MEMO.md) §2 | **F.8, and everything after it.** It has a clock on it: a retention window changed later changes rows that were written under the old one, so it is settled before the migration or not cheaply at all |

---

## The two that are only Ben's, and the only two with a clock on them

Everything else in the table above is waiting on information. These two are
waiting on a **decision**, they are the two nothing else can route around, and
each gets more expensive the longer it is left.

### 1 · The domain

**A printed QR code carries an absolute URL, so the deck locks the domain in
permanently.** Five hundred cards cannot be reprinted because a name changed.

Nothing in the repository waits on this — that was E.0's whole design, and it
held: the decoder never compares a host, `/s/:code` is same-origin, the dev
sheet mints its codes from whatever origin served it, and the end-to-end walk
proves the deep link on `localhost` with no domain configured anywhere. Print
day is one run of `apps/web/scripts/qr-codes.mjs` with `--base-url`.

So this blocks exactly one thing, and it blocks it absolutely: **the deck going
to print.** A.6's second half — Netlify and a domain — is the step, and the
build allowance returned the week of 22 September.

### 2 · The remaining recordings

**Four landed on 2026-09-21. Five of the nine deck cards are silent**, and
Breathing Score and Body Scan Soundwalk have no recording at all.

The four are mood-matched rather than arbitrary, from their own ID3 tags:
Little Yellow Petals → MC-01 Joy, Wait for It → MC-02 Sadness, High Sierra Call
→ MC-05 Calm, Bats and Rats → MC-04 Fear. Anger, Longing, Gratitude, Hope and
Loneliness draw a card and hear a simulated clock.

`select count(*) from tracks` is the number to quote when asking for more, and
the schema stores a recording **once** — so a piece shared between two
exercises is one licence, not two.

**Two things about these four that are not obvious.** Epidemic Sound is a
*subscription* licence, not the per-track clearance this plan assumed
everywhere it says "cleared" — worth confirming what happens to published
work if the subscription lapses. And *Wait for It* is 102 seconds against a
90-second gate: it works, because the step caps the gate at the track's length,
but twelve seconds of headroom means one pause puts the reflection out of reach
without a replay. Tune `listen_gate_seconds` once you have heard them.
