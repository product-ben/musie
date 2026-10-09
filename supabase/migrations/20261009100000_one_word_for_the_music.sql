-- ═══════════════════════════════════════════════════════════════════════════
-- ONE WORD FOR THE MUSIC, IN THE CONTENT TOO — Ben, 2026-10-09
--
-- The chrome catalogues carried four German words for one object — Stück ×5,
-- Track ×5, Musik ×7, Aufnahme ×2 — and the same commit puts all of them on
-- **die Musik**. Two content strings were saying the fifth and sixth: the
-- Mindfulness-Karten description still read `Höre das Stück`, and its English
-- sibling `Listen to the piece behind it`.
--
-- Leaving them would have put the two vocabularies a sentence apart on one
-- screen: the exercise card says *Stück*, the transport under it says *Musik*.
--
-- ── WHY THIS IS A MIGRATION AND NOT AN EDIT ────────────────────────────────
-- CLAUDE.md rule 4. `20260929100000_therapeutic_copy_pass.sql` (the live German)
-- and `20260923150000_exercise_library_freie_bahn.sql` (the live English) are
-- both applied; Supabase records an applied migration by timestamp and skips a
-- changed file in silence, so editing either would change nothing on the remote
-- while every local check reported success.
--
-- ── WHAT IS NOT TOUCHED ────────────────────────────────────────────────────
-- `breathing-score` already says *Musik* / *music* in both locales
-- (`20260923150000:118`, `:124`), and `free-rein` names the object not at all.
-- The `reflect_placeholder` pair added by `20261007140000` already says *Musik*
-- / *music*. So this is two fields on one row pair, and nothing else.
--
-- The board's A4 — "Metrum out, and the hand placement into intro_md" — is a
-- separate action on `breathing-score` and is NOT in this iteration's scope.
--
-- ── THE CONTENT IS STILL PROVISIONAL ───────────────────────────────────────
-- CLAUDE.md rule 6: these strings belong to the Mindfulness Cards spreadsheet
-- and will be overwritten wholesale when it lands. This migration does not
-- change that; it keeps the two vocabularies from disagreeing until it does.
-- ═══════════════════════════════════════════════════════════════════════════

-- `Höre das Stück.` → `Höre die Musik.` Nothing else in the sentence moves.
update public.exercise_i18n set
  description = 'Wähle 5 zufällige Karten. Scanne eine, die dich spontan anspricht. Höre die Musik. Wenn du magst, denke dabei über die Frage nach.'
where exercise_id = 'mindfulness-cards' and locale = 'de';

-- `the piece behind it` → `the music behind it`.
update public.exercise_i18n set
  description = 'Pick 5 random cards. Scan the one that speaks to you. Listen to the music behind it. If you like, think about the question while you listen.'
where exercise_id = 'mindfulness-cards' and locale = 'en';
