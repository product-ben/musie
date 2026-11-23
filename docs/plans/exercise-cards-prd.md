# Übungskarten mit QR-Code — PRD, as built

The full PRD, with its sketches and the reasons for each decision, is the
artifact <https://claude.ai/artifact/1RJSQu6PnxUff5shXxULpM> (Ben, 20.–23.11.2026).
The card designs are the Figma file „Musie · Druckkarten“
(<https://www.figma.com/design/H6VLXPyr7f1nfsyW56grDa>). This file is the
repository's copy of what was decided, so a later session does not have to
re-decide it. The log entry of 2026-11-23 in `apps/web/OPEN-QUESTIONS.md` says
what was built and what is open.

## The feature

Every implemented exercise gets a printed card whose QR code starts it.
`https://musie.org/s/EX-02` opens Freie Bahn on its intro. A deck card
(`…/s/MC-04`) starts Freie Bahn with that card. A dialog appears only when
something is already running.

## Decisions

| | Question | Answer |
|---|---|---|
| D1 | What does an exercise card's QR open? | The exercise, at once, on its intro. No page in between. |
| D2 | What does a deck card's QR open? | Always Freie Bahn with that card. The intro shows the card's picture; „Weiter“ skips the scan step and goes to listening. |
| D3 | And when something is running? | After a scan, always the dialog — even for the same exercise, even while a card exercise waits on its scan step. So the scan step's copy names only the scanner in Musie (A9). |
| D4 | What is in the QR? | `https://<address>/s/EX-01`. New column `exercises.code`, assigned once, never reused. |
| D5 | Where is the mode chosen? | On the intro, „Was brauchst du gerade?“, as a SegmentedControl in the slot of the two existing questions. **No new layout** (Ben). |
| D6 | When is it asked? | Only when the run was started from a printed card. From the library the goal is already chosen. |
| D7 | For which exercises? | Freie Bahn and Achtsame Pause — built as `kind = 'card_based'`, no column (V1). |
| D8 | Which answers? | The exercise's goals from the goal mapping, in the goal sheet's order. Fewer than two: no question. |
| D9 | What does the answer do? | It is the session's goal; `goals.music_mode` and `sessions_card_plays()` pick the card's piece. |
| D10 | What is preselected? | The goal last chosen in the library if the exercise has it, else the first. |
| D11 | When is a scanned deck card written? | On „Weiter“, after the goal, so the database picks the piece of the final goal. Until then the intro's address carries it (V2 not taken). |
| D12 | Goal of an exercise without the question (e.g. Klangreise by QR)? | Same rule as D10. |
| D13 | Which dialog answer is primary? | „{neu} starten“ (ends the running one). Secondary: „{laufend} fortsetzen“. Title: „Neue Übung starten?“. |
| D14 | Also in the library? | Yes, one dialog. Pressing the running exercise in the library still simply continues it (V4 not taken). |
| D15 | What does closing (X) do? | In the library: closes. After a scan: like „fortsetzen“. |
| D16 | Where is the design, what prints? | Figma is the design; `pnpm deck:pdf` prints, from the database. |
| D17 | Languages? | Exercise cards in DE and EN, two sets. The deck stays bilingual. |
| D18 | What is on an exercise card? | Front: the exercise's picture 16:9 across the width, name and duration below. Back: description, QR + code + „Scanne und leg los“ bottom left, wordmark bottom right. 88 × 63 mm, 3 mm bleed. A description over four lines is cut to its first sentence. |
| D19 | Which exercises get a card? | The seven implemented ones. EX-03 is reserved for Atementspannung. |
| D20 | Printed address? | `musie.org` (Ben, 23.11.). |
| D23 | After a deck card: the cards switch and the stack sentence? | Not shown — the card is already drawn. |
| V3 | Where is the start path kept? | In the intro's address (`?via=…`) and as `entry` on PostHog `session_started`. No column. |
| V5 | Leftovers | `exercise_tracks` and `exercises.needs_cards` dropped. `grid_cells.track_id` / `artwork_id` stay: /maintenance shows parked items with them. |

## Codes

| Code | Exercise |
|---|---|
| EX-01 | Achtsame Pause |
| EX-02 | Freie Bahn |
| EX-03 | Atementspannung (reserved, no card) |
| EX-04 | Klangreise |
| EX-05 | Bodyscan |
| EX-06 | Kalimba |
| EX-07 | Marimba |
| EX-08 | Harfe |

## Out of scope

- A mode question for the instruments (D21) — open.
- A card per mode in the link (D22) — not needed, the intro asks.
