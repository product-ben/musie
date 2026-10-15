# Maintenance UI · Plan

The engineering plan for `MAINTENANCE-UI.md`. Read that first — this file
assumes its §8 (what owns content) and §7 (history and rollback) and does not
re-argue either.

Nine steps, one branch, one session for everything that writes. §10 says
exactly where a subagent helps and where it collides, because rule 9 makes that
a design question rather than a preference.

**Branch**: `maintenance-ui`, worktree `../musie.worktrees/maintenance-ui`, off
`main`. Not `docs-site`, where the two documents were drafted — they are
untracked files to move across.

---

## 0 · What the design system already gives us

Checked before sizing anything, because it moves the biggest number in §11:

| need | component |
|---|---|
| every text input — title, artist, licence, and the code read-only | `Field` (label, `error`, `multiline`, `required`, `readOnly`) |
| the artwork upload, with preview and alt | `PhotoUpload` |
| deck order | `DraggableList` + `itemTypeStep` |
| the cell editor over the grid | `Lightbox` |
| the history list, and the global log | `ContentList` — a label and a value per line is what a history row is |
| *reverted* / *revert of* markers | `Badge`, `BadgeRow` |
| saved / refused | `Toast`, `Message` |
| picking a track or an artwork | `RadioCards`, `RadioGroupImage` |
| the card list | `CardDeck`, `ContentList` |

So **the only thing with no component is the 5 × 5 grid itself**, which
`10-layout.md` L14 permits as a `musie-`prefixed pattern whose every
declaration resolves to a Layer 1 token — and L14.3 makes it a component
request if it recurs. Logged in `OPEN-QUESTIONS.md` either way.

One trap: `PhotoUpload`'s copy defaults come from the design system's own
`src/locale.ts` and several of those defaults are German (rule 7). Every label
is passed explicitly, in English, like every other prop.

## 1 · M.0 — the schema migration

`supabase/migrations/<stamp>_maintenance_schema.sql`. Schema only; no content.

- `grid_cells (valence smallint, arousal smallint, track_id text, artwork_id
  text, primary key (valence, arousal))`, both coordinates checked to `-2…2`.
  Both foreign keys **`on delete restrict`**: nothing is ever hard-deleted
  (PRD §10), so the restrict is a statement of that rather than a branch.
- `artworks (id, src not null, archived_at, created_at)` and
  `artwork_i18n (artwork_id, locale, alt, primary key (artwork_id, locale))`,
  cascading from `artworks`, matching the `_i18n` pattern every other content
  table uses.
- `cards` gains `valence`, `arousal`, a **composite** foreign key onto
  `grid_cells`, `unique (valence, arousal)` — one card per cell, and Postgres
  treats two nulls as distinct, which is what lets several cards be unplaced —
  and `archived_at`.
- **The code rules, in the schema**: `check (code ~ '^MC-(0[1-9]|[1-9][0-9])$')`
  so `MC-00`, `MC-1` and `MC-100` cannot exist, and a trigger that raises on
  any `update` that changes `code`. The form shows it read-only; the trigger is
  what makes it true. Both carry the reason in a comment — a printed QR
  encodes the code, and paper cannot be reissued.
- `tracks` gains `archived_at` and **six new columns** — `album`,
  `release_year`, `tempo_bpm`, `mood_note`, `licence_type`, `catalogue_ref` —
  all nullable, with `check` constraints on the two numbers (a year inside
  1900–2100, a tempo inside 1–400) and on `licence_type`
  (`subscription | per_track | none_yet`). A check rather than a lookup table,
  by this schema's own rule: a lookup table is for a content taxonomy with
  labels people read, and this label is read by one operator on one English
  screen. `licence_ref` **keeps its name** and goes back to being prose —
  renaming it would touch `music.json`, the generator and the committed types
  for no gain, and it is already revoked from `authenticated`.
- `card_i18n.feeling` **`drop not null`**, and nothing else touches it. The
  rows stay, the words stay, and both come out in the follow-up named in M.8.
