/**
 * One opening of the focus sheet: the `InstrumentHost` an adapter is handed,
 * and the wiring that turns what the adapter reports into the exercise.
 *
 *   React stage ──creates──▶ createInstrumentSession(options)
 *                              │ builds the host, then factory(definition, host)
 *                              ▼
 *        adapter ──host.played(stroke)──▶ 1. onboarding.cancel()   the demo never follows an own note
 *                                         2. clock OWN_NOTE         first note starts, after a pause resumes, after 0:00 nothing
 *                                         3. conversation.heard     interrupts an answer; with Musie it listens for the pause
 *                                         4. options.onPlayed
 *        adapter ──host.holding(n > 0)──▶ onboarding.cancel(), conversation.interrupt()
 *                                         (the harp stops its answer on touch-down; the
 *                                          answer also waits while n > 0)
 *        conversation ──answer note──▶ adapter.playAnswer(stroke)   never `played`: no clock, no phrase
 *        onboarding ──once──▶ adapter.playDemo()                    never `played`: no clock, no answer
 *        adapter ──host.vibrate(ms, ticks)──▶ vibrator              the adapter decides WHEN; the host decides
 *                                                                   how (Android now, iPhone on the next touchend)
 *                                                                   and whether (the switch, `getVibration`)
 *        adapter ──host.requestDraw()──▶ animation frames calling adapter.draw until it returns false
 *                                         (none before the stage's first session.layout(box))
 *
 * Who owns what: the AudioContext and the motion sensor belong to the PAGE
 * (`engineAudio()`, `motionSensor()` — the CTA unlocks the one, the intro
 * step asks for the other), so a session borrows them and gives them back;
 * everything else — the conversation, the clock, the demo, the vibration
 * debt, the palette probe, the draw loop — lives and dies with the session.
 *
 * The play mode is read live (`getMode`): in solo the conversation hears
 * nothing and never answers. When the mode changes to solo while an answer
 * sounds, the stage calls `quiet()`. „Weiter zum Reflektieren“ is the clock's
 * CONTINUE, which also quiets the conversation and cancels the demo; the play
 * time to store is `playSecondsAt(now)` at that moment.
 *
 * Everything the browser provides comes in through `SessionEnv`, so the
 * wiring is unit-tested in node with fakes (host.test.ts).
 */
import type { PlayMode } from '../../lib/content';
import type {
  InstrumentAdapter,
  InstrumentDefinition,
  InstrumentFactory,
  InstrumentHost,
  StageBox,
  Stroke,
} from '../types';
import { createConversation } from './answer';
import type { AnsweredMeta } from './answer';
import { engineAudio } from './audio';
import type { EngineAudio } from './audio';
import { clockReducer, expiresAt, initialClock, playSeconds } from './clock';
import type { ClockAction, ClockState } from './clock';
import { browserVibrationEnv, createVibrator } from './haptics';
import type { VibrationEnv } from './haptics';
import { motionSensor } from './motion';
import type { MotionSensor } from './motion';
import { createOnboarding } from './onboarding';
import type { Onboarding } from './onboarding';
import { watchPalette } from './palette';
import type { WatchPalette } from './palette';
import { browserNow, browserTimers } from './time';
import type { Timers } from './time';

export interface SessionEnv {
  now: () => number;
  timers: Timers;
  random: () => number;
  requestFrame: (draw: (now: number) => void) => number;
  cancelFrame: (handle: number) => void;
  audio: () => EngineAudio;
  motion: () => MotionSensor;
  vibration: (timers: Timers) => VibrationEnv;
  watchPalette: WatchPalette;
}

export function browserSessionEnv(): SessionEnv {
  return {
    now: browserNow,
    timers: browserTimers,
    random: Math.random,
    requestFrame: (draw) => window.requestAnimationFrame(draw),
    cancelFrame: (handle) => window.cancelAnimationFrame(handle),
    audio: engineAudio,
    motion: motionSensor,
    vibration: browserVibrationEnv,
    watchPalette,
  };
}

