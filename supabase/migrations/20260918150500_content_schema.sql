-- ═══════════════════════════════════════════════════════════════════════════
-- CONTENT TABLES
--
-- Replaces reference/design_system/data/mindfulness-cards.js, whose shape is
-- the spec for everything below.
--
-- The app ships German AND English. Translatable strings therefore live in
-- sibling _i18n tables, one row per locale — not in name_de / name_en columns
-- and not in JSONB.
--
-- WHY, stated once: with a translation table, a missing German string is a
-- missing ROW, and one query finds every one of them (see the
-- missing_translations view at the foot of this file). With JSONB or suffixed
-- columns it is a null nobody notices until a user reads an English sentence
-- on a German screen.
--
-- That argument only holds if the columns cannot themselves be null, so every
-- i18n column the source always provides is NOT NULL here. What stays nullable
-- is exactly what the source genuinely lacks for some rows, and that is the
-- surface the view's null-mismatch check covers.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══ USER TYPES ═══════════════════════════════════════════════════════════
create table public.user_types (
  id          text    primary key,
  implemented boolean not null default false,
  image_url   text,
  sort        integer not null unique
);

create table public.user_type_i18n (
  user_type_id text not null references public.user_types (id) on delete cascade,
  locale       text not null check (locale in ('de', 'en')),
  label        text not null,
  -- Required per option by RadioGroupImage: the picture is how the option is
  -- recognised, so alt="" must not be reachable.
  image_alt    text not null,
  primary key (user_type_id, locale)
);


-- ═══ SITUATIONS ═══════════════════════════════════════════════════════════
create table public.situations (
  id   text    primary key,
  sort integer not null unique
);

create table public.situation_i18n (
  situation_id text not null references public.situations (id) on delete cascade,
  locale       text not null check (locale in ('de', 'en')),
  label        text not null,
  primary key (situation_id, locale)
);


-- ═══ EXERCISES ══════════════════════════════════════════════════════════════
create table public.exercises (
  id            text    primary key,
  -- Minutes, and a RANGE because the reflection has no fixed length.
  timeframe_min integer not null,
  timeframe_max integer not null,
  needs_cards   boolean not null default false,
  needs_sound   boolean not null default false,
  image_url     text,
  implemented   boolean not null default false,
  sort          integer not null unique,
  -- ── HOW MUCH OF THE TRACK HAS TO BE BEHIND YOU ────────────────────────
  -- Before the reflection is worth starting. A TIME, NOT A COMPLETION: the
  -- exercise works from some way in, and demanding the whole track would make
  -- a five-minute piece a five-minute wait.
  --
  -- A COLUMN BECAUSE IT VARIES BY EXERCISE (Ben, 2026-09-20). It began as a
  -- hardcoded 90 in the listen step, carried over from the prototype, and a
  -- fifteen-minute Body Scan Soundwalk and a two-minute card draw plainly do
  -- not earn the same gate. It sits HERE rather than in `exercise_i18n`
  -- because it is a number, not copy — the same reasoning that puts
  -- `timeframe_min` here.
  --
  -- NOT NULL with a default: every exercise has an answer, and the default is
  -- the one measured value the product actually has. The app still caps it at
  -- the track's own length, so a gate longer than the recording is satisfied
  -- by finishing it rather than becoming unreachable.
  listen_gate_seconds integer not null default 90,
  constraint exercises_timeframe_order    check (timeframe_min <= timeframe_max),
  constraint exercises_timeframe_positive check (timeframe_min > 0),
  -- Positive, and no upper bound: the cap belongs to the track, which this
  -- table cannot see. Zero would mean "no gate", which is a thing somebody
  -- may want and is not expressible as a negative.
  constraint exercises_listen_gate_positive check (listen_gate_seconds >= 0)
);

comment on column public.exercises.listen_gate_seconds is
  'Seconds of the track that must be behind the listener before the reflection '
  'unlocks. Capped at the track''s own duration by the app.';

