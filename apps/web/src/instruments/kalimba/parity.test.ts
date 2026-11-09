/**
 * The port against the experiment itself — `kalimba/261106-1121` in the
 * tree, the same file `sources.test.ts` reads. Where an expression can be cut
 * out of the experiment's script and run, it is, beside the port's own
 * function; where it cannot (it is wired to the DOM or to Web Audio), the
 * numbers are required to appear in the source as kalimba.json states them.
 *
 * The experiment is our own file in this repo, which is the only reason
 * evaluating pieces of it is acceptable here (as in sources.test.ts).
 *
 * ── WHAT IS DELIBERATELY NOT THE SAME ─────────────────────────────────────
 * The bridge: an arc there, a still wave here (geometry.ts). So `hit` and
 * `dots` are run with the port's `bridgeY` standing in for the experiment's
 * `waveAt`.
 *
 * The press dot's size. Since round 2 the dot is the design system's tap
 * (Ben, 2026-11-09), and its unit is the token `--instrument-tap-size`,
 * 16.85px, where the experiment's was the live tine width `L.tw`. The token
 * IS the tine width on the 393px phone it was measured on, so that is the
 * box the dots are compared at; elsewhere the radius differs by the factor
 * token / tine width and by nothing else.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { INSTRUMENT_TAP_DEFAULT } from '@musie/design-system';
import answer from '../../../../../supabase/content/instruments/answer.json';
import kalimba from '../../../../../supabase/content/instruments/kalimba.json';
import manifest from '../../../../../supabase/content/instruments/samples.json';
import type { AnswerConfig, InstrumentDefinition, InstrumentHost, StageBox } from '../types';
import { LOOK, glowAt } from './draw';
import { GEOMETRY, bridgeY, hitTine, layoutKalimba } from './geometry';
import { createKalimbaWith } from './index';
import { KEYS, KEY_POSITION } from './input';
import type { KalimbaSound, Membrane } from './sound';
import { attackOf, cutoffOf, envelopeOf, pluckHaptic, shelfOf, touchAt } from './sound';

const html = readFileSync(join(__dirname, '..', '..', '..', 'public/experiments/kalimba/261106-1121/index.html'), 'utf8');
const src = html.slice(html.indexOf('<script>'), html.lastIndexOf('</script>'));
const sound = kalimba.sound as unknown as KalimbaSound;
const P = sound.DEFAULTS;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const hz = sound.tines.map((t) => t.hz);
const definition: InstrumentDefinition = {
  id: 'kalimba', family: 'key', sound: kalimba.sound as unknown as Record<string, unknown>,
  answer: { ...answer, ...kalimba.answer } as unknown as AnswerConfig, demo: kalimba.demo,
  samples: manifest.samples.filter((s) => s.instrument === 'kalimba'),
};

/** The first capture of `re` in the experiment's script. */
function cut(re: RegExp): string {
  const m = re.exec(src);
  if (!m) throw new Error(`not in the experiment: ${re}`);
  return m[1];
}
/** An expression of the experiment, evaluated with the named values in scope. */
function run<T = number>(expression: string, scope: Record<string, unknown>): T {
  return new Function(...Object.keys(scope), `return (${expression});`)(...Object.values(scope)) as T;
}
/** A whole `function name(…) {…}` of the experiment, by its first line up to the closing brace at column 0. */
function fn(head: string): string {
  const at = src.indexOf(head);
  if (at < 0) throw new Error(`not in the experiment: ${head}`);
  return src.slice(at, src.indexOf('\n}', at) + 2);
}

const grid = (n: number) => Array.from({ length: n + 1 }, (_, k) => k / n);

