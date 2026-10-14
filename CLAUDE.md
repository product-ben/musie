# CLAUDE.md

Guardrails for this repo. Each rule is already load-bearing and cites the file
that proves it — read the file before arguing with the rule.

## Orientation

pnpm workspace (`pnpm-workspace.yaml`), Node 22, pnpm pinned by `packageManager`:

- `apps/web` — the React 19 / Vite / react-router app. The only consumer of
  the design system.
- `apps/docs` — the documentation site. VitePress, published to GitHub Pages at
  `/musie/`, with Storybook beside it at `/musie/storybook/`. A **derived
  view**: each page names the file in this repo that rules it, so a page that
  disagrees with the repo is a bug in the page.
- `packages/design-system` — `@musie/design-system`: Layer 1 tokens, Layer 2
  components, Layer 3 layout docs, Storybook.
- `supabase/` — `config.toml` and `migrations/`. Local stack only (rule 4).

| Command | |
|---|---|
| `pnpm check` | the gate: typecheck + lint + unit tests |
| `pnpm test:db` | database security + parity tests, against the local stack |
| `pnpm --filter web dev` | the app on :5173 |
| `supabase start`, `supabase db reset` | the local stack; reset re-applies every migration |
| `pnpm gen:types` | regenerates `apps/web/src/lib/database.types.ts` from the local DB |
| `pnpm db:status` | do the migration files and the HOSTED database agree? read-only |
| `pnpm db:sync` | push merged migrations to hosted. Refuses off `main`, dirty, or out of step with origin |
| `pnpm storybook` | the design system on :6006 |
| `pnpm --filter docs dev` | the documentation site. `build` fails on a dead link |
| `pnpm deck:migration` | **retired 2026-10-14.** Refuses, and says where the deck is edited now |
| `pnpm content:export` | the database → `deck.json`, `music.json`'s pieces and `grid.json`. The snapshot, not the source |
| `pnpm deck:pdf` | the paper deck, print-ready, from `deck.json` |

Planning documents: `BUILD-PLAN.md` (phases, and what "done" means),
`DOMAIN-MODEL.md` (schema and its open questions),
`apps/web/OPEN-QUESTIONS.md` (append-only; what was decided and why — read it
before re-deciding anything), `packages/design-system/docs/10-layout.md`
(Layer 3), `packages/design-system/README.md`,
`supabase/content/README.md` (the deck: one file, and the loop that turns an
edit of it into a migration and a printed card). Local config: copy
`apps/web/.env.example` to `.env.local`, anon key only.

## 1 · The app consumes the design system; it does not reimplement it

Import from `@musie/design-system` and pass props. Never reference a raw scale
token (`--sand-*`, `--green-*`, `--terracotta-*`, and the `--success-*` /
`--warning-*` / `--error-*` status scales) from `apps/web`:
semantic aliases only. There are zero raw-scale references today; keep it so.

A custom pattern is permitted **only where the system has no component**
(`10-layout.md` L14). Then every declaration resolves to a Layer 1 token
or arithmetic over one (L14.1), and the class is prefixed `musie-`, never
`musy-`, so a screen file can never be mistaken for a system file (L14.2).
A pattern that recurs is a **component request**, not a second copy (L14.3) —
`.musie-sheet` is the live example, logged in `apps/web/OPEN-QUESTIONS.md`.

A screen never reaches into a component's own geometry (L14's opening rule,
and L7). When a component cannot do what a screen needs, the fix goes into the
component: that is why `CtaButton` has an `align` prop instead of the app
overriding `justify-content`.

The four design-system stylesheets load once, at the app root, in the README's
order — `musy-fonts` → `musy-foundations` → `musy-foundations-amendments` →
`musy-components` (`apps/web/src/main.tsx`). That order is load-bearing.

## 2 · Every migration that creates a table: RLS, policies, revoke, then grant

Enable RLS, write the policies, **revoke, then grant** — to `authenticated`
what the client may read, **and to `service_role` what the server may**. The
second half is not optional and is easy to miss: `service_role` has `BYPASSRLS`,
so one assumes the grants are irrelevant to it too. They are not — Postgres
checks table privileges first, for every role.

