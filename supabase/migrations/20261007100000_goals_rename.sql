-- ═══════════════════════════════════════════════════════════════════════════
-- SITUATIONS BECOME GOALS
--
-- ── NOTHING IS BUILT HERE; A NAME STOPS LYING ─────────────────────────────
-- `situations`, `situation_i18n` and `exercise_situations` were built on
-- 2026-09-18 and seeded with three rows. `sessions.situation_id` was added on
-- 2026-09-19, nullable, and DOMAIN-MODEL.md D6 has described it ever since as
-- "recorded, never yet filled". Both halves of that are literally true:
--
--   * no file under apps/web has ever selected from any of the three tables —
--     `20260923150000` says so in a comment of its own: "Nothing in the app
--     reads `exercise_situations` yet";
--   * `select count(*) from public.sessions where situation_id is not null`
--     is 0, and has never been anything else.
--
-- So the shape this feature needs — a taxonomy, an N:M against exercises, and
-- a nullable column on the session — already exists, unread and unreferenced.
-- Building a second one beside it would ship two overlapping content concepts
-- and leave the first as furniture. This renames the one that is here.
--
-- ── WHY A GOAL AND NOT A SITUATION ────────────────────────────────────────
-- A situation is where you are coming from ("what can I do about this
-- feeling?"); a goal is what you are after ("Was möchtest du heute
-- erreichen?"). They are the same thing structurally and a different question
-- to ask, and the product asks the second one. Ben, 2026-10-07.
--
-- ── WHAT A RENAME DOES AND DOES NOT CARRY ─────────────────────────────────
-- Privileges and RLS policies hang off the table's OID, so they survive
-- `alter table … rename` untouched: every revoke and grant written in
-- `20260918150500`, `20260921100000` and `20260921103000` still applies, and
-- re-stating them here would be noise that could drift. `pnpm test:db` proves
-- it rather than this comment asserting it.
--
-- Names that do NOT follow, and are therefore every statement below:
--   * the tables and the three columns;
--   * the two plain indexes;
--   * the three policies;
--   * the PK / unique / check / FK constraint names, which Postgres generated
--     from the old table names and will keep spelling `situation` forever.
--
-- Every name below was read off the live database rather than guessed:
--   select conname from pg_constraint where conname like '%situation%';
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.situations          rename to goals;
alter table public.situation_i18n      rename to goal_i18n;
alter table public.exercise_situations rename to exercise_goals;

alter table public.goal_i18n      rename column situation_id to goal_id;
alter table public.exercise_goals rename column situation_id to goal_id;
alter table public.sessions       rename column situation_id to goal_id;


-- ── THE PLAIN INDEXES ─────────────────────────────────────────────────────
-- Only these two are free-standing. The `_pkey` and `_key` indexes below are
-- OWNED by constraints, so renaming the constraint renames the index with it
-- and `alter index` on one of them would be refused.
--
-- `exercise_goals_goal_id_idx` keeps its original reason: the PK indexes
-- exercise_id as its leading column and not goal_id, so a lookup BY GOAL —
-- which is now the direction the screen actually asks in — would otherwise be
-- a sequential scan.
alter index exercise_situations_situation_id_idx rename to exercise_goals_goal_id_idx;
alter index sessions_situation_id_idx            rename to sessions_goal_id_idx;


-- ── THE POLICIES ──────────────────────────────────────────────────────────
-- Renamed, not recreated. Recreating would drop and re-add, which is a window
-- in which the table is readable by nobody and a typo is a silent outage.
alter policy situations_select          on public.goals          rename to goals_select;
alter policy situation_i18n_select      on public.goal_i18n      rename to goal_i18n_select;
alter policy exercise_situations_select on public.exercise_goals rename to exercise_goals_select;


-- ── THE CONSTRAINTS ───────────────────────────────────────────────────────
alter table public.goals          rename constraint situations_pkey              to goals_pkey;
alter table public.goals          rename constraint situations_sort_key          to goals_sort_key;

alter table public.goal_i18n      rename constraint situation_i18n_pkey          to goal_i18n_pkey;
alter table public.goal_i18n      rename constraint situation_i18n_locale_check  to goal_i18n_locale_check;
alter table public.goal_i18n      rename constraint situation_i18n_situation_id_fkey to goal_i18n_goal_id_fkey;

alter table public.exercise_goals rename constraint exercise_situations_pkey              to exercise_goals_pkey;
alter table public.exercise_goals rename constraint exercise_situations_exercise_id_fkey  to exercise_goals_exercise_id_fkey;
alter table public.exercise_goals rename constraint exercise_situations_situation_id_fkey to exercise_goals_goal_id_fkey;

alter table public.sessions       rename constraint sessions_situation_id_fkey   to sessions_goal_id_fkey;


-- ── THE COMMENTS ──────────────────────────────────────────────────────────
comment on table public.goals is
  'What a person is after when they start a session: Entspannen, Aufwachen, '
  'Achtsamkeit stärken. Was `situations` until 2026-10-07, unread and unused.';

comment on column public.sessions.goal_id is
  'The goal chosen on /exercises before the deck was dealt, or NULL — a '
  'session without a goal ("Musie entdecken") is deliberate, not missing data.';


-- ═══ THE VIEW, WHICH THE RENAME ONLY HALF-FIXES ════════════════════════════
-- `missing_translations` references `situations` and `situation_i18n`, and a
-- view stores its dependencies by OID — so the rename rewrites those
-- references for free and the view keeps working. What it does NOT rewrite is
-- the literal `'situations'` in all three CTEs: that is a STRING, not a
-- reference, and it would go on reporting a hole in an entity whose name is
-- now `goals`. One word, in three places, and nothing would have caught it.
--
-- `create or replace`, never drop-and-create: dropping takes the grants to
-- `authenticated` and `service_role` with it, silently, and the next person to
-- read the table gets a permission error that reads like broken RLS. The five
-- output columns are therefore fixed — a replace that changed them is refused.
--
-- `security_invoker = true` stays, and is not decoration: without it the view
-- runs as its owner and the Security Advisor reports `security_definer_view`.
--
-- Verbatim from `20260923120000_exercise_step_markdown.sql` except for the
-- three `situations` lines, which become `goals`.
create or replace view public.missing_translations with (security_invoker = true) as
with locales (locale) as (
  values ('de'), ('en')
),
parents (entity, record_id) as (
            select 'user_types', id from public.user_types
  union all select 'goals',      id from public.goals
  union all select 'exercises',  id from public.exercises
  union all select 'cards',      id from public.cards
),
present (entity, record_id, locale) as (
            select 'user_types', user_type_id, locale from public.user_type_i18n
  union all select 'goals',      goal_id,      locale from public.goal_i18n
  union all select 'exercises',  exercise_id,  locale from public.exercise_i18n
  union all select 'cards',      card_id,      locale from public.card_i18n
),
strings (entity, record_id, locale, column_name, value) as (
            select 'user_types', user_type_id, locale, 'label',      label      from public.user_type_i18n
  union all select 'user_types', user_type_id, locale, 'image_alt',  image_alt  from public.user_type_i18n
  union all select 'goals',      goal_id,      locale, 'label',      label      from public.goal_i18n
  union all select 'exercises',  exercise_id,  locale, 'name',        name        from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'description', description from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'needs',       needs       from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'intro_md',    nullif(intro_md,   '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'scan_md',     nullif(scan_md,    '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'listen_md',   nullif(listen_md,  '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'reflect_md',  nullif(reflect_md, '') from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'image_alt',   image_alt   from public.exercise_i18n
  union all select 'cards',      card_id,      locale, 'feeling',    feeling    from public.card_i18n
  union all select 'cards',      card_id,      locale, 'image_alt',  image_alt  from public.card_i18n
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
