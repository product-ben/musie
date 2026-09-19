-- ═══════════════════════════════════════════════════════════════════════════
-- CONTENT SEED
--
-- The ENGLISH rows were GENERATED from
-- reference/design_system/data/mindfulness-cards.js. The authoritative source
-- for content is the Mindfulness Cards spreadsheet, and this file is how it
-- lands.
--
-- ── NO LONGER SAFE TO REGENERATE ───────────────────────────────────────────
-- This header used to say "do not hand-edit: regenerate instead". That is now
-- FALSE and dangerous. The German below was written BY HAND on 19 September
-- and exists in no source file: mindfulness-cards.js contains no German at
-- all, so re-running a generator over it would silently destroy every German
-- string here. Hand-edit this file, or bring the German with you.
--
-- In a MIGRATION rather than supabase/seed.sql on purpose: `supabase db
-- reset` runs seed.sql but `supabase db push` does NOT, so content in
-- seed.sql would never reach a deployed environment. Content changes by
-- migration only.
--
-- ── THE GERMAN CONTENT IS REAL, AND PROVISIONAL ────────────────────────────
-- Every German string below was written by hand to docs/GERMAN-UI-WRITING.md
-- — du, sentence case, verb-first actions, no 'Bitte', the length budget,
-- German dashes. It is real German and reads as German on a screen. It is
-- NOT final copy: the Mindfulness Cards spreadsheet owns this text and will
-- overwrite all of it.
--
-- That distinction used to be carried by a placeholder prefix on the front of
-- every German value, visible in the database and on screen. The prefix is
-- gone; the distinction is not. It is stated here and again above every block
-- of German inserts, marked PROVISIONAL GERMAN.
--
-- Find every provisional block with:
--   grep -n 'PROVISIONAL GERMAN' supabase/migrations/*_content_seed.sql
-- and read what actually landed with:
--   select locale, feeling from public.card_i18n order by card_id, locale;
--
-- STILL OWED, and NOT ours to write: exercise_i18n.listening and .question
-- (null in BOTH locales, three of each, from the spreadsheet) and
-- card_i18n.image_alt (null in both — the source has no per-card alt text).
-- Null in both locales is data; null in one is a dropped translation, which
-- is the difference public.missing_translations exists to report.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── user types ────────────────────────────────────────────────────────────
insert into public.user_types (id, implemented, image_url, sort) values
  ('by-myself', true, 'assets/web/method-card.png', 1),
  ('with-a-group', false, 'assets/web/method-card.png', 2),
  ('with-my-partner', false, 'assets/web/method-card.png', 3),
  ('with-a-patient', false, 'assets/web/method-card.png', 4);

-- PROVISIONAL GERMAN in every 'de' row below — see the header.
--
-- The LABEL is the user's own voice answering "Hier als …", so it is first
-- person ('meiner Partnerin'). The IMAGE_ALT is the app speaking about the
-- reader, so it is du ('deiner Partnerin'). The paired form (Doppelnennung)
-- is what docs/GERMAN-UI-WRITING.md defaults to, and §9 there flags the
-- alternatives as a brand decision that is still open.
insert into public.user_type_i18n (user_type_id, locale, label, image_alt) values
  ('by-myself', 'en', 'By myself', 'Placeholder artwork for using Musie by yourself'),
  ('by-myself', 'de', 'Allein', 'Platzhalterbild: Musie allein nutzen'),
  ('with-a-group', 'en', 'With a group', 'Placeholder artwork for using Musie with a group'),
  ('with-a-group', 'de', 'Mit einer Gruppe', 'Platzhalterbild: Musie mit einer Gruppe nutzen'),
  ('with-my-partner', 'en', 'With my partner', 'Placeholder artwork for using Musie with your partner'),
  ('with-my-partner', 'de', 'Mit meiner Partnerin oder meinem Partner', 'Platzhalterbild: Musie mit deiner Partnerin oder deinem Partner nutzen'),
  ('with-a-patient', 'en', 'With a patient', 'Placeholder artwork for using Musie with a patient'),
  ('with-a-patient', 'de', 'Mit einer Patientin oder einem Patienten', 'Platzhalterbild: Musie mit einer Patientin oder einem Patienten nutzen');

-- ── situations ────────────────────────────────────────────────────────────
insert into public.situations (id, sort) values
  ('feel-feelings', 1),
  ('get-day-started', 2),
  ('relax-busy-day', 3);

-- PROVISIONAL GERMAN in every 'de' row below — see the header.
insert into public.situation_i18n (situation_id, locale, label) values
  ('feel-feelings', 'en', 'Feel my feelings'),
  ('feel-feelings', 'de', 'Meine Gefühle spüren'),
  ('get-day-started', 'en', 'Get the day started'),
  ('get-day-started', 'de', 'In den Tag starten'),
  ('relax-busy-day', 'en', 'Relax during a busy day'),
  ('relax-busy-day', 'de', 'An einem vollen Tag entspannen');

-- ── exercises ───────────────────────────────────────────────────────────────
insert into public.exercises
  (id, timeframe_min, timeframe_max, needs_cards, needs_sound, image_url, implemented, sort)
values
  ('mindfulness-cards', 2, 12, true, true, 'assets/web/method-card.png', true, 1),
  ('breathing-score', 5, 8, false, true, 'assets/web/method-card.png', false, 2),
  ('body-scan-soundwalk', 15, 20, false, true, 'assets/web/method-card.png', false, 3);

-- needs / guideline / duration_label: null for the two unimplemented
-- exercises — the source has them for neither locale.
--
-- listening / question: NULL FOR ALL THREE. They follow the exercise now,
-- and the source has no exercise-level instruction or question at all —
-- it wrote nine per-card variants instead. Three of each, in both
-- locales, come from the Mindfulness Cards spreadsheet.

-- PROVISIONAL GERMAN in every 'de' row below — see the header.
--
-- 'Achtsamkeitspause' and 'Atempartitur' stay compounds on purpose: both have
-- dictionary break points, so --text-hyphens: auto handles them and there is
-- nothing to rephrase. 'Mindfulness-Cards-Set' is hyphenated throughout
-- (Durchkopplung) because a German noun welded to an English product name has
-- no break point at all. 'Body Scan' and 'Soundwalk' stay English: they are
-- the terms the German-speaking field uses, so only the connective tissue is
-- translated.
insert into public.exercise_i18n
  (exercise_id, locale, name, description, needs, guideline, duration_label,
   listening, question, image_alt)
values
  ('mindfulness-cards', 'en', 'Quick Mindfulness Break', 'Nine paper cards, one feeling each. Scan the card you relate to and listen to the track behind it.', 'Your physical Mindfulness Cards deck', 'Work with the card you are drawn to, not the one you think you should pick.', 'About 15 minutes', null, null, 'The Mindfulness Cards deck laid out on a table'),
  ('mindfulness-cards', 'de', 'Kurze Achtsamkeitspause', 'Neun Papierkarten, je ein Gefühl. Scanne die Karte, die dich anspricht, und höre das Stück dahinter.', 'Dein gedrucktes Mindfulness-Cards-Set', 'Arbeite mit der Karte, zu der es dich zieht – nicht mit der, die du für richtig hältst.', 'Etwa 15 Minuten', null, null, 'Das Mindfulness-Cards-Set auf einem Tisch ausgelegt'),
  ('breathing-score', 'en', 'Breathing Score', 'A slow score that follows your breath, for settling before anything else.', null, null, null, null, null, 'Placeholder artwork for the Breathing Score Exercise'),
  ('breathing-score', 'de', 'Atempartitur', 'Eine langsame Partitur, die deinem Atem folgt – zum Ankommen, bevor alles andere beginnt.', null, null, null, null, null, 'Platzhalterbild für die Übung Atempartitur'),
  ('body-scan-soundwalk', 'en', 'Body Scan Soundwalk', 'A guided walk through the body, one sound at a time.', null, null, null, null, null, 'Placeholder artwork for the Body Scan Soundwalk Exercise'),
  ('body-scan-soundwalk', 'de', 'Body Scan als Soundwalk', 'Ein geführter Gang durch den Körper, Klang für Klang.', null, null, null, null, null, 'Platzhalterbild für die Übung Body Scan als Soundwalk');

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
-- PROVISIONAL GERMAN in every 'de' row below — see the header.
insert into public.card_i18n (card_id, locale, feeling, image_alt) values
  ('mc-01', 'en', 'Joy', null),
  ('mc-01', 'de', 'Freude', null),
  ('mc-02', 'en', 'Sadness', null),
  ('mc-02', 'de', 'Trauer', null),
  ('mc-03', 'en', 'Anger', null),
  ('mc-03', 'de', 'Wut', null),
  ('mc-04', 'en', 'Fear', null),
  ('mc-04', 'de', 'Angst', null),
  ('mc-05', 'en', 'Calm', null),
  ('mc-05', 'de', 'Ruhe', null),
  ('mc-06', 'en', 'Longing', null),
  ('mc-06', 'de', 'Sehnsucht', null),
  ('mc-07', 'en', 'Gratitude', null),
  ('mc-07', 'de', 'Dankbarkeit', null),
  ('mc-08', 'en', 'Loneliness', null),
  ('mc-08', 'de', 'Einsamkeit', null),
  ('mc-09', 'en', 'Hope', null),
  ('mc-09', 'de', 'Hoffnung', null);

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
