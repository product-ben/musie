/**
 * The database → the snapshot files. The direction content used to travel in.
 *
 * ── WHAT CHANGED, AND WHY THIS EXISTS ─────────────────────────────────────
 * `supabase/content/deck.json` was the only place the deck was written by
 * hand, and a generator turned it into a migration. From 2026-10-14 the deck
 * is edited at `/maintenance` and lives in the database, so the arrow turns
 * round: the file is a SNAPSHOT, written by this script, and
 * `pnpm deck:migration` refuses.
 *
 * ── WHAT THE SNAPSHOT IS STILL FOR, WHICH IS THREE THINGS ─────────────────
 *   1. THE PRINTER. `deck:pdf` reads `deck.json` and nothing else. Print day
 *      is unaffected by any of this, which is most of the reason for keeping
 *      the file at all.
 *   2. A DIFF. Committing an export is how a deck change becomes something a
 *      person can read in `git log` — the thing a migration header used to
 *      do. It is no longer the record of WHY (that is `content_edits`, which
 *      names the operator), but it is still the record of WHAT.
 *   3. `pnpm content:pull`'s other half, eventually: `supabase db reset` now
 *      yields factory content rather than live, so a way to carry live
 *      content back to a local stack has to exist. Not built yet — the
 *      import migration reproduces the deck as it stood, so the gap only
 *      opens after the first real edit. Logged in OPEN-QUESTIONS.md.
 *
 * ── THE SHAPE OF deck.json DOES NOT MOVE ──────────────────────────────────
 * Byte-for-byte the same fields, in the same order, because `deck.mjs`
 * validates it, `deck.test.ts` asserts that validation, `deck.db.test.ts`
 * compares it against the database and `deck-pdf.mjs` prints from it. Four
 * readers is four reasons not to add a field here.
 *
 * So THE GRID GOES IN ITS OWN FILE, `grid.json`. It is new information — 25
 * cells, their music and their pictures — and inventing a place for it inside
 * a file four things already parse would be the sort of change that passes
 * every check and breaks the printer.
 *
 * ── IT IS BYTE-STABLE ─────────────────────────────────────────────────────
 * Everything is sorted and the JSON is written the same way every time, so
 * running this twice with nothing changed produces no diff. An export that
 * reorders a key on every run makes `git status` useless, and a tool nobody
 * trusts to be quiet is a tool nobody runs.
 *
 * USAGE
 *   pnpm content:export                    # the local stack
 *   SUPABASE_TEST_URL=… SUPABASE_TEST_SERVICE_ROLE_KEY=… pnpm content:export
 *
 * It prints its target first, like `pnpm test:db` and `music:upload` do: this
 * reads the CREDIT — `tracks.title`, `artist`, `licence_ref` — which no
 * client may, so it needs the service role and should never be aimed
 * somewhere by accident.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(HERE, '..', '..', '..', 'supabase', 'content');
const DECK_PATH = join(CONTENT, 'deck.json');
const MUSIC_PATH = join(CONTENT, 'music.json');
const GRID_PATH = join(CONTENT, 'grid.json');

const LOCALES = ['de', 'en'];

/** Which exercise's pairings `deck.json` records. Both card exercises carry
 *  identical ones — the projection writes them from one cell — so one of them
 *  has to be the authority, and it is the one the import read. */
const DECK_EXERCISES = ['free-rein', 'mindfulness-cards'];

/* ═══ WHERE TO READ FROM ════════════════════════════════════════════════════ */

function target() {
  const url = process.env.SUPABASE_TEST_URL;
  const key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;

  if (url && key) return { url, key, named: 'the environment' };

  /* ALL OR NOTHING, for the reason `db.support.ts` gives: a partial set means
     somebody meant to point this somewhere and got it half right, and
     silently exporting the local stack instead would overwrite the committed
     snapshot with the wrong deck. */
  if (url || key) {
    throw new Error(
      'Set SUPABASE_TEST_URL and SUPABASE_TEST_SERVICE_ROLE_KEY together, or neither.',
    );
  }

  const status = JSON.parse(
    execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' }),
  );
  return { url: status.API_URL, key: status.SERVICE_ROLE_KEY, named: 'the local stack' };
}

/* ═══ WRITING ═══════════════════════════════════════════════════════════════ */

/** Two spaces and a trailing newline, which is what the committed files have. */
function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

/** Both locales, always both keys — `null` where there is no row or no value. */
function byLocale(rows, idColumn, id, field) {
  const out = {};
  for (const locale of LOCALES) {
    const row = rows.find((r) => r[idColumn] === id && r.locale === locale);
    out[locale] = row ? (row[field] ?? null) : null;
  }
  return out;
}

