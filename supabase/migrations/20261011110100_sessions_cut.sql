-- ═══════════════════════════════════════════════════════════════════════════
-- WHAT THE SESSION WAS ASKED, AND WHAT IT PLAYED — 2026-10-11
--
-- Three columns, and they divide into two different kinds of fact.
--
--   posture, ending   WHAT THE PERSON WAS ASKED FOR, as they answered it on
--                     the Einsteigen step. Recorded even when no cut
--                     exists for that combination — which is the point: a
--                     session that wanted *liegend · ins Einschlafen* and got
--                     the unducked original still says so, and that is how the
--                     gap stays visible a month later.
--
--   cut_id      WHAT ACTUALLY PLAYED. Null for a card exercise, and null
--                     for a listening run that fell back to the piece.
--
-- ── DOMAIN MODEL ⑥: DERIVABLE IS NOT RECORDED ─────────────────────────────
-- The cut looks derivable from the exercise and three answers — right up
-- to the day one is re-recorded, after which every past diary entry would
-- silently start claiming a cut nobody heard. A journal that changes what
-- it says you did is broken, and no constraint would catch it.
--
-- And one of those three answers is NOT EVEN ON THE ROW: the locale. Nothing
-- in `sessions` records which language the person was reading, so the cut
-- is not reconstructible from this table at all. That is the stronger half of
-- the argument.
--
-- ── THE COMPOSITE FOREIGN KEY, AND WHY IT IS NOT `set null` ───────────────
-- `sessions.track_id` already records the piece. A cut also names its
-- piece. Two columns, one fact, and they must not be able to disagree — so the
-- reference is COMPOSITE, against
-- `exercise_cuts_track_cut unique (track_id, id)`:
--
--   foreign key (track_id, cut_id) references exercise_cuts (track_id, id)
--
-- A session cannot claim it heard a cut of one piece while crediting
-- another. MATCH SIMPLE is the default and is what makes this one table serve
-- both kinds of run: when either column is null the constraint is not checked,
-- so a card session (cut null) and a fallback session (cut null)
-- pass untouched while `sessions_track_id_fkey` still holds the piece.
--
-- `on delete restrict` RATHER THAN `set null`, and the composite key is the
-- reason: `set null` on a composite FK nulls EVERY referencing column, so
-- deleting a cut would also wipe `sessions.track_id` — the piece you
-- heard, which the diary and */discovered-music* both read. Restrict means
-- re-recording a cut that somebody played fails loudly and the operator
-- writes a new id, which is the correct cost.
--
-- ── WHAT IS DELIBERATELY NOT HERE: THE SWITCH ─────────────────────────────
-- The listen step offers *Musik stumm, nur Anleitung*. There is no column for
-- it. A run that toggled it four times has no single answer, and a column
-- holding the last state would read as *how you listened* while meaning *where
-- the switch was when you left*. What the session records is the cut it
-- was given; what the person did with the music is not a fact about the run.
--
-- ── ACCESS: NOTHING TO DO, CHECKED RATHER THAN ASSUMED ────────────────────
-- Rule 2's second half, both roles, explicitly:
--
--   20260919120000_sessions.sql:313
--     grant select, insert, update, delete on table public.sessions to authenticated;
--   20260921100000_service_role_grants.sql:81
--     grant select, insert, update, delete on table public.sessions to service_role;
--
-- Both are TABLE-level, and a table grant covers every column the table ever
-- gets. `sessions_update_own` filters by `(select auth.uid())` on both `using`
-- and `with check` and names no column, so the client may write these three on
-- its own rows and on no others.
--
-- The same asymmetry `20261009110000` wrote down still holds: `public.tracks`
-- is different because it carries a COLUMN grant, so a column added there is
-- unreadable until a new grant names it. Nothing of the sort applies here.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.sessions
  add column cut_id text,
  add column posture      text,
  add column ending       text;

comment on column public.sessions.cut_id is
  'Which cut actually played — the two stems, in one language, for one '
  'posture and one ending. Null for a card exercise, and null for a listening '
  'run that found no cut and played the unducked original instead.';

comment on column public.sessions.posture is
  'How the person said they were listening, AS ASKED on the Einsteigen step — '
  'recorded even when no cut exists for it, which is how the gap stays '
  'visible.';

comment on column public.sessions.ending is
  'Where the person asked the piece to leave them: back into the day, or into '
  'sleep. AS ASKED — see posture.';

-- The two the segmented controls can produce, and nothing else. Null passes,
-- which is what makes them inapplicable to a card run; `sessions_status_known`
-- next door is the model.
alter table public.sessions
  add constraint sessions_posture_known
  check (posture is null or posture in ('sitting', 'lying'));

alter table public.sessions
  add constraint sessions_ending_known
  check (ending is null or ending in ('day', 'sleep'));

-- THE CUT AND THE PIECE CANNOT DISAGREE — see the header.
alter table public.sessions
  add constraint sessions_cut_belongs_to_track
  foreign key (track_id, cut_id)
  references public.exercise_cuts (track_id, id)
  on delete restrict;

-- The composite constraint indexes (track_id, cut_id) with `track_id`
-- leading, so `cut_id` alone is not covered — which is what the
-- Performance Advisor reports as an unindexed foreign key, and what a
-- "has anybody played this cut" check asks for before a re-record.
create index sessions_cut_id_idx on public.sessions (cut_id);
