-- ═══════════════════════════════════════════════════════════════════════════
-- BEN'S COPY PASS OF 2026-09-29 — THE CONTENT HALF
--
-- Source: `musie keys .xlsx`, the workbook Ben filled against the export of
-- 2026-09-26 (`4e4c930`, `musie-content-exercises.csv` and `musie-locales.csv`).
-- Same two sheets, same four columns, same 294 keys — nothing added, nothing
-- removed, 25 German and 9 English strings rewritten.
--
-- The workbook's `musie-locales` sheet is the app's own chrome and lands in
-- `apps/web/src/i18n/{de,en}.ts` in the same commit. THIS FILE is the other
-- sheet: the `exercise_i18n` rows, which are content and provisional — the
-- Mindfulness Cards spreadsheet owns them, which is exactly what this workbook
-- is.
--
-- ── RULE 4 ────────────────────────────────────────────────────────────────
-- A new migration with `update`, not an edit to 20260923120000 /
-- 20260923150000 / 20260924140000 / 20260924150000 where these strings were
-- written. All four are applied on `project-musie`; editing an applied file
-- changes nothing there and is skipped in silence.
--
-- Every `update` rewrites the WHOLE value, so this file states the text it
-- leaves behind and re-running it is a no-op.
--
-- ── WHAT CHANGED, AND THE ONE CROSS-CUTTING DECISION ──────────────────────
-- Most of it is register: shorter sentences, a full stop where a comma was
-- carrying two clauses, and — three times — a question that stops naming its
-- own mechanism. `Welches Bild entsteht vor deinem inneren Auge, wenn Musik
-- und Karte zusammenkommen?` becomes `Welches Bild entsteht vor deinem
-- inneren Auge?`: the reader is looking at a card with music playing, so the
-- clause was telling them what they were already doing. Same move in Freie
-- Bahn's reflect step, where `Wie fühlst du dich?` becomes `Wie geht es dir
-- jetzt?` — the second asks about a moment, the first about a condition, and
-- this product is not asking anybody about their condition.
--
-- THE DECISION, and it is Ben's, taken on 2026-09-29: **the deck's German
-- name is Germanised.** `Mindfulness-Cards-Set` becomes
-- `Mindfulness-Karten-Set`. That inverts §8.1 of docs/GERMAN-UI-WRITING.md,
-- which held that the deck is a product name and does not translate; the
-- standard is amended in the same commit to record the new name rather than
-- left contradicting the data.
--
-- It is rolled out in ONE step, not spread over the strings the workbook
-- happened to touch. The workbook Germanised four rows here and left
-- `exercises.fact.cards` in `de.ts` — *the one string a user actually reads
-- today*, since `needs` has had no surface since 2026-09-24 — saying
-- `Mindfulness-Cards-Set`. Shipping that pair would have put two names for one
-- object in the product, which §1 of the standard calls a bug report. So
-- `de.ts` moves with these four.
--
-- Durchkopplung holds either way (§6, §8): Mindfulness-Karten-Set, hyphens
-- throughout, which is also what gives the hyphenator its break points.
--
-- ── WHAT I DID NOT TAKE VERBATIM ──────────────────────────────────────────
-- Two rows, both Ben's call and both taken back to him before this file was
-- written:
--
-- 1. `mindfulness-cards.image_alt` (de). The workbook had `Fünf aufgefächerte
--    Karten des Mindfulness-Karten-Sets. Nimm die Vorderste heraus` — an
--    instruction where alt text describes, and a screen-reader user would hear
--    a command that is not theirs to follow. Ben chose to KEEP the existing
--    sentence, so only the deck name moves here, and `en` does not move at
--    all: leaving `en` at `taking the nearest one` while `de` still says a hand
--    is taking it would have the two locales describing different pictures.
--
-- 2. `mindfulness-cards.reflect_md` (de). The workbook read `die aus durch
--    Musik und Bild vor deinem inneren Auge entstanden ist` — `aus durch` is
--    a half-finished edit, not a phrasing. Written out as `die durch Musik und
--    Bild vor deinem inneren Auge entstanden ist`, which is the sentence the
--    edit was reaching for: Ben replaced `aus der Verbindung von` with
--    `durch` and the old preposition stayed behind.
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══ 1 · ACHTSAME PAUSE ════════════════════════════════════════════════════

-- `Höre das Stück dahinter` → `Höre das Stück`. The card is two sentences
-- back; `dahinter` was pointing at something the sentence no longer holds.
--
-- `needs`: the Germanised deck name. Still the 'Du brauchst' row, still
-- without a surface since 2026-09-24 — carried correct so that a surface which
-- comes back does not come back wrong.
--
-- `image_alt`: the deck name only. See WHAT I DID NOT TAKE VERBATIM (1).
update public.exercise_i18n set
  description = 'Wähle 5 zufällige Karten. Scanne eine, die dich spontan anspricht. Höre das Stück. Wenn du magst, denke dabei über die Frage nach.',
  needs       = 'Mindfulness-Karten-Set',
  image_alt   = 'Fünf aufgefächerte Karten des Mindfulness-Karten-Sets, eine Hand nimmt die vorderste heraus'
where exercise_id = 'mindfulness-cards' and locale = 'de';

-- `Mindful Pause` → `Mindful Break`. The German `Achtsame Pause` does not
-- move: `Pause` is the German word and it was never the English one.
--
-- `en.ts`'s `notImplemented.text` names this exercise too and moves with it in
-- the same commit, so no screen calls it by the old name.
update public.exercise_i18n set
  name = 'Mindful Break'
where exercise_id = 'mindfulness-cards' and locale = 'en';

-- The headline is unchanged; the question drops the clause that described the
-- step the reader is standing in.
update public.exercise_i18n set listen_md = $md$## Höre bewusst zu, und schau dir die Karte an

Welches Bild entsteht vor deinem inneren Auge?$md$
where exercise_id = 'mindfulness-cards' and locale = 'de';

update public.exercise_i18n set listen_md = $md$## Listen closely, and look at your card

What picture forms in your mind’s eye?$md$
where exercise_id = 'mindfulness-cards' and locale = 'en';

-- `aus der Verbindung von Musik und Bild` → `durch Musik und Bild`. Shorter,
-- and the scene is still named as the thing the two made together. See WHAT I
-- DID NOT TAKE VERBATIM (2) for the `aus durch` in the workbook.
--
-- `en` is unchanged: `the scene that the music and the image made in your
-- mind’s eye` already says it this way.
update public.exercise_i18n set reflect_md = $md$## Worüber hast du nachgedacht?

Wenn du magst, beantworte diese Fragen:

- Was für einen Namen würdest du der Szene geben, die durch Musik und Bild vor deinem inneren Auge entstanden ist?
- Was ist dabei passiert?$md$
where exercise_id = 'mindfulness-cards' and locale = 'de';

-- ═══ 2 · FREIE BAHN ════════════════════════════════════════════════════════

-- `Ein Stapel des Mindfulness-Cards-Sets` → `Ein Stapel von Mindfulness-Karten`:
-- the Germanised name, and a genitive traded for a prepositional phrase, which
-- §6 prefers anyway. `en` stays `A stack of Mindfulness Cards …` — the picture
-- described is the same one.
update public.exercise_i18n set
  needs     = 'Mindfulness-Karten-Set',
  image_alt = 'Ein Stapel von Mindfulness-Karten mit einer einzelnen Karte davor'
where exercise_id = 'free-rein' and locale = 'de';

-- Two sentences where one carried both instructions on an `und`. They are two
-- different things to do — be carried, and let thoughts pass — and the full
-- stop is the pause between them. `carry you` → `take you` in English for the
-- same reason the German lost its comma: the shorter verb leaves the sentence
-- with one beat instead of two.
update public.exercise_i18n set listen_md = $md$## Nimm die Klänge wahr und sieh die Karte an

Lass dich von ihnen mitnehmen. Lass Gedanken kommen und gehen.$md$
where exercise_id = 'free-rein' and locale = 'de';

update public.exercise_i18n set listen_md = $md$## Notice the sounds and look at your card

Let them take you. Let thoughts come and go.$md$
where exercise_id = 'free-rein' and locale = 'en';

-- `Wie fühlst du dich?` → `Wie geht es dir jetzt?`, and `How do you feel?` →
-- `How are you right now?`. Step 1 is unchanged in both locales.
update public.exercise_i18n set reflect_md = $md$## Spüre und reflektiere

1. Lass die Töne innerlich ausklingen. Atme noch einmal tief durch die Nase ein und durch den Mund wieder aus. Spüre noch einen Augenblick nach.
2. Wie geht es dir jetzt? Wie fühlt sich der Moment an?$md$
where exercise_id = 'free-rein' and locale = 'de';

update public.exercise_i18n set reflect_md = $md$## Feel it, and reflect

1. Let the notes fade out inside you. Breathe in deeply through your nose once more, and out through your mouth. Stay with it for a moment.
2. How are you right now? How does this moment feel?$md$
where exercise_id = 'free-rein' and locale = 'en';
