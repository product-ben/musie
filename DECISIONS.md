# Decisions

What was decided, and why. Not the discussion — the ruling and the reason, so
nobody re-opens it by accident and no agent re-proposes something already
refused.

**Append-only, newest part first.** Each entry has a stable id so code comments
and board stickies can cite it. A decision that turns out wrong is not edited:
a new entry supersedes it and says so.

**This file starts on 2026-10-13 and is incomplete by design.** It holds that
day's maintenance decisions. The large body of product and architectural
decisions — roughly 60 actions, 35 explicit refusals and 30 "already resolved,
do not re-propose" notes from the September user-testing round, plus everything
in the two append-only logs — is still to be brought in. See **Still to write**
at the foot.

---

## Part 1 · Maintenance day, 2026-10-13

### M1 · Source masters live outside the repository; web renditions live in it

**Decided.** Print masters, audio masters and delivered graphics moved to
`~/Documents/musie-assets/`. The ~1.9 MB of web renditions under
`apps/web/public/assets/web/` stay in git.

**Why.** Three reasons; the third decides it.

1. Git keeps every version of a binary forever and no clone can decline it.
   Removing one later needs a history rewrite, which breaks every clone and
   every open pull request.
2. Every worktree is a full copy. With ten open, five committed 3 MB card
   masters were 175 MB of the same five images.
3. **`github.com/product-ben/musie` is PUBLIC.** Anything committed is
   downloadable by anyone, permanently. `~/musie-audio/README.md` records that
   Epidemic Sound is a *subscription* licence rather than per-track clearance.
   Those files were never committed — that is luck, not design. The card
   masters were, and were public until this change.

The renditions are the opposite case: the repository is what gets built and
deployed, so a file not in it is not in the build.

**The convention already existed in writing** —
`public/assets/web/{exercises,infographics}/README.md` both said masters live
outside — and the repository was not following it for the cards.

**Answered, Ben, 2026-10-13:** the card artworks are Musie's own. No licence
issue with their having been in a public history. So M2 stands unchanged — no
history rewrite — and the reason narrows from "licensing" to the three technical
ones: git keeps binaries forever, every worktree copies them, and a binary diff
tells a reviewer nothing. The licensing argument still holds in full for the
audio, which was never committed.

### M2 · The 15.9 MB already in git history stays

**Decided.** No history rewrite.

**Why.** Reclaiming it means force-pushing over the history that every merged
pull request points at, for about 16 MB. The cost is out of proportion. From
today nothing new goes in, which is the part that compounds.

### M3 · The masters folder is `musie-assets`, not `musie-artwork`

**Decided.** Renamed, because music, logos and infographics all live there now
and "artwork" had stopped being accurate. Five call sites followed; `git grep
musie-artwork` finds only one historical line in the append-only log, which is
correct to leave.

### M4 · `packages/design-system/assets/` stays in the repository

**Decided.** Contrary to the maintenance plan, which had listed those 2.7 MB for
removal.

**Why.** `package.json` lists `assets` in its `files` field, so both bitmaps
**ship as part of the published package** — a deliverable, not a source master —
and `Logo`'s `src` prop is documented against them (`CustomSrc` demonstrates
"the other rendition that ships in the package"). Moving them would break the
package's own contract to save 2.7 MB. They are also Musie's own brand marks, so
M1's licensing argument does not apply.

**What was actually wrong there** was a comment: `Logo.tsx` and
`Logo.stories.tsx` both claimed the original "lives at `/assets/source/`", a
directory that has never existed. Now they say where it is.

### M5 · `supabase db push` stops being forbidden and starts being guarded

**Decided.** Raw `supabase db push` stays denied in `.claude/settings.json`.
`pnpm db:sync` is allowed instead, and refuses unless you are on `main`, the
tree is clean, and `main` is level with `origin/main`.

**Why.** Three commands were denied as one rule and they are forbidden for three
different reasons. `db reset` touches the local database that every worktree
shares. `gen:types` writes a file into whichever branch is checked out. **`db
push` touches hosted, where no worktree is involved at all** — its risk is
pushing from a branch that has not merged, which is a question of *when*, not of
*who*.

Phrased as *who*, the rule never protected Ben: he was free to push at the wrong
moment, and his actual failure was forgetting to push at the right one, after a
merge, with every check reporting success. A guard protects whoever is holding
the tool.

### M6 · "I could not check" and "they agree" must never look alike

**Decided.** `pnpm db:status` exits 0 in sync, 1 drifted, **2 unknown**, and
prints the word UNKNOWN with "This is NOT in sync" when it cannot read hosted.

**Why.** The original bug was silence being read as health. A check that reports
"fine" when it failed to look rebuilds that bug with extra steps.

