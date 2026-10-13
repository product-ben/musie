/**
 * The seatbelt chime — runs before `pnpm --filter web dev`, warns, never blocks.
 *
 * ── WHY IT HANGS OFF `dev` AND NOT OFF A GIT HOOK ──────────────────────────
 * The reminder has to be attached to something that actually happens. A
 * `post-merge` git hook was the obvious candidate and is the wrong one:
 * `.git/hooks` is not versioned, `core.hooksPath` has to be set once in every
 * clone AND every worktree, and a fresh checkout silently has no hooks at all.
 * `package.json` is versioned and needs no setup, and CLAUDE.md rule 8 sends
 * everyone to `pnpm --filter web dev` after every change anyway.
 *
 * ── AND WHY IT CHECKS THE TWO DATABASES RATHER THAN WATCHING FOR MERGES ────
 * A merge-triggered reminder only catches "you forgot to push". Once the GitHub
 * Action is armed, the dangerous failure is the opposite and worse: automation
 * that quietly stopped — a rotated secret, a disabled workflow, secrets never
 * added. A reminder about merges would say nothing about that. Comparing the
 * two databases catches both.
 *
 * ── IT MUST NOT BLOCK, AND THAT IS A REAL CONSTRAINT ──────────────────────
 * A `pre<script>` that exits non-zero stops the script, so this ALWAYS exits 0.
 * It also gives up after a few seconds: a check that stops `pnpm dev` on a
 * train is worse than the problem it solves. Offline, not logged in, or simply
 * slow ⇒ one quiet line and out of the way.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TIMEOUT_MS = 8_000;

const run = spawnSync(process.execPath, [join(HERE, 'db-status.mjs')], {
  encoding: 'utf8',
  timeout: TIMEOUT_MS,
  stdio: ['ignore', 'pipe', 'pipe'],
});

/* Timed out, or could not read hosted at all. One line, no alarm: this is the
   "I could not check" case, and it must not be dressed up as either answer. */
if (run.error !== undefined || run.status === 2 || run.status === null) {
  const why = run.error?.code === 'ETIMEDOUT' ? `no answer in ${TIMEOUT_MS / 1000}s` : 'could not read it';
  console.log(`[musie] hosted database not checked (${why}) — starting anyway.`);
  process.exit(0);
}

if (run.status === 0) process.exit(0);

/* Drifted. Loud, because this is the thing that used to be silent. */
const detail = (run.stdout ?? '').trim().split('\n').filter((l) => l.trim() !== '');
console.log('');
console.log('  ┌────────────────────────────────────────────────────────────────┐');
console.log('  │  THE HOSTED DATABASE IS BEHIND THE MIGRATION FILES             │');
console.log('  └────────────────────────────────────────────────────────────────┘');
for (const line of detail) console.log(`  ${line}`);
console.log('');
console.log('  The dev server is starting anyway — it reads whatever .env.local');
console.log('  names, so this may or may not affect what you are about to look at.');
console.log('');
process.exit(0);
