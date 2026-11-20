/**
 * `pnpm assets:check` — is every file an exercise plays or shows actually there?
 *
 * ── WHY THIS IS THE ONE THING CHECKED ON HOSTED ───────────────────────────
 * Ben, 2026-11-20: "Das Ziel ist, sicherzustellen dass die Assets (music,
 * images) die in Übungen eingebunden sind da sind. Alles andere ist egal."
 *
 * Until that day `db-push.yml` ran the whole database suite against hosted
 * after every merge. It wrote fixtures there, and one of them — `trk-98` —
 * was a real track of Lucia's by then; the run overwrote it and deleted it.
 * The suite had been red since 2026-10-13 for snapshot reasons, so nobody
 * saw. `pnpm test:db` is local-only now (`db.support.ts` refuses anything
 * else), and THIS is what runs on hosted: after every merge, and once a day,
 * because Lucia changes content at `/maintenance` without merging anything.
 *
 * ── IT ONLY READS ─────────────────────────────────────────────────────────
 * Selects and bucket listings, with the service role because the `tracks`
 * bucket is private and `tracks.src` is withheld from the client. Nothing is
 * inserted, updated, deleted or uploaded — there is no write call in this
 * file, and that is the property worth keeping when it grows.
 *
 * ── WHAT "AN EXERCISE USES IT" MEANS, ROW BY ROW ──────────────────────────
 *   cards               every card not archived: its picture, and both of
 *                       its pieces — activation and relaxation (2026-11-20).
 *                       A card with no relax piece yet is a NOTE: Lucia is
 *                       filling them in, and the listen step says so.
 *   exercises           every implemented exercise: its picture.
 *   exercise_cuts       every cut: the mix, the voice stem if it has one,
 *                       and the file of the piece it credits.
 *   instrument_samples  every sample: the file under `apps/web/public/`,
 *                       with the size and SHA-256 the row states.
 *
 * A card with NO piece is not a missing file — the listen step has an answer
 * for it — so it is reported as a note, never as a failure. A card whose
 * piece has no file, or whose file is not in the bucket, IS a failure: the
 * app would deal that card and play nothing.
 *
 * ── WHERE A PATH POINTS ───────────────────────────────────────────────────
 * The same rule `contentImageUrl` (`src/lib/assets.ts`) applies in the app:
 *   `art-07-a3f91b2c.webp`        an object in the public `artworks` bucket
 *   `assets/web/cards/mc-01.webp` a file committed under `apps/web/public/`
 *   `https://…`                   fetched with HEAD
 * A bundle path is checked against THIS checkout. In CI that is `main`, which
 * is what Cloudflare serves.
 *
 * ── TARGET ────────────────────────────────────────────────────────────────
 *   SUPABASE_TEST_URL=… SUPABASE_TEST_SERVICE_ROLE_KEY=… pnpm assets:check
 * Both or neither, as in `content-export.mjs`; with neither, the local stack
 * from `supabase status`. Locally it mostly reports what the factory content
 * lacks — the masters are an operator upload — so read a local run as a test
 * of this script, not of the deck.
 *
 * Exit 0: every file is there. 1: something is missing (listed). 2: could not
 * check — "I could not look" is never printed as "all there", which is
 * `db-status.mjs`'s rule and the reason it has three exit codes. Through
 * `pnpm` both failures arrive as 1; the last lines of the log say which.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(HERE, '..', 'public');

const TRACKS_BUCKET = 'tracks';
const ARTWORKS_BUCKET = 'artworks';

/** `contentImageUrl`'s test for an artwork object key. */
const ARTWORK_KEY = /^art-[0-9]{2,}-/;

/* ═══ WHERE TO READ FROM ════════════════════════════════════════════════════ */

function target() {
  const url = process.env.SUPABASE_TEST_URL;
  const key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;

  if (url && key) return { url, key, named: 'the environment' };
  if (url || key) {
    throw new Error('Set SUPABASE_TEST_URL and SUPABASE_TEST_SERVICE_ROLE_KEY together, or neither.');
  }

  const status = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' }));
  return { url: status.API_URL, key: status.SERVICE_ROLE_KEY, named: 'the local stack' };
}

/** A failed read is "could not check", never "nothing to check". */
class CouldNotCheck extends Error {}

async function read(query, what) {
  const { data, error } = await query;
  if (error !== null) throw new CouldNotCheck(`${what}: ${error.message}`);
  return data ?? [];
}

/* ═══ BUCKETS ═══════════════════════════════════════════════════════════════ */

/**
 * Every object in a bucket folder, as key → size. One listing per folder, so
 * a hundred tracks cost one request rather than a hundred.
 */
async function listFolder(db, bucket, folder) {
  const found = new Map();
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db.storage.from(bucket).list(folder, { limit: PAGE, offset });
    if (error !== null) throw new CouldNotCheck(`listing ${bucket}/${folder}: ${error.message}`);
    for (const object of data ?? []) {
      /* A folder comes back as an entry with no id; it is not a file. */
      if (object.id === null) continue;
      const key = folder === '' ? object.name : `${folder}/${object.name}`;
      found.set(key, object.metadata?.size ?? 0);
    }
    if ((data ?? []).length < PAGE) return found;
  }
}

function bucketChecker(db, bucket) {
  const folders = new Map();
  return async (key) => {
    const folder = key.includes('/') ? key.slice(0, key.lastIndexOf('/')) : '';
    if (!folders.has(folder)) folders.set(folder, listFolder(db, bucket, folder));
    const objects = await folders.get(folder);
    if (!objects.has(key)) return `not in the ${bucket} bucket`;
    if (objects.get(key) === 0) return `empty object in the ${bucket} bucket`;
    return null;
  };
}

