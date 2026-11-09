/**
 * The harp adapter = the harp experiment — checked by running the
 * experiment's OWN functions next to the port and requiring the same result.
 *
 * `sources.test.ts` holds `harp.json` to the experiment's constants; this
 * holds the code that reads those constants: the audio graph (`initAudio`,
 * `impulse`, `dynGain`, `play`, `fade`), the haptics (`pluckBuzz`), the
 * geometry (`layout`, `zone`, `maxPull`, `tension`, `strength`, `nearest`),
 * the pointer handlers and the 'A' strum, the motion (`pluck`,
 * `answerPluck`, `level`, `frame`) and the colour blend (`mix`).
 *
 * The experiment's functions are cut out of its script by name and run with
 * stubs for what they reach outside themselves. It is our own file in this
 * repo; that is the only reason running it is acceptable (as in
 * `shadow.test.ts` and `sources.test.ts`).
 *
 * The tap dot (round 2, `tap.ts`) is NOT the experiment's, so nothing here
 * compares it: `shapeStrings` knows nothing of it, the dots are a pass of
 * their own painted after `paintHarp`, and the input sink below logs a
 * note's string and velocity — not the `PluckSpot` the port now reports with
 * it. The dots are held to their brief in `adapter.test.ts`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { StagePointer } from '../types';
import { createMixer, parseColour } from './colour';
import { newString, pluckString, shapeStrings, type StringState } from './draw';
import { maxPull, nearest, strength, stringXs, tension, zone } from './geometry';
import { createHarpInput, type Pull } from './input';
import { createHarpSound, dynGain, pluckBuzz, type HarpSound, type LoadedSample } from './sound';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const html = readFileSync(join(ROOT, 'apps/web/public/experiments/harp/261109-0920/index.html'), 'utf8');
const harp = JSON.parse(readFileSync(join(ROOT, 'supabase/content/instruments/harp.json'), 'utf8')) as {
  sound: HarpSound;
  demo: { string: number; velocity: number };
};
const sound = harp.sound;

/* ── cutting the experiment apart ──────────────────────────────────────── */

