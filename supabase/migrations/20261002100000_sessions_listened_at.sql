-- ═══════════════════════════════════════════════════════════════════════════
-- `sessions.listened_at` — THE FACT THAT SOMEBODY PRESSED PLAY
--
-- WHY IT DID NOT EXIST. Until now nothing needed it, and `reveal-track` said
-- so out loud in its own header: "`step` says which screen the session
-- reached, not that anyone listened. The gate on the listen step is client
-- state and is not stored, so the server cannot check it." `playing` and
-- `position` are React state in components/SessionListen.tsx and have never
-- been written anywhere. A session parked on `listen` having touched nothing
-- is, in this schema, indistinguishable from one that played a track to the
-- end.
--
-- WHY IT EXISTS NOW. *Discovered music* (2026-10-02) lists the recordings a
-- person has actually met, and Ben's rule for it is exact: only sessions where
-- the play button was pressed count. That rule cannot be expressed against
-- `step`, so the fact gets stored.
--
-- TIMESTAMPTZ, NOT BOOLEAN. The table already says when things happened —
-- `started_at`, `ended_at` — and "when" is free once "whether" is being
-- written. Null means it never happened, which is the same shape `ended_at`
-- uses for the same kind of absence.
--
-- ── NO GRANT AND NO POLICY, AND THAT IS CHECKED, NOT ASSUMED ──────────────
-- Rule 2's second half is the one that gets missed, so: this column needs
-- neither, and here is why.
--
--   20260919120000_sessions.sql ends with
--     grant select, insert, update, delete on table public.sessions to authenticated;
--   TABLE-level, not column-level. A table grant covers every column the table
--   ever has, including ones added later — which is exactly the asymmetry that
--   makes `public.tracks` different: tracks carries a COLUMN grant, so a column
--   added there would be unreadable until named.
--
--   `sessions_update_own` already filters by `(select auth.uid())` on both
--   `using` and `with check`, so the client may write this column on its own
--   rows and on no others. That is the whole access rule for it.
--
-- So this file alters one table and does nothing else. If that ever stops
-- being true — a column grant arrives on sessions, or a policy starts naming
-- columns — this comment is where the next person finds out it mattered.
--
-- ── ONE THING THIS FILE DOES NOT FIX, FOUND WHILE CHECKING THE ABOVE ──────
-- `public.sessions` has NO explicit `service_role` grant in any migration.
-- 20260919120000 revokes from `anon` and `authenticated` only, and neither
-- 20260921100000 nor 20260921103000 names sessions or reflections — both
-- enumerate the CONTENT tables. Locally that is invisible, because the local
-- stack's default privileges hand `service_role` everything (measured:
-- service_role holds all seven privileges on sessions right now).
--
-- On hosted it may not, and that is precisely rule 2's story: the project was
-- created with *Automatically expose new tables* OFF, which is the same switch
-- that governs the default grant to `service_role`. If it is missing there,
-- `reveal-track` — which reads `public.sessions` with the service role — fails
-- with 42501 and returns `lookup_failed`, and *Discovered music* shows players
-- with no titles.
--
-- NOT FIXED HERE, deliberately: it is a pre-existing hole unrelated to this
-- column, it cannot be confirmed from this machine without the hosted service
-- key, and a blind grant in a migration about something else is how the next
-- person loses the thread. Logged in apps/web/OPEN-QUESTIONS.md with the
-- one-command check.
--
-- ── NOTHING IS BACKFILLED, DELIBERATELY ───────────────────────────────────
-- Every existing row gets null, and that is the honest value: those sessions
-- did not record whether anyone pressed play, and inventing it from `step`
-- would put recordings into people's *Discovered music* that they may never
-- have heard. The screen is built to open empty for exactly this reason.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.sessions
  add column listened_at timestamptz;

comment on column public.sessions.listened_at is
  'When the play button was first pressed on the listen step. Null = never. '
  'Written once per session by the client; see components/SessionListen.tsx. '
  'Not derivable from `step`, which only says which screen was reached.';

-- The read it exists for is "my sessions that played something, newest first",
-- which `sessions_user_started_idx` (user_id, started_at desc) already serves;
-- the null filter removes rows from a set that is one person's sessions, which
-- is small. No index here — one that is never chosen is a write cost and a
-- line in the schema pretending to be a decision.