It was missed. The hosted project is created with *Automatically expose new
tables* **off**, which is also what switches off the local stack's default
grant to `service_role` — so on 2026-09-21 the role held nothing on any table,
23 db tests failed in three files for one cause, and `reveal-track` (E.5) would
have failed three phases later with no test around it. Fixed by
`20260921100000` and `20260921103000`; read the second for why the first was
too narrow.

The revoke is not decoration: the local stack ships `alter
default privileges in schema public grant all on tables to postgres, anon,
authenticated, service_role`, so a new table arrives **already fully granted to
`anon` and `authenticated`**, and a later column-level grant merely ADDS to a
table-wide grant already there. The column grant on `public.tracks` (`id, src,
duration_seconds, licence_ref` — not `title`, not `artist`) is the live example:
without the revoke it would look implemented while doing nothing.

Read the ACCESS section of `20260918150500_content_schema.sql` and the "taking
back what nobody asked for" block in `20260918142704_profiles.sql`, both under
`supabase/migrations/`.

## 3 · Never disable RLS to make something work

A query returning nothing means a missing policy or a missing grant.
`alter table ... disable row level security` is not a debugging step.

## 4 · Migrations STACK. Never edit an applied one

**This rule inverted on 2026-09-21**, when `project-musie`
(`xliwtiiopwyfunxkdmxh`, Frankfurt) was linked and all eight migrations pushed.
Until then a content change edited the existing migration as though it had
always said that; every earlier file's history was rewritten that way, which is
why their timestamps say September 18 and their contents do not.

That freedom is gone. Supabase records an applied migration **by timestamp, not
by content**, so editing a pushed file changes nothing on the remote and is
skipped in silence — local and hosted drift apart and every check reports
success. Every change is now its own new migration with `alter table`.

Verify with `supabase db reset` locally, and **`pnpm db:sync`** to send it.

**The two databases drift silently, and that is the trap.** `pnpm check` never
touches a database, so typecheck, lint, tests and CI are all green while the
migration files and the hosted database disagree — and the failure surfaces
later, elsewhere, looking unrelated.

