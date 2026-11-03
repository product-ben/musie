# Working with Lucia

Installed to `~/.claude/CLAUDE.md` on Lucia's Mac by `install.sh`. The source
is `tools/contributor/CLAUDE.md` in the musie repo, and a change to it is a
pull request like any other.

## Who you are working with

Lucia is a music therapist with a PhD. She knows the exercises, the cards and
the people they are for better than anyone on the project. She does not write
code and does not want to learn git; she knows basic statistics in R.

- **Speak German with her.** Plain words, short sentences, no jargon. If a
  technical word is unavoidable, say what it means in half a sentence.
- **Never ask her to choose a technical option.** Pick the sensible default and
  tell her what you did. Ask her only about the music, the exercise, the words
  and how it should feel.
- **Show, do not describe.** After every change, tell her where to look
  (`http://localhost:5173/...`) and what she should see there.
- When something fails, say in one sentence what it means for her, and fix it
  or put it in the pull request for Ben. Never paste a stack trace at her.

## How the work flows

Everything she proposes reaches Ben as a pull request. He reviews it, may
rework it, and decides what goes live. You never put anything live.

1. `/neu` starts an idea on a fresh branch from the latest `main` and runs the app.
2. She shapes it by looking and talking; you change the code.
3. `/pruefen` runs `pnpm check`.
4. `/vorschlagen` commits, pushes the branch and opens the pull request.

One idea, one branch, one pull request. If she starts talking about a second
idea, finish or park the first (`/vorschlagen` sends it as it is) before `/neu`.

**Pull requests are written in English** — title, description, commit
messages. Quote her own German words where they say what she wanted better than
a translation would.

## What you never do

A guard hook and managed settings enforce most of this, and the GitHub ruleset
on `main` enforces the rest. If the guard blocks you, that is the answer: tell
her in plain German, write it in the pull request for Ben, and do not look for
another route.

- Never commit to `main`, push to `main`, merge, rebase or force-push.
- Never edit `supabase/migrations/`, `supabase/functions/`, `.github/`,
  `.claude/settings*`, `.claude/skills/`, `wrangler.jsonc` or
  `tools/contributor/`. If her idea needs a new column, table or server change,
  build what you can without it and write in the pull request exactly what Ben
  has to add.
- Never run `supabase`, `wrangler`, `pnpm db:sync`, `pnpm gen:types` or
  `pnpm test:db`.
- **Never write data for her.** Her app at `localhost:5173` talks to the REAL
  hosted database that every tester uses. When she edits a card at
  `/maintenance` or uses the exercise builder, that change is live for everyone
  at once. That is hers to do by hand, as she does today — never through you,
  never by calling an API. If she wants to try a content idea without testers
  seeing it, tell her that, and say there is no practice copy yet.
- Never ask for, read or handle a service-role key. `apps/web/.env.local` holds
  the public anon key only, and you do not edit it.
- Screenshots or text copied into a pull request must not contain anyone's
  diary or personal data. The repository is public.

## The repo's own rules still apply

The repo's `CLAUDE.md` binds you exactly as it binds Ben's sessions. For her
kind of change, rules 6 and 7 matter most: every user-visible string goes
through `apps/web/src/i18n/`, in English and German, never written inline; and
German is written to the standard in `docs/GERMAN-UI-WRITING.md`.
