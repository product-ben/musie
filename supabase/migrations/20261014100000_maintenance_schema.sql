-- ═══════════════════════════════════════════════════════════════════════════
-- THE MAINTENANCE UI — SCHEMA
--
-- MAINTENANCE-UI.md, 2026-10-14. Structure only: this file creates no card,
-- no track and no artwork. The nine placements are `20261014100100`, which is
-- the LAST migration that will ever state deck content — after it, cards,
-- tracks, artworks and the grid live in the database and `deck.json` is an
-- export. CLAUDE.md rule 4 is amended in the same branch; read it before
-- reaching for `pnpm deck:migration`, which now refuses.
--
-- ── WHAT A CELL IS ────────────────────────────────────────────────────────
-- A POSITION, not a record anybody creates. Twenty-five of them are written
-- here and never added to or removed; the UI only fills and empties them.
-- A card stands on one cell and plays whatever track that cell holds, which
-- is why `exercise_tracks` stops being hand-written and becomes a projection
-- (§7 below).
--
-- ── ACCESS, IN ONE SENTENCE ───────────────────────────────────────────────
-- The client never writes and never reads any of this. Every maintenance read
-- and write goes through the `content-admin` edge function, because the UI has
-- to show `tracks.title` and that column is not granted to `authenticated` at
-- all — and RLS cannot narrow a column grant. `reveal-track` already makes
-- that argument; this is the second door built on it. So the new tables get
-- RLS with NO policy for `authenticated`, and privileges only for
-- `service_role`. Rule 2's second half, which is the half that gets missed,
-- is written out table by table at the foot.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══ 1 · THE GRID ═════════════════════════════════════════════════════════
-- Valence across, arousal up, both −2…+2. The primary key is the position
-- itself: there is no surrogate id, because a cell is not a thing that could
-- be given a different name.
--
-- Both foreign keys are `on delete restrict` and that is a statement rather
-- than a branch: nothing in this schema is ever hard-deleted (MAINTENANCE-UI
-- §10), because a complete history must always have something to return to.
create table public.grid_cells (
  valence    smallint not null check (valence between -2 and 2),
  arousal    smallint not null check (arousal between -2 and 2),
  track_id   text references public.tracks (id)   on delete restrict,
  artwork_id text,                                -- FK added in §2, below
  primary key (valence, arousal)
);

comment on table public.grid_cells is
  'The 25 positions of the valence/arousal grid. A card standing on a cell '
  'plays its track and shows its artwork. Created once by '
  '20261014100000 and never inserted into or deleted from again — the '
  'maintenance UI only sets track_id and artwork_id.';

-- All twenty-five, empty. `generate_series` rather than 25 literal rows
-- because the shape of the grid is the fact, not the list.
insert into public.grid_cells (valence, arousal)
select v, a
  from generate_series(-2, 2) as v,
       generate_series(-2, 2) as a;


-- ═══ 2 · ARTWORK BECOMES A THING ══════════════════════════════════════════
-- There is no artwork entity today: there are nine `.webp` files committed
-- under `apps/web/public/assets/web/cards/` and an `image_url` column
-- pointing at them. A picture that can be uploaded, credited and reused on
-- more than one cell has to be a row.
--
-- `src` holds a BUCKET KEY or a bundle path, and `contentImageUrl()` in
-- `lib/assets.ts` resolves both. It cannot hold a full URL: that would bake
-- the project ref into a content row, and the same row has to be valid on the
-- local stack and on hosted.
create table public.artworks (
  id          text primary key check (id ~ '^art-[0-9]{2,}$'),
  src         text not null,
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);

-- The `_i18n` sibling every other content table has. Alt text is the ONLY
-- translated string left in the deck once the feeling goes (§5).
create table public.artwork_i18n (
  artwork_id text not null references public.artworks (id) on delete cascade,
  locale     text not null check (locale in ('de', 'en')),
  -- Nullable, and null in BOTH locales is data rather than a hole: a picture
  -- whose alt text has not been written yet. Null in ONE is a dropped
  -- translation, which is what public.missing_translations reports.
  alt        text,
  primary key (artwork_id, locale)
);

