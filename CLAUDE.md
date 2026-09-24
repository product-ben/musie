# CLAUDE.md

Guardrails for this repo. Each rule is already load-bearing and cites the file
that proves it — read the file before arguing with the rule.

## Orientation

pnpm workspace (`pnpm-workspace.yaml`), Node 22, pnpm pinned by `packageManager`:

- `apps/web` — the React 19 / Vite / react-router app. The only consumer.
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
| `pnpm storybook` | the design system on :6006 |
| `pnpm deck:migration` | `supabase/content/deck.json` → a new stacking migration |
| `pnpm deck:pdf` | the paper deck, print-ready, from the same file |

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
token (`--sand-*`, `--terracotta-*`, `--ocher-*`, `--purple-*`) from `apps/web`:
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

Verify with `supabase db reset` locally, and `supabase db push` to send it.
Nothing pushes automatically; `pnpm check` does not touch the database.

Content lives in a migration rather than `supabase/seed.sql` because `supabase
db push` does not run `seed.sql` — header of `20260918150600_content_seed.sql`.

**`pnpm test:db` runs against whichever database you point it at.** Bare, it
uses the local stack. Set `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY` and
`SUPABASE_TEST_SERVICE_ROLE_KEY` — all three or none — to run it against
hosted, which is how the `service_role` hole in rule 2 was found. It prints its
target on the first call. Pass the keys for one run; the service-role key does
not belong in a file.

Content lives in a migration rather than `supabase/seed.sql` because `supabase
db push` does not run `seed.sql` — header of `20260918150600_content_seed.sql`.

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

Typecheck, lint and unit tests across every package (root `package.json`). CI
runs the same command plus both bundle builds, because `tsc --noEmit` resolves
neither CSS imports nor the font-pinning Vite plugin (`.github/workflows/ci.yml`).
Verify against `supabase start` and `pnpm --filter web dev`, never a URL —
nothing deploys in this phase.

## Log what you could not resolve

`apps/web/OPEN-QUESTIONS.md` is append-only, and an empty log is a failure
signal. A brief whose premise is wrong about the repo, or a fix belonging in the
design system rather than the app, goes there in that file's format rather than
being quietly worked around.
