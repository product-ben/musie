# Open questions

Two append-only logs, **12,978 lines between them**, and they are the most
useful documents in the repository. This page is a way in, not a replacement.

| Log | Lines | Entries | Logs |
|---|---|---|---|
| `apps/web/OPEN-QUESTIONS.md` | 8,730 | 263 | questions the **app** has — including questions the app has *about* the system |
| `packages/design-system/stories/OPEN-QUESTIONS.md` | 4,248 | 118 | questions about the **system itself** |

::: designers
## What they are for

**An empty log would be a failure signal.** That is the premise: a brief whose
premise is wrong about the repository, or a fix that belongs in the design
system rather than in the app, goes into the log rather than being quietly
worked around.

So the logs are where you find out *why* something is the way it is when the
code only shows *that* it is.

## They include questions that were answered

Not just open ones. An entry marked **RESOLVED** is as valuable as an open one —
often more so, because it stops the same question being asked again.

## The format

Every entry answers the same six things:

```
## Topic — the question in one line
Where:                  file and line
What I checked:         which level, and what each said
What I did:             the choice
Why:                    one sentence
What I need from Ben:   the decision, or "nothing, just flagging"
```

That last line is the one to scan for if you are looking for things that need a
decision.

## Worth knowing: the first entry is a brief being wrong

The opening entry records an instruction to render errors as plain text
*because* "the design system has NO Message component — deliberately deleted,
nothing replaces it."

It was not deleted. It exists, it is exported, and three other components import
it for their own error prop. **The log is where that got recorded instead of
being worked around** — which is the whole method, demonstrated on page one.

## Where to look for what

| Looking for | Try |
|---|---|
| why a screen is shaped like this | `apps/web/OPEN-QUESTIONS.md` |
| why a component's API is like this | the design system's log |
| why a column is like this | `DOMAIN-MODEL.md`'s D-numbers |
| what was ruled and will not be re-opened | [Decisions](/work/decisions) |
| what is scoped and not started | [Backlog](/work/backlog) |
:::

::: devs
## Searching them

They are long enough that reading is the wrong verb.

```bash
# everything still waiting on a decision
grep -n "What I need from Ben" apps/web/OPEN-QUESTIONS.md | grep -iv "nothing"

# every entry heading
grep -n "^## " apps/web/OPEN-QUESTIONS.md

# resolved ones
grep -n "^## .*RESOLVED" apps/web/OPEN-QUESTIONS.md

# by phase
grep -n "^# Phase" apps/web/OPEN-QUESTIONS.md
```

## Append-only means append-only

An entry is never edited to be correct later. A follow-up is a new entry that
says what changed. So the log reads as a history and not as a state — which is
why a single entry read on its own can be stale, and why the phase headings
matter.

## Adding one

The format is at the top of the file, and matching it matters more than it
looks: the six fields are what make the log greppable, and the *What I need
from Ben* line is the only machine-findable list of pending decisions in the
repository.

## What is logged here rather than fixed

Per `CLAUDE.md`'s closing rule:

- a brief whose premise is wrong about the repository;
- a fix belonging in the design system rather than in the app;
- a constraint discovered that contradicts a written rule;
- a decision that was taken and then lost to a later change.

That last category is the easiest to lose. A worked example: `/settings` let
every "Here as" type be selected and ignored the implemented flag, on the
argument that **a preference is something you are entitled to record whether or
not the product has caught up with it.** Deleting that screen silently reversed
that decision — and the log says so, rather than leaving it to be rediscovered.

## The design system's log is a different question

4,248 lines, 118 questions raised while writing 258 stories. It is where a
component's API is argued with — and the reason `CtaButton` has an `align` prop
at all.

Read `packages/design-system/stories/CONVENTIONS.md` beside it.

## This site logs into them too

`apps/docs` is a derived view and does not fix the code it describes. Anything
found while writing a page goes into `apps/web/OPEN-QUESTIONS.md` in that
file's format — which is where the stale comment on the reflect step's voice
mode went.
:::

---

**Source of truth:**
[apps/web/OPEN-QUESTIONS.md](https://github.com/product-ben/musie/blob/main/apps/web/OPEN-QUESTIONS.md),
[packages/design-system/stories/OPEN-QUESTIONS.md](https://github.com/product-ben/musie/blob/main/packages/design-system/stories/OPEN-QUESTIONS.md),
[CLAUDE.md](https://github.com/product-ben/musie/blob/main/CLAUDE.md).