export interface InstrumentSessionOptions {
  definition: InstrumentDefinition;
  factory: InstrumentFactory;
  /** The stage's root, inside `[data-theme]`: the palette probe and the touchend listener live here. */
  scope: HTMLElement;
  canvas?: HTMLCanvasElement | null;
  /** How long the timer runs — the exercise's `listen_gate_seconds`. */
  durationSeconds: number;
  getMode: () => PlayMode;
  getVibration: () => boolean;
  /** A clock carried over from an earlier opening of the sheet. */
  clock?: ClockState;
  onClock?: (state: ClockState) => void;
  onPlayed?: (stroke: Stroke) => void;
  onAnswered?: (meta: AnsweredMeta) => void;
  /** The demo sounded — for the screen reader. */
  onDemo?: (meta: { degree: number }) => void;
}

export interface ClockStore {
  state(): ClockState;
  dispatch(action: ClockAction): void;
  subscribe(listener: (state: ClockState) => void): () => void;
}

export interface InstrumentSession {
  readonly host: InstrumentHost;
  readonly adapter: InstrumentAdapter;
  /** Samples decoded and `adapter.ready()` resolved. Rejects when a sample failed to load. */
  readonly ready: Promise<void>;
  readonly clock: ClockStore;
  /** The demo note — when the sheet has opened. */
  startOnboarding(): void;
  /** Any own touch on the stage, even one that hits no note: the demo is cancelled, an answer stops. */
  touched(): void;
  /** No answer now and no phrase remembered — the mode turned to solo. */
  quiet(): void;
  /**
   * Hand `box` to the adapter — the stage calls this, not `adapter.layout`,
   * because no frame is drawn before the first one. The stage sizes the
   * canvas (box × dpr) itself; the adapter sets its own transform.
   */
  layout(box: StageBox): void;
  setCanvas(canvas: HTMLCanvasElement | null): void;
  /** Whole seconds from the first own note to Weiter (or to `now`). */
  playSecondsAt(now: number): number;
  dispose(): void;
}

/** The harp's countdown ticks four times a second. */
const CLOCK_TICK_MS = 250;
/** `InstrumentAdapter.tick` — the marimba's calm runs at 100 ms. */
const ADAPTER_TICK_MS = 100;

