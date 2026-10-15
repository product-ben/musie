# Scheduled maintenance

Work that is triggered by a **date** rather than by a decision or a backlog
priority. Credentials that expire, configuration that goes stale on a clock,
anything where nobody will notice the right moment unless it is written down.

`DECISIONS.md` is what was decided. `BACKLOG.md` is what is scoped and not
started. **This is what a calendar should be telling you.**

One line per task, soonest first. Each says what breaks if it is missed, and —
this is the part worth getting right — **how you would find out.**

---

## Due 2027-10-13 · Rotate the Supabase access token

**Owner: Ben.** Created 2026-10-13 with a one-year expiry. *Check the real date
at supabase.com/dashboard/account/tokens — the expiry below is from Ben's note
on the day, not read from the dashboard.*

### What it is for

`SUPABASE_ACCESS_TOKEN`, one of the two GitHub Actions secrets that arm
`.github/workflows/db-push.yml`. It does two jobs in that workflow: it
authenticates `supabase link` and `supabase db push`, and it fetches the anon
and service-role keys at run time so they do not have to be stored as secrets
of their own.

### What breaks when it expires

The workflow fails on its `supabase link` step. **Migrations merged into `main`
then stop reaching the hosted database** — which is precisely the problem the
workflow was built to remove. The failure is loud in GitHub and silent
everywhere else.

### How you would find out — two ways, and the second is the one that matters

1. **GitHub emails you** that the workflow failed. Reliable, and easy to skim
   past, which is the whole reason this file exists. **Read WHICH STEP failed
   before believing it is this.** On 2026-10-15 two runs died in `setup-cli`
   with *rate limit exceeded* — before `link`, so they said nothing about any
   credential while looking identical to the runs that did. The CLI version is
   pinned now for that reason. A credential fault stops at *Link the project*;
   anything earlier is not one.
2. **`pnpm db:status` starts saying DRIFTED**, and
   `pnpm --filter web dev` says it in a box before the dev server starts. That
   backstop was built for a different failure — automation that quietly stopped
   — and an expired token is exactly that failure. So the drift gets caught even
   if the email does not.

What will **not** tell you: `pnpm check`. It never touches a database (rule 4).
Nor local `pnpm db:status` *immediately* — it authenticates with the CLI's own
login, which is separate from this token, so it will keep working and keep
saying IN SYNC right up until a migration actually goes unpushed.

### Doing it

```
# 1 · new token at supabase.com/dashboard/account/tokens
# 2 · replace the secret (prompts; nothing is echoed or kept in shell history)
gh secret set SUPABASE_ACCESS_TOKEN --repo product-ben/musie
# 3 · prove it, without waiting for a migration
gh workflow run "Database" --repo product-ben/musie
```

Step 3 is the point. The workflow takes `workflow_dispatch` precisely so it can
be exercised on demand rather than only by a merge — and with nothing pending it
is a no-op push followed by the 142 database tests against hosted, which is a
safe way to confirm the whole path still works.

Then delete the old token in the dashboard, and update the date at the top of
this entry.

---

## No date yet, and would belong here if they get one

Named so they are not forgotten, not as tasks:

- **`SUPABASE_DB_PASSWORD`** — the other Actions secret. No expiry, so no entry.
  Worth knowing: it is stored in **no file on this machine**, and nothing but the
  Supabase CLI connects directly to Postgres, so resetting it in the dashboard
  breaks nothing. Verified 2026-10-13.
- **`OPENAI_API_KEY`** in `supabase/functions/.env` — no expiry, but it is the
  one credential here that bills by use. If it is ever rotated on a schedule,
  that schedule belongs in this file.
- **The Epidemic Sound licence** is a *subscription*, not per-track clearance
  (`~/Documents/musie-assets/music/Card based exercises/README.md`). If it ever
  lapses, every recording in the deck changes status at once. There is no date
  in the repository for it; if there is one in a calendar, it belongs here.
- **`wrangler.jsonc`'s `compatibility_date`** is pinned at `2026-09-22`. Not an
  expiry — a deliberate pin — but it is the kind of thing that is reviewed on a
  clock rather than prompted by a failure.
- **`db-push.yml`'s Supabase CLI version**, pinned at `2.117.0` on 2026-10-15
  for the reason in the entry above. Same kind of thing as the line before it,
  with one difference worth knowing: this pin is what the hosted database is
  migrated BY, so it is the one place where a stale version reaches production.
  Move it when the local CLI moves, not on a schedule — `supabase --version` is
  the number to match.

## Adding one

Put it in date order, and answer three questions: what breaks, how you would
find out, and the exact commands. The second question is the one people skip,
and it is the only one that decides whether the entry ever gets read in time.