describe('the tone', () => {
  const xCutoff = run<(h: number) => number>(cut(/const cutoff = (h => [^;]+);/), {});
  const xAttack = run<(h: number) => number>(cut(/const attackOf = (h => [^;]+);/), {});
  const xShelf = run<(h: number) => number>(cut(/const shelfOf = (h => [^;]+);/), {});

  it('hardness → cutoff, attack, warmth', () => {
    for (const h of grid(20)) {
      expect(cutoffOf(h, sound.tone)).toBeCloseTo(xCutoff(h), 9);
      expect(attackOf(h, sound.tone)).toBeCloseTo(xAttack(h), 12);
      expect(shelfOf(h, sound.tone)).toBeCloseTo(xShelf(h), 12);
    }
  });

  it('position → velocity and dullness', () => {
    const vel = cut(/const vel = ([^;]+);/);
    const dull = cut(/const dull = ([^;]+);/);
    for (const pos of [-0.3, ...grid(20), 1.4]) {
      const t = touchAt(pos, sound);
      expect(t.vel).toBeCloseTo(run(vel, { P, pos, clamp }), 12);
      expect(t.dull).toBeCloseTo(run(dull, { P, pos, clamp }), 12);
    }
  });

  it('the envelope and the filters of a note', () => {
    const att = cut(/att = (attackOf\(P\.hard\)[^;]+);/);
    const level = cut(/level = (\([^;]+?\) \* vel)/).replace('Math.random()', 'jitter');
    const lowpass = cut(/lp\.frequency\.value = ([^;]+);/);
    const release = /if \(P\.len <= ([\d.]+)\) \{ env\.gain\.setTargetAtTime\(0, now \+ ([^,]+), ([^)]+)\); end = now \+ ([^;]+); \}/.exec(src);
    expect(release).not.toBeNull();
    const [, fullAbove, releaseAt, releaseTau, stopAt] = release!;
    expect(Number(fullAbove)).toBe(sound.tone.release.fullAbove);
    expect(Number(cut(/lp\.Q\.value = ([\d.]+)/))).toBe(sound.tone.lowpassQ);
    expect(Number(cut(/shelf\.frequency\.value = ([\d.]+)/))).toBe(sound.tone.shelf.hz);
    expect(src).toContain('shelf.gain.value = shelfOf(P.hard)');

    const attackOfX = run<(h: number) => number>(cut(/const attackOf = (h => [^;]+);/), {});
    const cutoffX = run<(h: number) => number>(cut(/const cutoff = (h => [^;]+);/), {});
    for (const pos of grid(10)) {
      for (const jitter of [0, 0.5, 1]) {
        const t = touchAt(pos, sound);
        const e = envelopeOf(t, sound, jitter);
        const a = run(att, { attackOf: attackOfX, P, dull: t.dull });
        expect(e.attack).toBeCloseTo(a, 12);
        expect(e.level).toBeCloseTo(run(level, { jitter, vel: t.vel }), 12);
        expect(e.lowpass).toBeCloseTo(run(lowpass, { cutoff: cutoffX, P, dull: t.dull }), 9);
        expect(e.release!.at).toBeCloseTo(run(releaseAt, { att: a, P }), 12);
        expect(e.release!.tau).toBeCloseTo(run(releaseTau, { P }), 12);
        expect(e.stop!).toBeCloseTo(run(stopAt, { att: a, P }), 12);
      }
    }
  });

  it('the recordings: onset, tuning, shift, the „still“ crossfade', () => {
    expect(Number(cut(/Math\.abs\(d\[i\]\) < ([\d.]+)/))).toBe(sound.onset.threshold);
    expect(Number(cut(/Math\.max\(0, i - (\d+)\)/))).toBe(sound.onset.backSamples);
    expect(src).toContain('rate = Math.pow(2, T.semi / 12)');
    expect(src).toContain('src.detune.value = CENTS[art][note];');
    expect(src).toContain('lfoPitch.connect(src.detune);');
    expect(src).toContain("add('closed', Math.cos(openMix * Math.PI / 2)); add('open', Math.sin(openMix * Math.PI / 2));");
  });

  it('a damped tine', () => {
    const damp = fn('function damp(v, now) {');
    expect(damp).toContain(`v.env.gain.setTargetAtTime(0, now, ${sound.tone.damp.tau})`);
    expect(damp).toContain(`l.src.stop(now + ${sound.tone.damp.stop})`);
  });

  /* The experiment computes `end` and means to stop its sources there — but
     `if (end < Infinity) src.stop(end);` landed inside the comment after
     `src.start(…)`, so as it runs, a source plays to the end of its
     recording under an envelope already ~50 dB down. The port stops it at
     `end` as kalimba.json says; inaudible, and the voice is freed. */
  it('where a source stops — the experiment’s stop is in a comment', () => {
    expect(src).toMatch(/src\.start\(now, b\.offset\);\s+\/\/[^\n]*if \(end < Infinity\) src\.stop\(end\);/);
  });
});

