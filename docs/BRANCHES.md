# Branches that are kept, and what each one is waiting on

On 2026-10-13 this repository had **41 local branches, 34 of them already merged
into `origin/main`**, and 11 remote branches of which 9 were merged. The stalest
local branch was 223 commits behind. It ended the day at **13 local and 2
remote**. Rule 9 says why that is not merely untidy:

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
| `insight-map` | Yours, created 2026-10-13 off `main`. Empty as of that evening. | You. |
| `maintenance-day` | The 2026-10-13 clear-out. Merge and delete. | Review. |

### Held by a worktree, merged, and only waiting for that worktree to go

`1st-week-oct-usertesting-improvements`, `deck-scroll-gesture`,
`listening-features`, `listening-question-iteration`, `listen-infographic`,
`agents/netlify-deployment-setup-plan`. All at zero commits ahead of `main`.
Git refuses to delete a branch a worktree has checked out, which is the only
reason these six survived the prune — not a judgement that they are wanted.

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

**Three were removed on 2026-10-13** — `phase-h` (628 MB), `track-f-editor`
(293 MB) and `agent-guardrails` (31 MB). All three were clean, zero commits
ahead, and had no process running out of them.

**Four were left because a dev server is still running in them**:
`deck-scroll-gesture` (:5178), `listening-features` (:5177), `1st-week-oct`
(:5175) and `listening-question-iteration`. All four are merged and clean, so
they can go the moment those servers are closed — about 2.7 GB.

**Two were left for a reason other than a server.** `listen-infographic` holds
five modified files; they were checked and the work has shipped —
`session.listen.infographicAlt` is in both catalogues on `main` and the picture
is rendered at `SessionListen.tsx:1065` — and its untracked 2.9 MB PNG master is
already in `~/Documents/musie-assets/app graphics/infographics/`. The diff is
saved at `~/Documents/musie-assets/usertesting/listen-infographic-uncommitted-2026-10-13.patch`,
so removing it is now safe whenever you say.
`netlify-deployment-setup-plan` has seven untracked files and **zero tracked
ones** — a 2026-09-14 "Initial commit" for a host that `remove-netlify` took out
on 2026-09-26.

**Check what is on port 5173 before trusting a browser result** —
`playwright.config.ts` reuses whatever is already serving it. On 2026-10-13 the
main checkout's own server was serving a different session's branch, which is
this hazard happening rather than being hypothetical.