- `content_edits (id, at, actor_user_id, actor_email, entity, row_id, action,
  before jsonb, after jsonb, reverts uuid references content_edits (id))`.
  `action` checked against `create | update | archive | restore | revert`.
  There is no `delete`, and that is the point.
- **RLS on, and no policy for `authenticated` on any of them.** The new tables
  are invisible to the client by design: every maintenance read goes through
  the function, because it needs `tracks.title` anyway. Rule 2's revoke, then
  grant to `service_role` only — and the second half is the one that gets
  missed, so it is written out table by table.
- The **write functions**, `plpgsql`, called by the edge function over `rpc`:
  `admin_save_card`, `admin_save_track`, `admin_save_artwork`,
  `admin_set_cell`, `admin_archive`, `admin_revert`. They exist because three
  things have to happen in one statement — the row, the history entry and the
  projection — and `supabase-js` cannot open a transaction. The parking of
  `cards.sort` out of range only works inside one too.
- **`admin_revert(edit_id, actor)`** is the one with the interesting shape: it
  reads the named row's `before`, writes it back through the same path an
  ordinary save takes (so the projection and the validation both run), and
  appends a new row with `action = 'revert'` and `reverts = edit_id`. It never
  updates or deletes a history row. Reverting a revert therefore works without
  a special case, which is the test that proves the shape is right.
- The **projection**, `project_deck()`, called by each of those: it rewrites
  `exercise_tracks` for every `kind = 'card_based'` exercise from
  `cards → grid_cells → track_id`, skipping archived rows, and leaves every
  `card_id is null` row untouched. It writes `cards.image_url` from the cell's
  artwork the same way. A header comment says the table is derived, in the
  style `20261009110001` uses, or somebody will hand-edit it.

**Found hazard, and it has to be solved here.** `cards.image_url` holds a
bundle-relative path today (`assets/web/cards/mc-01.webp`) and `fromRoot()` in
`lib/assets.ts` makes it root-relative. An artwork in a bucket has neither
shape: a full public URL would bake the project ref into a content row, so the
same row could not be valid locally and on hosted. So `artworks.src` holds a
**bucket key** and a new `contentImageUrl()` beside `fromRoot()` resolves two
shapes — a bundle path, or a key it turns into `${SUPABASE_URL}/storage/v1/
object/public/artworks/…`. One function, unit-tested, and the nine existing
paths keep working untouched. `exercises.image_url` and `user_types.image_url`
are why both shapes have to survive anyway.

**Verify**: `supabase db reset`, then `pnpm test:db`. From one session (rule 9).

## 2 · M.1 — the import migration

`<stamp>_maintenance_import.sql`. **The last file that ever states deck
content.**

The 25 cells; the nine coordinates from the PRD's §5 once signed off; nine
`artworks` rows and their `artwork_i18n` (alt null in **both** locales, which
is data and not a hole); `grid_cells.track_id` read out of today's
`exercise_tracks` for `mindfulness-cards`; `grid_cells.artwork_id` read out of
today's `cards.image_url`. It writes no feelings and deletes none.

Then it calls `project_deck()` and **asserts the result**: a `do` block that
compares `exercise_tracks` before and after and raises if a single row moved.
The import is correct if and only if the projection reproduces the current deck
exactly, and that is cheap to prove inside the transaction that does it.

It writes no `content_edits` row. The history starts when a person does
something; an import is the floor it stands on, and `before` for the first real
edit is the imported state.

The nine `.webp` files go into the bucket by a small `pnpm artwork:upload`,
built on `music-upload.mjs`'s shape — read from outside the repo, mint a hashed
key, write the keys back — and its output supplies the `src` values this
migration states. Same order as `music:upload` then `music:migration` today.
Cheaper fallback if that is a step too many: the import points `artworks.src`
at the existing bundle paths and the bucket fills as artwork is replaced
through the UI. The resolver handles both shapes regardless.

**Verify**: `supabase db reset`, `pnpm test:db`, and the app still draws nine
cards with the same music behind them.

## 3 · M.2 — the pure modules

Four dependency-free modules under `apps/web/src/lib/`, which is what lets both
the browser and a Deno function import them:

