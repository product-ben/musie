-- ═══════════════════════════════════════════════════════════════════════════
-- ALT TEXT FOLLOWS THE PICTURE, BECAUSE IT WAS DERIVED HALFWAY
--
-- ── WHAT WAS FOUND, ON HOSTED, ON 2026-10-15 ──────────────────────────────
-- The first hosted run of the database suite that ever got past `link`
-- reported `card_i18n.image_alt` NULL FOR ALL NINE CARDS. Not missing — lost:
-- the nine descriptions are in `supabase/content/deck.json` and in the
-- September seed, and the app still selects that column (`CARD_SELECT`,
-- apps/web/src/lib/content.ts). So every card picture in the live app
-- announces the fallback — `Karte MC-01`, `session.cards.fallbackAlt` — rather
-- than its description. It lands hardest on the digital path, where the card
-- fills the screen and the alt text IS the card.
--
-- BACKLOG.md B6 predicted the shape of this and had the direction wrong: it
-- assumed `card_i18n` still held the text while `artwork_i18n` was empty.
-- On hosted both are empty.
--
-- ── WHY IT HAPPENED, WHICH IS THE PART WORTH FIXING ───────────────────────
-- `project_deck()` derives `cards.image_url` from the grid on every admin
-- write. It did NOT derive the description. So the picture had a projected
-- home and its words a hand-written one — and MAINTENANCE-UI.md §3.1 had
-- already moved the words to `artwork_i18n.alt`, which nothing reads and which
-- `20261014100100` created with a literal null.
--
-- Half-derived is the fault. B6's consequence 2 is what it costs: after an
-- artwork upload the card shows the NEW picture with the OLD description, and
-- a screen reader is told something confidently wrong, which is worse than
-- silence.
--
-- ── SO THE DESCRIPTION IS DERIVED TOO, BY THE SAME ROUTE ──────────────────
-- `artwork_i18n.alt` becomes the single home — the one `/maintenance` already
-- writes — and `project_deck()` projects it into `card_i18n.image_alt` exactly
-- as it projects `artworks.src` into `cards.image_url`. Three things follow,
-- and the third is why this beats moving the readers:
--
--   NO READER CHANGES. `content.ts` and `content-export.mjs` keep selecting
--     `card_i18n.image_alt`. A card reaches its artwork only through
--     (valence, arousal), which is not a foreign key, so PostgREST cannot
--     follow it — switching the readers would have needed a view first. B6's
--     "the join is already there for image_url" is not so: `image_url` is
--     PROJECTED, not joined.
--   THE MAINTENANCE FIELD STARTS WORKING. An operator who describes a picture
--     changes `artwork_i18n.alt`, and the next write projects it down. Until
--     today that afternoon's work was invisible — B6's consequence 1.
--   STALE ALT TEXT BECOMES IMPOSSIBLE. The words travel with the picture
--     because they come from the same row, by the same subquery. Not fixed
--     by care; fixed by construction.
--
-- `card_i18n.image_alt` is DERIVED from here on, like `exercise_tracks` and
-- `cards.image_url` before it: a value written there by hand is erased by the
-- next admin write. §3.1 schedules `card_i18n` to be dropped, and it cannot go
-- while `feeling` lives in it — `not null`, and `deck:pdf` prints the word on
-- the physical front of MC-06…MC-09, which have no artwork master. That plan
-- needs a second look; it is logged rather than quietly contradicted.
--
-- ── WHY CONTENT TRAVELS BY MIGRATION HERE, AGAINST RULE 4.1 ───────────────
-- Rule 4.1's danger is a GENERATED DECK MIGRATION that states the whole deck
-- and so puts the file's version back over an operator's edit. The seed below
-- is the opposite shape: eighteen updates, each one `where alt is null`. It
-- can only fill a hole. A description typed in `/maintenance` — before this
-- runs or after it — is never touched, and a second run changes nothing.
--
-- It is here rather than typed into the screen because the text to restore is
-- nine paragraphs in two languages that already exist, written and reviewed,
-- and retyping them into a form is how one of them comes back subtly
-- different.
--
-- ── WHAT THIS DOES NOT FIX, SAID OUT LOUD ─────────────────────────────────
-- MC-10, created through `/maintenance` on hosted, has NO `card_i18n` rows in
-- either locale, so `toCard` drops it and the card is unreachable in the app.
-- The projection below cannot help: it updates rows, and there are none to
-- update. MC-10 needs a `feeling` in both locales to exist at all — that is
-- one word, and it is a product decision rather than a translation gap. Its
-- description it then gets for free, because its cell holds MC-06's artwork
-- and the projection reads the picture that is actually shown.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · THE NINE DESCRIPTIONS, INTO THE HOME THAT IS NOW THE ONLY ONE ─────
-- Generated from supabase/content/deck.json rather than retyped.
-- `alt is null` on every statement: fills a hole, never overwrites.

update public.artwork_i18n set alt = $alt$Feine blaue Linien fächern über die Fläche, am rechten Rand steigt eine große dunkle Scheibe in warmes Licht.$alt$
 where artwork_id = 'art-01' and locale = 'de' and alt is null;

update public.artwork_i18n set alt = $alt$Fine blue lines fan across the surface; at the right edge a large dark disc rises into warm light.$alt$
 where artwork_id = 'art-01' and locale = 'en' and alt is null;

update public.artwork_i18n set alt = $alt$Grüne und türkise Wellen schwingen nach rechts oben, dahinter ein blassgelber Lichtschein.$alt$
 where artwork_id = 'art-02' and locale = 'de' and alt is null;

