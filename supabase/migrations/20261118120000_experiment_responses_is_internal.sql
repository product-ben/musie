-- ═══════════════════════════════════════════════════════════════════════════
-- EXPERIMENT RESPONSES — mark the test runs
--
-- Ben, 2026-11-18: he and Lucy test the experiment links on musie.org, and
-- their answers must not mix with the participants'. PostHog already knows a
-- test run (`is_internal`, from `?internal=1` or a local dev run — see
-- `apps/web/experiments/reflexion/src/run.ts`); this table did not, so a test
-- reflection landed in the dataset indistinguishable from a real one. Now the
-- page writes the same flag here, and the CSV view carries it, so test rows
-- are FILTERED OUT rather than deleted by hand.
--
-- The visitor sets it, with the public key, so it is a convenience and not a
-- security boundary: anyone can mark their own row internal, which only hides
-- it from the analysis — the same trust the PostHog flag already has.
--
-- A new file because `20261116100000_experiment_responses.sql` is applied on
-- the local stack (rule 4).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.experiment_responses
  add column is_internal boolean not null default false;

comment on column public.experiment_responses.is_internal is
  'true for a test run (Ben, Lucy, a local dev run): set by the page from '
  '?internal=1, which the device then remembers. Filter on false for the '
  'participants'' answers. Set by the visitor, so a convenience, not a guard.';

-- The table-wide revoke in 20261116100000 still stands; this ADDS the one
-- column to the column-level insert grants. service_role's table-wide grant
-- covers a new column by itself.
grant insert (is_internal) on table public.experiment_responses to anon;
grant insert (is_internal) on table public.experiment_responses to authenticated;


-- ── THE CSV VIEW, with the flag next to the date ──────────────────────────
-- Dropped and created again rather than `create or replace`: replace can only
-- append a column at the end, and it would also reset `security_invoker` to
-- off unless restated — a view that quietly reads with its owner's rights is
-- the hole the original migration's comment warns about. Nothing depends on
-- the view, so the drop is safe; the revokes and the grant are restated
-- because a new view arrives granted to anon/authenticated again.

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
    where a ->> 'question_key' = 'q3' limit 1) as q3
from public.experiment_responses r;

comment on view public.experiment_responses_wide is
  'experiment_responses, one row per response with answers q1..q3 as columns, '
  'for CSV export. is_internal = true marks a test run. service_role only.';

revoke all on table public.experiment_responses_wide from anon;
revoke all on table public.experiment_responses_wide from authenticated;
grant select on table public.experiment_responses_wide to service_role;
