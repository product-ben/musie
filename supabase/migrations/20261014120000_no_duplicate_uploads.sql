-- ═══════════════════════════════════════════════════════════════════════════
-- THE SAME FILE CANNOT BE UPLOADED TWICE — Ben, 2026-10-14
--
-- ── WHY A COLUMN AND NOT A CHECK IN THE BROWSER ───────────────────────────
-- A screen can compare what you just picked against what it can see, and that
-- is worth doing — it is how the operator gets told *this is already in the
-- library as trk-04* instead of a constraint name. But it is not a guard:
-- two tabs, a stale read, or a drop of the same file twice in one go all get
-- past it. The unique index is the thing that makes it true.
--
-- ── WHY THE HASH IS NOT IN THE KEY, WHICH IS WHERE IT USED TO BE ──────────
-- `music-upload.mjs` names its objects `trk-01-<8 chars of the file's hash>`,
-- which deduplicates by construction. The maintenance UI cannot: the browser
-- PUTs the bytes straight to storage through a signed URL, so the server never
-- sees them and mints a RANDOM suffix instead (`content-admin`'s `mintKey`
-- says why). That keeps a replacement a new key — which is what a revert
-- needs — and gives up the dedupe. This column buys it back, from the one
-- place that does see the bytes.
--
-- ── NULLABLE, AND MOST ROWS WILL STAY NULL ────────────────────────────────
-- The nine pieces and nine artworks that came from the import were never
-- uploaded through this screen, so nothing has their bytes to hash. A unique
-- index treats NULLs as distinct in Postgres, so any number of rows may have
-- no hash — which is exactly right: *we do not know* is not a duplicate of
-- *we do not know*.
--
-- Backfilling them would mean downloading nine objects and nine committed
-- `.webp` files to hash, for a library of eighteen rows an operator can see
-- on one screen. Not worth a migration that could half-fail.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.tracks   add column content_hash text;
alter table public.artworks add column content_hash text;

comment on column public.tracks.content_hash is
  'SHA-256 of the uploaded file, hex, computed in the browser — the one place '
  'that holds the bytes. NULL for anything not uploaded through /maintenance. '
  'Unique where present, so the same recording cannot enter the library twice.';

comment on column public.artworks.content_hash is
  'SHA-256 of the SOURCE image, before the 768² WebP resize. Hashing the '
  'resize would make "the same picture" mean "encoded identically", and two '
  'drops of one photograph are the duplicate worth refusing.';

-- `unique` rather than a check: NULLs are distinct, so the eighteen imported
-- rows do not collide with each other.
create unique index tracks_content_hash_once
  on public.tracks (content_hash);

create unique index artworks_content_hash_once
  on public.artworks (content_hash);


-- ═══ admin_write LEARNS THE COLUMN ════════════════════════════════════════
-- `create or replace`, so the revoke and the grant from `20261014100000`
-- survive untouched — re-stating them here is the kind of duplication that
-- drifts. The body is that migration's, with `content_hash` added to the two
-- entities that have it and nothing else changed.
create or replace function public.admin_write(
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

    when 'card' then
      select to_jsonb(c) into v_before from public.cards c where c.id = p_row_id;

      if v_before is null then
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

    when 'track' then
      select to_jsonb(t) into v_before from public.tracks t where t.id = p_row_id;

      if v_before is null then
        insert into public.tracks (
          id, src, duration_seconds, title, artist,
          album, release_year, tempo_bpm, mood_note,
          licence_type, catalogue_ref, licence_ref, content_hash
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
          p_patch ->> 'licence_ref',
          p_patch ->> 'content_hash'
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
          content_hash     = case when p_patch ? 'content_hash'
                                  then p_patch ->> 'content_hash' else t.content_hash end,
          archived_at      = case when p_patch ? 'archived_at'
                                  then (p_patch ->> 'archived_at')::timestamptz else t.archived_at end
         where t.id = p_row_id;
      end if;

      select to_jsonb(t) into v_after from public.tracks t where t.id = p_row_id;

    when 'artwork' then
      select to_jsonb(a) || jsonb_build_object(
               'alt_de', (select i.alt from public.artwork_i18n i
                           where i.artwork_id = a.id and i.locale = 'de'),
               'alt_en', (select i.alt from public.artwork_i18n i
                           where i.artwork_id = a.id and i.locale = 'en'))
        into v_before
        from public.artworks a where a.id = p_row_id;

      if v_before is null then
        insert into public.artworks (id, src, content_hash)
        values (p_row_id, p_patch ->> 'src', p_patch ->> 'content_hash');
      else
        update public.artworks a set
          src          = coalesce(p_patch ->> 'src', a.src),
          content_hash = case when p_patch ? 'content_hash'
                              then p_patch ->> 'content_hash' else a.content_hash end,
          archived_at  = case when p_patch ? 'archived_at'
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

  perform public.project_deck();

  insert into public.content_edits
    (actor_user_id, actor_email, entity, row_id, action, before, after, reverts)
  values
    (p_actor_id, p_actor_email, p_entity, p_row_id, v_action, v_before, v_after, p_reverts);

  return v_after;
end;
$$;
