-- ═══════════════════════════════════════════════════════════════════════════
-- KLANGREISE · THE FIRST REVIEW FROM /exercise-builder
--
-- The first file handed back through the exercise builder:
-- `sound-journey.NEEDS-REVIEW.json`, baseline 2026-10-28T19:51:50Z. Six
-- changes, every one `by: "hand"`, all German. Five are copy in
-- `exercise_i18n` and are written below. Every `before` in the handover
-- matches what `20261009140000` and `20261012100000` left in the row, so
-- nothing here writes over an edit made since.
--
-- ── WHAT IS NOT HERE, AND WHY ─────────────────────────────────────────────
-- The sixth change, and the file's only blocker, is `run[1].copy.de
-- .secondaryLabel` → "Zuerst Hören, dann Reflektieren". It is not a column; it
-- overrides the chrome key `session.listen.startLocked`, built in as "Zuerst
-- hören, dann reflektieren". Chrome is not a column, so it is not here: Ben
-- (2026-11-03) had the capitals go into the shared key in `de.ts`, for every
-- exercise. Logged in apps/web/OPEN-QUESTIONS.md.
--
-- ── WHAT WAS TOUCHED IN HER WORDS ─────────────────────────────────────────
-- Two things, both mechanical: the comma before "ohne … zu wollen" (an
-- infinitive group with "ohne" takes one), and trailing spaces before line
-- breaks. Everything else is verbatim, line breaks included — the builder's
-- preview renders through the step's own `Markdown`, so what she saw is what
-- this draws.
--
-- ── WHY THIS IS STILL A MIGRATION ─────────────────────────────────────────
-- Rule 4.1 moved four tables out of migrations; `exercise_i18n` is not one of
-- them. English is untouched: the handover's `machineTranslated` is empty, so
-- the English rows still say what they said, and they now say something
-- different from the German. That is a known gap, not an oversight.
--
-- One write per row, whole values, so the file is idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

update public.exercise_i18n set
  description = 'Eine tiefe Stimme leitet dich durch Klänge und gibt dir Anregungen zum achtsamen Hören.
Du kannst die Übungen zwischendurch oder vor dem Einschlafen durchführen.
Die Übung kann dir helfen, dich zu entspannen und Achtsamkeit zu üben.',
  intro_md = '## Loslegen

Stell sicher, dass du die nächsten {minutes} Minuten ungestört bist und nicht abgelenkt wirst. Schalte Notifications aus.

Du kannst die Übung zwischendurch oder zum Einschlafen durchführen.

Mach es dir bequem.',
  listen_md = '## Wahrnehmen

Wenn du magst, schließe deine Augen. Nimm deinen Atem wahr, ohne ihn aktiv verändern zu wollen.
Wenn deine Aufmerksamkeit beim Hören abwandert, versuche, sie sanft zurückzuführen.'
where exercise_id = 'sound-journey' and locale = 'de';
