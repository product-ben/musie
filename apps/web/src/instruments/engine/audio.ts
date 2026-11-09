/**
 * Sound: the page's one AudioContext, unlocked the way all three experiments
 * unlock it (`initAudio`, `unlockAudio`, `audible` in harp/261109-0920, the
 * same in the kalimba and the marimba), plus the samples by path.
 *
 * ONE CONTEXT FOR THE PAGE, created on first use and never closed. Safari
 * unlocks a context inside a gesture and iOS caps how many a page may open; a
 * context per sheet opening would need unlocking again each time. The play
 * step's CTA calls `unlockNow()` from its click, so the sheet opens already
 * audible.
 *
 * - `navigator.audioSession.type = 'playback'` before the context exists,
 *   where it exists (Safari 16.4+): the iPhone's silent switch then does not
 *   mute the instrument.
 * - Safari lets sound out only in `touchend`, `click`, `mousedown`, `keydown`
 *   (and `pointerup`), not while a finger slides over strings. So every such
 *   gesture, captured and passive on the window, resumes the context and
 *   plays a silent one-sample buffer — WebKit keeps that as the unlock. It
 *   stays installed: after a call or the background, iOS reports
 *   'interrupted' and needs a gesture again.
 * - `audible()` is true while the unlock is still resolving: the note of the
 *   very gesture that unlocks sounds milliseconds late, not collected and
 *   dumped at once.
 *
 * NO MASTER CHAIN HERE. Each adapter builds its own (compressor → makeup →
 * limiter, plus its reverb, membrane or warm filter) from its locked sound
 * and connects it to `context.destination`; the engine puts nothing of its
 * own into the signal path.
 *
 * Samples are static files under `/instruments/<id>/…`
 * (`InstrumentSample.path`), fetched and decoded once per page — a second
 * sheet opening finds them decoded. Trimming leading silence and levelling
 * are each instrument's own (its `sound.onset` / `sound.normalise`), so they
 * stay in the adapters.
 */
import type { InstrumentSample } from '../types';

export const UNLOCK_EVENTS = ['touchend', 'pointerup', 'mousedown', 'click', 'keydown'] as const;

export interface AudioEnv {
  createContext(): AudioContext;
  /** `navigator.audioSession` where it exists. */
  audioSession: { type: string } | null;
  /** Where unlock gestures are heard — the window, in the browser; null for none. */
  target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'> | null;
  fetch(path: string): Promise<ArrayBuffer>;
}

export interface EngineAudio {
  readonly context: AudioContext;
  /** Running, or being unlocked right now. */
  audible(): boolean;
  /** Unlock from inside a gesture handler (the CTA's click). */
  unlockNow(): void;
  /** Fetch and decode, once per path. Rejects with the first failure. */
  load(samples: readonly InstrumentSample[]): Promise<void>;
  /** A decoded sample by its path; undefined until loaded. */
  decoded(path: string): AudioBuffer | undefined;
  /** Remove the gesture listeners. The context stays. */
  dispose(): void;
}

export function createEngineAudio(env: AudioEnv): EngineAudio {
  try {
    if (env.audioSession) env.audioSession.type = 'playback';
  } catch {
    // an audioSession that refuses the type changes nothing else
  }
  const context = env.createContext();
  let unlocking = false;
  const loading = new Map<string, Promise<AudioBuffer>>();
  const decoded = new Map<string, AudioBuffer>();

  function unlock() {
    if (context.state === 'running') return;
    unlocking = true;
    const done = () => {
      unlocking = false;
    };
    context.resume().then(done, done);
    try {
      const silent = context.createBufferSource();
      silent.buffer = context.createBuffer(1, 1, 22050);
      silent.connect(context.destination);
      silent.start(0);
    } catch {
      // a context that cannot make a buffer yet is unlocked by resume() alone
    }
  }

  const options: AddEventListenerOptions = { capture: true, passive: true };
  UNLOCK_EVENTS.forEach((type) => env.target?.addEventListener(type, unlock, options));

  function loadOne(path: string): Promise<AudioBuffer> {
    let pending = loading.get(path);
    if (!pending) {
      pending = env.fetch(path)
        .then((bytes) => context.decodeAudioData(bytes))
        .then((buffer) => {
          decoded.set(path, buffer);
          return buffer;
        });
      // A failure is not cached: the next opening tries again.
      pending.catch(() => loading.delete(path));
      loading.set(path, pending);
    }
    return pending;
  }

  return {
    context,
    audible: () => context.state === 'running' || unlocking,
    unlockNow: unlock,
    load: (samples) => Promise.all(samples.map((s) => loadOne(s.path))).then(() => undefined),
    decoded: (path) => decoded.get(path),
    dispose() {
      UNLOCK_EVENTS.forEach((type) => env.target?.removeEventListener(type, unlock, options));
    },
  };
}

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };
type SessionNavigator = Navigator & { audioSession?: { type: string } };

export function browserAudioEnv(): AudioEnv {
  return {
    createContext() {
      const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
      if (!Ctor) throw new Error('audio: this browser has no Web Audio');
      return new Ctor();
    },
    audioSession: (navigator as SessionNavigator).audioSession ?? null,
    target: window,
    async fetch(path) {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`${path}: ${res.status}`);
      return res.arrayBuffer();
    },
  };
}

let shared: EngineAudio | null = null;

/** The page's one context, created on first use — from a gesture where possible. */
export function engineAudio(): EngineAudio {
  shared ??= createEngineAudio(browserAudioEnv());
  return shared;
}

/** For the play step's CTA: create and unlock the context inside its click. */
export function unlockNow(): void {
  engineAudio().unlockNow();
}
