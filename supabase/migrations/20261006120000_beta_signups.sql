-- ═══════════════════════════════════════════════════════════════════════════
-- BETA SIGNUPS — the closed-beta waiting list
--
-- One row per person who filled in the form on `/beta`: a first name, an email
-- address, and how they heard about Musie. Nothing else. It exists so there is
-- a list to reach out FROM, and it is read by whoever is doing the reaching —
-- in the Supabase dashboard, as `postgres`, or with the service key.
--
-- ── THE FIRST TABLE `anon` CAN WRITE, AND THAT IS THE WHOLE OF ITS RISK ────
-- Every table before this one gives `anon` nothing: `20260921100000`'s header
-- says so twice, and the security suite re-proves it on every run. This one
-- has to be different, because the form is on a page with NO SIGN-IN — that is
-- the point of it — so the only credential the browser holds is the anon key,
-- which is public the moment the bundle ships.
--
-- So the posture here is narrow in every direction except the one it cannot be:
--
--   INSERT, and nothing else. No select policy exists for `anon` or
--   `authenticated` — not a restrictive one, none at all — so a signup can be
--   written and never read back. Whoever holds the anon key can add themselves
--   to a list; they cannot enumerate the list they are joining. That is the
--   property that matters, because the list is email addresses.
--
--   THREE COLUMNS, by a column-level grant. `id` and `created_at` have
--   defaults and are not grantable to the client, so a caller cannot choose a
--   row's id or backdate its arrival.
--
--   SHAPE CHECKS WITH LENGTH CAPS. These are not form validation — the app
--   validates too, and that copy is the part a person reads. They are the half
--   of validation that a client cannot skip, and the reason they are here is
--   the anon key again: without the caps, one public key and one loop is a
--   table full of megabyte-long names.
--
-- WHAT IS DELIBERATELY NOT HERE: a rate limit. Postgres cannot see an IP, so
-- there is nothing to limit by in a policy, and the honest answer is that this
-- form can be submitted in a loop by anyone who reads the bundle. It is a
-- waiting list for a twenty-person beta, so the cost of that is a few junk
-- rows to delete, not a breach. If it is ever actually abused, the remedy is
-- Cloudflare Turnstile in front of the submit or an Edge Function holding the
-- write — both of which are a change to how the form POSTs and neither of
-- which this schema would have to move for. Logged in
-- apps/web/OPEN-QUESTIONS.md.
--
-- ── `reason_code` IS TEXT WITH A SHAPE, NOT AN ENUM AND NOT A LOOKUP TABLE ──
-- The list of reasons — "Via Ben", "Via Lucy", "Via UXDX", "somewhere else" —
-- is MEANT TO GROW, and Ben said so when he asked for the form. The three ways
-- to hold it are not equally cheap to grow:
--
--   a check constraint     every new reason is a migration, pushed, in step
--                          with a deploy. Three statements to add a word.
--   a lookup table         every new reason is a migration AND a row AND an
--                          `_i18n` sibling for its German (rule 6), plus a
--                          read the public page would have to wait on before it
--                          can draw its own radio group.
--   a shape check          every new reason is one line in
--                          apps/web/src/lib/betaReasons.ts and two catalogue
--                          strings. No migration, nothing to push, and the
--                          German is typed against the English so it cannot be
--                          forgotten.
--
-- The third, then. What the column promises is that it holds a SLUG — lower
-- case, ascii, no spaces, short — so the values stay greppable and a typo
-- cannot arrive as `Via Ben ` with a trailing space. What it deliberately does
-- not promise is which slugs exist; that lives in the app, next to the labels
-- it draws them with, and `betaReasons.test.ts` asserts every code in that
-- list against this very regex so the two cannot drift apart silently.
--
-- The labels themselves are CHROME, not content: they are ours, they are
-- permanent, and no spreadsheet is ever going to supply them. So they are in
-- `i18n/en.ts` and `i18n/de.ts` like every other word the app owns, and this
-- table stores the code rather than the words somebody saw.
--
-- ── ONE ROW PER ADDRESS ───────────────────────────────────────────────────
-- A unique index on `lower(email)`, because a second submit of the same
-- address is the commonest thing a form gets — a reload, a double tap, a
-- person who is not sure it worked — and two rows for one person is two
-- outreach emails to one person.
--
-- The app treats the resulting 23505 AS SUCCESS and shows the same thank-you
-- (`lib/betaSignup.ts` says why at more length): the person IS on the list,
-- which is the only thing the sentence on screen claims.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.beta_signups (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  first_name  text        not null,
  email       text        not null,
  reason_code text        not null,

  -- Trimmed length, so a name of three spaces is refused rather than stored
  -- and later wondered about. 80 is generous for a first name and small
  -- enough that nothing interesting fits instead of one.
  constraint beta_signups_first_name_shape
    check (length(btrim(first_name)) between 1 and 80),

  -- ── DELIBERATELY A WEAK EMAIL CHECK ───────────────────────────────────
  -- Something@something.something, no spaces, no second @, and 254 bytes —
  -- the longest address SMTP will carry. It is not RFC 5322 and must not try
  -- to be: the strict grammar accepts quoted local parts and bracketed IP
  -- literals, and every regex that claims to implement it rejects real
  -- addresses somebody owns. The only true test of an address is sending to
  -- it, and this form sends nothing. So this catches paste accidents and
  -- junk, and leaves judgement to the human who will write to the list.
  constraint beta_signups_email_shape
    check (
      length(email) <= 254
      and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    ),

  -- The slug promise described in the header. First character a letter, then
  -- letters, digits and hyphens, 40 characters at most.
  constraint beta_signups_reason_code_shape
    check (reason_code ~ '^[a-z][a-z0-9-]{0,39}$')
);

