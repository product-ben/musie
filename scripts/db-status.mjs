/**
 * Do the migration files and the hosted database agree? — `pnpm db:status`
 *
 * ── THE PROBLEM THIS ANSWERS ───────────────────────────────────────────────
 * There are two databases: the local stack and `project-musie` in Frankfurt.
 * Migrations are append-only and are applied to each separately, so a branch
 * that merges with new migrations leaves the hosted one behind until somebody
 * runs `supabase db push`. Nothing noticed. `pnpm check` never touches a
 * database (CLAUDE.md rule 4 says so), so typecheck, lint, tests and CI were
 * all green while the two disagreed — and the failure surfaced later, somewhere
 * else, looking unrelated.
 *
 * Before this there was no way to ASK. That is why silence had come to mean
 * "fine".
 *
 * ── THE ONE RULE ───────────────────────────────────────────────────────────
 * **"I could not check" and "they agree" must never look the same.** An expired
 * login, no network, an unlinked project — each exits 2 and says UNKNOWN. Only
 * a real comparison can say IN SYNC. Getting this wrong would rebuild the
 * original bug with extra steps.
 *
 * ── WHERE EACH SIDE COMES FROM ─────────────────────────────────────────────
 * Local: the FILESYSTEM, `supabase/migrations/*.sql`. That is what git tracks
 * and what a merge changes, so it is the authority on what ought to be applied.
 * Hosted: the `remote` column of `supabase migration list --linked`, which
 * authenticates with the CLI's own login — so no key goes in a file, which rule
 * 4 requires of the service-role key.
 *
 * `--output-format json` is passed explicitly. The CLI emits JSON on its own
 * when it thinks an agent is calling it and a table when a human is, and a
 * script must not depend on being mistaken for either.
 *
 * EXIT CODES. 0 in sync · 1 drifted · 2 unknown.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS = join(REPO, 'supabase', 'migrations');
const TYPES = join(REPO, 'apps', 'web', 'src', 'lib', 'database.types.ts');

/** `20261013140000_exercises_asks_posture.sql` -> `20261013140000`. */
function versionOf(file) {
  const match = /^(\d{14})_/.exec(file);
  return match === null ? null : match[1];
}

function localVersions() {
  return readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .map(versionOf)
    .filter((v) => v !== null)
    .sort();
}

function hostedVersions() {
  const raw = execFileSync(
    'supabase',
    ['migration', 'list', '--linked', '--output-format', 'json'],
    { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  /* The CLI prints an upgrade notice and progress lines around the payload, so
     take the one line that parses rather than the whole of stdout. */
  const line = raw.split('\n').find((l) => l.trim().startsWith('{"migrations"'));
  if (line === undefined) throw new Error('no migration list in the CLI output');
  return JSON.parse(line).migrations
    .map((row) => row.remote)
    .filter((v) => typeof v === 'string' && v.length > 0)
    .sort();
}

/* ── Types staleness: a WARNING and never a verdict ────────────────────────
   `database.types.ts` is generated from a database and committed, so a push can
   leave it behind. That is a nuisance rather than drift between the two
   databases, and `pnpm check` can see it where it cannot see drift. So it is
   said and not counted.

   ── TWO WRONG WAYS TO MEASURE THIS, BOTH TRIED ─────────────────────────────
   NOT the migration's version string. `20261013140000` was written at about
   half past noon — the version is hand-chosen, so comparing a real file time
   against a nominal one reports every round-numbered migration as newer than
   everything.

   NOT file mtimes either. `git switch` and `git merge` stamp every file they
   write with the checkout time, so after a branch change the whole tree shares
   one timestamp give or take milliseconds — measured here at 11:49:22 for the
   types file and all three of the day's migrations, differing only in
   fractions. A `>` on that is a coin toss.

   GIT HISTORY is stable across checkouts: if the commit that last touched the
   types file is older than the commit that last touched `supabase/migrations/`,
   a migration landed without the types being regenerated. Same commit — which
   is the healthy case, and what PR #19 did — means nothing to say. */
function typesLookStale() {
  if (!existsSync(TYPES)) return false;
  const lastTouched = (path) => {
    try {
      const out = execFileSync('git', ['log', '-1', '--format=%ct', '--', path], {
        cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      return out === '' ? null : Number(out);
    } catch {
      return null;
    }
  };
  /* Uncommitted work on either side makes the comparison meaningless — the
     obvious case being someone who has just run `pnpm gen:types`. */
  try {
    const pending = execFileSync(
      'git', ['status', '--porcelain', '--', TYPES, join(REPO, 'supabase', 'migrations')],
      { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
    if (pending !== '') return false;
  } catch { return false; }

  const types = lastTouched(TYPES);
  const migrations = lastTouched(join(REPO, 'supabase', 'migrations'));
  if (types === null || migrations === null) return false;
  return types < migrations;
}

const local = localVersions();

let hosted;
try {
  hosted = hostedVersions();
} catch (error) {
  console.error('UNKNOWN — the hosted database could not be read.');
  console.error(`  ${error instanceof Error ? error.message.trim().split('\n')[0] : String(error)}`);
  console.error('');
  console.error('  This is NOT "in sync". Try `supabase login`, then `supabase link`,');
  console.error('  and check the network. Until this answers, assume nothing.');
  process.exit(2);
}

const hostedSet = new Set(hosted);
const localSet = new Set(local);
const unpushed = local.filter((v) => !hostedSet.has(v));
const unknownOnHost = hosted.filter((v) => !localSet.has(v));

console.log(`migration files   ${local.length}`);
console.log(`applied on hosted ${hosted.length}`);

if (unpushed.length === 0 && unknownOnHost.length === 0) {
  console.log('');
  console.log(`IN SYNC — all ${local.length} migrations are applied to the hosted database.`);
  if (typesLookStale()) {
    console.log('');
    console.log('  Note: apps/web/src/lib/database.types.ts is older than the newest');
    console.log('  migration. Run `pnpm gen:types` and commit it if a column moved.');
  }
  process.exit(0);
}

console.log('');
console.log('DRIFTED.');
if (unpushed.length > 0) {
  console.log('');
  console.log(`  ${unpushed.length} migration${unpushed.length === 1 ? '' : 's'} on disk and NOT on hosted:`);
  for (const v of unpushed) {
    const file = readdirSync(MIGRATIONS).find((f) => versionOf(f) === v) ?? v;
    console.log(`    ${file}`);
  }
  console.log('');
  console.log('  Fix: `pnpm db:sync` from a clean `main`.');
}
if (unknownOnHost.length > 0) {
  console.log('');
  console.log(`  ${unknownOnHost.length} version${unknownOnHost.length === 1 ? '' : 's'} applied on hosted with NO file here:`);
  for (const v of unknownOnHost) console.log(`    ${v}`);
  console.log('');
  console.log('  This branch is probably behind `main`, or a migration file was');
  console.log('  deleted after being pushed. `supabase db push` cannot undo either.');
}
process.exit(1);
