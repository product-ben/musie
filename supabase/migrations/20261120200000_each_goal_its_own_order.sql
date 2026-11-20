-- ═══ EACH GOAL ITS OWN ORDER, AND THE CARD EXERCISES UNDER „ENTSPANNEN" ═══
-- Ben, 2026-11-20 — D10 and D11 of „Zwei Tracks pro Karte"
-- (`20261120100000_two_tracks_per_card.sql`).
--
-- ── WHY AN ORDER PER GOAL ─────────────────────────────────────────────────
-- Until today every goal read ONE order, `exercises.sort`, and the two card
-- exercises are 1 and 2 in it. Filed under „entspannen" as they were, they
-- would have opened the DEFAULT goal and pushed Klangreise and Body Scan out
-- of the first view. Ben: „Own order per goal" — where an exercise stands is a
-- fact about the goal it is filed under, not about the exercise, so it lives
-- on the join row. `exercises.sort` stays: it is still the catalogue's order
-- everywhere a goal is not involved (the builder, `/goal-mappings`).
--
-- The other half of the same answer — „Show one exercise of each type per
-- goal by default" — is the screen's, and it is in `lib/goals.ts`
-- (`oneOfEachKind`), not here: it is a way of LOOKING at this order.
--
-- ── WHY NOW: LUCIA'S RELAX PIECES ARE IN (D10) ────────────────────────────
-- Under „entspannen" a card plays its RELAX piece (`sessions_card_plays()`),
-- and a card without one says „Kein Track zugeordnet". The card exercises
-- waited for Lucia to enter those pieces at /maintenance; Ben reported on
-- 2026-11-20 that she has. `pnpm assets:check` names any card still without
-- one (a note, "no relax piece yet") after this merges and every day after.
--
-- ── ACCESS: NOTHING TO GRANT ──────────────────────────────────────────────
-- A column on an existing table. `exercise_goals` is granted TABLE-WIDE —
-- `select` to authenticated, `select, insert, update, delete` to service_role
-- (`20260918150500`, `20260921100000`, `20260921103000`) — so the new column
-- is covered by grants that are already there, and the select policy is
-- `using (true)`. Nothing here widens what anybody can read.


-- ═══ 1 · THE COLUMN, FILLED WITH TODAY'S ORDER ════════════════════════════
-- Today's order IS `exercises.sort` within each goal, so ranking by it makes
-- this migration change nothing a visitor sees except what section 2 adds.
-- `e.id` breaks a tie no row has today, so the result can never depend on
-- the order Postgres happens to scan in.
alter table public.exercise_goals add column sort integer;

update public.exercise_goals target
   set sort = ranked.position
  from (
    select eg.exercise_id,
           eg.goal_id,
           row_number() over (partition by eg.goal_id order by e.sort, e.id) as position
      from public.exercise_goals eg
      join public.exercises e on e.id = eg.exercise_id
  ) ranked
 where ranked.exercise_id = target.exercise_id
   and ranked.goal_id = target.goal_id;

-- NOT NULL, so a later migration that files an exercise under a goal must say
-- WHERE — loudly, at the insert, rather than landing somewhere arbitrary.
-- UNIQUE per goal and NOT deferrable, like `goals.sort` and `exercises.sort`:
-- a reorder parks the rows first (`20261111120000_three_goals.sql` §3 shows
-- the trick).
alter table public.exercise_goals
  alter column sort set not null,
  add constraint exercise_goals_sort_positive check (sort > 0),
  add constraint exercise_goals_goal_id_sort_key unique (goal_id, sort);

comment on column public.exercise_goals.sort is
  'Where this exercise stands under this goal: 1 first. Per goal since '
  '2026-11-20 (Ben, D11) — until then every goal read exercises.sort. The '
  'library shows the first exercise of each kind in this order, and all of '
  'them behind „Alle Übungen zeigen".';


-- ═══ 2 · ACHTSAME PAUSE AND FREIE BAHN UNDER „ENTSPANNEN", LAST (D10) ════
-- At the END of the goal, in the catalogue's order (Achtsame Pause, then
-- Freie Bahn). They are the goal's only card exercises, so the first view
-- shows Achtsame Pause wherever it stands; the place decides where it lies in
-- the pile and the list, and that is behind everything „entspannen" offered
-- before it.
insert into public.exercise_goals (exercise_id, goal_id, sort)
select e.id,
       'relax',
       (select coalesce(max(eg.sort), 0) from public.exercise_goals eg where eg.goal_id = 'relax')
         + row_number() over (order by e.sort, e.id)
  from public.exercises e
 where e.id in ('mindfulness-cards', 'free-rein')
on conflict (exercise_id, goal_id) do nothing;