alter table public.grid_cells
  add constraint grid_cells_artwork_id_fkey
  foreign key (artwork_id) references public.artworks (id) on delete restrict;


-- ═══ 3 · A CARD GETS A PLACE, AND A CODE THAT CANNOT MOVE ═════════════════
-- `unique (valence, arousal)` is ONE CARD PER CELL. The columns are nullable
-- because an unplaced card is a real state — a card made but not yet dealt —
-- and Postgres treats two nulls as distinct, so any number of cards may be
-- unplaced at once.
--
-- The composite foreign key means a card can only stand somewhere that
-- exists, which with 25 fixed rows is the whole of the coordinate validation.
alter table public.cards
  add column valence     smallint,
  add column arousal     smallint,
  add column archived_at timestamptz;

alter table public.cards
  add constraint cards_cell_fkey
    foreign key (valence, arousal) references public.grid_cells (valence, arousal),
  add constraint cards_one_per_cell unique (valence, arousal),
  add constraint cards_cell_is_whole
    check ((valence is null) = (arousal is null));

-- ── THE CODE SPACE, AND IT IS CLOSED ──────────────────────────────────────
-- MC-01 … MC-99 and nothing else. `MC-00` is not a code, `MC-1` is not a code
-- and `MC-100` is not a code: what is printed is two digits. The nine
-- existing rows all satisfy this, which is why it can be added without a
-- backfill.
alter table public.cards
  add constraint cards_code_shape
    check (code ~ '^MC-(0[1-9]|[1-9][0-9])$'),
  -- The id IS the code lower-cased, always. `sessions.card_id` stores the id,
  -- so a diary row read in a year should name the paper card without a join.
  -- This was a convention in `deck.json`; here it becomes a constraint.
  add constraint cards_id_is_code
    check (id = lower(code));

-- ── A CODE IS WRITTEN ONCE ────────────────────────────────────────────────
-- Ben, 2026-10-14: *MC-01 stays MC-01 whatever new image might be on the
-- card.* The form shows the field read-only after creation, and a form is not
-- a guarantee — this is. A printed QR encodes the code and paper cannot be
-- reissued, so the moment a deck is printed an editable code is a recall.
create function public.cards_code_write_once() returns trigger
language plpgsql as $$
begin
  if new.code is distinct from old.code then
    raise exception
      'a card code is written once: % cannot become % (MAINTENANCE-UI.md §4)',
      old.code, new.code
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

comment on function public.cards_code_write_once() is
  'Refuses any update that changes cards.code. A printed QR encodes the code; '
  'paper cannot be reissued.';

create trigger cards_code_write_once
  before update of code on public.cards
  for each row execute function public.cards_code_write_once();


-- ═══ 4 · A PIECE OF MUSIC SAYS EVERYTHING IT KNOWS ════════════════════════
-- Ben, 2026-10-14: *display all the music metadata and make it editable.*
-- Six new columns, all nullable, because a piece whose album nobody has
-- looked up is ordinary and a required field would be filled with a guess.
--
-- `licence_ref` KEEPS ITS NAME and goes back to being prose. 20260921160000
-- records that it "carries the Epidemic Sound track name, which is the only
-- stable identifier the download gives us" — one free-text column holding
-- both an identifier and the terms. The identifier moves to `catalogue_ref`
-- and the terms become `licence_type`, which can be filtered on. Renaming
-- `licence_ref` itself would touch music.json, its generator and the
-- committed types for no gain.
alter table public.tracks
  add column album         text,
  add column release_year  smallint,
  add column tempo_bpm     smallint,
  add column mood_note     text,
  add column licence_type  text,
  add column catalogue_ref text,
  add column archived_at   timestamptz;

alter table public.tracks
  -- Opaque on purpose: it reaches the client through exercise_cuts, so a
  -- title-derived slug would hand over the answer the column grant on `title`
  -- exists to withhold. Shaped so a tenth piece cannot be called `trk-10a`.
  add constraint tracks_id_shape
    check (id ~ '^trk-[0-9]{2,}$'),
  add constraint tracks_release_year_sane
    check (release_year is null or release_year between 1900 and 2100),
  -- 400 is past the top of drum and bass; 0 is not a tempo.
  add constraint tracks_tempo_sane
    check (tempo_bpm is null or tempo_bpm between 1 and 400),
  -- A CHECK rather than a lookup table, by this schema's own rule: a lookup
  -- table is for a content taxonomy whose labels people READ, and this label
  -- is read by one operator on one English screen. `none_yet` is the honest
  -- state of five of the nine pieces.
  add constraint tracks_licence_type_known
    check (licence_type is null
           or licence_type in ('subscription', 'per_track', 'none_yet'));

