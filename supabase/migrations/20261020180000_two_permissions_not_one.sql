-- ═══════════════════════════════════════════════════════════════════════════
-- TWO PERMISSIONS, NOT ONE — Ben, 2026-10-20.
--
-- `analytics_consent` (20261020170000) asked one question: may we see how the
-- app is used. Sign-up now asks a second one that is not a louder version of
-- the first, and the difference is the whole point:
--
--   analytics_consent   may we watch WHAT YOU DO — screens, taps, a masked
--                       replay. Nothing you wrote; lib/posthog.ts makes that
--                       structural rather than promised.
--   research_consent    may we read WHAT YOU WROTE. The reflections
--                       themselves, including the ones you spoke, because a
--                       transcript is stored as a reflection like any other.
--
-- The second is Art. 9 data in the plainest way this product has: somebody's
-- diary about how they feel, read by two named people. LEGAL-PAGES.md §8
-- called the explicit consent for it the largest remaining gap; this is it,
-- and it is only valid while it stays OFF by default and never a condition of
-- signing up. Both are true in the UI and neither is enforceable here, which
-- is why it is written down.
--
-- ── WHY A PROFILES COLUMN AND NOT A legal_acceptances ROW ─────────────────
-- `20261020160000` anticipated this ("the list is meant to grow — an Impressum
-- acknowledgement, a research-consent form"), and it is still the right table
-- for what it holds: an append-only record of WHAT SOMEBODY AGREED TO, keyed
-- by document and version, never updated.
--
-- These two are a different question — WHAT IS TRUE NOW — because they can be
-- turned off again on /about-you, and Art. 7(3) says that has to be as easy as
-- turning them on. A row in an acceptance log cannot express a withdrawal
-- without becoming a different kind of table. So: current state here, beside
-- the other things a person set; the acceptance log keeps its own job.
--
-- ── NO NEW GRANT, CHECKED RATHER THAN ASSUMED ─────────────────────────────
-- Same as 20261020170000: `20260918142704_profiles.sql` grants
-- `select, insert, update` on the TABLE to `authenticated`, so a new column
-- arrives covered. RLS is per row (`auth.uid() = user_id`), so it is already
-- scoped to its owner.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column research_consent         text,
  add column research_consent_at      timestamptz,
  add column research_consent_version text;

alter table public.profiles
  add constraint profiles_research_consent_known
  check (research_consent in ('granted', 'refused'));

comment on column public.profiles.research_consent is
  'granted | refused | null. May Ben and Lucy read this person''s reflections, '
  'written and spoken, to improve Musie. Null means not asked yet. Art. 9 '
  'explicit consent — LEGAL-PAGES.md §8.';

comment on column public.profiles.research_consent_at is
  'When the answer was given. Art. 7(1): a consent nobody can date is not '
  'demonstrable.';

comment on column public.profiles.research_consent_version is
  'Which version of the privacy page was on screen when they answered.';

-- ── THE ONE WAY TO READ THEM ───────────────────────────────────────────────
--
-- A VIEW RATHER THAN A QUERY SOMEBODY TYPES. The filter *is* the permission:
-- `where research_consent = 'granted'` is the only thing standing between a
-- research export and reading the diary of somebody who said no. Written once,
-- in the database, it cannot be forgotten at 11pm in the SQL editor — and the
-- failure it prevents is not a bug report, it is a person's private writing in
-- a spreadsheet it was never meant to reach.
--
-- `security_invoker` is left OFF deliberately: the view runs as its owner and
-- therefore sees past the per-row policies on `reflections`, which is exactly
-- what an export needs and exactly why the grants below are the whole fence.
create view public.research_reflections as
  select
    r.id,
    r.created_at,
    r.mode,
    r.body,
    s.id          as session_id,
    s.user_id,
    s.exercise_id,
    s.card_id
  from public.reflections r
  join public.sessions  s on s.id = r.session_id
  join public.profiles  p on p.user_id = s.user_id
  where p.research_consent = 'granted';

comment on view public.research_reflections is
  'Reflections belonging to people who said Ben and Lucy may read them. The '
  'filter lives here so no export can forget it. service_role only.';

-- Revoke, then grant — CLAUDE.md rule 2's shape, and it matters more here than
-- on a table: a view inherits nothing useful by default and the local stack's
-- default privileges hand `anon` and `authenticated` everything new.
revoke all on public.research_reflections from public, anon, authenticated;
grant select on public.research_reflections to service_role;
