/**
 * TEST SUPPORT — a hand-cranked clock for the engine's unit tests. Nothing in
 * the app imports it.
 *
 * `advance(ms)` runs every timer due within the next `ms`, in due order (ties
 * in the order they were set), moving `now()` to each one's moment before it
 * runs, so a timer that sets another timer inside the window sees it run too.
 * That is what the answer needs: the pause timer composes, and the answer's
 * notes are timers set from inside it.
 */
import type { Timers } from './time';

export interface FakeTime {
  now(): number;
  timers: Timers;
  advance(ms: number): void;
  /** Timers still waiting. */
  pending(): number;
}

export function fakeTime(start = 1000): FakeTime {
  let t = start;
  let seq = 0;
  const tasks = new Map<number, { at: number; fn: () => void }>();

  const timers: Timers = {
    setTimeout(fn, ms) {
      seq += 1;
      tasks.set(seq, { at: t + Math.max(0, ms), fn });
      return seq;
    },
    clearTimeout(handle) {
      tasks.delete(handle);
    },
  };

  function advance(ms: number) {
    const end = t + ms;
    for (;;) {
      let nextId = -1;
      let nextAt = Infinity;
      for (const [id, task] of tasks) {
        if (task.at <= end && (task.at < nextAt || (task.at === nextAt && id < nextId))) {
          nextId = id;
          nextAt = task.at;
        }
      }
      if (nextId < 0) break;
      const task = tasks.get(nextId);
      tasks.delete(nextId);
      t = nextAt;
      task?.fn();
    }
    t = end;
  }

  return { now: () => t, timers, advance, pending: () => tasks.size };
}

/** mulberry32 — a seeded `Math.random`, so a composed answer can be compared. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
