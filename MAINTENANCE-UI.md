# Maintenance UI · PRD

For the deck, the music and the artwork. Written 2026-10-14 from Ben's brief,
revised the same day with his second round: **the feeling word goes**, every
change carries a history and a way back, a code is written once and never
reused, and the QR generator docks onto this next. **Product document — no
code.** The engineering plan is `MAINTENANCE-UI-PLAN.md` beside it.

Readable copy: https://claude.ai/artifact/EyWpKDKc9q8NRN494W9Ekk

Scope of the ask (Ben, 2026-10-14): *a maintenance UI for the card deck and the
music used in Klangreise and Achtsame Pause. CRUD music, CRUD artworks, CRUD
the cards, and map music and artworks to cards. Mapping happens via the
coordinate system: x is valence (-2…2), y is arousal (-2…2). Available only to
selected users, and the selection is possible only via code. Not re-generating
the print deck.* And: *the feelings can be completely dropped. Always display a
version history and a timestamp, who made a change when, including a way to
roll back. MC-01 stays MC-01 whatever new image might be on the card. Once a
code exists it cannot be deleted; only new codes can be made up. For now MC-01
to MC-99 are available and no other codes. Build it so a QR code generator can
be docked onto it next.*

**Real CRUD means the database stops being a copy of `deck.json` and becomes
the thing `deck.json` is copied from.** That inversion is the whole of this
document; the screens are the easy half. It is §8.

---

## 1 · What ships

One route, `/maintenance`, lazy-loaded and linked from nowhere — the fourth
tool of that shape after `/dev/qr`, `/goal-mappings` and `/insight-map`. It
does five things, all of them persisted and all of them logged:

1. **CRUD the music** — `public.tracks`, every field of it, and six columns
   more than it holds today (§6.1). Upload an mp3 and the file's own tags fill
   in what they know; the duration is measured, never typed.
2. **CRUD the artwork** — a new `public.artworks` table and a bucket to hold
   the files. There is no artwork entity today: there are nine `.webp` files
   committed under `apps/web/public/assets/web/cards/` and an `image_url`
   column pointing at them.
3. **CRUD the cards** — the code (written once, §4), the deck order, and the
   card's place on the grid. No feeling, no copy at all.
4. **Map music and artwork to cards** — by putting a track and an artwork into
   a cell, and a card into the same cell.
5. **Show who changed what, when, and put it back** — §7, on every screen.

It does not regenerate the printed deck, and under *pieces only* it does not
change what Klangreise plays. Both are in §14.

## 2 · Who can open it

An allowlist of email addresses, written in code, holding one address today.
Adding somebody means editing a file and deploying it — which is what
*selection via code only* asks for, and is also the only thing that makes the
list auditable.

**The allowlist is enforced on the server, and the route gate is cosmetic.** A
hidden route is not a permission: anyone signed in can type a path, and anyone
at all can call an endpoint. So the check that matters runs in one place,
beside the service role, and the route gate exists only so a signed-in beta
tester who guesses the path sees a refusal rather than a broken screen.

Two details that will otherwise bite:

- **An anonymous user's `email` is the empty string, not `null`** — measured
  2026-09-22, documented in `lib/auth.ts`. An empty string must never match an
  entry, or every anonymous visitor is a maintainer.
- **The brief says `lipinskib@gmail.com`; this account signs in as
  `lipinskib@googlemail.com`.** The same mailbox, a different string, and
  Postgres compares strings. The list carries both spellings, lower-cased and
  trimmed, and nothing cleverer — stripping dots and `+suffixes` the way Gmail
  does would make the list match addresses nobody put in it.

The email is not only the key to the door. It is what §7 writes into every
history row, so *who changed this* is answerable without a second lookup.

Locally this means signing in as that account rather than falling through to
anonymous, whatever `VITE_REQUIRE_ACCOUNT` says.

## 3 · The model: the cell is the join

A cell is a **position**, not a record somebody creates. Twenty-five of them
are written once by migration and never added to or removed; the UI only fills
and empties them.

| | |
|---|---|
| `grid_cells` | `(valence, arousal)` as the primary key, both `-2…2`, plus a nullable `track_id` and a nullable `artwork_id`. 25 rows, forever |
| `cards` | the code (§4), `sort`, `archived_at`, and `valence` / `arousal` referencing a cell, `unique` on the pair — **one card per cell**. Nullable, because a card not yet placed is a real state and Postgres treats two nulls as distinct |
| `artworks` | new. An id, an object key, an `archived_at`, and an `artwork_i18n` sibling carrying alt text per locale |
| `tracks` | unchanged in shape; gains only `archived_at` |

