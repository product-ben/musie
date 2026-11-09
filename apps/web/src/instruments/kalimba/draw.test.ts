/**
 * The look: colours from the palette and nowhere else, a glow that fades,
 * and the design system's tap where a tine was pressed. The canvas is a
 * recording fake.
 */
import { describe, expect, it } from 'vitest';
import { INSTRUMENT_TAP_DEFAULT, instrumentTapAt, paintInstrumentTap } from '@musie/design-system';
import type { InstrumentTapParams } from '@musie/design-system';
import kalimba from '../../../../../supabase/content/instruments/kalimba.json';
import type { InstrumentPalette } from '../types';
import { drawKalimba, glowAt, glowMix, mixColour, parseColour, pressPoint } from './draw';
import type { Press, TineGlow } from './draw';
import { bridgeY, layoutKalimba } from './geometry';

const PALETTE: InstrumentPalette = {
  rest: 'rgb(100, 100, 100)',
  played: 'rgb(200, 100, 0)',
  answer: 'rgb(0, 150, 50)',
  background: 'rgb(250, 250, 240)',
  detail: 'rgb(120, 120, 110)',
};

const L = layoutKalimba({ width: 390, height: 844, dpr: 2, inset: { top: 120, right: 0, bottom: 96, left: 0 } }, kalimba.sound.tines.map((t) => t.hz))!;

/** A 2D context that records what was stroked and filled, in which colour — and every disc, whole. */
function recorder() {
  const strokes: string[] = [];
  const fills: string[] = [];
  const stops: string[] = [];
  const discs: { arc: number[]; alpha: number; stops: string[] }[] = [];
  let arc: number[] = [];
  let gradient: string[] = [];
  const g = {
    fillStyle: '' as unknown,
    strokeStyle: '' as unknown,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    setTransform() {},
    fillRect() { fills.push(String(g.fillStyle)); },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    arc(...args: number[]) { arc = args; },
    stroke() { strokes.push(String(g.strokeStyle)); },
    fill() {
      fills.push(typeof g.fillStyle === 'string' ? g.fillStyle : 'gradient');
      discs.push({ arc, alpha: g.globalAlpha, stops: gradient });
    },
    createRadialGradient() {
      gradient = [];
      return { addColorStop: (_at: number, c: string) => { stops.push(c); gradient.push(c); } };
    },
  };
  return { g: g as unknown as CanvasRenderingContext2D, strokes, fills, stops, discs };
}

const atRest = (): TineGlow[] => Array.from({ length: 9 }, () => ({ t0: -1e9, vel: 1, tone: 'played' as const }));
const scene = (glows: TineGlow[], presses: Press[] = [], tap: InstrumentTapParams = INSTRUMENT_TAP_DEFAULT) =>
  ({ layout: L, glows, presses, tap, width: 390, height: 844 });

describe('colour arithmetic', () => {
  it('reads what a resolved colour can look like', () => {
    expect(parseColour('rgb(10, 20, 30)')).toEqual([10, 20, 30]);
    expect(parseColour('rgba(1, 2, 3, 0.5)')).toEqual([1, 2, 3]);
    expect(parseColour('rgb(1 2 3 / 50%)')).toEqual([1, 2, 3]);
    expect(parseColour('#102030')).toEqual([16, 32, 48]);
    expect(parseColour('#123')).toEqual([0x11, 0x22, 0x33]);
    expect(parseColour('color(srgb 1 0.5 0)')).toEqual([255, 127.5, 0]);
    expect(parseColour('oklch(0.7 0.1 50)')).toBeNull();
  });
  it('mixes straight in sRGB, as the experiment did', () => {
    expect(mixColour(PALETTE.rest, PALETTE.played, 0)).toBe('rgb(100,100,100)');
    expect(mixColour(PALETTE.rest, PALETTE.played, 0.5)).toBe('rgb(150,100,50)');
    expect(mixColour(PALETTE.rest, PALETTE.played, 1)).toBe('rgb(200,100,0)');
  });
  it('a colour it cannot read is drawn unmixed, never as black', () => {
    expect(mixColour('oklch(0.7 0.1 50)', PALETTE.played, 0.2)).toBe('oklch(0.7 0.1 50)');
    expect(mixColour('oklch(0.7 0.1 50)', PALETTE.played, 0.8)).toBe(PALETTE.played);
  });
});

