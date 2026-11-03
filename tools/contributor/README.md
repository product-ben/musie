# Contributor setup — proposing changes, never shipping them

How Lucia (or anyone after her) works on this repo with Claude Code: every idea
becomes a branch and a pull request, and only Ben's merge reaches `main`, which
is to say testers. The plan and its trade-offs:
https://claude.ai/artifact/YExmM6A7Jti1tHRRQ4Ckv2

## Three layers, and which one holds

| Layer | Where | What it is |
|---|---|---|
| **Ruleset on `main`** | GitHub | The wall. A PR, one approval and code-owner review are required; force-push and deletion are blocked; only the repo admin bypasses. Holds against anything run under her GitHub account |
| **Managed settings + guard** | `/Library/Application Support/ClaudeCode/` on her Mac, root-owned | Stops Claude early: no push to `main`, no merge, no Supabase or Wrangler, no edits to schema, functions, CI or these files. Not security — a convenience that fails closed |
| **Instructions + skills** | `~/.claude/CLAUDE.md`, `.claude/skills/{neu,pruefen,vorschlagen}` | Makes the safe path the easy one, in German, without git |

The second layer is only worth anything because the first exists. **She must
use her own GitHub account**: on `product-ben`, GitHub cannot tell her from the
admin, and the ruleset lets her through. `install.sh` refuses to run if `gh` is
signed in as `product-ben`.

## Files

| File | Installed to |
|---|---|
| `managed-settings.json` | `/Library/Application Support/ClaudeCode/managed-settings.json` |
| `musie-guard.mjs` | beside it; the PreToolUse hook |
| `CLAUDE.md` | `~/.claude/CLAUDE.md` |
| `install.sh` | — runs the three copies, writes `apps/web/.env.local`, `pnpm install` |

A change here is a pull request like any other, and does nothing on her Mac
until `install.sh` runs again there. The guard blocks her own Claude from
editing this folder.

## Setting up her Mac

1. Xcode command-line tools, Homebrew, `brew install node@22 gh`, `corepack enable`.
2. `gh auth login` **as her account**; `git config --global user.name` and
   `user.email` to hers.
3. `gh repo clone product-ben/musie && cd musie`.
4. `pbcopy` the hosted **anon** key (Supabase dashboard → Project Settings →
   API). The script checks that it is not a secret key and clears the
   clipboard after.
5. `tools/contributor/install.sh` — asks for her admin password once.
6. Sign in to Claude, then try it together: ask Claude to push to `main` (it
   must refuse), then `/neu` with one harmless string and `/vorschlagen`.

## On GitHub

She needs **Write** access to push branches:

```sh
gh api -X PUT repos/product-ben/musie/collaborators/<her-login> -f permission=push
```

The ruleset on `main` is named `main is reviewed` (Settings → Rules →
Rulesets). With it, **your own pull requests no longer merge without a
bypass**: tick "bypass rules" in the merge box, or `gh pr merge --admin`.
Direct pushes from your account still work, because the admin role is on the
bypass list.

## What this does not cover

- **Data.** Her localhost reads and writes the hosted database. `/maintenance`
  and the exercise builder are live for every tester from there, exactly as
  from musie.org. Her `CLAUDE.md` forbids Claude to write data; she edits by
  hand, as before. A practice copy (`pnpm content:pull` + a local stack) is
  logged in `apps/web/OPEN-QUESTIONS.md` and not built.
- **The Claude login.** Shared with Ben's today. A personal plan is for one
  person; her own seat is the clean option and changes nothing here.