export function createInstrumentSession(options: InstrumentSessionOptions, env: SessionEnv = browserSessionEnv()): InstrumentSession {
  const { definition, scope } = options;
  const { now, timers } = env;
  const audio = env.audio();
  const motion = env.motion();
  const releaseMotion = motion.listen();
  const vibrator = createVibrator(options.getVibration, env.vibration(timers));

  let disposed = false;
  let adapter: InstrumentAdapter | null = null;
  let holdingCount = 0;
  let canvas = options.canvas ?? null;
  let g: CanvasRenderingContext2D | null = null;
  let frame: number | null = null;
  /** No frame before the adapter has its first `layout` — it has nothing to draw into. */
  let laidOut = false;

  /* ── draw loop ── */
  function requestDraw() {
    if (disposed || !laidOut || frame !== null || canvas === null || adapter === null) return;
    frame = env.requestFrame(drawFrame);
  }
  function drawFrame(t: number) {
    frame = null;
    if (disposed || canvas === null || adapter === null) return;
    g ??= canvas.getContext('2d');
    if (g !== null && adapter.draw(g, t)) requestDraw();
  }

  const paletteWatch = env.watchPalette(scope, definition.family, requestDraw);

  /* ── samples: fetching starts before the adapter exists (types.ts, `ready`) ── */
  const pathOf = new Map(definition.samples.map((s) => [s.file, s.path]));
  const samplesLoaded = audio.load(definition.samples);

  /* ── the conversation ── */
  const conversation = createConversation({
    config: definition.answer,
    degrees: () => adapter?.degrees ?? 0,
    now,
    timers,
    random: env.random,
    isHolding: () => holdingCount > 0,
    enabled: () => options.getMode() === 'with_musie',
    play: (stroke) => (adapter !== null && !disposed ? adapter.playAnswer(stroke) : null),
    onAnswered: options.onAnswered,
  });

  /* ── the clock ── */
  let clockState = options.clock ?? initialClock(options.durationSeconds, now());
  const clockListeners = new Set<(state: ClockState) => void>();
  let clockTimer: number | null = null;

  function syncClockTimer() {
    const due = expiresAt(clockState);
    if (due === null || disposed) {
      if (clockTimer !== null) timers.clearTimeout(clockTimer);
      clockTimer = null;
      return;
    }
    if (clockTimer === null) clockTimer = timers.setTimeout(clockTick, Math.max(0, Math.min(CLOCK_TICK_MS, due - now())));
  }
  function clockTick() {
    clockTimer = null;
    dispatch({ type: 'TICK', at: now() });
    syncClockTimer();
  }
  function dispatch(action: ClockAction) {
    if (disposed) return;
    if (action.type === 'CONTINUE') {
      conversation.stop();
      onboarding?.cancel();
    }
    const next = clockReducer(clockState, action);
    if (next === clockState) return;
    clockState = next;
    syncClockTimer();
    options.onClock?.(next);
    clockListeners.forEach((fn) => fn(next));
  }

  /* ── the host ── */
  let onboarding: Onboarding | null = null;

  const host: InstrumentHost = {
    audio: audio.context,
    audible: () => audio.audible(),
    buffer: (file) => {
      const path = pathOf.get(file);
      return path === undefined ? undefined : audio.decoded(path);
    },
    palette: () => paletteWatch.palette(),
    shadow: () => paletteWatch.shadow(),
    tap: () => paletteWatch.tap(),
    vibrate: (ms, ticks) => {
      if (!disposed) vibrator.vibrate(ms, ticks);
    },
    motion: () => motion.reading(),
    joltsSince: (t) => motion.joltsSince(t),
    played(stroke) {
      if (disposed) return;
      onboarding?.cancel();
      dispatch({ type: 'OWN_NOTE', at: stroke.at });
      conversation.heard(stroke);
      options.onPlayed?.(stroke);
    },
    holding(count) {
      holdingCount = Math.max(0, count);
      if (holdingCount > 0) {
        onboarding?.cancel();
        conversation.interrupt();
      }
    },
    requestDraw,
  };

  try {
    adapter = options.factory(definition, host);
  } catch (error) {
    releaseMotion();
    paletteWatch.dispose();
    throw error;
  }
  const theAdapter = adapter;

  const ready = Promise.all([samplesLoaded, theAdapter.ready()]).then(() => undefined);
  ready.catch(() => undefined); // the stage reads `ready`; an unread failure is not an unhandled one

  onboarding = createOnboarding({
    audible: () => audio.audible(),
    ready,
    playDemo: () => theAdapter.playDemo(),
    onDemo: options.onDemo,
    now,
    timers,
  });

  /* ── the adapter's ~100 ms tick (the marimba's calm) ── */
  let adapterTimer: number | null = null;
  if (theAdapter.tick) {
    const tick = () => {
      adapterTimer = null;
      if (disposed) return;
      theAdapter.tick?.(now());
      adapterTimer = timers.setTimeout(tick, ADAPTER_TICK_MS);
    };
    adapterTimer = timers.setTimeout(tick, ADAPTER_TICK_MS);
  }

  /* ── the finger lifts: the iPhone's owed tick, and Safari's motion grant ── */
  const onTouchEnd = () => {
    vibrator.touchEnd();
    motion.rearm();
  };
  const touchOptions: AddEventListenerOptions = { capture: true, passive: true };
  scope.addEventListener('touchend', onTouchEnd, touchOptions);

  syncClockTimer();

  return {
    host,
    adapter: theAdapter,
    ready,
    clock: {
      state: () => clockState,
      dispatch,
      subscribe(listener) {
        clockListeners.add(listener);
        return () => clockListeners.delete(listener);
      },
    },
    startOnboarding: () => {
      if (!disposed) onboarding?.start();
    },
    touched() {
      onboarding?.cancel();
      conversation.interrupt();
    },
    quiet: () => conversation.stop(),
    layout(box) {
      theAdapter.layout(box);
      laidOut = true;
      requestDraw();
    },
    setCanvas(next) {
      if (next === canvas) return;
      canvas = next;
      g = null;
      requestDraw();
    },
    playSecondsAt: (t) => playSeconds(clockState, t),
    dispose() {
      if (disposed) return;
      conversation.stop();
      onboarding?.cancel();
      disposed = true;
      if (clockTimer !== null) timers.clearTimeout(clockTimer);
      if (adapterTimer !== null) timers.clearTimeout(adapterTimer);
      if (frame !== null) env.cancelFrame(frame);
      clockTimer = adapterTimer = frame = null;
      scope.removeEventListener('touchend', onTouchEnd, touchOptions);
      releaseMotion();
      paletteWatch.dispose();
      clockListeners.clear();
      theAdapter.dispose();
    },
  };
}