describe('the look', () => {
  it('the tine glow', () => {
    const glow = cut(/const glow = ([^;]+);/);
    for (const t of [0, 0.1, 0.5, 1, 2, 4]) {
      for (const vel of [0.44, 0.7, 1]) expect(glowAt(t * 1000, vel)).toBeCloseTo(run(glow, { t, s: { vel } }), 12);
    }
    expect(src).toContain(`glow > ${LOOK.glow.visible} ? mix(C.rest, C.hit, Math.min(1, glow * ${LOOK.glow.gain})) : C.rest`);
  });

  it('the strokes: tine from just above the bridge, bridge width and reach, sampled every 4 px', () => {
    expect(src).toContain('const y0 = waveAt(T.cx) - L.tw * 0.5, y1 = waveAt(T.cx) + T.len;');
    const w = GEOMETRY.bridgeWidth;
    expect(src).toContain(`g.lineWidth = clamp(L.tw * ${w.ofTine}, ${w.min}, ${w.max})`);
    expect(src).toContain(`const ext = L.pitch * ${GEOMETRY.bridgeReach}`);
    expect(src).toContain(`x += ${GEOMETRY.bridgeStep}`);
  });
});

/**
 * The press dot, end to end: touches on the ADAPTER, drawn by its own frame
 * (through `instrumentTapAt` + `paintInstrumentTap`, on `host.tap()` = the
 * tokens as shipped), beside the experiment's OWN `dots` — cut out whole,
 * from `const DOT_MS` to its closing brace — given the same presses. Both
 * draw on one recording context.
 */
