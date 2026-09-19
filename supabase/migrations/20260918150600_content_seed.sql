-- ═══════════════════════════════════════════════════════════════════════════
-- CONTENT SEED
--
-- GENERATED from reference/design_system/data/mindfulness-cards.js.
-- Do not hand-edit: regenerate instead. The authoritative source is the
-- Mindfulness Cards spreadsheet, and this file is how it lands.
--
-- In a MIGRATION rather than supabase/seed.sql on purpose: `supabase db
-- reset` runs seed.sql but `supabase db push` does NOT, so content in
-- seed.sql would never reach a deployed environment. Content changes by
-- migration only.
--
-- ── THE GERMAN ROWS ARE PLACEHOLDERS ──────────────────────────────────────
-- Every German string is the English text prefixed '[DE] '. NOTHING HAS
-- BEEN TRANSLATED. The real German copy comes from the spreadsheet and is
-- not ours to invent; the prefix is there so no placeholder can be mistaken
-- for finished copy, in the database or on a screen.
--
-- Find them all at any time with:
--   select * from public.card_i18n where locale = 'de' and feeling like '[DE] %';
-- ═══════════════════════════════════════════════════════════════════════════

-- ── user types ────────────────────────────────────────────────────────────
insert into public.user_types (id, implemented, image_url, sort) values
  ('by-myself', true, 'assets/web/method-card.png', 1),
  ('with-a-group', false, 'assets/web/method-card.png', 2),
  ('with-my-partner', false, 'assets/web/method-card.png', 3),
  ('with-a-patient', false, 'assets/web/method-card.png', 4);

insert into public.user_type_i18n (user_type_id, locale, label, image_alt) values
  ('by-myself', 'en', 'By myself', 'Placeholder artwork for using Musie by yourself'),
  ('by-myself', 'de', '[DE] By myself', '[DE] Placeholder artwork for using Musie by yourself'),
  ('with-a-group', 'en', 'With a group', 'Placeholder artwork for using Musie with a group'),
  ('with-a-group', 'de', '[DE] With a group', '[DE] Placeholder artwork for using Musie with a group'),
  ('with-my-partner', 'en', 'With my partner', 'Placeholder artwork for using Musie with your partner'),
  ('with-my-partner', 'de', '[DE] With my partner', '[DE] Placeholder artwork for using Musie with your partner'),
  ('with-a-patient', 'en', 'With a patient', 'Placeholder artwork for using Musie with a patient'),
  ('with-a-patient', 'de', '[DE] With a patient', '[DE] Placeholder artwork for using Musie with a patient');

-- ── situations ────────────────────────────────────────────────────────────
insert into public.situations (id, sort) values
  ('feel-feelings', 1),
  ('get-day-started', 2),
  ('relax-busy-day', 3);

insert into public.situation_i18n (situation_id, locale, label) values
  ('feel-feelings', 'en', 'Feel my feelings'),
  ('feel-feelings', 'de', '[DE] Feel my feelings'),
  ('get-day-started', 'en', 'Get the day started'),
  ('get-day-started', 'de', '[DE] Get the day started'),
  ('relax-busy-day', 'en', 'Relax during a busy day'),
  ('relax-busy-day', 'de', '[DE] Relax during a busy day');

-- ── exercises ───────────────────────────────────────────────────────────────
insert into public.exercises
  (id, timeframe_min, timeframe_max, needs_cards, needs_sound, image_url, implemented, sort)
values
  ('mindfulness-cards', 2, 12, true, true, 'assets/web/method-card.png', true, 1),
  ('breathing-score', 5, 8, false, true, 'assets/web/method-card.png', false, 2),
  ('body-scan-soundwalk', 15, 20, false, true, 'assets/web/method-card.png', false, 3);