comment on column public.tracks.licence_type is
  'subscription | per_track | none_yet. Epidemic Sound is a SUBSCRIPTION '
  'licence, not the per-track clearance BUILD-PLAN assumed everywhere it says '
  '"cleared" — 20260921160000. This column is what makes that answerable.';

comment on column public.tracks.catalogue_ref is
  'The supplier catalogue number or ISRC — the stable identifier licence_ref '
  'was carrying in prose. Withheld from the client with the rest of the '
  'credit.';

comment on column public.tracks.tempo_bpm is
  'For sorting the music library calmest-first. A useful proxy for the grid''s '
  'arousal axis and NOT a measurement of it: a slow piece can be agitating.';


-- ═══ 5 · THE FEELING LOSES ITS NOT NULL ═══════════════════════════════════
-- Ben, 2026-10-14: *the feelings can be completely dropped.* A card is a
-- code, a position, and whatever stands in that position.
--
-- STAGED, NOT DROPPED, and the repo decided that shape already. The screens
-- stopped reading the word on 2026-10-09 — `SessionListen.tsx` records it:
-- "The feeling goes from every screen; what identifies a card to somebody
-- holding the deck is the code stamped on its back." What kept the DATA alive
-- is in the same comment: `deck:pdf` prints the word on the physical front of
-- MC-06…MC-09, which have no artwork master, so emptying it would print four
-- blank cards. Uploading artwork for exactly those four is what this UI is
-- for, so the reason expires with the change that removes it.
--
-- The column and the table come out in a one-statement follow-up once
-- `digital-cards`, `digital-cards-build`, `feelings-detection-help`,
-- `listen-infographic` and `maintenance-day` have landed. Dropping it NOW
-- would break five live worktrees with a PostgREST error in a file they did
-- not touch, which is the trap `20261011100000` avoided with `needs_cards`.
-- Rule 9.
alter table public.card_i18n alter column feeling drop not null;

comment on column public.card_i18n.feeling is
  'RETIRED 2026-10-14 and kept only until the five live worktrees land. '
  'Nothing writes it and no screen reads it. The nine existing words are '
  'inert. Dropping this column and then this table is the follow-up logged in '
  'apps/web/OPEN-QUESTIONS.md.';


-- ═══ 6 · THE HISTORY ══════════════════════════════════════════════════════
-- Ben, 2026-10-14: *always display a version history and a timestamp, who has
-- made a change when, including a way to roll back.*
--
-- One row per write. Nothing ever updates or deletes a row here, which is why
-- there is no `delete` among the actions and why nothing in this schema can
-- be hard-deleted: if the row were gone, its `before` would have nothing to
-- return to.
--
-- A REVERT IS A NEW EDIT. `reverts` names the edit it undid, so the log
-- always reads forward and a revert can itself be reverted. There is no state
-- in which the history and the rows disagree.
create table public.content_edits (
  id           uuid primary key default gen_random_uuid(),
  at           timestamptz not null default now(),
  -- `set null` rather than cascade: a deleted operator must not take the
  -- record of what they changed with them.
  actor_user_id uuid references auth.users (id) on delete set null,
  -- Denormalised ON PURPOSE. The email is what the log is read by, and it has
  -- to survive the account it came from.
  actor_email  text not null,
  entity       text not null check (entity in ('card', 'track', 'artwork', 'cell')),
  -- A card/track/artwork id, or '<valence>,<arousal>' for a cell.
  row_id       text not null,
  action       text not null check (action in ('create', 'update', 'archive', 'restore', 'revert')),
  -- Null `before` means the row did not exist: this edit created it. Reverting
  -- a create therefore archives rather than deletes — see admin_revert.
  before       jsonb,
  after        jsonb not null,
  reverts      uuid references public.content_edits (id) on delete set null
);