- `pnpm db:status` answers whether they agree. Read-only, no secret in any file
  (it authenticates with the CLI's own login). Exit 0 in sync, 1 drifted,
  **2 unknown** — and *unknown* is never printed as *in sync*, because "I could
  not check" and "they agree" looking alike is the original bug.
- `pnpm db:sync` pushes, and **refuses** unless you are on `main`, the working
  tree is clean, and `main` is level with `origin/main`. Each refusal has a
  reason written into the script. Raw `supabase db push` stays denied: the guard
  is the point, and it guards everyone.
- `pnpm --filter web dev` runs the check first and **warns without blocking**.
- `.github/workflows/db-push.yml` does it on merge to `main` and then runs the
  database suite against hosted — inert until two secrets exist, and the file
  says which.

Content lives in a migration rather than `supabase/seed.sql` because `supabase
db push` does not run `seed.sql` — header of `20260918150600_content_seed.sql`.
**For four tables that stopped being true on 2026-10-14; read the next
paragraph before you generate anything.**

### 4.1 · Content does not travel by migration any more — four tables

`cards`, `card_i18n`, `tracks` and the new `grid_cells` / `artworks` /
`artwork_i18n` are edited at **`/maintenance`** and live in the database.
`20261014100100_maintenance_import.sql` is the last migration that will ever
state deck content.

**This is the rule most likely to be broken by somebody who read the old one.**
A generated deck migration states the WHOLE deck — upserting every row and
deleting what the file no longer has — so generating one now puts the file's
version back over whatever an operator changed, on the next `supabase db
reset` or the next merge to `main`. Silently, with every check green. That is
rule 4's own trap arriving through the door this change opened, which is why
the guard is in code and not only here:

- `pnpm deck:migration` **refuses** and prints where the deck is edited now.
- `pnpm music:migration` writes `exercise_cuts` **only**. The `tracks` half
  came out, and that is the single most important line of the change: it is
  the overlap that would otherwise clobber an edit on the next run.
- `exercise_tracks` and `cards.image_url` are **derived**, rewritten by
  `public.project_deck()` on every admin write. A row written there by hand
  for a card is erased by the next cell change.

Three things follow:

- **Schema still travels by migration, and rule 4 is untouched for it.** A
  column, a constraint, a function: new file, new timestamp, `pnpm db:sync`.
- **`supabase db reset` now yields FACTORY content, not live.** The import
  reproduces the deck as it stood on 14 October, so local and hosted agree
  until the first real edit through the UI; after that they do not, and
  `pnpm content:pull` — which would close the gap — is logged in
  `apps/web/OPEN-QUESTIONS.md` and not built.
- **`pnpm db:status` becomes exactly as truthful as it claims.** It compares
  migration files to hosted, and migrations now carry only schema.

Where a content change's REASON lives now is `public.content_edits`: one
append-only row per write, naming the operator, the moment, and the before and
after. It replaces a migration header and is better at it — it names the
person who decided rather than the engineer who typed. A revert is a new row;
nothing rewrites history, and nothing in the schema can be hard-deleted,
because a history must always have something to return to.

The write surface is one SQL function, `public.admin_write`, reached only by
the `content-admin` Edge Function, which holds the service role and the
allowlist of who may call it. **Changing that allowlist is an edit to
`supabase/functions/content-admin/index.ts` and a `supabase functions deploy`
— no workflow covers it.** The client holds no copy of the list, so a
maintenance screen that refuses is the function refusing.

`MAINTENANCE-UI.md` is the whole argument; `MAINTENANCE-UI-PLAN.md` is how it
was built.

**`pnpm test:db` runs against whichever database you point it at.** Bare, it
uses the local stack. Set `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY` and
`SUPABASE_TEST_SERVICE_ROLE_KEY` — all three or none — to run it against
hosted, which is how the `service_role` hole in rule 2 was found. It prints its
target on the first call. Pass the keys for one run; the service-role key does
not belong in a file.


Run `pnpm test:db` after any change under `supabase/migrations/`. It is
deliberately **not** in `pnpm check`: CI runs `check` on a runner with no
Supabase, and a suite that silently skips is worse than no suite (`ci.yml`).

## 5 · `<html lang>` follows the active locale

Not cosmetic. Layer 1 sets `--text-hyphens: auto`, which the wrapping-text
rules in `musy-components.css` consume, and `hyphens: auto` hyphenates by the
element's **declared** language — so German under `lang="en"` breaks German
compounds at English hyphenation points, silently. `apps/web/index.html` sets it
pre-paint from the cached locale, `LocaleProvider` keeps it in step, and both
must stay true.

## 6 · A missing or placeholder German string is written, not reported

Write it, to the standard in `docs/GERMAN-UI-WRITING.md`. Do not leave a
placeholder and flag it. Two kinds of copy, and they are not the same:

- **Chrome** — `apps/web/src/i18n/*`. Ours and permanent. `de.ts` is typed
  against `en.ts`, so a key added in English without German fails `pnpm check`.
- **Content** — the content tables. The Mindfulness Cards spreadsheet's, and
  **provisional**: it will be overwritten, and the seed says so.

`select * from public.missing_translations` finds every hole. Do not translate
`tracks`: a title and an artist name are not translated, which is why that table
has no `_i18n` sibling.

## 7 · Every user-visible string is passed explicitly

Never let a design-system default through. Those defaults are a mix of German
and English — `Lightbox` `closeLabel` is `'Schließen'`, `RadioGroupText` /
`RadioCards` / `RadioGroupImage` `emptyLabel` is `'Keine Optionen verfügbar'`,
`ContentList` `emptyLabel` is `'Noch keine Einträge'`, `RecordButton`
`readyLabel` is `'Record Now'` — so one leaked default makes the UI half-German
whatever the locale says. Grep `packages/design-system/src/` before assuming a
prop has a safe default.

Nothing user-visible is written inline in `apps/web`, placeholder route titles
included (`apps/web/src/i18n/en.ts`). `MessageKey` is `keyof typeof en`, so an
unknown key is a typecheck error rather than a runtime fallback.

## 8 · `pnpm check` passes before anything is called done

Typecheck and lint across every package; **unit tests across three of the four**
(root `package.json`). CI runs the same command plus both bundle builds, because
`tsc --noEmit` resolves neither CSS imports nor the font-pinning Vite plugin
(`.github/workflows/ci.yml`). Verify against `supabase start` and
`pnpm --filter web dev`, never a URL — nothing deploys in this phase.

**Three of four, and it is worth knowing which.** `packages/design-system` has
no `test` script, so `pnpm -r run test` passes over it without a word. What covers
it instead is real but different in kind: `verify-tokens.mjs` and
`verify-layout.mjs` run inside its `typecheck`, and the `Smoke/Badge` story
proves all four stylesheets and `data-theme` reached the preview. So the design
system is asserted about, not unit-tested — and this rule said "every package"
until 2026-10-13, which is the shape of claim that stops being read. It said
"two of three" until `apps/docs` arrived the same day with tests of its own.

## 9 · A worktree isolates files and nothing else

Parallel sessions run in `../musie.worktrees/*`. Each gets its own checkout;
they share one machine, and the shared half is invisible to git — nothing in
`git status` reports that another agent moved it.

**There is one Supabase stack.** `supabase/config.toml` declares `project_id =
"musie"` and fixed ports (54321 api, 54322 db, 54323 studio), so every
worktree's `supabase` command drives the same Docker containers. A `db reset`
run from one branch re-applies *that branch's* migrations over whatever another
agent is testing against; its `pnpm test:db` then fails against a schema that
exists nowhere in its own tree, and it goes hunting for the bug in its own
migration. `supabase db reset` and `pnpm gen:types` are denied in
`.claude/settings.json` for that reason. Run them yourself, from one session,
knowing the others are affected.

`supabase db push` is denied too, and **not for this reason** — it touches the
hosted database, where no worktree is involved at all. Three commands were
denied as one rule until 2026-10-13, and reading them as one rule is what hid
the real problem: phrased as *who* may push rather than *when* a push is
correct, it never protected Ben, who was free to push from a feature branch and
whose actual failure was forgetting to push after a merge. `pnpm db:sync` is the
guard that replaces it — see rule 4.

`pnpm gen:types` reads the shared database and writes the local
`apps/web/src/lib/database.types.ts`, so it will commit another branch's tables
to this one and typecheck will pass right up to the merge.

**There is one port 5173.** `apps/web/playwright.config.ts` reuses whatever is
already serving it (L154, and the comment above it says why). Rule 8 sends every
agent to `pnpm --filter web dev` to verify its work; with two servers up, the
walk verifies the other branch's app. Check what is on the port before believing
a result.

**Migration timestamps order the schema; merges do not.** Two branches minting
`2026…` filenames in parallel interleave by wall clock: a fresh `db reset`
applies them in one order, and `db push` applies them in the order they reached
the remote. A migration that assumes the other branch's `alter table` already
ran is correct in exactly one of those. Rule 4 is why it cannot be repaired by
editing the file afterwards.

**A stale worktree reads like a confused agent.** Before trusting one, ask what
it is: `git rev-list --left-right --count main...HEAD`. A worktree 76 commits
behind reports a file missing that exists on `main`, re-implements what already
landed, and applies an older copy of this file.

**A subagent inherits the directory, not the conversation.** Its whole world is
its prompt plus this file, so a constraint established by talking — which
migration is half-written, which package to leave alone — does not exist unless
the prompt restates it. Prefer `Explore` and `Plan` for fan-out: neither can
write, so neither can collide. Do the writing in one session, where a single
context holds the whole tree.

## Log what you could not resolve

`apps/web/OPEN-QUESTIONS.md` is append-only, and an empty log is a failure
signal. A brief whose premise is wrong about the repo, or a fix belonging in the
design system rather than the app, goes there in that file's format rather than
being quietly worked around.
