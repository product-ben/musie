# Backlog

Work that is **understood well enough to start and deliberately not started.**
Not a wish list: each entry says what the thing is, why it is not being done
now, and what the first move would be — so picking one up does not mean
re-deriving it.

| | What | First move |
|---|---|---|
| **B1** | Remove the automatic splitting of spoken reflections | one field, or one flag on the reflect step |
| **B2** | The lock-screen widget pauses one stream, not both | own `navigator.mediaSession` for the **pair** |
| **B3** | The browser walk runs nowhere | decide: manual tool, CI, or delete |
| **B4** | `db:status` cannot answer from an unlinked worktree | pass the project ref explicitly |
| **B5** | `size="comfort"` has no call site and is **reserved, not dead** | nothing — it is here so a clear-out finds a reason |
| **B6** | Alt text has two homes, and the app reads the one scheduled to be dropped | carry the column across, move the two readers, then drop |

::: designers
## B1 · The splitting of spoken reflections

**All five participants** in the September round said the automatic splitting of
speech into separate statements was unwanted and jarring, and that plain text
would be fine. **Two** loved the drag-to-combine gesture — which exists only
*because* of the splitting, since combining is the repair for a split nobody
asked for.

**The recommendation on the board:** take it out, and keep the combine path
wired. Five beats two, a unanimous finding argues for deletion rather than
construction, and the gesture is demoted rather than deleted.

**What it costs is less than it looks.** A second "record more" still produces a
second box, so the editing surface stays reachable and the gesture still fires —
but only across runs the person *chose* to break. So most single-take sessions
never see it, and the tips button that teaches it never appears.

**Nothing in storage breaks.** One statement per recording simply means one
paragraph.

**The compromise, named so it can be rejected knowingly:** widen the pause
threshold and keep the boxes. That makes splits clause-shaped instead of
mid-clause — which satisfies *"the breaks were in the wrong places"* and **not**
*"we did not want boxes"*. **Nobody asked for better-timed boxes.**

## B2 · Pause should mean silence

Two audio streams do keep playing with the screen locked — that was the
original question and the answer is yes.

But pressing **pause in iOS's own now-playing widget** stops the foreground
track and leaves the background bed playing. **A person who presses pause has
asked for silence; music without guidance is worse than either alone.**

It can be tried at `/dev/experiment-mixer`, which is kept for exactly this — the
only place a locked screen can be tested without shipping.

## B6 · The pictures' descriptions are in the wrong table

A card's alt text is the only translated thing left in the deck, and it is
currently in two places at once: the nine written descriptions sit in
`card_i18n.image_alt`, which every screen reads, while `/maintenance` writes
`artwork_i18n.alt`, which has no rows with anything in them.

**Two consequences, and the second is the one that matters.** An operator who
spends an afternoon describing nine pictures changes a column nothing shows. And
after an artwork upload a card shows the **new** picture with the **old** card's
description — a screen reader is told something confidently wrong, which is
worse than being told nothing.

It lands hardest on the digital card path, where a card fills the screen with
nothing else on it: there the description *is* the card.

## B5 · A size that is reserved rather than unused

`comfort` — 56px, between the 44px default and the 64px guided size — has **zero
call sites and stays.** It is the rung for when Musie is optimised for elderly
and for children: the size a shakier or a smaller hand wants without the whole
interface going large.

It is written down because a similar token was deleted on 2026-10-10 for having
no call sites, **so from the outside this looks identical and the precedent
points at deletion.**
:::

::: devs
## B1 · the mechanics

`CLIENT_SILENCE_MS = 800` in `features/voice/src/config.ts` **is** the splitter.
`gpt-live-transcribe` runs with `serverVad: false`, so the browser commits the
turn — which means `SILENCE_DURATION_MS` and `SegmentationMode` are both
ignored. Raising it to 1500–2000 is the compromise.

With `keepExisting: true` on every start, `editable` stays reachable and
`onCombine` still fires. **Do not remove** `DraggableList`, `onCombine` or the
keyboard `M` path — they cost nothing standing.

`reflection_statements` keeps one row per statement in position order,
`joinStatements` still assembles the body, and the diary already draws one
paragraph per statement.

