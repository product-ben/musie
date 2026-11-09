/**
 * Touch, mouse and keys → plucks. The experiment's pointer handlers
 * (`pointerdown`, `pointermove`, `end`), `crossings`, `release` and the
 * 'A'-key strum, as a state machine with no DOM: it is handed `StagePointer`s
 * and reports through a sink, which `index.ts` turns into sound, colour,
 * vibration and `host.played`.
 *
 * Two ways to play a string, as in the experiment:
 *   – PULL: touch down within reach of a string, drag sideways, let go. The
 *     further it was pulled, the louder (`strength`). Pulled past `maxPull`
 *     it slips and sounds at full strength. While a string is held, the
 *     finger strums no neighbour.
 *   – STRUM: a finger that came down between strings plays every string it
 *     crosses, louder the faster it moves; the same string not twice within
 *     40 ms.
 *
 * Keys: holding 'A' and moving the mouse strums without a button (the
 * experiment's desktop strum). Added for people without a pointer (WCAG
 * 2.1.1): keys 1–7 pluck strings 1–7, low to high.
 */
import type { StagePointer } from '../types';
import { crossed, maxPull, nearest, strength, strumVelocity, tension, type Point } from './geometry';
import type { HarpDemo, HarpSound } from './sound';

/** A string pulled sideways by `dx` px at height `y`. */
export interface Pull {
  dx: number;
  y: number;
}

export interface HarpInputSink {
  /** An own note — a pull let go, a string strummed, a key. */
  pluck(i: number, vel: number): void;
  /** A string taken (`pull`) or let go (`null`). */
  hold(i: number, pull: Pull | null): void;
  /** A pull passed one of its steps: the experiment's small tick. */
  tick(): void;
  /** How many pointers are down on the harp — the answer waits for them. */
  holding(count: number): void;
}

export interface HarpInput {
  down(p: StagePointer): void;
  move(p: StagePointer): void;
  up(p: StagePointer): void;
  keyDown(key: string): boolean;
  keyUp(key: string): void;
  reset(): void;
}

interface Finger extends Point {
  /** The string this finger pulls, or null while it strums. */
  held: number | null;
  /** x where it took the string: the pull counts from here, not from the string. */
  grab: number;
  /** Its latest pull, px. */
  dx: number;
  /** The last pull step it ticked. */
  step: number;
  /** When it last plucked each string. */
  last: Map<number, number>;
}

/** The experiment's desktop strum key. */
export const STRUM_KEY = 'a';

const finger = (p: Point): Finger => ({ x: p.x, y: p.y, t: p.t, held: null, grab: 0, dx: 0, step: 0, last: new Map() });

/**
 * The points of one move, oldest first, ending on the event's own point —
 * the browser's coalesced list includes it; `StagePointer.coalesced` may not.
 */
function points(p: StagePointer): Point[] {
  const list: Point[] = p.coalesced && p.coalesced.length > 0 ? [...p.coalesced] : [];
  const last = list[list.length - 1];
  if (last === undefined || last.x !== p.x || last.y !== p.y || last.t !== p.t) list.push({ x: p.x, y: p.y, t: p.t });
  return list;
}

export function createHarpInput(
  sound: HarpSound,
  demo: HarpDemo,
  strings: () => readonly number[],
  sink: HarpInputSink,
): HarpInput {
  const { pull, strum } = sound.velocity;
  const count = sound.tuning.COUNT;
  const keys = Array.from({ length: count }, (_, i) => String(i + 1));
  const fingers = new Map<number, Finger>();
  const pulls: (Pull | null)[] = Array.from({ length: count }, () => null);
  const down = new Set<string>();
  let strumKey = false;
  let hover: Finger | null = null;

  const setPull = (i: number, p: Pull | null) => {
    pulls[i] = p;
    sink.hold(i, p);
  };

  function release(f: Finger, vel: number): void {
    if (f.held === null) return;
    const i = f.held;
    setPull(i, null);
    f.held = null;
    f.last.set(i, f.t);
    sink.pluck(i, vel);
  }

  function crossings(f: Finger, to: Point): void {
    const xs = strings();
    const vel = strumVelocity(f, to, strum);
    for (const i of crossed(f.x, to.x, xs)) {
      if (i !== f.held && to.t - (f.last.get(i) ?? -1e9) > strum.retriggerMs) {
        f.last.set(i, to.t);
        sink.pluck(i, vel);
      }
    }
    f.x = to.x;
    f.y = to.y;
    f.t = to.t;
  }

  return {
    down(p) {
      const f = finger(p);
      const i = nearest(p.x, strings(), pull);
      if (i >= 0) {
        f.held = i;
        f.grab = p.x;
        setPull(i, { dx: 0, y: p.y });
      }
      fingers.set(p.id, f);
      sink.holding(fingers.size);
    },

    move(p) {
      const f = fingers.get(p.id);
      if (f === undefined) {
        /* No button: only the 'A' strum, and only with a mouse. */
        if (strumKey && p.type === 'mouse') {
          if (hover === null) hover = finger(p);
          else crossings(hover, p);
        }
        return;
      }
      const xs = strings();
      for (const at of points(p)) {
        if (f.held !== null) {
          const i = f.held;
          const dx = at.x - f.grab;
          if (Math.abs(dx) > maxPull(xs, pull)) {
            /* Slipped off: full strength, and from here on it strums. */
            f.x = at.x;
            f.y = at.y;
            f.t = at.t;
            release(f, 1);
            continue;
          }
          const step = Math.floor(tension(dx, xs, pull) * sound.haptics.pullStep.steps);
          if (step > f.step) sink.tick();
          f.step = step;
          f.dx = dx;
          setPull(i, { dx, y: at.y });
          continue;
        }
        crossings(f, at);
      }
    },

    up(p) {
      const f = fingers.get(p.id);
      if (f === undefined) return;
      /* The string's latest pull, as the experiment reads it — or this
         finger's own, when a second finger on the same string let go first
         (the experiment threw there). */
      if (f.held !== null) release(f, strength(pulls[f.held]?.dx ?? f.dx, strings(), pull));
      fingers.delete(p.id);
      sink.holding(fingers.size);
    },

    keyDown(key) {
      if (key.toLowerCase() === STRUM_KEY) {
        if (!strumKey) {
          strumKey = true;
          hover = null;
        }
        return true;
      }
      const i = keys.indexOf(key);
      if (i < 0) return false;
      if (!down.has(key)) {
        down.add(key);
        sink.pluck(i, demo.velocity);
      }
      return true;
    },

    keyUp(key) {
      if (key.toLowerCase() === STRUM_KEY) {
        strumKey = false;
        hover = null;
      }
      down.delete(key);
    },

    reset() {
      fingers.clear();
      pulls.fill(null);
      down.clear();
      strumKey = false;
      hover = null;
    },
  };
}