**A track or an artwork may sit in any number of cells, or in none.** That is
not a loophole, it is what today's deck needs: `trk-04` plays behind two cards.
Unused is legal too — `supabase/content/README.md` already calls a card paired
with nothing the honest state while a recording is being chosen.

So: a card plays its cell's track and shows its cell's artwork. An empty cell
is a silent card with no picture, which the app already draws correctly — five
of the nine cards are silent today, and `tracks.src is null` is the documented
way of saying so.

### 3.1 · The feeling word goes, and the repo had already started

**A card carries no copy at all after this.** It is a code, a position and
whatever sits in that position. `tracks` keeps having no `_i18n` sibling
either, because a title and an artist are not translated — rule 6 says so. The
only translated thing left in the deck is an artwork's alt text, which moves to
`artwork_i18n` where it belongs.

The screens did this already. `SessionListen.tsx` records the call on
2026-10-09: *"The feeling goes from every screen; what identifies a card to
somebody holding the deck is the code stamped on its back."* The diary's select
was narrowed the same day. What kept the data alive is written in the same
comment — `deck:pdf` prints the word on the physical front of MC-06…MC-09,
**which have no artwork master**, and emptying the data would print four blank
cards.

Uploading artwork for exactly those four is what this UI is for, so the reason
expires with the change that removes it.

**Staged, not dropped, and the repo decided that too.** `card_i18n.feeling`
becomes nullable and stops being written; the rows stay, holding null in both
locales, which `missing_translations` already reads as data rather than a hole
because it compares the locales against each other. The column and the table
come out in a one-statement follow-up once the live branches land. That is
exactly what `20261011100000` did with `needs_cards` rather than breaking every
other agent's app with a PostgREST error in a file they did not touch —
rule 9. The nine existing words stay in their rows until then, inert.

One consequence worth naming: a tenth card created before those branches land
has a `card_i18n` row with a null feeling, and another worktree's `content.ts`
will render an empty word for it. The row exists, so nothing throws.

## 4 · Codes: MC-01 to MC-99, written once, never reused

`MC-01` … `MC-99`, zero-padded, and nothing else. `MC-00` is not a code and
`MC-1` is not a code: the printed form is two digits. A check constraint
carries the shape, `deckRules.ts` carries the next-free-code rule, and the
*for now* lives in one named constant so a second prefix is one line plus a
migration.

**A code is written once and is never editable** — not before printing, not
after. MC-01 stays MC-01 whatever artwork or music moves behind it. The form
shows it read-only after creation, and the server refuses a change rather than
trusting the form.

**A code is never freed.** A card is archived, never deleted (§10), so its code
stays taken forever. Reusing MC-03 for a different card would make every diary
row that drew the old one point at a card it never drew — and `sessions.card_id`
stores the id, which is the code lower-cased, precisely so a diary row read in
a year names the paper card without a join.

Together these two are what makes §11 possible: a printed QR encodes a code,
and a code that cannot move or be reused cannot invalidate paper.

**Ninety-nine codes, twenty-five cells.** Up to 99 cards may exist and at most
25 are placed at once — one card per cell caps the *live deck*, not the
library. Today: nine cards, nine cells, sixteen cells free.

## 5 · The nine cards, placed

Somebody has to decide where MC-01 goes. Below is a proposal built from the
circumplex the two axes come from, preserving every card's current track
exactly. **It is content, so it needs Ben's sign-off before the import
migration is written** — and it is the only part of this document that is a
guess rather than a reading of the repo.

| arousal ↓ · valence → | −2 | −1 | 0 | +1 | +2 |
|---|---|---|---|---|---|
| **+2** | MC-03 · trk-05 | MC-04 · trk-01 | — | — | — |
| **+1** | — | — | — | MC-09 · trk-01 | MC-01 · trk-04 |
| **0** | — | MC-06 · trk-05 | — | — | — |
| **−1** | MC-02 · trk-02 | — | — | — | MC-07 · trk-04 |
| **−2** | MC-08 · trk-02 | — | — | MC-05 · trk-02 | — |

The placement is derived from the words the cards carried until today, which
are provenance and not data: MC-01 Freude, MC-02 Trauer, MC-03 Wut, MC-04
Angst, MC-05 Ruhe, MC-06 Sehnsucht, MC-07 Dankbarkeit, MC-08 Einsamkeit, MC-09
Hoffnung. After the import nothing stores them, and the coordinate is what
survives them.

