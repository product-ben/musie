-- ═══════════════════════════════════════════════════════════════════════════
-- THE PHONE'S OWN CAMERA APP, SAID IN THE INSTRUCTIONS INSTEAD OF IN THE FRAME
--
-- Ben, 2026-09-24. The scan step's frame used to carry two sentences of its
-- own, in the empty square where the camera goes:
--
--   session.scan.reader     "Scan the QR code on your card with your phone's
--                            camera app — it opens Musie at that card."
--   session.scan.readerNote "Or use the camera on this device — it reads the
--                            same code."
--
-- The redesign empties that square down to two buttons, and the second
-- sentence is simply what the primary button now says ("Karte scannen").
--
-- ── WHY THE FIRST ONE MOVES HERE RATHER THAN GOING ────────────────────────
-- It is the only place the product ever mentioned the COMMON way in. A code
-- printed on a card carries `<origin>/s/MC-01`, so a phone's own camera app
-- opens Musie at that card without Musie being open first — that is what E.0
-- bought, and it is the path most people holding a printed card will take.
-- Losing the sentence would not break anything; it would quietly stop teaching
-- the fastest route and leave the in-app camera looking like the only one.
--
-- So it goes where the rest of "how to do this step" already lives: the
-- exercise's own `scan_md`, as a clause on the numbered step that already says
-- to scan the code. Chrome copy in `apps/web/src/i18n/*` is ours and permanent
-- (rule 6); this is CONTENT, and instructions for a step belong with the other
-- instructions for that step, not in the frame's furniture.
--
-- ── IT IS PROVISIONAL, AND KNOWINGLY SO ──────────────────────────────────
-- `scan_md` is the Mindfulness Cards spreadsheet's column, and the seed says
-- its copy will be overwritten when the real text arrives. This sentence is
-- therefore a sentence Ben now owns and has to keep: if the spreadsheet lands
-- without it, the product stops mentioning the phone's camera app anywhere at
-- all. Logged in `apps/web/OPEN-QUESTIONS.md`.
--
-- ── RULE 4 ────────────────────────────────────────────────────────────────
-- A new migration with `update`, not an edit to 20260923120000 or
-- 20260923150000 where these strings were last written. Both are applied on
-- the hosted project; editing an applied file changes nothing there and is
-- skipped in silence.
--
-- ── THE TWO EXERCISES THAT GET IT ─────────────────────────────────────────
-- `mindfulness-cards` and `free-rein` — the two rows with `needs_cards = true`
-- and therefore the only two whose run ever reaches the scan step. The other
-- three carry no `scan_md` at all and are untouched.
--
-- Each `update` rewrites the WHOLE value rather than appending to it, so this
-- file states the text it leaves behind and re-running it is a no-op rather
-- than a second clause.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Achtsame Pause · mindfulness-cards ─────────────────────────────────────
-- The clause lands on step 2, which already said "scan the code": it now says
-- WITH WHAT, and names both ways in the order people should try them. A
-- Gedankenstrich, not an em dash (§7 of docs/GERMAN-UI-WRITING.md).
update public.exercise_i18n set scan_md = $md$## Wähle eine Karte aus

1. Wähle das Bild aus, das dich gerade am meisten anspricht, aus welchen Gründen auch immer. Lege die anderen Karten außer Sichtweite.
2. Scanne den QR-Code deiner ausgewählten Karte – mit der Kamera-App deines Handys, die Musie direkt bei dieser Karte öffnet, oder hier in Musie.$md$
where exercise_id = 'mindfulness-cards' and locale = 'de';

update public.exercise_i18n set scan_md = $md$## Choose a card

1. Pick the image that speaks to you most right now, for whatever reason. Put the other cards out of sight.
2. Scan the QR code on the card you picked — with your phone's camera app, which opens Musie at that card, or here in Musie.$md$
where exercise_id = 'mindfulness-cards' and locale = 'en';


-- ── Freie Bahn · free-rein ─────────────────────────────────────────────────
-- Bullets, not numbers, because Ben wrote them that way and the renderer draws
-- both as paragraphs — 20260923150000's own note on not baking a presentation
-- decision into the content.
update public.exercise_i18n set scan_md = $md$## Wähle eine Karte aus

- Ziehe eine zufällige Karte vom Stapel. Nimm dir einen Augenblick Zeit, um das Bild auf dich wirken zu lassen. Vielleicht kannst du deine Stimmung in ihr wiederfinden, vielleicht wirst du die Darstellung aber auch eher distanziert betrachten. Alles ist in Ordnung.
- Wenn du soweit bist, scanne den QR-Code – mit der Kamera-App deines Handys, die Musie direkt bei dieser Karte öffnet, oder hier in Musie.$md$
where exercise_id = 'free-rein' and locale = 'de';

update public.exercise_i18n set scan_md = $md$## Choose a card

- Draw a random card from the deck. Take a moment to let the image work on you. Maybe you will find your own mood in it, maybe you will look at it from more of a distance. Either is fine.
- When you are ready, scan the QR code — with your phone's camera app, which opens Musie at that card, or here in Musie.$md$
where exercise_id = 'free-rein' and locale = 'en';
