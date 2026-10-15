-- ═══════════════════════════════════════════════════════════════════════════
-- A BETTER *WARUM?* FOR ACHTSAMKEIT — Ben, 2026-10-15
--
-- `20261015140000` gave the one explaining goal card two sentences about how
-- mindfulness grows with practice. True, and about the PRACTICE rather than
-- about the reader: it answered *what is mindfulness like* where the question
-- the user testing actually heard was *was soll das bringen?*
--
-- Ben's rewrite, sketched as two openings for me to finish:
--
--   "Warum? Mehr Achtsamkeit hilft dir in stressigen Situationen… .
--    Meine Übungen helfen dir dabei…"
--
-- Both halves are his and both are the correction. The first names a MOMENT
-- the reader already recognises — the stressful one — instead of describing a
-- quality. The second is Musie offering to help with it.
--
-- ── A NEW FILE, BECAUSE THE LAST ONE IS APPLIED (RULE 4) ──────────────────
-- `20261015140000` is in `supabase_migrations.schema_migrations` on the local
-- stack and will be on hosted at the next `pnpm db:sync`. Supabase records an
-- applied migration BY TIMESTAMP, so editing that file would change nothing
-- on any database that already ran it and would be skipped in silence — the
-- exact drift rule 4 exists to prevent. Two sentences, one new migration.
--
-- ── "MEINE ÜBUNGEN" — MUSIE SPEAKS AS *ICH*, AND THAT IS NOT NEW ──────────
-- Ben's sketch puts the second sentence in the first person, and the product
-- already does this: `free-rein`'s own description reads *"eine Höranleitung
-- VON MIR"* (`20260923150000`). So the voice is established content practice
-- rather than something introduced here, and the card is the right place for
-- it — it is the one card that argues rather than labels, and an argument is
-- made by somebody.
--
-- docs/GERMAN-UI-WRITING.md: du, lower case, sentence case. No em dashes and
-- no *nicht X, sondern Y* — the patterns Ben asked to keep out.
--
-- THE ENGLISH FOLLOWS THE GERMAN, including the first person, because the two
-- locales cannot have Musie speaking in one and not the other. *what you need
-- right now* deliberately echoes the sheet's own question above the card,
-- *What do you need right now?* — the answer names the question back.
-- ═══════════════════════════════════════════════════════════════════════════

update public.goal_i18n set
  why = 'Mehr Achtsamkeit hilft dir, in stressigen Situationen ruhig zu bleiben '
        || 'und zu merken, was du gerade brauchst. '
        || 'Meine Übungen helfen dir dabei, das mit Musik einzuüben.'
where goal_id = 'mindfulness' and locale = 'de';

update public.goal_i18n set
  why = 'More mindfulness helps you stay calm in stressful moments and notice '
        || 'what you need right now. '
        || 'My exercises help you practise that with music.'
where goal_id = 'mindfulness' and locale = 'en';

-- NOTHING ELSE MOVES. The other three goals still carry no `why` at all, which
-- is data and not a gap — `20261015140000` §1 is the argument, and
-- `public.missing_translations` stays quiet about all three because the column
-- is null in BOTH locales for each of them.