update public.artwork_i18n set alt = $alt$Green and turquoise waves sweep up to the right, with a pale yellow light behind them.$alt$
 where artwork_id = 'art-02' and locale = 'en' and alt is null;

update public.artwork_i18n set alt = $alt$Blaugraue Bergrücken schieben sich hintereinander in den Dunst.$alt$
 where artwork_id = 'art-03' and locale = 'de' and alt is null;

update public.artwork_i18n set alt = $alt$Blue-grey ridges layer one behind another into the haze.$alt$
 where artwork_id = 'art-03' and locale = 'en' and alt is null;

update public.artwork_i18n set alt = $alt$Waagerechte Bänder aus Grün, Türkis und Cremeweiß liegen ruhig übereinander.$alt$
 where artwork_id = 'art-04' and locale = 'de' and alt is null;

update public.artwork_i18n set alt = $alt$Horizontal bands of green, turquoise and cream lie quietly over one another.$alt$
 where artwork_id = 'art-04' and locale = 'en' and alt is null;

update public.artwork_i18n set alt = $alt$Ein rot und schiefergrau geschichteter Felsrücken unter einem staubroten Himmel.$alt$
 where artwork_id = 'art-05' and locale = 'de' and alt is null;

update public.artwork_i18n set alt = $alt$A ridge layered in red and slate grey under a dusty red sky.$alt$
 where artwork_id = 'art-05' and locale = 'en' and alt is null;

update public.artwork_i18n set alt = $alt$Tiefblaue Wellen unten links treffen in einer weiten Kurve auf ein leuchtend rotes Feld.$alt$
 where artwork_id = 'art-06' and locale = 'de' and alt is null;

update public.artwork_i18n set alt = $alt$Deep blue waves at the lower left meet a glowing red field in one wide curve.$alt$
 where artwork_id = 'art-06' and locale = 'en' and alt is null;

update public.artwork_i18n set alt = $alt$Eine fast leere blaue Fläche, auf der nur die Struktur des Papiers zu sehen ist.$alt$
 where artwork_id = 'art-07' and locale = 'de' and alt is null;

update public.artwork_i18n set alt = $alt$An almost empty blue surface on which only the grain of the paper shows.$alt$
 where artwork_id = 'art-07' and locale = 'en' and alt is null;

update public.artwork_i18n set alt = $alt$Türkise und grüne Wellen, tief am Horizont ein blassgelber Streifen Licht.$alt$
 where artwork_id = 'art-08' and locale = 'de' and alt is null;

update public.artwork_i18n set alt = $alt$Turquoise and green waves with a pale yellow band of light low on the horizon.$alt$
 where artwork_id = 'art-08' and locale = 'en' and alt is null;

update public.artwork_i18n set alt = $alt$Ein dunkler Höhenzug mit roten Schichten unter einem verhangenen roten Himmel.$alt$
 where artwork_id = 'art-09' and locale = 'de' and alt is null;

update public.artwork_i18n set alt = $alt$A dark ridge with red strata under an overcast red sky.$alt$
 where artwork_id = 'art-09' and locale = 'en' and alt is null;

-- ── 2 · AND THE PROJECTION THAT KEEPS THEM WITH THEIR PICTURE ─────────────
-- 20261014100000's function, unchanged, plus one update at the end.

create or replace function public.project_deck() returns void
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

  /* AND ITS DESCRIPTION, BY THE SAME ROUTE AND FOR THE SAME REASON — a
     correlated subquery, so a card that has left the grid is NULLED rather
     than left holding the words for a picture it no longer shows.

     `i.locale = t.locale` is the line that makes this a translation and not a
     copy: each of a card's two rows reads its own language, and a picture
     described in German only leaves the English row null — which is exactly
     what public.missing_translations is built to report. */
  update public.card_i18n t
     set image_alt = (
           select i.alt
             from public.cards c
             join public.grid_cells g
               on g.valence = c.valence and g.arousal = c.arousal
             join public.artworks a
               on a.id = g.artwork_id and a.archived_at is null
             join public.artwork_i18n i
               on i.artwork_id = a.id and i.locale = t.locale
            where c.id = t.card_id
         )
   where t.image_alt is distinct from (
           select i.alt
             from public.cards c
             join public.grid_cells g
               on g.valence = c.valence and g.arousal = c.arousal
             join public.artworks a
               on a.id = g.artwork_id and a.archived_at is null
             join public.artwork_i18n i
               on i.artwork_id = a.id and i.locale = t.locale
            where c.id = t.card_id
         );
end;
$$;

comment on function public.project_deck() is
  'Rewrites exercise_tracks, cards.image_url AND card_i18n.image_alt from the '
  'grid. Called by every admin write. All three are DERIVED from here on: a '
  'pairing or a description written by hand is erased by the next cell change. '
  'artwork_i18n.alt is the one home for a picture description — see '
  '20261015100000 for why that is a projection rather than a reader change.';

-- Rule 2's half that gets missed, restated because this file replaces the
-- function. `create or replace` keeps the privileges, so these two lines are
-- belt and braces rather than a repair — and they are the lines somebody
-- deletes for being redundant, on the day the function is dropped and
-- recreated instead of replaced.
revoke all on function public.project_deck() from public, anon, authenticated;
grant execute on function public.project_deck() to service_role;

-- ── 3 · TAKE EFFECT NOW, NOT AT THE NEXT ADMIN WRITE ──────────────────────
-- Without this the nine descriptions sit in artwork_i18n and the app keeps
-- reading nulls until somebody happens to edit the deck.
select public.project_deck();