create index content_edits_row_idx on public.content_edits (entity, row_id, at desc);
create index content_edits_at_idx  on public.content_edits (at desc);

comment on table public.content_edits is
  'Every maintenance write, append-only. Replaces the reason a content '
  'migration used to carry in its header, and names the operator who decided '
  'rather than the engineer who typed. Reverting is a new row, never an '
  'erasure.';


-- ═══ 7 · THE PROJECTION ═══════════════════════════════════════════════════
-- `exercise_tracks` and `cards.image_url` STOP BEING WRITTEN BY HAND and
-- become derived from the grid. Every reader keeps reading exactly what it
-- read before — `content.ts`, `deckGuide.ts`, the listen step, and five live
-- worktrees — which is the whole reason for doing it this way rather than
-- re-pointing the app at `grid_cells`. Rule 9 again: `20261011100000` kept a
-- redundant column alive for the same reason.
--
-- DO NOT HAND-EDIT `exercise_tracks` for a card. Anything written there is
-- erased by the next cell change.
--
-- `card_id is null` rows are a cardless exercise's OWN track — Atempartitur,
-- Bodyscan — which is not the deck's and must survive untouched. Every
-- statement below is restricted to non-null card rows for that reason.
create function public.project_deck() returns void
language plpgsql as $$
begin
  /* WHAT SHOULD EXIST: one row per (card_based exercise × placed card whose
     cell holds a live track). Both exercises get the same track, because
     "a different track per exercise" is out of scope — one cell, one piece. */
  insert into public.exercise_tracks (exercise_id, card_id, track_id)
  select e.id, c.id, g.track_id
    from public.cards c
    join public.grid_cells g
      on g.valence = c.valence and g.arousal = c.arousal
    join public.tracks t
      on t.id = g.track_id and t.archived_at is null
   cross join public.exercises e
   where e.kind = 'card_based'
     and c.archived_at is null
  on conflict on constraint exercise_tracks_one_per_pair
    do update set track_id = excluded.track_id;

  /* AND WHAT SHOULD NOT. An unplaced card, an archived card, an empty cell or
     an archived track all mean the same thing here: that pairing is gone. */
  delete from public.exercise_tracks et
   where et.card_id is not null
     and not exists (
       select 1
         from public.cards c
         join public.grid_cells g
           on g.valence = c.valence and g.arousal = c.arousal
         join public.tracks t
           on t.id = g.track_id and t.archived_at is null
        where c.id = et.card_id
          and c.archived_at is null
          and t.id = et.track_id
     );

  /* THE PICTURE. A correlated subquery rather than a join so that a card with
     no cell is nulled too — `update … from` would simply not match it, and a
     card that has left the grid would keep showing its old artwork. */
  update public.cards c
     set image_url = (
           select a.src
             from public.grid_cells g
             join public.artworks a
               on a.id = g.artwork_id and a.archived_at is null
            where g.valence = c.valence and g.arousal = c.arousal
         )
   where c.image_url is distinct from (
           select a.src
             from public.grid_cells g
             join public.artworks a
               on a.id = g.artwork_id and a.archived_at is null
            where g.valence = c.valence and g.arousal = c.arousal
         );
end;
$$;

comment on function public.project_deck() is
  'Rewrites exercise_tracks and cards.image_url from the grid. Called by '
  'every admin write. exercise_tracks is DERIVED from here on: a row written '
  'by hand for a card is erased by the next cell change.';


-- ═══ 8 · THE WRITE SURFACE — ONE FUNCTION ═════════════════════════════════
-- Three things have to happen in one statement — the row, its history entry
-- and the projection — and supabase-js cannot open a transaction. So the
-- writes live in SQL and the edge function is only the gate: it decides WHO
-- may ask, this decides what a valid write IS.
--
-- ── WHY ONE FUNCTION AND NOT NINE ─────────────────────────────────────────
-- Because archive, restore and revert are not separate operations. Archiving
-- is `{"archived_at": "<now>"}`, restoring is `{"archived_at": null}`, and
-- reverting is *apply this edit's `before`*. Written as one patch-shaped
-- function they are the same code path, which means the revert cannot drift
-- from the save — and a revert of a revert needs no special case at all.
--
-- A key ABSENT from the patch is left alone; a key present and null sets
-- null. That distinction is the whole interface.
create function public.admin_write(
  p_actor_id    uuid,
  p_actor_email text,
  p_entity      text,
  p_row_id      text,
  p_patch       jsonb,
  p_action      text default null,
  p_reverts     uuid default null
) returns jsonb
language plpgsql as $$
declare
  v_before jsonb;
  v_after  jsonb;
  v_action text;
  v_valence smallint;
  v_arousal smallint;
