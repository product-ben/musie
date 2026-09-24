/**
 * `supabase/content/deck.json` → a new migration under `supabase/migrations/`.
 *
 * ── THE PROBLEM THIS SOLVES ───────────────────────────────────────────────
 * CLAUDE.md rule 4: migrations STACK, and an applied one is never edited —
 * Supabase records it by timestamp, so an edit is skipped in silence and local
 * and hosted drift apart while every check stays green. That rule is right and
 * it makes changing a word on a card cost a hand-written SQL file. Nine cards
 * across three tables, two locales and two exercises is 45 rows, and the last
 * deck migration had to park a unique column to avoid a mid-statement
 * collision. None of that should be retyped to rename a feeling.
 *
 * So the deck is one JSON file, and this turns an edit of it into the
 * migration rule 4 demands. The rule is not bent: the output is an ordinary
 * new file with an ordinary new timestamp, reviewed and committed like any
 * other, and nothing here pushes anything anywhere.
 *
 * ── IT STATES THE WHOLE DECK, RATHER THAN THE DIFFERENCE ──────────────────
 * Every generated migration upserts all nine cards, all eighteen i18n rows and
 * every pairing, then deletes what the deck no longer has. A migration that
 * carried only the changed row would be smaller and would depend on the
 * database already being in the state the generator imagined — which is
 * exactly the assumption rule 4 exists because nobody can make safely. A full
 * statement lands the same deck whatever it finds, and is idempotent if it
 * runs twice.
 *
 * The header still says what CHANGED, and that summary comes from `git show
 * HEAD:supabase/content/deck.json` — the committed deck against the one on
 * disk. It is prose, not correctness: if two edits are generated as one
 * migration the summary names both, and if someone commits the deck before
 * generating, the summary is empty while the migration is still complete.
 * `deck.db.test.ts` is what actually proves the database matches the file.
 *
 * ── WHAT IT WILL NOT DO ───────────────────────────────────────────────────
 * Drop a card without `--allow-removal`. `sessions.card_id` is `on delete set
 * null`, so deleting a card silently empties the card from every diary entry
 * that ever drew it. That is a product decision, not a content edit.
 *
 * USAGE
 *   node scripts/deck-migration.mjs                      # or: pnpm deck:migration
 *   node scripts/deck-migration.mjs --name anger-rewrite
 *   node scripts/deck-migration.mjs --dry-run            # SQL to stdout, no file
 *   node scripts/deck-migration.mjs --allow-removal
 *   node scripts/deck-migration.mjs --force              # write even with no diff
 *
 * AFTERWARDS, and this script does none of it for you:
 *   supabase db reset   → every migration re-applied, this one included
 *   pnpm test:db        → CLAUDE.md rule 4; deck.db.test.ts is in there
 *   supabase db push    → the hosted project
 */
import { execFile } from 'node:child_process';
import { readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { LOCALES, assertDeck, ordered, readDeck, rows } from './deck.mjs';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const MIGRATIONS = join(REPO, 'supabase', 'migrations');
const DECK_IN_GIT = 'supabase/content/deck.json';

/** `--flag value` pairs and bare `--flag` switches. */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    /* A bare `--` is pnpm's separator arriving as an argument, not a flag. */
    if (!arg.startsWith('--') || arg === '--') continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[arg.slice(2)] = true;
    } else {
      args[arg.slice(2)] = next;
      i += 1;
    }
  }
  return args;
}

/* ── SQL ──────────────────────────────────────────────────────────────── */

/** A Postgres literal. Doubling the quote is the whole of the escaping, and it
 *  is enough: every value here is text or a small integer from a JSON file
 *  this process just validated, never a string from a user. */
