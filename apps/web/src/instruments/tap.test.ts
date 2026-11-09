/**
 * The tap effect moved into the design system unchanged — checked by running
 * the kalimba experiment's OWN `dots` next to the design system's
 * `instrumentTapAt` + `paintInstrumentTap`, on a context that records what is
 * drawn, and requiring the same circles, gradients and opacities.
 *
 * Ben, 2026-11-09: the kalimba's tap is the effect for every own note on all
 * three instruments, maintained centrally. The one change is the size: the
 * experiment's unit was the tine that was hit (`L.tw`); the design system's
 * is a token in px, taken from the kalimba's tine on a 393px phone. So the
 * parity runs at the kalimba's `tw`, and the token is held to that `tw`.
 *
 * The experiment is our own file in this repo; that is why running it is fine
 * (as in shadow.test.ts and kalimba/parity.test.ts).
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  INSTRUMENT_TAP_DEFAULT, INSTRUMENT_TAP_STOPS, INSTRUMENT_TAP_TOKENS, instrumentTapAt, paintInstrumentTap,
  readInstrumentTapParams,
} from '@musie/design-system';
import type { InstrumentTapParams, InstrumentTapRgb } from '@musie/design-system';
import kalimba from '../../../../supabase/content/instruments/kalimba.json';
import { layoutKalimba } from './kalimba/geometry';
import type { KalimbaLayout } from './kalimba/geometry';

const html = readFileSync(join(__dirname, '..', '..', 'public/experiments/kalimba/261106-1121/index.html'), 'utf8');
const src = html.slice(html.indexOf('<script>'), html.lastIndexOf('</script>'));
const amendments = readFileSync(
  createRequire(import.meta.url).resolve('@musie/design-system/tokens/musy-foundations-amendments.css'),
  'utf8',
);

/** A whole line of the experiment, by its start. */
function line(head: string): string {
  const at = src.indexOf(head);
  if (at < 0) throw new Error(`not in the experiment: ${head}`);
  return src.slice(at, src.indexOf('\n', at));
}

/** From `const DOT_MS` to the closing brace of `function dots` — the effect, whole. */
const dotsSource = (() => {
  const from = src.indexOf('const DOT_MS = ');
  const fnAt = src.indexOf('function dots(now)', from);
  if (from < 0 || fnAt < 0) throw new Error('kalimba: dots not found');
  return src.slice(from, src.indexOf('\n}', fnAt) + 2);
})();

/** The kalimba on the reference phone: 393 × 852, the instrument filling the sheet. */
const PHONE = layoutKalimba(
  { width: 393, height: 852, dpr: 3, inset: { top: 0, right: 0, bottom: 0, left: 0 } },
  kalimba.sound.tines.map((t) => t.hz),
)!;

interface Gradient { args: number[]; stops: [number, string][] }
type Drawn = { arc: number[]; alpha: number; gradient: Gradient };

/** A 2D context that keeps what was filled, and nothing else. */
function recorder() {
  const drawn: Drawn[] = [];
  let arc: number[] = [];
  const g = {
    globalAlpha: 1,
    fillStyle: null as unknown,
    createRadialGradient: (...args: number[]): Gradient & { addColorStop(at: number, c: string): void } => {
      const stops: [number, string][] = [];
      return { args, stops, addColorStop: (at, c) => void stops.push([at, c]) };
    },
    beginPath: () => {},
    arc: (...args: number[]) => { arc = args; },
    fill: () => {
      const { args, stops } = g.fillStyle as Gradient;
      drawn.push({ arc, alpha: g.globalAlpha, gradient: { args, stops } });
    },
  };
  return { g, drawn };
}

const REST = 'rgb(180, 170, 150)';
const HIT = 'rgb(170, 90, 60)';
const WAVE_Y = 120;

interface XPress { i: number; pos: number; vel: number; t0: number }

/** The experiment's `dots(now)` on the recorder, with its own `mix`, `rgb` and `clamp`. */
function experimentDraws(L: KalimbaLayout, presses: XPress[], now: number): Drawn[] {
  const { g, drawn } = recorder();
  const run = new Function(
    'g', 'L', 'C', 'waveAt', 'list', 'now',
    `${line('const clamp = ')}\n${line('const rgb = ')}\n${line('const mix = ')}\n${dotsSource}\n` +
      'presses = list; dots(now);',
  );
  run(g, L, { rest: REST, hit: HIT }, () => WAVE_Y, presses, now);
  return drawn;
}

const rgbOf = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number) as unknown as InstrumentTapRgb;

/** The same presses through the design system. */
function systemDraws(params: InstrumentTapParams, L: KalimbaLayout, presses: XPress[], now: number): Drawn[] {
  const { g, drawn } = recorder();
  for (const d of presses) {
    const T = L.tines[d.i];
    const frame = instrumentTapAt(params, { ageMs: now - d.t0, strength: d.vel });
    paintInstrumentTap(
      g as unknown as CanvasRenderingContext2D,
      T.cx, WAVE_Y + Math.max(0, Math.min(1, d.pos)) * T.len,
      frame, rgbOf(REST), rgbOf(HIT),
    );
  }
  return drawn;
}

