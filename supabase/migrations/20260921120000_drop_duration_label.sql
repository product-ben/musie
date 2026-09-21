-- ═══════════════════════════════════════════════════════════════════════════
-- Drop `exercise_i18n.duration_label`. Two fields said how long an exercise
-- takes, and they disagreed.
--
-- `exercises.timeframe_min` / `timeframe_max` say **2–12 minutes** for
-- mindfulness-cards. `duration_label` said **"About 15 minutes"** / **"Etwa 15
-- Minuten"**. Fifteen is not inside two-to-twelve, so this was never redundancy
-- — it was a contradiction, sitting on the same screen twice: once as the fact
-- chip on the RadioCards row, once as a row in the detail lightbox.
--
-- The range wins. It is structured, it is per-locale-free (a number is a
-- number), it feeds `t('exercises.timeframe', {min, max})` which already
-- renders it in both languages, and it cannot drift from itself. A free-text
-- label restating it in prose is a second source of truth for a fact that
-- already had one, and the second source is the one that was wrong.
--
-- Ben, on the first hosted walk-through, 2026-09-21.
--
-- ── `create or replace`, NOT `drop view` ──────────────────────────────────
-- `missing_translations` selects `duration_label`, and Postgres refuses to
-- drop a column a view depends on. The obvious move is to drop the view, drop
-- the column, and build the view again — but **a dropped view takes its grants
-- with it**, so that version silently un-grants `authenticated` and
-- `service_role` and the next `pnpm test:db` fails somewhere else entirely.
--
-- `create or replace view` keeps the view's identity, and therefore its
-- grants. It is legal here because the OUTPUT columns are untouched — entity,
-- record_id, locale, issue, column_name, in that order — and only the
-- `strings` CTE inside loses a row. Replace first, then drop.
--
-- ── THE SEED IS NOT EDITED ────────────────────────────────────────────────
-- `20260918150600_content_seed.sql` still inserts `duration_label`, and stays
-- that way: migrations stack now (CLAUDE.md rule 4), and on a `db reset` it
-- runs BEFORE this file, when the column still exists. Editing it would change
-- nothing on the remote — which records migrations by timestamp — while making
-- local and hosted disagree about what the seed said.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace view public.missing_translations with (security_invoker = true) as
with locales (locale) as (
  values ('de'), ('en')
),
parents (entity, record_id) as (
            select 'user_types', id from public.user_types
  union all select 'situations', id from public.situations
  union all select 'exercises',  id from public.exercises
  union all select 'cards',      id from public.cards
),
present (entity, record_id, locale) as (
            select 'user_types', user_type_id, locale from public.user_type_i18n
  union all select 'situations', situation_id, locale from public.situation_i18n
  union all select 'exercises',  exercise_id,  locale from public.exercise_i18n
  union all select 'cards',      card_id,      locale from public.card_i18n
),
-- Every translatable string, unpivoted to one row each, so the comparison
-- below is written once instead of once per column. `duration_label` is gone
-- from this list; everything else is verbatim.
strings (entity, record_id, locale, column_name, value) as (
            select 'user_types', user_type_id, locale, 'label',          label          from public.user_type_i18n
  union all select 'user_types', user_type_id, locale, 'image_alt',      image_alt      from public.user_type_i18n
  union all select 'situations', situation_id, locale, 'label',          label          from public.situation_i18n
  union all select 'exercises',  exercise_id,  locale, 'name',           name           from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'description',    description    from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'needs',          needs          from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'intro_text',     nullif(array_to_string(intro_text,   ' '), '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'scan_text',      nullif(array_to_string(scan_text,    ' '), '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'listen_text',    nullif(array_to_string(listen_text,  ' '), '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'reflect_text',   nullif(array_to_string(reflect_text, ' '), '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'question',       question       from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'image_alt',      image_alt      from public.exercise_i18n
  union all select 'cards',      card_id,      locale, 'feeling',        feeling        from public.card_i18n
  union all select 'cards',      card_id,      locale, 'image_alt',      image_alt      from public.card_i18n
)
select
  p.entity,
  p.record_id,
  l.locale,
  'missing row'::text as issue,
  null::text          as column_name
from parents p
cross join locales l
where not exists (
  select 1 from present x
  where x.entity = p.entity and x.record_id = p.record_id and x.locale = l.locale
)

union all

select
  s.entity,
  s.record_id,
  s.locale,
  'missing string'::text as issue,
  s.column_name
from strings s
where s.value is null
  and exists (
    select 1 from strings o
    where o.entity      = s.entity
      and o.record_id   = s.record_id
      and o.column_name = s.column_name
      and o.locale     <> s.locale
      and o.value is not null
  );

alter table public.exercise_i18n drop column duration_label;