### M7 · The reminder hangs off `pnpm dev`, not off a git hook

**Decided.** `predev` runs the drift check. No `post-merge` hook, no
`core.hooksPath`.

**Why.** The good idea in a git hook is "attach the reminder to something I
already do". The delivery is poor: `.git/hooks` is not versioned,
`core.hooksPath` must be set in every clone *and* every worktree, and a fresh
checkout silently has none. `package.json` is versioned and needs no setup, and
rule 8 sends everyone to `pnpm --filter web dev` after every change.

It also does a job a merge-triggered hook could not. Once the workflow is armed,
"you merged, go push" is noise; the dangerous failure is **automation that
quietly stopped** — a rotated secret, a disabled workflow, secrets never added.
Comparing the two databases catches that.

**Constraint:** it always exits 0 and times out after 8 s. A check that stops
`pnpm dev` on a train is worse than the problem it solves.

### M8 · Migration push is automated on merge, and the workflow ships inert

**Decided.** `.github/workflows/db-push.yml` pushes on merge to `main` and then
runs the database suite against hosted. It does nothing until three secrets
exist, and its first step says so.

**Why automatic is defensible:** it runs only on `main`, so the change is
already merged; the hosted suite runs immediately after; and `supabase db push`
applies only what a migration says.

**Two secrets, not five.** The access token fetches the anon and service-role
keys at run time, masked explicitly — GitHub masks the secrets it was *given*,
not values computed from them. And the project ref is not a secret at all: it is
half of every public URL this project serves, so it sits in the workflow's `env`
block in plain sight. Storing it as a secret would have implied otherwise and
cost a third setup step for nothing.

**Open, for Ben:** fully automatic, or one click? Actions are free and unmetered
because the repository is public, and for the same reason a required-reviewer
Environment is free — it costs money on private repositories. Adding
`environment:` to the job makes the push wait for approval.

### M9 · The database suite seeds the one storage object it asserts about

**Decided.** The `db` vitest project gained a globalSetup that calls the walk's
existing seeder.

**Why.** `createSignedUrl` checks the object exists. The `tracks` bucket is
created empty by a migration and filled by nobody — the masters are licensed and
are an operator upload. So the only things that ever filled it were a hand
upload and Playwright's globalSetup, which runs on `test:e2e` and never on
`test:db`. Rule 4 sends you to `test:db` after every migration change, and it
landed on `Object not found` for an unrelated reason. An order dependency
wearing a schema failure's clothes.

**Reused rather than rewritten,** because `e2e/fakeTracks.ts` already makes the
careful decisions: reads `tracks` instead of a hard-coded list, leaves a NULL
`src` alone, and skips keys already present so a stack with real masters is
untouched. `seedTrackAudio` now takes an optional target, because the walk's own
`stack()` compares against `.env.local` and refuses when they differ — right for
a walk with two actors, wrong for a suite with one. That refusal was the
blockage the log had recorded as stopping the obvious fix.

### M10 · `DataLightbox` is deleted; its five copy keys are not

**Decided.** The component (87 lines, zero importers) and its CSS are gone. The
orphaned `privacy.*` keys stay in both catalogues.

**Why delete:** no door opened it for three weeks, and the log asking where a
door should go went unanswered.

**Why keep the copy:** it is a written privacy promise, some of it rewritten by
Ben after the first draft was found unrendered. Deleting product copy about data
handling is a product decision, not a clear-out's to take.

**Resolved, Ben, 2026-10-13: the copy goes too.** All five keys deleted from
both catalogues — `privacy.title`, `privacy.account`, `privacy.voice`,
`privacy.browserBound`, `privacy.more`.

**What the app still promises, and where.** Three keys survive and all three are
rendered: `privacy.voiceShort` beside the record button, `privacy.written` and
`privacy.photo` on the reflect step's modes. So each promise still sits at the
control it is about, which is the placement user testing argued for. What no
longer exists is a single page stating all of it at once — if that is wanted
back it is a screen, not a key.

### M11 · Rule 8 says two of three packages

**Decided.** `CLAUDE.md` rule 8 no longer claims unit tests across every
package.

**Why.** `packages/design-system` has no `test` script, so `pnpm -r run test`
passes over it silently. What covers it is real but different in kind —
`verify-tokens.mjs`, `verify-layout.mjs` and the `Smoke/Badge` story. A claim
that is two-thirds true is the shape of claim that stops being read.

### M12 · `storybook.yml` stops re-running the whole gate

**Decided.** Its `pnpm check` step is gone, and so is its pnpm version pin.

