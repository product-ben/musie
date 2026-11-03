# Working on Musie with Claude Code

**For a contributor who is not Ben, on a Mac, working through Claude Code in
VS Code.** Written 2026-11-03 for Lucia, as the first. Part 1 is done once;
part 2 is every piece of work.

The short version: you describe what should change, Claude changes the code on
a branch of its own, you look at it running on your computer, and Claude opens
a pull request. Ben reviews it and merges it. **Merging is what ships it** — the
app, and the database with it — so a pull request is the only way anything
leaves your computer. GitHub enforces that: `main` refuses a direct push.

---

## Part 1 · Setting up, once

About an hour, most of it downloads. Do it in order; each step needs the one
before.

### 1.1 · Accept the invitation

GitHub mailed an invitation to `product-ben/musie`. Accept it while signed in
as your own account, or open <https://github.com/product-ben/musie/invitations>.

### 1.2 · Install the tools

Open **Terminal** (⌘-Space, type *Terminal*). Paste each block, press Enter,
and wait for the prompt to come back before the next one.

**Homebrew**, the installer everything else comes through. It asks for your
Mac password; nothing appears as you type, which is normal.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

At the end it prints **"Next steps"** with two or three lines to paste. Paste
them — without them the next commands are not found.

**Everything else — one line at a time.** Homebrew asks *"Do you want to
proceed? [y/n]"* before it installs; type `y` and Enter. Paste several lines
at once and the later lines are read as answers to that question, which shows
as a stream of *Invalid input* (Ctrl-C, then start again line by line).

```bash
brew install git gh node@22 supabase/tap/supabase
```

```bash
brew install --cask visual-studio-code docker
```

```bash
brew link --force --overwrite node@22
```

```bash
corepack enable
```

A warning that `node@22` is *deprecated* is expected: it is in maintenance
until 2027 and it is the version the repository pins.

| Tool | What it is for |
|---|---|
| `git`, `gh` | the code's history, and GitHub from the terminal |
| `node@22`, `pnpm` (via `corepack`) | runs the app; the repo pins both versions |
| `supabase` | runs the database on your Mac |
| Docker | what the database actually runs inside |
| VS Code | where you work |

**Open Docker** once from Applications and let it finish starting (the whale in
the menu bar stops moving). It has to be running whenever the database is.

### 1.3 · Sign in to GitHub from the terminal

```bash
gh auth login
```

Answer: **GitHub.com → HTTPS → Yes (authenticate Git) → Login with a web
browser**. It shows a code; the browser asks for it.

```bash
git config --global user.name "Your Name"
git config --global user.email "the address your GitHub account uses"
```

### 1.4 · Get the code

```bash
mkdir -p ~/Code && cd ~/Code
gh repo clone product-ben/musie
cd musie
pnpm install
```

### 1.5 · Start the database, and fill it

```bash
supabase start
supabase db reset
```

The first `start` downloads several images and takes a few minutes. `db reset`
builds every table and puts the content in. On your Mac this affects nobody
else: the database is yours.

### 1.6 · Tell the app where the database is

```bash
supabase status -o env | grep -E '^(API_URL|ANON_KEY)='
```

Copy `apps/web/.env.example` to `apps/web/.env.local` and set the two lines
from what that printed:

```
VITE_SUPABASE_URL=<API_URL>
VITE_SUPABASE_ANON_KEY=<ANON_KEY>
```

Leave the PostHog lines empty. **Never paste a `service_role` key into this
file** — the app refuses to start with one, and that is on purpose.

### 1.7 · An account to sign in with

The local database starts with no people in it.

```bash
node apps/web/scripts/create-tester.mjs you@musie.test
```

It prints an address and a password. Keep them; they work only on your Mac.

### 1.8 · See the app

```bash
pnpm --filter web dev
```

Open <http://localhost:5173> and sign in. A line about the hosted database
being out of step may appear first — it is a warning for Ben, not for you.
**Ctrl-C** stops the app.

### 1.9 · Claude Code in VS Code

1. Open VS Code → **File → Open Folder…** → `~/Code/musie`.
2. Extensions (⇧⌘X) → search **Claude Code** → Install (publisher: Anthropic).
3. Click the Claude icon in the sidebar and sign in with your own Claude
   Pro/Max account.

Claude reads `CLAUDE.md` at the root of the repository by itself at the start
of every conversation. That file holds the project's rules; you do not need to
learn them, but they are why Claude will sometimes refuse or ask first.

