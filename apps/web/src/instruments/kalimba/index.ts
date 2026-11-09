/**
 * The kalimba as an instrument adapter — `kalimba/261106-1121` ported onto
 * the `InstrumentHost` contract (`../types.ts`).
 *
 * What the adapter keeps from the experiment, 1:1: the sound (sound.ts), the
 * swing vibrato with its 30 ms membrane step (swing.ts), where a touch lands
 * and what that does to loudness and dullness (geometry.ts, sound.ts), the
 * look (draw.ts), the keys (input.ts) and the vibration of a pluck and of a
 * swing.
 *
 * What it takes from the host instead of doing itself: the AudioContext and
 * its unlocking (`audible`), the decoded recordings (`buffer`), the colours
 * (`palette`), the tap effect's parameters (`tap`), the motion sensor
 * (`motion`, already scaled to 0 … 1), and whether a vibration can happen at
 * all (`vibrate`).
 *
 * New against the experiment (Ben, 2026-11-09): the kalimba ANSWERS, like the
 * marimba. Own notes are reported as `played` in pitch order (degrees.ts);
 * `playAnswer` sounds a degree's tine in the answer colour. The bridge is a
 * still wave rather than the arc (geometry.ts). And the press dot is the
 * design system's tap (round 2), left by the person's own notes only: an
 * answer and the demo note light their tine and leave no dot.
 */
import type {
  InstrumentAdapter,
  InstrumentDefinition,
  InstrumentFactory,
  InstrumentHost,
  StageBox,
  Voice,
} from '../types';
import { degreeOfTine, pitchOrderOf, tineOfDegree } from './degrees';
import type { Press, TineGlow, Tone } from './draw';
import { drawKalimba } from './draw';
import type { KalimbaLayout } from './geometry';
import { hitTine, layoutKalimba } from './geometry';
import { KEY_POSITION, SWING_KEY, tineOfKey } from './input';
import type { KalimbaDemo, KalimbaOutput, KalimbaSound, Touch } from './sound';
import { createKalimbaAudio, pluckHaptic, positionFor, sampleFile, touchAt } from './sound';
import { SWING_AT_REST, membraneOf, swingDepth, swingHaptic, swingStep } from './swing';

/** What the adapter needs besides the host — replaced by fakes in its tests. */
export interface KalimbaDeps {
  output: KalimbaOutput;
  /** Run `fn` every `ms` milliseconds; returns the cancel. */
  every(ms: number, fn: () => void): () => void;
  /** `performance.now()`. */
  now(): number;
}

/**
 * `ready()` polls the host for the decoded recordings — the contract offers
 * `buffer(file)` and no promise. 50 ms is far below anyone's patience, and
 * after 30 s the host is not going to deliver: say which files are missing.
 */
export const READY = { pollMs: 50, timeoutMs: 30_000 } as const;

export const createKalimba: InstrumentFactory = (definition, host) =>
  createKalimbaWith(definition, host, {
    output: createKalimbaAudio(host.audio, definition.sound as unknown as KalimbaSound, (file) => host.buffer(file)),
    every: (ms, fn) => {
      const id = setInterval(fn, ms);
      return () => clearInterval(id);
    },
    now: () => performance.now(),
  });

