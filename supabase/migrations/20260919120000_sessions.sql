-- ═══════════════════════════════════════════════════════════════════════════
-- SESSIONS AND REFLECTIONS
--
-- The first migration that is not content. Content is global, read-only and
-- edited in place; everything below is PER PERSON, written by the client, and
-- append-only in spirit — so it is a new file, and every policy here filters
-- by the caller instead of returning true.
--
-- A session is one run through one exercise: which exercise, which card and
-- situation it came from, which recording played, where in the four steps it
-- got to, and when it started and ended. A reflection is what the person
-- wrote or said at the end of it.
--
-- ── THIS IS A DIARY, WHICH DECIDES THE DELETE BEHAVIOUR ────────────────────
-- Stated once, because it is the reasoning behind five separate `on delete`
-- clauses below: a diary must never silently lose or rewrite what it says you
-- did. Retiring a piece of the catalogue is an editorial act; it is not a
-- licence to edit somebody's history. So the references divide in two:
--
--   RESTRICT — exercise_id, track_id. What you DID, and what you HEARD. A
--              delete that would change either must fail loudly and be dealt
--              with by a human, not succeed and leave a session claiming a
--              different exercise or no track at all.
--   SET NULL — card_id, situation_id. Detail, not identity. Retiring a card
--              or a situation loses that detail from old entries; it does not
--              invalidate them.
--   CASCADE  — user_id. A session dies with its person, and so does its
--              reflection, one link further down.
--
-- These OVERRIDE DOMAIN-MODEL.md, which specifies cascade for exercise_id.
-- Cascade there means deleting one exercise silently deletes every session
-- anybody ever ran of it, which is the exact failure the paragraph above
-- exists to prevent.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══ SESSIONS ═════════════════════════════════════════════════════════════
create table public.sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (user_id) on delete cascade,
  -- RESTRICT: see the header. Retiring an exercise somebody has done must
  -- fail, not rewrite the diary entry that says they did it.
  exercise_id  text not null references public.exercises  (id)   on delete restrict,
  -- SET NULL: a session can be started without a card (two of the three
  -- exercises draw none) and an old entry survives its card being retired.
  card_id      text          references public.cards      (id)   on delete set null,
  -- SET NULL: the situation is how the exercise was FOUND, not what was done.
  situation_id text          references public.situations (id)   on delete set null,
  -- TEXT, not uuid. Since the tracks split, `tracks.id` is the opaque text
  -- slug `trk-01`; only `exercise_tracks.id` is a uuid. DOMAIN-MODEL.md still
  -- says uuid here and is wrong — written as uuid this table does not create.
  --
  -- RESTRICT: what somebody heard is part of what they did.
  track_id     text          references public.tracks     (id)   on delete restrict,
  -- The three states a session can be in. 'abandoned' is a real outcome, not
  -- a failure: somebody who stops halfway has still had the session, and a
  -- diary that only records completions is a diary that flatters.
  status       text not null,
  -- Where in the run it is. THE FOUR STEPS ARE FIXED — intro, scan, listen,
  -- reflect — and the constraint says so here rather than in the app, so a
  -- fifth step is a migration and a typo is a failed insert.
  step         text not null,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz,
  constraint sessions_status_known check (status in ('started', 'finished', 'abandoned')),
  constraint sessions_step_known   check (step in ('intro', 'scan', 'listen', 'reflect')),
  -- ── ended_at AND status CANNOT DISAGREE ─────────────────────────────────
  -- One equality, both directions: a running session has no end time, and an
  -- ended one has one. Written as `=` between two booleans rather than two
  -- `or`-ed implications because the two failures are equally bad and equally
  -- easy to write — 'finished' with a null ended_at gives a diary entry with
  -- no date on it, and 'started' carrying one gives a session that ended
  -- before it stopped running.
  --
  -- In the DATABASE and not only the state machine: the state machine lives
  -- in one client, and a second client, a repair script or a future edge
  -- function would each have to be told again.
  constraint sessions_ended_at_matches_status
    check ((status = 'started') = (ended_at is null))
);

comment on table public.sessions is
  'One run through one exercise, per person. Deletes from the catalogue are '
  'restricted where they would change what a session says was done.';

comment on column public.sessions.track_id is
  'TEXT, because tracks.id is the opaque slug trk-NN. Only exercise_tracks.id '
  'is a uuid.';

