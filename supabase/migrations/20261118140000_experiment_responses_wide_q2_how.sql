-- ═══════════════════════════════════════════════════════════════════════════
-- EXPERIMENT RESPONSES — the CSV view gains `q2_how`
--
-- Ben, 2026-11-18: in „Reflexion 01“ the mood question became two. `q2` is
-- now „Hat sich deine Stimmung … verändert?“ answered Ja or Nein (stored in
-- German whatever the screen showed), and only „Ja“ opens `q2_how`,
-- „Beschreibe, wie sich deine Stimmung verändert hat“. The questions live in
-- `apps/web/experiments/reflexion/src/config.ts`, and `question_set_version`
-- 3 marks the rows that have this shape.
--
-- The table needs nothing: `answers` is a jsonb array keyed by
-- `question_key`, and a new key is just a new element. The view picks its
-- columns BY key, so without this file `q2_how` would sit in `answers` and
-- never reach the CSV. The original migration's comment says exactly that:
-- "A fourth question is a new view column in a new migration."
--
-- Dropped and created again, for the reasons 20261118120000 gives: a column
-- in the middle, and `security_invoker` stated rather than lost. The revokes
-- and the grant are restated because a new view arrives granted to anon and
-- authenticated again. A row from v2 has no `q2_how` and shows it empty;
-- its `q2` holds the old one-field answer.
-- ═══════════════════════════════════════════════════════════════════════════

drop view public.experiment_responses_wide;

create view public.experiment_responses_wide
  with (security_invoker = true)
as
select
  r.id,
  r.created_at,
  r.is_internal,
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
    where a ->> 'question_key' = 'q2_how' limit 1) as q2_how,
  (select a ->> 'answer' from jsonb_array_elements(r.answers) a
    where a ->> 'question_key' = 'q3' limit 1) as q3
from public.experiment_responses r;

comment on view public.experiment_responses_wide is
  'experiment_responses, one row per response with the answers as columns '
  '(q1, q2, q2_how, q3), for CSV export. Since question_set_version 3, q2 is '
  'Ja/Nein and q2_how is filled only on Ja. is_internal = true marks a test '
  'run. service_role only.';

revoke all on table public.experiment_responses_wide from anon;
revoke all on table public.experiment_responses_wide from authenticated;
grant select on table public.experiment_responses_wide to service_role;
