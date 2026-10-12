-- ═══════════════════════════════════════════════════════════════════════════
-- THE TWO LISTENING EXERCISES GET THEIR WORDS, AND BECOME STARTABLE
--
-- ── RENUMBERED FROM 20261011120000, AND RULE 9 IS WHY ─────────────────────
-- This file was written as `20261011120000_listening_steps.sql` on 2026-10-11.
-- On 2026-10-12 `listening-question-iteration` merged into main carrying
-- `20261011120000_listening_question_rotation.sql` — THE SAME TIMESTAMP,
-- minted the same afternoon on another branch, which is exactly the
-- interleaving CLAUDE.md rule 9 describes.
--
-- Supabase records an applied migration BY TIMESTAMP, not by content. With
-- both files in one tree, `20261011120000` is already in
-- `supabase_migrations.schema_migrations` from theirs, so this one would be
-- SKIPPED IN SILENCE on a hosted push while every check reported success —
-- rule 4's failure, arriving through rule 9's door.
--
-- Renaming is safe here and only here: this file had never been applied
-- anywhere when the collision was found. Rule 4 forbids editing an APPLIED
-- migration, and the local stack's record of `20261011120000` belongs to the
-- other branch.
--
-- Klangreise and Bodyscan have been in the library since 2026-09-23 with a
-- name, a description, artwork, goals and a timeframe — and no step copy at
-- all, which is why `implemented` has been false and why pressing either one
-- opened the *not built yet* lightbox. This file writes the copy and flips the
-- flag, and it is the LAST migration of the branch for that reason: an
-- exercise must not become startable before its words and its audio exist.
--
-- ── IT IS A DRAFT, AND SAYS SO ────────────────────────────────────────────
-- CLAUDE.md rule 6: a missing German string is WRITTEN, not reported. So this
-- is written, to docs/GERMAN-UI-WRITING.md, rather than left as a placeholder
-- with a note asking Ben for copy — and it is his to overwrite. Drafting it is
-- not deciding it.
--
-- NOT from the Mindfulness Cards spreadsheet, which has nothing to say about
-- exercises that draw no cards. The voice is the one the library moved to on
-- 2026-10-09: Musie in the first person, offering rather than prescribing.
--
-- ── THREE STEPS, NOT FOUR, AND `scan_md` STAYS NULL ───────────────────────
-- Both are `listening_only` (20261011100000), so their run is
-- intro → listen → reflect and there is no scan step to write copy for.
-- `scan_md` is left null in BOTH locales, which is data rather than a hole:
-- `missing_translations` compares the locales against each other, so absent
-- from both is silent and absent from one would not be.
--
-- ── `{minutes}` IS FILLED BY THE STEP, AND IS THE ONE PLACEHOLDER HERE ────
-- Ben's intro line quotes the length: *"Stell sicher, dass die nächsten
-- {minutes} Minuten keine Notifications oder anderen Ablenkungen an dich heran
-- kommen."* The number cannot live in this column, because it is a property of
-- the RECORDING and this column is the same for every recording of the
-- exercise — and a number typed here would be the second source of truth that
-- goes stale the first time an exercise is re-recorded.
--
-- So the copy names it and `SessionIntro` substitutes it from the cut that is
-- about to play, ROUNDED UP to the minute: 183 seconds reads as 4, 574 as 10.
-- Up rather than nearest, because the sentence is a promise about how long
-- nothing may interrupt you, and rounding 183 down to 3 would under-promise by
-- three seconds of somebody's attention.
--
-- It is the only placeholder any content column carries. If a second one ever
-- appears, the substitution belongs in `Markdown` rather than in a screen.
--
-- ── WHAT THE INTRO DOES NOT DO: ASK THE TWO QUESTIONS ─────────────────────
-- The Einsteigen step now carries two segmented controls — *Wie möchtest du
-- zuhören?* and *Was machst du nach der Übung?* — rendered under this copy by
-- `SessionIntro`. The copy therefore LEADS INTO them without repeating them.
-- Naming the options here would be the same words twice on one screen, three
-- inches apart.
--
-- ── AND THE LEAD-IN GOES WITH THEM — Ben, 2026-10-12 ─────────────────────
-- Bodyscan's closing line (*"Ich führe deine Aufmerksamkeit durch deinen
-- Körper. Sag mir vorher noch, wie du zuhörst."*) is CUT. Both controls carry
-- their own legend and sit directly under this copy, so a sentence announcing
-- them was a caption for something already on the screen — and the half that
-- described the exercise said again what the library card and the listen step
-- both say.
--
-- Klangreise keeps its one: *"Sag mir noch, wie du zuhörst — dann wähle ich
-- die Aufnahme, die dazu passt."* That line says what answering DOES, which is
-- the one thing the two controls cannot say about themselves. The asymmetry is
-- Ben's edit on the screen he was reading, and it survives review for that
-- reason rather than in spite of it.
--
-- ── A PARAGRAPH, NOT AN ITEM 1 — Ben, 2026-10-12 ─────────────────────────
-- The *Stell sicher* line was written as `1.` because it was drafted as the
-- head of a checklist (headphones, a place, the time). The other items went
-- when Ben wrote this one; a one-item ordered list is a promise of a second
-- item that never arrives, and `Markdown` renders it with a number and a
-- hanging indent either way. So it is a paragraph, in both exercises and both
-- locales.
--
-- ── NO CLAIM ABOUT AN OUTCOME, IN EITHER LOCALE ───────────────────────────
-- This is a music product, not a treatment. *Ins Einschlafen* names where a
-- piece leaves you and never a result Musie delivers; the body-scan copy says
-- where to put your attention and never what that will do to you. No
-- *Therapie*, no *Symptom*, no *hilft dir bei*. The checklist is in
-- LISTENING-EXERCISES.md §6 and it was applied to every line below.
--
-- ── ONE WRITE PER ROW, WHOLE VALUES ──────────────────────────────────────
-- Four columns in one `update` per (exercise, locale), each stating the whole
-- value, so the file is idempotent and safe applied twice — and so it does not
-- depend on what another branch's migration may have written first (rule 9).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── KLANGREISE · 12–15 Minuten ────────────────────────────────────────────
-- A guided listening piece with nothing to look at and nothing to hold. The
-- intro's job is to get the next ten minutes cleared before the music starts,
-- because that cannot be fixed once it has. (It asked for headphones too until
-- 2026-10-12, when Ben's own line replaced the checklist; the advice is now
-- nowhere in the run, which is his call to make and worth knowing.)
update public.exercise_i18n set
  intro_md = '## Mach es dir bequem

