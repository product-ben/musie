-- ═══════════════════════════════════════════════════════════════════════════
-- THE MAINTENANCE UI — THE IMPORT
--
-- **THE LAST MIGRATION THAT EVER STATES DECK CONTENT.** After this, cards,
-- tracks, artworks and the grid live in the database, `deck.json` is an
-- export, and `pnpm deck:migration` refuses. CLAUDE.md rule 4 is amended in
-- this branch to say so.
--
-- ── IT TRANSCRIBES ALMOST NOTHING, ON PURPOSE ─────────────────────────────
-- The only thing typed out below is the NINE COORDINATES, because a position
-- in a feeling space is a judgement and there is nowhere to read it from.
-- Everything else is DERIVED from what the deck already says: each cell's
-- track comes out of `exercise_tracks`, each cell's artwork comes out of
-- `cards.image_url`. A transcription error is therefore not possible for the
-- parts that could have one.
--
-- ── AND IT PROVES ITSELF ──────────────────────────────────────────────────
-- §5 snapshots `exercise_tracks`, runs the projection, and raises if a single
-- row moved. The import is correct if and only if the projection reproduces
-- today's deck exactly, and that is cheap to prove inside the transaction
-- that does it. If this migration applies, the nine cards play what they
-- played this morning.
--
-- ── THE COORDINATES ───────────────────────────────────────────────────────
-- Built from the circumplex the two axes come from, using the words the cards
-- carried until today — which are PROVENANCE AND NOT DATA. Nothing stores
-- them after this; `card_i18n.feeling` is retired by the schema migration and
-- the nine words sit inert in their rows until the follow-up drops the table.
--
--     arousal ↑
--       +2 │  MC-03   MC-04     ·       ·       ·        Wut, Angst
--       +1 │    ·       ·       ·     MC-09   MC-01      Hoffnung, Freude
--        0 │    ·     MC-06     ·       ·       ·        Sehnsucht
--       −1 │  MC-02     ·       ·       ·     MC-07      Trauer, Dankbarkeit
--       −2 │  MC-08     ·       ·     MC-05     ·        Einsamkeit, Ruhe
--          └──────────────────────────────────────→ valence
--            −2      −1       0      +1      +2
--
-- Nine cards, nine cells, sixteen cells holding no card. Four tracks across
-- those nine: trk-01 twice, trk-02 three times, trk-04 twice, trk-05 twice.
-- The other five pieces have no audio file at all and sit in no cell — the
-- five silent cards, now visible as five empty cells rather than as five rows
-- whose `src` happens to be null.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══ 1 · THE NINE PLACEMENTS ══════════════════════════════════════════════
-- One statement, so `cards_one_per_cell` is satisfied at the end of it. All
-- nine targets are distinct and every card starts with a null cell, so
-- nothing collides mid-statement the way `sort` would.
update public.cards c
   set valence = v.valence, arousal = v.arousal
  from (values
          ('mc-01',  2,  1),     -- Freude
          ('mc-02', -2, -1),     -- Trauer
          ('mc-03', -2,  2),     -- Wut
          ('mc-04', -1,  2),     -- Angst
          ('mc-05',  1, -2),     -- Ruhe
          ('mc-06', -1,  0),     -- Sehnsucht
          ('mc-07',  2, -1),     -- Dankbarkeit
          ('mc-08', -2, -2),     -- Einsamkeit
          ('mc-09',  1,  1)      -- Hoffnung
       ) as v (id, valence, arousal)
 where c.id = v.id;

-- Nine, or this migration has mis-spelled a card id.
do $$
declare v_placed int;
begin
  select count(*) into v_placed from public.cards where valence is not null;
  if v_placed <> 9 then
    raise exception 'expected 9 placed cards, placed %', v_placed;
  end if;
end;
$$;


-- ═══ 2 · EVERY PICTURE BECOMES A ROW ══════════════════════════════════════
-- Derived from `cards.image_url`, so the nine artworks are exactly the nine
-- pictures the deck is already showing. `art-01` is the picture that was
-- MC-01's; the numbering follows the card it came from, which is a historical
-- fact about where these files came from and not a rule about artwork.
--
-- `src` keeps the BUNDLE PATH it already has — `assets/web/cards/mc-01.webp`.
-- The bucket starts empty and fills as pictures are replaced through the UI,
-- and `contentImageUrl()` resolves both shapes. Uploading the nine committed
-- files into the bucket on day one would mean coordinating hashed keys
-- between a script and this file for no gain: they are already served, and
-- already public.
insert into public.artworks (id, src)
select 'art-' || substring(c.id from 4 for 2), c.image_url
  from public.cards c
 where c.image_url is not null
 order by c.sort;

