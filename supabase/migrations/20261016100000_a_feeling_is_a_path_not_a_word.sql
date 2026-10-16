-- ═══════════════════════════════════════════════════════════════════════════
-- THE FEELINGS A SESSION HELD ON TO — the reflect step's rework.
--
-- One row per feeling somebody named at the end of a run. Written the moment
-- it is confirmed in the sheet and deleted the moment its × is pressed, which
-- is the one place this table differs in temperament from `reflections`:
-- a reflection is written once, by `finish()`, and a feeling is written six
-- times by six taps.
--
-- ── A FEELING IS A PATH, NOT A WORD ───────────────────────────────────────
-- The vocabulary is `apps/web/src/content/emotionWheel.ts` — 8 primary
-- feelings, 40 below them, 80 below those — generated from
-- `supabase/content/emotion-wheel.yml`, and that file's own header is
-- emphatic about why a label cannot be a key:
--
--     "Powerful appears twice and Delighted appears twice, so `i` is the
--      identity and the label is not."
--
-- So the identity stored here is the route taken through the wheel. Levels 1
-- and 2 have stable string ids; level 3 has only its 0-based index clockwise
-- within its parent, which is what `specific_i` is.
--
-- NO LABEL COLUMN, deliberately. The word is resolved from the wheel at read
-- time in the active locale — both languages sit on every node, because these
-- are CONTENT words rather than chrome. Storing the German here would make
-- this table a third copy of a vocabulary that already has two homes, and the
-- English reader would get the German back.
--
-- ── THE STOP IS A NULL, NOT A SENTINEL ────────────────────────────────────
-- The sheet offers "einfach nur Glücklich" at level 2 and "einfach nur
-- Optimistisch" at level 3, because somebody who has found their word should
-- not be made to narrow past it. Those are rows that stop early:
--
--   einfach nur Glücklich     ('happy', null,         null)
--   einfach nur Optimistisch  ('happy', 'optimistic', null)
--   Kraftvoll                 ('happy', 'optimistic', 0)
--
-- `session_feelings_path_ordered` is what stops a path with a hole in it —
-- a level-3 index under no level-2 id is not a route anything could walk.
--
-- ── RULE 4.1 DOES NOT REACH THIS TABLE ────────────────────────────────────
-- Content moved out of migrations on 2026-10-14 for `cards`, `card_i18n`,
-- `tracks`, `grid_cells`, `artworks` and `artwork_i18n`, all of which are
-- edited at /maintenance. This is none of them: it holds what a USER wrote
-- about their own session, like `reflections`, so nothing /maintenance does
-- can clobber it and nothing here can clobber an operator's edit.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.session_feelings (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions (id) on delete cascade,
  emotion_id  text not null,
  detailed_id text,
  specific_i  integer,
  created_at  timestamptz not null default now(),

  -- A path cannot have a hole: no level-3 index without a level-2 id.
  constraint session_feelings_path_ordered
    check (detailed_id is not null or specific_i is null),

  -- ── THE DEDUPE, AND IT IS A CONSTRAINT RATHER THAN A UI RULE ────────────
  -- The sheet draws a feeling already held as disabled and says so, which is
  -- the kindness. This is the correctness: two taps racing, a retried request
  -- or a second tab cannot produce the same feeling twice, and the screen
  -- then never has to decide which of two identical × buttons to obey.
  --
  -- NULLS NOT DISTINCT, because the default is the wrong one here. Under the
  -- SQL default two rows of ('happy', null, null) do not conflict — nulls are
  -- distinct from each other — so "einfach nur Glücklich" would be the one
  -- feeling in the whole wheel you could hold twice.
  constraint session_feelings_one_per_path
    unique nulls not distinct (session_id, emotion_id, detailed_id, specific_i)
);

comment on table public.session_feelings is
  'The feelings somebody named at the end of a session, one row each. The '
  'word is NOT stored: the three columns are a path through the emotion '
  'wheel in apps/web/src/content/emotionWheel.ts, and the label is resolved '
  'from it at read time in the active locale.';

comment on column public.session_feelings.emotion_id is
  'Level 1 — one of the eight, by its stable id. Never null.';

comment on column public.session_feelings.detailed_id is
  'Level 2, by its stable id. Null when the path stopped at level 1 — the '
  'sheet''s "einfach nur {level 1}" row.';

comment on column public.session_feelings.specific_i is
  'Level 3, by its 0-based index clockwise within its parent. There is no id '
  'at this level because the wheel does not give one: the label repeats '
  'across the wheel and the position is the identity. Null when the path '
  'stopped at level 2.';

-- No session_feelings_session_id_idx: session_id is the leading column of
-- session_feelings_one_per_path, which is a unique index, so the foreign key
-- is already covered. Same argument reflections makes for itself.


-- ═══════════════════════════════════════════════════════════════════════════
-- ACCESS
--
-- RLS, policies, revoke, then grant — to `authenticated` what the client may
-- do, and to `service_role` what the server may. The second half is the one
-- that was missed on 2026-09-21 and cost 23 tests in three files for one
-- cause; `service_role` has BYPASSRLS, so one assumes the grants cannot
-- matter to it, and Postgres checks table privileges first for every role.
--
-- OWNERSHIP IS THE SESSION'S, NOT A COPY OF IT — `reflections`' pattern, and
-- its reasoning holds unchanged: a denormalised user_id is a second source of
-- truth for one fact, and the two can disagree.
--
-- `(select auth.uid())` and not bare `auth.uid()`: identical semantics, one
-- InitPlan per statement instead of one call per row. 20260918152000 had to
-- go back and fix exactly this.
--
-- ── NO UPDATE POLICY, AND THAT IS THE FEATURE ─────────────────────────────
-- Editing a confirmed feeling is out of scope: the two verbs are add and
-- remove. A table with no update policy says that in the place that can
-- enforce it, where a comment in a component could only promise it.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.session_feelings enable row level security;

create policy session_feelings_select_own
  on public.session_feelings for select to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = session_feelings.session_id and s.user_id = (select auth.uid())
  ));

create policy session_feelings_insert_own
  on public.session_feelings for insert to authenticated
  with check (exists (
    select 1 from public.sessions s
    where s.id = session_feelings.session_id and s.user_id = (select auth.uid())
  ));

create policy session_feelings_delete_own
  on public.session_feelings for delete to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = session_feelings.session_id and s.user_id = (select auth.uid())
  ));

-- anon loses everything. There is no anon policy, so this removes no working
-- access — it removes the TRUNCATE that no policy would ever have been
-- consulted about.
revoke all on table public.session_feelings from anon;

-- `revoke all`, NOT an enumerated revoke. Measured on PG 17.6 for the tables
-- above: an enumeration leaves the trailing `m` (MAINTAIN, new in PG 17) and
-- silently stops being complete the next time Postgres invents a privilege.
-- It fails OPEN. Revoke all, then grant back exactly the verbs wanted.
revoke all on table public.session_feelings from authenticated;

grant select, insert, delete on table public.session_feelings to authenticated;

-- `service_role` gets what it has on sessions and reflections, for the reason
-- 20260921103000 sets out at length: the point of the hosted project is
-- PARITY with the local stack, and the local stack gives this role
-- everything. A narrower grant is a divergence of our own making, and the
-- boundary that matters is that the key never reaches a browser.
grant select, insert, update, delete on table public.session_feelings to service_role;