function lit(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

const tuple = (values) => `(${values.map(lit).join(', ')})`;

/** `values (…), (…)` indented as the rest of the file sets rows. */
const valuesList = (tuples) => tuples.map((row) => `  ${row}`).join(',\n');

/** A long `in (…)` list, wrapped. One 1,400-character line is valid SQL and
 *  unreviewable, and these files are read in a diff. */
function wrapped(items, indent = '   ') {
  const lines = [];
  let line = '';
  for (const item of items) {
    const next = line === '' ? item : `${line}, ${item}`;
    if (next.length > 72 && line !== '') {
      lines.push(line + ',');
      line = item;
    } else {
      line = next;
    }
  }
  if (line !== '') lines.push(line);
  return lines.length === 1 ? lines[0] : `\n${lines.map((l) => indent + l).join('\n')}`;
}

/* ── the difference, for the header ───────────────────────────────────── */

/** The committed deck, or null when git cannot say — a fresh clone with no
 *  commit, a worktree without the file, no git at all. Never fatal: the
 *  summary is prose and the migration does not depend on it. */
async function committedDeck() {
  try {
    const { stdout } = await run('git', ['show', `HEAD:${DECK_IN_GIT}`], { cwd: REPO });
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

/** Human lines describing deck → next, in the order a reader wants them. */
function summarise(before, after) {
  const was = new Map(ordered(before ?? { cards: [] }).map((card) => [card.id, card]));
  const now = new Map(ordered(after).map((card) => [card.id, card]));
  const lines = [];

  for (const [id, card] of now) {
    const old = was.get(id);
    if (old === undefined) {
      lines.push(`ADDED    ${id} · ${card.code} · ${LOCALES.map((l) => card.feeling[l]).join(' / ')}`);
      continue;
    }
    for (const locale of LOCALES) {
      if (old.feeling?.[locale] !== card.feeling[locale]) {
        lines.push(`CHANGED  ${id} · feeling.${locale} · ${old.feeling?.[locale] ?? 'nothing'} → ${card.feeling[locale]}`);
      }
      if ((old.imageAlt?.[locale] ?? null) !== (card.imageAlt?.[locale] ?? null)) {
        lines.push(`CHANGED  ${id} · imageAlt.${locale} · ${old.imageAlt?.[locale] ?? 'null'} → ${card.imageAlt?.[locale] ?? 'null'}`);
      }
    }
    if (old.code !== card.code) lines.push(`CHANGED  ${id} · code · ${old.code} → ${card.code}  ← REPRINT: the QR on the paper card carries this`);
    if (old.sort !== card.sort) lines.push(`CHANGED  ${id} · sort · ${old.sort} → ${card.sort}`);
    if ((old.image ?? null) !== (card.image ?? null)) lines.push(`CHANGED  ${id} · image · ${old.image ?? 'null'} → ${card.image ?? 'null'}`);

    const exercises = new Set([...Object.keys(old.plays ?? {}), ...Object.keys(card.plays ?? {})]);
    for (const exercise of [...exercises].sort()) {
      const from = old.plays?.[exercise];
      const to = card.plays?.[exercise];
      if (from === to) continue;
      if (from === undefined) lines.push(`CHANGED  ${id} · plays.${exercise} · now ${to}`);
      else if (to === undefined) lines.push(`CHANGED  ${id} · plays.${exercise} · no longer paired (was ${from})`);
      else lines.push(`CHANGED  ${id} · plays.${exercise} · ${from} → ${to}`);
    }
  }

  for (const id of was.keys()) {
    if (!now.has(id)) lines.push(`REMOVED  ${id} · ${was.get(id).code}`);
  }

  return lines;
}

const removedIds = (before, after) => {
  const now = new Set((after.cards ?? []).map((card) => card.id));
  return (before?.cards ?? []).map((card) => card.id).filter((id) => !now.has(id));
};

/* ── the file ─────────────────────────────────────────────────────────── */

const comment = (lines) => lines.map((line) => (line ? `-- ${line}` : '--')).join('\n');

const RULE = '═'.repeat(75);

function header(summary, today, removals, known) {
  /* Three cases, and the third is why this is not a ternary. A deck that has
     never been committed has no baseline, which is NOT the same as an empty
     diff, and a header that said "nothing changed" would be claiming to know
     something git was never asked. */
  const changes = !known
    ? ['Unknown. There was no committed supabase/content/deck.json to compare',
       'against when this was generated, so nothing is claimed about what moved.',
       'The deck below is the whole of it, which is true either way.']
    : summary.length > 0
      ? summary
      : ['Nothing, against the committed deck.json. The deck is restated in full',
         'and applying this is a no-op — which is what --force was for.'];

  return `${comment([
    RULE,
    'THE DECK — GENERATED FROM supabase/content/deck.json',
    '',
    `Written ${today} by apps/web/scripts/deck-migration.mjs. Do not hand-edit it,`,
    'and do not edit the deck in Studio either: both drift from deck.json, and',
    '`deck.db.test.ts` goes red when they do. Change the JSON and generate again.',
    '',
    '── WHAT THIS CHANGES ─────────────────────────────────────────────────────',
    ...changes,
    '',
    '── IT STATES THE WHOLE DECK, NOT THE DIFFERENCE ──────────────────────────',
    'Every row is upserted and anything the deck no longer has is deleted, so',
    'this lands the same deck whatever state it finds and is safe to re-apply.',
    'A migration carrying only the changed row would depend on the database',
    'already being where the generator imagined — the assumption CLAUDE.md',
    'rule 4 exists because nobody can make it safely.',
    '',
    '── WHY THE FIRST STATEMENT LOOKS DESTRUCTIVE ─────────────────────────────',
    '`cards.sort` is `unique` and NOT deferrable, so Postgres checks it as each',
    'ROW is written rather than at the end of the statement. Two cards swapping',
    'places collide halfway through an upsert that ends perfectly valid — the',
    'same trap 20260923150000 hit on `exercises.sort`. So the order is parked',
    'out of range first and every card is given its real place back below. A',
    'row still parked at the end is a card this deck no longer has, and the',
    'delete is what collects it.',
    ...(removals.length > 0
      ? ['',
         '── THIS MIGRATION DELETES CARDS, AND THAT REACHES THE DIARY ──────────────',
         `Removed: ${removals.join(', ')}.`,
         '`sessions.card_id` is `on delete set null`, so every past session that',
         'drew one of these keeps its row and loses the card it drew. Generated',
         'with --allow-removal, which exists so this cannot happen by accident.']
      : []),
    RULE,
  ])}`;
}

function sql(deck, summary, today, removals, known) {
  const { cards, card_i18n, exercise_tracks } = rows(deck);

  const ids = wrapped(cards.map((card) => lit(card.id)));
  const i18nKeys = wrapped(card_i18n.map((row) => `(${lit(row.card_id)}, ${lit(row.locale)})`));
  const pairKeys = wrapped(exercise_tracks.map((row) => `(${lit(row.exercise_id)}, ${lit(row.card_id)})`));

  return `${header(summary, today, removals, known)}


${comment([`═══ 1 · PARKING THE ORDER ${'═'.repeat(48)}`,
  'Out of the way of the values below, inside this migration\'s transaction —',
  'nothing observes the parked state, because no client reads between two',
  'statements of one migration.',
  '',
  '`cards.code` is unique too and is NOT parked, which is deliberate: `id` is',
  '`code` in lower case and `id` is the conflict key, so a code cannot move',
  'from one row to another. Renaming a card is a delete and an insert, and',
  'those do not collide.'])}
update public.cards set sort = sort + 1000;


${comment([`═══ 2 · THE DECK ${'═'.repeat(56)}`,
  `${cards.length} cards, in deck order.`])}
insert into public.cards (id, code, image_url, sort) values
${valuesList(cards.map((card) => tuple([card.id, card.code, card.image_url, card.sort])))}
on conflict (id) do update set
  code      = excluded.code,
  image_url = excluded.image_url,
  sort      = excluded.sort;

${comment(['Anything still parked is a card the deck no longer lists.'])}
delete from public.cards where id not in (${ids});


${comment([`═══ 3 · THE FEELINGS ${'═'.repeat(52)}`,
  'A card carries its feeling and nothing else that reads: the listening',
  'instruction and the reflection question follow the exercise. image_alt is',
  'null in BOTH locales or written in both — null in one is a dropped',
  'translation, which is what public.missing_translations exists to report.'])}
insert into public.card_i18n (card_id, locale, feeling, image_alt) values
${valuesList(card_i18n.map((row) => tuple([row.card_id, row.locale, row.feeling, row.image_alt])))}
on conflict (card_id, locale) do update set
  feeling   = excluded.feeling,
  image_alt = excluded.image_alt;

${comment(['Deleting a card cascades to its rows here; this catches the other case,',
  'a LOCALE a card no longer carries.'])}
delete from public.card_i18n where (card_id, locale) not in (${i18nKeys});


${comment([`═══ 4 · WHAT EACH CARD PLAYS ${'═'.repeat(44)}`,
  'One row per (exercise, card). The same card plays a different file in a',
  'different exercise, which is what the tracks/exercise_tracks split is for.',
  '',
  'A track id that does not exist fails HERE, on the foreign key, during',
  '`supabase db reset` — which is why the generator does not try to check it.'])}
${exercise_tracks.length === 0
  ? '-- The deck pairs no card with any exercise.'
  : `insert into public.exercise_tracks (exercise_id, card_id, track_id) values
${valuesList(exercise_tracks.map((row) => tuple([row.exercise_id, row.card_id, row.track_id])))}
on conflict on constraint exercise_tracks_one_per_pair do update set
  track_id = excluded.track_id;`}

${comment(['`card_id is not null` is load-bearing. A NULL card_id is a cardless',
  'exercise\'s OWN track — Atempartitur, Bodyscan — which is not the deck\'s and',
  'must survive every deck edit untouched.'])}
delete from public.exercise_tracks
 where card_id is not null${exercise_tracks.length === 0 ? ';' : `
   and (exercise_id, card_id) not in (${pairKeys});`}
`;
}

/* ── the timestamp ────────────────────────────────────────────────────── */

/** `YYYYMMDDHHMMSS`, UTC, and never behind a migration already on disk —
 *  Supabase orders by this string, and a file that sorts earlier than one
 *  already applied is one the remote will never run. */
async function stamp(files, now = new Date()) {
  const pad = (value, width = 2) => String(value).padStart(width, '0');
  const mine =
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;

  const latest = files
    .map((name) => name.slice(0, 14))
    .filter((value) => /^\d{14}$/.test(value))
    .sort()
    .at(-1);

  if (latest === undefined || mine > latest) return mine;
  /* The repo's timestamps are dated ahead of the wall clock more than once.
     A second past the newest keeps the order true without inventing a date. */
  return String(BigInt(latest) + 1n);
}

const slugify = (value) =>
  String(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'update';

/* ── main ─────────────────────────────────────────────────────────────── */

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const deck = assertDeck(await readDeck());
  const before = await committedDeck();
  /* An unknown baseline produces no summary at all, rather than a summary
     that reads every card as new. */
  const summary = before === null ? [] : summarise(before, deck);
  const removals = removedIds(before, deck);

  if (removals.length > 0 && args['allow-removal'] !== true) {
    throw new Error(
      `The deck drops ${removals.join(', ')}. Deleting a card sets \`sessions.card_id\` to null ` +
        'in every diary entry that ever drew it — the entry survives, the card it drew does not. ' +
        'Pass --allow-removal if that is the intention.',
    );
  }

  /* NO COMMITTED DECK IS NOT AN EMPTY DIFF, and conflating the two is how the
     first run of this script wrote a migration whose header announced nine new
     cards that had been in the database for a week. Unknown is unknown: say
     so, and make the writer say --force. */
  if (before === null && args.force !== true && args['dry-run'] !== true) {
    console.log(
      `There is no committed ${DECK_IN_GIT} to compare against, so nothing can honestly be\n` +
        'said about what changed. Commit the deck first and edit it after — or pass --force\n' +
        'to write a migration that simply states the deck in full.',
    );
    return;
  }

  if (before !== null && summary.length === 0 && args.force !== true && args['dry-run'] !== true) {
    console.log(
      `The deck matches the committed ${DECK_IN_GIT}, so there is nothing to generate.\n` +
        'Edit the deck first — or pass --force to restate it anyway.',
    );
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const body = sql(deck, summary, today, removals, before !== null);

  if (args['dry-run'] === true) {
    console.log(body);
    return;
  }

  const files = (await readdir(MIGRATIONS)).filter((name) => name.endsWith('.sql'));
  const name = `${await stamp(files)}_deck_${slugify(args.name ?? 'update')}.sql`;
  await writeFile(join(MIGRATIONS, name), body, 'utf8');

  console.log(`supabase/migrations/${name}\n`);
  for (const line of summary) console.log(`  ${line}`);
  console.log(
    `${summary.length > 0 ? '\n' : ''}Next, and none of it happens on its own:\n` +
      '  supabase db reset   re-applies every migration, this one last\n' +
      '  pnpm test:db        proves the database now matches deck.json\n' +
      '  supabase db push    sends it to the hosted project',
  );
}

main().catch((thrown) => {
  console.error(`[musie] ${thrown instanceof Error ? thrown.message : String(thrown)}`);
  process.exitCode = 1;
});
