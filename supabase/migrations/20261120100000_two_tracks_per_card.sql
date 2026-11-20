-- ═══════════════════════════════════════════════════════════════════════════
-- TWO PIECES PER CARD — and the card carries them
--
-- PRD „Zwei Tracks pro Karte", decided by Ben on 2026-11-20. Achtsame Pause and
-- Freie Bahn are offered under „entspannen" and „Energie sammeln" alike. The
-- exercise is the same; only the music behind the card changes. So every card
-- gets TWO pieces — one for activation, one for relaxation — and the goal a
-- session was started from decides which one plays.
--
-- STRUCTURE ONLY (CLAUDE.md 4.1). No literal card, track or artwork id appears
-- below. The one data statement copies what each card's square holds onto the
-- card itself, on whichever database this runs — so on hosted it carries every
-- edit Lucia has made since 14 October, and nothing is restated from a file.
--
-- ── THE CARD OWNS ITS PICTURE AND ITS MUSIC NOW (D12) ─────────────────────
-- Until today a card played whatever its SQUARE held: `grid_cells.track_id`
-- and `grid_cells.artwork_id`, projected onto the card by `project_deck()`.
-- Ben: when Lucia moves a card on the grid, „alles soll sich mit
-- verschieben" — the picture and both pieces travel with the card. That is
-- only true if they are the card's, so they move here:
--
--   cards.artwork_id           the picture          (was the square's)
--   cards.activation_track_id  „Energie sammeln"    (was the square's track)
--   cards.relax_track_id       „entspannen"         (new; Lucia fills it)
--
-- The square becomes what the grid was drawn to be: a PLACE. Its two columns
-- stay, unread, because rule 9 says a column is dropped in a later migration
-- once no open branch reads it — and because a square with no card may hold
-- something Lucia parked there, which the maintenance screen shows her.
--
-- ── TODAY'S MAPPING IS PROVEN, NOT ASSUMED ────────────────────────────────
-- Ben: "Make sure to keep todays mapping of card code (MC-01), image and
-- track." Section 4 snapshots what the app reads today — every pairing in
-- `exercise_tracks`, every card's `image_url` and alt text — re-projects from
-- the cards, and RAISES if a single row differs. So this migration either lands
-- with every card playing and showing exactly what it did, or it does not land.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══ 1 · THE CARD'S OWN PICTURE AND PIECES ═══════════════════════════════
-- All three `on delete restrict`, like every other content foreign key: nothing
-- in this schema is hard-deleted (MAINTENANCE-UI §10).
alter table public.cards
  add column artwork_id          text references public.artworks (id) on delete restrict,
  add column activation_track_id text references public.tracks (id)   on delete restrict,
  add column relax_track_id      text references public.tracks (id)   on delete restrict;

comment on column public.cards.artwork_id is
  'The card''s picture. project_deck() derives cards.image_url and '
  'card_i18n.image_alt from it. Written at /maintenance; moves with the card.';
comment on column public.cards.activation_track_id is
  'What the card plays in activation mode („Energie sammeln"). Until '
  '2026-11-20 this was the track on the card''s grid square.';
comment on column public.cards.relax_track_id is
  'What the card plays in relaxation mode („entspannen"). Null until Lucia '
  'assigns one; the listen step then says so instead of playing.';

comment on column public.grid_cells.track_id is
  'UNREAD since 2026-11-20 — copied onto cards.activation_track_id for the card '
  'standing here. Kept for what may be parked on a square with no card; drop '
  'in a later migration (rule 9).';
comment on column public.grid_cells.artwork_id is
  'UNREAD since 2026-11-20 — copied onto cards.artwork_id. See track_id.';


-- ═══ 2 · A GOAL SAYS WHICH MUSIC IT PLAYS (D5) ════════════════════════════
-- On the goal, so a new goal has to answer the question — the `not null`
-- default is activation, which is what every card played until today.
alter table public.goals
  add column music_mode text not null default 'activate'
    check (music_mode in ('relax', 'activate', 'random'));

comment on column public.goals.music_mode is
  'Which of a card''s two pieces a session started from this goal plays: '
  'relax, activate, or random (drawn once per session, at the scan).';

update public.goals set music_mode = 'relax'  where id = 'relax';
update public.goals set music_mode = 'random' where id = 'mindfulness';


-- ═══ 3 · A SESSION REMEMBERS WHICH ONE IT PLAYED (D6, R2) ══════════════════
-- The RESOLVED mode — never 'random'. Written with the card and the track by
-- the trigger in §6, so a reload, the diary and PostHog all see the same
-- answer the draw gave. Null until a card is scanned, and for every exercise
-- that draws none.
alter table public.sessions
  add column music_mode text check (music_mode in ('relax', 'activate'));

comment on column public.sessions.music_mode is
  'The piece of the card this session plays: relax or activate. Set with '
  'card_id by sessions_card_plays(); null before a scan and for cardless runs.';


-- ═══ 4 · COPY THE SQUARE ONTO ITS CARD, AND PROVE NOTHING MOVED ═══════════
create temporary table before_pairings as
  select exercise_id, card_id, track_id
    from public.exercise_tracks where card_id is not null;
create temporary table before_pictures as
  select id, image_url from public.cards;
create temporary table before_alts as
  select card_id, locale, image_alt from public.card_i18n;

update public.cards c
   set artwork_id          = g.artwork_id,
       activation_track_id = g.track_id
  from public.grid_cells g
 where g.valence = c.valence and g.arousal = c.arousal;


-- ═══ 5 · THE PROJECTION READS THE CARD ════════════════════════════════════
-- Same three outputs as before, same rules — an archived card, track or
-- picture projects nothing — with one change of source: the card, not its
-- square. Placement no longer matters, which is D12 said in SQL: a card taken
-- off the grid keeps its picture and its music.
--
-- `exercise_tracks` is STILL WRITTEN, activation only, though the app stops
-- reading it in the same change: open branches and the e2e helpers read it
-- (rule 9). Drop it with the square's columns.
--
-- NEW: every live card gets its two `card_i18n` rows. A card created at
-- /maintenance had none, so the app could not see it (`toCard` dropped it —
-- `20261016150000` was a whole migration for MC-10) and its picture's alt text
-- had nowhere to land. Both columns are null in both locales, which
-- `missing_translations` reads as "not written yet", not as a dropped
-- translation — and the "missing row" it reported before goes away.
create or replace function public.project_deck() returns void
language plpgsql as $$
begin
  insert into public.exercise_tracks (exercise_id, card_id, track_id)
  select e.id, c.id, c.activation_track_id
    from public.cards c
    join public.tracks t
      on t.id = c.activation_track_id and t.archived_at is null
   cross join public.exercises e
   where e.kind = 'card_based'
     and c.archived_at is null
  on conflict on constraint exercise_tracks_one_per_pair
    do update set track_id = excluded.track_id;

  delete from public.exercise_tracks et
   where et.card_id is not null
     and not exists (
       select 1
         from public.cards c
         join public.tracks t
           on t.id = c.activation_track_id and t.archived_at is null
        where c.id = et.card_id
          and c.archived_at is null
          and t.id = et.track_id
     );

  update public.cards c
     set image_url = (
           select a.src from public.artworks a
            where a.id = c.artwork_id and a.archived_at is null
         )
   where c.image_url is distinct from (
           select a.src from public.artworks a
            where a.id = c.artwork_id and a.archived_at is null
         );

  insert into public.card_i18n (card_id, locale)
  select c.id, l.locale
    from public.cards c
   cross join (values ('de'), ('en')) as l (locale)
   where c.archived_at is null
  on conflict do nothing;

  update public.card_i18n t
     set image_alt = (
           select i.alt
             from public.cards c
             join public.artworks a
               on a.id = c.artwork_id and a.archived_at is null
             join public.artwork_i18n i
               on i.artwork_id = a.id and i.locale = t.locale
            where c.id = t.card_id
         )
   where t.image_alt is distinct from (
           select i.alt
             from public.cards c
             join public.artworks a
               on a.id = c.artwork_id and a.archived_at is null
             join public.artwork_i18n i
               on i.artwork_id = a.id and i.locale = t.locale
            where c.id = t.card_id
         );
end;
$$;

comment on function public.project_deck() is
  'Derives exercise_tracks (activation only), cards.image_url and '
  'card_i18n.image_alt from each card''s own artwork_id and '
  'activation_track_id, and gives every live card its two card_i18n rows. '
  'Called by every admin write. Since 2026-11-20 the source is the card, not '
  'its grid square.';

select public.project_deck();

do $$
declare
  v_pairings int;
  v_pictures int;
  v_alts     int;
begin
  select count(*) into v_pairings from (
    (select * from before_pairings
     except select exercise_id, card_id, track_id from public.exercise_tracks where card_id is not null)
    union all
    (select exercise_id, card_id, track_id from public.exercise_tracks where card_id is not null
     except select * from before_pairings)
  ) d;

  select count(*) into v_pictures
    from before_pictures b join public.cards c using (id)
   where b.image_url is distinct from c.image_url;

  select count(*) into v_alts
    from before_alts b join public.card_i18n t using (card_id, locale)
   where b.image_alt is distinct from t.image_alt;

  if v_pairings + v_pictures + v_alts > 0 then
    raise exception
      'two tracks per card would change today''s deck: % pairing(s), % picture(s), % alt text(s) differ. '
      'Nothing was applied.', v_pairings, v_pictures, v_alts;
  end if;
end;
$$;

drop table before_pairings, before_pictures, before_alts;


-- ═══ 6 · THE SCAN DECIDES WHAT PLAYS (A1, A2, D6, D7) ═════════════════════
-- When a session's card is set, the database fills in the piece and the mode —
-- from the card, by the goal the session was started from. One place, so the
-- three ways a card reaches a session (typed or scanned, dealt digitally, the
-- only card left) cannot disagree, and the draw for „Achtsamkeit üben" happens
-- exactly once and is stored rather than re-drawn on every read.
--
--   goal relax     → relax_track_id, even when null: the listen step says
--                    „Kein Track zugeordnet" rather than playing the other one.
--   goal activate  → activation_track_id. Also a session with NO goal
--                    („Musie entdecken") — what every card played until today.
--   goal random    → a coin, among the modes this card HAS a piece for (D7),
--                    so a card waiting for its relax piece still plays.
--
-- An archived piece counts as none, the rule `project_deck()` always had.
--
-- UPDATE OF card_id ONLY. An insert that names a track is left alone — that is
-- how fixtures and older code write rows — and every path that draws a card
-- writes the card by update.
--
-- SECURITY DEFINER because the client may not read `tracks.archived_at`
-- (rule 2's column grant), and this has to. It reads three rows and writes
-- only the row being updated; `search_path` is pinned empty, so every name
-- below is qualified.
create function public.sessions_card_plays() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activate text;
  v_relax    text;
  v_mode     text;
begin
  if new.card_id is not distinct from old.card_id then
    return new;
  end if;

  if new.card_id is null then
    new.track_id   := null;
    new.music_mode := null;
    return new;
  end if;

  select (select t.id from public.tracks t
           where t.id = c.activation_track_id and t.archived_at is null),
         (select t.id from public.tracks t
           where t.id = c.relax_track_id and t.archived_at is null)
    into v_activate, v_relax
    from public.cards c
   where c.id = new.card_id;

  select g.music_mode into v_mode from public.goals g where g.id = new.goal_id;
  v_mode := coalesce(v_mode, 'activate');

  if v_mode = 'random' then
    v_mode := case
      when v_activate is not null and v_relax is not null
        then case when random() < 0.5 then 'relax' else 'activate' end
      when v_relax is not null then 'relax'
      else 'activate'
    end;
  end if;

  new.music_mode := v_mode;
  new.track_id   := case v_mode when 'relax' then v_relax else v_activate end;
  return new;
end;
$$;

comment on function public.sessions_card_plays() is
  'Sets sessions.track_id and music_mode whenever card_id changes: the card''s '
  'relax or activation piece, by the session goal''s music_mode (random drawn '
  'once among the pieces the card has). Two tracks per card, 2026-11-20.';

revoke all on function public.sessions_card_plays() from public, anon, authenticated;

create trigger sessions_card_plays
  before update of card_id on public.sessions
  for each row execute function public.sessions_card_plays();


-- ═══ 7 · THE WRITE SURFACE TAKES THE THREE NEW KEYS ═══════════════════════
-- `admin_write` as it stands, with the card branch reading `artwork_id`,
-- `activation_track_id` and `relax_track_id`. Every other branch is
-- byte-for-byte the live definition. No change to `content-admin`: it hands
-- the patch through, and reads `cards` with `*`.
create or replace function public.admin_write(p_actor_id uuid, p_actor_email text, p_entity text, p_row_id text, p_patch jsonb, p_action text DEFAULT NULL::text, p_reverts uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
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
        /* CREATE. The code is read from the patch exactly once in a card's
           life (the write-once trigger), and the id is derived from it. A new
           card may arrive with its picture and its two pieces already chosen;
           absent keys are simply null. */
        insert into public.cards (id, code, sort, valence, arousal, image_url,
                                  artwork_id, activation_track_id, relax_track_id)
        values (
          lower(p_patch ->> 'code'),
          p_patch ->> 'code',
          coalesce((p_patch ->> 'sort')::int,
                   (select coalesce(max(sort), 0) + 1 from public.cards)),
          (p_patch ->> 'valence')::smallint,
          (p_patch ->> 'arousal')::smallint,
          null,
          p_patch ->> 'artwork_id',
          p_patch ->> 'activation_track_id',
          p_patch ->> 'relax_track_id'
        );
      else
        update public.cards c set
          sort        = coalesce((p_patch ->> 'sort')::int, c.sort),
          valence     = case when p_patch ? 'valence'
                             then (p_patch ->> 'valence')::smallint else c.valence end,
          arousal     = case when p_patch ? 'arousal'
                             then (p_patch ->> 'arousal')::smallint else c.arousal end,
          archived_at = case when p_patch ? 'archived_at'
                             then (p_patch ->> 'archived_at')::timestamptz else c.archived_at end,
          /* THE CARD'S OWN PICTURE AND MUSIC — 2026-11-20. A key absent from
             the patch is left alone and a key present as null clears, which is
             what lets a revert of an edit made BEFORE these columns existed
             leave them untouched. */
          artwork_id          = case when p_patch ? 'artwork_id'
                                     then p_patch ->> 'artwork_id' else c.artwork_id end,
          activation_track_id = case when p_patch ? 'activation_track_id'
                                     then p_patch ->> 'activation_track_id' else c.activation_track_id end,
          relax_track_id      = case when p_patch ? 'relax_track_id'
                                     then p_patch ->> 'relax_track_id' else c.relax_track_id end
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
$function$;


-- ═══ 8 · ACHTSAME PAUSE UNDER „ENERGIE SAMMELN" (D9) ══════════════════════
-- Its activation pieces are today's pieces, so it can be offered there now.
-- Under „entspannen" both card exercises wait for Lucia's relax pieces (D10) —
-- a follow-up migration, so nobody meets „Kein Track zugeordnet" on every card.
insert into public.exercise_goals (exercise_id, goal_id)
values ('mindfulness-cards', 'wake-up')
on conflict do nothing;
