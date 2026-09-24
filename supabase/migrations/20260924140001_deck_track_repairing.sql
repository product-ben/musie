-- ═══════════════════════════════════════════════════════════════════════════
-- THE DECK — GENERATED FROM supabase/content/deck.json
--
-- Written 2026-09-24 by apps/web/scripts/deck-migration.mjs. Do not hand-edit it,
-- and do not edit the deck in Studio either: both drift from deck.json, and
-- `deck.db.test.ts` goes red when they do. Change the JSON and generate again.
--
-- ── WHAT THIS CHANGES ─────────────────────────────────────────────────────
-- Unknown. There was no committed supabase/content/deck.json to compare
-- against when this was generated, so nothing is claimed about what moved.
-- The deck below is the whole of it, which is true either way.
--
-- ── IT STATES THE WHOLE DECK, NOT THE DIFFERENCE ──────────────────────────
-- Every row is upserted and anything the deck no longer has is deleted, so
-- this lands the same deck whatever state it finds and is safe to re-apply.
-- A migration carrying only the changed row would depend on the database
-- already being where the generator imagined — the assumption CLAUDE.md
-- rule 4 exists because nobody can make it safely.
--
-- ── WHY THE FIRST STATEMENT LOOKS DESTRUCTIVE ─────────────────────────────
-- `cards.sort` is `unique` and NOT deferrable, so Postgres checks it as each
-- ROW is written rather than at the end of the statement. Two cards swapping
-- places collide halfway through an upsert that ends perfectly valid — the
-- same trap 20260923150000 hit on `exercises.sort`. So the order is parked
-- out of range first and every card is given its real place back below. A
-- row still parked at the end is a card this deck no longer has, and the
-- delete is what collects it.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══ 1 · PARKING THE ORDER ════════════════════════════════════════════════
-- Out of the way of the values below, inside this migration's transaction —
-- nothing observes the parked state, because no client reads between two
-- statements of one migration.
--
-- `cards.code` is unique too and is NOT parked, which is deliberate: `id` is
-- `code` in lower case and `id` is the conflict key, so a code cannot move
-- from one row to another. Renaming a card is a delete and an insert, and
-- those do not collide.
update public.cards set sort = sort + 1000;


-- ═══ 2 · THE DECK ════════════════════════════════════════════════════════
-- 9 cards, in deck order.
insert into public.cards (id, code, image_url, sort) values
  ('mc-01', 'MC-01', 'assets/web/method-card.png', 1),
  ('mc-02', 'MC-02', 'assets/web/method-card.png', 2),
  ('mc-03', 'MC-03', 'assets/web/method-card.png', 3),
  ('mc-04', 'MC-04', 'assets/web/method-card.png', 4),
  ('mc-05', 'MC-05', 'assets/web/method-card.png', 5),
  ('mc-06', 'MC-06', 'assets/web/method-card.png', 6),
  ('mc-07', 'MC-07', 'assets/web/method-card.png', 7),
  ('mc-08', 'MC-08', 'assets/web/method-card.png', 8),
  ('mc-09', 'MC-09', 'assets/web/method-card.png', 9)
on conflict (id) do update set
  code      = excluded.code,
  image_url = excluded.image_url,
  sort      = excluded.sort;

-- Anything still parked is a card the deck no longer lists.
delete from public.cards where id not in (
   'mc-01', 'mc-02', 'mc-03', 'mc-04', 'mc-05', 'mc-06', 'mc-07', 'mc-08',
   'mc-09');


-- ═══ 3 · THE FEELINGS ════════════════════════════════════════════════════
-- A card carries its feeling and nothing else that reads: the listening
-- instruction and the reflection question follow the exercise. image_alt is
-- null in BOTH locales or written in both — null in one is a dropped
-- translation, which is what public.missing_translations exists to report.
insert into public.card_i18n (card_id, locale, feeling, image_alt) values
  ('mc-01', 'de', 'Freude', null),
  ('mc-01', 'en', 'Joy', null),
  ('mc-02', 'de', 'Trauer', null),
  ('mc-02', 'en', 'Sadness', null),
  ('mc-03', 'de', 'Wut', null),
  ('mc-03', 'en', 'Anger', null),
  ('mc-04', 'de', 'Angst', null),
  ('mc-04', 'en', 'Fear', null),
  ('mc-05', 'de', 'Ruhe', null),
  ('mc-05', 'en', 'Calm', null),
  ('mc-06', 'de', 'Sehnsucht', null),
  ('mc-06', 'en', 'Longing', null),
  ('mc-07', 'de', 'Dankbarkeit', null),
  ('mc-07', 'en', 'Gratitude', null),
  ('mc-08', 'de', 'Einsamkeit', null),
  ('mc-08', 'en', 'Loneliness', null),
  ('mc-09', 'de', 'Hoffnung', null),
  ('mc-09', 'en', 'Hope', null)