Stell sicher, dass die nächsten {minutes} Minuten keine Notifications oder anderen Ablenkungen an dich heran kommen.

Sag mir noch, wie du zuhörst — dann wähle ich die Aufnahme, die dazu passt.',
  listen_md = '## Lass die Klänge kommen, ohne sie zu deuten

Schließe deine Augen und atme ruhig. Wenn deine Aufmerksamkeit abwandert, bring sie zurück. Das gehört dazu und passiert.',
  reflect_md = '## Was ist dir im Ohr geblieben?

Schreib auf, was du magst. Ein Wort reicht.',
  reflect_placeholder = 'Welcher Klang ist dir im Ohr geblieben? Und wohin hat er dich mitgenommen?'
where exercise_id = 'sound-journey' and locale = 'de';

update public.exercise_i18n set
  intro_md = '## Make yourself comfortable

Make sure that for the next {minutes} minutes no notifications or other distractions can reach you.

Tell me how you are listening, and I will pick the recording that fits.',
  listen_md = '## Let the sounds come without explaining them

Close your eyes and breathe calmly. When your attention wanders, bring it back. That is part of it, and it happens.',
  reflect_md = '## What stayed with you?

Write down whatever you like. One word is enough.',
  reflect_placeholder = 'Which sound stayed with you? And where did it take you?'
where exercise_id = 'sound-journey' and locale = 'en';


-- ── BODYSCAN · 10–12 Minuten ──────────────────────────────────────────────
-- Guided attention through the body, over music. The intro deliberately does
-- NOT tell anybody to lie down: the posture control is directly below it, and
-- an instruction that contradicts the thing you are about to choose is worse
-- than no instruction.
--
-- ── THE REFLECTION ASKS WHAT, NOT WHERE — Ben, 2026-10-12 ────────────────
-- *Wo war es am deutlichsten?* presumed the answer: that something was felt
-- somewhere, and that the only thing left to report is the address. *Was hast
-- du gespürt?* takes nothing for granted and "nichts" is a valid answer to it,
-- which matters on a step whose whole purpose is that there is no wrong one.
--
-- WITH THE QUESTION MARK. Ben's note gives the new line without one; every
-- other interrogative headline in both catalogues carries it, and a question
-- set without it reads as a label for a field. The ß in *Schließe* is the same
-- call, made the same day.
update public.exercise_i18n set
  intro_md = '## Bevor es losgeht

