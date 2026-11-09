/**
 * The marimba as an instrument adapter — `marimba/261108-1740`, its DEFAULT
 * look and sound, on the host the engine provides.
 *
 * What the experiment did itself and the host now does instead: audio unlock,
 * the motion sensor, the vibration switch and the iPhone's owed touchend tick,
 * the countdown, the conversation („Gespräch“: `listen`, `compose`,
 * `playAnswer`). What stays here: drawing, hit test, the strike (strength,
 * roll, glissando, velocity, vibration length), the audio graph, the calm.
 *
 * One fixed look (Ben, 2026-11-09): 10 bars, „Marimba, weich“, no sound
 * chooser, no 7/10 switch, no settings panel. Landscape is its orientation;
 * a portrait box is drawn anyway and `orientationHint` tells the stage to show
 * the experiment's rotate hint.
 *
 * Degrees are bar indexes: the bars run low to high, left to right.
 */
import type {
  InstrumentAdapter, InstrumentDefinition, InstrumentFactory, InstrumentHost, StageBox, StagePointer, Stroke, Voice,
} from '../types';
import { calmNote, calmStart, calmStep } from './calm';
import { WARM_SHARE, createPicture, hitBar, isPortrait, layoutBars, type MarimbaLayout } from './draw';
import { asMarimbaDemo, asMarimbaSound, barFiles, createMarimbaAudio } from './sound';
import { clamp, createStriker, startRanges, strength, type Measure } from './strike';

/** The experiment's keys, left to right; Shift strikes the end of the bar. */
export const KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ö'] as const;

/** Where a key strikes along the bar: the middle, or with Shift near the end. */
const KEY_POS = 0.5;
const KEY_POS_SHIFT = 0.1;
/** How often `ready()` looks whether the host has decoded every recording. */
const READY_POLL_MS = 50;
/** A host that has not ticked for a while does not get the whole gap at once. */
const MAX_CALM_STEPS = 10;

/** The adapter, plus what the stage may read for the rotate hint. */
export type MarimbaAdapter = InstrumentAdapter & {
  /** The box is portrait on a touch screen: the experiment's „Leg dein Handy quer vor dich.“ */
  readonly orientationHint: boolean;
  /** Not optional here: the calm needs it. */
  tick(now: number): void;
};

/** The few things the browser gives, as a seam for the tests. */
export interface MarimbaEnv {
  now(): number;
  /** Run `fn` after `ms`; returns a cancel. */
  later(fn: () => void, ms: number): () => void;
  random(): number;
  /** The experiment showed its rotate hint only on `(pointer: coarse)`. */
  coarsePointer(): boolean;
}

const browser: MarimbaEnv = {
  now: () => performance.now(),
  later(fn, ms) {
    const id = setTimeout(fn, ms);
    return () => clearTimeout(id);
  },
  random: () => Math.random(),
  coarsePointer: () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches,
};

export const createMarimba: InstrumentFactory = (definition, host) => createMarimbaWith(definition, host, browser);