Nine cards, nine cells, sixteen cells holding no card. Four tracks across those
nine cells: `trk-01` twice, `trk-02` three times, `trk-04` twice, `trk-05`
twice. `trk-03` and `trk-06`…`trk-09` have no audio file at all and sit in no
cell — the five silent cards, now visible as five empty cells rather than as
five rows whose `src` happens to be null.

**The grid makes one thing about the current deck impossible to miss.**
`trk-02` — *Wait for It*, 102 seconds — sits at `(+1, −2)`, `(−2, −1)` and
`(−2, −2)`: one recording serving both ends of the valence axis. That pairing
was mood-matched off ID3 tags in September, when there were four files and nine
cards. Seeing it is the point of the screen.

## 6 · The screens

**The grid is the home screen.** Five by five, each cell showing whichever card
sits there, a thumbnail of its artwork and the title of its track. Press a cell
and a panel opens with three pickers — card, track, artwork — and that is the
whole of the mapping. Moving `trk-07` behind MC-01 is two presses, the screen
says what changed, and the change is in the log before the toast has faded.

**Three libraries behind it**, each a list with a form:

| | |
|---|---|
| Music | title, artist, licence reference, the file, the measured duration, and the cells this track sits in. Upload replaces the file and re-measures |
| Artwork | the image, alt text in both locales, and the cells it sits in |
| Cards | the code — read-only after creation — the deck order, and the cell |

**Four rules the forms enforce, because the database already does and the error
message would be unreadable.**

- The code is `MC-01`…`MC-99` and `cards.id` is that code lower-cased, derived
  and never typed. New cards are offered the lowest free code; taken codes are
  never offered again (§4).
- `sort` stays `1…n` and contiguous, so order changes by moving a card up or
  down, never by typing a number. `sort` and `code` are both `unique` and **not
  deferrable**, so two cards swapping places collide halfway through an
  otherwise valid write — the trap `20260923150000` hit on `exercises.sort`.
  The server parks the order out of range first, exactly as the generated deck
  migrations do.
- Alt text is written in **both** locales or **neither** — null in both is
  data, null in one is a dropped translation, which is what
  `public.missing_translations` reports. It is the only copy left in the deck.
- A duration is measured off the uploaded file and is never an input. Every
  duration in `tracks` was invented by a seed in September and corrected by
  hand afterwards; a countdown that disagrees with its file is a bug nobody
  sees until they wait for it.

The rules in `apps/web/src/lib/deck.test.ts` become a module both sides import
— the form, and the server before it writes. One copy, two callers.

### 6.1 · The music screen, field by field

**All of it on one screen, in three groups, because the groups are not the same
kind of fact.** A field you write, a field the file knows, and a field nothing
should let you write are three different things, and a form that mixes them
invites somebody to type over a measurement.

**Yours to write — nine fields.** Title and artist, both required: they are the
credit, and `reveal-track` is what eventually says them out loud. Album and
release year. Tempo in bpm. A mood note. A licence type — *subscription*, *per
track*, or *not cleared yet* — a catalogue or ISRC number, and the free-text
licence note that `licence_ref` already holds.

**Two of those are new answers to an old problem.** `20260921160000` records
that `licence_ref` "carries the Epidemic Sound track name, which is the only
stable identifier the download gives us", and that Epidemic Sound is a
**subscription** licence rather than the per-track clearance BUILD-PLAN assumed
everywhere it says *cleared*. So the identifier moves to `catalogue_ref`, the
terms become a value you can filter on, and the note goes back to being prose.
*Which of these may we actually still use* stops being a question you answer by
reading a sentence.

**What the file knows, offered and never forced.** On upload the server reads
the file's own tags — title, artist, album, year, and bpm where the download
carries one — and offers them as starting values for any field left empty. It
never overwrites something that was typed, and the screen says which values
came from the file, so a guess never looks like a decision. This is how the
four real credits got into the database in the first place: `20260921160000`
says they were "read from the files' own ID3 tags".

**Facts, not inputs.** The duration, measured from the file, with a
*Re-measure* button rather than a text box. The file's size and format. The id
— `trk-01`, opaque on purpose, because it reaches the client and a
title-derived slug would hand over the answer the column grant on `title`
exists to withhold, and because `sessions.track_id` points at it forever. The
object key, which the server mints and the UI never accepts typed (§9). Which
squares the piece sits on, and therefore which cards play it. When it arrived,
and its whole history (§7).