/** From the first bracket after `from`, to its partner. */
function bracketed(from: number): number {
  let i = from;
  while (html[i] !== '{' && html[i] !== '[') i += 1;
  const open = html[i];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  for (; i < html.length; i += 1) {
    if (html[i] === open) depth += 1;
    else if (html[i] === close) {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  throw new Error('unbalanced');
}

/** A top-level `function name(…) {…}`. */
function fn(name: string): string {
  const at = html.indexOf(`\nfunction ${name}(`);
  if (at < 0) throw new Error(`harp: function ${name} not found`);
  return html.slice(at + 1, bracketed(html.indexOf(')', at)));
}

/** The source line that starts with `marker`. */
function line(marker: string): string {
  const at = html.indexOf(`\n${marker}`);
  if (at < 0) throw new Error(`harp: ${marker} not found`);
  return html.slice(at + 1, html.indexOf('\n', at + 1));
}

/** The value of `const NAME = {…}` / `[…]`. */
function literal(marker: string): unknown {
  const at = html.indexOf(marker);
  if (at < 0) throw new Error(`harp: ${marker} not found`);
  let start = at + marker.length;
  while (html[start] !== '{' && html[start] !== '[') start += 1;
  return new Function(`return (${html.slice(start, bracketed(start))});`)();
}

/** Run experiment source with `stubs` as the names it reaches for. */
function run<T>(code: string, stubs: Record<string, unknown>, result: string): T {
  const names = Object.keys(stubs);
  return new Function(...names, `${code}\nreturn (${result});`)(...names.map((n) => stubs[n])) as T;
}

/** Mulberry32 — the same noise for both sides. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mathWith = (random: () => number): Math => Object.assign(Object.create(Math) as Math, { random });

/* ── a recording AudioContext ──────────────────────────────────────────── */

type Entry = (string | number)[];

class FakeParam {
  log: Entry[] = [];
  constructor(public value: number) {}
  setValueAtTime(v: number, t: number) {
    this.log.push(['set', v, t]);
    return this;
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.log.push(['ramp', v, t]);
    return this;
  }
  setTargetAtTime(v: number, t: number, c: number) {
    this.log.push(['target', v, t, c]);
    return this;
  }
  cancelScheduledValues(t: number) {
    this.log.push(['cancel', t]);
    return this;
  }
}

class FakeBuffer {
  channels: Float32Array[];
  constructor(public numberOfChannels: number, public length: number, public sampleRate: number) {
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }
  get duration() {
    return this.length / this.sampleRate;
  }
  getChannelData(c: number) {
    return this.channels[c];
  }
}

class FakeNode {
  out: FakeNode[] = [];
  started: number[] = [];
  stopped: number[] = [];
  buffer: unknown = null;
  type = '';
  onended: (() => void) | null = null;
  params: Record<string, FakeParam>;
  constructor(public kind: string, defaults: Record<string, number>) {
    this.params = Object.fromEntries(Object.entries(defaults).map(([k, v]) => [k, new FakeParam(v)]));
    Object.assign(this, this.params);
  }
  connect(n: FakeNode) {
    this.out.push(n);
    return n;
  }
  disconnect() {
    this.out = [];
  }
  start(t: number) {
    this.started.push(t);
  }
  stop(t: number) {
    this.stopped.push(t);
  }
}

class FakeAudio {
  currentTime = 0;
  sampleRate = 8000;
  state = 'running';
  created: FakeNode[] = [];
  destination = new FakeNode('destination', {});
  private node(kind: string, defaults: Record<string, number>) {
    const n = new FakeNode(kind, defaults);
    this.created.push(n);
    return n;
  }
  createGain() {
    return this.node('gain', { gain: 1 });
  }
  createBiquadFilter() {
    const n = this.node('biquad', { frequency: 350, Q: 1, gain: 0 });
    n.type = 'lowpass';
    return n;
  }
  createBufferSource() {
    return this.node('source', { playbackRate: 1 });
  }
  createStereoPanner() {
    return this.node('panner', { pan: 0 });
  }
  createDynamicsCompressor() {
    return this.node('compressor', { threshold: -24, knee: 30, ratio: 12, attack: 0.003, release: 0.25 });
  }
  createConvolver() {
    return this.node('convolver', {});
  }
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new FakeBuffer(channels, length, sampleRate);
  }
}

/** A node as data: kind, settings, automation, and where it goes. */
function described(n: FakeNode, buses: FakeNode[], dest: FakeNode): unknown {
  const label = (b: unknown) => (b instanceof FakeBuffer ? 'impulse' : (b as { label?: string } | null)?.label ?? null);
  const to = (o: FakeNode) => (o === dest ? 'destination' : buses.includes(o) ? `bus ${buses.indexOf(o)}` : described(o, buses, dest));
  return {
    kind: n.kind,
    type: n.type,
    buffer: label(n.buffer),
    params: Object.fromEntries(Object.entries(n.params).map(([k, p]) => [k, { value: p.value, log: p.log }])),
    started: n.started,
    stopped: n.stopped,
    out: n.out.map(to),
  };
}

/* ── the audio graph ───────────────────────────────────────────────────── */

describe('sound = the experiment’s initAudio, impulse, dynGain, play, fade', () => {
  const P = { ...sound.preset };
  const SOUNDS = literal('const SOUNDS =');
  /* Six recordings, two of them shorter than the 3.2 s stop, so both
     branches of `Math.min(length, …)` are taken. */
  const recordings = Object.entries(sound.samples.notes).map(([label, midi], k) => ({
    midi,
    buffer: { label, duration: k % 2 ? 2 : 5 },
  }));

  function experiment(audio: FakeAudio, seed: number) {
    const code = [line('const midis ='), fn('dynGain'), fn('initAudio'), fn('impulse'), fn('fade'), fn('play')].join('\n');
    return run<{ init: () => void; play: (i: number, vel: number) => unknown; fade: (v: unknown, t: number, tau: number) => void }>(
      code,
      {
        window: { AudioContext: function AudioContext() { return audio; } },
        navigator: {},
        SAMPLES: {},
        Math: mathWith(seeded(seed)),
        P,
        SOUNDS,
        state: { engine: sound.engine },
        SCALE: sound.tuning.SCALE,
        ROOT: sound.tuning.ROOT,
        COUNT: sound.tuning.COUNT,
        wake: () => {},
        audible: () => true,
        ctx: undefined,
        dry: undefined,
        conv: undefined,
        wetBus: undefined,
        /* Decoded in the order they were requested: ascending. */
        sampleBufs: [...recordings].sort((a, b) => a.midi - b.midi).map((r) => ({ midi: r.midi, buf: r.buffer })),
        voices: [],
        ksCache: new Map(),
        ksBuffer: () => {
          throw new Error('generiert is not the default');
        },
      },
      '{ init: initAudio, play, fade }',
    );
  }

  function port(audio: FakeAudio, seed: number) {
    return createHarpSound(audio as unknown as AudioContext, sound, () => recordings as unknown as LoadedSample[], seeded(seed));
  }

  it('the master chain, dry and reverb: same nodes, same settings, same wiring', () => {
    const a = new FakeAudio();
    experiment(a, 1).init();
    const b = new FakeAudio();
    port(b, 1);
    const chain = (f: FakeAudio) => f.created.map((n) => described(n, f.created, f.destination));
    expect(a.created.map((n) => n.kind)).toEqual(['compressor', 'gain', 'compressor', 'gain', 'gain', 'convolver']);
    expect(chain(b)).toEqual(chain(a));
  });

  it('the reverb impulse: the same noise, decay and fade-in, sample for sample', () => {
    const a = new FakeAudio();
    experiment(a, 42).init();
    const b = new FakeAudio();
    port(b, 42);
    const ir = (f: FakeAudio) => f.created.find((n) => n.kind === 'convolver')?.buffer as FakeBuffer;
    expect(ir(b).numberOfChannels).toBe(2);
    expect(ir(b).length).toBe(Math.floor(a.sampleRate * sound.preset.room));
    for (let c = 0; c < 2; c += 1) {
      expect(Buffer.from(ir(b).channels[c].buffer).equals(Buffer.from(ir(a).channels[c].buffer))).toBe(true);
    }
  });

  it('dynamics: the same loudness for every velocity', () => {
    const { dynGain: theirs } = run<{ dynGain: (v: number) => number }>(fn('dynGain'), { P }, '{ dynGain }');
    for (let v = 0; v <= 1.0001; v += 0.01) expect(dynGain(v, sound)).toBe(theirs(v));
  });

  it('voices: sample choice, pitch, filter, envelope, pan, damping, ducking, voice limit, interruption', () => {
    const a = new FakeAudio();
    const theirs = experiment(a, 3);
    theirs.init();
    const b = new FakeAudio();
    const ours = port(b, 3);
    const setup = a.created.length;
    expect(b.created.length).toBe(setup);

    /* Same string twice (damping), more notes than voices (the limit), soft
       and hard, every string — then an answer note interrupted. */
    const notes: [number, number, number][] = [
      [0, 0, 0.5], [0.1, 3, 0.9], [0.2, 3, 0.3], [0.5, 1, 0.12], [0.6, 6, 1], [0.7, 5, 0.6],
      [0.8, 4, 0.7], [0.9, 2, 0.4], [1.0, 0, 0.8], [1.1, 1, 0.22], [1.15, 5, 0.08],
    ];
    let lastTheirs: unknown = null;
    let lastOurs: ReturnType<typeof ours.play> = null;
    for (const [t, i, vel] of notes) {
      a.currentTime = t;
      b.currentTime = t;
      lastTheirs = theirs.play(i, vel);
      lastOurs = ours.play(i, vel);
    }
    a.currentTime = 1.3;
    b.currentTime = 1.3;
    theirs.fade(lastTheirs, 1.3, 0.15);
    expect(lastOurs).not.toBeNull();
    ours.fade(lastOurs!, 0.15);

    const voices = (f: FakeAudio) =>
      f.created.slice(setup).filter((n) => n.kind === 'source').map((n) => described(n, f.created.slice(0, setup), f.destination));
    expect(voices(a)).toHaveLength(notes.length);
    expect(voices(b)).toEqual(voices(a));
  });

  it('the pitch comes from the nearest recording, the lower one on a tie', () => {
    const b = new FakeAudio();
    const ours = port(b, 1);
    const picked = sound.tuning.midis.map((_, i) => {
      ours.play(i, 0.5);
      const src = b.created[b.created.length - 6];
      return [(src.buffer as { label: string }).label, src.params.playbackRate.value];
    });
    expect(picked.map(([label]) => label)).toEqual(['C3', 'E3', 'G3', 'G3', 'B3', 'D4', 'F4']);
    expect(picked[0][1]).toBeCloseTo(Math.pow(2, 2 / 12), 12);
  });

  it('no recording decoded yet: silence, as the experiment’s early return', () => {
    const b = new FakeAudio();
    const ours = createHarpSound(b as unknown as AudioContext, sound, () => []);
    const before = b.created.length;
    expect(ours.play(2, 0.5)).toBeNull();
    expect(b.created.length).toBe(before);
  });
});

describe('haptics = the experiment’s pluckBuzz', () => {
  it('the same length and ticks for every velocity', () => {
    let got: [number, number] = [0, 0];
    const theirs = run<(v: number) => void>(line('const pluckBuzz ='), { buzz: (ms: number, ticks: number) => (got = [ms, ticks]) }, 'pluckBuzz');
    for (let v = 0.08; v <= 1.0001; v += 0.01) {
      theirs(v);
      expect(pluckBuzz(v, sound)).toEqual(got);
    }
  });
});

/* ── geometry ──────────────────────────────────────────────────────────── */

interface TheirGeometry {
  layout: () => void;
  xs: () => number[];
  zone: () => number;
  maxPull: () => number;
  tension: (dx: number) => number;
  strength: (dx: number) => number;
  nearest: (x: number) => number;
}

function experimentGeometry(width: number, height: number): TheirGeometry {
  const code = [
    line('const midis ='),
    fn('layout'),
    line('const zone ='),
    line('const maxPull ='),
    line('const tension ='),
    line('const strength ='),
    fn('nearest'),
  ].join('\n');
  const g = run<TheirGeometry>(
    code,
    {
      window: { devicePixelRatio: 2 },
      innerWidth: width,
      innerHeight: height,
      cv: {},
      SCALE: sound.tuning.SCALE,
      ROOT: sound.tuning.ROOT,
      COUNT: sound.tuning.COUNT,
      W: 0,
      H: 0,
      dpr: 1,
      xs: [],
    },
    '{ layout, xs: () => xs, zone, maxPull, tension, strength, nearest }',
  );
  g.layout();
  return g;
}

const noInset = { top: 0, right: 0, bottom: 0, left: 0 };

describe('geometry = the experiment’s layout, zone, maxPull, tension, strength, nearest', () => {
  it.each([320, 390, 834, 1440])('at %i px wide', (width) => {
    const theirs = experimentGeometry(width, 700);
    const xs = stringXs({ width, inset: noInset }, sound.tuning.COUNT);
    const pull = sound.velocity.pull;
    expect(xs).toEqual(theirs.xs());
    expect(zone(xs, pull)).toBe(theirs.zone());
    expect(maxPull(xs, pull)).toBe(theirs.maxPull());
    for (let dx = -80; dx <= 80; dx += 0.5) {
      expect(tension(dx, xs, pull)).toBe(theirs.tension(dx));
      expect(strength(dx, xs, pull)).toBe(theirs.strength(dx));
    }
    for (let x = 0; x <= width; x += 0.5) expect(nearest(x, xs, pull)).toBe(theirs.nearest(x));
  });

  it('insets move the strings in from the sides, as a narrower window would', () => {
    const inset = { top: 40, right: 20, bottom: 80, left: 30 };
    const xs = stringXs({ width: 440, inset }, sound.tuning.COUNT);
    expect(xs.map((x) => x - 30)).toEqual(experimentGeometry(390, 700).xs());
  });
});

/* ── pointers and the 'A' strum ────────────────────────────────────────── */

type Step =
  | { kind: 'down' | 'move' | 'up'; id: number; pointer: StagePointer['type']; pts: { x: number; y: number; t: number }[] }
  | { kind: 'key'; down: boolean; key: string; repeat?: boolean };

function experimentInput(xs: number[]) {
  const from = html.indexOf('const pointers = new Map();');
  const to = html.indexOf('// ---- Looks, Presets und Regler ----');
  const log: Entry[] = [];
  const handlers: Record<string, (e: unknown) => void> = {};
  const vib = xs.map(() => ({ held: null as Pull | null, who: '' }));
  const { pointers } = run<{ pointers: Map<number, unknown> }>(
    html.slice(from, to),
    {
      xs,
      vib,
      pluck: (i: number, vel: number) => log.push(['pluck', i, vel]),
      heard: () => {},
      harpStat: () => {},
      buzz: (ms: number, ticks: number) => log.push(['tick', ms, ticks]),
      introCancel: () => {},
      wake: () => {},
      cdAutoStart: () => {},
      cv: { setPointerCapture: () => {}, addEventListener: (type: string, h: (e: unknown) => void) => (handlers[type] = h) },
      answering: false,
      stopAnswer: () => {},
      addEventListener: (type: string, h: (e: unknown) => void) => (handlers[`window ${type}`] = h),
    },
    '{ pointers }',
  );
  const send = (s: Step) => {
    if (s.kind === 'key') {
      handlers[s.down ? 'window keydown' : 'window keyup']({ key: s.key, repeat: s.repeat ?? false, target: { tagName: 'CANVAS' } });
      return;
    }
    const last = s.pts[s.pts.length - 1];
    handlers[s.kind === 'down' ? 'pointerdown' : s.kind === 'move' ? 'pointermove' : 'pointerup']({
      pointerId: s.id,
      pointerType: s.pointer,
      clientX: last.x,
      clientY: last.y,
      timeStamp: last.t,
      /* A browser's list ends with the event's own point. */
      getCoalescedEvents: () => s.pts.map((p) => ({ clientX: p.x, clientY: p.y, timeStamp: p.t })),
    });
  };
  return { log, vib, pointers, send };
}

function portInput(xs: number[]) {
  const log: Entry[] = [];
  const pulls: (Pull | null)[] = xs.map(() => null);
  let holding = 0;
  const input = createHarpInput(sound, harp.demo, () => xs, {
    pluck: (i, vel) => log.push(['pluck', i, vel]),
    hold: (i, p) => (pulls[i] = p),
    tick: () => log.push(['tick', sound.haptics.pullStep.ms, 1]),
    holding: (n) => (holding = n),
  });
  let n = 0;
  const send = (s: Step) => {
    if (s.kind === 'key') {
      /* The contract passes no repeat flag: the adapter must ignore repeats itself. */
      if (s.down) input.keyDown(s.key);
      else input.keyUp(s.key);
      return;
    }
    const last = s.pts[s.pts.length - 1];
    /* Every other move hands its coalesced points WITHOUT the final one —
       the contract does not say which; both must read the same. */
    n += 1;
    const p: StagePointer = { id: s.id, type: s.pointer, x: last.x, y: last.y, t: last.t, coalesced: n % 2 ? s.pts : s.pts.slice(0, -1) };
    if (s.kind === 'down') input.down(p);
    else if (s.kind === 'move') input.move(p);
    else input.up(p);
  };
  return { log, pulls, holding: () => holding, send };
}

describe('input = the experiment’s pointer handlers, crossings, release and A-strum', () => {
  const xs = stringXs({ width: 390, inset: noInset }, sound.tuning.COUNT);
  const at = (x: number, y: number, t: number) => ({ x, y, t });
  const touch = (kind: 'down' | 'move' | 'up', id: number, ...pts: { x: number; y: number; t: number }[]): Step => ({ kind, id, pointer: 'touch', pts });
  const mouse = (id: number, ...pts: { x: number; y: number; t: number }[]): Step => ({ kind: 'move', id, pointer: 'mouse', pts });

  const steps: Step[] = [
    /* A pull on string 2: ticks at each third of the way, released. */
    touch('down', 1, at(xs[2] + 5, 300, 0)),
    touch('move', 1, at(xs[2] + 12, 302, 16)),
    touch('move', 1, at(xs[2] + 20, 304, 24), at(xs[2] + 26, 305, 32)),
    touch('move', 1, at(xs[2] + 34, 306, 48), at(xs[2] + 40, 307, 56)),
    touch('move', 1, at(xs[2] + 30, 306, 64)),
    touch('up', 1, at(xs[2] + 30, 306, 70)),
    /* A pull that slips: full strength, then the same finger strums on. */
    touch('down', 2, at(xs[4] - 3, 200, 100)),
    touch('move', 2, at(xs[4] + 20, 205, 110), at(xs[4] + 45, 210, 118), at(xs[5] + 2, 212, 126)),
    touch('move', 2, at(xs[6] + 1, 214, 134)),
    touch('up', 2, at(xs[6] + 1, 214, 140)),
    /* A strum from between two strings, back within 40 ms, back again later. */
    touch('down', 3, at(xs[0] + 24, 400, 200)),
    touch('move', 3, at(xs[3] + 1, 410, 216)),
    touch('move', 3, at(xs[3] - 10, 412, 230)),
    touch('move', 3, at(xs[2], 413, 260), at(xs[1] - 1, 415, 300)),
    touch('up', 3, at(xs[1] - 1, 415, 310)),
    /* Two fingers at once: one pulls string 1, one strums 4 → 6. */
    touch('down', 4, at(xs[1] + 2, 100, 400)),
    touch('down', 5, at(xs[4] + 24, 500, 402)),
    touch('move', 4, at(xs[1] - 9, 120, 410)),
    touch('move', 5, at(xs[6] + 3, 505, 420)),
    touch('up', 4, at(xs[1] - 9, 120, 430)),
    touch('up', 5, at(xs[6] + 3, 505, 432)),
    /* A hover without the key, and a touch that never came down: nothing. */
    mouse(9, at(10, 100, 500)),
    mouse(9, at(xs[3] + 1, 100, 520)),
    { kind: 'move', id: 8, pointer: 'touch', pts: [at(xs[5] + 1, 100, 530)] },
    /* Holding A, the mouse strums without a button; a key repeat changes nothing. */
    { kind: 'key', down: true, key: 'a' },
    mouse(9, at(10, 100, 600)),
    mouse(9, at(xs[2] + 1, 100, 620)),
    { kind: 'key', down: true, key: 'a', repeat: true },
    mouse(9, at(xs[4] + 1, 100, 640)),
    { kind: 'key', down: false, key: 'a' },
    mouse(9, at(xs[6] + 1, 100, 660)),
  ];

  it('the same notes, ticks, held strings and fingers down after every event', () => {
    const theirs = experimentInput(xs);
    const ours = portInput(xs);
    steps.forEach((s, k) => {
      theirs.send(s);
      ours.send(s);
      expect([k, ours.log]).toEqual([k, theirs.log]);
      expect([k, ours.pulls]).toEqual([k, theirs.vib.map((v) => v.held)]);
      expect([k, ours.holding()]).toEqual([k, theirs.pointers.size]);
    });
    /* The scenario is not vacuous: pulls, slips, strums and the A strum played. */
    expect(theirs.log.filter(([what]) => what === 'pluck').length).toBeGreaterThan(15);
    expect(theirs.log.filter(([what]) => what === 'tick').length).toBeGreaterThan(1);
  });
});

/* ── motion ────────────────────────────────────────────────────────────── */

interface TheirShape {
  frame: (now: number) => void;
  pluck: (i: number, vel: number, mute: boolean) => void;
  answerPluck: (i: number, vel: number) => void;
}
type TheirDrawn = [(y: number) => number, number, number, boolean, string | undefined];

function experimentMotion(xs: number[], H: number, reduced: boolean, clock: { now: number }) {
  const captured: TheirDrawn[][] = [];
  const vib = xs.map(() => ({ amp: 0, t0: 0, held: null as Pull | null, phase: 0, on: false, from: 0, to: 0, ts: 0, who: undefined as string | undefined }));
  const code = [
    line('const easeInOut ='),
    line('const FADE_IN ='),
    line('const LOOK ='),
    line('const MOTION ='),
    line('const maxPull ='),
    line('const tension ='),
    fn('level'),
    fn('pluck'),
    fn('answerPluck'),
    fn('frame'),
  ].join('\n');
  const noop = new Proxy({}, { get: () => () => {}, set: () => true });
  const m = run<TheirShape>(
    code,
    {
      g2: noop,
      dpr: 2,
      W: 390,
      H,
      tok: () => '#000000',
      COUNT: xs.length,
      vib,
      xs,
      P: { ...sound.preset },
      reduced: { matches: reduced },
      shadowPass: (S: TheirDrawn[]) => captured.push(S),
      drawString: () => {},
      requestAnimationFrame: () => {},
      performance: { now: () => clock.now },
      Math: mathWith(seeded(7)),
      pluckBuzz: () => {},
      play: () => null,
    },
    '{ frame, pluck, answerPluck }',
  );
  return { ...m, vib, captured };
}

describe('motion = the experiment’s pluck, answerPluck, level and frame', () => {
  const H = 700;
  const xs = stringXs({ width: 390, inset: noInset }, sound.tuning.COUNT);
  const ys = [-2, 0, 1, 100, 299, 300, 301, 350, 699, 700, 702];

  it.each([false, true])('swing, bend, width and colour level, frame by frame (reduced motion: %s)', (reduced) => {
    const clock = { now: 1000 };
    const theirs = experimentMotion(xs, H, reduced, clock);
    const strings: StringState[] = xs.map(newString);
    const random = seeded(7);

    /* Plucked by the person, answered by Musie, one string held. */
    theirs.pluck(2, 0.7, true);
    pluckString(strings[2], 0.7, 'me', clock.now, sound, random);
    theirs.answerPluck(5, 0.5);
    pluckString(strings[5], 0.5, 'harp', clock.now, sound, random);
    theirs.vib[1].held = { dx: 18, y: 300 };
    theirs.vib[1].who = 'me';
    strings[1].held = { dx: 18, y: 300 };

    const compare = (now: number) => {
      theirs.frame(now);
      const S = theirs.captured[theirs.captured.length - 1];
      const { drawn } = shapeStrings(now, strings, xs, H, sound, reduced);
      drawn.forEach((d, i) => {
        const [xAt, w, k, still, who] = S[i];
        expect([now, i, d.w, d.still, d.who]).toEqual([now, i, w, still, who ?? 'me']);
        expect(d.k).toBeCloseTo(k, 12);
        for (const y of ys) expect(d.xAt(y)).toBeCloseTo(xAt(y), 9);
      });
    };
    for (const now of [1000, 1008, 1050, 1120, 1200, 1500]) compare(now);

    /* Let go of string 1 — a pull release — and watch everything settle. */
    clock.now = 1600;
    theirs.vib[1].held = null;
    strings[1].held = null;
    theirs.pluck(1, 0.9, true);
    pluckString(strings[1], 0.9, 'me', clock.now, sound, random);
    for (const now of [1600, 1616, 1700, 2000, 2600, 3500, 5000, 9000]) compare(now);
  });

  it('stops asking for frames once every string is still and every colour has eased', () => {
    const strings: StringState[] = xs.map(newString);
    pluckString(strings[3], 1, 'me', 0, sound, seeded(1));
    expect(shapeStrings(0, strings, xs, H, sound, false).moving).toBe(true);
    expect(shapeStrings(4000, strings, xs, H, sound, false).moving).toBe(true); /* still swinging, barely */
    expect(shapeStrings(9000, strings, xs, H, sound, false).moving).toBe(false);
    strings[0].held = { dx: 4, y: 10 };
    expect(shapeStrings(9100, strings, xs, H, sound, false).moving).toBe(true);
  });
});

/* ── colour ────────────────────────────────────────────────────────────── */

describe('colour = the experiment’s OKLab mix, between palette colours', () => {
  const PAL = literal('const PAL =') as Record<string, [string, string]>;
  /** How a browser reports a resolved token: `rgb(r, g, b)`. */
  const asRgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

  it.each([0, 1])('step 7 of every family (theme %i) blends exactly as the experiment did', (theme) => {
    const rest = PAL['sand-7'][theme];
    const played = PAL['terracotta-7'][theme];
    const answer = PAL['green-7'][theme];
    const theirs = run<(k: number, who: string) => string>(
      [fn('hexToOklab'), fn('oklabToHex'), fn('mix')].join('\n'),
      { REST: () => rest, ACTIVE: () => played, ANSWER: () => answer },
      'mix',
    );
    const mix = createMixer();
    for (let k = -0.1; k <= 1.1; k += 0.025) {
      for (const who of ['me', 'harp']) {
        const ours = mix(k, asRgb(rest), asRgb(who === 'harp' ? answer : played));
        const want = theirs(k, who);
        if (k > 0 && k < 1) expect(ours).toBe(want.toLowerCase());
        else expect(parseColour(ours)).toEqual(parseColour(want));
      }
    }
  });
});