-- needs / guideline / duration_label are null for the two unimplemented
-- needs / guideline / duration_label: null for the two unimplemented
-- exercises — the source has them for neither locale.
--
-- listening / question: NULL FOR ALL THREE. They follow the exercise now,
-- and the source has no exercise-level instruction or question at all —
-- it wrote nine per-card variants instead. Three of each, in both
-- locales, come from the Mindfulness Cards spreadsheet.
insert into public.exercise_i18n
  (exercise_id, locale, name, description, needs, guideline, duration_label,
   listening, question, image_alt)
values
  ('mindfulness-cards', 'en', 'Quick Mindfulness Break', 'Nine paper cards, one feeling each. Scan the card you relate to and listen to the track behind it.', 'Your physical Mindfulness Cards deck', 'Work with the card you are drawn to, not the one you think you should pick.', 'About 15 minutes', null, null, 'The Mindfulness Cards deck laid out on a table'),
  ('mindfulness-cards', 'de', '[DE] Quick Mindfulness Break', '[DE] Nine paper cards, one feeling each. Scan the card you relate to and listen to the track behind it.', '[DE] Your physical Mindfulness Cards deck', '[DE] Work with the card you are drawn to, not the one you think you should pick.', '[DE] About 15 minutes', null, null, '[DE] The Mindfulness Cards deck laid out on a table'),
  ('breathing-score', 'en', 'Breathing Score', 'A slow score that follows your breath, for settling before anything else.', null, null, null, null, null, 'Placeholder artwork for the Breathing Score Exercise'),
  ('breathing-score', 'de', '[DE] Breathing Score', '[DE] A slow score that follows your breath, for settling before anything else.', null, null, null, null, null, '[DE] Placeholder artwork for the Breathing Score Exercise'),
  ('body-scan-soundwalk', 'en', 'Body Scan Soundwalk', 'A guided walk through the body, one sound at a time.', null, null, null, null, null, 'Placeholder artwork for the Body Scan Soundwalk Exercise'),
  ('body-scan-soundwalk', 'de', '[DE] Body Scan Soundwalk', '[DE] A guided walk through the body, one sound at a time.', null, null, null, null, null, '[DE] Placeholder artwork for the Body Scan Soundwalk Exercise');

-- ── which exercises each situation surfaces ─────────────────────────────────
insert into public.exercise_situations (exercise_id, situation_id) values
  ('mindfulness-cards', 'feel-feelings'),
  ('breathing-score', 'feel-feelings'),
  ('mindfulness-cards', 'get-day-started'),
  ('body-scan-soundwalk', 'get-day-started'),
  ('mindfulness-cards', 'relax-busy-day'),
  ('breathing-score', 'relax-busy-day'),
  ('body-scan-soundwalk', 'relax-busy-day');

-- ── cards ─────────────────────────────────────────────────────────────────
-- The `spotify` field in the source is DELIBERATELY not carried over. MVP 0.3
-- replaced the Spotify hand-off with self-hosted audio, and the data file
-- keeps the field only for the superseded snapshots.
insert into public.cards (id, code, image_url, sort) values
  ('mc-01', 'MC-01', 'assets/web/method-card.png', 1),
  ('mc-02', 'MC-02', 'assets/web/method-card.png', 2),
  ('mc-03', 'MC-03', 'assets/web/method-card.png', 3),
  ('mc-04', 'MC-04', 'assets/web/method-card.png', 4),
  ('mc-05', 'MC-05', 'assets/web/method-card.png', 5),
  ('mc-06', 'MC-06', 'assets/web/method-card.png', 6),
  ('mc-07', 'MC-07', 'assets/web/method-card.png', 7),
  ('mc-08', 'MC-08', 'assets/web/method-card.png', 8),
  ('mc-09', 'MC-09', 'assets/web/method-card.png', 9);

