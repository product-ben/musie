# Branches that are kept, and what each one is waiting on

On 2026-10-13 this repository had **41 local branches, 34 of them already merged
into `origin/main`**, and 11 remote branches of which 9 were merged. The stalest
local branch was 223 commits behind. It ended the day at **9 local and 2
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
| `digital-cards` | Active work, in its own worktree. **Kept on Ben's instruction** — the branch and everything on it. | Ben. |
| `insight-map` | The org canvas. **Merged as PR #20**, so its work is on `main`; the branch is kept because Ben is still working from it. | Ben. |
| `ui-writing-experiment` | The localhost copy editor — `src/experiments/uiWriting/`, an overlay that rewrites copy where you are reading it and hands back a prompt. | Ben. A decision about whether this ships or stays a local tool. |
| `feelings-detection-help` | `supabase/content/emotion-wheel.yml` — 128 feelings, each with a position, plus the log entry that argued the shape. | Ben, who is continuing it. **Deliberately kept**: data for something unbuilt, which is exactly what an automated prune reads as abandoned. |
| `exercise-model` | `docs/EXERCISE-MODEL-PLAN.md`. How an exercise is assembled today — four locations that cannot be read together — and the JSON schema that would replace them, toward an exercise builder for a music therapist. No code. | Its own day. Step 3 of its plan depends on `apps/web/scripts/_migration.mjs` being extracted first. |
| `maintenance-day` | The 2026-10-13 clear-out. Merge and delete. | Review. |

### Held by a worktree, merged, and only waiting for that worktree to go

`listen-infographic` and `agents/netlify-deployment-setup-plan`. Both at zero
commits ahead of `main`. Git refuses to delete a branch a worktree has checked
out, which is the only reason they survive — not a judgement that they are
wanted. See the worktree notes below for what is in each.

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
- **`insight-board`** — 1 commit, 86 files, SHA `2f4b1fa`. The earlier `/insight`
  provocation, superseded by `insight-map`, which merged as PR #20. Ben's call.
- **`ui-writing-iteration-20261009-1256`** — 3 commits, a strict subset of
  `ui-writing-experiment`'s 4. A timestamped duplicate.
- **`backup/pre-merge-20261007`** — pointed at the same commit as
  `agent-guardrails`. Two names for one merged commit.

## Worktrees

There is **one Supabase stack and one port 5173** (rule 9), so worktrees isolate
files and nothing else. Ten existed on the morning of 2026-10-13 using 4.9 GB.
**Six remain, using 2.0 GB.**

| Worktree | Why it is still here |
|---|---|
| `musie` (the main checkout) | Ben's, on `insight-map`. |
| `digital-cards` | Active work. |
| `feelings-detection-help` | Two unmerged commits Ben is continuing. |
| `maintenance-day` | This clear-out. Goes when it merges. |
| `listen-infographic` | Five modified files, **checked and shipped** — `session.listen.infographicAlt` is in both catalogues on `main` and the picture renders at `SessionListen.tsx:1065`; its untracked 2.9 MB master is already in `~/Documents/musie-assets/app graphics/infographics/`. The diff is saved at `~/Documents/musie-assets/usertesting/listen-infographic-uncommitted-2026-10-13.patch`, so removing it is safe whenever Ben says. |
| `netlify-deployment-setup-plan` | Seven untracked files and **zero tracked ones** — a 2026-09-14 "Initial commit" for a host that `remove-netlify` took out on 2026-09-26. Nothing to lose; just not yet removed. |

**Seven were removed on 2026-10-13**, 3.6 GB in total. Three were idle —
`phase-h` (628 MB), `track-f-editor` (293 MB), `agent-guardrails` (31 MB). Four
had forgotten dev servers running in them on ports 5175, 5177, 5178 and 5179 —
`1st-week-oct`, `deck-scroll-gesture`, `listening-features`,
`listening-question-iteration`, 2.7 GB — closed at Ben's request once he had
confirmed none was a window he was using. All seven were clean and at zero
commits ahead.

**Check what is on port 5173 before trusting a browser result** —
`playwright.config.ts` reuses whatever is already serving it. On 2026-10-13 the
main checkout's own server was serving a different session's branch, and the
checkout switched branches mid-session so that a commit landed on the wrong one.
That is this hazard happening rather than being hypothetical, and it is why the
clear-out moved into a worktree of its own partway through.
