/**
 * Walk the merged migrations over to the hosted database — `pnpm db:sync`
 *
 * ── WHY THIS EXISTS, AND WHY IT IS A GUARD RATHER THAN A PROHIBITION ───────
 * `.claude/settings.json` denied `supabase db push` outright. Three commands
 * were denied together and they were denied for three DIFFERENT reasons:
 *
 *   `supabase db reset` touches the LOCAL database, which every worktree
 *     shares, so a reset from one branch wipes what another is testing (rule 9).
 *     Specific, strong, still true.
 *   `pnpm gen:types` reads that shared local database and writes a file into
 *     whichever branch is checked out, so it can commit another branch's tables
 *     into yours and typecheck right up to the merge. Also still true.
 *   `supabase db push` touches the HOSTED database. Nothing is shared, no other
 *     worktree is involved. Its real risk is pushing migrations from a branch
 *     that has not merged — a question of WHEN, not of WHO.
 *
 * Phrased as *who*, the rule did not protect Ben: he was permitted to push at
 * the wrong moment, and what actually happened was forgetting to push at the
 * right one, after a merge, with every check still reporting success. The saw
 * now refuses to start unless the blade guard is down, which is safer for
 * whoever is holding it.
 *
 * So `supabase db push` stays denied and this is allowed instead. The three
 * checks below are the guard. Each one has a reason:
 *
 *   ON `main`        — a migration pushed from a feature branch puts schema in
 *                      production that no deployed code uses, and rule 4 means
 *                      it cannot be withdrawn by editing the file afterwards.
 *   CLEAN TREE       — an uncommitted migration pushed is a migration that
 *                      exists on hosted and in nobody's history.
 *   LEVEL WITH ORIGIN— behind origin means someone else's migrations are
 *                      missing from this comparison; ahead means the push would
 *                      land schema whose code has not been pushed.
 *
 * ── WHAT IT DELIBERATELY DOES NOT DO ──────────────────────────────────────
 * It does not run `pnpm gen:types`. That would dirty the working tree, which
 * contradicts the precondition above on the next run, and the file still has to
 * be committed by a person. `db:status` warns when it looks stale instead.
 *
 * It does not run the db suite against hosted either: that needs
 * `SUPABASE_TEST_SERVICE_ROLE_KEY`, and rule 4 says the service-role key does
 * not belong in a file. The GitHub Action does it, where the key is a secret.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) =>
  execFileSync('git', args, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function refuse(what, detail) {
  console.error(`REFUSED — ${what}`);
  for (const line of detail) console.error(`  ${line}`);
  process.exit(1);
}

/* ── 1 · on main ─────────────────────────────────────────────────────────── */
const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
if (branch !== 'main') {
  refuse(`this is \`${branch}\`, not \`main\`.`, [
    'A migration pushed from a feature branch puts schema in production that no',
    'deployed code uses, and rule 4 means it cannot be withdrawn by editing the',
    'file afterwards — only by writing another migration.',
    '',
    'Merge first, then run this from `main`.',
  ]);
}

/* ── 2 · clean tree ──────────────────────────────────────────────────────── */
const dirty = git('status', '--porcelain');
if (dirty !== '') {
  refuse('the working tree is not clean.', [
    'An uncommitted migration pushed is a migration that exists on the hosted',
    'database and in nobody’s history.',
    '',
    ...dirty.split('\n').slice(0, 10).map((l) => `  ${l}`),
  ]);
}

/* ── 3 · level with origin ───────────────────────────────────────────────── */
try {
  execFileSync('git', ['fetch', 'origin', '--quiet'], { cwd: REPO, stdio: 'ignore' });
} catch {
  console.warn('warning: could not fetch origin — comparing against the last known state.\n');
}
/* `--left-right --count main...origin/main` prints "<left> <right>", where LEFT
   is reachable from main only (so: ahead of origin) and RIGHT from origin only
   (so: behind origin). Named on the way in, because reading it backwards is
   silent and gives exactly the wrong refusal. */
const [aheadOfOrigin, behindOrigin] = git(
  'rev-list', '--left-right', '--count', 'main...origin/main',
).split(/\s+/).map(Number);
if (behindOrigin > 0 || aheadOfOrigin > 0) {
  refuse('`main` is not level with `origin/main`.', [
    `  ${aheadOfOrigin} commit(s) here that origin does not have`,
    `  ${behindOrigin} commit(s) on origin that are not here`,
    '',
    behindOrigin > 0
      ? 'Behind means someone else’s migrations are missing from this comparison.'
      : 'Ahead means this would push schema whose code has not been pushed.',
    '',
    'Run `git pull --ff-only` and/or push your commits first.',
  ]);
}

console.log(`on \`main\`, clean, level with origin — checking the two databases.\n`);

/* ── 4 · is there anything to do? ────────────────────────────────────────── */
const status = () =>
  spawnSync(process.execPath, [join(REPO, 'scripts', 'db-status.mjs')], {
    cwd: REPO,
    stdio: 'inherit',
  }).status;

const before = status();
if (before === 0) {
  console.log('\nNothing to push.');
  process.exit(0);
}
if (before === 2) {
  console.error('\nStopping: the hosted database could not be read, so there is nothing');
  console.error('trustworthy to act on. This is not the same as being in sync.');
  process.exit(2);
}

/* ── 5 · push ────────────────────────────────────────────────────────────── */
console.log('\npushing…\n');
const pushed = spawnSync('supabase', ['db', 'push'], { cwd: REPO, stdio: 'inherit' });
if (pushed.status !== 0) {
  console.error('\n`supabase db push` failed. Nothing further was attempted.');
  process.exit(pushed.status ?? 1);
}

/* ── 6 · and say so only if it is true now ───────────────────────────────── */
console.log('\nre-checking…\n');
const after = status();
if (after !== 0) {
  console.error('\nThe push reported success and the two still disagree. Read the list above');
  console.error('before pushing again — `supabase db push` cannot remove a version that is');
  console.error('already applied, and rule 4 means an applied migration is not editable.');
  process.exit(after ?? 1);
}
console.log('\nDone — the hosted database matches the migration files.');
