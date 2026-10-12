-- ═══════════════════════════════════════════════════════════════════════════
-- ONE WAY OF RUNNING ONE EXERCISE — Ben, 2026-10-11
--
-- A listening exercise is not a recording with instructions attached. It is a
-- MIX: spoken guidance, and music ducked underneath that guidance. Ben's own
-- sentence is what settles the shape — *"the volume is always faded in and out
-- when the speaker says something"* — and three things follow from it that no
-- amount of modelling taste would have produced on its own.
--
--   1. THE BED IS PER LANGUAGE. Ducking automation follows the SCRIPT, and a
--      German sentence and its English translation do not pause in the same
--      places. So the music under the German guidance is a different audio
--      file from the music under the English guidance, even though it is the
--      same composition. It is per posture and per ending too, for the same
--      reason: a different script read is a different automation.
--
--   2. THE TWO FILES ARE A MATCHED PAIR. They are two bounces of one session,
--      the same length. Pairing a German bed with English guidance would duck
--      the music in the wrong places — audibly wrong, and nothing in the
--      schema or the app could notice. So they are ONE ROW, and the row is the
--      constraint: there is no way to express the broken pairing.
--
--   3. WHAT GETS DISCOVERED IS NEITHER OF THEM. A ducked bed has holes in it
--      where somebody was talking; it is unusable as music and is a by-product
--      of an exercise rather than a thing to keep. */discovered-music* hands
--      back the ORIGINAL — `tracks.src`, the music as released — which is also
--      the only locale-free audio in the feature.
--
-- ── WHY THIS IS NOT A `track_versions` TABLE ──────────────────────────────
-- Three drafts of this feature tried to file the bed under `tracks`: as a
-- guided version of the piece, then as a version beside a narration, then as
-- routing columns on `exercise_tracks`. The ducking refutes all three. A ducked
-- bed is not a version OF the piece — it is not what was licensed, it cannot be
-- played on its own, and nobody would want it handed back. It is part of a
-- cut of an EXERCISE, which is what this table is.
--
-- The cheapest version of the feature turned out to be the most honest one:
-- `tracks` keeps every column, `exercise_tracks` keeps every column, the deck
-- generator is untouched, and `/discovered-music` needs no change at all.
--
-- ── THE FOUR ANSWERS ARE THE ADDRESS ──────────────────────────────────────
-- There is no routing table for a cut because there is nothing to route:
-- (exercise, locale, posture, ending) IS the lookup, and
-- `exercise_cuts_one_per_answer` is what makes it one exact row.
--
-- A combination with no row plays the original piece instead, with no guidance
-- and no switch — which is also the locale rule: NOTHING EVER CROSSES LOCALES,
-- not even the bed. `public.missing_cuts` at the foot of this file is the
-- recording schedule that falls out of it.
--
-- ── CORRECTED 2026-10-12, WHEN THE REAL AUDIO ARRIVED ────────────────────
-- This file was written on 2026-10-11 against an assumption about what the
-- studio would deliver: two STEMS at final mix level — guidance, and the
-- ducked bed — which the app would sum at unity. Ben's delivery is not that,
-- and the difference is not cosmetic:
--
--   BodyScan - mit Klang.mp3    3:03   the exercise AS MIXED
--   BodyScan - ohne Klang.mp3   3:03   the same recording, bed REMOVED
--
-- Those are a mix and a mix-minus-music, not two layers. Summing them would
-- play the guidance TWICE, a few milliseconds apart. So the second file is an
-- ALTERNATIVE to the first rather than a partner for it, the app swaps between
-- them at the same position, and the columns below say that instead.
--
-- EDITING THIS FILE RATHER THAN STACKING AN `alter` ON TOP, and rule 4 permits
-- exactly this much: it had never been applied anywhere when the correction
-- was found — `to_regclass('public.exercise_cuts')` was null on the
-- local stack and no migration of this branch appeared in
-- `supabase_migrations.schema_migrations`, checked rather than assumed. Rule 4
-- forbids editing an APPLIED migration, because Supabase records one by
-- timestamp and would skip the edit in silence. Nothing has recorded this one.
--
-- ── THE SWITCH, AS THE FILES ACTUALLY ALLOW IT ───────────────────────────
-- The listen step offers *Musik stumm, nur Anleitung*, off by default. On, the
-- app pauses the mix, moves the guidance-only cut to that exact position and
-- plays it — the two files are the same length by construction, so the
-- position carries over exactly. Off again is the same move in reverse.
--
-- It is offered ONLY where `voice_src` exists, and for Klangreise there never
-- will be one: it *"makes no sense with one of the stems muted, so there is no
-- adaptation possible"* (Ben, 2026-10-12). The music is that exercise. So the
-- nullable `voice_src` is not a column waiting to be filled — it is how the
-- schema holds two exercises that differ in kind, and the switch renders away
-- where it is null rather than appearing and doing nothing.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.exercise_cuts (
  -- DERIVED FROM THE FOUR ANSWERS — `cut-sound-journey-de-lying-sleep`. The
  -- generator writes it, so the id, the object keys and the address agree by
  -- construction and nothing is typed twice.
  id               text    primary key,
  exercise_id      text    not null references public.exercises (id) on delete cascade,

  -- ── THE ADDRESS, AND TWO THIRDS OF IT MAY BE NULL ──────────────────────
  -- `locale` is `not null`: a recording that does not say which language it
  -- speaks is a file nobody can safely play, and nothing ever crosses locales.
  --
  -- `posture` and `ending` ARE nullable, and null means *this recording serves
  -- any answer*. That is what the delivery actually looks like: Bodyscan is ONE
  -- recording for every combination, and Klangreise is two that differ by
  -- ending and not by posture. The alternative was eight rows pointing at four
  -- files, which is the same fact entered twice and a lie about how specific
  -- the audio is.
  --
  -- A MORE SPECIFIC ROW ALWAYS WINS — `getListenAudio` prefers an exact match
  -- over a null — so the day a posture-specific cut arrives it takes over
  -- without anything being deleted.
  locale           text    not null,
  posture          text,
  ending           text,

  -- ── THE TWO FILES: THE MIX, AND THE MIX WITHOUT ITS MUSIC ──────────────
  -- Object keys in the private `tracks` bucket, `cut-` prefixed.
  --
  -- `mixed_src` is the exercise as mixed, and is what plays. `not null`,
  -- because it IS the recording: a cut without it is not one.
  --
  -- `voice_src` is the same recording with the bed removed, and is NULLABLE — it is
  -- what the switch swaps to, so its absence is simply a run with no switch.
  -- The two are never played together; see the header.
  mixed_src        text    not null unique,
  voice_src        text             unique,

  -- ONE duration for both, because they are two exports of one cut and are the
  -- same length — measured at 182.857s for both Bodyscan files and 573.858s
  -- for both Klangreise ones. `music:upload` refuses a pair that disagrees by
  -- more than 250 ms, which is what makes the swap land on the same moment
  -- rather than near it.
  duration_seconds integer not null,

  -- THE MUSIC CREDITED INSIDE THE MIX — and what the reveal names. `restrict`,
  -- like `exercise_tracks.track_id`: deleting a recording that something still
  -- plays should fail loudly rather than quietly unhook it.
  --
  -- NULLABLE, AND NULL TODAY FOR BOTH EXERCISES. The mix certainly contains
  -- music, but `tracks` is about a piece we hold a FILE for — the unducked
  -- original, which is what /discovered-music hands back — and that export is
  -- still to come (Ben, 2026-10-12). So the credit arrives WITH the file rather
  -- than before it, and until then these runs are played and not discovered.
  -- Which cuts still have no credit is asked in `music.db.test.ts`,
  -- because it is a content question and not a constraint.
  track_id         text             references public.tracks (id) on delete restrict,

  constraint exercise_cuts_locale_known  check (locale  in ('de', 'en')),
  constraint exercise_cuts_posture_known
    check (posture is null or posture in ('sitting', 'lying')),
  constraint exercise_cuts_ending_known
    check (ending  is null or ending  in ('day', 'sleep')),
  constraint exercise_cuts_duration_positive check (duration_seconds > 0),

  -- THE LOOKUP. One cut per combination of answers it claims to serve —
  -- and `nulls not distinct`, because without it one exercise could quietly
  -- collect two rows that both claim *any posture* and nothing would complain.
  constraint exercise_cuts_one_per_answer
    unique nulls not distinct (exercise_id, locale, posture, ending),

  -- What `sessions`' composite foreign key references — see
  -- 20261011110100_sessions_cut.sql. `id` is already unique as the PK;
  -- Postgres needs a unique constraint on exactly these two columns.
  constraint exercise_cuts_track_cut unique (track_id, id)
);

