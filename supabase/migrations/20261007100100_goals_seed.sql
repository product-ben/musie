-- ═══════════════════════════════════════════════════════════════════════════
-- THE THREE GOALS, AND WHICH EXERCISE SERVES WHICH
--
-- `20261007100000` renamed the tables. This replaces what is in them: the
-- three situations seeded on 2026-09-18 — feel-feelings, get-day-started,
-- relax-busy-day — are gone, and three goals take their place.
--
-- ── DELETING THEM IS SAFE, AND THAT IS CHECKED RATHER THAN HOPED ──────────
-- `goal_i18n` and `exercise_goals` are both `on delete cascade`, so they go
-- with their parent. `sessions.goal_id` is `on delete set null` — and it is
-- null on every row that exists, because nothing has ever written it. So this
-- delete rewrites nobody's diary entry. If that ever stops being true the
-- `set null` is still the right behaviour: retiring a goal loses the detail,
-- not the entry.
--
-- ── DELETE BEFORE INSERT, BECAUSE `sort` IS UNIQUE ────────────────────────
-- `goals.sort` is `not null unique` and the constraint is NOT deferrable, so
-- an insert of sort 1 while a row already holds sort 1 fails mid-statement.
-- The parking trick `20260923150000` uses (`set sort = sort + 1000`) is for
-- REORDERING rows that stay; here they do not stay.
--
-- ── FOUR OPTIONS ON SCREEN, THREE ROWS IN THE TABLE ───────────────────────
-- "Musie entdecken" is the fourth radio and is NOT a row: it means no goal,
-- and it writes NULL to `sessions.goal_id`. A row would have to be mapped to
-- every exercise, and then every exercise added afterwards would have to
-- remember to join it or quietly vanish from the one option that promises
-- everything. Absence cannot fall out of step with the catalogue. Ben,
-- 2026-10-07.
--
-- Ids are English slugs and the labels are per locale — the same split as
-- every other id in this schema.
-- ═══════════════════════════════════════════════════════════════════════════

delete from public.goals;

insert into public.goals (id, sort) values
  ('mindfulness', 1),
  ('relax',       2),
  ('wake-up',     3);

-- The German is Ben's own and is NOT the Mindfulness Cards spreadsheet's, so
-- the seed's PROVISIONAL GERMAN caveat does not apply to this table.
-- Sentence case, du, verb phrases — docs/GERMAN-UI-WRITING.md §2 and §3.
insert into public.goal_i18n (goal_id, locale, label) values
  ('mindfulness', 'de', 'Achtsamkeit stärken'),
  ('mindfulness', 'en', 'Strengthen mindfulness'),
  ('relax',       'de', 'Entspannen'),
  ('relax',       'en', 'Relax'),
  ('wake-up',     'de', 'Aufwachen'),
  ('wake-up',     'en', 'Wake up');


-- ═══ WHICH EXERCISE SERVES WHICH GOAL ══════════════════════════════════════
-- EVERY EXERCISE TO `mindfulness`, AND ONLY THAT (Ben, 2026-10-07).
--
-- This is a starting point, not a content decision, and it has a visible
-- consequence that is worth stating here rather than discovering on screen:
-- **choosing Entspannen or Aufwachen offers nothing at all.** The screen
-- handles that honestly — a named sentence and a press back to the question,
-- never a blank pile — but it is the behaviour until this table says
-- otherwise.
--
-- `/goal-mappings` is how it says otherwise: it reads this table, lets the
-- mapping be edited, and emits the config that becomes the next migration.
-- Nothing writes here from the client; content changes by migration only.
--
-- The twelve `exercise_situations` pairs seeded on 2026-09-18 and 2026-09-23
-- are gone with their parents. They mapped a different question — "what can I
-- do about this feeling?" — and carrying them over would have filed five
-- exercises under goals nobody chose for them.
insert into public.exercise_goals (exercise_id, goal_id) values
  ('mindfulness-cards',   'mindfulness'),
  ('free-rein',           'mindfulness'),
  ('breathing-score',     'mindfulness'),
  ('sound-journey',       'mindfulness'),
  ('body-scan-soundwalk', 'mindfulness');