begin
  if p_actor_email is null or p_actor_email = '' then
    raise exception 'admin_write needs an actor email' using errcode = 'check_violation';
  end if;

  case p_entity

    -- ── A CARD ────────────────────────────────────────────────────────────
    when 'card' then
      select to_jsonb(c) into v_before from public.cards c where c.id = p_row_id;

      if v_before is null then
        /* CREATE. The code is required here and can never be given again
           (§3's trigger), so it is read from the patch exactly once in a
           card's life. The id is derived, never supplied. */
        insert into public.cards (id, code, sort, valence, arousal, image_url)
        values (
          lower(p_patch ->> 'code'),
          p_patch ->> 'code',
          coalesce((p_patch ->> 'sort')::int,
                   (select coalesce(max(sort), 0) + 1 from public.cards)),
          (p_patch ->> 'valence')::smallint,
          (p_patch ->> 'arousal')::smallint,
          null
        );
      else
        update public.cards c set
          sort        = coalesce((p_patch ->> 'sort')::int, c.sort),
          valence     = case when p_patch ? 'valence'
                             then (p_patch ->> 'valence')::smallint else c.valence end,
          arousal     = case when p_patch ? 'arousal'
                             then (p_patch ->> 'arousal')::smallint else c.arousal end,
          archived_at = case when p_patch ? 'archived_at'
                             then (p_patch ->> 'archived_at')::timestamptz else c.archived_at end
         where c.id = p_row_id;
      end if;

      select to_jsonb(c) into v_after from public.cards c where c.id = p_row_id;

    -- ── A PIECE OF MUSIC ──────────────────────────────────────────────────
    when 'track' then
      select to_jsonb(t) into v_before from public.tracks t where t.id = p_row_id;

      if v_before is null then
        /* A piece with no file yet is ordinary — five of nine are silent —
           so `src` may be absent. `duration_seconds` is `not null` and
           positive in the original schema, so a fileless piece carries 1
           until a file arrives. Nothing plays it: the listen step reads
           `src`, and a null src is what means "no recording". */
        insert into public.tracks (
          id, src, duration_seconds, title, artist,
          album, release_year, tempo_bpm, mood_note,
          licence_type, catalogue_ref, licence_ref
        ) values (
          p_row_id,
          p_patch ->> 'src',
          coalesce((p_patch ->> 'duration_seconds')::int, 1),
          coalesce(p_patch ->> 'title', ''),
          coalesce(p_patch ->> 'artist', ''),
          p_patch ->> 'album',
          (p_patch ->> 'release_year')::smallint,
          (p_patch ->> 'tempo_bpm')::smallint,
          p_patch ->> 'mood_note',
          p_patch ->> 'licence_type',
          p_patch ->> 'catalogue_ref',
          p_patch ->> 'licence_ref'
        );
      else
        update public.tracks t set
          src              = case when p_patch ? 'src'
                                  then p_patch ->> 'src' else t.src end,
          duration_seconds = coalesce((p_patch ->> 'duration_seconds')::int, t.duration_seconds),
          title            = coalesce(p_patch ->> 'title', t.title),
          artist           = coalesce(p_patch ->> 'artist', t.artist),
          album            = case when p_patch ? 'album'
                                  then p_patch ->> 'album' else t.album end,
          release_year     = case when p_patch ? 'release_year'
                                  then (p_patch ->> 'release_year')::smallint else t.release_year end,
          tempo_bpm        = case when p_patch ? 'tempo_bpm'
                                  then (p_patch ->> 'tempo_bpm')::smallint else t.tempo_bpm end,
          mood_note        = case when p_patch ? 'mood_note'
                                  then p_patch ->> 'mood_note' else t.mood_note end,
          licence_type     = case when p_patch ? 'licence_type'
                                  then p_patch ->> 'licence_type' else t.licence_type end,
          catalogue_ref    = case when p_patch ? 'catalogue_ref'
                                  then p_patch ->> 'catalogue_ref' else t.catalogue_ref end,
          licence_ref      = case when p_patch ? 'licence_ref'
                                  then p_patch ->> 'licence_ref' else t.licence_ref end,
          archived_at      = case when p_patch ? 'archived_at'
                                  then (p_patch ->> 'archived_at')::timestamptz else t.archived_at end
         where t.id = p_row_id;
      end if;

      select to_jsonb(t) into v_after from public.tracks t where t.id = p_row_id;

    -- ── A PICTURE ─────────────────────────────────────────────────────────
    -- The row and both locales of its alt text move together, because "null
    -- in both or written in both" is a rule about the PAIR and cannot be
    -- enforced one statement at a time.
    when 'artwork' then
      select to_jsonb(a) || jsonb_build_object(
               'alt_de', (select i.alt from public.artwork_i18n i
                           where i.artwork_id = a.id and i.locale = 'de'),
               'alt_en', (select i.alt from public.artwork_i18n i
                           where i.artwork_id = a.id and i.locale = 'en'))
        into v_before
        from public.artworks a where a.id = p_row_id;

      if v_before is null then
        insert into public.artworks (id, src) values (p_row_id, p_patch ->> 'src');
      else
        update public.artworks a set
          src         = coalesce(p_patch ->> 'src', a.src),
          archived_at = case when p_patch ? 'archived_at'
                             then (p_patch ->> 'archived_at')::timestamptz else a.archived_at end
         where a.id = p_row_id;
      end if;

      if p_patch ? 'alt_de' or p_patch ? 'alt_en' then
        insert into public.artwork_i18n (artwork_id, locale, alt) values
          (p_row_id, 'de', p_patch ->> 'alt_de'),
          (p_row_id, 'en', p_patch ->> 'alt_en')
        on conflict (artwork_id, locale) do update set alt = excluded.alt;
      end if;

      select to_jsonb(a) || jsonb_build_object(
               'alt_de', (select i.alt from public.artwork_i18n i
                           where i.artwork_id = a.id and i.locale = 'de'),
               'alt_en', (select i.alt from public.artwork_i18n i
                           where i.artwork_id = a.id and i.locale = 'en'))
        into v_after
        from public.artworks a where a.id = p_row_id;

    -- ── A CELL ────────────────────────────────────────────────────────────
    -- The row id is the position: '<valence>,<arousal>'. The row always
    -- exists, so this is only ever an update — which is why a cell has no
    -- `create` action and no `archived_at`.
    when 'cell' then
      v_valence := split_part(p_row_id, ',', 1)::smallint;
      v_arousal := split_part(p_row_id, ',', 2)::smallint;

      select to_jsonb(g) into v_before from public.grid_cells g
       where g.valence = v_valence and g.arousal = v_arousal;

      if v_before is null then
        raise exception 'there is no cell at % (the grid is −2…+2 on both axes)', p_row_id
          using errcode = 'check_violation';
      end if;

      update public.grid_cells g set
        track_id   = case when p_patch ? 'track_id'
                          then p_patch ->> 'track_id' else g.track_id end,
        artwork_id = case when p_patch ? 'artwork_id'
                          then p_patch ->> 'artwork_id' else g.artwork_id end
       where g.valence = v_valence and g.arousal = v_arousal;

      select to_jsonb(g) into v_after from public.grid_cells g
       where g.valence = v_valence and g.arousal = v_arousal;

    else
      raise exception 'admin_write does not know the entity %', p_entity
        using errcode = 'check_violation';
  end case;

  if v_after is null then
    raise exception 'admin_write wrote nothing for % %', p_entity, p_row_id
      using errcode = 'check_violation';
  end if;

  /* THE ACTION IS DERIVED where the caller did not name one, so the log says
     what happened rather than what was asked for. */
  v_action := coalesce(
    p_action,
    case
      when v_before is null                                        then 'create'
      when v_before ->> 'archived_at' is null
       and v_after  ->> 'archived_at' is not null                   then 'archive'
      when v_before ->> 'archived_at' is not null
       and v_after  ->> 'archived_at' is null                       then 'restore'
      else 'update'
    end);

  /* The projection runs before the log is written, so a projection that
     fails takes the whole statement down and leaves no history row claiming
     a change that did not land. */
  perform public.project_deck();

  insert into public.content_edits
    (actor_user_id, actor_email, entity, row_id, action, before, after, reverts)
  values
    (p_actor_id, p_actor_email, p_entity, p_row_id, v_action, v_before, v_after, p_reverts);

  return v_after;
