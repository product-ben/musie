-- ═══════════════════════════════════════════════════════════════════════════
-- THE LIBRARY IN BEN'S OWN WORDS, AND A SECOND IMPLEMENTED EXERCISE
--
-- Ben, 2026-09-23. Three things at once, because they are one content change:
--
--   1. Every card on /exercises gets its REAL copy — five exercises, name and
--      description, in both locales. What was there came from
--      reference/design_system/data/mindfulness-cards.js by way of the seed;
--      this is the product's own text.
--   2. FREIE BAHN is added, implemented, and is structurally a copy of
--      Achtsame Pause: it draws a card, it plays that card's recording, it
--      runs the same four steps. It reuses the nine recordings rather than
--      needing any of its own — which is what the tracks/exercise_tracks
--      split was for, and this is the first row that proves it.
--   3. The timings are re-cut, and one exercise becomes two.
--
-- ── THE CATALOGUE GOES FROM THREE TO FIVE, AND HOW ────────────────────────
-- The brief names five exercises where the database had three. Achtsame Pause
-- and Achtsam Atmen are the rows already here (`mindfulness-cards`,
-- `breathing-score`). `body-scan-soundwalk` — "Body Scan als Soundwalk", "a
-- guided walk through the body, one sound at a time" — is the BODYSCAN: its
-- description already said so, and Ben's new copy for it ("lass dich von der
-- Stimme durch deinen Körper führen") is the same exercise in better words.
-- KLANGREISE is therefore new, and is the third placeholder.
--
-- THE IDS DO NOT MOVE. `body-scan-soundwalk` now reads "Bodyscan" on screen
-- and keeps the id it has had since the seed, because `sessions.exercise_id`
-- and `diary` rows point at it and a rename would orphan every one of them.
-- An id in this schema is a stable handle, not a label — which is also why
-- the two new ones are English slugs (`free-rein`, `sound-journey`) beside
-- their German names.
--
-- ── WHY `free-rein` IS needs_cards = true THOUGH ITS CARD SAYS OTHERWISE ───
-- The brief lists only the clock beside Freie Bahn. That is about what the
-- CARD SHOWS, and `needs_cards` is not a display flag: routes/Session.tsx
-- derives "this exercise skips the scan step" from it, and routes/ScanLink.tsx
-- decides with it what a QR deep link does. False here would delete the scan
-- step from an exercise whose entire instruction is "scan a random card".
--
-- So the column stays true and the chips stay as they are for all five —
-- Ben's call, 2026-09-23, asked and answered before this was written. The
-- brief's icon lists were shorthand for the copy, not a spec for the chips.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══ 1 · MAKING ROOM IN THE ORDER ══════════════════════════════════════════
-- `exercises.sort` is `not null unique`, and the constraint is NOT DEFERRABLE.
-- Postgres checks a unique index as each ROW is updated, not at the end of the
-- statement, so `set sort = sort + 1` over a contiguous run fails on a
-- collision that only ever existed halfway through the statement.
--
-- Two passes, with the movers parked out of the way. +100 rather than negative
-- numbers because nothing constrains `sort` to be positive and a stray 102 is
-- easier to recognise than a stray -2 if this ever stops halfway.
update public.exercises set sort = sort + 100
  where id in ('breathing-score', 'body-scan-soundwalk');


-- ═══ 2 · THE TWO NEW EXERCISES ═════════════════════════════════════════════
-- ── listen_gate_seconds ───────────────────────────────────────────────────
-- free-rein: 90, COPIED from Achtsame Pause rather than estimated. It is the
-- one measured number in this column — the prototype's own figure, arrived at
-- against these same nine recordings — and Freie Bahn plays those same nine
-- recordings. The invariant db.content.db.test.ts holds this to still passes:
-- 90 < 2 × 60, the shortest timeframe the exercise claims.
--
-- sound-journey: 180, and an ESTIMATE like the two placeholders before it. It
-- has no recording to tune against. Roughly a quarter of its shorter end, the
-- same proportion the seed used for Body Scan Soundwalk. Set it properly the
-- day it has a track.
insert into public.exercises
  (id, timeframe_min, timeframe_max, needs_cards, needs_sound, image_url, implemented, sort, listen_gate_seconds)
