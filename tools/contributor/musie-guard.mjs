#!/usr/bin/env node
/**
 * PreToolUse hook for a contributor's Claude Code — installed into
 * /Library/Application Support/ClaudeCode/ by install.sh, beside
 * managed-settings.json, where neither the user nor a project can override it.
 *
 * The permission rules in managed-settings.json come first, and this is the
 * backstop for what they cannot express: a Bash rule matches by PREFIX, so
 * `git push origin main` is denied and `cd x && git push origin main` is not,
 * and no rule can ask which branch is checked out. This reads the whole
 * command and asks git.
 *
 * NOT SECURITY. The wall is the GitHub ruleset on `main`; this stops Claude
 * from making a mistake on her behalf, early and with a reason it can explain.
 *
 * Exit 2 blocks the call, and stderr goes back to Claude as the reason.
 * install.sh wraps the command in `|| exit 2`, so a missing node or a crash
 * here blocks too: a guard that fails open is not a guard.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PROTECTED_BRANCHES = ['main', 'master'];

/** Paths she proposes changes to in words, in the PR, never by editing. */
const PROTECTED_PATHS = [
  'supabase/migrations/',
  'supabase/functions/',
  'supabase/config.toml',
  '.github/',
  // Settings and skills, not all of `.claude/`: her own memory lives in
  // ~/.claude/projects/ and Claude must be able to write there.
  '.claude/settings',
  '.claude/skills/',
  'wrangler.jsonc',
  'tools/contributor/',
];

/** [pattern, reason]. Matched against the whole command, every segment. */
const BLOCKED_COMMANDS = [
  [/\bgit\s+push\b[^;&|]*\s(--force\b|--force-with-lease\b|-f\b|--mirror\b|--delete\b|-d\b)/, 'force-pushing or deleting a remote branch'],
  [/\bgit\s+push\b[^;&|]*\s\+/, 'force-pushing with a + refspec'],
  [/\bgit\s+push\b[^;&|]*[\s:](main|master)\b/, 'pushing to main'],
  [/\bgit\s+merge\b/, 'merging'],
  [/\bgit\s+rebase\b/, 'rebasing'],
  [/\bgit\s+reset\s+--hard\b/, 'throwing work away with reset --hard'],
  [/\bgit\s+(checkout|switch)\b[^;&|]*\s(main|master)\s*($|[;&|])/, 'switching to main — start a new idea with /neu instead'],
  [/\bgh\s+pr\s+merge\b/, 'merging a pull request'],
  [/\bgh\s+(api|repo|ruleset|secret|variable|workflow|release)\b/, 'changing GitHub settings'],
  [/\bsupabase\b/, 'running the Supabase CLI'],
  [/\bpnpm\s+(db:sync|db:status|gen:types|test:db)\b/, 'touching a database directly'],
  [/\b(wrangler|npx\s+wrangler)\b/, 'deploying'],
  [/SERVICE_ROLE|sb_secret_/i, 'handling a service-role key'],
];

const block = (why) => {
  process.stderr.write(
    `Blocked by the musie contributor guard: ${why}.\n` +
      'This setup only works on a new branch and hands everything to Ben as a pull request. ' +
      'Explain to the user in plain German what you could not do, and say it in the PR description ' +
      'so Ben can do it. Do not look for another way around this.\n',
  );
  process.exit(2);
};

const currentBranch = (cwd) => {
  try {
    // symbolic-ref, not rev-parse: it also answers on a branch with no commits
    return execFileSync('git', ['symbolic-ref', '--short', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null; // not a repository: nothing to protect here
  }
};

const input = JSON.parse(readFileSync(0, 'utf8'));
const tool = input.tool_name;
const args = input.tool_input ?? {};
const cwd = input.cwd ?? process.cwd();

if (tool === 'Bash') {
  const command = String(args.command ?? '');
  for (const [pattern, why] of BLOCKED_COMMANDS) {
    if (pattern.test(command)) block(why);
  }
  if (/\bgit\s+(commit|push)\b/.test(command) && PROTECTED_BRANCHES.includes(currentBranch(cwd))) {
    block('committing or pushing while on main — start a new idea with /neu first');
  }
}

if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(tool)) {
  const file = path.resolve(cwd, String(args.file_path ?? args.notebook_path ?? ''));
  const rel = file.split(path.sep).join('/');
  const hit = PROTECTED_PATHS.find((p) => rel.includes(`/${p}`) || rel.endsWith(`/${p.replace(/\/$/, '')}`));
  if (hit) block(`editing ${hit} — database schema, server functions, CI and these guardrails are Ben's`);
  if (/\/\.env(\.|$)/.test(rel) && !rel.endsWith('.env.example')) block('editing an environment file');
}

process.exit(0);