end;
$$;


-- ── REVERT ────────────────────────────────────────────────────────────────
-- Applies an edit's `before` through the SAME path an ordinary save takes, so
-- the validation, the projection and the logging cannot differ between a save
-- and an undo. Then it appends a row naming the edit it undid.
--
-- Reverting a CREATE archives, because nothing here is ever deleted: the row
-- has to stay for the diary entries that point at it, and a code can never be
-- freed. That is the one asymmetry, and it is in the product, not the code.
create function public.admin_revert(
  p_actor_id    uuid,
  p_actor_email text,
  p_edit_id     uuid
) returns jsonb
language plpgsql as $$
declare
  v_edit public.content_edits;
  v_patch jsonb;
begin
  select * into v_edit from public.content_edits where id = p_edit_id;
  if not found then
    raise exception 'there is no edit %', p_edit_id using errcode = 'no_data_found';
  end if;

  if v_edit.before is null then
    v_patch := jsonb_build_object('archived_at', now());
  else
    v_patch := v_edit.before;
  end if;

  return public.admin_write(
    p_actor_id, p_actor_email, v_edit.entity, v_edit.row_id, v_patch,
    'revert', p_edit_id);
end;
$$;


-- ── REORDERING THE DECK ───────────────────────────────────────────────────
-- Its own function because `cards.sort` is `unique` and NOT deferrable:
-- Postgres checks it as each ROW is written, so two cards swapping places
-- collide halfway through an update that ends perfectly valid. The generated
-- deck migrations park the order out of range first and this does the same —
-- the trap `20260923150000` hit on `exercises.sort`.
--
-- One history row per card that actually moved, so the log reads as what
-- happened rather than as nine identical lines.
create function public.admin_reorder_cards(
  p_actor_id    uuid,
  p_actor_email text,
  p_ids         text[]
) returns jsonb
language plpgsql as $$
declare
  v_id   text;
  v_i    int := 0;
  v_was  int;
  v_rows jsonb := '[]'::jsonb;
