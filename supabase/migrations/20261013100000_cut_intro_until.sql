-- ═══════════════════════════════════════════════════════════════════════════
-- A CUT MAY NAME WHERE ITS INTRO ENDS, AND THE SHEET OFFERS TO JUMP THERE
--
-- User testing, 2026-10-13: the Klangreise opens with ninety-five seconds of
-- framing before the piece itself begins. On a first run that is the whole
-- point; on a fourth it is ninety-five seconds somebody has heard three times
-- and cannot get past without scrubbing a bar they cannot see from the focus
-- sheet. So the recording states where its own introduction ends, and
-- `/listen?focus` offers a way to that mark.
--
-- ── IT IS A PROPERTY OF THE CUT, NOT OF THE EXERCISE ──────────────────────
-- `duration_seconds` is on this table for the reason given when it was added:
-- the same exercise can be re-recorded at a different length. An intro mark is
-- the same kind of fact and moves with the same re-record — the two Klangreise
-- endings happen to share a mark today only because they are two bounces of
-- one session. A column on `exercises` would be one answer to a question that
-- is asked once per recording.
--
-- ── SECONDS, AND NOT A `interval` ─────────────────────────────────────────
-- `duration_seconds` next door is an integer of seconds and the client does
-- arithmetic against it (`Math.min(duration, seconds)` in SessionListen's
-- `seek`). A second unit in the same row would be a conversion in every reader
-- and a bug in the one that forgot.
--
-- ── THE CHECK IS WHAT STOPS A MARK THAT CANNOT BE REACHED ─────────────────
-- Zero is not a skippable intro and is written as null; a mark at or past the
-- end would hand the sheet a button that seeks to the final frame and ends the
-- recording. Both are refused here rather than defended against in the client,
-- because the client is not the only writer — `music-migration.mjs` is.
--
-- ── ACCESS · NOTHING TO DO, AND WHY THAT IS NOT AN ASSUMPTION ─────────────
-- CLAUDE.md rule 2 is about a NEW TABLE. This is a new COLUMN on a table whose
-- grants are already table-level:
--
--   20261011110000_exercise_cuts.sql
--     grant select on table public.exercise_cuts to authenticated;
--     grant select on table public.exercise_cuts to service_role;
--
-- A table-level grant covers every column the table ever gets, so this one is
-- readable by both the moment it exists. `exercise_cuts_select` is
-- `using (true)` and names no column, so RLS has nothing to say about it
-- either.
--
-- THE ASYMMETRY `20261011110100` WROTE DOWN STILL HOLDS: `public.tracks` is
-- different because it carries a COLUMN grant (`id, src, duration_seconds,
-- licence_ref`), so a column added THERE is unreadable until a new grant names
-- it. Nothing of the sort applies here. Checked, not assumed.
--
-- ── THE SCHEMA ONLY · NO VALUE IS WRITTEN HERE ────────────────────────────
-- This file adds the column and the rule; `music.json` says where the mark
-- actually falls, and `pnpm music:migration` turns that into the insert
-- (`20261013150000`). It was both for about an hour on 2026-10-13 — the column
-- AND `update ... set intro_until = 95` — which put the Klangreise's 01:35 in
-- two files able to disagree. Ben: the mark belongs in the library file.
--
-- Editing this file afterwards is the one thing CLAUDE.md rule 4 forbids, and
-- it was checked rather than assumed: `supabase migration list` had it
-- outstanding on hosted and neither column existed on the local stack, so it
-- had been applied NOWHERE. `20261012100000`'s header is the precedent and
-- draws the same line. Once it is applied this file is frozen like the rest.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.exercise_cuts
  add column intro_until integer;

comment on column public.exercise_cuts.intro_until is
  'Where this recording''s introduction ends, in seconds from the start — the '
  'mark *Intro überspringen* jumps to on the focus sheet. Null means the '
  'recording has no skippable opening, which is every cut but the Klangreise '
  'today, and the control is then not rendered at all.';

-- Reachable, and actually an intro. See the header.
alter table public.exercise_cuts
  add constraint exercise_cuts_intro_until_inside
  check (intro_until is null or (intro_until > 0 and intro_until < duration_seconds));
