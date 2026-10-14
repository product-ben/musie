/**
 * `supabase/content/music.json` → a new migration under `supabase/migrations/`.
 *
 * `deck-migration.mjs`'s sibling, and the same bargain: CLAUDE.md rule 4 is not
 * relaxed, it is made cheap. The output is an ordinary new file with an
 * ordinary new timestamp, reviewed and committed like any other, and nothing
 * here pushes anything anywhere.
 *
 * ── IT STATES THE WHOLE LIBRARY, NOT THE DIFFERENCE ───────────────────────
 * Every piece and every cut is upserted and whatever the file no longer
 * has is deleted. A migration carrying only the changed row would depend on the
 * database already being in the state the generator imagined — which is exactly
 * the assumption rule 4 exists because nobody can make it safely. Stating it in
 * full lands the same library whatever it finds, and is harmless applied twice.
 *
 * ── TWO TABLES, AND `exercise_tracks` IS NOT ONE OF THEM ──────────────────
 * `public.tracks` and `public.exercise_cuts`. The deck owns
 * `exercise_tracks`, so the two generators cannot delete each other's rows —
 * see `music.mjs`'s header for the partition.
 *
 * ── WHAT IT WILL NOT DO ───────────────────────────────────────────────────
 * Drop a piece or a cut without `--allow-removal`. Both are referenced by
 * `sessions` with `on delete restrict`, so deleting one that somebody played
 * fails loudly in Postgres — the flag exists so that failure is expected rather
 * than discovered halfway through a reset.
 *
 * USAGE
 *   node scripts/music-migration.mjs                    # or: pnpm music:migration
 *   node scripts/music-migration.mjs --name first-klangreise
 *   node scripts/music-migration.mjs --dry-run          # SQL to stdout, no file
 *   node scripts/music-migration.mjs --allow-removal
 *   node scripts/music-migration.mjs --force            # write even with no diff
 *
 * AFTERWARDS, and this script does none of it for you:
 *   supabase db reset   → every migration re-applied, this one included
 *   pnpm test:db        → music.db.test.ts proves the database matches the file
 *   supabase db push    → the hosted project
 */
import { execFile } from 'node:child_process';
import { readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import {
  MUSIC_IN_GIT, assertMusic, checkMusic, readMusic, rows,
} from './music.mjs';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const MIGRATIONS = join(REPO, 'supabase', 'migrations');

/* ── args ─────────────────────────────────────────────────────────────── */

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const name = token.slice(2);
    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith('--')) {
      args[name] = next;
      index += 1;
    } else {
      args[name] = true;
    }
  }
  return args;
}

/* ── SQL ──────────────────────────────────────────────────────────────── */

/** A Postgres literal. Doubling the quote is the whole of the escaping, and it
 *  is enough: every value here is text or a small integer from a JSON file this
 *  process just validated, never a string from a user. */