begin
  update public.cards set sort = sort + 1000;

  foreach v_id in array p_ids loop
    v_i := v_i + 1;
    select sort - 1000 into v_was from public.cards where id = v_id;
    if v_was is null then
      raise exception 'there is no card %', v_id using errcode = 'no_data_found';
    end if;

    update public.cards set sort = v_i where id = v_id;

    if v_was is distinct from v_i then
      insert into public.content_edits
        (actor_user_id, actor_email, entity, row_id, action, before, after)
      values
        (p_actor_id, p_actor_email, 'card', v_id, 'update',
         jsonb_build_object('sort', v_was), jsonb_build_object('sort', v_i));
    end if;

    v_rows := v_rows || jsonb_build_object('id', v_id, 'sort', v_i);
  end loop;

  /* Anything still parked is a card the caller did not name. It keeps its
     relative order, after everything that was named. */
  update public.cards c set sort = v_i + ranked.pos
    from (select id, row_number() over (order by sort) as pos
            from public.cards where sort > 1000) as ranked
   where c.id = ranked.id;

  perform public.project_deck();
  return v_rows;
end;
$$;


-- ═══ 9 · ACCESS ═══════════════════════════════════════════════════════════
-- RLS on, and NO policy for `authenticated` on any of the four new tables.
-- That is not an omission: the client never reads these and never writes
-- them. Everything goes through `content-admin`, which holds the service
-- role, because the UI has to show `tracks.title` and that column is not
-- granted to `authenticated` at all — and no policy can widen a column grant.
--
-- RLS is still enabled on all four, because a table without it is a table one
-- forgotten grant away from being world-readable, and the Security Advisor
-- reports it as such.
alter table public.grid_cells    enable row level security;
alter table public.artworks      enable row level security;
alter table public.artwork_i18n  enable row level security;
alter table public.content_edits enable row level security;