on conflict (card_id, locale) do update set
  feeling   = excluded.feeling,
  image_alt = excluded.image_alt;

-- Deleting a card cascades to its rows here; this catches the other case,
-- a LOCALE a card no longer carries.
delete from public.card_i18n where (card_id, locale) not in (
   ('mc-01', 'de'), ('mc-01', 'en'), ('mc-02', 'de'), ('mc-02', 'en'),
   ('mc-03', 'de'), ('mc-03', 'en'), ('mc-04', 'de'), ('mc-04', 'en'),
   ('mc-05', 'de'), ('mc-05', 'en'), ('mc-06', 'de'), ('mc-06', 'en'),
   ('mc-07', 'de'), ('mc-07', 'en'), ('mc-08', 'de'), ('mc-08', 'en'),
   ('mc-09', 'de'), ('mc-09', 'en'));


-- ═══ 4 · WHAT EACH CARD PLAYS ════════════════════════════════════════════
-- One row per (exercise, card). The same card plays a different file in a
-- different exercise, which is what the tracks/exercise_tracks split is for.
--
-- A track id that does not exist fails HERE, on the foreign key, during
-- `supabase db reset` — which is why the generator does not try to check it.
insert into public.exercise_tracks (exercise_id, card_id, track_id) values
  ('free-rein', 'mc-01', 'trk-04'),
  ('mindfulness-cards', 'mc-01', 'trk-04'),
  ('free-rein', 'mc-02', 'trk-02'),
  ('mindfulness-cards', 'mc-02', 'trk-02'),
  ('free-rein', 'mc-03', 'trk-05'),
  ('mindfulness-cards', 'mc-03', 'trk-05'),
  ('free-rein', 'mc-04', 'trk-01'),
  ('mindfulness-cards', 'mc-04', 'trk-01'),
  ('free-rein', 'mc-05', 'trk-02'),
  ('mindfulness-cards', 'mc-05', 'trk-02'),
  ('free-rein', 'mc-06', 'trk-06'),
  ('mindfulness-cards', 'mc-06', 'trk-06'),
  ('free-rein', 'mc-07', 'trk-07'),
  ('mindfulness-cards', 'mc-07', 'trk-07'),
  ('free-rein', 'mc-08', 'trk-08'),
  ('mindfulness-cards', 'mc-08', 'trk-08'),
  ('free-rein', 'mc-09', 'trk-09'),
  ('mindfulness-cards', 'mc-09', 'trk-09')
on conflict on constraint exercise_tracks_one_per_pair do update set
  track_id = excluded.track_id;

-- `card_id is not null` is load-bearing. A NULL card_id is a cardless
-- exercise's OWN track — Atempartitur, Bodyscan — which is not the deck's and
-- must survive every deck edit untouched.
delete from public.exercise_tracks
 where card_id is not null
   and (exercise_id, card_id) not in (
   ('free-rein', 'mc-01'), ('mindfulness-cards', 'mc-01'),
   ('free-rein', 'mc-02'), ('mindfulness-cards', 'mc-02'),
   ('free-rein', 'mc-03'), ('mindfulness-cards', 'mc-03'),
   ('free-rein', 'mc-04'), ('mindfulness-cards', 'mc-04'),
   ('free-rein', 'mc-05'), ('mindfulness-cards', 'mc-05'),
   ('free-rein', 'mc-06'), ('mindfulness-cards', 'mc-06'),
   ('free-rein', 'mc-07'), ('mindfulness-cards', 'mc-07'),
   ('free-rein', 'mc-08'), ('mindfulness-cards', 'mc-08'),
   ('free-rein', 'mc-09'), ('mindfulness-cards', 'mc-09'));