**Why.** It ran the gate a second time on commits `ci.yml` already gated — runs
38352717855 and 38352717823, same commit, same second, 1m19s and 1m23s. What it
added over `build:storybook` was the app's typecheck, lint and unit tests, none
of which decide whether these docs are publishable, and the Storybook build
compiles the design system itself so a type error there still fails the job.

**The trade-off, stated:** a red `ci.yml` no longer blocks a Storybook deploy.
The docs build is this workflow's own gate.

### M13 · `playwright.config.ts`'s `workers: 1` is untouched

**Decided.** No change, because no measurement.

**Why.** The plan was to time the walk and keep a change only if it was faster
*and* green twice. The walk could not be run: port 5173 was already served by
another session, which `reuseExistingServer` would silently adopt (rule 9), and
`.env.local` points the browser at hosted while the assertions read local, which
`e2e/support.ts` rightly refuses. **No measurement, no change.**

### M14 · The exercise model becomes its own branch, not today's work

**Decided.** `exercise-model` carries `docs/EXERCISE-MODEL-PLAN.md` and nothing
else. No schema, no configs, no runtime change today.

**Why now at all:** the investigation was in hand — the live schema, the five
rows, the step machine, `exerciseKind.ts`, the step components — and re-deriving
it later means paying for it twice.

**Why not further:** it is a multi-day change that wants the configs argued over
before anything consumes them.

### M15 · `size="comfort"` is reserved, not dead

**Decided, Ben, 2026-10-13.** Zero call sites on four component APIs, and it
stays — because it is **the rung for when Musie is optimised for elderly and for
children.** 56px between the 44px default and `guided`'s 64px: the size a
shakier or a smaller hand wants without the whole interface going large.

**Why this needed saying.** `accent-alt` was deleted on 2026-10-10 for having no
call sites, so from the outside this looks identical and the precedent points at
deletion. Documented on `CtaButton`'s `CtaSize` with pointers from the other
three, and in `BACKLOG.md` B5, so the next clear-out finds a reason rather than
a precedent.

**And what cannot go with it, ever:** `--target-comfort` the token. `guided`'s
multi-line height is `calc(var(--target-comfort) * 2)` — "two comfort rows,
derived, not picked" — and two further rules use it. The audit called this "8
CSS rules"; only 3 are the variant.

### M16 · The two-stream spike is kept as `/dev/experiment-mixer`

**Decided, Ben, 2026-10-13.** It was written to be deleted the moment its one
question was answered. The answer arrived — **yes, iOS keeps two `<audio>`
elements playing with the screen locked**, confirmed on a real iPhone — and it
arrived with a second question attached, so the bench stays.

**The second question:** pressing pause in iOS's own lock-screen widget stops
the foreground track and leaves the background bed playing. A person who presses
pause has asked for silence. iOS binds its Media Session to one element and
nothing claims that session deliberately. `BACKLOG.md` B2; the fix lands in
`lib/mixer.ts`, and this route is the only place it can be tried against a
locked screen without shipping.

It keeps its rule-6 and rule-7 exemptions on the same footing as `/dev/qr` and
`goal-mappings`: a tool linked from nowhere, lazy, opened only by the team.

### M17 · `insight-board` goes; `insight-map` and `digital-cards` stay

**Decided, Ben, 2026-10-13.** `insight-map` merged as PR #20 and its work is on
`main`. `insight-board` was the earlier provocation and is superseded —
deleted, SHA `2f4b1fa`, 86 files, recoverable by name. `digital-cards` is active
work and is kept.

---

## Still to write

Not done, and listed so the gap is visible rather than assumed:

- **The September user-testing round.** Roughly 60 action decisions, 35 explicit
  refusals with reasons, 30 "already resolved — do not re-propose" notes and 20
  open questions, across six surfaces. The raw board export is at
  `~/Documents/musie-assets/usertesting/`, so this needs no Figma round-trip.
  The refusals are the most valuable and most easily lost half.
- ~~One open product tension about reflection splitting~~ — **moved to
  `BACKLOG.md` B1** on Ben's instruction that removing the splitting is its own
  piece of work, with everything the board had already worked out carried across
  so it needs no re-deriving.
- **The architectural decisions already settled** in
  `apps/web/OPEN-QUESTIONS.md` (8,548 lines, 263 entries),
  `packages/design-system/stories/OPEN-QUESTIONS.md` (4,248) and
  `DOMAIN-MODEL.md`'s D-numbers.
- **`BUILD-PLAN.md` → V0.2 frozen and V0.3 live.** One wrinkle found: it is
  cited 66 times across 23 files, fourteen in code, and two of those are inside
  applied migrations that rule 4 forbids editing. A rename breaks all 66, two
  permanently — so `BUILD-PLAN.md` should become a ten-line forwarding address
  rather than move.
