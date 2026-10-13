# Backlog

Work that is understood well enough to start and deliberately not started.

Not a wish list. Each entry says what the thing is, why it is not being done
now, and what the first move would be — so picking one up does not mean
re-deriving it. Decisions that have been *taken* live in `DECISIONS.md`; this is
for work that has been *scoped*.

---

## B1 · Remove the automatic splitting of spoken reflections — on its own

**Ben, 2026-10-13: this needs to be done as its own piece of work.** Explicitly
out of maintenance day.

**The finding.** In the September round, **all five participants** said the
automatic splitting of speech into separate statements was unwanted and jarring,
and that plain text would be fine. **Two** loved the drag-to-combine gesture —
which only exists *because* of the splitting, since combining is the repair for
a split nobody asked for.

**What the board already worked out,** so this does not need re-deriving:

- **Removing it costs less than it looks.** With `keepExisting: true` on every
  start, a second "Record more" still produces a second box, so `editable` stays
  reachable and `onCombine` still fires. The gesture survives — but only across
  runs the person chose to break, so most single-take sessions never see it, and
  the tips button that teaches it never appears.
- **Nothing in storage breaks.** `reflection_statements` keeps one row per
  statement in position order, `joinStatements` still assembles
  `reflections.body`, and the diary already draws one paragraph per statement.
  One statement per recording simply means one paragraph.
- **The board's recommendation:** take it, and keep the combine path wired. Five
  beats two, a unanimous finding argues for deletion rather than construction,
  and the gesture is demoted rather than deleted. Do **not** remove
  `DraggableList`, `onCombine` or the keyboard `M` path — they cost nothing
  standing.
- **The compromise, named so it can be rejected knowingly:** widen the pause
  threshold and keep the boxes. `CLIENT_SILENCE_MS = 800` in
  `features/voice/src/config.ts` is the real splitter — `gpt-live-transcribe`
  runs with `serverVad: false`, so the browser commits the turn and
  `SILENCE_DURATION_MS` and `SegmentationMode` are both ignored. Raising it to
  1500–2000 makes splits clause-shaped instead of mid-clause. That satisfies
  "the breaks were in the wrong places" and **not** "we did not want boxes".
  Nobody asked for better-timed boxes.

**First move.** Decide between the recommendation and the compromise, then one
field in `features/voice/src/config.ts` or one flag on the reflect step. The
measurement that would settle the threshold is `docs/VOICE-CAPTURE-FIX.md` §7 —
a hand run on a phone logging nine stop-time numbers, still marked UNMEASURED
ON A PHONE.

**Blocks:** `statement_segmentation` in the exercise-model feature registry
(`docs/EXERCISE-MODEL-PLAN.md` on the `exercise-model` branch) is a flag whose
value is unsettled until this is decided.

---

## B2 · The lock-screen widget pauses one stream, not both

**Found by Ben on a real iPhone, 2026-10-13**, while answering a different
question.

Two `<audio>` elements do keep playing with the screen locked — that was the
original question and the answer is yes. But pressing **pause in iOS's own
now-playing widget** stops the foreground track and leaves the background bed
playing. A person who presses pause has asked for silence; music without
guidance is worse than either alone.

**Why it happens.** iOS binds its Media Session to one element. Nothing in the
app claims that session deliberately, so the platform picks one and the other is
invisible to it.

**First move.** Own it: one `navigator.mediaSession` with `pause`/`play`
handlers that act on the **pair** rather than on whichever element the platform
latched onto. `apps/web/src/lib/mixer.ts` is where it lands.

**Where to try it.** `/dev/experiment-mixer` — kept rather than deleted for
exactly this. It is the only place a locked screen can be tested without
shipping.

---

## B3 · The browser walk runs nowhere, and that is the real problem

Nine Playwright specs, 14 tests, three browser projects — **42 test runs that
currently execute in no place at all.**

- **Not locally.** `apps/web/.env.local` points the browser at the hosted
  project while the assertions read the local stack, and `e2e/support.ts`
  refuses: *"This walk would address two different databases and prove
  nothing."* That refusal is correct.
- **Not in CI.** No workflow runs `pnpm test:e2e`. `ci.yml` runs `pnpm check`
  and two builds; the database and browser suites are deliberately outside
  `check` because the runner has no Supabase.

Ben's framing is right — a laptop is for quick looks, and tests are for what
goes to production. The consequence is the part worth acting on: **if the walk
is for production, it has to run somewhere, and it does not.** It is the only
thing that tests the real session flow end to end — scan, listen, reflect, the
audio, the German locale.

**Three honest options, in increasing cost:**

1. **Say out loud that it is a manual tool**, run by hand before a release, and
   write the command and the `.env.local` switch into `docs/MUSIE-SETUP.md`.
   Cheapest, and at least stops it looking like automated coverage.
2. **Wire it into CI** with `supabase/setup-cli` plus `supabase start` on the
   runner, which is the gap `CLAUDE.md` rule 4 already names. Real coverage;
   adds a few minutes per run. Actions are free here because the repo is public.
3. **Delete it** if neither is worth it. 42 test runs that never run are worse
   than none, because they read as coverage.

**Not a decision for a clear-out day** — but it should not stay unstated either.

---

## B4 · `db:status` cannot answer from an unlinked worktree

`pnpm db:status` resolves the hosted database through `supabase migration list
--linked`, and the link state lives in `supabase/.temp/`, which is gitignored
and therefore **per-worktree**. So in a fresh worktree or clone it reports
UNKNOWN until `supabase link` has been run there.

It fails honestly — it says UNKNOWN, never "in sync", and tells you to run
`supabase link`. But a check that always says "not checked" eventually gets
ignored, which is a quiet version of the problem it was built to fix.

**First move.** Pass the project ref explicitly instead of relying on link
state. The ref is not a secret — it is already in a comment in
`.github/workflows/db-push.yml`. Needs a look at what `migration list` wants
alongside `--project-ref` to avoid prompting for a password.

---

## B5 · `size="comfort"` has no call site and is reserved, not dead

Kept deliberately — **Ben, 2026-10-13: it is the rung for when Musie is
optimised for elderly and for children.** 56px between the 44px default and
`guided`'s 64px. Documented on `CtaButton`'s `CtaSize`, with pointers from
`IconButton`, `MusicPlayer` and `RecordButton`.

It is in this file so that the next clear-out finds a reason rather than a
precedent: `accent-alt` was deleted on 2026-10-10 for having no call sites, and
this looks identical from the outside.

**If it is ever removed**, it is three CSS rules and four type unions — and
**never** `--target-comfort`, the token. `guided`'s multi-line height is
`calc(var(--target-comfort) * 2)`, and two further rules use it directly.