-- Both locales, alt null in BOTH — which is data and not a hole. The source
-- never described these pictures, and `missing_translations` compares the
-- locales against each other, so null in both stays quiet. The rows exist so
-- a join finds something; writing the alt text is authoring, and the UI is
-- where it will be done.
insert into public.artwork_i18n (artwork_id, locale, alt)
select a.id, l.locale, null
  from public.artworks a
 cross join (values ('de'), ('en')) as l (locale);


-- ═══ 3 · THE CELLS TAKE WHAT THE DECK ALREADY SAID ════════════════════════
-- The track each cell holds is the track the card standing on it plays today,
-- read out of `exercise_tracks`. `mindfulness-cards` is the source and
-- `free-rein` is ignored, because the two carry identical pairings and one of
-- them has to be the authority — a difference between them would be exactly
-- the per-exercise mapping that is out of scope.
update public.grid_cells g
   set track_id = et.track_id
  from public.cards c
  join public.exercise_tracks et
    on et.card_id = c.id and et.exercise_id = 'mindfulness-cards'
 where g.valence = c.valence and g.arousal = c.arousal;

update public.grid_cells g
   set artwork_id = 'art-' || substring(c.id from 4 for 2)
  from public.cards c
 where g.valence = c.valence
   and g.arousal = c.arousal
   and c.image_url is not null;


-- ═══ 4 · WHAT WE ACTUALLY KNOW ABOUT THE LICENCES ═════════════════════════
-- `licence_type` is the new column that makes *which of these may we still
-- use* answerable. 20260921160000 is explicit that Epidemic Sound is a
-- SUBSCRIPTION licence, "not the per-track clearance BUILD-PLAN assumed
-- everywhere it says cleared" — so the four pieces that have a file are
-- `subscription`, and the five that do not have no licence at all yet.
--
-- `catalogue_ref` stays NULL for all nine. The downloads gave us a track
-- name, which is what `licence_ref` already carries in prose; inventing a
-- catalogue number to fill a new column would be worse than an empty one.
update public.tracks
   set licence_type = case when src is null then 'none_yet' else 'subscription' end;


-- ═══ 5 · THE PROJECTION, AND THE PROOF ════════════════════════════════════
-- `exercise_tracks` is derived from here on. This runs the projection for the
-- first time and asserts that it changed nothing — which is the whole
-- correctness argument for everything above.
--
-- Only `card_id is not null` rows are compared: a cardless exercise's own
-- track is not the deck's and the projection never touches it.
do $$
declare
  v_before jsonb;
  v_after  jsonb;
  v_images_before jsonb;
  v_images_after  jsonb;
begin
  select coalesce(jsonb_agg(r order by r ->> 'e', r ->> 'c'), '[]'::jsonb)
    into v_before
    from (select jsonb_build_object(
                   'e', exercise_id, 'c', card_id, 't', track_id) as r
            from public.exercise_tracks
           where card_id is not null) s;

  select coalesce(jsonb_agg(r order by r ->> 'id'), '[]'::jsonb)
    into v_images_before
    from (select jsonb_build_object('id', id, 'url', image_url) as r
            from public.cards) s;

  perform public.project_deck();

  select coalesce(jsonb_agg(r order by r ->> 'e', r ->> 'c'), '[]'::jsonb)
    into v_after
    from (select jsonb_build_object(
                   'e', exercise_id, 'c', card_id, 't', track_id) as r
            from public.exercise_tracks
           where card_id is not null) s;

  select coalesce(jsonb_agg(r order by r ->> 'id'), '[]'::jsonb)
    into v_images_after
    from (select jsonb_build_object('id', id, 'url', image_url) as r
            from public.cards) s;

  if v_before is distinct from v_after then
    raise exception
      'the projection changed the deck. before: % after: %', v_before, v_after;
  end if;

  if v_images_before is distinct from v_images_after then
    raise exception
      'the projection changed a card picture. before: % after: %',
      v_images_before, v_images_after;
  end if;
end;
$$;


-- ═══ 6 · NOTHING IS LOGGED, AND THAT IS DELIBERATE ════════════════════════
-- `content_edits` stays empty. The history starts when a person does
-- something; an import is the floor it stands on, and the `before` of the
-- first real edit is this state. A history row claiming that somebody placed
-- nine cards at 10:01 would be the first false line in a log whose whole
-- value is that it is true.