describe('the instrument tap = the kalimba’s press dot', () => {
  const atPhone = { ...INSTRUMENT_TAP_DEFAULT, size: PHONE.tw };

  it.each([0, 1, 35, 120, 350, 520, 699])('draws the same dot %i ms after the stroke', (age) => {
    const presses = [0.2, 0.44, 0.7, 1].map((vel, k) => ({ i: k * 2, pos: 0.25 * k, vel, t0: 1000 }));
    const now = 1000 + age;
    const expected = experimentDraws(PHONE, presses, now);
    expect(expected).toHaveLength(presses.length);
    expect(systemDraws(atPhone, PHONE, presses, now)).toEqual(expected);
  });

  it('radius, alpha and mix are the experiment’s arithmetic', () => {
    const grow = /grow = (1 - Math\.pow\(1 - p, \d+\))/.exec(dotsSource)![1];
    const r = /const r = (L\.tw \* [^;]+);/.exec(dotsSource)![1];
    const alpha = /g\.globalAlpha = (Math\.min\(1, [^;]+);/.exec(dotsSource)![1];
    const mix = /const c = mix\(C\.rest, C\.hit, ([^)]+)\)/.exec(dotsSource)![1];
    const ev = (expression: string, scope: Record<string, unknown>) =>
      new Function(...Object.keys(scope), `return (${expression});`)(...Object.values(scope)) as number;
    for (const p of [0, 0.05, 0.25, 0.5, 0.75, 0.99]) {
      for (const vel of [0, 0.2, 0.44, 0.7, 1]) {
        const frame = instrumentTapAt(atPhone, { ageMs: p * 700, strength: vel });
        const d = { vel };
        expect(frame.radius).toBeCloseTo(ev(r, { L: PHONE, d, grow: ev(grow, { p }) }), 12);
        expect(frame.alpha).toBeCloseTo(ev(alpha, { p, d }), 12);
        expect(frame.mix).toBeCloseTo(ev(mix, { d }), 12);
        expect(frame.done).toBe(false);
      }
    }
  });

  it('is gone once the duration is over, as the experiment filters it out', () => {
    const presses = [{ i: 4, pos: 0.5, vel: 1, t0: 0 }];
    expect(experimentDraws(PHONE, presses, 700)).toEqual([]);
    expect(instrumentTapAt(atPhone, { ageMs: 700, strength: 1 }).done).toBe(true);
    expect(systemDraws(atPhone, PHONE, presses, 700)).toEqual([]);
  });

  it('ships the experiment’s constants as its defaults', () => {
    expect(Number(/const DOT_MS = (\d+)/.exec(dotsSource)![1])).toBe(INSTRUMENT_TAP_DEFAULT.durationMs);
    const D = INSTRUMENT_TAP_DEFAULT;
    expect(dotsSource).toContain(`grow = 1 - Math.pow(1 - p, ${D.growthPower});`);
    expect(dotsSource).toContain(`const r = L.tw * (${D.start} + (${D.growth} + ${D.growthByStrength} * d.vel) * grow);`);
    expect(dotsSource).toContain(`mix(C.rest, C.hit, ${D.mix} + ${D.mixByStrength} * d.vel)`);
    expect(dotsSource).toContain(
      `g.globalAlpha = Math.min(1, Math.pow(1 - p, ${D.fadePower}) * (${D.opacity} + ${D.opacityByStrength} * d.vel));`,
    );
    expect(dotsSource).toContain(INSTRUMENT_TAP_STOPS.map(([at, a]) => `fill.addColorStop(${at}, c + '${a})');`).join(' '));
  });

  it('the size token is the kalimba’s tine width on a 393px phone', () => {
    expect(PHONE.tw).toBeCloseTo((393 - 32) / 9 * 0.42, 12);
    expect(INSTRUMENT_TAP_DEFAULT.size).toBeCloseTo(PHONE.tw, 2);
  });

  it('the tokens in the amendments are the defaults', () => {
    const declared = new Map(
      [...amendments.matchAll(/(--instrument-tap-[a-z-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
    );
    expect([...declared.keys()].sort()).toEqual(Object.values(INSTRUMENT_TAP_TOKENS).sort());
    const style = { getPropertyValue: (name: string) => declared.get(name) ?? '' } as unknown as CSSStyleDeclaration;
    expect(readInstrumentTapParams(style)).toEqual(INSTRUMENT_TAP_DEFAULT);
    expect(declared.get('--instrument-tap-duration')).toBe(`${INSTRUMENT_TAP_DEFAULT.durationMs}ms`);
    expect(declared.get('--instrument-tap-size')).toBe(`${INSTRUMENT_TAP_DEFAULT.size}px`);
  });
});