**Tempo earns its place by sorting.** The music list can order itself calmest
first, which is the judgement being made every time a piece is placed on the
grid's vertical axis. Worth saying plainly: that tempo tracks arousal is a
**useful proxy, not a measurement** — a slow piece can be agitating. The sort
is a starting point for the ear, not an answer.

The mood note is in English, like the rest of this screen. It is an operator's
note and never reaches a listener, so rule 6 does not reach it — and `tracks`
still has no `_i18n` sibling, because a title and an artist are not translated.

## 7 · History, and the way back

Every write appends one row to `content_edits`: **who** — the user id and the
email they signed in with — **when**, which entity, which row, which action,
and the `before` and `after` as `jsonb`. Nothing ever updates or deletes a
history row.

**It is always on screen, in two places.** Every detail view carries its own
row's history, newest first, each line naming the person, the moment and what
moved. And there is one global log, which is the same data without the filter —
the answer to *what happened to the deck last Tuesday*.

**Rollback is a new edit, never an erasure.** Reverting an edit writes its
`before` back and appends a fresh row whose `reverts` column names the edit it
undid. So a revert can itself be reverted, the log always reads forward, and
there is no state in which the history and the rows disagree. A restore of the
whole deck to a moment is not built, and is possible later without a schema
change, because the history is complete.

**Cells are edited too**, which is what makes the mapping answerable: entity
`grid_cells`, row id `+2,+1`, `before` and `after` naming the track and the
artwork. *What played behind MC-01 on 3 November* is a query, and putting it
back is one press.

**A hard delete and a complete history cannot both exist.** If the row is gone
its `before` has nothing to return to. So nothing is hard-deleted anywhere, by
anyone — archive and restore is the whole of it (§10), which removes a branch
of logic rather than adding one.

**The same rule reaches the buckets.** An object named by any history row is
never removed. Replacing a track's audio costs nothing here, because a key
carries the file's own content hash: the replacement is a new key and the old
object is untouched, which is exactly what a revert needs.

What this buys that a migration header never did: the person who decided rather
than the engineer who typed it, and the moment, to the second.

## 8 · Where the edits land

Three things currently claim to own the deck: `deck.json`, which
`supabase/content/README.md` calls the only place it is written by hand; the
generated migrations, each of which **states the whole deck** and deletes what
the file no longer has; and `deck.db.test.ts`, which asserts the database *is*
that file, row for row.

Real CRUD makes all three false, and the second one destructive. Edit a card's
music in the browser, then let anybody run `pnpm deck:migration` from any
worktree, or `supabase db reset` locally — and the file silently puts the old
track back. That is rule 4's trap wearing a new costume: two sources of truth,
both green, drifting apart until something unrelated breaks three phases later.

So real CRUD is not a set of insert policies. It is a decision about what owns
content, and it only works if the other claimants are retired in the same
change.

**Schema travels by migration. Content lives in the database. The file becomes
a snapshot.**

| | today | after |
|---|---|---|
| `deck.json` | hand-written source | generated snapshot, `pnpm deck:export`. Committed when you want a checkpoint; still exactly what `deck:pdf` reads |
| `music.json` · `pieces` | hand-written source | generated snapshot, same command |
| `music.json` · `cuts` | hand-written source | **unchanged** — Klangreise's cuts are out of scope and keep their loop |
| `pnpm deck:migration` | mints content migrations | retired. It refuses, and says where the deck is edited now |
| `pnpm music:migration` | mints `tracks` **and** `exercise_cuts` | cuts only. This overlap is the one that would otherwise clobber a UI edit |
| migrations | schema **and** content | schema only, after one import migration — the last file that ever states deck content |
| the two db tests | the database equals the file | the database obeys the deck's rules, and can still be pointed at hosted |
| `pnpm db:status` | compares migration files to hosted | unchanged, and now exactly as truthful as it claims: migrations carry only schema |
| — | — | new: `pnpm content:pull`, because `db reset` now yields factory content rather than live |

### 8.1 · The write goes through one function, not PostgREST

The decisive constraint is a column grant, not a policy. The UI has to read
`tracks.title`, `artist` and `licence_ref`; `authenticated` is granted
`select (id, src, duration_seconds)` and nothing else — `20260921170000` took
`licence_ref` back on 21 September. **RLS cannot narrow a column grant**,
because a grant belongs to a role: there is no policy that lets one signed-in
person read titles without letting every signed-in person read them.
`reveal-track` already makes this argument and solves it the only way it can be
solved — *"a server holding the service role, which is exactly one place, with
exactly one rule in it"*. The maintenance UI is the second instance of the same
rule, and it writes through that door too.

