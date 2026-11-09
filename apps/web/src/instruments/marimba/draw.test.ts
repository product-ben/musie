/**
 * The marimba's look: the experiment's own `lightUp` / `cords` / `bar` /
 * `dots` / `draw`, run beside `createPicture` on a recording context, must
 * paint the same frames — with the experiment's colours replaced one-for-one
 * by the palette (rest, played, answer, detail, background).
 *
 * Plus what is not the experiment's: the colour parser the probe's output
 * goes through, and WARM_SHARE, the one number the port had to add — derived
 * here from the tokens it stands in for, so a change of `--instrument-played`
 * turns this red instead of the ground quietly turning orange.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { InstrumentPalette } from '../types';
import { WARM_SHARE, createPicture, hitBar, isPortrait, layoutBars, mixColour, parseColour, withAlpha, type Player } from './draw';
import type { MarimbaSound } from './sound';
import { PALETTE, loadMarimba } from './testing';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const html = readFileSync(join(ROOT, 'apps/web/public/experiments/marimba/261108-1740/index.html'), 'utf8');
const amendments = readFileSync(join(ROOT, 'packages/design-system/tokens/musy-foundations-amendments.css'), 'utf8');

function cut(from: string, to: string): string {
  const a = html.indexOf(from);
  const b = html.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error(`marimba experiment: not found ${from} … ${to}`);
  return html.slice(a, b);
}

const sound = loadMarimba().definition.sound as unknown as MarimbaSound;
const BOX = { width: 844, height: 390, dpr: 3, inset: { top: 64, right: 47, bottom: 72, left: 47 } };

/** A 2D context that logs every paint with its resolved colour as numbers, rounded. */
function recorder() {
  const log: unknown[][] = [];
  const num = (v: unknown) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v);
  const colour = (c: unknown) =>
    typeof c === 'string' ? (c.match(/-?[\d.]+/g) ?? []).map(Number).map(num) : (c as { stops: unknown[] }).stops;
  const g: Record<string, unknown> = { fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: 'butt', globalAlpha: 1 };
  for (const op of ['beginPath', 'roundRect', 'arc', 'moveTo', 'lineTo']) {
    g[op] = (...a: unknown[]) => log.push([op, ...a.map(num)]);
  }
  g.setTransform = (...a: unknown[]) => log.push(['setTransform', ...a]);
  g.fill = () => log.push(['fill', colour(g.fillStyle), num(g.globalAlpha)]);
  g.fillRect = (...a: unknown[]) => log.push(['fillRect', colour(g.fillStyle), ...a.map(num)]);
  g.stroke = () => log.push(['stroke', colour(g.strokeStyle), g.lineWidth, g.lineCap]);
  g.createRadialGradient = (...a: unknown[]) => {
    const stops: unknown[] = [['radial', ...a.map(num)]];
    return { stops, addColorStop: (at: number, c: string) => stops.push([at, colour(c)]) };
  };
  return { g: g as unknown as CanvasRenderingContext2D, log };
}