create table public.exercise_i18n (
  exercise_id    text not null references public.exercises (id) on delete cascade,
  locale         text not null check (locale in ('de', 'en')),
  -- ── EXERCISE-LIBRARY COPY ─────────────────────────────────────────────
  -- What /exercises says about an exercise before anyone starts it. NOT step
  -- copy, which is the block below.
  name           text not null,
  description    text not null,
  -- Nullable, and legitimately so: only the implemented exercise carries these
  -- two in the source. They are absent in BOTH locales, which is data rather
  -- than a missing translation — and is why missing_translations compares the
  -- locales against each other instead of simply testing for null.
  needs          text,
  duration_label text,
  -- ── STEP COPY ─────────────────────────────────────────────────────────
  -- THE STEP COPY FOLLOWS THE EXERCISE, not the card and not the track. One
  -- set per exercise, used with every card that exercise draws: card 3 is
  -- Anger in every exercise, and what you are told to do with it is not the
  -- card's to say.
  --
  -- FOUR STEPS, FIXED: intro → scan → listen → reflect. One column each, so a
  -- step's copy is found by its own name and a fifth step would be a migration
  -- rather than a convention.
  --
  -- A LIST, NOT A PARAGRAPH. Each step carries 1–3 sentences and each element
  -- RENDERS AS ITS OWN PARAGRAPH, so the array boundary IS the paragraph
  -- break. One text column would put the screen in the business of splitting
  -- prose on punctuation, which is wrong in German the first time a sentence
  -- ends in an abbreviation.
  --
  -- scan_text was `guideline`: that column always held the card-picking
  -- advice, which is the scan step. listen_text was `listening`.
  --
  -- Nullable because the source has none of it: the prototype wrote nine
  -- per-card variants and no exercise-level copy at all, so all four arrive
  -- from the Mindfulness Cards spreadsheet. Three of each, in both locales.
  intro_text     text[],
  scan_text      text[],
  listen_text    text[],
  reflect_text   text[],
  -- ONE QUESTION PER EXERCISE, SHOWN TWICE: on the listen step, so the
  -- listener knows what they are listening for, and again on the reflect step,
  -- where they answer it. One string — two columns, or an array of two, could
  -- silently disagree with themselves, and the whole point is that the
  -- question asked and the question answered are the same question.
  question       text,
  image_alt      text not null,
  primary key (exercise_id, locale)
);

create table public.exercise_situations (
  exercise_id  text not null references public.exercises (id) on delete cascade,
  situation_id text not null references public.situations (id) on delete cascade,
  primary key (exercise_id, situation_id)
);

