-- ═══════════════════════════════════════════════════════════════════════════
-- THE LISTENING QUESTION ROTATES, AND THE SESSION RECORDS WHICH ONE IT GOT
--
-- Ben, 2026-10-11. `docs/LISTENING-QUESTION-ITERATION.md` is the PRD and §3 of
-- it is the decision table this file implements. Read §5 before changing
-- anything here.
--
-- The exercise used to ask ONE question, out of `exercise_i18n` — the body of
-- `listen_md` on the sheet and the heading of `reflect_md` on the reflect
-- step. People do these exercises often, so they met the same question every
-- time. There are now five, they rotate, and a listener who cannot work with
-- the one they got can ask for another.
--
-- ── THE FIVE QUESTIONS ARE NOT IN HERE, AND THAT IS THE DECISION (D1) ─────
-- They are a REPO FILE: `apps/web/src/content/questions.ts`. This is the one
-- migration the feature needs, and it adds no content at all.
--
-- The reasoning is §5.1's, and it is worth restating because the obvious
-- answer in this repo is the wrong one here. Content lives in the content
-- tables because of the ROWS THE TEXT HANGS OFF, not because it is text:
-- `cards.code` is printed on the paper beside the QR, `exercise_tracks` says
-- which recording plays for an (exercise, card) pair, and `sessions.card_id`
-- has a foreign key into `cards` so a diary entry can never claim a card that
-- does not exist. The `_i18n` siblings are here because their PARENTS must be.
--
-- The question set is the first content in this repo that is ONLY TEXT — five
-- rows, an order, three strings, two locales, no relations. In a repo file the
-- TYPE CHECKER is the completeness check: a question written in German and not
-- English fails `pnpm check`, on the machine and in CI, where
-- `missing_translations` is a query somebody has to remember to run and
-- `pnpm check` never touches the database (CLAUDE.md 8).
--
-- So the only thing the database owns is the per-session FACT, below.
--
-- ── NO GRANT AND NO POLICY, CHECKED RATHER THAN ASSUMED (rule 2) ──────────
-- Rule 2's second half is the one that gets missed, so both roles explicitly:
--
--   20260919120000_sessions.sql:
--     grant select, insert, update, delete on table public.sessions to authenticated;
--   20260921100000_service_role_grants.sql:81
--     grant select, insert, update, delete on table public.sessions to service_role;
--
-- Both are TABLE-level, and a table grant covers every column the table ever
-- gains. That is NOT true everywhere — `public.tracks` carries a COLUMN grant
-- (`id, src, duration_seconds, licence_ref`) and a column added there would be
-- unreadable — which is why this is verified per table and not assumed.
-- `20261009110000_sessions_feeling_change.sql:34` established exactly this for
-- the last column added here.
--
-- RLS needs nothing either: `sessions_select_own` and its three siblings
-- filter by `user_id`, which is a ROW predicate, and these are columns of rows
-- the policies already reach.
--
-- The VIEW at the foot of this file is different and does carry a grant. See
-- its own block.
--
-- ── A NEW FILE, NOT AN EDIT (rule 4) ──────────────────────────────────────
-- Every migration before this one is applied and pushed. Supabase records an
-- applied migration BY TIMESTAMP, so editing one changes nothing on the remote
-- and is skipped in silence.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══ 1 · WHICH QUESTION, AND WHAT IT SAID ═════════════════════════════════
--
-- FOUR COLUMNS, and each has one job. §5.3.
alter table public.sessions
  -- The id of the question this session was given — `lq-01`…`lq-05`.
  --
  -- NO FOREIGN KEY, deliberately, and it is the one real cost of D1: the
  -- catalogue is in the app, so there is no table to reference. An id that
  -- stops existing leaves this column pointing at a string nothing resolves.
  --
  -- Bounded by the column below: the diary renders the SNAPSHOT and never
  -- needs the catalogue to read history back, so the blast radius is the
  -- rotation treating an unknown id as "not in the set" — which is the safe
  -- reading of it. Retire a question with `active: false` in the file, never
  -- by deleting it.
  --
  -- NULL is ordinary, and means two different things that need no telling
  -- apart: the exercise has no question set (three of the five do not), or the
  -- session predates this migration. Neither contributes to the rotation.
  add column listening_question_id text,

  -- THE QUESTION AS IT WAS SHOWN — the reflect phrasing, in the locale it was
  -- read in, written at the same moment as the id above.
  --
  -- A SNAPSHOT AND NOT A LOOKUP, which is a diary decision (D10). `DiaryCard`
  -- labels every entry with the question it answered. With one question per
  -- exercise, reading it back out of `exercise_i18n.reflect_md` was exact;
  -- with five that is wrong, and rewording a question would silently relabel
  -- every answer anybody ever wrote under it. A reflection must stay under the
  -- question it was actually asked.
  --
  -- The same argument applies to the content tables, so moving the catalogue
  -- into Postgres would NOT remove the need for this column — an `update` on
  -- an i18n row rewrites history exactly as a file edit does.
  add column listening_question text,

  -- ── THE LOG. Append-only, never cleared ──────────────────────────────────
  -- Every question turned down in this session, in the order they were turned
  -- down. This is what `question_rejections` reads, and it is the only place
  -- the product learns which questions do not work.
  add column rejected_question_ids text[] not null default '{}',

  -- ── THE WORKING SET. What a re-roll will not offer right now ─────────────
  -- *Fragen zurücksetzen* empties this and nothing else, which is why it is a
  -- second column rather than the same one (§5.3.1): one array cannot be both
  -- the list a reset clears and the log that must survive the reset. Clearing
  -- the log would make the sessions whose signal is loudest the ones the log
  -- under-reports.
  add column rejected_this_round text[] not null default '{}';