-- ── THE REVOKE IS NOT DECORATION ──────────────────────────────────────────
-- The local stack ships `alter default privileges in schema public grant all
-- on tables to postgres, anon, authenticated, service_role`, so each table
-- above arrived ALREADY FULLY GRANTED to anon and authenticated. Without
-- this, RLS with no policy would be the only thing standing between a signed
-- in beta tester and the whole history. Revoke first, then grant.
revoke all on table public.grid_cells    from anon, authenticated;
revoke all on table public.artworks      from anon, authenticated;
revoke all on table public.artwork_i18n  from anon, authenticated;
revoke all on table public.content_edits from anon, authenticated;

-- ── AND THE HALF THAT GETS MISSED ─────────────────────────────────────────
-- `service_role` has BYPASSRLS, which is why one assumes the grants are
-- irrelevant to it. They are not: Postgres checks table privileges first, for
-- every role. The hosted project is created with *Automatically expose new
-- tables* off, which also switches off the local default grant — so on
-- 2026-09-21 the role held nothing on any table and 23 tests failed in three
-- files for one cause. CLAUDE.md rule 2.
grant select, insert, update, delete on table public.grid_cells    to service_role;
grant select, insert, update, delete on table public.artworks      to service_role;
grant select, insert, update, delete on table public.artwork_i18n  to service_role;
-- Append-only, deliberately: nothing may update or delete a history row, not
-- even the server. A revert is a new row.
grant select, insert                 on table public.content_edits to service_role;

-- ── THE FUNCTIONS ─────────────────────────────────────────────────────────
-- Postgres grants EXECUTE on a new function to PUBLIC by default, so without
-- this any signed-in user could call `admin_write` over `/rest/v1/rpc`. The
-- table grants above would stop them — `authenticated` holds no insert on
-- `cards` — but a privilege that is only *indirectly* withheld is one refactor
-- away from being granted. `20260918151000` revoked a trigger function's
-- execute for the same reason.
revoke all on function public.project_deck()                                        from public, anon, authenticated;
revoke all on function public.admin_write(uuid, text, text, text, jsonb, text, uuid) from public, anon, authenticated;
revoke all on function public.admin_revert(uuid, text, uuid)                        from public, anon, authenticated;
revoke all on function public.admin_reorder_cards(uuid, text, text[])               from public, anon, authenticated;
revoke all on function public.cards_code_write_once()                               from public, anon, authenticated;

grant execute on function public.project_deck()                                        to service_role;
grant execute on function public.admin_write(uuid, text, text, text, jsonb, text, uuid) to service_role;
grant execute on function public.admin_revert(uuid, text, uuid)                        to service_role;
grant execute on function public.admin_reorder_cards(uuid, text, text[])               to service_role;


-- ═══ 10 · THE ARTWORK BUCKET ══════════════════════════════════════════════
-- PUBLIC, and the reasoning is the opposite of the `tracks` bucket's. The
-- nine card artworks are already public: committed `.webp` files under
-- `apps/web/public/` in a PUBLIC repository, served from the bundle at a
-- guessable URL. A private bucket would force a signed URL into every screen
-- that draws a card — `fromRoot()` in `lib/assets.ts` is a pure string
-- function used by `/exercises` and the diary entry, and signing is
-- asynchronous and per request. That is a read-path change across shipped
-- screens for no security gain.
--
-- The KEY still says nothing. `20260921160000` rejected `apps/web/public/`
-- partly because `mc-01-joy.mp3` names the card and the feeling; keys here are
-- `art-07-<hash>.webp` for the same reason.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'artworks',
  'artworks',
  true,
  5242880,                                      -- 5 MiB; a 768² WebP is ~80 kB
  array['image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do nothing;

-- A public bucket still needs a select policy for the authenticated client to
-- LIST or read through the API; the public URL bypasses it. Uploading stays
-- an operator act done with the service role, so there is no insert policy —
-- the browser PUTs to a signed upload URL the function mints.
create policy artworks_objects_select
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'artworks');