-- ── ONE RUNNING SESSION PER PERSON, ENFORCED HERE ─────────────────────────
-- A partial unique index, so it constrains only the rows in flight: any
-- number of finished or abandoned sessions, never two started ones.
--
-- In the database because the client cannot hold this. Two tabs, a reload
-- mid-exercise, or a retried insert on a flaky connection each produce a
-- second 'started' row from code that is doing nothing wrong, and the app has
-- to be able to ask "am I already in a session?" and get one answer.
create unique index sessions_one_running_per_user
  on public.sessions (user_id)
  where status = 'started';

-- ── THE DIARY READ ────────────────────────────────────────────────────────
-- /diary is "my sessions, newest first", which is exactly this index: the
-- equality column first, the sort column second and descending, so the read
-- is an index scan with no sort step. It also covers user_id as a leading
-- column, which is why there is no separate sessions_user_id_idx below.
create index sessions_user_id_started_at_idx
  on public.sessions (user_id, started_at desc);

-- Postgres does not index the referencing side of a foreign key. Without
-- these, every delete or update of an exercise, card, situation or track row
-- sequentially scans sessions to check the constraint — and it is what the
-- Performance Advisor reports as an unindexed foreign key. user_id is absent
-- deliberately: it leads the index above.
create index sessions_exercise_id_idx  on public.sessions (exercise_id);
create index sessions_card_id_idx      on public.sessions (card_id);
create index sessions_situation_id_idx on public.sessions (situation_id);
create index sessions_track_id_idx     on public.sessions (track_id);


-- ═══ REFLECTIONS ══════════════════════════════════════════════════════════
--
-- ── ONE ABSENCE THAT IS THE DESIGN ────────────────────────────────────────
-- THERE IS NO media_path, AND NO STORAGE BUCKET. Decision D1: only text is
-- ever stored server-side, and `mode` records HOW THE TEXT WAS PRODUCED
-- rather than what kind of file is attached — because no file is ever
-- attached.
--
--   text   the person typed it.
--   voice  they said it, and OpenAI transcribed it (phase F). The audio is
--          never uploaded.
--   photo  they photographed their handwriting, and it was read back as text
--          (D13). The image is never uploaded.
--
-- All three end as words in `body`, which is why all three are one table with
-- one nullable-free text column rather than three shapes.
--
-- So DOMAIN-MODEL.md's "exactly one of body / media_path" check has nothing
-- left to choose between, and collapses to `body not null`. The column is
-- absent rather than nullable on purpose: a nullable media_path is an
-- invitation to start writing to it, and the bucket it would need would be
-- the one piece of this schema holding a recording of a voice.
--
-- 'photo' is here BEFORE the feature, deliberately. Neither voice nor photo
-- is implemented, but both are decided, and widening a check constraint costs
-- nothing while nothing is deployed (rule 4) and is an `alter table` against
-- live rows the day after A.6. The constraint says what the product is, not
-- what this week's build reaches.
create table public.reflections (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  mode       text not null,
  -- NOT NULL, and that is the whole of the D1 check: text is the only thing
  -- stored, so a reflection with no text is not a reflection.
  body       text not null,
  created_at timestamptz not null default now(),
  constraint reflections_mode_known check (mode in ('text', 'voice', 'photo')),
  -- ── TWO UNIQUES, ON PURPOSE, AND THEY ARE NOT THE SAME RULE ────────────
  -- (session_id, mode) is the PERMANENT shape: at most one written and one
  -- spoken answer per session, which is what the schema should say for good.
  --
  -- (session_id) is TODAY'S rule: one reflection per session, full stop. The
  -- reflect step offers one answer in one mode, so a second row of any kind
  -- is a bug — a double submit or a client that re-answered — and should be
  -- refused rather than stored and later disambiguated.
  --
  -- Keeping both means the day one-per-mode ships is a one-line DROP of the
  -- narrower constraint, with the permanent rule already in place and already
  -- tested, rather than a new constraint written under time pressure.
  constraint reflections_one_per_session_mode unique (session_id, mode),
  constraint reflections_one_per_session      unique (session_id)
);

comment on table public.reflections is
  'The answer given at the end of a session, ALWAYS as text. `mode` says how '
  'the text was produced: typed, transcribed from speech, or read off a '
  'photograph. No recording and no image is ever stored.';

