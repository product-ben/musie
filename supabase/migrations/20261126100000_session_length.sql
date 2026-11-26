-- ═══════════════════════════════════════════════════════════════════════════
-- HOW LONG THIS RUN IS — chosen by the person, for card and instrument
-- exercises (Ben, 2026-11-26)
--
-- User testing: some people found an exercise too long, some too short. So a
-- card exercise and an instrument exercise ask, as the last setting on
-- Einsteigen, how long this run should be — a slider from 1:00 to 10:00 in
-- 30-second steps, starting at 2:00 (Ben, the same day: „Min length ist 1 min
-- überall, default ist 2 min"). Every one of them was fixed at 1:30 before
-- (`exercises.listen_gate_seconds`), which goes on serving the other kinds.
--
-- What the length IS did not change: it is the time the step's clock counts
-- down before „Weiter" opens. The listen step repeats the card's piece until
-- the length is reached (the pieces run 1:40–3:11) and lets the pass it is in
-- finish; the play step's timer runs for it. The bounds and the step live in
-- apps/web/src/lib/exerciseLength.ts — product numbers, not facts about a row,
-- so the column checks only that a length is a length.
--
-- ── WHAT IS SCHEMA AND WHAT IS CONTENT ────────────────────────────────────
-- Schema: one session column. Content: the intro sentence of the five
-- exercises, which named a fixed number of minutes directly above a control
-- that now sets it. `exercise_i18n` is still migration-governed (rule 4.1
-- moved four other tables), and nothing in the app edits it.
--
-- ── NO GRANT ───────────────────────────────────────────────────────────────
-- `sessions` is granted at TABLE level to authenticated and service_role
-- (20260919120000, 20260921100000), and a table grant covers every column
-- the table ever gains — 20261011110100_sessions_cut.sql says the same for
-- `cut_id`. The owner-only policies already cover the row.
--
-- After applying:
--   pnpm gen:types   the new column into database.types.ts
--   pnpm test:db     db.length.db.test.ts
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══ 1 · THE COLUMN ════════════════════════════════════════════════════════
alter table public.sessions
  add column length_seconds integer
    constraint sessions_length_seconds_sane check (length_seconds > 0);

comment on column public.sessions.length_seconds is
  'How long this run is, in seconds, as chosen on Einsteigen: the time the '
  'listen step''s clock or the play step''s timer counts down before Weiter '
  'opens. Written on the way out of Einsteigen, for card and instrument '
  'exercises only; null for every other kind, and for a run that has not left '
  'Einsteigen yet. Bounds and step: apps/web/src/lib/exerciseLength.ts.';


-- ═══ 2 · THE INTRO SENTENCE NAMES THE CHOSEN LENGTH ════════════════════════
-- „Stell sicher, dass die nächsten 2 Minuten …" stood directly above a slider
-- that can say 8:00. The whole phrase becomes `{nextMinutes}`, which
-- Einsteigen fills from the chosen length, rounded up, as the slider moves —
-- the phrase and not just the number, because at 1:00 the number alone reads
-- „die nächsten 1 Minuten": the app's catalogue holds „die nächste Minute"
-- and „die nächsten {minutes} Minuten" (`session.intro.nextMinute(s)`).
-- The Klangreise's and the Bodyscan's `{minutes}` (20261012100000) is left as
-- it is: their recordings never run a single minute.
-- By kind, like the app's rule, so the five cannot be named twice.
update public.exercise_i18n as i
set intro_md = regexp_replace(i.intro_md, 'die nächsten [0-9]+ Minuten', '{nextMinutes}')
from public.exercises as e
where e.id = i.exercise_id
  and e.kind in ('card_based', 'instruments')
  and i.locale = 'de';

update public.exercise_i18n as i
set intro_md = regexp_replace(i.intro_md, 'the next [0-9]+ minutes', '{nextMinutes}')
from public.exercises as e
where e.id = i.exercise_id
  and e.kind in ('card_based', 'instruments')
  and i.locale = 'en';