export function createMarimbaWith(definition: InstrumentDefinition, host: InstrumentHost, env: MarimbaEnv): MarimbaAdapter {
  const sound = asMarimbaSound(definition.sound);
  const demo = asMarimbaDemo(definition.demo);
  const count = sound.DEFAULTS.bars;
  const scale = sound.SCALE.slice(0, count);
  const audio = createMarimbaAudio(host.audio, sound, barFiles(sound, definition.samples), (file) => host.buffer(file));
  const picture = createPicture(count, sound.visual);
  const ranges = startRanges(sound.strike);
  const calm = calmStart(sound.calm);

  let box: StageBox | null = null;
  let layout: MarimbaLayout | null = null;
  let disposed = false;

  const striker = createStriker(sound);

  /* Fingers on the instrument, by pointer id → bar (-1 off the bars). The
     answer waits while any is down, misses included, as the experiment's `held`. */
  const held = new Map<number, number>();
  const keysDown = new Set<string>();

  /* Safari unlocks audio only in touchend / click / keydown, but the stroke
     comes at pointerdown: keep it and play it once audio runs (`pendingMs`). */
  let pending: { bar: number; velocity: number; roll: boolean; at: number } | null = null;
  let lastTick: number | null = null;

  const timers = new Set<() => void>();
  /* `ready()` callers, released by `dispose` too, so nobody awaits a sheet that closed. */
  const waiting = new Set<() => void>();
  function later(fn: () => void, ms: number) {
    const cancel = env.later(() => {
      timers.delete(cancel);
      fn();
    }, ms);
    timers.add(cancel);
  }

  /** `sound()`: null when the recording is not decoded or audio is still locked. */
  function play(bar: number, velocity: number, roll: boolean, mine: boolean): Voice | null {
    if (!audio.loaded(bar, velocity)) return null;
    if (!host.audible()) {
      if (mine) pending = { bar, velocity, roll, at: env.now() };
      return null;
    }
    return audio.strike(bar, velocity, roll);
  }

  function flushPending() {
    if (disposed || pending === null) return;
    if (env.now() - pending.at >= sound.pendingMs) {
      pending = null;
      return;
    }
    if (!host.audible()) return;
    const p = pending;
    pending = null;
    play(p.bar, p.velocity, p.roll, true);
  }

  /** `me`: one of the person's strokes on bar `i`, at `pos` along it. */
  function stroke(i: number, pos: number, measure: Measure) {
    if (disposed) return;
    const now = env.now();
    const { velocity, roll, buzz } = striker.strike(i, pos, measure, now, env.random());
    /* Vibration FIRST, as in the experiment: the iPhone allows the tick only
       within the touch (the host owes it to the touchend). */
    if (buzz !== null) host.vibrate(buzz);
    /* The glow, and the tap: every own stroke leaves one — a roll's strokes
       and a glissando's steps each are one (round 2). */
    picture.lightUp(i, velocity, 'played', now);
    picture.tap(i, pos, velocity, now);
    host.requestDraw();
    play(i, velocity, roll, true);
    host.played({ degree: i, velocity, roll, at: now });
    calmNote(calm, now, roll, sound.calm);
  }

  const hit = (x: number, y: number) => (layout ? hitBar(layout, x, y) : null);

  const adapter: MarimbaAdapter = {
    id: 'marimba',
    degrees: count,

    get orientationHint() {
      return isPortrait(box) && env.coarsePointer();
    },

    /* The host fetches and decodes; `buffer(file)` has no promise, so this
       looks every READY_POLL_MS until all five recordings are there in both
       layers, and measures each file's onset and peak on the way. */
    ready() {
      return new Promise<void>((resolve) => {
        const done = () => {
          waiting.delete(done);
          resolve();
        };
        const look = () => {
          if (disposed || audio.prepare()) done();
          else later(look, READY_POLL_MS);
        };
        waiting.add(done);
        look();
      });
    },

    layout(next) {
      box = next;
      layout = layoutBars(next, scale);
      host.requestDraw();
    },

    draw(g, now) {
      return picture.draw(g, {
        layout,
        dpr: box?.dpr ?? 1,
        palette: host.palette(),
        tap: host.tap(),
        warmth: calm.calm * sound.calm.background * WARM_SHARE,
        now,
      });
    },

    pointerDown(e: StagePointer) {
      if (disposed) return;
      const h = hit(e.x, e.y);
      held.set(e.id, h ? h.i : -1);
      host.holding(held.size);
      if (!h) return;
      if (e.type !== 'touch') {
        stroke(h.i, h.pos, null);
        return;
      }
      /* Wait briefly until the jolt and the finger area are measured: the
         sensor's jolt arrives a little after the touch. */
      const t0 = env.now();
      const touch = { at: t0, radius: e.radius ?? 0, force: e.force ?? 0 };
      const wait = host.motion() !== null ? sound.strike.STRIKE_MS : sound.strike.noMotionWaitMs;
      later(() => {
        const s = strength(
          {
            t0,
            motionOn: host.motion() !== null,
            jolts: host.joltsSince(t0 - sound.strike.window.beforeMs),
            touch,
          },
          sound.strike,
          ranges,
        );
        stroke(h.i, h.pos, s);
      }, wait);
    },

    pointerMove(e: StagePointer) {
      if (disposed || !held.has(e.id)) return;
      const h = hit(e.x, e.y);
      if (h && h.i !== held.get(e.id)) {
        held.set(e.id, h.i);
        stroke(h.i, h.pos, 'move');
      }
    },

    pointerUp(e: StagePointer) {
      if (disposed) return;
      held.delete(e.id);
      host.holding(held.size);
      /* The host unlocks audio on touchend, which follows pointerup in the
         same input task: look again once it has run. */
      later(flushPending, 0);
    },

    keyDown(key: string, shift: boolean) {
      const k = key.toLowerCase();
      const i = (KEYS as readonly string[]).indexOf(k);
      if (disposed || i < 0 || i >= count) return false;
      if (!keysDown.has(k)) {
        keysDown.add(k);
        stroke(i, shift ? KEY_POS_SHIFT : KEY_POS, null);
      }
      return true;
    },

    keyUp(key: string) {
      keysDown.delete(key.toLowerCase());
    },

    /* `answerStroke`: the answer colour and the sound, no vibration — and no
       tap, which is the person's alone (round 2). A roll's strokes come from
       the engine one by one, each with `roll: true`. */
    playAnswer(s: Stroke) {
      if (disposed || s.degree < 0 || s.degree >= count) return null;
      picture.lightUp(s.degree, s.velocity, 'answer', env.now());
      host.requestDraw();
      return play(s.degree, s.velocity, s.roll === true, false);
    },

    playDemo() {
      const bar = clamp(demo.bar, 0, count - 1);
      /* The played colour shows where to touch; no tap, as nobody touched. */
      if (!disposed) {
        picture.lightUp(bar, demo.velocity, 'played', env.now());
        host.requestDraw();
        play(bar, demo.velocity, false, false);
      }
      return { degree: bar };
    },

    tick(now: number) {
      if (disposed) return;
      const steps = lastTick === null ? 1 : clamp((now - lastTick) / sound.calm.tickMs, 0, MAX_CALM_STEPS);
      lastTick = now;
      if (calmStep(calm, sound.calm, steps)) {
        audio.warm(calm.calm);
        host.requestDraw();
      }
      flushPending();
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      timers.forEach((cancel) => cancel());
      timers.clear();
      held.clear();
      keysDown.clear();
      pending = null;
      audio.dispose();
      waiting.forEach((release) => release());
    },
  };
  return adapter;
}