Three things follow, all of them good:

- **No content table needs a new write policy, and `authenticated` needs no new
  grant at all.** Rule 2's revoke-then-grant trap and rule 3's prohibition
  never come up for the client, because the client never writes.
- **The grants are already there.** `20260921103000` gave `service_role`
  insert, update and delete on `cards`, `card_i18n`, `tracks` and
  `exercise_tracks` — the half of rule 2 that gets missed is, for the existing
  tables, already done. Only the new tables need their own.
- The allowlist, the validation, the history row and the revert have exactly
  one place to live, and the actor cannot be forged by a client that never
  writes.

### 8.2 · Two roads not taken

**Client writes gated by RLS** — an `is_maintainer()` function in SQL, write
policies on the content tables, `grant insert, update, delete … to
authenticated`. Rejected three times over: it cannot deliver the titles, it
would leave every signed-in beta tester one policy mistake away from rewriting
the deck, and a client that writes its own history row can write anybody's name
into it.

**A function that commits a migration to the repo** — keeps migrations as the
source of truth and still gives real CRUD, by having the server write a file
through the GitHub API. Rejected: it writes the same change twice, to the
database now and to a file afterwards, which is the double source rule 4 exists
to describe. It would also race `pnpm db:sync` and the merge workflow for the
same files.

## 9 · Files, buckets and uploads

**Audio keeps the private `tracks` bucket, and nothing about it changes except
who may put a file in.** `20260921160000` says plainly that uploading is "an
operator act done with the service role"; this makes that act go through a
server that checks *which* operator. `storage.objects` still gets no insert
policy for `authenticated` — the function mints a **signed upload URL** and the
browser PUTs to it.

**The server measures the duration, not the browser.** After the upload lands,
the function reads the object back with the service role and measures it. The
measuring code already exists and has no dependencies — `music-upload.mjs`
parses `mvhd` for MP4 and frame headers plus Xing for MP3, deliberately without
ffprobe — so it moves to a module both the script and the function import. A
number measured where nobody can type it is the whole point.

**A key may not say what the card is.** The third reason that migration gives
for rejecting `apps/web/public/` is that `mc-01-joy.mp3` names the card *and*
the feeling, which is the leak the opaque `trk-NN` ids exist to prevent. So the
UI mints every key — the id plus eight characters of the file's own hash, as
`music:upload` already does — and never accepts the studio's filename or a
hand-typed key. The hash is also what makes a one-year `immutable` cache header
safe, and what makes §7's revert free: a replacement is a new key, so the old
object is still there to go back to.

**Artwork gets a new bucket, and it is public.** The nine card artworks are
already public: committed `.webp` files under `apps/web/public/` in a public
repository, served from the bundle at a guessable URL. A private bucket would
force a signed URL into every screen that draws a card — `fromRoot()` in
`lib/assets.ts` is a pure string function used by `/exercises` and the diary
entry, and signing is asynchronous and per request. That is a read-path change
across shipped screens for no security gain. The keys stay opaque anyway:
`art-07.webp` plus a hash, never `freude.webp`.

**The browser resizes before it uploads** — 768 × 768 WebP at quality 80, which
is not a guess: `20260924140000` worked it out as 4× the largest slot
`.musy-rcard__media` ever gives an image, and it took the set from 17 MB to
748 KB.

The import uploads the nine existing files into the bucket so there is one
artwork store and all nine are editable. The committed copies stay where they
are for one release and come out in a follow-up — an orphan under `public/` is
a 404 waiting to happen, not a leak.

## 10 · Archive, never delete — and never hard delete

The database already had opinions here. `sessions.track_id` is `on delete
restrict`, so Postgres refuses to lose a recording somebody listened to.
`sessions.card_id` is `on delete set null`, so deleting a card would strip the
card from every diary entry that drew it — which the deck README calls a
product decision rather than a content edit.

§4 and §7 settle it between them: a code may never be freed, and a history must
always have something to return to. **So nothing is ever hard-deleted — not a
card, not a track, not an artwork, not a storage object.** `archived_at
timestamptz` on all three tables, a timestamp rather than a flag because *when*
costs nothing extra and answers the next question. Archived means out of the
grid, out of the pickers and out of the deal — and still joinable from every
diary row that points at it. A journal does not lose what it says you did.