- `deckRules.ts` — `cardIdFor(code)`, `isCode(code)`, `nextFreeCode(taken)`,
  the `MC` prefix and the 99 ceiling as named constants, the cell range,
  `validateCard`, `validateTrack`, `validateArtwork`, the
  both-locales-or-neither rule for alt text, and the contiguity rule for
  `sort`. `deck.test.ts` is re-pointed at it so the rules have one home rather
  than two, and its three feeling rules are deleted.
- `cardScanUrl.ts` — `cardScanUrl(code, baseUrl)`, the single definition of
  what a printed QR encodes. `/dev/qr`, `deck:pdf` and the maintenance screen
  all call it; today each builds its own string. This is the QR seam, and it is
  four lines plus a test.
- `audioDuration.ts` — the `mvhd` / MP3-frame-plus-Xing measurer lifted out of
  `music-upload.mjs`, which deliberately has no ffprobe dependency and
  therefore ports as-is. The script imports it too, so there is one measurer.
- `audioTags.ts` — its counterpart, reading the file's own metadata: ID3v2
  frames for MP3 (`TIT2`, `TPE1`, `TALB`, `TDRC`/`TYER`, `TBPM`) and `ilst`
  atoms for MP4 and AAC. Dependency-free like its neighbour, and it walks the
  same header the measurer already walks. This is what makes an upload fill in
  its own form, and it is the one genuinely new piece of parsing in the plan.

**Verify**: `pnpm check`. No database involved, which is the point of
extracting them.

## 4 · M.3 — the function

`supabase/functions/content-admin/index.ts`, built on `reveal-track`'s shape:
the same CORS block (dev is a Vite server on another port), the same
`asCaller.auth.getUser()` rather than decoding a JWT by hand, the same
one-answer-for-two-failures discipline.

- `MAINTAINERS` — the allowlist, lower-cased: both spellings of Ben's address,
  and one line per tester added since (Lucia, 2026-10-14).
  An empty string never matches, because that is what an anonymous user's email
  is.
- One POST envelope, `{ action, payload }`. `read.all`, `card.create`,
  `card.save`, `track.save`, `artwork.save`, `cell.set`, `archive`,
  `history.list`, `revert`, `upload.sign`, `upload.finish`. There is no
  `delete` action at any level.
- **The actor is taken from the verified JWT and never from the payload.** It
  is what lands in `content_edits.actor_email`, so a client that could name
  itself could forge the log.
- Every write validates with `deckRules`, then calls the matching `rpc`. The
  **gate lives in TypeScript, the invariants live in SQL** — the function
  decides who may ask, the SQL function decides what a valid write is and keeps
  the row, the history entry and the projection in one transaction.
- `upload.sign` returns a signed upload URL into the right bucket, with a key
  the server mints. `upload.finish` reads the object back with the service
  role, measures it with `audioDuration`, and writes `src` and
  `duration_seconds`. A duration the client sends is ignored, and a key the
  client sends is refused.

**Verify**: `pnpm test:db` gains a file that drives the function with three
identities — the allowlisted account, a signed-in account that is not on the
list, and no token at all — and asserts that only the first one writes. Deploy
is `supabase functions deploy content-admin`, by hand, as the other two are.

## 5 · M.4 — the client

`apps/web/src/lib/maintenanceApi.ts` — the action union and its payload and
response types, which is also the contract §10 calls the one parallel seam —
plus `maintenance.ts` for the calls and the two upload flows. Images are
resized to 768 × 768 WebP on a canvas before the PUT; audio is PUT as it is.

**Verify**: `pnpm check` for the pure parts; the rest is verified by the walk
in M.5.

## 6 · M.5 — the screens

`apps/web/src/routes/Maintenance.tsx`, `maintenance.css`, and one route entry —
`lazy`, like the other three tools, because nothing here should land in a
visitor's first paint. The route gate reads the session's email and shows a
refusal otherwise; the refusal that matters is the function's.