export function createKalimbaWith(
  definition: InstrumentDefinition,
  host: InstrumentHost,
  deps: KalimbaDeps,
): InstrumentAdapter {
  const sound = definition.sound as unknown as KalimbaSound;
  const demo = definition.demo as unknown as KalimbaDemo;
  const hz = sound.tines.map((t) => t.hz);
  const order = pitchOrderOf(hz, definition.answer.pitchOrder);
  const out = deps.output;

  let box: StageBox | null = null;
  let L: KalimbaLayout | null = null;
  const glows: TineGlow[] = sound.tines.map(() => ({ t0: -1e9, vel: 1, tone: 'played' }));
  let presses: Press[] = [];
  /** Pointer → the tine it last played, -1 for none (`lastCol`). */
  const pointers = new Map<number, number>();
  const keys = new Set<string>();
  let swingHeld = false;
  let swing = SWING_AT_REST;
  let lastBuzz = -Infinity;
  /**
   * Safari unlocks audio only on touchend, click or keydown; the touch comes
   * at pointerdown. So a note touched before audio runs is kept and sounded
   * once it does, if that is within `pendingMs` (`pending`, `flushPending`).
   */
  let pending: { tine: number; touch: Touch; at: number } | null = null;
  let disposed = false;

  /** The glow half of `pluckVisual`: the tine lights up. Own notes, answers and the demo. */
  const light = (tine: number, touch: Touch, tone: Tone) => {
    glows[tine] = { t0: deps.now(), vel: touch.vel, tone };
    host.requestDraw();
  };

  /** The dot half: the tap where the tine was touched — own notes only. */
  const press = (tine: number, touch: Touch) => {
    presses.push({ tine, pos: touch.pos, vel: touch.vel, t0: deps.now() });
  };

  const hear = (tine: number, touch: Touch, mayWait: boolean): Voice | null => {
    if (!out.canSound(tine)) return null;
    if (!host.audible()) {
      if (mayWait) pending = { tine, touch, at: deps.now() };
      return null;
    }
    return out.pluck(tine, touch);
  };

  /** The person's own note: seen, felt, heard, and reported to the engine. */
  const own = (tine: number, pos: number) => {
    const touch = touchAt(pos, sound);
    press(tine, touch);
    light(tine, touch, 'played');
    const h = pluckHaptic(touch.vel, sound.haptics.pluck);
    host.vibrate(h.ms, h.ticks);
    hear(tine, touch, true);
    host.played({ degree: degreeOfTine(order, tine), velocity: touch.vel, at: deps.now() });
  };

  /** The experiment's `setInterval(…, 30)`: the swing onto the membrane. */
  const step = () => {
    if (disposed) return;
    const reading = host.motion();
    swing = swingStep(swing, reading && { rotation: reading.rotation, at: reading.at }, swingHeld, sound.swing);
    const now = deps.now();
    /* Android vibrates with the swing. The experiment does this only where
       the phone can vibrate WITHOUT a touch, and an iPhone cannot — so the
       swing asks for no iOS tick (0): one owed to the next touchend would be
       a tick the experiment never made. */
    const ms = swingHaptic(swingDepth(swing.env, sound), out.sounding() > 0, sound.haptics.swing);
    if (ms !== null && now - lastBuzz > sound.haptics.swing.everyMs) {
      host.vibrate(ms, 0);
      lastBuzz = now;
    }
    out.membrane(membraneOf(swing.env, sound));
    if (pending) {
      if (now - pending.at >= sound.pendingMs) pending = null;
      else if (host.audible()) {
        const p = pending;
        pending = null;
        out.pluck(p.tine, p.touch);
      }
    }
  };
  const stopStepping = deps.every(sound.swing.tickMs, step);

  /** The recordings the nine tines play: their notes in both layers. */
  const needed = [...new Set(sound.tines.flatMap((t) => sound.layers.map((layer) => sampleFile(layer, t.src))))];

  return {
    id: 'kalimba',
    degrees: order.length,

    ready() {
      const listed = new Set(definition.samples.map((s) => s.file));
      const unlisted = needed.filter((f) => !listed.has(f));
      if (unlisted.length > 0) return Promise.reject(new Error(`kalimba: no sample row for ${unlisted.join(', ')}`));
      return new Promise<void>((resolve, reject) => {
        const started = deps.now();
        let cancel: (() => void) | null = null;
        const check = (): boolean => {
          const missing = disposed ? [] : needed.filter((f) => host.buffer(f) === undefined);
          if (missing.length === 0) {
            cancel?.();
            resolve();
            return true;
          }
          if (deps.now() - started > READY.timeoutMs) {
            cancel?.();
            reject(new Error(`kalimba: recordings not loaded: ${missing.join(', ')}`));
            return true;
          }
          return false;
        };
        if (!check()) cancel = deps.every(READY.pollMs, check);
      });
    },

    layout(b) {
      box = b;
      L = layoutKalimba(b, hz);
      host.requestDraw();
    },

    draw(g, now) {
      if (!box) return false;
      /* The host sizes the canvas to the box × dpr; scaling here makes that
         true whether or not the host already set the transform. */
      g.setTransform(box.dpr, 0, 0, box.dpr, 0, 0);
      const palette = host.palette();
      if (!L) {
        g.fillStyle = palette.background;
        g.fillRect(0, 0, box.width, box.height);
        return false;
      }
      const tap = host.tap();
      presses = presses.filter((d) => now - d.t0 < tap.durationMs);
      return drawKalimba(g, { layout: L, glows, presses, tap, width: box.width, height: box.height }, palette, now);
    },

    pointerDown(e) {
      if (disposed) return;
      const h = L ? hitTine(L, e.x, e.y) : null;
      pointers.set(e.id, h ? h.tine : -1);
      host.holding(pointers.size);
      if (h) own(h.tine, h.pos);
    },

    pointerMove(e) {
      if (disposed || !pointers.has(e.id)) return;
      const h = L ? hitTine(L, e.x, e.y) : null;
      if (h && h.tine !== pointers.get(e.id)) {
        pointers.set(e.id, h.tine);
        own(h.tine, h.pos);
      }
    },

    pointerUp(e) {
      if (pointers.delete(e.id) && !disposed) host.holding(pointers.size);
    },

    keyDown(key, shift) {
      if (disposed) return false;
      const k = key.toLowerCase();
      if (k === SWING_KEY) {
        swingHeld = true;
        return true;
      }
      const tine = tineOfKey(k);
      if (tine < 0 || tine >= sound.tines.length) return false;
      if (!keys.has(k)) {
        keys.add(k);
        own(tine, shift ? KEY_POSITION.shift : KEY_POSITION.plain);
      }
      return true;
    },

    keyUp(key) {
      const k = key.toLowerCase();
      keys.delete(k);
      if (k === SWING_KEY) swingHeld = false;
    },

    playAnswer(stroke) {
      if (disposed) return null;
      const tine = tineOfDegree(order, stroke.degree);
      if (tine === undefined) return null;
      const touch = touchAt(positionFor(stroke.velocity, sound), sound);
      light(tine, touch, 'answer');
      return hear(tine, touch, false);
    },

    playDemo() {
      const tine = demo.tine;
      if (!disposed && sound.tines[tine]) {
        const touch = touchAt(demo.position, sound);
        light(tine, touch, 'played');
        hear(tine, touch, true);
      }
      return { degree: degreeOfTine(order, tine) };
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      stopStepping();
      out.dispose();
      pending = null;
      pointers.clear();
      keys.clear();
    },
  };
}
