# Branches that are kept, and what each one is waiting on

On 2026-10-13 this repository had **41 local branches, 34 of them already merged
into `origin/main`**, and 17 remote branches of which 16 were merged. The stalest
local branch was 223 commits behind. Rule 9 says why that is not merely untidy:

> **A stale worktree reads like a confused agent.** A worktree 76 commits behind
> reports a file missing that exists on `main`, re-implements what already
> landed, and applies an older copy of this file.

The merged ones were deleted. **This file is the guard for the ones that were
not** — without a written list, the next clear-out has no way to tell a branch
that is waiting from a branch that is abandoned, and the safe-looking choice is
to delete nothing.

Add a line here when you start a branch meant to outlive a week. Delete the line
when the branch merges.

## Kept

| Branch | Holds | Waiting on |
|---|---|---|
| `main` | — | — |
| `insight-board` | The `/insight` provocation: `routes/Insight.tsx` and seven `lib/insight*` modules, ~3,700 lines, entirely additive. Becoming its own feature. | Ben. **32 commits behind `main` as of 2026-10-13**, so it wants a rebase before anything else happens to it. |
| `ui-writing-experiment` | The localhost copy editor — `src/experiments/uiWriting/`, an overlay that rewrites copy where you are reading it and hands back a prompt. | Ben. A decision about whether this ships or stays a local tool. |
| `feelings-detection-help` | `supabase/content/emotion-wheel.yml` — 128 feelings, each with a position, plus the log entry that argued the shape. | Ben, who is continuing it. **Deliberately kept**: it is data for something unbuilt, which is exactly what an automated prune would read as abandoned. |
| `exercise-model` | `docs/EXERCISE-MODEL-PLAN.md`. The investigation into how an exercise is assembled today — four locations that cannot be read together — and the JSON schema that would replace them, toward an exercise builder for a music therapist. No code. | Its own day. Step 3 of its plan depends on `apps/web/scripts/_migration.mjs` being extracted first. |
| `maintenance-day` | The 2026-10-13 clear-out. Merge and delete. | Review. |

## Deleted on 2026-10-13, and why

Beyond the 34 merged locals and 16 merged remotes:

- **`listen-experiments`** — 7 commits, last touched 2026-10-07, reworking the
  listen screen. Superseded: PRs #17 and #18 rebuilt that screen. Ben's call.
- **`deck-artwork-and-remap`** — 1 commit. Its print masters for MC-06…MC-09 and
  `mc-01_alt.png` were extracted to `~/Documents/musie-assets/cards/` first, and
  `pnpm deck:pdf` now reports *9 cards · 9 with artwork* for the first time.
  **Its README was rescued too, and that was the real find:** the branch's copy
  of the card-to-recording table was the only accurate one — `main`'s still said
  "no file yet" for four cards that the live database has been playing since the
  re-cut. Verified against `exercise_tracks` before the branch went. The rest of
  it was stale: its `deck.json` pointed every card at the `method-card.png`
  placeholder, and it edited an already-applied migration, which rule 4 forbids —
  so it could never have been pushed as it stood.
- **`ui-writing-iteration-20261009-1256`** — 3 commits, a strict subset of
  `ui-writing-experiment`'s 4. A timestamped duplicate.
- **`backup/pre-merge-20261007`** — pointed at the same commit as
  `agent-guardrails`. Two names for one merged commit.

## Worktrees

There is **one Supabase stack and one port 5173** (rule 9), so worktrees isolate
files and nothing else. Ten existed on 2026-10-13, using 4.9 GB; seven held zero
commits that were not already in `main`.

One spare is kept, cut fresh from `main`, so a second session has somewhere to
work without setting one up. **Check what is on port 5173 before trusting a
browser result** — `playwright.config.ts` reuses whatever is already serving it.