**Check it works:** ask Claude *"What is this repository, and what does
`pnpm check` do?"* A sensible answer about Musie means it is reading the right
folder.

---

## Part 2 · Every piece of work

### 2.1 · Start from the latest `main`

Each new task starts with:

> *Start a new branch from the latest main for: \<what you want to do\>.*

Claude pulls the latest code and creates a branch with a name of its own. One
branch per task: a change to the Klangreise texts and a new screen are two
branches and two pull requests, because Ben may want to ship one and not the
other.

If the database tables changed on `main` since your last reset (Claude will
say so, or the app shows errors), run `supabase db reset` yourself in the
terminal. Claude is not allowed to run it — that rule exists for Ben's machine,
where several sessions share one database, and it is harmless to do by hand on
yours.

### 2.2 · Describe the change

Say what should be different and why, the way you would to a colleague. The
*why* matters: it ends up in the commit and in `apps/web/OPEN-QUESTIONS.md`,
where the next person reads it before changing the same thing back.

Three shapes of task:

- **Copy from `/exercise-builder`.** Download the file (`<id>.json`, or
  `<id>.NEEDS-REVIEW.json`) and drag it into the Claude chat: *"Apply this
  review."* Claude writes a migration for the content and, where you rewrote a
  word the app owns, changes it in `apps/web/src/i18n/`. Today's example is PR
  #48.
- **Text anywhere in the app.** *"On the listen step the button under the
  player should say …"*. German is written to `docs/GERMAN-UI-WRITING.md`;
  Claude writes the English too.
- **Behaviour or screens.** Describe what a person should experience. Expect
  Claude to ask questions first and to read a lot before it writes.

Claude asks permission before running commands. Read what it wants to do; if
it is unclear, ask *"what does that do?"* before saying yes.

### 2.3 · Look at it

> *Start the app so I can look at it.*

Then open <http://localhost:5173> and walk through what changed, in German and
in English (the language switch is in the menu, under *Sprache*). **This is the
part only you can do**: the checks prove the code is consistent, not that a
patient understands the sentence.

### 2.4 · Check, commit, pull request

> *Run pnpm check, then commit and open a pull request.*

`pnpm check` is the project's gate: nothing is called done until it passes.
The pull request appears on GitHub with a description Claude writes; Ben gets
a notification.

### 2.5 · After Ben merges

Nothing more for you. Merging deploys the app and pushes any database change
to the hosted project by itself. Back to 2.1 for the next task.

If Ben asks for changes on the pull request, paste his comment to Claude on
the same branch: *"Ben asked for this on the PR: …"*. New commits on the same
branch update the same pull request.

---

## What you cannot break, and the one thing you can

**Cannot:** `main`, the live app, the hosted database. All three change only
when Ben merges. Your local database can always be rebuilt with
`supabase db reset`, and your branch can always be thrown away.

**Can:** a pull request that looks right and is wrong — a word that reads
well and means something else, a screen that works on your Mac and not on a
phone. That is what 2.3 is for, and why a description with a *why* in it
helps Ben review.

## When something goes wrong

| What you see | What to do |
|---|---|
| `command not found: brew` (or `gh`, `node`…) | Homebrew's "Next steps" lines were not pasted. Close Terminal, open it again, re-run 1.2's first block's last lines. |
| `supabase start` fails mentioning Docker | Docker is not running. Open it, wait for the whale, try again. |
| The app shows a sign-in error or empty lists | The app is not pointed at your database: check 1.6, then stop and restart the app — it reads `.env.local` only when it starts. |
| A recording does not play locally | Tell Ben; some audio lives outside the repository. Not something to fix on a branch. |
| Claude says a command was denied | The project forbids Claude that command on purpose. Ask it why; often you can run it yourself. |
| `git push` to `main` is refused | Correct, and by design. Ask Claude to put the work on a branch and open a pull request. |

## For Ben

- **Access:** `lvonda`, *write* on the repository. `main` requires a pull
  request with one approval, stale approvals are dismissed, no force-push, no
  deletion; admins are not enforced, so you can still merge your own.
- **Apps:** her app account is on two allowlists — `content-admin`
  (`/maintenance`) and `exercise-prompt` (`/exercise-builder`'s prompt box).
  Neither needs anything for this setup; a local Edge Function has no
  Anthropic key, so the builder's prompt box works on the hosted app, not on
  `localhost`.
- **Things that stay yours:** `pnpm db:sync`, `supabase functions deploy`,
  Cloudflare, any secret. She has no Supabase dashboard login and does not
  need one.
