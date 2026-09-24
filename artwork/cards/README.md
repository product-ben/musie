# Deck card artwork — the print masters

One image per card of the Mindfulness Cards deck, named after its **card id**.
The id is the primary key in `public.cards` and the lower case of the code
printed on the card, so naming the file after it makes the wiring a lookup
rather than a decision.

**This folder is outside `apps/web/public/` on purpose.** Everything under
`public/` is copied into the web build verbatim, and a print master is the one
file that must never be: it is landscape, 300 dpi, and several megabytes that no
browser should ever be offered. The screen gets a small `.webp` later; the
press gets these.

## The nine

| file | code | feeling | plays | the recording you know it as |
|---|---|---|---|---|
| `mc-01.*` | MC-01 | Freude · Joy | `trk-04` | Bats and Rats — Ludvig Moulin |
| `mc-02.*` | MC-02 | Trauer · Sadness | `trk-02` | Wait for It — Jon Björk |
| `mc-03.*` | MC-03 | Wut · Anger | `trk-05` | High Sierra Call — Roy Edwin Williams |
| `mc-04.*` | MC-04 | Angst · Fear | `trk-01` | Little Yellow Petals — Rachel Sandy |
| `mc-05.*` | MC-05 | Ruhe · Calm | `trk-02` | Wait for It — Jon Björk |
| `mc-06.*` | MC-06 | Sehnsucht · Longing | `trk-06` | — no file yet |
| `mc-07.*` | MC-07 | Dankbarkeit · Gratitude | `trk-07` | — no file yet |
| `mc-08.*` | MC-08 | Einsamkeit · Loneliness | `trk-08` | — no file yet |
| `mc-09.*` | MC-09 | Hoffnung · Hope | `trk-09` | — no file yet |

**The last column is `tracks.licence_ref`, and it is the only place the deck
keeps the name you would recognise.** `tracks.id` is opaque on purpose —
`trk-01`, never `morgenlicht` — because `exercise_tracks.track_id` is readable
by the client and a readable id would hand a listener the answer before the
reveal. `title` and `artist` are withheld by column grant for the same reason.
So when a recording needs to be matched to a card by a human, this table is the
bridge. Only four are cleared Epidemic Sound tracks; the five with no file
carry placeholder titles in the database that were never real recordings.

*"No file yet" means `tracks.src` is null — the recording has not landed. It
has nothing to do with the artwork; a silent card still prints.*

**Two recordings do double duty and one is unused.** `trk-02` — Wait for It —
plays for both Trauer and Ruhe, which the schema allows: `exercise_tracks` is
unique on (exercise, card), not on track, which is the whole reason the
recording is stored once and pointed at. And `trk-03` is now paired with no
card at all. It has no file either, so nothing is lost today; it is a row
waiting for a recording and a card to want it.

**The card-to-track mapping is not set here.** It lives in
`supabase/content/deck.json` under each card's `plays`, one entry per exercise,
because the same card plays a different file in a different exercise. Both
`mindfulness-cards` and `free-rein` currently draw this deck and play the same
nine recordings. Nothing about a filename changes that mapping.

## The file

**Landscape, 94 × 69 mm proportions, at least 1110 × 815 px.** That is the trim
(88 × 63 mm) plus 3 mm of bleed on every side, at 300 dpi. 1665 × 1240 is better
if the source allows it.

**Draw to the bleed, not to the trim.** The outer 3 mm is cut off, and the cut
drifts. Anything that must survive — a signature, an edge someone meant to be
an edge — belongs at least 3 mm inside the trim line, so 6 mm in from the file
edge.

**Keep the bottom-left corner clear.** Since 2026-09-24 the card's own QR code
is printed there as well as on the back, so a card lying on a table can be
scanned without being turned over — and turning it over is the one move that
gives away which card it is before the reveal. The square is about 16 mm, set
4 mm inside the trim, so with its panel it takes the lower-left **22 × 22 mm of
the trimmed card**.

It sits on an opaque sand panel, because a QR whose quiet zone lets the picture
through is unreadable on exactly the card whose artwork happens to be dark. So
nothing behind it shows: what a busy corner costs is the composition, not the
scan. An illustration whose subject lives down there will have it covered.

`.png` for flat colour and illustration, `.jpg` for a photograph, `.webp` if
that is what the source is. Lossless is fine here: these never reach a browser.

A portrait deck is still one flag away — `pnpm --filter web deck:pdf -- --card
63x88` — and everything below holds either way.

## What happens when a file lands

`pnpm deck:pdf` finds it by card id and prints the artwork **instead of** the
feeling word — Ben's call, 2026-09-24: the picture is the card, and a word set
over it is the designer arguing with the illustrator. The corner QR is the one
thing that does go over it, and it is there because it is a machine's target
rather than a graphic element.

Nothing else needs doing. No column, no migration:

- the print run reads this folder directly;
- a card with no master here still prints, with its feeling set in type, so a
  half-drawn deck comes out as pictures and words rather than pictures and
  blanks;
- `cards.image_url` stays what it is — a **web** path, for the day a screen
  renders card artwork. Nothing in the app does today.

## The alt text, when the web copies come

`card_i18n.image_alt` is null in both locales for all nine. That was honest
while there was no artwork — the seed says as much, and inventing a description
of a picture nobody had drawn would have been authoring rather than seeding.

Once these exist it stops being honest. An artwork-only card with no alt text
gives a screen-reader user silence where the card should be, and the feeling is
what the alt text should say. Write both locales into `deck.json` and
`pnpm deck:migration` lands them.
