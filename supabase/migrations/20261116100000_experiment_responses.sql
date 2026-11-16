-- ═══════════════════════════════════════════════════════════════════════════
-- EXPERIMENT RESPONSES — what a visitor of an /experiments page wrote down
--
-- One row per finished reflection on an experiment page: who (a name they
-- typed and a random participant id their browser keeps), which exercise, in
-- which language, against which version of the questions, and the answers as
-- a jsonb array of `{question_key, question_text, answer}`. The first user is
-- „Reflexion 01“ (`apps/web/experiments/reflexion/`), whose three links each
-- end on three open questions.
--
-- ── THE RULE-10 EXCEPTION, AND WHO GRANTED IT ─────────────────────────────
-- CLAUDE.md rule 10 says an experiment writes NOTHING to Supabase. Ben
-- overrode that for this one table in the Reflexion 01 brief, 2026-11-16:
-- the reflections are the result of the experiment, they are long free text,
-- and PostHog is the wrong home for them (its `before_send` in
-- `apps/web/src/lib/posthog.ts` exists to keep exactly this kind of text OUT).
-- Nothing else under /experiments gains a write by this file.
--
-- ── THE POSTURE IS beta_signups', FOR THE SAME REASON ─────────────────────
-- The page has NO SIGN-IN — and no anonymous sign-in either, the brief rules
-- that out — so the only credential the browser holds is the public anon key.
-- So this is the second table `anon` can write, shaped exactly like the first
-- (`20261006120000_beta_signups.sql`, whose header has the full argument):
--
--   INSERT, and nothing else. No select, update or delete policy for anon or
--   authenticated. A visitor can add a reflection; nobody holding the public
--   key can read anybody's back — including their own, which is fine: the
--   page never needs it. The client therefore must not chain `.select()` onto
--   the insert (`src/save.ts` says so where someone would add one).
--
--   COLUMN-LEVEL GRANTS. `id` and `created_at` are defaults only.
--
--   SHAPE CHECKS WITH LENGTH CAPS, so one public key and one loop cannot fill
--   the table with megabyte rows. No rate limit, for beta_signups' reason:
--   Postgres cannot see an IP. A few junk rows are the cost; Turnstile or an
--   Edge Function is the remedy if it is ever abused.
--
-- READ in the Supabase dashboard or with the service role — through
-- `public.experiment_responses_wide` below for a CSV export.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.experiment_responses (
  id                   uuid        primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),

  -- A slug, not a fixed list: the next experiment reuses the table without a
  -- migration. 'reflexion-01' is the first.
  experiment_id        text        not null,

  -- Generated in the browser (crypto.randomUUID) and kept in localStorage, so
  -- one person doing two links on one device is one participant. Not a
  -- foreign key to anything: there is no account behind it.
  participant_id       uuid        not null,

  -- What they typed into the name field. Free text, trimmed length capped.
  name                 text        not null,

  exercise_key         text        not null,
  language             text        not null,
  question_set_version integer     not null,
  answers              jsonb       not null,

  constraint experiment_responses_experiment_id_shape
    check (experiment_id ~ '^[a-z0-9][a-z0-9-]{0,39}$'),

  constraint experiment_responses_name_shape
    check (length(btrim(name)) between 1 and 80),

  constraint experiment_responses_exercise_key_shape
    check (exercise_key ~ '^[a-z0-9][a-z0-9-]{0,39}$'),

  constraint experiment_responses_language
    check (language in ('de', 'en')),

  constraint experiment_responses_question_set_version
    check (question_set_version between 1 and 1000),

  -- An array of at most 20 answers, and 40 kB in all — three answers of a
  -- few thousand characters each fit many times over; a pasted book does not.
  constraint experiment_responses_answers_shape
    check (
      jsonb_typeof(answers) = 'array'
      and jsonb_array_length(answers) between 1 and 20
      and octet_length(answers::text) <= 40000
    )
);

comment on table public.experiment_responses is
  'Reflections written on /experiments pages (first: reflexion-01). '
  'INSERT-ONLY for anon/authenticated: no select policy, so the key that '
  'writes cannot read. Read via the dashboard or service role, or the '
  'experiment_responses_wide view for CSV. The rule-10 exception Ben granted '
  'in the Reflexion 01 brief, 2026-11-16.';

comment on column public.experiment_responses.answers is
  'jsonb array of {question_key, question_text, answer}. question_text is the '
  'wording the visitor saw, in their language, so a row stays readable after '
  'the questions change; question_set_version says which set it was.';

create index experiment_responses_created_at_idx
  on public.experiment_responses (experiment_id, created_at desc);


-- ═══════════════════════════════════════════════════════════════════════════
-- ACCESS — RLS, policy, revoke, then grant; and service_role too (rule 2).
-- The revoke is the whole insert-only property: the local stack's default
-- privileges hand a new table to anon with select included.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.experiment_responses enable row level security;

-- `authenticated` for beta_signups' reason: a signed-in tester opening the
-- experiment link in the same browser must not get a failure they cannot act
-- on. The experiment never signs anyone in itself.
create policy experiment_responses_insert_anyone
  on public.experiment_responses for insert to anon, authenticated
  with check (true);

revoke all on table public.experiment_responses from anon;
revoke all on table public.experiment_responses from authenticated;

grant insert (experiment_id, participant_id, name, exercise_key, language, question_set_version, answers)
  on table public.experiment_responses to anon;
grant insert (experiment_id, participant_id, name, exercise_key, language, question_set_version, answers)
  on table public.experiment_responses to authenticated;

grant select, insert, update, delete on table public.experiment_responses to service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- THE CSV VIEW — one row per response, the answers as columns
--
-- `q1`…`q3` by `question_key`, so the columns stay put whatever order the
-- array arrives in. A fourth question is a new view column in a new
-- migration; until then its answer is still in `answers`, nothing is lost.
--
-- `security_invoker`, so the view reads with the CALLER's privileges and RLS
-- rather than its owner's (postgres): without it a view is a hole around
-- every revoke above. And revoked from anon/authenticated explicitly, because
-- the default privileges grant a new view to them just as they do a table.
-- ═══════════════════════════════════════════════════════════════════════════

create view public.experiment_responses_wide
  with (security_invoker = true)
as
select
  r.id,
  r.created_at,
  r.experiment_id,
  r.exercise_key,
  r.language,
  r.question_set_version,
  r.participant_id,
  r.name,
  (select a ->> 'answer' from jsonb_array_elements(r.answers) a
    where a ->> 'question_key' = 'q1' limit 1) as q1,
  (select a ->> 'answer' from jsonb_array_elements(r.answers) a
    where a ->> 'question_key' = 'q2' limit 1) as q2,
  (select a ->> 'answer' from jsonb_array_elements(r.answers) a
    where a ->> 'question_key' = 'q3' limit 1) as q3
from public.experiment_responses r;

comment on view public.experiment_responses_wide is
  'experiment_responses, one row per response with answers q1..q3 as columns, '
  'for CSV export. service_role only.';

revoke all on table public.experiment_responses_wide from anon;
revoke all on table public.experiment_responses_wide from authenticated;
grant select on table public.experiment_responses_wide to service_role;
