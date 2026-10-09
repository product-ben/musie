-- ═══════════════════════════════════════════════════════════════════════════
-- THE EXERCISE LIBRARY IN THE FIRST PERSON — BOTH LOCALES — Ben, 2026-10-09
--
-- The card descriptions stop giving instructions and say what the exercise
-- DOES FOR YOU, with Musie as the one doing it. *Use the pulse of the music to
-- let your breath settle* becomes *Breathe along with my guidance and the
-- music. That helps you settle and relax.* — the same exercise, offered rather
-- than prescribed. Four of the ten rows now say `I` / `me` / `ich` / `mir`
-- outright, which is new for this table: the step copy has always been Musie
-- speaking, and the library cards were the one surface still written as a
-- manual. They agree now.
--
-- ── IT OVERLAPS 20261009130000, AND THAT IS DELIBERATE ────────────────────
-- `20261009130000_the_cards_say_what_musie_does_for_you.sql` exists on branch
-- `ui-writing-experiment`, written in the running app at 12:56. It carries the
-- five GERMAN rows and nothing else — no `locale = 'en'` statement anywhere —
-- so on its own the library speaks Ben's new voice in German and the old
-- manual in English. That is the hole this file closes.
--
-- IT RESTATES THE GERMAN RATHER THAN ASSUMING IT. Rule 9: two branches minting
-- `2026…` filenames in parallel interleave by wall clock, a fresh `db reset`
-- applies them in one order and `db push` in the order they reached the
-- remote, and a migration that assumes the other branch's `update` already ran
-- is correct in exactly one of those. Every German value below is byte-
-- identical to that file's, so the two are COMMUTATIVE: whichever runs second
-- writes what is already there. Neither needs the other, and if only one is
-- ever merged it should be this one.
--
-- It also supersedes `20261009100000_one_word_for_the_music.sql` on this same
-- branch for `mindfulness-cards` / `de`. That file replaced four German words
-- for the music with *die Musik* in a sentence this one deletes outright. Its
-- other rows — the card and track tables — are untouched and still needed.
--
-- ── RULE 4 ────────────────────────────────────────────────────────────────
-- A new migration with `update`, never an edit to 20260923150000 or
-- 20260929100000 where these strings were last written. Both are applied on
-- `project-musie`; editing an applied file changes nothing there and is
-- skipped in silence. Every statement states the WHOLE value, so re-running
-- the file is a no-op.
--
-- ── ONE RENAME, AND ITS ALT TEXT IS NOT PART OF IT ────────────────────────
-- `breathing-score` becomes **Breath Relaxation** / **Atementspannung**.
-- Ben's call, 2026-10-09, asked and answered: the other four names in his
-- table matched the database verbatim and this one did not, which is the only
-- reason it was worth a question.
--
-- It replaces *Mindful Breathing* / *Achtsam Atmen*, which 20260923150000
-- chose over *Atempartitur* — so this is the second rename of the row and the
-- first that moves it off mindfulness. Both locales move together: `Achtsam`
-- means mindful, and renaming only the English would leave German promising
-- something the English had stopped promising.
--
-- `image_alt` IS NOT TOUCHED, though 20260923150000 wrote it as *Placeholder
-- artwork for the Mindful Breathing exercise* and a rename would have had to
-- carry that along. It no longer says that: the live values are *Two hands
-- resting on a belly, just below the ribs* and its German twin, real alt text
-- for real artwork, describing the PICTURE and not the exercise. A picture of
-- two hands on a belly is the same picture whatever the exercise is called.
--
-- ── NOTHING ELSE MOVES ────────────────────────────────────────────────────
-- No `needs`, no `sort`, no `intro_md` / `scan_md` / `listen_md` /
-- `reflect_md`. The step copy is a different surface with a different author
-- and was not under review. No id changes: `sessions.exercise_id` and every
-- diary entry point at `breathing-score`, and renaming a key to match a
-- display name would orphan them — the lesson 20260923150000 already recorded
-- when `body-scan-soundwalk` became *Bodyscan* on screen and stayed
-- `body-scan-soundwalk` in the database.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Achtsame Pause / Mindful Break ────────────────────────────────────
update public.exercise_i18n set
  description = 'Wähle über visuelle Reize die passende Musik für deinen Moment und steige dann in diesen ein. Damit helfe ich dir beim Entspannen und Üben von Achtsamkeit.'
where exercise_id = 'mindfulness-cards' and locale = 'de';

update public.exercise_i18n set
  description = 'Let what you see lead you to the music for this moment, then step into it. That is how I help you relax and practise mindfulness.'
where exercise_id = 'mindfulness-cards' and locale = 'en';

-- ── 2 · Freie Bahn / Free Rein ────────────────────────────────────────────
update public.exercise_i18n set
  description = 'Eine zufällige Bildkarte mit passender Musik und eine Höranleitung von mir helfen dir beim Entspannen und Üben von Achtsamkeit.'
where exercise_id = 'free-rein' and locale = 'de';

update public.exercise_i18n set
  description = 'A random picture card, the music that goes with it and a listening guide from me will help you relax and practise mindfulness.'
where exercise_id = 'free-rein' and locale = 'en';

-- ── 3 · Atementspannung / Breath Relaxation ───────────────────────────────
-- The rename, argued in the header. `image_alt` stays as it is.
update public.exercise_i18n set
  name        = 'Atementspannung',
  description = 'Atme mit meinen Anweisungen und Musik. Das hilft dir, zur Ruhe zu kommen und dich zu entspannen.'
where exercise_id = 'breathing-score' and locale = 'de';

update public.exercise_i18n set
  name        = 'Breath Relaxation',
  description = 'Breathe along with my guidance and the music. That helps you settle and relax.'
where exercise_id = 'breathing-score' and locale = 'en';

-- ── 4 · Klangreise / Sound Journey ────────────────────────────────────────
update public.exercise_i18n set
  description = 'Lass mich dich mit der Stimme eines echten Menschen durch die Klänge führen. Das hilft dir, dich zu spüren, zu entspannen und Achtsamkeit zu üben.'
where exercise_id = 'sound-journey' and locale = 'de';

update public.exercise_i18n set
  description = 'Let me guide you through the sounds, in the voice of a real person. That helps you notice what you feel, relax and practise mindfulness.'
where exercise_id = 'sound-journey' and locale = 'en';

-- ── 5 · Bodyscan / Body Scan ──────────────────────────────────────────────
update public.exercise_i18n set
  description = 'Lass mich dich mit der Stimme eines echten Menschen und passender Musik durch deinen Körper führen. Das hilft dir, dich zu spüren, zu entspannen und Achtsamkeit zu üben.'
where exercise_id = 'body-scan-soundwalk' and locale = 'de';

update public.exercise_i18n set
  description = 'Let me guide you through your body, in the voice of a real person and with the music to match. That helps you notice what you feel, relax and practise mindfulness.'
where exercise_id = 'body-scan-soundwalk' and locale = 'en';