**Archiving has consequences the screen states before it happens**, because
they are the kind nobody predicts:

- Archiving a **card** empties its cell. The cell keeps its track and artwork,
  ready for whichever card goes there next. The code stays taken forever.
- Archiving a **track or an artwork** removes it from every cell it sits in,
  and those cells go quiet. So the confirmation names them: *this track sits in
  3 cells — archiving it leaves MC-02, MC-05 and MC-08 silent.*

Un-archiving is an ordinary revert (§7), which is the whole reason this needs
no delete at all.

One line of shipped read code changes for this: the deck query filters
`archived_at is null`. The projection in §12 covers the rest by never
projecting an archived row.

## 11 · The QR that docks next

A printed QR carries an absolute URL to `/s/:code`. That route exists,
`lib/scanCode.ts` decodes it, and it is deliberately same-origin so it works on
localhost, on a LAN address a phone can reach, on a preview and on a domain
that does not exist yet.

**What this change contributes is the invariant, not the encoder.** A card's QR
depends on nothing but its code, and §4 makes a code immutable and never
reused. So re-uploading artwork, swapping the music behind MC-01 or moving the
card to another cell can never invalidate printed paper. That is the
precondition a QR generator needs, and it is why it belongs in this change
rather than in that one.

Three seams, built now, so docking is small:

- **`cardScanUrl(code, baseUrl)`** — one definition of what a QR encodes,
  imported by `/dev/qr`, `deck:pdf` and the maintenance screen. Today each
  builds its own.
- **The base URL comes from config, with an explicit override**, because the
  domain is not chosen — BUILD-PLAN's blocker table, and the reason
  `deck:pdf --base-url` defaults to the dev server.
- **A per-card panel that shows the scan target as text.** Docking is then
  "draw this string as a QR" plus a layout, and `qrcode` is already a
  dependency, loaded lazily by `/dev/qr`.

Not built here: the encoder, the sheet, the print run.

One state the generator will inherit and this document does not settle: a
printed card whose card is later archived. `/s/:code` still resolves, and what
it should say is a product decision — §16.

## 12 · What does not change

**The app's read path.** `exercise_tracks` becomes a **projection**: whenever a
cell or a card's coordinate moves, the server rewrites its rows for every
`kind = 'card_based'` exercise. `content.ts`, `deckGuide.ts`, the listen step,
the `digital-cards` branch and every other live worktree keep selecting exactly
what they select today. `cards.image_url` is projected the same way, from the
cell's artwork.

A projection rather than a new read path, for one reason: **rule 9**. Nine
worktrees are live, every one of them selects from `exercise_tracks`, and
`20261011100000` kept a column it had just made redundant — `needs_cards` — for
precisely this reason. Reading cells directly is the right follow-up once those
branches land, together with dropping `card_i18n` (§3.1), and both are
deliberately not this change.

The `card_id is null` rows stay untouched. A cardless exercise's own track is
not the deck's, and the generated migrations already guard that distinction.

**The printer, in one way only.** `deck:pdf` keeps reading `deck.json`, which
keeps existing in the same shape, now exported rather than typed. What changes
is the front: it was *artwork where there is any, the feeling set in type where
there is not*, and with no feeling to set it becomes artwork or nothing. So
`deck:pdf` **refuses** a card with no artwork and names it, rather than
printing a blank. `deck.mjs` drops its three feeling rules at the same time.
Print day is otherwise unaffected.

**Klangreise's cuts.** `exercise_cuts`, `pnpm music:upload`, the 250 ms pair
rule and *nothing ever crosses locales* are all untouched, and the `cuts` array
in `music.json` stays hand-written.

**`reveal-track`.** Unchanged. It hands a title to a listener who finished a
session; the maintenance door hands one to an operator. Two doors, one rule
about where titles may come from.

**`pnpm check`.** Still never touches a database. The pure parts — the
validator, the code rules, the key minting, the scan URL — are unit-tested
there; the write path is tested in `pnpm test:db`, which can be pointed at
hosted.

## 13 · What this costs, and what replaces it

