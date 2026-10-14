# Decisions

What was decided, and why — **the ruling and the reason, not the discussion**,
so nobody re-opens it by accident and no agent re-proposes something already
refused.

`DECISIONS.md` is append-only, newest part first, and each entry has a stable id
so a code comment can cite it. **A decision that turns out wrong is not edited:
a new entry supersedes it and says so.**

| Part | Date | Entries |
|---|---|---|
| **Part 2** · the documentation site | 2026-10-13 | DOC1–DOC4 |
| **Part 1** · maintenance day | 2026-10-13 | M1–M17 |

**And it is incomplete by design.** The large body of product and architectural
decisions is still to be brought in — see *What is still owed* below.

::: designers
## Part 2 · The documentation site

| | Decided |
|---|---|
| **DOC1** | The site is a **derived view**. Nothing moves; each page names the file that rules it. Moving the long documents would break 66 citations, two inside applied migrations that cannot be edited |
| **DOC2** | One Pages deployment serves both sites. **Storybook moved to `/storybook/`** — a Pages deploy replaces the whole site, so two workflows would clobber each other |
| **DOC3** | Every page is written twice, and the switch is **CSS**: no flash, both halves searchable, and with JavaScript off the page reads as both |
| **DOC4** | The docs build runs in the **branch** gate as well as the publish one — a dead link should be caught before the merge |

## Part 1 · Maintenance day

The ones that change how you work:

| | Decided |
|---|---|
| **M1** | **Source masters live outside the repository**; web renditions live in it. Git keeps every binary forever, every worktree copies it, and a binary diff tells a reviewer nothing. The repository is **public** |
| **M4** | The design system's `assets/` **stays** — they ship as part of the package and `Logo`'s prop is documented against them |
| **M10** | `DataLightbox` deleted, and **its privacy copy went too** on Ben's call. What survives is three promises rendered **at the control each is about** — which is the placement user testing argued for. There is no longer a single page stating all of it; if that is wanted back, it is a screen, not a string |
| **M15** | `size="comfort"` is **reserved, not dead** — the rung for elderly and for children |
| **M16** | The two-stream spike is **kept** as `/dev/experiment-mixer`. Its question was answered and arrived with a second one attached |
| **M17** | `insight-board` goes; `insight-map` and `digital-cards` stay |

And the ones about the machinery — [CI/CD](/architecture/ci-cd) and
[Local stack](/architecture/local-stack) explain each: **M5** (a guard replaces
a prohibition), **M6** ("I could not check" must never look like "they agree"),
**M7** (the reminder hangs off `pnpm dev`), **M8** (migration push is
automated and ships inert), **M9** (the db suite seeds its own storage object),
**M11** (rule 8 says two of three, not every package), **M12** (the publish
workflow stops re-running the gate), **M13** (no measurement, no change).

## The one still open

**M8** asks: should the migration push be **fully automatic, or one click?**
Actions and a required-reviewer environment are both free here because the
repository is public. Adding an environment to the job makes the push wait for
approval.

## What is still owed

Named so the gap is visible rather than assumed:

- **The September user-testing round** — roughly **60 action decisions, 35
  explicit refusals with reasons, 30 "already resolved, do not re-propose"
  notes and 20 open questions**, across six surfaces. The raw board export sits
  outside the repository. **The refusals are the most valuable and most easily
  lost half.**
- **The architectural decisions already settled** in the two append-only logs
  and the domain model's D-numbers.
:::

::: devs
## Where decisions actually live

| File | Holds | Shape |
|---|---|---|
| `DECISIONS.md` | the rulings | append-only, newest part first, stable ids |
| `apps/web/OPEN-QUESTIONS.md` | **8,730 lines, 263 entries** | append-only, one entry per question |
| `packages/design-system/stories/OPEN-QUESTIONS.md` | **4,248 lines** | questions about the system itself |
| `DOMAIN-MODEL.md` | D-numbers — schema decisions | with **CHANGED** and **CORRECTED** markers |
| `BACKLOG.md` | work scoped and not started | B-numbers |
| `CLAUDE.md` | the guardrails | nine rules, each citing its evidence |

## How to cite one

By id, in a code comment: `(M12)`, `(D14)`, `(DOC2)`. That is what the ids are
for, and it is why they never change.

## Reading `DECISIONS.md`'s own header carefully

> **This file starts on 2026-10-13 and is incomplete by design.**

So its absence of an entry is **not** evidence that something was never
decided. Check the two logs and the domain model before concluding a question
is open. That is also what rule "log what you could not resolve" is for.

## The ones that will bite you if you do not know them

| | |
|---|---|
| **M5** | `supabase db push` stays denied; `pnpm db:sync` is allowed and **refuses** off `main`, dirty, or out of step with origin |
| **M6** | `db:status` exits **0 in sync, 1 drifted, 2 unknown** — and prints UNKNOWN with "This is NOT in sync" |
| **M9** | the `db` vitest project has a `globalSetup` that seeds the one storage object it asserts about — reusing `e2e/fakeTracks.ts` rather than rewriting it |
| **M11** | `pnpm -r run test` **passes over `packages/design-system` silently** |
| **M12** | a red `ci.yml` no longer blocks a Pages deploy. Stated trade-off |
| **M13** | `playwright.config.ts`'s `workers: 1` is untouched because **no measurement** was possible |
| **M14** | the exercise model is its own branch, carrying a plan and nothing else |

## BUILD-PLAN.md's own wrinkle, which is a decision about decisions

It is cited **66 times across 23 files**, fourteen in code, and **two of those
are inside applied migrations that rule 4 forbids editing.** A rename breaks all
66 and two permanently — so the plan is to make `BUILD-PLAN.md` a ten-line
forwarding address rather than move it.

That is also the argument that made this site a derived view (DOC1).

## The ids in use

```
M1–M17     maintenance day, 2026-10-13
DOC1–DOC4  the documentation site, 2026-10-13
D1–D14…    schema decisions, in DOMAIN-MODEL.md
B1–B5      scoped and not started, in BACKLOG.md
L0–L15     the design system's layout rules
G1, G2     the two token gaps in the amendments file
```
:::

---

**Source of truth:**
[DECISIONS.md](https://github.com/product-ben/musie/blob/main/DECISIONS.md),
[apps/web/OPEN-QUESTIONS.md](https://github.com/product-ben/musie/blob/main/apps/web/OPEN-QUESTIONS.md),
[DOMAIN-MODEL.md](https://github.com/product-ben/musie/blob/main/DOMAIN-MODEL.md),
[BACKLOG.md](https://github.com/product-ben/musie/blob/main/BACKLOG.md).