describe('Zeichnen = the experiment’s, in the palette', () => {
  const L = layoutBars(BOX, sound.SCALE);
  const ours = createPicture(10, sound.visual);
  const oursLog = recorder();
  const theirsLog = recorder();
  const theirs = new Function('g', 'C', 'L', `
    const SCALE = Array.from({ length: 10 }, () => ({}));
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const N = () => 10, kick = () => {};
    let clock = 0; const performance = { now: () => clock };
    let W = ${BOX.width}, H = ${BOX.height}, calm = 0;
    ${cut('const rgb = c =>', 'const header = document')}
    ${cut('function cords()', 'let raf = 0;')}
    ${cut('function lightUp(', '// ════════ Audio')}
    return {
      lightUp(i, vel, who, pos, at) { clock = at; lightUp(i, vel, who, pos); },
      frame(at) { draw(at); return state.some(s => s.on) || presses.length > 0; },
    };`)(theirsLog.g, {
    bg: PALETTE.background, warm: PALETTE.played, rest: PALETTE.rest, cord: PALETTE.detail, hole: PALETTE.detail,
    me: PALETTE.played, you: PALETTE.answer,
  }, L) as { lightUp(i: number, vel: number, who: string, pos: number, at: number): void; frame(at: number): boolean };

  const strokes: [at: number, i: number, vel: number, who: Player, pos: number][] = [
    [1000, 3, 0.8, 'played', 0.3],
    [1100, 3, 0.5, 'played', 0.6], // again while lit, same player: keeps 70 %
    [1150, 7, 0.6, 'answer', 0.5],
    [1200, 3, 0.2, 'answer', 0.5], // the other player: does not (0.2, not 70 % of 0.56)
    [1250, 0, 1, 'played', 1.3], // past the end: the dot stays on the bar
    [3000, 9, 0.15, 'played', 0.5],
  ];
  /* Dense enough to catch each bar crossing the “lit” threshold (glow 0.02) and each dot ending (600 ms). */
  const frames = [
    1000, 1050, 1100, 1120, 1150, 1200, 1250, 1300, 1700, 1800, 1900, 2500,
    ...Array.from({ length: 50 }, (_, k) => 3000 + k * 75), 9000,
  ];

  it('frame by frame, the same paint and the same “still moving”', () => {
    const events = [
      ...strokes.map((s) => ({ at: s[0], order: 0, run: () => {
        ours.lightUp(s[1], s[2], s[3], s[4], s[0]);
        theirs.lightUp(s[1], s[2], s[3] === 'answer' ? 'you' : 'me', s[4], s[0]);
      } })),
      ...frames.map((at) => ({ at, order: 1, run: () => {
        oursLog.log.length = 0;
        theirsLog.log.length = 0;
        const a = ours.draw(oursLog.g, { layout: L, dpr: 3, palette: PALETTE, warmth: 0, now: at });
        const b = theirs.frame(at);
        expect(oursLog.log.filter((c) => c[0] !== 'setTransform'), `frame ${at}`).toEqual(theirsLog.log);
        expect(a, `moving at ${at}`).toBe(b);
      } })),
    ].sort((x, y) => x.at - y.at || x.order - y.order);
    events.forEach((e) => e.run());
  });
});

describe('the picture', () => {
  const L = layoutBars(BOX, sound.SCALE);

  it('sets the device pixel ratio and paints the ground over the whole box', () => {
    const { g, log } = recorder();
    createPicture(10, sound.visual).draw(g, { layout: L, dpr: 3, palette: PALETTE, warmth: 0, now: 0 });
    expect(log[0]).toEqual(['setTransform', 3, 0, 0, 3, 0, 0]);
    expect(log[1]).toEqual(['fillRect', [250, 247, 241], 0, 0, BOX.width, BOX.height]);
  });

  it('a warmer ground blends background toward played', () => {
    const { g, log } = recorder();
    createPicture(10, sound.visual).draw(g, { layout: L, dpr: 1, palette: PALETTE, warmth: 0.5, now: 0 });
    expect(log[1][1]).toEqual(parseColour(mixColour(PALETTE.background, PALETTE.played, 0.5)));
  });

  it('nothing to draw before the first layout', () => {
    const { g, log } = recorder();
    expect(createPicture(10, sound.visual).draw(g, { layout: null, dpr: 1, palette: PALETTE, warmth: 0, now: 0 })).toBe(false);
    expect(log).toEqual([]);
  });

  it('every colour comes from the palette', () => {
    const marked: InstrumentPalette = {
      rest: 'rgb(1, 1, 1)', played: 'rgb(2, 2, 2)', answer: 'rgb(3, 3, 3)', background: 'rgb(4, 4, 4)', detail: 'rgb(5, 5, 5)',
    };
    const p = createPicture(10, sound.visual);
    p.lightUp(1, 1, 'played', 0.5, 0);
    p.lightUp(2, 1, 'answer', 0.5, 0);
    const { g, log } = recorder();
    p.draw(g, { layout: L, dpr: 1, palette: marked, warmth: 0.3, now: 100 });
    const used: number[][] = [];
    for (const c of log) {
      if (c[0] !== 'fill' && c[0] !== 'fillRect' && c[0] !== 'stroke') continue;
      const col = c[1] as unknown[];
      if (typeof col[0] === 'number') used.push(col as number[]);
      else for (const [, stop] of col.slice(1) as [number, number[]][]) used.push(stop); // a dot's gradient stops
    }
    expect(used.length).toBeGreaterThan(30);
    for (const [r, gg, b] of used) {
      expect(r).toBe(gg);
      expect(gg).toBe(b);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(5);
    }
  });
});