| what is lost | what replaces it |
|---|---|
| A content change no longer arrives as a reviewed migration with a reason in its header | §7's history, which names the person who decided rather than the engineer who typed, to the second, and can put it back |
| `supabase db reset` no longer reproduces live content — factory and live are now different things | `pnpm content:pull` makes the local stack match hosted in one command, and the exported snapshot is the readable record in git |
| The two parity tests lose their current meaning | They become rules tests against whichever database you point them at. They stop catching *applied locally, never pushed* — and that failure stops existing, because content no longer travels by migration |
| Nine worktrees share one Postgres (rule 9) | Nothing. A UI edit changes content for every live agent instantly, with nothing in `git status` to show it. Same hazard class as `db reset`, a new door into it; the history is what tells you afterwards, and by whom |
| An edit is live for beta testers the moment it is pressed | §7. Nothing is destroyed and every change is one press from being undone. A draft-and-publish split would double the model for one operator |
| The function is a new deploy target that no workflow covers | Nothing automatic. `db-push.yml` pushes migrations only; `reveal-track` and `realtime-token` are deployed by hand today, and this makes a third. **Changing the allowlist therefore means an edit and a `supabase functions deploy`** |
| Storage grows and is never pruned | Nothing, by choice. A revert needs the old object, so an object named by any history row stays. Nine artworks and a handful of masters is not a budget problem |

One gap worth closing by construction: `supabase/functions` is Deno and is not
in `pnpm -r run typecheck`, so the function is not covered by `pnpm check`. The
answer is to keep the function thin and put every rule in a dependency-free
module under `apps/web/src/lib/`, which the function imports by relative path —
Deno bundles it on deploy, `tsc` checks it, and `pnpm check` unit-tests it. The
logic is verified even though its host is not.

## 14 · Out of scope

Ben's three: regenerating the printed deck, a different track per exercise, and
the produced cuts. Plus the QR encoder itself (§11) — the seam, not the
feature.

Also out: every other content table — exercises, goals, user types, situations,
reflection statements, the listening questions. This UI touches cards, tracks,
artworks and the grid, and nothing else. No draft-and-publish step. No second
maintainer; the list holds one address. No restore-the-whole-deck-to-a-moment,
which §7 leaves possible.

### 14.1 · The one thing the brief assumed

**Under *pieces only*, nothing in this UI changes what Klangreise plays.**
Klangreise is `sound-journey`, a `listening_only` exercise: its audio is two
rows in `exercise_cuts` — German, 574 seconds, one ending for the day and one
for falling asleep — and they are produced mixes of guidance over music. It
draws no cards and plays no `tracks` row; `track_id` is null on all three cuts
in the file.

The hook exists and is where the two halves eventually meet:
`exercise_cuts.track_id` is the piece credited *inside* a mix, filled the day we
hold that piece's own unducked export. So editing pieces will one day change
Klangreise's **credit**, never its audio. Ben chose *pieces only* with this in
the question, so it is a consequence rather than a surprise.

One more: the Mindfulness Cards spreadsheet owns the card copy and will
overwrite it — except there is no card copy left after §3.1, so what it
overwrites is nothing. That overwrite was a scheduled problem and this removes
it.

## 15 · Decisions

### Ben's, 2026-10-14 — first round

| | answer | what it commits |
|---|---|---|
| How the grid maps | the cell is the join | `grid_cells` is a table of 25 positions; a card's music is its cell's track |
| How strict the grid is | one card per cell, music may repeat, empty means silent | `unique (valence, arousal)` on cards; nullable track and artwork on the cell |
| Where the edits land | real CRUD, into the database | §8 — the file becomes a snapshot, two generators are retired |
| What *music* covers | pieces only, `public.tracks` | Klangreise's audio is untouched (§14.1) |
| Uploads | audio and images, from the browser | a new artwork bucket, signed upload URLs, the duration measured server-side |
| Delete | archive, never delete | `archived_at` on three tables |
| Copy | exempt, English only | inline strings, the exemption in the file header, logged in `OPEN-QUESTIONS.md` |

### Ben's, 2026-10-14 — second round

| | answer | what it commits |
|---|---|---|
| The feeling word | dropped completely | §3.1 — a card carries no copy; nullable and unwritten now, column and table dropped when the branches land |
| History | always on screen: who, what, when | §7 — `content_edits` on every write, shown inline and as a global log |
| Rollback | required | §7 — a revert is a new edit, never an erasure; and therefore **no hard delete anywhere** |
| A code's lifetime | MC-01 stays MC-01 | §4 — written once, never editable, never reused, never freed |
| The code space | `MC-01`…`MC-99`, for now | a check constraint plus one named constant; 99 codes against 25 cells |
| The QR generator | docks onto this next | §11 — the invariant and three seams now, the encoder later |

### Ben's, 2026-10-14 — third round

