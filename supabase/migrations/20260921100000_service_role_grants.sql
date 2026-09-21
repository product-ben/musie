-- ═══════════════════════════════════════════════════════════════════════════
-- Give `service_role` the privileges the local stack gave it for free.
--
-- FOUND BY DEPLOYING. Every migration before this one was written against the
-- local stack, which ships
--
--   alter default privileges in schema public
--     grant all on tables to postgres, anon, authenticated, service_role;
--
-- so `service_role` arrived holding everything and no migration ever had to
-- say so. The hosted project is created with "Automatically expose new tables"
-- OFF — deliberately, because that is what makes this schema's explicit
-- `grant select … to authenticated` statements a real test rather than a
-- formality. But the same switch governs the default grant to `service_role`,
-- which therefore got nothing at all.
--
-- MEASURED on the hosted project before this migration: every table, as
-- `service_role`, returned
--
--   403  {"code":"42501", "hint":"Grant the required privileges to the
--         current role with: GRANT SELECT ON …"}
--
-- `service_role` has BYPASSRLS, which is why this is easy to miss: the
-- policies are irrelevant to it and one assumes the grants are too. They are
-- not. Postgres checks table privileges first, for every role.
--
-- ── WHY THIS MATTERS BEYOND THE TESTS ─────────────────────────────────────
-- Two things depend on it, and only the first has noticed yet:
--
--   1. the `db` suite's negative controls, which read as `service_role`
--      precisely to prove the client CANNOT see what it reads — and whose
--      `afterEach` cleanup was failing silently, leaving rows behind and
--      making the next test fail for a reason that was not its own;
--   2. the `reveal-track` Edge Function (E.5), which reads `tracks.title` and
--      `.artist` with the service key. Without this it would have failed three
--      phases from now, in a function with no test around it.
--
-- ── EXPLICIT, NOT `alter default privileges` ──────────────────────────────
-- The one-line alternative is to restore the default privilege the hosted
-- project withholds. Rejected for the same reason the project has automatic
-- RLS turned off: a default grant means a future table is privileged without
-- any migration saying so, and this schema's whole posture is that the
-- migration is where the truth lives. A forgotten grant here fails loudly in
-- a test or an Edge Function; a forgotten `revoke` under a default grant
-- fails silently in production.
--
-- So the rule joins the others in CLAUDE.md: a migration that creates a table
-- grants to `authenticated` what the client may read, and to `service_role`
-- what the server may.
--
-- `anon` is untouched and stays with nothing. It had nothing before this file
-- and has nothing after it.
-- ═══════════════════════════════════════════════════════════════════════════

-- Content — read-only for the client, and the server has no reason to write
-- it either: content changes by migration. SELECT only, deliberately.
grant select on table public.user_types          to service_role;
grant select on table public.user_type_i18n      to service_role;
grant select on table public.situations          to service_role;
grant select on table public.situation_i18n      to service_role;
grant select on table public.exercises           to service_role;
grant select on table public.exercise_i18n       to service_role;
grant select on table public.exercise_situations to service_role;
grant select on table public.cards               to service_role;
grant select on table public.card_i18n           to service_role;
grant select on table public.exercise_tracks     to service_role;

-- tracks: ALL COLUMNS, including the two the client is refused.
-- This is the point of the role. `reveal-track` returns title and artist after
-- the listener asks for them, and it is the only thing that can.
grant select on table public.tracks to service_role;

-- The translation-hole report. Read by tooling, never by a user.
grant select on public.missing_translations to service_role;

-- User data — the server may also write and delete here. `profiles` so a
-- future cleanup can reach an orphaned row; `sessions` and `reflections`
-- because the test suite's fixtures and the anonymous-user cleanup (H.5) both
-- need to remove rows a client has stopped being able to reach.
grant select, insert, update, delete on table public.profiles    to service_role;
grant select, insert, update, delete on table public.sessions    to service_role;
grant select, insert, update, delete on table public.reflections to service_role;