-- A card carries its FEELING and nothing else that reads. The nine per-card
-- listening instructions and questions in the source have no home now that
-- both follow the exercise, so they are not carried over.
--
-- image_alt is null in both locales: the source has no per-card alt text and
-- writing it would be authoring copy, not seeding data.
insert into public.card_i18n (card_id, locale, feeling, image_alt) values
  ('mc-01', 'en', 'Joy', null),
  ('mc-01', 'de', '[DE] Joy', null),
  ('mc-02', 'en', 'Sadness', null),
  ('mc-02', 'de', '[DE] Sadness', null),
  ('mc-03', 'en', 'Anger', null),
  ('mc-03', 'de', '[DE] Anger', null),
  ('mc-04', 'en', 'Fear', null),
  ('mc-04', 'de', '[DE] Fear', null),
  ('mc-05', 'en', 'Calm', null),
  ('mc-05', 'de', '[DE] Calm', null),
  ('mc-06', 'en', 'Longing', null),
  ('mc-06', 'de', '[DE] Longing', null),
  ('mc-07', 'en', 'Gratitude', null),
  ('mc-07', 'de', '[DE] Gratitude', null),
  ('mc-08', 'en', 'Loneliness', null),
  ('mc-08', 'de', '[DE] Loneliness', null),
  ('mc-09', 'en', 'Hope', null),
  ('mc-09', 'de', '[DE] Hope', null);

-- ── tracks ────────────────────────────────────────────────────────────────
-- The music, once per recording.
--
-- THE IDS ARE OPAQUE ON PURPOSE. `trk-01`, not `morgenlicht`: every other
-- id in this schema is a readable slug, and here that would leak the answer
-- through exercise_tracks.track_id, which clients can read.
--
-- No translations: a track title and an artist name are not translated.
-- Both are ANSWERS and are not granted to the client.
-- licence_ref is null — the source carries no licence reference.
insert into public.tracks (id, src, duration_seconds, title, artist, licence_ref) values
  ('trk-01', 'assets/audio/mc-01-joy.mp3', 196, 'Morgenlicht', 'Ida Sperber', null),
  ('trk-02', 'assets/audio/mc-02-sadness.mp3', 241, 'Langsames Wasser', 'Ensemble Nord', null),
  ('trk-03', 'assets/audio/mc-03-anger.mp3', 178, 'Schwere Luft', 'Kollektiv Rau', null),
  ('trk-04', 'assets/audio/mc-04-fear.mp3', 263, 'Unter der Decke', 'Mara Vogt', null),
  ('trk-05', 'assets/audio/mc-05-calm.mp3', 228, 'Stiller Raum', 'Jonas Leie', null),
  ('trk-06', 'assets/audio/mc-06-longing.mp3', 254, 'Weiter Weg', 'Trio Halbmond', null),
  ('trk-07', 'assets/audio/mc-07-gratitude.mp3', 214, 'Kalte Sonne', 'Ben Aster', null),
  ('trk-08', 'assets/audio/mc-08-loneliness.mp3', 205, 'Ein Stuhl am Fenster', 'Ida Sperber', null),
  ('trk-09', 'assets/audio/mc-09-hope.mp3', 187, 'Aufgehen', 'Ensemble Nord', null);

-- ── which track plays when ────────────────────────────────────────────────
-- The source files are the Mindfulness Cards deck, so all nine pair with
-- that exercise. A recording used by a second exercise would add a row
-- HERE and not another row above — which is the whole point of the split.
--
-- The other two exercises need sound and draw no card, so each wants a row
-- with a NULL card_id. The source has no file for either, so neither is
-- seeded and both stay silent until one exists.
insert into public.exercise_tracks (exercise_id, card_id, track_id) values
  ('mindfulness-cards', 'mc-01', 'trk-01'),
  ('mindfulness-cards', 'mc-02', 'trk-02'),
  ('mindfulness-cards', 'mc-03', 'trk-03'),
  ('mindfulness-cards', 'mc-04', 'trk-04'),
  ('mindfulness-cards', 'mc-05', 'trk-05'),
  ('mindfulness-cards', 'mc-06', 'trk-06'),
  ('mindfulness-cards', 'mc-07', 'trk-07'),
  ('mindfulness-cards', 'mc-08', 'trk-08'),
  ('mindfulness-cards', 'mc-09', 'trk-09');
