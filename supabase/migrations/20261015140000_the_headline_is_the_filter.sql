-- ═══════════════════════════════════════════════════════════════════════════
-- THE HEADLINE BECOMES THE FILTER — four goals, three words each, twelve pairs
--
-- `GOAL-FILTER.md` is the product argument and `GOAL-FILTER-PLAN.md` is the
-- engineering one. This file is G.0 of the plan.
--
-- User testing: people stall at the door of a mindfulness exercise — *warum
-- sollte ich das machen?* — and the filter, which is functionally right, names
-- the goals without ever saying what any of them is for. So /exercises' h1
-- stops asking a question and starts carrying the filter ("3 Übungen zum
-- Entspannen"), and the goal behind it opens a sheet that explains itself.
--
-- ── WHY THIS IS A MIGRATION AND NOT A /maintenance EDIT ───────────────────
-- Rule 4.1 moved four tables out of migrations — `cards`, `card_i18n`,
-- `tracks`, and the grid tables. `goals`, `goal_i18n` and `exercise_goals` are
-- NOT among them: they are still migration-governed, like `exercises`. So
-- nothing in this file can be clobbered by an operator edit, and nothing in it
-- clobbers one.
--
-- ── RULE 2 HAS NOTHING TO ADD HERE, AND THAT IS WORTH SAYING ──────────────
-- No new table, so no RLS, no policy, no revoke and no grant. The two columns
-- added below are covered the moment they exist, because both existing grants
-- are TABLE-level:
--
--   grant select on table public.goal_i18n to authenticated   (20260918150500,
--     as `situation_i18n`)
--   grant insert, update, delete … to service_role            (20260921103000)
--
-- A table-level grant covers columns added later. A COLUMN-level grant does
-- not — which is the whole of rule 2's worked example on `public.tracks`, and
-- is why this paragraph exists rather than leaving the next reader to wonder
-- whether a grant was forgotten.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══ 1 · THE TWO NEW COLUMNS ═══════════════════════════════════════════════
-- A goal is now said THREE WAYS, and they are three columns because they are
-- three different sentences rather than one string reused:
--
--   label    the goal's NAME, and the headline of its card in the sheet. It
--            answers the sheet's question *Was brauchst du gerade?*, so it is
--            a noun phrase: "Entspannung", not "Entspannen".
--   purpose  what the exercises are FOR, dropped into the page's h1 after
--            "zum" / "to": "3 Übungen zum **Entspannen**".
--   why      two sentences of context, under a bold "Warum?" on the card.
--
-- `purpose` IS NOT NULL AND `why` IS NULLABLE, and the asymmetry is the
-- product's:
--
--   * Every goal must be sayable in the headline. A goal with no `purpose` is
--     a goal the screen cannot draw at all, so the constraint is the honest
--     one and a new goal fails here rather than rendering a hole.
--   * Only one of the four CARRIES an explanation. Ben, 2026-10-15: *"Musie
--     kennenlernen", "Entspannung" und "Aktivierung" brauchen keinen
--     description text.* Those three name themselves; Achtsamkeit is the
--     abstract one, and it is the one the user testing heard *was soll das
--     bringen?* about. So an empty `why` is DATA — a card that is a headline
--     and nothing else — rather than a translation someone forgot.
alter table public.goal_i18n
  add column purpose text,
  add column why     text;

comment on column public.goal_i18n.purpose is
  'The goal as a purpose phrase, for the /exercises headline after "zum" / "to". Not null: a goal that cannot be said in the headline cannot be offered.';
comment on column public.goal_i18n.why is
  'Two sentences of context under a bold "Warum?" on the goal card. NULL is data: three of the four goals name themselves and carry none.';


-- ═══ 2 · THE FOURTH GOAL BECOMES A ROW ═════════════════════════════════════
-- `20261007100100` modelled "Musie entdecken" as the ABSENCE of a goal rather
-- than as a row, and the argument was good: a row mapped to EVERY exercise
-- falls out of step the first time somebody adds an exercise and forgets to
-- map it, and then the one option promising everything quietly stops
-- delivering it.
--
-- THE NEW MAPPING ENDS THAT ARGUMENT. *Musie kennenlernen* now offers three
-- NAMED exercises, not everything (§4 below), so there is nothing left for
-- absence to express. It is a goal like the other three and it is a row like
-- the other three.
--
-- Three consequences, and the middle one is the gain:
--   * there is no show-everything option any more. All five exercises stay
--     reachable, because the four goals between them cover all five;
--   * `sessions.goal_id` is never null again — every run from /exercises now
--     records which of the four it came from, where today the commonest
--     answer records nothing;
--   * `NO_GOAL` and `goalIdFor()` leave `apps/web/src/lib/goals.ts`.
--
-- ── THE PARKING TRICK, FOR THE SAME REASON AS 20260923150000 ──────────────
-- `goals.sort` is `not null unique` and the constraint is NOT deferrable, so
-- an insert at sort 1 while a row holds sort 1 fails mid-statement. Park every
-- existing row out of the way, insert, then land all four.
update public.goals set sort = sort + 1000;

insert into public.goals (id, sort) values ('get-to-know-musie', 1);

-- The order here is the order of the cards in the sheet, and therefore also
-- WHICH GOAL IS THE DEFAULT: `lib/goals.ts` takes the first by `sort` rather
-- than naming an id, so "the default" and "the first card" are one fact that
-- cannot drift. Changing the default is a change to this block.
update public.goals set sort = 2 where id = 'relax';
update public.goals set sort = 3 where id = 'wake-up';
update public.goals set sort = 4 where id = 'mindfulness';


-- ═══ 3 · THE WORDS ═════════════════════════════════════════════════════════
-- The German is Ben's own and is NOT the Mindfulness Cards spreadsheet's, so
-- the seed's PROVISIONAL GERMAN caveat does not apply to this table — the same
-- note `20261007100100` carries. Written to docs/GERMAN-UI-WRITING.md:
-- sentence case, du, and no em dashes.
--
-- ── `wake-up` KEEPS ITS ID AND IS NOW CALLED *Energie* ────────────────────
-- The slug reads stale and stays anyway. It is referenced by
-- `exercise_goals.goal_id` and by `sessions.goal_id`, so renaming it means
-- either a cascade through two tables or nulling the goal on diary rows that
-- already carry it. A slug nobody sees is a cheaper thing to live with than a
-- rewritten history — which is the call `20260923150000` made for
-- `body-scan-soundwalk`, on screen as *Bodyscan* since September.
--
-- *Energie*, not *Aktivierung* — Ben, 2026-10-15. The card answers *Was
-- brauchst du gerade?* and "Aktivierung" is what a clinician needs, not what a
-- person needs; "Energie" is the word somebody would actually use about
-- themselves. The PURPOSE phrase stays *Aktivieren*, because the headline asks
-- a different question — what the exercises are FOR, not what you need — and
-- "Übungen zum Energie" is not a sentence.

-- ── THE NEW ROW ───────────────────────────────────────────────────────────
-- *Einen Weg Musie kennenzulernen* is phrased to complete *Ich brauche …*,
-- which is what the sheet asks. It is the default card, and it carries no
-- `why`: somebody who has just arrived is told what the three exercises do by
-- doing one, not by being argued at first.
insert into public.goal_i18n (goal_id, locale, label, purpose, why) values
  ('get-to-know-musie', 'de', 'Einen Weg Musie kennenzulernen', 'Musie kennenlernen', null),
  ('get-to-know-musie', 'en', 'A way into Musie',               'get to know Musie',  null);

-- ── THE THREE THAT EXISTED ────────────────────────────────────────────────
update public.goal_i18n set
  label   = 'Entspannung',
  purpose = 'Entspannen',
  why     = null
where goal_id = 'relax' and locale = 'de';

update public.goal_i18n set
  label   = 'Relaxation',
  purpose = 'relax',
  why     = null
where goal_id = 'relax' and locale = 'en';

update public.goal_i18n set
  label   = 'Energie',
  purpose = 'Aktivieren',
  why     = null
where goal_id = 'wake-up' and locale = 'de';

update public.goal_i18n set
  label   = 'Energy',
  purpose = 'get going',
  why     = null
where goal_id = 'wake-up' and locale = 'en';

-- ── THE ONE THAT EXPLAINS ITSELF ──────────────────────────────────────────
-- The only `why` in the table, and the reason the column exists. "Achtsamkeit"
-- is the one of the four that a person cannot price without help: the other
-- three name a state you already know you want.
--
-- Two sentences, in Ben's register, and deliberately not three. No em dashes
-- and no *nicht X, sondern Y* — the patterns he asked to keep out.
update public.goal_i18n set
  label   = 'Achtsamkeit',
  purpose = 'Achtsamer werden',
  why     = 'Achtsamkeit wächst mit jeder Übung und braucht Wiederholung mehr als Vorsätze. '
            || 'Musik gibt deiner Aufmerksamkeit etwas, woran sie sich halten kann, wenn die Gedanken abdriften.'
where goal_id = 'mindfulness' and locale = 'de';

update public.goal_i18n set
  label   = 'Mindfulness',
  purpose = 'grow more mindful',
  why     = 'Mindfulness grows with every practice, and repetition does more for it than resolutions. '
            || 'Music gives your attention something to hold on to when your thoughts drift.'
where goal_id = 'mindfulness' and locale = 'en';


-- ── AND NOW `purpose` CAN BE DECLARED ─────────────────────────────────────
-- After the data, never before: this statement is what fails loudly if a goal
-- row has an i18n row in one locale and not in the other, which is the check
-- worth having at exactly this moment.
alter table public.goal_i18n
  alter column purpose set not null;


-- ═══ 4 · WHICH EXERCISE SERVES WHICH GOAL ══════════════════════════════════
-- Ben's mapping, 2026-10-15, verbatim and in his order. It replaces the five
-- pairs seeded on 2026-10-07, which filed every exercise under `mindfulness`
-- alone — a starting point whose stated consequence was that *choosing
-- Entspannen or Aufwachen offers nothing at all.*
--
--   Musie kennenlernen   Achtsam Atmen · Bodyscan · Freie Bahn
--   Entspannen           Klangreise · Bodyscan · Achtsam Atmen
--   Aktivieren           Klangreise · Achtsam Atmen · Freie Bahn
--   Achtsamer werden     Achtsame Pause · Freie Bahn · Klangreise
--
-- DELETE THEN INSERT, not a diff: twelve rows, all of them restated, and a
-- diff would be a longer way to say the same thing less clearly.
--
-- ── TWO FACTS ABOUT THIS TABLE THAT ARE EASY TO MISS ──────────────────────
-- EVERY EXERCISE IS REACHABLE and every goal offers three. That is what
-- replaces the show-everything option, and it is a property of this block
-- rather than of the code — `db.content.db.test.ts` asserts both, so a future
-- mapping that strands an exercise fails a test instead of hiding it.
--
-- `mindfulness-cards` — Achtsame Pause, the flagship card exercise — APPEARS
-- UNDER ONE GOAL ONLY. That is Ben's mapping and it is kept as written, but it
-- means somebody who never chooses *Achtsamer werden* never meets the paper
-- deck. Logged in apps/web/OPEN-QUESTIONS.md.
--
-- `breathing-score` is in three of the four and is `implemented = false`. The
-- headline counts only what can be STARTED (PRD §7), so three of the four
-- goals read "2 Übungen" over a pile of three cards until Achtsam Atmen
-- ships. Deliberate, and it converges on its own with no content change.
delete from public.exercise_goals;

insert into public.exercise_goals (exercise_id, goal_id) values
  ('breathing-score',     'get-to-know-musie'),
  ('body-scan-soundwalk', 'get-to-know-musie'),
  ('free-rein',           'get-to-know-musie'),

  ('sound-journey',       'relax'),
  ('body-scan-soundwalk', 'relax'),
  ('breathing-score',     'relax'),

  ('sound-journey',       'wake-up'),
  ('breathing-score',     'wake-up'),
  ('free-rein',           'wake-up'),

  ('mindfulness-cards',   'mindfulness'),
  ('free-rein',           'mindfulness'),
  ('sound-journey',       'mindfulness');


-- ═══ 5 · THE VIEW LEARNS ABOUT THE TWO NEW COLUMNS ═════════════════════════
-- Verbatim from `20261007100000_goals_rename.sql`, which is the most recent
-- definition — the view has been replaced twice and the older copy in
-- `20260923120000` is not it — plus two lines in the `strings` CTE.
--
-- ── A NULLABLE COLUMN IS STILL WORTH LISTING, AND THIS VIEW IS WHY ────────
-- The second half of the view reports a string only when it is null in ONE
-- locale and present in the OTHER. So `why` null in BOTH locales — which is
-- three of the four goals — is silent, and a `why` written in German and
-- forgotten in English is reported. That is exactly the distinction
-- `exercises.needs` relies on, and it is the reason a nullable column belongs
-- in here rather than being left out for being optional.
--
-- `create or replace`, never drop-and-create: dropping takes the grants to
-- `authenticated` and `service_role` with it, silently. The five output
-- columns are unchanged, so the replace is legal.
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
  union all select 'goals',      goal_id,      locale, 'purpose',    purpose    from public.goal_i18n
  union all select 'goals',      goal_id,      locale, 'why',        why        from public.goal_i18n
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