**Blocks:** `statement_segmentation` in the exercise-model feature registry
(`docs/EXERCISE-MODEL-PLAN.md`, on the `exercise-model` branch) is a flag whose
value is unsettled until this is decided.

The measurement that would settle the threshold is `docs/VOICE-CAPTURE-FIX.md`
§7 — a hand run on a phone logging nine stop-time numbers, still marked
**UNMEASURED ON A PHONE**.

## B2 · the mechanics

iOS binds its Media Session to **one** element. Nothing in the app claims that
session deliberately, so the platform picks one and the other is invisible to
it.

**First move:** one `navigator.mediaSession` with `pause`/`play` handlers that
act on the pair. Lands in `apps/web/src/lib/mixer.ts`.

## B3 · the browser walk runs nowhere, and that is the real problem

`BACKLOG.md` counts nine specs, 14 tests and three browser projects — **42
test runs that currently execute in no place at all.** The tree today holds
eight specs and 13 tests, so it is 39 runs; the argument is unchanged and the
number is not the point.

- **Not locally.** `.env.local` points the browser at hosted while the
  assertions read the local stack, and `e2e/support.ts` refuses: *"This walk
  would address two different databases and prove nothing."* **That refusal is
  correct.**
- **Not in CI.** No workflow runs `pnpm test:e2e`. `ci.yml` runs `pnpm check`
  and the builds; the database and browser suites are deliberately outside
  `check` because the runner has no Supabase.

A laptop is for quick looks and tests are for what goes to production — which
makes the consequence the part worth acting on: **if the walk is for production,
it has to run somewhere, and it does not.** It is the only thing that tests the
real session flow end to end: scan, listen, reflect, the audio, the German
locale.

**Three honest options, in increasing cost:**

1. **Say out loud that it is a manual tool**, run by hand before a release, and
   write the command and the `.env.local` switch into `docs/MUSIE-SETUP.md`.
   Cheapest, and at least stops it looking like automated coverage.
2. **Wire it into CI** with `supabase/setup-cli` plus `supabase start` on the
   runner — the gap rule 4 already names. Real coverage; a few minutes per run,
   and Actions are free here.
3. **Delete it**, if neither is worth it. **Test runs that never run are worse
   than none, because they read as coverage.**

## B4 · `db:status` from an unlinked worktree

It resolves hosted through `supabase migration list --linked`, and the link
state lives in `supabase/.temp/`, which is gitignored and therefore
**per-worktree.** In a fresh worktree or clone it reports UNKNOWN until
`supabase link` has been run there.

It fails honestly — it says UNKNOWN, never "in sync". But **a check that always
says "not checked" eventually gets ignored**, which is a quiet version of the
problem it was built to fix.

**First move:** pass the project ref explicitly instead of relying on link
state. The ref is not a secret — it is already in the `env` block of
`db-push.yml`. Needs a look at what `migration list` wants alongside
`--project-ref` to avoid prompting for a password.

## B6 · the three pieces, in order

`20261014100100_maintenance_import.sql` creates the `artwork_i18n` rows with a
literal `null` and does not carry `card_i18n.image_alt` across.
`public.project_deck()` projects `cards.image_url` and `exercise_tracks` from
the grid — not alt text. Both readers, `lib/content.ts` and
`scripts/content-export.mjs`, select `card_i18n.image_alt`. So the table the
maintenance UI writes is not the table the app reads, and `card_i18n` is
scheduled to be dropped once the live branches land.

1. one `update public.artwork_i18n i set alt = (select c.image_alt from …)`,
   in the migration that is already going to drop `card_i18n`;
2. `content.ts` and `content-export.mjs` switch to the artwork's alt — the join
   is already there for `image_url`;
3. then the drop.

**Readers before the column goes**, which is the sequence `20261011100000` used
for `needs_cards` rather than breaking every other worktree's app with a
PostgREST error in a file they did not touch.

## B5 · if `comfort` is ever removed

Three CSS rules and four type unions — and **never** `--target-comfort`, the
token. `guided`'s multi-line height is `calc(var(--target-comfort) * 2)`, and
two further rules use it directly. The audit called this "8 CSS rules"; only 3
are the variant.
:::

---

**Source of truth:**
[BACKLOG.md](https://github.com/product-ben/musie/blob/main/BACKLOG.md).