comment on table public.beta_signups is
  'The closed-beta waiting list, written by the public form on /beta. '
  'INSERT-ONLY for the client: there is no select policy for anon or '
  'authenticated, so the list cannot be read back with the key that writes it.';

comment on column public.beta_signups.reason_code is
  'A slug, not one of a fixed set: the list of reasons is meant to grow '
  'without a migration. The codes and their labels live in '
  'apps/web/src/lib/betaReasons.ts, and its test asserts them against this '
  'column''s shape check.';

-- Case-insensitive, because an address is: Ben@ and ben@ are one inbox, and a
-- unique index on the raw column would let both in.
create unique index beta_signups_email_unique
  on public.beta_signups (lower(email));

-- "Who signed up, newest first" is the only read this table has. One index,
-- matching it.
create index beta_signups_created_at_idx
  on public.beta_signups (created_at desc);


-- ═══════════════════════════════════════════════════════════════════════════
-- ACCESS
--
-- RLS, policies, revoke, then grant — and to `service_role` as well as to the
-- client, which is the half CLAUDE.md rule 2 exists because it was missed
-- once (20260921100000).
--
-- THE REVOKE IS LOAD-BEARING HERE MORE THAN ANYWHERE ELSE IN THIS SCHEMA.
-- The local stack ships
--
--   alter default privileges in schema public
--     grant all on tables to postgres, anon, authenticated, service_role;
--
-- so this table arrives ALREADY FULLY GRANTED to `anon` — select included.
-- The column-level `grant insert (…)` below would then be a decoration on top
-- of a table-wide grant of everything, exactly as the `tracks` column grant
-- would have been (rule 2, and the ACCESS section of
-- 20260918150500_content_schema.sql). The whole insert-only property of this
-- table is the `revoke` two lines above the grant, not the grant.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.beta_signups enable row level security;

-- ── THE ONE POLICY ────────────────────────────────────────────────────────
-- `with check (true)`: every row offered is acceptable, because there is no
-- caller to compare it to — the whole page is unauthenticated, `auth.uid()` is
-- null, and a row belongs to nobody. The narrowing that matters is not in this
-- policy; it is that INSERT is the only command any policy names, and the
-- grant below is the only privilege the client holds.
--
-- `authenticated` is included for one reason: a tester who is already signed in
-- and opens /beta out of curiosity. The page never asks who they are, so
-- without this the form would fail for exactly the people who already have the
-- app, with an error none of them could act on.
create policy beta_signups_insert_anyone
  on public.beta_signups for insert to anon, authenticated
  with check (true);

-- No select, update or delete policy, for either role. Not an oversight — see
-- the header. A list of email addresses that the public key can read is the
-- failure this table is shaped to avoid.

-- `revoke all`, not an enumerated revoke: PG 17 added MAINTAIN, and any
-- enumeration written today fails OPEN the next time Postgres invents a
-- privilege. The argument in full is in 20260919120000_sessions.sql.
revoke all on table public.beta_signups from anon;
revoke all on table public.beta_signups from authenticated;

-- ── THE GRANT IS PER COLUMN ───────────────────────────────────────────────
-- Three columns, which are precisely the three the form collects. `id` and
-- `created_at` are left ungranted, so they can only ever be their defaults:
-- a client cannot pick an id, and cannot claim to have signed up last year.
--
-- NO `select`, which has one consequence the app has to respect: supabase-js
-- must not chain `.select()` onto this insert. Without it the request carries
-- `Prefer: return=minimal` and asks for nothing back; with it, PostgREST would
-- ask for a representation and the write would fail on the read half.
-- lib/betaSignup.ts says this where someone would otherwise add one.
grant insert (first_name, email, reason_code) on table public.beta_signups to anon;
grant insert (first_name, email, reason_code) on table public.beta_signups to authenticated;

-- ── AND `service_role`, WHICH IS WHAT ACTUALLY READS THE LIST ─────────────
-- `select` because reaching out is the point of the table; `delete` because
-- junk rows are the one maintenance this table will ever need, and the db
-- suite's own cleanup needs it too. `insert` and `update` are granted for
-- parity with every other user-data table here (20260921103000 has the
-- argument: a grant narrower than the local stack's is a divergence we
-- introduced, and anyone holding the secret key can already read everything).
grant select, insert, update, delete on table public.beta_signups to service_role;
