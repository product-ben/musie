/**
 * The tap dot on the harp — round 2, Ben, 2026-11-09: the kalimba's soft dot
 * for every OWN note, never for Musie's answer and never for the demo. The
 * dot itself is the design system's (`instrumentTapAt`, `paintInstrumentTap`,
 * parameters from `host.tap()`); this file only says where it sits and how
 * old it is.
 *
 *   PULL   It appears where the finger takes the string and travels with it:
 *          at the string's bent point (x = the string + the pull, y = the
 *          finger's, kept inside the canvas as the bend is), at the pull's
 *          tension (`strength(dx)`), so it darkens towards the played colour
 *          as the finger pulls. While held it stays at AGE 0 — the moment of
 *          the stroke, held there — so it cannot run out under the finger.
 *          Let go, it stays where the string was let go, takes the note's
 *          velocity, and ages from that moment: from there on it is exactly
 *          the kalimba's tap, growing and fading over the effect's duration.
 *   STRUM  One dot at each crossing point, at that crossing's velocity,
 *          ageing from that moment.
 *   KEY    (1–7, the port's addition for people without a pointer) one dot
 *          at the middle of the string, where it swings widest.
 *
 * The experiment had no dots, so nothing here is compared with it: the dots
 * are their own pass, painted after `paintHarp`, and `experiment.test.ts`
 * compares `shapeStrings` and the input's notes, which know nothing of them.
 */
import { instrumentTapAt, paintInstrumentTap, type InstrumentTapParams, type InstrumentTapRgb } from '@musie/design-system';
import type { InstrumentPalette } from '../types';
import { parseColour } from './colour';

interface Dot {
  x: number;
  y: number;
  /** 0 … 1. */
  strength: number;
  /** When it started to age; null while its string is still held. */
  t0: number | null;
}

export interface HarpTaps {
  /** String `i` taken, or pulled further: its dot to (x, y) at `strength`, held at age 0. */
  hold(i: number, x: number, y: number, strength: number): void;
  /**
   * String `i` let go at `now`: its dot stays where it is and ages from now
   * at the note's `strength`. False when the string had no dot (another
   * finger on it let go first) — then the caller strikes one.
   */
  release(i: number, strength: number, now: number): boolean;
  /** A dot at (x, y), ageing from `now`: a strum crossing, a key. */
  strike(x: number, y: number, strength: number, now: number): void;
  /**
   * Paint every dot still alive at `now` and forget the rest. True while one
   * is alive — a held one always is.
   */
  paint(g: CanvasRenderingContext2D, now: number, params: InstrumentTapParams, palette: InstrumentPalette): boolean;
  clear(): void;
}

export function createHarpTaps(): HarpTaps {
  let dots: Dot[] = [];
  /** The dot each held string carries, by string. */
  const held = new Map<number, Dot>();
  /** The palette's two ends as channels, parsed once per colour string. */
  const channels = new Map<string, InstrumentTapRgb | null>();
  const rgb = (css: string) => {
    if (!channels.has(css)) channels.set(css, parseColour(css));
    return channels.get(css) ?? null;
  };

  return {
    hold(i, x, y, strength) {
      const dot = held.get(i);
      if (dot === undefined) {
        const fresh = { x, y, strength, t0: null };
        held.set(i, fresh);
        dots.push(fresh);
        return;
      }
      dot.x = x;
      dot.y = y;
      dot.strength = strength;
    },

    release(i, strength, now) {
      const dot = held.get(i);
      if (dot === undefined) return false;
      held.delete(i);
      dot.strength = strength;
      dot.t0 = now;
      return true;
    },

    strike(x, y, strength, now) {
      dots.push({ x, y, strength, t0: now });
    },

    paint(g, now, params, palette) {
      /* A colour the parser cannot read takes the other end, so the dot is
         one colour rather than a wrong one; neither readable, no dot. */
      const rest = rgb(palette.rest) ?? rgb(palette.played);
      const played = rgb(palette.played) ?? rest;
      dots = dots.filter((d) => {
        const frame = instrumentTapAt(params, { ageMs: d.t0 === null ? 0 : now - d.t0, strength: d.strength });
        /* A held dot is kept even if a zero duration makes it `done` at
           once, so `held` never points at a dot no longer in the list. */
        if (frame.done && d.t0 !== null) return false;
        if (rest !== null && played !== null) paintInstrumentTap(g, d.x, d.y, frame, rest, played);
        return true;
      });
      return dots.length > 0;
    },

    clear() {
      dots = [];
      held.clear();
    },
  };
}