Stell sicher, dass die nächsten {minutes} Minuten keine Notifications oder anderen Ablenkungen an dich heran kommen.',
  listen_md = '## Lass dich von Musie durch deinen Körper leiten

Schließe deine Augen und atme ruhig. Wenn deine Aufmerksamkeit abwandert, bring sie zurück. Das gehört dazu und passiert.',
  reflect_md = '## Was hast du gespürt?

Schreib auf, was du magst.',
  reflect_placeholder = 'An welcher Stelle hast du am meisten gespürt? Hat sich etwas verändert, während du zugehört hast?'
where exercise_id = 'body-scan-soundwalk' and locale = 'de';

update public.exercise_i18n set
  intro_md = '## Before we start

Make sure that for the next {minutes} minutes no notifications or other distractions can reach you.',
  listen_md = '## Let Musie guide you through your body

Close your eyes and breathe calmly. When your attention wanders, bring it back. That is part of it, and it happens.',
  reflect_md = '## What did you feel?

Write down whatever you like.',
  reflect_placeholder = 'Where did you feel the most? Did anything change while you listened?'
where exercise_id = 'body-scan-soundwalk' and locale = 'en';


-- ── THE TWO NUMBERS THE REAL AUDIO MADE WRONG — 2026-10-12 ───────────────
-- Both rows were given a timeframe and a listen gate on 2026-09-23, before
-- anybody had heard the recordings. Measured from the delivered files:
--
--   Bodyscan        182.857s = 3:03   against a claim of 10–12 minutes
--   Klangreise      573.858s = 9:34   against a claim of 12–15 minutes
--
-- ── THE GATE IS THE WHOLE RECORDING — Ben, 2026-10-12 ────────────────────
-- *"For bodyscan and sound journey, the minimal listening duration is exactly
-- as long as the track."* So `listen_gate_seconds` is the recording's own
-- length, to the second:
--
--   Bodyscan        182.857s → 183
--   Klangreise      573.858s → 574
--
-- A GUIDED EXERCISE IS NOT A SAMPLE OF ITSELF. The card exercises gate at 90
-- seconds of a three-minute piece because the listening is the point and the
-- track outlasts it; here the recording IS the exercise, start to finish, and
-- stopping two thirds of the way through is stopping before the end.
--
-- ── HOW IT OPENS, AND WHY THAT IS NOT A TRAP ──────────────────────────────
-- The step latches the gate on `floor(position) >= gate`, and the media clock
-- stops at 182.857 — which never floors to 183. What opens it is the `ended`
-- event: the step pins the position to the recording's stated duration when it
-- finishes, so the gate opens exactly as the last second plays out. That
-- behaviour is older than this feature and is what the cap at the track's own
-- length was always for; here it carries the whole weight.
--
-- ── AND THE TIMEFRAMES HAVE TO COVER IT ───────────────────────────────────
-- `db.content.db.test.ts` asserts `listen_gate_seconds < timeframe_min * 60`:
-- an exercise must not ask for more listening than its own card claims it
-- takes. 183 against a three-minute claim breaks that, and the claim is the
-- thing that is wrong — 183 seconds IS more than three minutes.
--
-- So the minimum is the recording rounded UP to the minute (4 and 10), which
-- is also the number the intro copy now quotes. The maximum keeps room for the
-- reflection, which has no fixed length and is why the column is a range.
update public.exercises set
  timeframe_min = 4, timeframe_max = 7, listen_gate_seconds = 183
where id = 'body-scan-soundwalk';

update public.exercises set
  timeframe_min = 10, timeframe_max = 14, listen_gate_seconds = 574
where id = 'sound-journey';


-- ── AND THEY BECOME STARTABLE ─────────────────────────────────────────────
-- `implemented` is what /exercises reads to decide between starting a run and
-- opening the *not built yet* lightbox. Both rows now have three steps' worth
-- of copy in two locales, a kind that gives them a three-stage run, and a
-- resolver that plays the unducked original until cuts exist — which is
-- a real exercise rather than a broken one, and is the state
-- `missing_cuts` reports on.
update public.exercises set implemented = true
where id in ('sound-journey', 'body-scan-soundwalk');