function lit(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

const tuple = (values) => `(${values.map(lit).join(', ')})`;
const valuesList = (tuples) => tuples.map((row) => `  ${row}`).join(',\n');

/** A long `in (…)` list, wrapped. One 1,400-character line is valid SQL and
 *  unreviewable, and these files are read in a diff. */
function wrapped(items, indent = '   ') {
  const lines = [];
  let line = '';
  for (const item of items) {
    const next = line === '' ? item : `${line}, ${item}`;
    if (next.length > 72 && line !== '') {
      lines.push(`${line},`);
      line = item;
    } else {
      line = next;
    }
  }
  if (line !== '') lines.push(line);
  return lines.length === 1 ? lines[0] : `\n${lines.map((l) => indent + l).join('\n')}`;
}

/* ── the difference, for the header ───────────────────────────────────── */

/** The committed library, or null when git cannot say — a fresh clone, a
 *  worktree without the file, no git at all. Never fatal: the summary is prose
 *  and the migration does not depend on it. */
async function committedMusic() {
  try {
    const { stdout } = await run('git', ['show', `HEAD:${MUSIC_IN_GIT}`], { cwd: REPO });
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

function summarise(before, after) {
  const lines = [];
  const was = rows(before);
  const now = rows(after);

  const byId = (list) => new Map(list.map((row) => [row.id, row]));

  const pieceWas = byId(was.tracks);
  const pieceNow = byId(now.tracks);
  for (const [id, piece] of pieceNow) {
    const old = pieceWas.get(id);
    if (old === undefined) {
      lines.push(`+ piece ${id} — ${piece.title} · ${piece.artist}`);
    } else if (old.src !== piece.src) {
      lines.push(`~ piece ${id} — ${old.src ?? 'silent'} → ${piece.src ?? 'silent'}`);
    } else if (old.duration_seconds !== piece.duration_seconds) {
      lines.push(`~ piece ${id} — ${old.duration_seconds}s → ${piece.duration_seconds}s`);
    } else if (old.title !== piece.title || old.artist !== piece.artist) {
      lines.push(`~ piece ${id} — re-credited`);
    }
  }
  for (const id of pieceWas.keys()) {
    if (!pieceNow.has(id)) lines.push(`− piece ${id}`);
  }

  const renWas = byId(was.exercise_cuts);
  const renNow = byId(now.exercise_cuts);
  for (const [id, cut] of renNow) {
    const old = renWas.get(id);
    if (old === undefined) {
      lines.push(`+ ${id} — ${cut.duration_seconds}s`
        + `${cut.voice_src === null ? ', no switch' : ''}`);
    } else if (old.mixed_src !== cut.mixed_src || old.voice_src !== cut.voice_src) {
      lines.push(`~ ${id} — re-exported`);
    } else if (old.duration_seconds !== cut.duration_seconds) {
      lines.push(`~ ${id} — ${old.duration_seconds}s → ${cut.duration_seconds}s`);
    } else if (old.intro_until !== cut.intro_until) {
      /* The one field a re-export does not move and a human does, so it gets
         its own line rather than hiding inside "re-exported". */
      lines.push(`~ ${id} — intro ${old.intro_until ?? 'none'} → ${cut.intro_until ?? 'none'}`);
    }
  }
  for (const id of renWas.keys()) {
    if (!renNow.has(id)) lines.push(`− ${id}`);
  }

  return lines;
}

function removedIds(before, after) {
  if (before === null) return [];
  const was = rows(before);
  const now = rows(after);
  const pieces = new Set(now.tracks.map((row) => row.id));
  const cuts = new Set(now.exercise_cuts.map((row) => row.id));
  return [
    ...was.tracks.map((row) => row.id).filter((id) => !pieces.has(id)),
    ...was.exercise_cuts.map((row) => row.id).filter((id) => !cuts.has(id)),
  ];
}

/* ── the file ─────────────────────────────────────────────────────────── */

function sql(music, summary, today, removals, known) {
  const { tracks, exercise_cuts: cuts } = rows(music);

  const cutIds = cuts.length === 0
    ? null
    : wrapped(cuts.map((row) => lit(row.id)));

  const head = [
    '-- ═══════════════════════════════════════════════════════════════════════════',
    `-- THE MUSIC LIBRARY, AS ${MUSIC_IN_GIT} HAS IT — ${today}`,
    '--',
    '-- GENERATED by apps/web/scripts/music-migration.mjs. Edit the JSON and run it',
    '-- again; editing this file leaves the two disagreeing, and music.db.test.ts',
    '-- is what notices.',
    '--',
    '-- It states the WHOLE set of cuts rather than the difference, so it lands',
    '-- the same cuts whatever it finds and is harmless applied twice.',
    '--',
    '-- IT WRITES `public.exercise_cuts` AND NOTHING ELSE. It used to state',
    '-- `public.tracks` as well; since 2026-10-14 the pieces are edited at',
    '-- /maintenance and live in the database, so a generated migration',
    '-- stating them would silently overwrite an operator edit on the next',
    '-- `db reset`. MAINTENANCE-UI.md §8 and CLAUDE.md rule 4.',
  ];

  if (summary.length > 0) {
    head.push('--', '-- WHAT CHANGED against the committed file:');
    for (const line of summary) head.push(`--   ${line}`);
  } else if (!known) {
    head.push(
      '--',
      '-- No committed file to compare against, so this says nothing about what',
      '-- changed. It states the library in full, which is correct either way.',
    );
  }

  if (removals.length > 0) {
    head.push(
      '--',
      `-- IT REMOVES ${removals.join(', ')}. Both tables are referenced by`,
      '-- `sessions` with `on delete restrict`, so this fails loudly if anybody',
      '-- ever played one — which is the right failure for a journal.',
    );
  }

  head.push('-- ═══════════════════════════════════════════════════════════════════════════');

  const parts = [head.join('\n')];

  parts.push(`
-- ── THE PIECES ARE NOT HERE ANY MORE ──────────────────────────────────────
-- ${tracks.length} piece(s) are declared in the file and this migration states
-- NONE of them. \`public.tracks\` is edited at /maintenance and lives in the
-- database from 2026-10-14; a migration stating it would put the file's
-- version back on the next \`supabase db reset\`, silently, which is exactly
-- the two-sources drift CLAUDE.md rule 4 exists to describe.
--
-- The \`pieces\` array in the file is a SNAPSHOT now, written by
-- \`pnpm content:export\`. It is still what the printer and the upload script
-- read, and it is still worth committing — it is just no longer the source.`);

  if (cutIds === null) {
    parts.push(`
-- ── THE CUTS ────────────────────────────────────────────────────────
-- None yet. The file carries an empty list, so this states that: every
-- cut the database has is one the library no longer declares.
delete from public.exercise_cuts;`);
  } else {
    parts.push(`
-- ── THE CUTS ────────────────────────────────────────────────────────
-- One row per produced recording of a listening exercise: the mix, and the
-- same cut without its music. A null posture or ending means the recording
-- serves any answer. The id is derived from all four, so the address and the
-- row cannot disagree.
insert into public.exercise_cuts
  (id, exercise_id, locale, posture, ending, mixed_src, voice_src, duration_seconds,
   intro_until, track_id)
values
${valuesList(cuts.map((row) => tuple([
    row.id, row.exercise_id, row.locale, row.posture, row.ending,
    row.mixed_src, row.voice_src, row.duration_seconds, row.intro_until, row.track_id,
  ])))}
on conflict (id) do update set
  exercise_id      = excluded.exercise_id,
  locale           = excluded.locale,
  posture          = excluded.posture,
  ending           = excluded.ending,
  mixed_src        = excluded.mixed_src,
  voice_src        = excluded.voice_src,
  duration_seconds = excluded.duration_seconds,
  intro_until      = excluded.intro_until,
  track_id         = excluded.track_id;

delete from public.exercise_cuts where id not in (${cutIds});`);
  }

  return `${parts.join('\n')}\n`;
}

/** A timestamp that sorts after every migration already on disk. */
async function stamp(existing) {
  const now = new Date();
  const pad = (value, width = 2) => String(value).padStart(width, '0');
  let candidate = [
    now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate()),
    pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds()),
  ].join('');

  const latest = existing.map((name) => name.slice(0, 14)).sort().at(-1);
  if (latest !== undefined && latest >= candidate) {
    candidate = String(BigInt(latest) + 1n);
  }
  return candidate;
}

const slugify = (value) =>
  String(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'update';

/* ── main ─────────────────────────────────────────────────────────────── */

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const music = assertMusic(await readMusic());
  /* STDERR, so `--dry-run` writes nothing but SQL to stdout and can be piped
     straight into psql. A warning on stdout made the first run of this script
     emit a file that began with a bullet point. */
  for (const warning of checkMusic(music).warnings) console.warn(`  · ${warning}`);

  const before = await committedMusic();
  const summary = before === null ? [] : summarise(before, music);
  const removals = removedIds(before, music);

  if (removals.length > 0 && args['allow-removal'] !== true) {
    throw new Error(
      `The library drops ${removals.join(', ')}. Both tables are referenced by sessions with `
        + '`on delete restrict`, so this fails against any run that played one. '
        + 'Pass --allow-removal if that is the intention.',
    );
  }

  /* NO COMMITTED FILE IS NOT AN EMPTY DIFF. Unknown is unknown: say so, and
     make the writer say --force — the trap `deck-migration.mjs` fell into on
     its own first run. */
  if (before === null && args.force !== true && args['dry-run'] !== true) {
    console.log(
      `There is no committed ${MUSIC_IN_GIT} to compare against, so nothing can honestly be\n`
        + 'said about what changed. Commit it first and edit it after — or pass --force to\n'
        + 'write a migration that simply states the library in full.',
    );
    return;
  }

  if (before !== null && summary.length === 0 && args.force !== true && args['dry-run'] !== true) {
    console.log(
      `The library matches the committed ${MUSIC_IN_GIT}, so there is nothing to generate.\n`
        + 'Edit it first — or pass --force to restate it anyway.',
    );
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const body = sql(music, summary, today, removals, before !== null);

  if (args['dry-run'] === true) {
    console.log(body);
    return;
  }

  const files = (await readdir(MIGRATIONS)).filter((name) => name.endsWith('.sql'));
  const name = `${await stamp(files)}_music_${slugify(args.name ?? 'update')}.sql`;
  await writeFile(join(MIGRATIONS, name), body, 'utf8');

  console.log(`supabase/migrations/${name}\n`);
  for (const line of summary) console.log(`  ${line}`);
  console.log(
    `${summary.length > 0 ? '\n' : ''}Next, and none of it happens on its own:\n`
      + '  supabase db reset   re-applies every migration, this one last\n'
      + '  pnpm test:db        proves the database now matches music.json\n'
      + '  supabase db push    sends it to the hosted project',
  );
}

main().catch((thrown) => {
  console.error(`[musie] ${thrown instanceof Error ? thrown.message : String(thrown)}`);
  process.exitCode = 1;
});