values
  ('free-rein',     2,  5, true,  true, 'assets/web/method-card.png', true,  2,  90),
  ('sound-journey', 12, 15, false, true, 'assets/web/method-card.png', false, 4, 180);


-- ═══ 3 · THE TIMINGS, AND THE FINAL ORDER ══════════════════════════════════
-- Achtsame Pause keeps 2–12 and its gate of 90: the brief re-states them
-- unchanged, so there is nothing to write.
--
-- Bodyscan drops from 15–20 to 10–12. Its gate of 180 is untouched and still
-- clears both invariants (180 < 10 × 60, and it gates no track yet).
update public.exercises set sort = 3
  where id = 'breathing-score';

update public.exercises set sort = 5, timeframe_min = 10, timeframe_max = 12
  where id = 'body-scan-soundwalk';


-- ═══ 4 · WHAT THE LIBRARY SAYS ═════════════════════════════════════════════
-- THE GERMAN IS BEN'S OWN, and it is the product's copy rather than the
-- spreadsheet's — which makes it the first content in these tables that is not
-- provisional. The ENGLISH is ours, translated to match: same register, same
-- `du`-voice, same length budget.
--
-- `needs` is the "Du brauchst" row in the detail lightbox. It is filled for
-- the two card exercises and null for the three placeholders — null in BOTH
-- locales, which is data rather than a dropped translation, and is the
-- distinction missing_translations exists to make.
update public.exercise_i18n set
  name        = 'Achtsame Pause',
  description = 'Wähle 5 zufällige Karten. Scanne eine, die dich spontan anspricht. Höre das Stück dahinter. Wenn du magst, denke dabei über die Frage nach.',
  needs       = 'Mindfulness-Cards-Set'
where exercise_id = 'mindfulness-cards' and locale = 'de';

update public.exercise_i18n set
  name        = 'Mindful Pause',
  description = 'Pick 5 random cards. Scan the one that speaks to you. Listen to the piece behind it. If you like, think about the question while you listen.',
  needs       = 'Mindfulness Cards deck'
where exercise_id = 'mindfulness-cards' and locale = 'en';

-- 'Achtsam Atmen' replaces 'Atempartitur'. The compound is gone, so the
-- hyphenation note in the seed no longer applies to this row: a two-word
-- verb phrase has a natural break and needs none.
update public.exercise_i18n set
  name        = 'Achtsam Atmen',
  description = 'Nutze das Metrum der Musik, um deinen Atem zur Ruhe kommen zu lassen. Wenn du magst, leg deine Hände dafür auf deinen Bauch oder deinen unteren Rücken. Schicke deinen Atem dorthin.',
  image_alt   = 'Platzhalterbild für die Übung Achtsam Atmen'
where exercise_id = 'breathing-score' and locale = 'de';

update public.exercise_i18n set
  name        = 'Mindful Breathing',
  description = 'Use the pulse of the music to let your breath settle. If you like, rest your hands on your belly or your lower back, and send your breath there.',
  image_alt   = 'Placeholder artwork for the Mindful Breathing exercise'
where exercise_id = 'breathing-score' and locale = 'en';

-- 'Bodyscan' replaces 'Body Scan als Soundwalk'. One word, as Ben writes it,
-- and English as the German-speaking field uses it — the seed's reasoning for
-- keeping 'Body Scan' and 'Soundwalk' untranslated holds for the closed form.
update public.exercise_i18n set
  name        = 'Bodyscan',
  description = 'Suche dir eine bequeme Position. Wenn du magst, lass dich von der Stimme durch deinen Körper führen.',
  image_alt   = 'Platzhalterbild für die Übung Bodyscan'
where exercise_id = 'body-scan-soundwalk' and locale = 'de';

update public.exercise_i18n set
  name        = 'Body Scan',
  description = 'Find a comfortable position. If you like, let the voice guide you through your body.',
  image_alt   = 'Placeholder artwork for the Body Scan exercise'
where exercise_id = 'body-scan-soundwalk' and locale = 'en';

-- ── THE TWO NEW ROWS ──────────────────────────────────────────────────────
-- Freie Bahn borrows Achtsame Pause's image_alt rather than describing a
-- placeholder: both draw the same deck and both point at the same picture, so
-- the honest alt is the one that says what the picture is.
insert into public.exercise_i18n
  (exercise_id, locale, name, description, needs, image_alt)