describe('the press dot = the experiment’s `dots`, through the design system’s tap', () => {
  const REST = 'rgb(180, 170, 150)';
  const PLAYED = 'rgb(170, 90, 60)';
  /** From `const DOT_MS` to the closing brace of `function dots` — the effect, whole. */
  const dots = fn('const DOT_MS = ');
  const helpers = `${cut(/(const rgb = [^\n]+)/)}\n${cut(/(const mix = [^\n]+)/)}`;

  type Disc = { arc: number[]; alpha: number; gradient: { args: number[]; stops: [number, string][] } };
  /** A 2D context that keeps every disc it fills, whole, and lets every other call pass. */
  function recorder() {
    const discs: Disc[] = [];
    let arc: number[] = [];
    const g = {
      globalAlpha: 1, fillStyle: null as unknown, strokeStyle: '' as unknown, lineWidth: 1, lineCap: '', lineJoin: '',
      setTransform() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
      arc: (...args: number[]) => { arc = args; },
      createRadialGradient: (...args: number[]) => {
        const stops: [number, string][] = [];
        return { args, stops, addColorStop: (at: number, c: string) => void stops.push([at, c]) };
      },
      fill: () => {
        const { args, stops } = g.fillStyle as Disc['gradient'];
        discs.push({ arc, alpha: g.globalAlpha, gradient: { args, stops } });
      },
    };
    return { g: g as unknown as CanvasRenderingContext2D, discs };
  }

  /** Tine, and where on it (0 bridge … 1 tip; 1.2 is below the tip and is drawn at it). */
  const TOUCHES = [[0, 0.1], [2, 0.35], [4, 0.6], [6, 0.85], [8, 1.2]] as const;

  /** The same touches, `age` ms later: the kalimba's frame and the experiment's `dots`. */
  function both(box: StageBox, age: number) {
    const L = layoutKalimba(box, hz)!;
    const host = {
      audio: {} as AudioContext, audible: () => true, buffer: () => undefined, shadow: () => null,
      tap: () => INSTRUMENT_TAP_DEFAULT,
      palette: () => ({ rest: REST, played: PLAYED, answer: 'rgb(0, 150, 50)', background: 'rgb(250, 250, 240)', detail: 'rgb(120, 120, 110)' }),
      vibrate() {}, motion: () => null, joltsSince: () => [], played() {}, holding() {}, requestDraw() {},
    } satisfies InstrumentHost;
    const k = createKalimbaWith(definition, host, {
      output: { canSound: () => false, pluck: () => null, membrane() {}, sounding: () => 0, dispose() {} },
      every: () => () => {},
      now: () => 1000,
    });
    k.layout(box);
    const presses = TOUCHES.map(([tine, at], n) => {
      const x = L.tines[tine].cx;
      const y = bridgeY(L, x) + at * L.tines[tine].len;
      k.pointerDown({ id: n + 1, x, y, t: 0, type: 'touch' });
      const h = hitTine(L, x, y)!;
      return { i: h.tine, pos: h.pos, vel: touchAt(h.pos, sound).vel, t0: 1000 };
    });
    const mine = recorder();
    k.draw(mine.g, 1000 + age);
    const theirs = recorder();
    run<void>(
      `(() => { ${helpers}\n${dots}\npresses = list; dots(now); })()`,
      { g: theirs.g, L, C: { rest: REST, hit: PLAYED }, waveAt: (x: number) => bridgeY(L, x), clamp, list: presses, now: 1000 + age },
    );
    return { L, kalimba: mine.discs, experiment: theirs.discs };
  }

  /** The same dots, but for the radius, which stands in the ratio `ratio` to the experiment's. */
  function expectSame(kalimbaDiscs: Disc[], experimentDiscs: Disc[], ratio: number) {
    expect(kalimbaDiscs).toHaveLength(experimentDiscs.length);
    kalimbaDiscs.forEach((d, n) => {
      const x = experimentDiscs[n];
      const [cx, cy, r, ...arc] = d.arc;
      const [xcx, xcy, xr, ...xarc] = x.arc;
      expect([cx, cy, ...arc], `disc ${n}: centre and sweep`).toEqual([xcx, xcy, ...xarc]);
      expect(r / xr, `disc ${n}: radius`).toBeCloseTo(ratio, 12);
      expect(d.gradient.args.slice(0, 5), `disc ${n}: gradient`).toEqual(x.gradient.args.slice(0, 5));
      expect(d.gradient.args[5]).toBe(r);
      expect(d.gradient.stops, `disc ${n}: colour`).toEqual(x.gradient.stops);
      expect(d.alpha, `disc ${n}: opacity`).toBe(x.alpha);
    });
  }

  /** 393 × 852, the phone the size token was measured on: there the tine width is the token. */
  const PHONE: StageBox = { width: 393, height: 852, dpr: 3, inset: { top: 160, right: 0, bottom: 96, left: 0 } };

  it('at 393 px wide the kalimba’s tine width is the size token, to the token’s two decimals', () => {
    const L = layoutKalimba(PHONE, hz)!;
    expect(L.tw).toBeCloseTo(INSTRUMENT_TAP_DEFAULT.size, 2);
    expect(INSTRUMENT_TAP_DEFAULT.size / L.tw).toBeCloseTo(1, 3);
  });

  it.each([0, 1, 35, 120, 350, 520, 699])('at 393 px wide, %i ms after the touch, it draws the experiment’s dots', (age) => {
    const { L, kalimba: mine, experiment } = both(PHONE, age);
    expect(experiment).toHaveLength(TOUCHES.length);
    expectSame(mine, experiment, INSTRUMENT_TAP_DEFAULT.size / L.tw);
  });

  it('and both are gone after the experiment’s DOT_MS, which is the duration token', () => {
    expect(Number(cut(/const DOT_MS = (\d+)/))).toBe(INSTRUMENT_TAP_DEFAULT.durationMs);
    const { kalimba: mine, experiment } = both(PHONE, INSTRUMENT_TAP_DEFAULT.durationMs);
    expect(experiment).toEqual([]);
    expect(mine).toEqual([]);
  });

  it('on a wide screen the tine clamps at 22 px and the dot stays the token’s size: ~23% smaller, accepted', () => {
    const wide: StageBox = { width: 1280, height: 800, dpr: 2, inset: { top: 140, right: 0, bottom: 60, left: 0 } };
    const { L, kalimba: mine, experiment } = both(wide, 120);
    expect(L.tw).toBe(GEOMETRY.tineWidth.max);
    expectSame(mine, experiment, INSTRUMENT_TAP_DEFAULT.size / L.tw);
    expect(1 - INSTRUMENT_TAP_DEFAULT.size / L.tw).toBeCloseTo(0.23, 1);
  });
});

