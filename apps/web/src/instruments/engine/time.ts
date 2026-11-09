/**
 * Time, injected. Every part of the engine that waits — the pause before an
 * answer, the answer's own notes, the demo's patience, the clock's tick, the
 * iPhone's owed haptic tick — takes its timers and its `now` from here, so a
 * unit test can turn the hands itself instead of sleeping (vitest runs in
 * node, with no DOM: `vitest.config.ts`).
 *
 * The handle is a `number` on purpose: `window.setTimeout` returns one, and
 * the test program's @types/node would otherwise make it `NodeJS.Timeout`
 * (tsconfig.test.json says why the two programs differ).
 */

export interface Timers {
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(handle: number): void;
}

/** The browser's timers. Only called in a browser. */
export const browserTimers: Timers = {
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout: (handle) => window.clearTimeout(handle),
};

/** `performance.now()` — the clock every `Stroke.at` is stamped with. */
export const browserNow = (): number => performance.now();