comment on column public.reflections.body is
  'The text, always. For mode = ''voice'' it is the transcript and for '
  '''photo'' it is what was read off the image; neither the audio nor the '
  'image is ever uploaded.';

-- No reflections_session_id_idx: reflections_one_per_session is a unique
-- index on exactly that column, so the foreign key is already covered and a
-- second index would be the same index twice.


-- ═══════════════════════════════════════════════════════════════════════════
-- ACCESS
--
-- RLS, policies, revoke, then grant. Unlike the content tables, every policy
-- here FILTERS: these rows belong to one person and the whole table is a
-- diary.
--
-- `(select auth.uid())` and not bare `auth.uid()`, everywhere. The semantics
-- are identical; the subquery makes it an InitPlan evaluated once per
-- statement instead of once per row, which is what the Performance Advisor
-- reports as auth_rls_initplan. See 20260918152000_profiles_policies_initplan
-- .sql, which had to go back and fix exactly this.
--
-- ── DELETE IS GRANTED HERE, UNLIKE ON profiles ────────────────────────────
-- profiles has no delete policy at all: a profile dies with its auth user and
-- by no other route. A diary entry is different — deleting one is a thing a
-- person is entitled to do to their own record, and phase G.2 is where they
-- do it. Deleting a session takes its reflection with it through the
-- `on delete cascade` above, in one statement, which is the acceptance test
-- for this step.
--
-- ── THE REVOKE IS NOT DECORATION ──────────────────────────────────────────
-- MEASURED on this stack, and the reason this block is four statements rather
-- than two: it ships
--
--   alter default privileges in schema public
--     grant all on tables to postgres, anon, authenticated, service_role;
--
-- so both tables above arrive with ALL privileges already granted to anon AND
-- authenticated — TRUNCATE included, which would let a signed-in client empty
-- everybody's diary in one statement without RLS ever being consulted, since
-- TRUNCATE is not a row operation and no policy applies to it. The grants
-- below would look like the access model while the real one was "everything".
-- Revoke first, then grant. The order is the point.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.sessions    enable row level security;
alter table public.reflections enable row level security;

-- sessions: own rows, by the column that says whose they are. `using` for the
-- rows that can be seen or acted on, `with check` for the rows that may be
-- written — both on update, because without the check a caller could read
-- their own row and rewrite user_id to somebody else's.
create policy sessions_select_own
  on public.sessions for select to authenticated
  using (user_id = (select auth.uid()));

create policy sessions_insert_own
  on public.sessions for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy sessions_update_own
  on public.sessions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy sessions_delete_own
  on public.sessions for delete to authenticated
  using (user_id = (select auth.uid()));

-- ── reflections: OWNERSHIP IS THE SESSION'S, NOT A COPY OF IT ─────────────
-- The subquery, deliberately, instead of a user_id column on reflections. A
-- denormalised owner is a second source of truth for the same fact, and the
-- two can disagree: nothing in the schema would stop a reflection carrying
-- one user_id while its session carries another, and then the row is visible
-- to one person and owned by a different one.
--
-- `exists` against sessions is the standard pattern and costs nothing here —
-- it is a primary-key lookup, and it inherits every correction made to
-- sessions' own policy rather than needing the same fix twice.
create policy reflections_select_own
  on public.reflections for select to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = reflections.session_id and s.user_id = (select auth.uid())
  ));

create policy reflections_insert_own
  on public.reflections for insert to authenticated
  with check (exists (
    select 1 from public.sessions s
    where s.id = reflections.session_id and s.user_id = (select auth.uid())
  ));

create policy reflections_update_own
  on public.reflections for update to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = reflections.session_id and s.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.sessions s
    where s.id = reflections.session_id and s.user_id = (select auth.uid())
  ));

create policy reflections_delete_own
  on public.reflections for delete to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = reflections.session_id and s.user_id = (select auth.uid())
  ));

-- anon loses everything: an unauthenticated caller has no diary, there is no
-- anon policy on either table, and so this removes no working access.
revoke all on table public.sessions    from anon;
revoke all on table public.reflections from anon;

-- authenticated: REVOKE ALL, then grant back the four row operations.
--
-- `revoke all`, NOT an enumerated `revoke truncate, references, trigger`.
-- MEASURED on this stack (PostgreSQL 17.6): an enumerated revoke leaves
-- `authenticated=arwdm` — the trailing `m` is MAINTAIN, which arrived in
-- PG 17 and which no enumeration written before it can name. MAINTAIN only
-- permits VACUUM / ANALYZE / REINDEX / CLUSTER / REFRESH, so no data leaks
-- through it. The problem is not this privilege; it is that ANY enumerated
-- revoke silently stops being complete the next time Postgres invents a
-- privilege, and it fails OPEN.
--
-- `revoke all` followed by the grant states the whole intent in two
-- statements and cannot rot. It is also what the content tables already do,
-- and the reason they measure clean at `authenticated=r`.
revoke all on table public.sessions    from authenticated;
revoke all on table public.reflections from authenticated;

grant select, insert, update, delete on table public.sessions    to authenticated;
grant select, insert, update, delete on table public.reflections to authenticated;