describe('layout and hit', () => {
  it('ten bars across the full width, low on the left and longest; the highest a good 80 % of it', () => {
    const L = layoutBars(BOX, sound.SCALE);
    expect(L.bars).toHaveLength(10);
    expect(L.x0).toBe(47);
    expect(L.x1).toBe(BOX.width - 47);
    expect(L.bars[0].h / L.bars[9].h).toBeCloseTo(Math.pow(2, (21 / 12) * 0.16), 9);
    expect(L.bars[9].h / L.bars[0].h).toBeGreaterThan(0.8);
    expect(L.bars[0].w / L.col).toBeCloseTo(0.82, 9);
    expect(L.bars[9].w / L.col).toBeCloseTo(0.7, 9);
    L.bars.forEach((b) => expect(b.y0 + b.h / 2).toBeCloseTo((L.top + L.bottom) / 2, 9));
  });

  it('keeps clear of the stage’s chrome, with the experiment’s 8 px', () => {
    const L = layoutBars(BOX, sound.SCALE);
    expect(L.top).toBe(64 + 8);
    expect(L.bottom).toBe(390 - 72 - 8);
    expect(L.bars[0].h).toBeCloseTo(L.bottom - L.top, 9);
  });

  it('a touch lands on its column, top to bottom along the bar', () => {
    const L = layoutBars(BOX, sound.SCALE);
    const b = L.bars[4];
    expect(hitBar(L, b.cx, b.y0)).toEqual({ i: 4, pos: 0 });
    expect(hitBar(L, b.cx, b.y0 + b.h)).toEqual({ i: 4, pos: 1 });
    expect(hitBar(L, b.cx + L.col / 2 - 0.01, b.y0 + b.h / 2)?.i).toBe(4); // the gap belongs to the column
    expect(hitBar(L, L.x0 - 9, b.y0)).toBeNull();
    expect(hitBar(L, b.cx, L.top - 25)).toBeNull();
  });

  it('portrait is a box taller than wide', () => {
    expect(isPortrait(null)).toBe(false);
    expect(isPortrait(BOX)).toBe(false);
    expect(isPortrait({ ...BOX, width: 390, height: 844 })).toBe(true);
  });
});

describe('colour', () => {
  it.each([
    ['rgb(227, 178, 148)', [227, 178, 148]],
    ['rgba(227, 178, 148, 0.5)', [227, 178, 148]],
    ['rgb(227 178 148 / 50%)', [227, 178, 148]],
    ['#E3B294', [227, 178, 148]],
    ['#e3b294cc', [227, 178, 148]],
    ['#abc', [170, 187, 204]],
    ['color(srgb 1 0.5 0)', [255, 128, 0]],
  ])('%s', (css, rgb) => expect(parseColour(css)).toEqual(rgb));

  it('mix and alpha', () => {
    expect(mixColour('rgb(0, 0, 0)', 'rgb(255, 100, 10)', 0)).toBe('rgb(0,0,0)');
    expect(mixColour('rgb(0, 0, 0)', 'rgb(255, 100, 10)', 1)).toBe('rgb(255,100,10)');
    expect(mixColour('rgb(0, 0, 0)', 'rgb(255, 100, 10)', 0.5)).toBe('rgb(128,50,5)');
    expect(withAlpha('rgb(1, 2, 3)', 0.4)).toBe('rgba(1,2,3,0.4)');
  });
});

describe('WARM_SHARE stands in for the experiment’s warm colour', () => {
  /** `name: #hex` inside one CSS block of the experiment. */
  const hexIn = (block: string, name: string): [number, number, number] => {
    const m = new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(block);
    if (!m) throw new Error(`not found: ${name}`);
    return parseColour(m[1]) as [number, number, number];
  };
  const tokenOf = (name: string) => {
    const m = new RegExp(`${name}:\\s*var\\((--[\\w-]+)\\)`).exec(amendments);
    if (!m) throw new Error(`not found: ${name}`);
    return m[1];
  };
  /** The share s minimising |bg + s·(played − bg) − warm|² over RGB. */
  const share = (bg: number[], played: number[], warm: number[]) => {
    const d = played.map((v, k) => v - bg[k]);
    const w = warm.map((v, k) => v - bg[k]);
    return d.reduce((s, v, k) => s + v * w[k], 0) / d.reduce((s, v) => s + v * v, 0);
  };

  it('is where the experiment’s warmest ground sits between background and played, light and dark', () => {
    const warmName = /warm: get\('(--[\w-]+)'\)/.exec(html)![1];
    const bgName = /bg: get\('(--[\w-]+)'\)/.exec(html)![1];
    const playedName = tokenOf('--instrument-played');
    const light = cut(':root {', '@media (prefers-color-scheme: dark)');
    const dark = cut(':root[data-theme="dark"] {', 'html, body {');
    const shares = [light, dark].map((block) => share(hexIn(block, bgName), hexIn(block, playedName), hexIn(block, warmName)));
    for (const s of shares) expect(Math.abs(s - WARM_SHARE)).toBeLessThan(0.015);
  });
});