comment on table public.exercise_cuts is
  'One produced recording of one exercise, in one language, for the postures '
  'and endings it claims to serve — null means any. Two files: the mix, and '
  'the same cut without its music, which the switch swaps to. Ours, not '
  'licensed. track_id credits the music inside the mix once we hold the '
  'unducked original, which is the file /discovered-music hands back.';

comment on column public.exercise_cuts.mixed_src is
  'The exercise as mixed: guidance over music. What plays.';

comment on column public.exercise_cuts.voice_src is
  'The same cut with the music bed removed — what the *Musik stumm* switch '
  'swaps to, at the same position. Null means this cut has no switch.';

comment on column public.exercise_cuts.duration_seconds is
  'Both stems, which are the same length by construction. Measured from the '
  'file by music:upload, never typed.';

-- The unique constraint above indexes (exercise_id, locale, posture, ending)
-- and (track_id, id), so `exercise_id` is covered as a leading column and
-- `track_id` is covered too. This is the index the PERFORMANCE ADVISOR would
-- otherwise report for the FK — kept because `track_id` leading is the
-- direction `/discovered-music`'s neighbours ask in.
create index exercise_cuts_track_id_idx
  on public.exercise_cuts (track_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- ACCESS — rule 2, both halves, and the second one is the one that gets missed
--
-- `service_role` has BYPASSRLS and NO table privileges, and Postgres checks
-- privileges before it consults RLS. On 2026-09-21 that cost 23 tests in three
-- files for one cause. So both roles, explicitly, below.
--
-- NO COLUMN GRANT, unlike `public.tracks`. This table holds an exercise id,
-- the four answers the person themselves gave, two object keys, a duration and
-- a piece id — and `tracks.id` is opaque (`trk-01`) precisely so that being
-- readable costs nothing. `tracks.title` and `tracks.artist` stay withheld and
-- `reveal-track` stays the only door, which is why the German and the English
-- run of one exercise reveal the same credit.
--
-- The revoke is not decoration: this stack ships `alter default privileges in
-- schema public grant all on tables to postgres, anon, authenticated,
-- service_role`, so the table above arrives ALREADY fully granted to `anon`.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.exercise_cuts enable row level security;

-- Content is global: every signed-in user sees the same catalogue, so the
-- policy is unconditional. It exists to make the table readable at all once
-- RLS is on, not to filter.
create policy exercise_cuts_select
  on public.exercise_cuts for select to authenticated using (true);

revoke all on table public.exercise_cuts from anon, authenticated;

grant select on table public.exercise_cuts to authenticated;

grant select                 on table public.exercise_cuts to service_role;
grant insert, update, delete on table public.exercise_cuts to service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- missing_cuts — the recording schedule, as a query
--
-- One row per (listening exercise × locale × posture × ending) that has no
-- cut, and what plays instead. It is the answer to *what does an English
-- tester actually get today*, which is otherwise only discoverable by running
-- the app in English and listening.
--
-- `falls_back_to` is the piece whose UNDUCKED original plays for that
-- combination, read from any cut of the same exercise and ending. Null
-- means nothing plays at all and the listen step runs its simulated clock.
--
-- ── security_invoker, AND GRANTED TO service_role ONLY ────────────────────
-- A Postgres view is owner-privileged by default, which would quietly bypass
-- the policy above — that is what the Security Advisor reports as
-- security_definer_view, and `missing_translations` carries the same setting
-- for the same reason.
--
-- The grant is narrower than that view's on purpose: this one is an OPERATOR
-- report about recordings that do not exist yet. A listener has no business
-- reading the production schedule, which is the same reasoning that took
-- `licence_ref` off the client on 2026-09-21.
-- ═══════════════════════════════════════════════════════════════════════════

create view public.missing_cuts with (security_invoker = true) as
with wanted (exercise_id, locale, posture, ending) as (
  select e.id, l.locale, p.posture, n.ending
  from public.exercises e
  cross join (values ('de'), ('en'))          as l (locale)
  cross join (values ('sitting'), ('lying'))  as p (posture)
  cross join (values ('day'), ('sleep'))      as n (ending)
  where e.kind = 'listening_only'
)
select
  w.exercise_id,
  w.locale,
  w.posture,
  w.ending
from wanted w
-- A NULL IN THE ROW IS A WILDCARD, and that is the whole of the change the
-- real delivery forced: one Bodyscan recording with a null posture and a null
-- ending covers all four of its combinations, so a view that compared the
-- columns for equality would have reported sixteen holes while the audio
-- played perfectly. The app's own resolver reads the same way.
where not exists (
  select 1
  from public.exercise_cuts r
  where r.exercise_id = w.exercise_id
    and r.locale      = w.locale
    and (r.posture is null or r.posture = w.posture)
    and (r.ending  is null or r.ending  = w.ending)
);

comment on view public.missing_cuts is
  'Every (listening exercise, locale, posture, ending) that no cut '
  'covers — a null posture or ending in a cut counts as covering all of '
  'them. The recording schedule. Operator only.';

revoke all on table public.missing_cuts from anon, authenticated;
grant select on table public.missing_cuts to service_role;
