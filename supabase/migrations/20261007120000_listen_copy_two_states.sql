-- ═══════════════════════════════════════════════════════════════════════════
-- THE LISTEN STEP'S COPY, NOW READ IN TWO ORDERS
--
-- The listen step gained a full-screen listening view, and the two sentences
-- in `listen_md` do different jobs in its two states:
--
--   the STAGE shows the instruction alone. The question is withheld there on
--     purpose: on the stage you have not started listening yet, and a question
--     about what you are hearing has nothing to be asked about.
--   the SHEET leads with the QUESTION and carries the instruction under it.
--     By then the track is playing and the question is the thing to hold.
--
-- NOTHING STRUCTURAL CHANGES HERE. `listen_md` is still one blob of `##`
-- heading plus paragraph, and which of the two is drawn where is the screen's
-- decision, in `apps/web/src/components/SessionListen.tsx`. What this
-- migration does is REWORD the instruction so it survives being read in both
-- places — Ben, 2026-10-07.
--
-- ── WHY THE WORDS CHANGED ─────────────────────────────────────────────────
-- "schau dir die Karte an" was written to sit above a question that was on
-- the same screen. Alone on the stage it is the whole instruction, and it was
-- too light to carry that on its own: `dabei` ties looking to listening rather
-- than leaving them as two separate acts, and `intensiv` asks for the
-- attention the exercise is actually for.
--
-- ── BOTH EXERCISES THAT HAVE LISTEN COPY ──────────────────────────────────
-- `mindfulness-cards` and `free-rein`. The other three — breathing-score,
-- sound-journey, body-scan-soundwalk — have an EMPTY `listen_md` and are not
-- touched: they are not built yet, and writing copy for a step nobody can
-- reach would be inventing content rather than editing it.
--
-- ── STILL PROVISIONAL, LIKE ALL CONTENT ───────────────────────────────────
-- The Mindfulness Cards spreadsheet owns this copy and will overwrite it
-- (CLAUDE.md 6, and the header of `20260918150600_content_seed.sql`). This is
-- held to docs/GERMAN-UI-WRITING.md so that nothing placeholder-shaped ships,
-- not because it is final.
--
-- ── A NEW FILE, NOT AN EDIT ───────────────────────────────────────────────
-- Rule 4. `20260929100000_therapeutic_copy_pass.sql` is applied and pushed;
-- editing it would change nothing on the remote and be skipped in silence.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Achtsame Pause · Mindful Break ────────────────────────────────────────
-- The German is Ben's own wording, verbatim. The comma before `und` is his
-- and is the one the previous version already carried — German permits it
-- between two main clauses, and it is the pause the sentence is read with.
update public.exercise_i18n
set listen_md = '## Höre bewusst zu, und schau dir dabei die Karte intensiv an

Welches Bild entsteht vor deinem inneren Auge?'
where exercise_id = 'mindfulness-cards' and locale = 'de';

-- `intently`, not `closely`, for `intensiv`: `closely` is already spent on
-- `Höre bewusst zu` in the same sentence, and saying it twice would make the
-- second half read as a repetition rather than as a second instruction.
update public.exercise_i18n
set listen_md = '## Listen closely, and look at your card intently

What picture forms in your mind’s eye?'
where exercise_id = 'mindfulness-cards' and locale = 'en';

-- ── Freie Bahn · Free Rein ────────────────────────────────────────────────
-- The same intensification, in this exercise's own voice. Its second sentence
-- is left alone: it is already the thing to hold while the track plays, which
-- is exactly what the sheet promotes it to.
update public.exercise_i18n
set listen_md = '## Nimm die Klänge wahr und sieh dir dabei die Karte intensiv an

Lass dich von ihnen mitnehmen. Lass Gedanken kommen und gehen.'
where exercise_id = 'free-rein' and locale = 'de';

update public.exercise_i18n
set listen_md = '## Notice the sounds and look at your card intently

Let them take you. Let thoughts come and go.'
where exercise_id = 'free-rein' and locale = 'en';