describe('glow and the tap’s place', () => {
  it('a tine glows for a while and then rests', () => {
    expect(glowAt(0, 1)).toBe(1);
    expect(glowAt(0, 0)).toBeCloseTo(0.4, 12);
    expect(glowMix(glowAt(1000, 1))).toBeCloseTo(Math.min(1, Math.exp(-1 / 1.1) * 1.1), 12);
    expect(glowMix(glowAt(5000, 1))).toBeNull();
  });
  it('a tap sits on the tine’s centre line where it was touched, clamped to the tine', () => {
    const d: Press = { tine: 2, pos: 0.5, vel: 1, t0: 0 };
    const at = pressPoint(L, d)!;
    expect(at.x).toBe(L.tines[2].cx);
    expect(at.y).toBeCloseTo(bridgeY(L, L.tines[2].cx) + 0.5 * L.tines[2].len, 9);
    expect(pressPoint(L, { ...d, pos: 1.4 })!.y).toBeCloseTo(bridgeY(L, L.tines[2].cx) + L.tines[2].len, 9);
    expect(pressPoint(L, { ...d, pos: -0.3 })!.y).toBeCloseTo(bridgeY(L, L.tines[2].cx), 9);
    expect(pressPoint(L, { ...d, tine: 9 })).toBeNull();
  });
});

describe('a frame', () => {
  it('at rest: the background, nine tines in the rest colour, the bridge in the detail colour — and still', () => {
    const r = recorder();
    expect(drawKalimba(r.g, scene(atRest()), PALETTE, 0)).toBe(false);
    expect(r.fills).toEqual([PALETTE.background]);
    expect(r.strokes).toEqual([...Array(9).fill(PALETTE.rest), PALETTE.detail]);
  });

  it('a played tine goes towards the played colour, an answered one towards the answer colour', () => {
    const glows = atRest();
    glows[4] = { t0: 0, vel: 1, tone: 'played' };
    glows[1] = { t0: 0, vel: 1, tone: 'answer' };
    const r = recorder();
    expect(drawKalimba(r.g, scene(glows), PALETTE, 100)).toBe(true);
    const t = glowMix(glowAt(100, 1))!;
    expect(r.strokes[4]).toBe(mixColour(PALETTE.rest, PALETTE.played, t));
    expect(r.strokes[1]).toBe(mixColour(PALETTE.rest, PALETTE.answer, t));
    expect(r.strokes[0]).toBe(PALETTE.rest);
  });

  it('a press is painted by the design system’s tap, on the scene’s parameters, between rest and played', () => {
    const tap: InstrumentTapParams = { ...INSTRUMENT_TAP_DEFAULT, size: 10, durationMs: 400, mix: 0.5, mixByStrength: 0.2 };
    const presses: Press[] = [{ tine: 4, pos: 1, vel: 1, t0: 0 }, { tine: 7, pos: 0.3, vel: 0.5, t0: 50 }];
    const r = recorder();
    expect(drawKalimba(r.g, scene(atRest(), presses, tap), PALETTE, 120)).toBe(true);

    const want = recorder();
    for (const d of presses) {
      const at = pressPoint(L, d)!;
      const frame = instrumentTapAt(tap, { ageMs: 120 - d.t0, strength: d.vel });
      paintInstrumentTap(want.g, at.x, at.y, frame, parseColour(PALETTE.rest)!, parseColour(PALETTE.played)!);
    }
    expect(r.discs).toHaveLength(2);
    expect(r.discs).toEqual(want.discs);
    expect(r.discs[0].arc[2]).toBeCloseTo(instrumentTapAt(tap, { ageMs: 120, strength: 1 }).radius, 12);
  });

  it('the tap’s size is the token’s, not the tine’s width', () => {
    const r = recorder();
    drawKalimba(r.g, scene(atRest(), [{ tine: 2, pos: 0.5, vel: 1, t0: 0 }]), PALETTE, 0);
    expect(r.discs[0].arc[2]).toBeCloseTo(INSTRUMENT_TAP_DEFAULT.size * INSTRUMENT_TAP_DEFAULT.start, 12);
    expect(L.tw).not.toBeCloseTo(INSTRUMENT_TAP_DEFAULT.size, 2);
  });

  it('it keeps the frame moving for the duration, and is gone after', () => {
    const tap = { ...INSTRUMENT_TAP_DEFAULT, durationMs: 400 };
    const press: Press = { tine: 4, pos: 1, vel: 1, t0: 0 };
    expect(drawKalimba(recorder().g, scene(atRest(), [press], tap), PALETTE, 399)).toBe(true);
    const r = recorder();
    expect(drawKalimba(r.g, scene(atRest(), [press], tap), PALETTE, 400)).toBe(false);
    expect(r.discs).toEqual([]);
  });

  it('a rest or played colour it cannot read draws no tap — but the frame still runs its course', () => {
    const r = recorder();
    const odd = { ...PALETTE, played: 'oklch(0.7 0.1 50)' };
    expect(drawKalimba(r.g, scene(atRest(), [{ tine: 4, pos: 1, vel: 1, t0: 0 }]), odd, 10)).toBe(true);
    expect(r.discs).toEqual([]);
  });
});
