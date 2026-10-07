# Deck card artwork — the print masters

One image per card of the Mindfulness Cards deck, named after its **card id**.
The id is the primary key in `public.cards` and the lower case of the code
printed on the card, so naming the file after it makes the wiring a lookup
rather than a decision.

**A file whose name is anything but a bare card id is ignored**, which is what
makes `mc-01_alt.png` safe to keep here. `deck-pdf.mjs` looks for exactly
`<card id><ext>` — not a prefix — so a superseded master can sit beside the one
in use without a chance of being printed instead of it. Keep an alternate only
while the choice between the two is still open; the folder is the print run's
input, not an archive.

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
| `mc-06.*` | MC-06 | Sehnsucht · Longing | `trk-05` | High Sierra Call — Roy Edwin Williams |
| `mc-07.*` | MC-07 | Dankbarkeit · Gratitude | `trk-04` | Bats and Rats — Ludvig Moulin |
| `mc-08.*` | MC-08 | Einsamkeit · Loneliness | `trk-02` | Wait for It — Jon Björk |
| `mc-09.*` | MC-09 | Hoffnung · Hope | `trk-01` | Little Yellow Petals — Rachel Sandy |

**The last column is `tracks.licence_ref`, and it is the only place the deck
keeps the name you would recognise.** `tracks.id` is opaque on purpose —
`trk-01`, never `morgenlicht` — because `exercise_tracks.track_id` is readable
by the client and a readable id would hand a listener the answer before the
reveal. `title` and `artist` are withheld by column grant for the same reason.
So when a recording needs to be matched to a card by a human, this table is the
bridge. Only four recordings are cleared Epidemic Sound tracks, and since
2026-10-02 the deck plays nothing else: **every card now points at a track with
a file.** No row in this table says "no file yet" any more, which is the point
of the re-cut — a card that drew silence could not be listened to, and the
listening is the exercise.

**So four recordings cover nine cards, and five tracks are paired with
nothing.** `trk-02` — Wait for It — plays for Trauer, Ruhe and Einsamkeit;
`trk-01`, `trk-04` and `trk-05` each play for two. The schema allows it:
`exercise_tracks` is unique on (exercise, card), not on track, which is the
whole reason a recording is stored once and pointed at rather than copied.
`trk-03` and `trk-06`–`trk-09` are now paired with no card at all. None of
them has a file either, so nothing is lost today; they are five rows waiting
for a recording and a card to want it, and they carry placeholder titles that
were never real recordings.

**A feeling and its recording are no longer matched, and that is the cost.**
The first five pairs were cut by hand against the mood (`trk-05` High Sierra
Call for Wut, and so on, logged in `apps/web/OPEN-QUESTIONS.md`). The last four
are cut against *availability* — Sehnsucht and Wut now share one recording
because there were four files and nine cards, not because longing and anger
sound alike. When the missing recordings land, re-cut this table against the
mood and `pnpm deck:migration` lands it.

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

**The whole front is yours.** Between 2026-09-24 and 2026-10-02 a QR code was
printed in the bottom-left corner as well as on the back, so a card lying on a
table could be scanned without being turned over. Ben removed it on
2026-10-02: it could be made small and it could be made pretty, but it could
not be made to stop being a machine's target sitting on somebody's
illustration. **Nothing is reserved on the front any more** — no corner, no
panel, no safe square. Draw the whole card.

What that costs is logged in `apps/web/OPEN-QUESTIONS.md`: the only code is now
on the back, so a card has to be turned over to be scanned, and turning it over
is the move that gives away which card it is before the reveal.

`.png` for flat colour and illustration, `.jpg` for a photograph, `.webp` if
that is what the source is. Lossless is fine here: these never reach a browser.

A portrait deck is still one flag away — `pnpm --filter web deck:pdf -- --card
63x88` — and everything below holds either way.

## What happens when a file lands

`pnpm deck:pdf` finds it by card id and prints the artwork **instead of** the
feeling word — Ben's call, 2026-09-24: the picture is the card, and a word set
over it is the designer arguing with the illustrator. Since 2026-10-02 nothing
goes over it at all: the front is the picture, edge to edge, and the back
carries the code.

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
