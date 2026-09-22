-- ═══════════════════════════════════════════════════════════════════════════
-- `reflection_statements` — a spoken answer, one statement at a time. F.6.
--
-- ── WHY ROWS, AND IT IS NOT THE EDITING ───────────────────────────────────
-- `onSentenceFinal` fires AS SOMEBODY SPEAKS, four times over on four
-- different paths. Statements written as they are finalised survive a closed
-- tab, a dropped socket and a phone that rang; statements assembled at the end
-- of a reflection do not. That is a durability argument rather than a
-- modelling one, and it is the one that actually justifies a table.
--
-- ── WHY A TABLE AND NOT A DOCUMENT, WHICH WAS A REAL QUESTION ─────────────
-- Settled 2026-09-22, written up in BUILD-PLAN F.6. Three things about THIS
-- schema decided it, none of them a general preference:
--
--   1. The security model is per ROW. Everything here is bounded by RLS, and
--      a document would protect a reflection's statements as one block rather
--      than individually. For private diary content that is a real difference.
--   2. F.6's done-when is "editing a statement updates its ROW rather than
--      inserting a second". In a document, editing one statement rewrites the
--      whole thing — the exact problem the step exists to prevent.
--   3. Migrations stack here already (rule 4), so the usual case for
--      documents — that schema changes hurt — is much weaker than elsewhere.
--
-- ── AND WHY IT IS ALSO A DOCUMENT, IN ONE COLUMN ──────────────────────────
-- The stable parts are columns because the database should refuse them when
-- missing. `meta` is for what is still moving — whether a statement was
-- edited, whether it was merged from two, transcription confidence, timings —
-- which can be added without a migration and is still queryable, because
-- `jsonb` is searchable in a way a text blob is not. A field in `meta` that
-- proves permanent graduates into a real column, by which point there is data
-- to prove it should.
--
-- ── D1 IS NOT TOUCHED ─────────────────────────────────────────────────────
-- No audio is stored, here or anywhere. A statement is TEXT, exactly as a
-- typed reflection is text, and `reflections.body` stays `not null` and keeps
-- being the whole answer — assembled from these rows when the session
-- finishes. Every existing reader (the diary, the end-to-end walks, D1's own
-- check) is unchanged.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.reflection_statements (
  -- THE CLIENT'S OWN ID, AND THAT IS WHAT MAKES THE WRITE IDEMPOTENT.
  -- `onSentenceFinal` fires on four paths and a statement already carries an
  -- id in the browser (`Sentence.id`, required by DraggableItem so reordering
  -- survives a re-render). Writing under that id means the second firing for
  -- one statement is an update of one row rather than a second row — which is
  -- F.6's done-when, enforced by the primary key rather than by care.
  id            text primary key,

  reflection_id uuid not null references public.reflections (id) on delete cascade,

  -- `not null` for the same reason `reflections.body` is: a statement with no
  -- words is not a statement.
  text          text not null,

  -- Where it sits in the answer. Editing reorders, merging removes — so this
  -- is rewritten on every change and is NOT unique: two statements may hold
  -- one position for the instant between a move and its neighbour's move, and
  -- a constraint there would refuse a legal drag.
  position      integer not null check (position >= 0),

  -- BCP-47, as the transcription reported it. Not the session's locale: a
  -- German session can produce an English sentence and the transcript should
  -- say so rather than the app deciding.
  language      text,

  -- Everything not yet worth a column of its own. Defaulted rather than
  -- nullable so reading it never needs a coalesce.
  meta          jsonb not null default '{}'::jsonb,

  created_at    timestamptz not null default now()
);

create index reflection_statements_reflection_idx
  on public.reflection_statements (reflection_id, position);

comment on table public.reflection_statements is
  'One row per finalised statement of a spoken reflection, written as it is '
  'spoken so a closed tab loses nothing. Text only — D1 holds: no audio is '
  'stored here or anywhere.';

comment on column public.reflection_statements.id is
  'The id the browser already gave the statement. Writing under it is what '
  'makes onSentenceFinal idempotent across its four paths.';

comment on column public.reflection_statements.meta is
  'The parts still moving — edited, merged, confidence, timings. jsonb rather '
  'than text so it stays searchable; a field that proves permanent graduates '
  'into a column.';

-- ═══════════════════════════════════════════════════════════════════════════
-- ACCESS — rule 2, all four steps, and the second half is the easy one to miss
--
-- RLS reaches this table through TWO joins: a statement belongs to a
-- reflection, and a reflection belongs to a session, and the session is what
-- carries `user_id`. Writing the policy against `reflections` alone would be
-- one join short and would let anybody's statement attach to anybody's
-- reflection.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.reflection_statements enable row level security;

create policy reflection_statements_select_own
  on public.reflection_statements for select to authenticated
  using (exists (
    select 1 from public.reflections r
    join public.sessions s on s.id = r.session_id
    where r.id = reflection_statements.reflection_id
      and s.user_id = (select auth.uid())
  ));

create policy reflection_statements_insert_own
  on public.reflection_statements for insert to authenticated
  with check (exists (
    select 1 from public.reflections r
    join public.sessions s on s.id = r.session_id
    where r.id = reflection_statements.reflection_id
      and s.user_id = (select auth.uid())
  ));

-- UPDATE needs both halves. `using` decides which rows may be touched;
-- `with check` decides what they may become — without it a row could be
-- updated to point at somebody else's reflection and then be invisible to the
-- person it was taken from.
create policy reflection_statements_update_own
  on public.reflection_statements for update to authenticated
  using (exists (
    select 1 from public.reflections r
    join public.sessions s on s.id = r.session_id
    where r.id = reflection_statements.reflection_id
      and s.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.reflections r
    join public.sessions s on s.id = r.session_id
    where r.id = reflection_statements.reflection_id
      and s.user_id = (select auth.uid())
  ));

-- DELETE, because merging two statements ends one of them and the editor does
-- that while the reflection is still being spoken.
create policy reflection_statements_delete_own
  on public.reflection_statements for delete to authenticated
  using (exists (
    select 1 from public.reflections r
    join public.sessions s on s.id = r.session_id
    where r.id = reflection_statements.reflection_id
      and s.user_id = (select auth.uid())
  ));

-- REVOKE, THEN GRANT. The local stack's default privileges hand every new
-- table to anon AND authenticated in full, so without this the policies above
-- would be decorating a table anon can already read.
revoke all on table public.reflection_statements from anon, authenticated;

grant select, insert, update, delete
  on table public.reflection_statements to authenticated;

-- AND TO service_role, which is the half rule 2 exists to shout about: the
-- hosted project is created with "Automatically expose new tables" off, so
-- service_role arrives holding NOTHING on a new table. BYPASSRLS does not
-- help — Postgres checks table privileges first, for every role. The db suite
-- reads these rows back as service_role, and H.5's cleanup will delete them.
grant select, insert, update, delete
  on table public.reflection_statements to service_role;
