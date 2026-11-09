/**
 * The harp, as an instrument the play step can mount — ported from the
 * experiment `harp/261109-0920` („Harfe“ with its answer, PR #72).
 *
 *   sound.ts     the locked sound (`harp.json`) and the audio graph
 *   geometry.ts  where the strings stand, how a touch reads them
 *   input.ts     pointers and keys → plucks
 *   draw.ts      swing, bend, colour ease, shadow
 *   colour.ts    the OKLab blend between palette colours
 *
 * Seven strings, d e g a h d′ e′, low to high and left to right — so a
 * string's index IS its degree, and the engine's answer plays string
 * `stroke.degree`.
 *
 * ── WHAT THE ADAPTER DOES NOT DO ──────────────────────────────────────────
 * The experiment also unlocked audio, ran the countdown, composed the
 * answer, cancelled the intro on touch and tracked to PostHog. Those are the
 * engine's now (`types.ts`, "who decides what"): this reports
 * `host.played` and `host.holding` and plays what it is handed.
 */
import type { InstrumentFactory, StageBox } from '../types';
import { createMixer } from './colour';
import { newString, paintHarp, pluckString, shapeStrings, type ShadowCache, type StringState, type Who } from './draw';
import { stringXs } from './geometry';
import { createHarpInput } from './input';
import { clampVelocity, createHarpSound, pluckBuzz, type HarpDemo, type HarpSound, type LoadedSample } from './sound';

/**
 * `ready()` waits for every sample, looking every 50 ms, at most 1.5 s — the
 * bound the experiment's intro waited before its first note. After that the
 * harp plays with what has arrived, as the experiment's `play` did.
 */
const READY = { everyMs: 50, atMostMs: 1500 } as const;

export const createHarp: InstrumentFactory = (definition, host) => {
  const sound = definition.sound as unknown as HarpSound;
  const demo = definition.demo as unknown as HarpDemo;
  if (sound.engine !== 'aufnahme') {
    throw new Error(`harp: engine "${String(sound.engine)}" is not ported — only 'aufnahme'`);
  }
  const count = sound.tuning.COUNT;

  const loaded = (): LoadedSample[] => {
    const out: LoadedSample[] = [];
    for (const s of definition.samples) {
      const buffer = host.buffer(s.file);
      if (buffer !== undefined) out.push({ midi: s.midi, buffer });
    }
    return out;
  };

  const graph = createHarpSound(host.audio, sound, loaded);
  const strings: StringState[] = Array.from({ length: count }, newString);
  const mix = createMixer();
  const shadowCache: { current: ShadowCache | null } = { current: null };
  const reducedMotion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  let box: StageBox | null = null;
  let xs: number[] = [];
  let readyTimer: ReturnType<typeof setTimeout> | undefined;
  /** Settles a `ready()` still waiting — disposing must not leave it hanging. */
  let settle: (() => void) | null = null;
  let readying: Promise<void> | null = null;

  /** Swing and sound — the shared half of `pluck` and `answerPluck`. */
  function sounding(i: number, vel: number, who: Who) {
    pluckString(strings[i], vel, who, performance.now(), sound);
    host.requestDraw();
    return host.audible() ? graph.play(i, vel) : null;
  }

  /** The person's own note: vibration, swing, sound, then the engine hears it. */
  function own(i: number, velocity: number): void {
    const vel = clampVelocity(velocity, sound);
    const [ms, ticks] = pluckBuzz(vel, sound);
    host.vibrate(ms, ticks);
    sounding(i, vel, 'me');
    host.played({ degree: i, velocity: vel, at: performance.now() });
  }

  const input = createHarpInput(sound, demo, () => xs, {
    pluck: own,
    hold(i, pull) {
      strings[i].held = pull;
      if (pull !== null) strings[i].who = 'me';
      host.requestDraw();
    },
    tick: () => host.vibrate(sound.haptics.pullStep.ms, 1),
    holding: (n) => host.holding(n),
  });

  return {
    id: 'harp',
    degrees: count,

    ready() {
      if (readying !== null) return readying;
      const started = performance.now();
      const all = () => definition.samples.every((s) => host.buffer(s.file) !== undefined);
      readying = new Promise<void>((resolve) => {
        settle = () => {
          clearTimeout(readyTimer);
          settle = null;
          resolve();
        };
        const check = () => {
          if (all() || performance.now() - started >= READY.atMostMs) settle?.();
          else readyTimer = setTimeout(check, READY.everyMs);
        };
        check();
      });
      return readying;
    },

    layout(next) {
      box = next;
      xs = stringXs(next, count);
      host.requestDraw();
    },

    draw(g, now) {
      if (box === null) return false;
      const reduced = reducedMotion?.matches ?? false;
      const { drawn, moving } = shapeStrings(now, strings, xs, box.height, sound, reduced);
      paintHarp(g, drawn, box, host.palette(), host.shadow(), sound, mix, shadowCache);
      return moving;
    },

    pointerDown: (e) => input.down(e),
    pointerMove: (e) => input.move(e),
    pointerUp: (e) => input.up(e),
    keyDown: (key) => input.keyDown(key),
    keyUp: (key) => input.keyUp(key),

    playAnswer(stroke) {
      const i = stroke.degree;
      if (!Number.isInteger(i) || i < 0 || i >= count) return null;
      const voice = sounding(i, clampVelocity(stroke.velocity, sound), 'harp');
      return voice === null ? null : { fade: (tau: number) => graph.fade(voice, tau) };
    },

    playDemo() {
      sounding(demo.string, clampVelocity(demo.velocity, sound), 'me');
      return { degree: demo.string };
    },

    dispose() {
      settle?.();
      input.reset();
      graph.dispose();
    },
  };
};