values
  ('free-rein', 'de', 'Freie Bahn',
   'Scanne eine zufällige Karte und springe direkt in die Übung.',
   'Mindfulness-Cards-Set',
   'Das Mindfulness-Cards-Set auf einem Tisch ausgelegt'),
  ('free-rein', 'en', 'Free Rein',
   'Scan a random card and jump straight into the exercise.',
   'Mindfulness Cards deck',
   'The Mindfulness Cards deck laid out on a table'),
  ('sound-journey', 'de', 'Klangreise',
   'Lass dich von der Stimme durch die Klänge führen und mit deinem Körper verbinden. Oder lass einfach die Gedanken schweifen, ohne ihnen zu folgen.',
   null,
   'Platzhalterbild für die Übung Klangreise'),
  ('sound-journey', 'en', 'Sound Journey',
   'Let the voice guide you through the sounds and connect you with your body. Or simply let your thoughts wander without following them.',
   null,
   'Placeholder artwork for the Sound Journey exercise');


-- ═══ 5 · THE STEP COPY ═════════════════════════════════════════════════════
-- Markdown, and the renderable subset is apps/web/src/lib/markdown.ts — the
-- migration that added these columns names that file as the normative
-- statement of what renders, and this one does not widen it.
--
-- ── ONE CHANGE TO ACHTSAME PAUSE, AND IT CLOSES AN OPEN QUESTION ──────────
-- "Leg die vier Karten mit dem Symbol [X] vor dich" is replaced. The `[X]`
-- shipped verbatim on 2026-09-23 because inventing a symbol printed on a
-- physical deck would have been authoring content about a product this
-- repository cannot see; it is logged in apps/web/OPEN-QUESTIONS.md and this
-- is its answer — there is no symbol, the cards are drawn at random.
--
-- FIVE, NOT FOUR. Ben's replacement line said four and the library card says
-- five; asked, and the answer was five everywhere (2026-09-23). The digit on
-- the card and the word in the step are both his, kept as written.
update public.exercise_i18n set intro_md = $md$## So legen wir los

1. Ziehe fünf zufällige Karten aus dem Deck.
2. Lass die Bilder einen Moment auf dich wirken.$md$
where exercise_id = 'mindfulness-cards' and locale = 'de';

update public.exercise_i18n set intro_md = $md$## Here is how we start

1. Draw five random cards from the deck.
2. Let the images settle for a moment.$md$
where exercise_id = 'mindfulness-cards' and locale = 'en';

-- ── FREIE BAHN, ALL FOUR STEPS ────────────────────────────────────────────
-- The German is Ben's, with four mechanical corrections and nothing else.
-- All four are logged in apps/web/OPEN-QUESTIONS.md:
--
--   1. "Wähle eine Kart aus"            → "Karte". A typo, and the same one
--                                         corrected in this exercise's model.
--   2. "deine Stimmung in ihr wiederfinde" → "wiederfinden". A dropped n.
--   3. "Wie fühlt sich der Moment an"   → "…an?". It is a question, and §7 of
--                                         docs/GERMAN-UI-WRITING.md puts the
--                                         mark on the sentence that asks one.
--   4. "schweifen ohne ihnen zu folgen" → "schweifen, ohne ihnen zu folgen"
--                                         (in the library copy above). An
--                                         "ohne … zu" clause takes the comma.
--
-- THE BULLETS ARE BEN'S AND THEY STAY BULLETS HERE. They render as paragraphs
-- — that is this change's renderer rule, and it is the RENDERER's to make.
-- Rewriting the source to plain paragraphs would bake a presentation decision
-- into the content, where the next person to change the rule cannot find it.
update public.exercise_i18n set intro_md = $md$## So legen wir los

Lege den Stapel Karten verdeckt vor dich.$md$
where exercise_id = 'free-rein' and locale = 'de';

update public.exercise_i18n set intro_md = $md$## Here is how we start

Lay the deck face down in front of you.$md$
where exercise_id = 'free-rein' and locale = 'en';

