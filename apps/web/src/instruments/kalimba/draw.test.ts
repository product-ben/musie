/**
 * The look: colours from the palette and nowhere else, a glow that fades,
 * dots that grow and fade. The canvas is a recording fake.
 */
import { describe, expect, it } from 'vitest';
import kalimba from '../../../../../supabase/content/instruments/kalimba.json';
import type { InstrumentPalette } from '../types';
import { dotAt, drawKalimba, glowAt, glowMix, mixColour, parseColour, withAlpha } from './draw';
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

/** A 2D context that records what was stroked and filled, in which colour. */
function recorder() {
  const strokes: string[] = [];
  const fills: string[] = [];
  const stops: string[] = [];
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
    arc() {},
    stroke() { strokes.push(String(g.strokeStyle)); },
    fill() { fills.push(typeof g.fillStyle === 'string' ? g.fillStyle : 'gradient'); },
    createRadialGradient() { return { addColorStop: (_at: number, c: string) => stops.push(c) }; },
  };
  return { g: g as unknown as CanvasRenderingContext2D, strokes, fills, stops };
}

const atRest = (): TineGlow[] => Array.from({ length: 9 }, () => ({ t0: -1e9, vel: 1, tone: 'played' as const }));
const scene = (glows: TineGlow[], presses: Press[] = []) =>
  ({ layout: L, glows, presses, dotMs: 700, width: 390, height: 844 });

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
    expect(withAlpha('rgb(150,100,50)', 0.3)).toBe('rgba(150,100,50,0.3)');
  });
  it('a colour it cannot read is drawn unmixed, never as black', () => {
    expect(mixColour('oklch(0.7 0.1 50)', PALETTE.played, 0.2)).toBe('oklch(0.7 0.1 50)');
    expect(mixColour('oklch(0.7 0.1 50)', PALETTE.played, 0.8)).toBe(PALETTE.played);
  });
});

describe('glow and dots', () => {
  it('a tine glows for a while and then rests', () => {
    expect(glowAt(0, 1)).toBe(1);
    expect(glowAt(0, 0)).toBeCloseTo(0.4, 12);
    expect(glowMix(glowAt(1000, 1))).toBeCloseTo(Math.min(1, Math.exp(-1 / 1.1) * 1.1), 12);
    expect(glowMix(glowAt(5000, 1))).toBeNull();
  });
  it('a dot sits where the tine was touched, grows, and is gone after 700 ms', () => {
    const d: Press = { tine: 2, pos: 0.5, vel: 1, t0: 0, tone: 'played' };
    const start = dotAt(L, d, 0, 700)!;
    const later = dotAt(L, d, 350, 700)!;
    expect(start.x).toBe(L.tines[2].cx);
    expect(start.y).toBeCloseTo(bridgeY(L, L.tines[2].cx) + 0.5 * L.tines[2].len, 9);
    expect(start.r).toBeCloseTo(L.tw * 0.8, 9);
    expect(later.r).toBeGreaterThan(start.r);
    expect(later.alpha).toBeLessThan(start.alpha);
    expect(dotAt(L, d, 700, 700)).toBeNull();
    expect(dotAt(L, { ...d, pos: 1.4 }, 0, 700)!.y).toBeCloseTo(bridgeY(L, L.tines[2].cx) + L.tines[2].len, 9);
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

  it('a dot is a soft gradient between rest and the hit colour, and keeps the frame moving', () => {
    const r = recorder();
    const press: Press = { tine: 4, pos: 1, vel: 1, t0: 0, tone: 'answer' };
    expect(drawKalimba(r.g, scene(atRest(), [press]), PALETTE, 10)).toBe(true);
    const c = mixColour(PALETTE.rest, PALETTE.answer, 1);
    expect(r.stops).toEqual([withAlpha(c, 1), withAlpha(c, 0.8), withAlpha(c, 0.3), withAlpha(c, 0)]);
    expect(drawKalimba(recorder().g, scene(atRest(), [press]), PALETTE, 800)).toBe(false);
  });
});
