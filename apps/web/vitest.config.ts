/**
 * Test configuration — deliberately SEPARATE from vite.config.ts.
 *
 * vite.config.ts carries a dev-server middleware that serves woff2 files out
 * of @musie/design-system, plus the React plugin and the production asset
 * naming. None of that has anything to do with running a pure function in
 * Node, and inheriting it would mean every test run resolves the design
 * system package just to find out it is not needed. Vitest prefers this file
 * over vite.config.ts, so the app config stays untouched and unread here.
 *
 * ── TWO PROJECTS FROM THE START ────────────────────────────────────────────
 * `unit` is pure logic: no network, no database, no DOM. `db` talks to the
 * local Supabase stack and is therefore not something `pnpm check` can assume
 * is running — it is a separate `test:db` script. The split is laid down now,
 * while `db` is still empty, so that adding the first database test is one new
 * FILE rather than a rewrite of this config.
 *
 * Both are `environment: 'node'`: nothing under test touches the DOM, and a
 * jsdom dependency bought for nothing is a dependency to keep updated.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    /**
     * `db` legitimately matches nothing yet, and "no test files" is Vitest's
     * default FAILURE. This is a non-project option, so it cannot be scoped to
     * `db` alone — the cost is that an accidentally empty `unit` run would
     * also report green. The typecheck and lint halves of `pnpm check` still
     * run, and a deleted test file is a visible diff.
     */
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          exclude: ['**/*.db.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'db',
          include: ['src/**/*.db.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
});