describe('where things are', () => {
  /** The experiment's `layout()`, run on stand-ins for the window, header and footer. */
  const xLayout = (W: number, H: number, headerBottom: number, footTop: number) =>
    run<Record<string, unknown>>(
      `(() => {
        let L = null, W = 0, H = 0;
        const devicePixelRatio = 2, innerWidth = ${W}, innerHeight = ${H};
        const cv = {}, g = { setTransform() {} }, draw = () => {};
        const header = { getBoundingClientRect: () => ({ bottom: ${headerBottom} }) };
        const foot = { classList: { contains: () => false } };
        const btnSettings = { getBoundingClientRect: () => ({ top: ${footTop} }) }, toolbarEl = btnSettings;
        const tines = () => hz.map((hz) => ({ hz }));
        ${fn('function layout() {')}
        layout();
        return L;
      })()`,
      { clamp, hz: sound.tines.map((t) => t.hz), performance },
    );

  const sizes: [number, number, number, number][] = [[390, 844, 160, 780], [320, 568, 120, 520], [1280, 800, 140, 740], [768, 1024, 180, 960]];

  it.each(sizes)('layout at %i × %i', (W, H, headerBottom, footTop) => {
    const x = xLayout(W, H, headerBottom, footTop) as Record<string, number> & { tines: { cx: number; len: number }[] };
    const box: StageBox = { width: W, height: H, dpr: 2, inset: { top: headerBottom, right: 0, bottom: H - footTop, left: 0 } };
    const L = layoutKalimba(box, sound.tines.map((t) => t.hz))!;
    for (const k of ['top', 'bottom', 'x0', 'width', 'pitch', 'tw', 'amp', 'waveY', 'avail'] as const) {
      expect(L[k]).toBeCloseTo(x[k], 9);
    }
    L.tines.forEach((t, i) => {
      expect(t.cx).toBeCloseTo(x.tines[i].cx, 9);
      expect(t.len).toBeCloseTo(x.tines[i].len, 9);
    });
  });

  it('hit test, with the still bridge standing in for the arc', () => {
    const L = layoutKalimba({ width: 390, height: 844, dpr: 2, inset: { top: 160, right: 0, bottom: 64, left: 0 } }, sound.tines.map((t) => t.hz))!;
    const xHit = run<(x: number, y: number) => { i: number; pos: number } | null>(
      `(() => { ${fn('function hit(x, y) {')} return hit; })()`,
      { L, clamp, waveAt: (x: number) => bridgeY(L, x) },
    );
    for (let x = -10; x <= 400; x += 7) {
      for (let y = 100; y <= 800; y += 13) {
        const mine = hitTine(L, x, y);
        const theirs = xHit(x, y);
        if (theirs === null) expect(mine).toBeNull();
        else {
          expect(mine?.tine).toBe(theirs.i);
          expect(mine!.pos).toBeCloseTo(theirs.pos, 12);
        }
      }
    }
  });

  it('keys', () => {
    expect(src).toContain(`const KEYS = [${KEYS.map((k) => `'${k}'`).join(', ')}];`);
    expect(src).toContain(`play(i, e.shiftKey ? ${KEY_POSITION.shift} : ${KEY_POSITION.plain})`);
    expect(src).toContain("if (k === 'v') { vHeld = true; return; }");
  });
});

describe('a pluck’s vibration', () => {
  it('the experiment’s formula', () => {
    const m = /buzz\(Math\.round\(([^)]+)\), (vel > [\d.]+ \? \d+ : \d+)\)/.exec(src);
    expect(m).not.toBeNull();
    for (const vel of [0.44, 0.5, 0.6, 0.61, 0.8, 1]) {
      expect(pluckHaptic(vel, sound.haptics.pluck)).toEqual({ ms: Math.round(run(m![1], { vel })), ticks: run(m![2], { vel }) });
    }
  });

  it('a note touched before audio runs may still sound for 700 ms', () => {
    expect(Number(cut(/pending\.t < (\d+)/))).toBe(sound.pendingMs);
  });
});

/**
 * The 30 ms step, end to end: the experiment's interval body run on a
 * recorded membrane, beside the ADAPTER fed the same readings through a fake
 * host. Same swing envelope, same membrane targets, same vibrations.
 */