-- The PK indexes exercise_id (leading column) but NOT situation_id, so a lookup
-- by situation — which is the direction the product actually asks in ("what
-- can I do about this feeling?") — would be a sequential scan. It is also what
-- the Performance Advisor reports as an unindexed foreign key.
create index exercise_situations_situation_id_idx
  on public.exercise_situations (situation_id);


-- ═══ CARDS ════════════════════════════════════════════════════════════════
create table public.cards (
  id        text    primary key,
  -- The code printed on the paper card, beside its QR code.
  code      text    not null unique,
  image_url text,
  sort      integer not null unique
);

-- A card carries its FEELING and nothing else that reads: the listening
-- instruction and the reflection question moved to the exercise, and the track
-- moved to the (exercise, card) pair. Card 3 is Anger in every exercise; what
-- it sounds like, and what you are asked about it, are not the card's to say.
create table public.card_i18n (
  card_id   text not null references public.cards (id) on delete cascade,
  locale    text not null check (locale in ('de', 'en')),
  feeling   text not null,
  -- Nullable: the source has no per-card alt text, and inventing it would be
  -- authoring copy. Null in both locales, so the view stays quiet about it.
  image_alt text,
  primary key (card_id, locale)
);

-- ── TRACKS ────────────────────────────────────────────────────────────────
-- The music, stored ONCE.
--
-- A recording is a thing in its own right: it is licensed once, credited once,
-- and may play in more than one exercise. Keying it to a pairing — which is
-- how this shipped — duplicated src, title, artist, duration AND licence_ref
-- for every place it was used, so "how many tracks are cleared for commercial
-- use" became `count(distinct src)` instead of `count(*)`, and two copies of
-- one credit could silently disagree.
--
-- No translations by design: a track title and an artist name are not
-- translated.
create table public.tracks (
  id               text    primary key,
  src              text    not null unique,
  -- Seconds, so a countdown can render before the file has loaded.
  duration_seconds integer not null check (duration_seconds > 0),
  title            text    not null,
  artist           text    not null,
  licence_ref      text
);

-- ── THE IDS ARE DELIBERATELY OPAQUE ───────────────────────────────────────
-- `trk-01`, not `morgenlicht`. Every other id in this schema is a readable
-- slug, and here that would be a leak: `exercise_tracks.track_id` IS granted
-- to the client, so an id derived from the title would hand over the answer
-- the column grant below exists to withhold. The premise of the exercise is a
-- listener who is not primed by the track name.
comment on table public.tracks is
  'One row per recording. Ids are opaque on purpose: a title-derived slug '
  'would leak through exercise_tracks.track_id, which clients can read.';

comment on column public.tracks.title is
  'An ANSWER. Never granted to authenticated — see the column grants.';
comment on column public.tracks.artist is
  'An ANSWER. Never granted to authenticated — see the column grants.';


-- ── WHICH TRACK PLAYS WHEN ────────────────────────────────────────────────
-- The pairing, and the only thing that varies by exercise.
--
-- card_id is NULLABLE: all three exercises need sound and only one draws
-- cards, so a null card_id is "the exercise's own track".
--
-- `nulls not distinct` is load-bearing. By default Postgres treats two NULLs
-- as distinct, so without it an exercise could silently collect several "own"
-- tracks and nothing would complain.
create table public.exercise_tracks (
  id          uuid primary key default gen_random_uuid(),
  exercise_id text not null references public.exercises (id) on delete cascade,
  card_id     text          references public.cards (id)     on delete cascade,
  -- RESTRICT, not cascade: deleting a recording that something still plays
  -- should fail loudly rather than quietly unhook it.
  track_id    text not null references public.tracks (id)    on delete restrict,
  constraint exercise_tracks_one_per_pair unique nulls not distinct (exercise_id, card_id)
);

-- The unique constraint indexes exercise_id first, so neither card_id nor
-- track_id is covered — which is what the Performance Advisor reports as an
-- unindexed foreign key.
create index exercise_tracks_card_id_idx  on public.exercise_tracks (card_id);
create index exercise_tracks_track_id_idx on public.exercise_tracks (track_id);

comment on column public.tracks.artist is
  'An ANSWER. Never granted to authenticated — see the column grants.';


-- ═══════════════════════════════════════════════════════════════════════════
-- ACCESS
--
-- RLS on every table, one select policy for authenticated, and SELECT is the
-- only privilege granted. Content changes by migration only, so there is no
-- insert, update or delete policy anywhere — a client write is refused by the
-- privilege check before RLS is even consulted.
--
-- ── THE REVOKE IS NOT DECORATION ──────────────────────────────────────────
-- MEASURED on this stack: it ships
--
--   alter default privileges in schema public
--     grant all on tables to postgres, anon, authenticated, service_role;
--
-- so every table above arrives with ALL privileges already granted to anon
-- AND authenticated. Two consequences, both silent:
--
--   1. Without the revoke, `grant select (exercise_id, card_id, …)` on tracks
--      ADDS TO a table-wide select that is already there. title and artist
--      stay readable, and the column-level grant looks implemented while
--      doing nothing at all.
--   2. anon would hold privileges on content it has no business reading.
--
-- Revoke first, then grant. The order is the point.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.user_types          enable row level security;
alter table public.user_type_i18n      enable row level security;
alter table public.situations          enable row level security;
alter table public.situation_i18n      enable row level security;
alter table public.exercises           enable row level security;
alter table public.exercise_i18n       enable row level security;
alter table public.exercise_situations enable row level security;
alter table public.cards               enable row level security;
alter table public.card_i18n           enable row level security;
alter table public.tracks              enable row level security;
alter table public.exercise_tracks     enable row level security;

-- Content is global: every signed-in user sees the same catalogue, so the
-- policies are unconditional. They exist to make the tables readable at all
-- once RLS is on, not to filter.
create policy user_types_select          on public.user_types          for select to authenticated using (true);
create policy user_type_i18n_select      on public.user_type_i18n      for select to authenticated using (true);
create policy situations_select          on public.situations          for select to authenticated using (true);
create policy situation_i18n_select      on public.situation_i18n      for select to authenticated using (true);
create policy exercises_select           on public.exercises           for select to authenticated using (true);
create policy exercise_i18n_select       on public.exercise_i18n       for select to authenticated using (true);
create policy exercise_situations_select on public.exercise_situations for select to authenticated using (true);
create policy cards_select               on public.cards               for select to authenticated using (true);
create policy card_i18n_select           on public.card_i18n           for select to authenticated using (true);
create policy tracks_select              on public.tracks              for select to authenticated using (true);
create policy exercise_tracks_select     on public.exercise_tracks     for select to authenticated using (true);

revoke all on table public.user_types          from anon, authenticated;
revoke all on table public.user_type_i18n      from anon, authenticated;
revoke all on table public.situations          from anon, authenticated;
revoke all on table public.situation_i18n      from anon, authenticated;
revoke all on table public.exercises           from anon, authenticated;
revoke all on table public.exercise_i18n       from anon, authenticated;
revoke all on table public.exercise_situations from anon, authenticated;
revoke all on table public.cards               from anon, authenticated;
revoke all on table public.card_i18n           from anon, authenticated;
revoke all on table public.tracks              from anon, authenticated;
revoke all on table public.exercise_tracks     from anon, authenticated;

grant select on table public.user_types          to authenticated;
grant select on table public.user_type_i18n      to authenticated;
grant select on table public.situations          to authenticated;
grant select on table public.situation_i18n      to authenticated;
grant select on table public.exercises           to authenticated;
grant select on table public.exercise_i18n       to authenticated;
grant select on table public.exercise_situations to authenticated;
grant select on table public.cards               to authenticated;
grant select on table public.card_i18n           to authenticated;
grant select on table public.exercise_tracks     to authenticated;

-- tracks: every column EXCEPT title and artist. PostgREST respects column
-- privileges, so `?select=title` fails outright rather than quietly returning
-- the answer the exercise depends on withholding.
--
-- exercise_tracks needs no column grant: it holds only ids, and tracks.id is
-- opaque precisely so that being readable costs nothing.
grant select (id, src, duration_seconds, licence_ref)
  on table public.tracks to authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- missing_translations
--
-- The one query the whole pattern exists to make possible. It reports two
-- kinds of hole:
--
--   'missing row'     — a parent record has no i18n row for a locale at all.
--   'missing string'  — the row exists, but a column carries a value in one
--                       locale and NULL in the other.
--
-- The second check compares the locales against EACH OTHER rather than
-- testing for null, which is what keeps it quiet about the two unimplemented
-- exercises that carry no `needs` / `duration_label` in either locale. Absent
-- from both is data; absent from one is a dropped translation.
--
-- ── THE FOUR STEP ARRAYS ARE FLATTENED, AND EMPTY COUNTS AS MISSING ────────
-- `strings` unpivots one text `value` per translatable column, so a text[]
-- needs a text representation: array_to_string joins it with a space, which
-- is enough because nothing downstream reads the value — only whether it is
-- null. The nullif then makes `{}` and `{""}` behave EXACTLY like NULL: an
-- empty list renders as nothing on screen, so a step whose copy was cleared
-- rather than deleted is the same hole and must report as one.
--
-- security_invoker = true so the view runs with the CALLER's privileges and
-- respects their RLS. A Postgres view is owner-privileged by default, which
-- would quietly bypass the policies above — and is what the Security Advisor
-- reports as security_definer_view.
-- ═══════════════════════════════════════════════════════════════════════════
create view public.missing_translations with (security_invoker = true) as
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
-- below is written once instead of once per column.
strings (entity, record_id, locale, column_name, value) as (
            select 'user_types', user_type_id, locale, 'label',          label          from public.user_type_i18n
  union all select 'user_types', user_type_id, locale, 'image_alt',      image_alt      from public.user_type_i18n
  union all select 'situations', situation_id, locale, 'label',          label          from public.situation_i18n
  union all select 'exercises',  exercise_id,  locale, 'name',           name           from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'description',    description    from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'needs',          needs          from public.exercise_i18n
  union all select 'exercises',  exercise_id,  locale, 'duration_label', duration_label from public.exercise_i18n
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

comment on view public.missing_translations is
  'Every translation hole in the content tables: a locale with no i18n row, or '
  'a column filled in one locale and null in the other. Should return zero rows.';

revoke all on public.missing_translations from anon, authenticated;
grant select on public.missing_translations to authenticated;
