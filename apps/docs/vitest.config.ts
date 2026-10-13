/**
 * One project, named `unit`, so `vitest run --project unit` means the same
 * thing here as it does in apps/web and features/voice, and the root
 * `pnpm test` needs no special case.
 *
 * What it covers is the two markdown transforms — pure functions over a
 * markdown-it instance, hence `environment: 'node'`. The site itself is gated
 * by `vitepress build`, not by this.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['.vitepress/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
});