/* ═══ ONE PATH ══════════════════════════════════════════════════════════════ */

function publicFile(path) {
  const file = join(PUBLIC_DIR, path.replace(/^\/+/, ''));
  if (!existsSync(file)) return { problem: `no file at apps/web/public/${path.replace(/^\/+/, '')}` };
  return { file };
}

async function headOk(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok ? null : `HEAD ${url} answered ${response.status}`;
  } catch (thrown) {
    return `HEAD ${url} failed: ${thrown instanceof Error ? thrown.message : String(thrown)}`;
  }
}

/** Where an image path points, by `contentImageUrl`'s rule. Null when it is there. */
async function imageProblem(path, artworkObject) {
  if (/^(https?:)?\/\//.test(path)) return headOk(path.startsWith('//') ? `https:${path}` : path);
  if (ARTWORK_KEY.test(path)) return artworkObject(path);
  return publicFile(path).problem ?? null;
}

/* ═══ THE CHECK ═════════════════════════════════════════════════════════════ */

async function check(db) {
  const missing = [];
  const notes = [];
  let checked = 0;

  const trackObject = bucketChecker(db, TRACKS_BUCKET);
  const artworkObject = bucketChecker(db, ARTWORKS_BUCKET);

  const tracks = await read(db.from('tracks').select('id, src'), 'tracks');
  const srcOf = new Map(tracks.map((track) => [track.id, track.src]));

  /** A piece an exercise plays: the row has a file, and the file is there. */
  async function piece(trackId, who) {
    checked += 1;
    const src = srcOf.get(trackId);
    if (src === undefined) return missing.push(`${who}: plays ${trackId}, which is not a track`);
    if (src === null || src.trim() === '') return missing.push(`${who}: plays ${trackId}, which has no file`);
    const problem = await trackObject(src);
    if (problem !== null) missing.push(`${who}: plays ${trackId} (${src}) — ${problem}`);
  }

  async function picture(path, who) {
    checked += 1;
    const problem = await imageProblem(path, artworkObject);
    if (problem !== null) missing.push(`${who}: picture ${path} — ${problem}`);
  }

  /* ── Cards ───────────────────────────────────────────────────────────── */
  const cards = await read(
    db.from('cards')
      .select('id, code, image_url, activation_track_id, relax_track_id')
      .is('archived_at', null)
      .order('sort'),
    'cards',
  );

  for (const card of cards) {
    if (card.image_url === null) missing.push(`${card.code}: has no picture`);
    else await picture(card.image_url, card.code);

    for (const [mode, trackId] of [['activate', card.activation_track_id], ['relax', card.relax_track_id]]) {
      if (trackId === null) notes.push(`${card.code}: no ${mode} piece yet`);
      else await piece(trackId, `${card.code} (${mode})`);
    }
  }

  /* ── Exercises ───────────────────────────────────────────────────────── */
  const exercises = await read(
    db.from('exercises').select('id, image_url').eq('implemented', true).order('sort'),
    'exercises',
  );
  for (const exercise of exercises) {
    if (exercise.image_url !== null) await picture(exercise.image_url, exercise.id);
  }

  /* ── Cuts ────────────────────────────────────────────────────────────── */
  const cuts = await read(
    db.from('exercise_cuts').select('id, mixed_src, voice_src, track_id').order('id'),
    'exercise_cuts',
  );
  for (const cut of cuts) {
    for (const [stem, src] of [['mix', cut.mixed_src], ['voice', cut.voice_src]]) {
      if (src === null) continue;
      checked += 1;
      const problem = await trackObject(src);
      if (problem !== null) missing.push(`${cut.id}: ${stem} ${src} — ${problem}`);
    }
    if (cut.track_id !== null) await piece(cut.track_id, `${cut.id} credits`);
  }

  /* ── Instrument samples ──────────────────────────────────────────────── */
  const samples = await read(
    db.from('instrument_samples').select('instrument_id, file, path, bytes, sha256'),
    'instrument_samples',
  );
  for (const sample of samples) {
    checked += 1;
    const who = `${sample.instrument_id} ${sample.file}`;
    const { file, problem } = publicFile(sample.path);
    if (problem !== undefined) { missing.push(`${who}: ${problem}`); continue; }
    if (statSync(file).size !== sample.bytes) {
      missing.push(`${who}: ${sample.path} is ${statSync(file).size} bytes, the row says ${sample.bytes}`);
      continue;
    }
    const sha = createHash('sha256').update(readFileSync(file)).digest('hex');
    if (sha !== sample.sha256) missing.push(`${who}: ${sample.path} is not the file the row names (SHA-256 differs)`);
  }

  return { missing, notes, checked };
}

/* ═══ RUN ═══════════════════════════════════════════════════════════════════ */

async function main() {
  let where;
  try {
    where = target();
  } catch (thrown) {
    console.error(`[assets] could not check: ${thrown instanceof Error ? thrown.message : String(thrown)}`);
    return 2;
  }

  console.info(`[assets] target: ${where.url} (${where.named})`);
  const db = createClient(where.url, where.key, { auth: { persistSession: false, autoRefreshToken: false } });

  let result;
  try {
    result = await check(db);
  } catch (thrown) {
    console.error(`[assets] could not check: ${thrown instanceof Error ? thrown.message : String(thrown)}`);
    return 2;
  }

  for (const note of result.notes) console.info(`[assets] note: ${note}`);

  if (result.missing.length > 0) {
    console.error(`[assets] ${result.missing.length} of ${result.checked} files missing:`);
    for (const line of result.missing) console.error(`  · ${line}`);
    return 1;
  }

  console.info(`[assets] all ${result.checked} files are there.`);
  return 0;
}

process.exitCode = await main();