Order: the grid, then the three libraries, then the forms, then the history.
The music form is the biggest of the three and the only one holding three kinds
of field at once — written, offered by the file, and read-only fact — so it
gets the grouping the PRD's §6.1 describes rather than a flat run of inputs,
and the music list sorts by tempo as well as by title.
The grid answers the question the brief asked and the libraries exist to feed
it. §0 lists which component draws what.

**The history is not a screen at the end — it is a panel on every detail view**
(PRD §7), plus one global log. Each line: the email, the time, what moved, and
a *Revert* action. A reverted edit is marked, and so is the revert. Strings are
inline and English, with the exemption written into the file header the way
`DevQrSheet.tsx` writes its own.

The card detail view carries the scan target as text (`cardScanUrl`), which is
the seam a QR generator docks onto and costs one line today.

**Verify**: the walk in the PRD's §17, in `pnpm --filter web dev`, after
checking what is already on port 5173 (rule 9).

## 7 · M.6 — export, pull, retiring the generators, and the printer

- `pnpm deck:export` — reads a database and writes both snapshots:
  `deck.json` in today's shape **minus `feeling`** and plus the coordinates,
  and `music.json`'s `pieces` with the six new fields. It leaves the `cuts`
  array alone, because that half stays hand-written. Byte-stable: sorted keys,
  so running it twice with no change produces no diff.
- `pnpm content:pull` — the same read against hosted, applied to the local
  stack, because `db reset` now yields factory content rather than live.
- `deck.mjs` — its three feeling rules go, since the field no longer exists in
  the file it validates.
- `deck-pdf.mjs` — the front was *artwork where there is any, the feeling set
  in type where there is not*. With no feeling, it becomes artwork or a
  refusal: the script names the cards that have none and exits, rather than
  printing blanks. This is the only way the printer changes.
- `pnpm deck:migration` — **retired**. It refuses with a message naming
  `/maintenance` and this plan.
- `pnpm music:migration` — **cuts only**. The `tracks` half comes out. This is
  the overlap that would otherwise silently clobber a UI edit, and it is the
  single most important line of this step.

**Verify**: export, then `pnpm deck:pdf` on a deck where all nine have artwork,
then `deck.test.ts` on the exported file; `deck:migration` refuses; `db reset`
plus `content:pull` reproduces live.

## 8 · M.7 — the two database tests, re-aimed

`deck.db.test.ts` and `music.db.test.ts` stop asserting that the database
equals a file and start asserting that it obeys the deck's rules: ids derived
from codes, every code inside `MC-01…MC-99`, `sort` contiguous, one card per
cell, no cell pointing at an archived row, no projected `exercise_tracks` row
disagreeing with its cell, and every `card_id is null` row still present.

Two new ones that matter more than the rest:

- **Every write leaves exactly one history row**, with the right actor, and the
  `after` matching the row as it now stands.
- **A revert restores the `before` and appends rather than erases**, and a
  revert of a revert returns to where it started. If that passes, PRD §7 is
  real rather than described.

They keep reading `deckRules`, so the rules are asserted in `pnpm check` and
enforced in `pnpm test:db` from one definition.

**Verify**: against the local stack, then against hosted with the three keys
passed for one run — which is how the `service_role` hole was found in
September.

## 9 · M.8 — the documents, and one of them is load-bearing

**`CLAUDE.md` rule 4 must change in the same branch.** It currently says
content lives in a migration, and after this it does not for four tables. An
agent reading the unamended rule will regenerate a deck migration and overwrite
live content — exactly the failure rule 4 exists to prevent, arriving through
the door this change opens. The amendment says: schema by migration, content
for cards, tracks, artworks and the grid in the database, `deck.json` as an
export, the two retired generators named, and the history as where a content
change's reason now lives.

Then: `supabase/content/README.md` (the loop at the top is no longer the loop,
and the deck's fields lose `feeling`), `DOMAIN-MODEL.md` (the grid, the code
rules, `exercise_tracks` as derived), `apps/web/OPEN-QUESTIONS.md` (the copy
exemption, the `musie-grid` pattern as a component request, the `card_i18n`
follow-up, and whatever the build turned up), `BUILD-PLAN.md` (a phase and its
*done when*).

