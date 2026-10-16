-- ═══════════════════════════════════════════════════════════════════════════
-- MC-10 EXISTS IN THE DECK AND CANNOT BE DRAWN.
--
-- It was created through /maintenance on hosted and has NO `card_i18n` row in
-- either locale. `toCard` in apps/web/src/lib/content.ts returns `[]` when
-- `pickTranslation` finds no row, so the card is dropped from every read: it
-- is in `cards`, it is on the grid, it is in deck.json — and the app has
-- never once shown it.
--
-- `20261015100000` saw this and said plainly why it could not fix it:
--
--     "MC-10 … has NO card_i18n rows in either locale, so toCard drops it and
--      the card is unreachable in the app. The projection below cannot help:
--      it updates rows, and there are none to update. MC-10 needs a `feeling`
--      in both locales to exist at all — that is one word, and it is a
--      product decision rather than a translation gap."
--
-- Ben made that decision on 2026-10-16: **`test`, in both languages, until
-- the real word is written.** This file is that decision, and nothing more.
--
-- ── WHY A PLACEHOLDER IS NOT RULE 6's PROBLEM HERE ────────────────────────
-- Rule 6 forbids leaving a placeholder and flagging it — for CHROME, which is
-- ours and permanent. This is CONTENT, which the Mindfulness Cards
-- spreadsheet owns and which the seed already calls provisional.
--
-- And `feeling` is READ BY NOTHING. `Card.feeling` is carried on the type and
-- rendered on no screen; the only reference outside this table is an
-- assertion in deck.test.ts. `20261014100000` says the same from the other
-- side: "Nothing writes it and no screen reads it. The nine existing words
-- are inert." So the word is invisible, and what the row actually buys is
-- the card's EXISTENCE.
--
-- ── WHY A MIGRATION, WHEN RULE 4.1 SAYS CONTENT DOES NOT TRAVEL THAT WAY ──
-- Because there is no other way to write it. `admin_write` knows four
-- entities — card, track, artwork, cell — and none of them touches
-- `card_i18n`, so /maintenance cannot type this word and neither can the
-- Edge Function behind it.
--
-- Rule 4.1's danger is a GENERATED WHOLE-DECK migration, which upserts every
-- row and deletes what the file no longer has, putting a file's version back
-- over an operator's edit. This is the opposite shape, and it is the shape
-- `20261015100000` already used for the nine alt descriptions: narrow,
-- idempotent, and it only ever FILLS A HOLE. Run it twice and the second run
-- changes nothing; type a real word in its place and this can never overwrite
-- it, because the row will no longer be missing.
--
-- ── IT IS GUARDED ON THE CARD EXISTING ────────────────────────────────────
-- MC-10 is on hosted and is NOT on a freshly reset local stack, which stops
-- at the nine the factory import states. An unguarded insert would therefore
-- fail on a foreign key locally while succeeding on hosted — the drift rule 4
-- warns about, arriving through a file meant to repair drift. The `select …
-- from public.cards` is what makes it a no-op where the card is absent.
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.card_i18n (card_id, locale, feeling, image_alt)
select c.id, l.locale, 'test', null
  from public.cards c
 cross join (values ('de'), ('en')) as l(locale)
 where c.id = 'mc-10'
   and not exists (
     select 1 from public.card_i18n t
      where t.card_id = c.id and t.locale = l.locale
   );

-- ── AND ITS DESCRIPTION, WHICH IT GETS FOR FREE ───────────────────────────
-- `card_i18n.image_alt` is DERIVED from the grid since 2026-10-15: the
-- projection reads the artwork the cell actually holds. MC-10's cell holds
-- MC-06's picture, so the moment the row above exists the description is
-- already written and only needs projecting into it.
--
-- Called HERE rather than left to the next admin write, which is
-- `20261015100000` §3's own reasoning: without it the text sits in
-- artwork_i18n and the app keeps reading a null until somebody happens to
-- edit the deck. A card that can finally be drawn should not be drawn
-- without its alt text.
select public.project_deck();
