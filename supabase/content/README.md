# The deck

`deck.json` is the Mindfulness Cards deck: nine cards, their codes, their
feelings in both locales, and which recording each one plays in each exercise.
It is the **only** place the deck is written by hand. Everything else about the
deck is generated from it — the migration that lands it in the database, and
the PDF that goes to a printer.

## The loop

```
edit deck.json
  ↓
pnpm deck:migration     writes supabase/migrations/<stamp>_deck_<name>.sql
  ↓
supabase db reset       re-applies every migration, the new one last
pnpm test:db            deck.db.test.ts proves the database matches deck.json
  ↓
supabase db push        sends it to the hosted project
  ↓
pnpm deck:pdf           the paper deck, once the copy is settled
```

Nothing in that list happens on its own. The generator writes a file and stops;
`pnpm check` never touches the database (CLAUDE.md rule 8) and neither does it
run the generator.

## What a card looks like in the file

```json
{
  "id": "mc-01",
  "code": "MC-01",
  "sort": 1,
  "image": "assets/web/method-card.png",
  "feeling": { "de": "Freude", "en": "Joy" },
  "imageAlt": { "de": null, "en": null },
  "plays": { "mindfulness-cards": "trk-01", "free-rein": "trk-01" }
}
```

| Field | Lands in | Rules |
|---|---|---|
| `id` | `cards.id` | `mc-01`. The lower case of `code`, always — it is what `sessions.card_id` stores, so a diary row read in a year should name the paper card without a join |
| `code` | `cards.code` | `MC-01`. **What is printed on the card, and what the QR encodes.** Changing it on a deck that has been printed invalidates the paper |
| `sort` | `cards.sort` | 1…n, contiguous. The order the deck is dealt and listed in |
| `image` | `cards.image_url` | A **web** path, or `null`. Still the shared `method-card.png` placeholder for all nine, which has never existed on disk. The printed deck does not read it: print masters live in `artwork/cards/`, found by card id |
| `feeling` | `card_i18n.feeling` | Both locales, both required. A feeling written in one is a dropped translation (CLAUDE.md rule 6) |
| `imageAlt` | `card_i18n.image_alt` | `null` in **both** locales, or written in both. Null in both is data — the source has no alt text; null in one is a translation somebody dropped |
| `plays` | `exercise_tracks` | Exercise id → track id. The same card plays a different file in a different exercise, which is what the `tracks` / `exercise_tracks` split is for |

### Adding a card

Append it with the next `sort`, give it both feelings, and pair it with the
exercises that should draw it. A card paired with nothing is legal — it is the
honest state while a recording is being chosen — and the generator says so
rather than refusing.

The track has to exist. `deck.json` does not own `tracks`: a recording is a
file, a duration and a licence, and it arrives by its own migration. Name a
`trk-NN` that is not there and the foreign key fails the migration on
`supabase db reset`, locally, before anything is pushed. That is a better check
than one the generator could fake, so it does not try.

### Removing a card

`pnpm deck:migration` refuses unless you pass `--allow-removal`, because
`sessions.card_id` is `on delete set null`: every diary entry that ever drew
that card keeps its row and loses the card it drew. That is a product decision,
not a content edit.

## Why a generated migration and not a hand-written one

CLAUDE.md rule 4 is not relaxed here. Every deck change is still its own new
migration file, with its own new timestamp, reviewed and committed like any
other; nothing edits an applied migration and nothing pushes on its own. What
the generator removes is the retyping — nine cards across three tables, two
locales and two exercises is 45 rows, and both `cards.sort` and `cards.code`
are non-deferrable unique columns that collide mid-statement if two cards swap
places, which is the trap `20260923150000` hit on `exercises.sort`.

**Each generated migration states the whole deck** — upserts every row, deletes
what the deck no longer has — rather than only the difference. A migration
carrying just the changed row would depend on the database already being in the
state the generator imagined, which is the assumption rule 4 exists because
nobody can make it safely. Stating it in full lands the same deck whatever it
finds, and is harmless applied twice.

The header's *what this changes* summary is a different thing: it comes from
`git show HEAD:supabase/content/deck.json`, the committed deck against the one
on disk. It is prose for a reviewer. If you commit the deck before generating,
the summary is empty and the migration is still complete — `deck.db.test.ts` is
what actually proves the database matches the file.

## The tests

| | |
|---|---|
| `apps/web/src/lib/deck.test.ts` | `deck.json` obeys every rule, and the checker is shown failing on each one. Runs in `pnpm check` — no database needed |
| `apps/web/src/lib/deck.db.test.ts` | the database **is** this file, row for row. Runs in `pnpm test:db`, so it can be pointed at the hosted project (CLAUDE.md rule 4) and catch a deck that was applied locally and never pushed |

## The PDF

```
pnpm deck:pdf                                          proof against the dev server
pnpm --filter web deck:pdf -- --base-url https://…     print day
pnpm --filter web deck:pdf -- --layout sheet           9-up on A4, for an office printer
pnpm --filter web deck:pdf -- --locale de              German only
pnpm --filter web deck:pdf -- --codes MC-03,MC-07      two cards
```

Two faces per card: the feeling on the front, the QR and the printed code on
the back. It is built out of the design system's own token files — the real
webfonts, the real semantic aliases — and printed through the Chromium
`@playwright/test` already installs, so there is no new dependency and the card
cannot drift from the system. `deck.html` is written beside `deck.pdf`; open it
in a browser to iterate on the design without waiting for a render.

Defaults: **88 × 63 mm landscape** with 3 mm bleed, both locales, one card
face per page. `--card 63x88` turns it portrait; every type size is keyed to
the card's SHORT edge, so a word prints the same physical size either way.

The `single` layout has no crop marks on purpose — the
page *is* trim plus bleed, so the cut line is the bleed inset from every edge,
and a mark inside the bleed is a mark that gets cut through. The `sheet` layout turns A4 to match the card — landscape cards go 3 × 3 on a
landscape sheet, which is the whole deck on one page per face instead of two
— and prints fronts then backs with each back sheet's columns reversed for
long-edge duplex. Print one sheet of each and hold them to the light before
running the deck.

**Nothing goes to a printer yet.** A printed QR carries an absolute URL and the
domain is not chosen (BUILD-PLAN.md's blocker table), so `--base-url` defaults
to the dev server and the PDF is a proof you can cut out and scan against
`pnpm --filter web dev`. Print day is the same command with the real address.

The output is not committed, for the reason `apps/web/scripts/qr-codes.mjs`
gives about its own: the thing that gets printed must be reproducible, and nine
files nobody can regenerate are nine files nobody can check.

## What is still open

- **No per-card artwork yet, and two places it could go.** The printed front
  reads `artwork/cards/<card id>.*` and falls back to the feeling set in type,
  so the press needs no column. The SCREEN needs `cards.image_url` to point at
  a small web copy — and needs a screen that renders it, which no screen does.
- **`cards.image_url` names a file that has never existed** for all nine. Set
  it to null or to a real web copy the next time this file is edited.
- **`imageAlt` is null in both locales for all nine**, which is data rather
  than a hole: the source has no alt text, and writing it is authoring.
- **The German is provisional.** The Mindfulness Cards spreadsheet owns this
  copy and will overwrite it. When it lands, it lands *here* — one file — and
  the loop above turns it into one migration.
