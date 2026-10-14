-- ═══════════════════════════════════════════════════════════════════════════
-- ACHTSAME PAUSE LAYS OUT FIVE CARDS, AND THE [X] PLACEHOLDER GOES
--
-- `intro_md` has said *Leg die vier Karten mit dem Symbol [X] vor dich* since
-- 20260923120000. Two things are wrong with that sentence and both are Ben's
-- answers of 2026-10-13, asked before this was written:
--
--   THE COUNT. The library card says *Wähle 5 zufällige Karten*
--     (20260929100000, `description`), the digital-cards brief says *5 Karten
--     ziehen*, and `cardsDealt` in the app deals five. The intro said four.
--     Nothing could compare them, because the number lived in prose in two
--     tables — which is the argument for `exercises.cards_dealt` that
--     `DIGITAL-CARDS.md` section 9 makes and that this file does not land
--     (see the app's `lib/digitalCards.ts` for why not, and for what has to
--     happen first).
--
--   THE SYMBOL. `[X]` is a placeholder for a mark on the printed cards that
--     nobody has chosen, and `cards` carries no symbol column, so it renders
--     literally on screen today. **Struck rather than waited for**: with nine
--     cards in the set, "draw five" needs no symbol, and keeping the sentence
--     would hang one line of copy on the deck's print data — which is blocked
--     on the domain (BUILD-PLAN, *Still blocked*).
--
-- ── WHY `zufällig` AND NOT `beliebig` ─────────────────────────────────────
-- The CHOOSING is step 2's job. A reader told to lay out five cards *of their
-- choice* has already done step 2 without noticing, and the exercise's whole
-- shape is five drawn blind, one chosen deliberately. `zufällig` also makes
-- this the same instruction the digital deal performs, so the analogue and the
-- digital path say one thing rather than two.
--
-- ── RULE 4 ────────────────────────────────────────────────────────────────
-- A new migration with `update`, not an edit to 20260923120000 where the
-- string was written. That file is applied on hosted; editing it changes
-- nothing there and is skipped in silence.
--
-- Each statement rewrites the WHOLE value rather than patching it, so this
-- file states the text it leaves behind and re-running it is a no-op.
--
-- ── WHY ONLY ACHTSAME PAUSE ───────────────────────────────────────────────
-- Freie Bahn's `intro_md` is *Lege den Stapel Karten verdeckt vor dich*, which
-- is true of the paper deck and names no count and no symbol. It is hidden in
-- digital mode like every intro body (section 6) and needs no repair.
-- ═══════════════════════════════════════════════════════════════════════════

update public.exercise_i18n set intro_md = $md$## So legen wir los

1. Zieh fünf zufällige Karten und leg sie vor dich.
2. Lass die Bilder einen Moment auf dich wirken.$md$
where exercise_id = 'mindfulness-cards' and locale = 'de';

update public.exercise_i18n set intro_md = $md$## Here is how we start

1. Draw five random cards and lay them out in front of you.
2. Let the images settle for a moment.$md$
where exercise_id = 'mindfulness-cards' and locale = 'en';