-- NOT NULL WITH A DEFAULT ON AN EXISTING TABLE costs nothing since PG 11: the
-- default is stored in the catalogue and no rows are rewritten. Both arrays
-- are `'{}'` and never null, so every read is `cardinality(...)` with no
-- coalesce and every append is `array_append` with nothing to guard.

comment on column public.sessions.listening_question_id is
  'Which of the rotating listening questions this session was given. The '
  'catalogue is a repo file (apps/web/src/content/questions.ts), so there is '
  'no foreign key — see the migration header.';

comment on column public.sessions.listening_question is
  'The question AS SHOWN, in the locale it was read in. A snapshot, so that '
  'rewording a question never relabels an answer somebody already wrote.';

comment on column public.sessions.rejected_question_ids is
  'Append-only log of every question turned down in this session. Never '
  'cleared, including by Fragen zurücksetzen.';

comment on column public.sessions.rejected_this_round is
  'The questions a re-roll will not currently offer. Emptied by Fragen '
  'zurücksetzen; nothing else ever clears it.';

-- ── THE TWO COLUMNS CANNOT DISAGREE ───────────────────────────────────────
-- One equality between two booleans, which is the construction
-- `sessions_ended_at_matches_status` already uses and for the same reason:
-- both failures are equally bad and equally easy to write. An id with no
-- snapshot gives a diary entry that cannot name its question; a snapshot with
-- no id gives a question the rotation cannot count.
--
-- In the DATABASE and not only the client, because the state machine lives in
-- one app and a repair script or a second client would each have to be told
-- again.
alter table public.sessions
  add constraint sessions_listening_question_pairs
    check ((listening_question_id is null) = (listening_question is null));


-- ═══ 2 · WHICH QUESTIONS DO NOT WORK, AND FOR WHOM ════════════════════════
--
-- Ben asked for the dead end to be logged somewhere he can act on: "I want to
-- then contact these users."
--
-- NOTHING NEW IS STORED FOR IT. The event "this person turned down every
-- question we had" IS `cardinality(rejected_question_ids) = 5`, already on the
-- row above. What was missing is a place to read it from, and this repo
-- already has the pattern: `public.beta_signups` is granted to `service_role`
-- and to nobody else, because the list is addresses and the client has no
-- business holding it.
--
-- ── security_invoker, LIKE missing_translations ───────────────────────────
-- A Postgres view is OWNER-privileged by default, which would quietly bypass
-- every policy on `sessions` and hand one caller everybody's diary. That is
-- what the Security Advisor reports as `security_definer_view`. With
-- `security_invoker = true` the view runs as the CALLER: `service_role` has
-- BYPASSRLS and sees every row, and nobody else can select it at all.
--
-- ── auth.users IS DELIBERATELY NOT JOINED ────────────────────────────────
-- The email is what Ben actually wants, and it is still one lookup away:
-- Studio → Authentication → Users by uuid, or `select email from auth.users
-- where id = '…'`. Putting the auth schema behind a `public` view would widen
-- a surface `beta_signups`' own header argues for keeping narrow, to save one
-- step in a workflow that runs by hand a few times a month.
--
-- `profiles.language` IS joined, because it decides which language to write
-- in and is a column the row already has.
create view public.question_rejections with (security_invoker = true) as
select
  s.user_id,
  s.id          as session_id,
  s.exercise_id,
  s.started_at,
  s.status,
  s.rejected_question_ids,
  cardinality(s.rejected_question_ids) as rejected_count,
  -- TRUE iff *Fragen zurücksetzen* was pressed. After a reset every new
  -- rejection appends to BOTH arrays, so the log can only run ahead of the
  -- working set by exactly what a reset discarded. That is why no third column
  -- counts resets — §5.3.1.
  cardinality(s.rejected_question_ids) > cardinality(s.rejected_this_round)
                                       as was_reset,
  -- What they were left holding when they ran out.
  s.listening_question_id              as left_with,
  p.language
from public.sessions s
join public.profiles p on p.user_id = s.user_id
where cardinality(s.rejected_question_ids) > 0;

comment on view public.question_rejections is
  'One row per session in which somebody turned a listening question down. '
  'rejected_count = 5 means they rejected every question there was; '
  'was_reset means they pressed Fragen zurücksetzen. service_role only.';

-- ── REVOKE, THEN GRANT — AND `service_role` IS IN THE REVOKE ──────────────
-- MEASURED on this stack while writing this file, which is the only reason it
-- says `service_role` here. The revoke was `from anon, authenticated` and the
-- grant was `select … to service_role`, exactly like
-- `missing_translations`. Applied in a transaction and inspected,
-- `information_schema.role_table_grants` then reported
--
--   service_role | SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
--
-- because the local stack's
--
--   alter default privileges in schema public
--     grant all on tables to postgres, anon, authenticated, service_role;
--
-- COVERS VIEWS TOO, so this view arrived already fully granted to
-- `service_role` and the `grant select` was adding to a grant that was
-- already there — rule 2's "looks implemented while doing nothing", one layer
-- further out than the column grant on `public.tracks`.
--
-- Nothing leaked: `anon` and `authenticated` were correctly stripped, and a
-- view with a join is not auto-updatable, so the write privileges could not
-- have been exercised. But they stated the wrong intent, and the next person
-- to read this file would have believed them.
--
-- With `service_role` in the revoke, the grant below is the whole of its
-- access. `authenticated` keeps nothing at all: a rejection log is not a
-- diary, and the person who produced it has no screen that needs it.
revoke all on public.question_rejections from anon, authenticated, service_role;
grant select on public.question_rejections to service_role;