describe('Schwenken → Vibrato, step for step', () => {
  const head = 'setInterval(() => {';
  const from = src.indexOf(head);
  const to = src.indexOf('\n}, ', from);
  const body = src.slice(from + head.length, to);
  const tickMs = Number(/^\n\}, (\d+)\);/.exec(src.slice(to))![1]);

  /** Readings (null: no event that step), V held, tines ringing — per step. */
  const script: { reading: number | null; held: boolean; sounding: boolean }[] = [
    ...[0.2, null, 0.9, 0.4, null, null, 1.3, null].map((reading) => ({ reading, held: false, sounding: false })),
    ...Array.from({ length: 12 }, (_, k) => ({ reading: k % 3 === 0 ? 0.6 : null, held: false, sounding: true })),
    ...Array.from({ length: 10 }, () => ({ reading: null, held: true, sounding: true })),
    ...Array.from({ length: 50 }, () => ({ reading: null, held: false, sounding: false })),
  ];

  type Step = { env: number; membrane: Membrane; tau: Record<string, number>; buzz: [number, number] | null };

  const experiment = (): Step[] =>
    run<Step[]>(
      `(() => {
        let rot = 0, swingEnv = 0, vHeld = false, lastBuzz = 0, openMix = 0, clock = 1000;
        const motionOn = true, haptics = true, canBuzzFreely = () => true;
        const performance = { now: () => clock };
        let buzzed = null; const buzz = (ms, ticks) => { buzzed = [ms, ticks]; };
        const seen = {}, tau = {};
        const rec = (name) => ({ setTargetAtTime: (v, t, k) => { seen[name] = v; tau[name] = k; } });
        const ctx = { currentTime: 0 };
        const lfo = { frequency: rec('lfoHz') }, lfoTrem = { gain: rec('tremolo') }, lfoPeak = { gain: rec('peakHz') };
        const lfoPitch = { gain: rec('pitchCents') }, memPeak = { gain: rec('peakGainDb') };
        let voices = { size: 0, forEach() {} };
        const out = [];
        for (const s of script) {
          if (s.reading !== null) rot = Math.max(rot, clamp(s.reading, 0, 1));   // onMotion
          vHeld = s.held; voices = { size: s.sounding ? 1 : 0, forEach() {} }; buzzed = null;
          clock += ${tickMs};
          ${body}
          out.push({ env: swingEnv, membrane: { ...seen, openMix }, tau: { ...tau }, buzz: buzzed });
        }
        return out;
      })()`,
      { script, clamp, P },
    );

  const port = (): Step[] => {
    let clock = 1000;
    let reading: { rotation: number; jolt: number; at: number } | null = null;
    let sounding = false;
    let tick: () => void = () => {};
    const membranes: Membrane[] = [];
    const buzzes: [number, number | undefined][] = [];
    const host = {
      audio: {} as AudioContext, audible: () => true, buffer: () => undefined, shadow: () => null, tap: () => INSTRUMENT_TAP_DEFAULT,
      palette: () => ({ rest: '', played: '', answer: '', background: '', detail: '' }),
      vibrate: (ms: number, ticks?: number) => { buzzes.push([ms, ticks]); },
      motion: () => reading, joltsSince: () => [], played() {}, holding() {}, requestDraw() {},
    } satisfies InstrumentHost;
    const k = createKalimbaWith(definition, host, {
      output: { canSound: () => false, pluck: () => null, membrane: (m) => { membranes.push(m); }, sounding: () => (sounding ? 1 : 0), dispose() {} },
      every: (ms, fn) => { if (ms === sound.swing.tickMs) tick = fn; return () => {}; },
      now: () => clock,
    });
    let held = false;
    return script.map((s, n) => {
      if (s.reading !== null) reading = { rotation: s.reading, jolt: 0, at: n };
      if (s.held !== held) { held = s.held; if (held) k.keyDown('v', false); else k.keyUp('v'); }
      sounding = s.sounding;
      clock += sound.swing.tickMs;
      const before = buzzes.length;
      tick();
      const m = membranes[membranes.length - 1];
      return { env: NaN, membrane: m, tau: {}, buzz: buzzes.length > before ? (buzzes[before] as [number, number]) : null };
    });
  };

  it('runs every 30 ms', () => expect(tickMs).toBe(sound.swing.tickMs));

  it('the same membrane, step for step', () => {
    const x = experiment();
    const p = port();
    expect(p).toHaveLength(x.length);
    expect(x.some((s) => s.membrane.openMix > 0.5)).toBe(true); // the script does swing
    x.forEach((s, n) => {
      for (const key of ['lfoHz', 'tremolo', 'peakHz', 'pitchCents', 'peakGainDb', 'openMix'] as const) {
        expect(p[n].membrane[key], `step ${n}: ${key}`).toBeCloseTo(s.membrane[key], 12);
      }
    });
  });

  it('the same vibrations — the port asks for no iOS tick, which the experiment never gave a swing', () => {
    const x = experiment();
    const p = port();
    expect(x.filter((s) => s.buzz).length).toBeGreaterThan(2);
    x.forEach((s, n) => {
      expect(p[n].buzz?.[0] ?? null, `step ${n}`).toBe(s.buzz?.[0] ?? null);
      if (p[n].buzz) expect(p[n].buzz![1]).toBe(0);
    });
  });

  it('with the time constants kalimba.json carries', () => {
    const { tau } = experiment()[0];
    const m = sound.membrane;
    expect(tau).toEqual({
      lfoHz: m.lfo.rateTau, tremolo: m.depth.tau, peakHz: m.depth.tau, pitchCents: m.depth.tau, peakGainDb: m.depth.peakGainTau,
    });
    expect(src).toContain(`l.g.gain.setTargetAtTime(t, now, ${m.crossfadeTau})`);
  });
});