async function main() {
  const { url, key, named } = target();
  console.log(`Reading ${named}: ${url}`);

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const read = async (table, select = '*') => {
    const { data, error } = await db.from(table).select(select);
    if (error) throw new Error(`${table}: ${error.message}`);
    return data;
  };

  const [cards, cardI18n, tracks, cells, artworks, artworkI18n, pairings] = await Promise.all([
    read('cards'),
    read('card_i18n'),
    read('tracks'),
    read('grid_cells'),
    read('artworks'),
    read('artwork_i18n'),
    read('exercise_tracks'),
  ]);

  /* ── deck.json, in exactly the shape it has always had ──────────────────── */

  const deck = {
    $note: JSON.parse(readFileSync(DECK_PATH, 'utf8')).$note,
    cards: [...cards]
      /* ARCHIVED CARDS ARE LEFT OUT. The snapshot is what the deck IS — it
         feeds a printer — and a retired card is not in the deck. Its row and
         its history stay in the database, which is where the record of it
         belongs. */
      .filter((card) => card.archived_at === null)
      .sort((a, b) => a.sort - b.sort)
      .map((card) => ({
        id: card.id,
        code: card.code,
        sort: card.sort,
        image: card.image_url,
        feeling: byLocale(cardI18n, 'card_id', card.id, 'feeling'),
        imageAlt: byLocale(cardI18n, 'card_id', card.id, 'image_alt'),
        plays: Object.fromEntries(
          DECK_EXERCISES
            .map((exercise) => [
              exercise,
              pairings.find((p) => p.card_id === card.id && p.exercise_id === exercise)?.track_id,
            ])
            .filter(([, trackId]) => trackId !== undefined),
        ),
      })),
  };

  /* ── music.json: the pieces are refreshed, the cuts are left alone ──────── */

  const music = JSON.parse(readFileSync(MUSIC_PATH, 'utf8'));
  music.pieces = [...tracks]
    .filter((track) => track.archived_at === null)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((track) => {
      const piece = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        licenceRef: track.licence_ref,
        file: track.src,
        durationSeconds: track.duration_seconds,
      };
      /* The six columns of 2026-10-14, written only where they hold
         something. A snapshot full of `"album": null` would be six new lines
         of noise per piece in every diff. */
      if (track.album !== null) piece.album = track.album;
      if (track.release_year !== null) piece.releaseYear = track.release_year;
      if (track.tempo_bpm !== null) piece.tempoBpm = track.tempo_bpm;
      if (track.mood_note !== null) piece.moodNote = track.mood_note;
      if (track.licence_type !== null) piece.licenceType = track.licence_type;
      if (track.catalogue_ref !== null) piece.catalogueRef = track.catalogue_ref;
      return piece;
    });

  /* ── grid.json, which is new ────────────────────────────────────────────── */

  const grid = {
    $note: 'THE GRID, EXPORTED. Written by pnpm content:export, never by hand — '
      + 'the grid is edited at /maintenance and lives in the database. This file '
      + 'is a snapshot so a deck change can be read in git log; nothing imports it.',
    cells: [...cells]
      /* Reading order: top row first, left to right, which is how the screen
         draws it — so a diff of this file reads like the grid looks. */
      .sort((a, b) => b.arousal - a.arousal || a.valence - b.valence)
      .map((cell) => {
        const card = cards.find((c) => c.valence === cell.valence
          && c.arousal === cell.arousal && c.archived_at === null);
        return {
          valence: cell.valence,
          arousal: cell.arousal,
          card: card ? card.code : null,
          track: cell.track_id,
          artwork: cell.artwork_id,
        };
      }),
    artworks: [...artworks]
      .filter((artwork) => artwork.archived_at === null)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((artwork) => ({
        id: artwork.id,
        src: artwork.src,
        alt: byLocale(artworkI18n, 'artwork_id', artwork.id, 'alt'),
      })),
  };

  writeJson(DECK_PATH, deck);
  writeJson(MUSIC_PATH, music);
  writeJson(GRID_PATH, grid);

  console.log([
    '',
    `  ${deck.cards.length} cards      → supabase/content/deck.json`,
    `  ${music.pieces.length} pieces     → supabase/content/music.json (cuts untouched)`,
    `  ${grid.cells.length} cells      → supabase/content/grid.json`,
    '',
    'Commit these when the change is one you want in git log. Nothing else',
    'reads them except deck:pdf and music:upload — the database is the source.',
    '',
  ].join('\n'));
}

main().catch((thrown) => {
  console.error(`\ncontent:export failed — ${thrown.message}\n`);
  process.exitCode = 1;
});