| | answer | what it commits |
|---|---|---|
| The music screen | show every field, and make editable everything that honestly can be | §6.1 — three groups: yours, the file's, and the facts |
| New fields | album, release year, tempo, mood note, licence type, catalogue/ISRC | six new columns on `tracks`; `licence_ref` keeps its name and goes back to being prose |
| The file's own tags | read on upload, offered, never forced | a dependency-free ID3 and MP4-atom reader beside the duration measurer |
| Duration, the id, the key | facts, not inputs | a *Re-measure* action instead of a text box; the opaque id and the object key stay the server's |

### Taken in this document — say if any is wrong

| | decision | why |
|---|---|---|
| Who enforces access | one edge function, allowlist in its code | the column grant on `tracks.title` leaves no alternative — §8.1 |
| What the allowlist holds | `lipinskib@gmail.com` **and** `lipinskib@googlemail.com`, lower-cased | one mailbox, two strings, and Postgres compares strings |
| Where the UI lives | `/maintenance` in `apps/web`, lazy, linked from nowhere | the fourth tool of that shape |
| `exercise_tracks` | kept, maintained as a projection | rule 9 — nine live worktrees select from it |
| `card_i18n` | kept until the branches land, then dropped | the `needs_cards` precedent, `20261011100000` |
| The artwork bucket | public | the nine files are already public; private forces signed URLs into shipped screens |
| Rollback granularity | one edit at a time | a whole-deck restore needs no schema change later, so it is not needed now |
| The print front | artwork or a refusal | with no feeling to set in type, printing a blank is the only other option |
| The nine coordinates | the placement in §5 | content, so it is a proposal and not a reading of the repo |

## 16 · Open questions

1. **The nine coordinates in §5 need sign-off** before the import migration can
   be written. Nothing else waits on it.
2. **What should `/s/:code` say for an archived card?** It resolves, because
   the row is still there. Today it finds a card and offers the exercise. A
   retired card on printed paper is a state the QR generator inherits, and the
   answer is a product decision rather than a technical one.
3. **Do the nine committed `.webp` files come out of the repo** once the bucket
   holds them? Named in §9 as a follow-up, not done here.
4. **Does the global log need a filter**, or is newest-first enough? Nine
   cards and a handful of tracks say enough; a year of edits may not.
5. **`deck:pdf` now refuses a card with no artwork.** That is correct and it
   also means the deck cannot be proofed until all nine have one. Is that the
   right gate, or should it print a card that is deliberately blank?
6. **Should the reveal say more now?** `reveal-track` hands over a title and an
   artist at the end of a session. Album and year exist from this change
   onward, and a full credit is arguably all four. Adding them changes shipped
   behaviour, so it is not in this change.

## 17 · Done when

- [ ] `pnpm check` passes — typecheck, lint and unit tests across the three
      packages that have them (rule 8)
- [ ] `pnpm test:db` passes after `supabase db reset` locally, **and** against
      hosted with the three keys passed for one run
- [ ] Walked in `pnpm --filter web dev` as the allowlisted account: a track
      moved between cells, a card created and taking the next free code, an mp3
      uploaded with its duration appearing untyped, an image uploaded and
      visible on the card, and a track archived with the newly silent cards
      named in the confirmation
- [ ] **Every one of those appears in the history with the right email and
      time, and reverting the first one puts the track back** — and the revert
      is itself in the log
- [ ] A code cannot be edited, a used code cannot be re-offered, and `MC-00`,
      `MC-1` and `MC-100` are all refused
- [ ] A piece of music shows every field it has, the nine editable ones save,
      the duration cannot be typed, and uploading a tagged mp3 fills in title,
      artist, album, year and tempo without overwriting anything already there
- [ ] The same walk signed in as a **non**-allowlisted account is refused by
      the function, not only by the route
- [ ] `cardScanUrl` is unit-tested and `/dev/qr`, `deck:pdf` and the
      maintenance screen all call it
- [ ] `pnpm deck:export` writes a `deck.json` that `pnpm deck:pdf` still
      renders and `deck.test.ts` still passes on
- [ ] `pnpm deck:migration` refuses, and says where the deck is edited now
- [ ] `supabase db reset` followed by `pnpm content:pull` reproduces the live
      deck locally
- [ ] `pnpm db:status` says IN SYNC after `pnpm db:sync`
- [ ] `apps/web/OPEN-QUESTIONS.md` carries the copy exemption, the
      `card_i18n` follow-up and everything above that this turned up
