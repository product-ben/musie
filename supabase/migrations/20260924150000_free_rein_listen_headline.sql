-- ═══════════════════════════════════════════════════════════════════════════
-- THE LISTEN STEP OF FREIE BAHN SAYS TO LOOK AT THE CARD, TOO
--
-- Ben, 2026-09-24. `## Nimm die Klänge wahr` becomes
-- `## Nimm die Klänge wahr und sieh die Karte an`.
--
-- ── WHY ───────────────────────────────────────────────────────────────────
-- The drawn card does not stop mattering when the recording starts. Achtsame
-- Pause already says both halves in its own listen headline — "Höre bewusst
-- zu, und schau dir die Karte an" (20260923120000) — and Freie Bahn's said
-- only the sounds, so the card it just told you to draw quietly dropped out of
-- the instruction at the moment you are meant to be sitting with it.
--
-- The two exercises stay deliberately unlike each other in wording: one listens
-- CLOSELY to a card it chose, the other NOTICES what arrives over a card it
-- drew at random. Same two halves, each in its own register.
--
-- ── RULE 4 ────────────────────────────────────────────────────────────────
-- A new migration with `update`, not an edit to 20260923150000 where this
-- string was written. That file is applied on the hosted project; editing an
-- applied file changes nothing there and is skipped in silence.
--
-- The `update` rewrites the WHOLE value, body included, so this file states the
-- text it leaves behind and re-running it is a no-op. The body is unchanged.
--
-- ── BOTH LOCALES ──────────────────────────────────────────────────────────
-- Ben asked for the German. The English is the same sentence in the other
-- language, not a separate decision, so it moves with it — leaving `en` at
-- "Notice the sounds" would have the two locales instructing different steps.
--
-- Provisional either way: `listen_md` is the Mindfulness Cards spreadsheet's
-- column and the seed says its copy will be overwritten.
-- ═══════════════════════════════════════════════════════════════════════════

-- Sentence case, no comma before `und` (permitted, and the shorter headline
-- reads better without it), Gedankenstrich rules not engaged — §2 and §7 of
-- docs/GERMAN-UI-WRITING.md.
update public.exercise_i18n set listen_md = $md$## Nimm die Klänge wahr und sieh die Karte an

Lass dich von ihnen mitnehmen und Gedanken kommen und gehen.$md$
where exercise_id = 'free-rein' and locale = 'de';

update public.exercise_i18n set listen_md = $md$## Notice the sounds and look at your card

Let them carry you, and let thoughts come and go.$md$
where exercise_id = 'free-rein' and locale = 'en';
