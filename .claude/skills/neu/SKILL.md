---
name: neu
description: Start a new idea for Lucia — a fresh branch from the latest main, and the app running on localhost against the hosted data. Only when she types /neu.
disable-model-invocation: true
---

# /neu — a new idea

Lucia wants to try something. `$ARGUMENTS` is her idea in her own words; if it
is empty, ask her in one German sentence what she would like to change.

Speak German with her throughout. She never sees the commands below; tell her
what happened, not how.

## 1 · Is anything unfinished?

Run `git status --porcelain` and `git branch --show-current`.

- **Uncommitted changes on a `vorschlag/` branch**: an earlier idea is still
  open. Ask her one question: send it to Ben as it is (run `/vorschlagen`
  first), or put it aside. To put it aside, commit it on its branch
  (`git add -- <each changed file>`, then commit "Work in progress, not sent")
  — never discard it.
- **Changes on `main`**: do not commit them, and do not discard them. Tell her
  Ben needs to look at her setup, and stop; this should not happen.

## 2 · A fresh branch from the latest main

```sh
git fetch origin
git switch -c vorschlag/<slug> origin/main
```

`<slug>`: three to five English words from her idea, lowercase, hyphenated —
`vorschlag/longer-pause-after-exhale`. If the name exists, add `-2`.

Then `pnpm install`, quietly; it is fast when nothing changed.

## 3 · Is the app set up to see the real data?

`apps/web/.env.local` must exist and its `VITE_SUPABASE_URL` must be the
hosted project (`https://xliwtiiopwyfunxkdmxh.supabase.co`). Check the URL
only; do not print the key, and do not edit the file. If it is missing or
points at `127.0.0.1`, tell her Ben needs to run `install.sh` again, and stop.

## 4 · Start the app

If something already serves port 5173 (`lsof -iTCP:5173 -sTCP:LISTEN`) and it
is this repo's dev server, reuse it — Vite picks up the branch switch. Otherwise
start `pnpm --filter web dev` in the background.

It prints a warning that the database status is unknown. That is expected on
her Mac; do not mention it.

## 5 · Tell her where to look

In German, three short lines:

- the idea as you understood it, in one sentence;
- the link — `http://localhost:5173` plus the page her idea is about, if you
  know it — and that she signs in with her usual account;
- **that what she changes at `/maintenance` or in the exercise builder is
  live for every tester**, even here. Say this every time; it is the one
  thing about this setup that surprises.

Then wait for her to say what should change.