update public.exercise_i18n set scan_md = $md$## Wähle eine Karte aus

- Ziehe eine zufällige Karte vom Stapel. Nimm dir einen Augenblick Zeit, um das Bild auf dich wirken zu lassen. Vielleicht kannst du deine Stimmung in ihr wiederfinden, vielleicht wirst du die Darstellung aber auch eher distanziert betrachten. Alles ist in Ordnung.
- Wenn du soweit bist, scanne den QR-Code.$md$
where exercise_id = 'free-rein' and locale = 'de';

update public.exercise_i18n set scan_md = $md$## Choose a card

- Draw a random card from the deck. Take a moment to let the image work on you. Maybe you will find your own mood in it, maybe you will look at it from more of a distance. Either is fine.
- When you are ready, scan the QR code.$md$
where exercise_id = 'free-rein' and locale = 'en';

update public.exercise_i18n set listen_md = $md$## Nimm die Klänge wahr

Lass dich von ihnen mitnehmen und Gedanken kommen und gehen.$md$
where exercise_id = 'free-rein' and locale = 'de';

update public.exercise_i18n set listen_md = $md$## Notice the sounds

Let them carry you, and let thoughts come and go.$md$
where exercise_id = 'free-rein' and locale = 'en';

update public.exercise_i18n set reflect_md = $md$## Spüre und reflektiere

1. Lass die Töne innerlich ausklingen. Atme noch einmal tief durch die Nase ein und durch den Mund wieder aus. Spüre noch einen Augenblick nach.
2. Wie fühlst du dich? Wie fühlt sich der Moment an?$md$
where exercise_id = 'free-rein' and locale = 'de';

update public.exercise_i18n set reflect_md = $md$## Feel it, and reflect

1. Let the notes fade out inside you. Breathe in deeply through your nose once more, and out through your mouth. Stay with it for a moment.
2. How do you feel? How does this moment feel?$md$
where exercise_id = 'free-rein' and locale = 'en';


-- ═══ 6 · WHAT FREIE BAHN PLAYS ═════════════════════════════════════════════
-- THE SAME NINE RECORDINGS, AND NOT ONE NEW ROW IN `tracks`.
--
-- This is the split earning its keep. A recording is a thing in its own right
-- — licensed once, credited once — and `exercise_tracks` says when it plays.
-- A second exercise that draws the same deck therefore adds NINE PAIRING ROWS
-- and nothing else: no duplicated src, no second copy of a credit that could
-- drift from the first, and `count(*)` over `tracks` still answers "how many
-- recordings are there".
--
-- Five of the nine have `src is null` — silent by design, and ordinary: the
-- listen step renders its no-recording line. Freie Bahn is one draw rather
-- than a choice among five, so it meets that more often than Achtsame Pause
-- does. Flagged in apps/web/OPEN-QUESTIONS.md; it is content, not a bug.
insert into public.exercise_tracks (exercise_id, card_id, track_id) values
  ('free-rein', 'mc-01', 'trk-01'),
  ('free-rein', 'mc-02', 'trk-02'),
  ('free-rein', 'mc-03', 'trk-03'),
  ('free-rein', 'mc-04', 'trk-04'),
  ('free-rein', 'mc-05', 'trk-05'),
  ('free-rein', 'mc-06', 'trk-06'),
  ('free-rein', 'mc-07', 'trk-07'),
  ('free-rein', 'mc-08', 'trk-08'),
  ('free-rein', 'mc-09', 'trk-09');


-- ═══ 7 · WHICH SITUATION SURFACES THEM ═════════════════════════════════════
-- Nothing in the app reads `exercise_situations` yet — D1's "what can I do
-- about this feeling?" has no screen. It is seeded for all three existing
-- exercises, so leaving two rows out would make the table half-true the day
-- something does read it.
--
-- Freie Bahn is the short way into the deck, so it goes where Achtsame Pause
-- goes. Klangreise is long and guided: not a way to start a day.
insert into public.exercise_situations (exercise_id, situation_id) values
  ('free-rein', 'feel-feelings'),
  ('free-rein', 'get-day-started'),
  ('free-rein', 'relax-busy-day'),
  ('sound-journey', 'feel-feelings'),
  ('sound-journey', 'relax-busy-day');