**The follow-up, written down rather than done**: once `digital-cards`,
`digital-cards-build`, `feelings-detection-help`, `listen-infographic` and
`maintenance-day` have landed, one migration drops `card_i18n` entirely and
`content.ts` stops selecting it. That is a one-statement change that cannot be
made today without breaking five worktrees in files they did not touch.

## 10 · Subagents: where they help, where they collide

Rule 9 answers most of this, and the answer is not flattering to fan-out:
**everything that writes happens in one session.** One Postgres behind every
worktree, one port 5173 behind every verification, migration timestamps that
interleave by wall clock, and a subagent that inherits the directory rather
than the conversation.

Three places they are worth the tokens:

**A · Read-only fan-out, before anything is written.** Five `Explore` agents in
one message, one question each, nothing to collide over — and each answer
changes what gets written:

1. Every read of `exercise_tracks` across `apps/web` and the five live
   worktrees. Confirms the projection keeps all of them working, which is the
   premise of M.0.
2. Every read of an `image_url` and every path that resolves one. Confirms the
   `contentImageUrl()` seam is complete rather than nearly complete.
3. Every reader of `card_i18n` or `card.feeling` in the five worktrees. Sizes
   the follow-up in M.8 and confirms the staged drop breaks nobody today.
4. Every place a `/s/:code` URL is built. Produces `cardScanUrl`'s caller list
   instead of my guess at it.
5. Every document that asserts content travels by migration, and every
   unique-collision workaround already in the migrations. M.8's real list, and
   the house way of writing M.0's `sort` parking.

**B · An independent review at two gates**, given the diff and not my
conclusion, because both failures are silent:

1. After M.0 and M.1 — the migration against rule 2's *both* halves, rule 3,
   whether the projection really reproduces today's `exercise_tracks`, and
   whether the code trigger can be stepped around by any write path.
2. After M.3 — the function's boundary. Can a signed-in non-maintainer reach
   any write; does any path trust a client-supplied duration, key, email or
   actor; does any error distinguish *not yours* from *not there*; can a
   history row be written with somebody else's name.

`/code-review` covers both. This is the one place a second opinion buys
something real.

**C · One true parallel seam, and it costs a merge.** `maintenanceApi.ts` —
the action contract. Write it first and M.3 (the function) and M.5 (the
screens, against a stub) touch disjoint files and could run in two worktrees
off a `main` that already has M.0 and M.1.

Against it: the contract always changes once the first screen is built, and a
changed contract across two worktrees is a merge nobody wants; only one of the
two can verify in a browser, because there is one port 5173; and the two
sessions cannot both `db reset`. **Recommendation: sequential**, unless this
has to land in a day — in which case the split is M.3 against M.5 and nothing
else.

What a subagent must never do here: write a migration, run `supabase db reset`
or `pnpm gen:types` (both denied in `.claude/settings.json` for this reason),
or hold the dev server. And no `Workflow`: nothing here fans out far enough to
earn it.

## 11 · Size

| | |
|---|---|
| M.0 schema migration | 0.75 day — the projection, the revert function and rule 2's second half, written out |
| M.1 import migration | 0.5 day, including the artwork upload script |
| M.2 pure modules | 0.75 day — the three movers are quick; the tag reader is the one genuinely new piece of parsing |
| M.3 the function | 1 day, with its three-identity test |
| M.4 the client | 0.25 day |
| M.5 the screens | 1.75 days — the grid, three libraries, the forms and the history panel. One day of that is the grid and the libraries; `Field`, `PhotoUpload` and `DraggableList` already exist and the copy is exempt |
| M.6 export, pull, retire, printer | 0.5 day |
| M.7 the two db tests | 0.5 day — the history and revert assertions are the valuable half |
| M.8 the documents | 0.25 day, and `CLAUDE.md` is the part that matters |

**About six days**, sequential, one session. The read-only fan-out in §10 A
runs before day one and costs minutes; the two reviews in §10 B cost minutes
each and are the cheapest insurance in the list.

Blocked on one thing only: the nine coordinates in the PRD's §5.
