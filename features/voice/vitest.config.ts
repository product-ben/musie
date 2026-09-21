/**
 * One project, named `unit`, so `vitest run --project unit` means the same
 * thing here as it does in apps/web and the root `pnpm test` needs no special
 * case. `environment: 'node'`: the two files under test are pure functions
 * over strings, and a jsdom dependency bought for nothing is a dependency to
 * keep updated.
 *
 * NOT `passWithNoTests`, for the reason apps/web states: a suite that has
 * silently stopped running should be red, not green.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
});
