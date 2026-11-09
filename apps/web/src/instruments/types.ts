/**
 * The contract between the play step, the shared engine and the three
 * instruments — written before any of them, so they can be built at once.
 *
 *   play step (React)  ── owns ──▶  InstrumentHost  (engine/: audio, haptics,
 *          │                                          motion, clock, answer)
 *          └── mounts ──▶  InstrumentAdapter  (harp/, kalimba/, marimba/)
 *
 * ── WHO DECIDES WHAT ──────────────────────────────────────────────────────
 * The ADAPTER knows its instrument: how it is drawn, where a touch lands, how
 * a note is made from the locked sound config (`instrument_sounds.sound`).
 * The ENGINE knows the exercise: when the timer runs, when the instrument
 * answers, whether the demo is still allowed to sound, whether to vibrate.
 * The adapter therefore never starts a timer or composes an answer; it reports
 * `host.played(…)` and plays what it is handed through `playAnswer`.
 *
 * ── DEGREES, NOT INDEXES ──────────────────────────────────────────────────
 * The answer counts in PITCH ORDER — `degree` 0 is the lowest note. For the
 * harp and the marimba that is also left-to-right; for the kalimba it is not
 * (lowest tine in the middle), which is why the adapter maps between the two
 * and the engine never sees a tine index.
 *
 * Pure types: no React, no supabase, no DOM beyond the canvas type.
 */

import type { InstrumentShadowLayer } from '@musie/design-system';

export const INSTRUMENT_IDS = ['harp', 'kalimba', 'marimba'] as const;
export type InstrumentId = (typeof INSTRUMENT_IDS)[number];

export function isInstrumentId(value: string | null | undefined): value is InstrumentId {
  return INSTRUMENT_IDS.includes(value as InstrumentId);
}

/** `instruments.family` — strings draw lighter than keys (Ben, 2026-11-09). */
export type InstrumentFamily = 'string' | 'key';

/** One row of `instrument_samples`. `path` is served by the app's own host. */
export interface InstrumentSample {
  file: string;
  path: string;
  midi: number;
  layer: string;
  bytes: number;
  sha256: string;
}

/**
 * The answer's parameters — `supabase/content/instruments/answer.json` merged
 * with the instrument's own `home`, `roll` and (kalimba) `pitchOrder`.
 */
export interface AnswerConfig {
  phraseMemory: number;
  maxNotes: number;
  pause: {
    medianFactor: number; longestFactor: number; lastGaps: number; fallbackMedianMs: number;
    minMs: number; maxMs: number; afterRollMs: number; heldRetryMs: number;
  };
  length: { shortUpTo: number; short: [number, number]; medium: [number, number]; long: [number, number]; avoidRepeatTries: number };
  motif: { sizes: number[]; transforms: ('inv' | 'retro' | 'both')[]; tries: number };
  gaps: { fallbackMs: number; baseMinMs: number; baseMaxMs: number; jitter: [number, number]; minMs: number; maxMs: number; lastFactor: number };
  velocity: {
    meanFactor: number; min: number; max: number; archBase: number; archSpan: number;
    jitter: number; clampMin: number; clampMax: number; lastFactor: number;
  };
  endMs: number;
  interruptFadeTau: number;
  /** Degrees an answer may end on. */
  home: number[];
  /** The marimba's: an answer to a phrase that ended in a roll ends in one. */
  roll: { strokes: number; everyMs: number; velocity: number; step: number; tailMs: number } | null;
  /** Kalimba only: tine index per degree. */
  pitchOrder?: number[];
}

/** Everything the database says about one instrument (`lib/instruments.ts`). */
export interface InstrumentDefinition<Sound = Record<string, unknown>, Demo = Record<string, unknown>> {
  id: InstrumentId;
  family: InstrumentFamily;
  /** The locked sound — each adapter types its own shape. */
  sound: Sound;
  answer: AnswerConfig;
  demo: Demo;
  samples: InstrumentSample[];
}

/** A note in the engine's language. */
export interface Stroke {
  /** Pitch order, 0 = lowest. */
  degree: number;
  /** 0 … 1, the instrument's own velocity scale. */
  velocity: number;
  /** The marimba's roll: a held note made of fast strokes. */
  roll?: boolean;
  /** `performance.now()` when it sounded. */
  at: number;
}

/** A sounding answer note, so an interruption can fade it. */
export interface Voice {
  fade(tau: number): void;
}

/**
 * Colours, resolved from the instrument tokens at draw time — a canvas cannot
 * read `var(--…)`, so the host resolves them through a probe element and
 * re-resolves on a theme change. Plain CSS colour strings.
 */
export interface InstrumentPalette {
  /** `--instrument-string` or `--instrument-key`, by family: at rest. */
  rest: string;
  /** `--instrument-played`: what the person touched. */
  played: string;
  /** `--instrument-answer`: what Musie played. */
  answer: string;
  /** `--instrument-surface` (sand-1), behind the instrument. */
  background: string;
  /** For the instruments' own fine lines (cords, holes, bridge). */
  detail: string;
}

/** The canvas box the adapter may draw in, in CSS pixels. */
export interface StageBox {
  width: number;
  height: number;
  /** Device pixel ratio, capped at 3. */
  dpr: number;
  /** Safe-area and chrome the instrument must keep clear of. */
  inset: { top: number; right: number; bottom: number; left: number };
}

/** What the engine hands an adapter. Implemented in `engine/host.ts`. */
export interface InstrumentHost {
  readonly audio: AudioContext;
  /** True once a gesture has unlocked audio (or is unlocking it right now). */
  audible(): boolean;
  /** Decoded sample, by `InstrumentSample.file`. Undefined until loaded. */
  buffer(file: string): AudioBuffer | undefined;
  palette(): InstrumentPalette;
  /**
   * Instrument shadows from the `--instrument-shadow-*` tokens, through
   * `instrumentShadowLayers` / `instrumentShadowColor` (design system). Null
   * at level 0, under `prefers-contrast: more` and under forced colours —
   * the adapter then draws no shadow. Paint each layer with
   * `instrumentShadowProfile(width, layer, dpr)`.
   */
  shadow(): { layers: readonly InstrumentShadowLayer[]; rgb: readonly [number, number, number] } | null;
  /**
   * Vibrate now — Android immediately; on iOS the host owes `ticks` haptic
   * ticks to the next `touchend` (measured on an iPhone 13, PRD point 12).
   * `ticks` defaults to 1; `ticks: 0` means Android only, owe the iPhone
   * nothing (the kalimba's swing, which vibrates without a touch). No-op when
   * the switch is off or the device cannot.
   */
  vibrate(ms: number, ticks?: number): void;
  /**
   * The motion sensor, or null without permission or sensor. `rotation` is
   * the kalimba's 0 … 1 swing (max rotation rate / 110, or |acceleration| / 6)
   * and is the LARGEST value since the previous call — reading it consumes
   * the peak, so one adapter is its only reader. `jolt` is the latest raw
   * |acceleration| in m/s². `at` is on the `performance.now()` clock.
   */
  motion(): { rotation: number; jolt: number; at: number } | null;
  /** Raw |acceleration| in m/s² since `t` (`performance.now()` clock), 1000 ms kept — the marimba's strike window. */
  joltsSince(t: number): { at: number; magnitude: number }[];
  /**
   * The person played. The ENGINE decides what follows: the clock may start,
   * the onboarding stops, an answer is cancelled and a new phrase is heard.
   * Never call this for the demo note or for an answer note.
   */
  played(stroke: Stroke): void;
  /**
   * How many pointers are down on the instrument. While > 0 the answer waits;
   * going above 0 also interrupts an answer and cancels the demo, as the
   * harp's touch-down did.
   */
  holding(count: number): void;
  /** Ask for an animation frame; the host calls `draw` until it returns false. */
  requestDraw(): void;
}

/** One instrument. Created per sheet opening by its factory. */
export interface InstrumentAdapter {
  readonly id: InstrumentId;
  /** How many degrees the answer may use. */
  readonly degrees: number;
  /** Load what it needs (the host has started fetching samples already). */
  ready(): Promise<void>;
  layout(box: StageBox): void;
  /** Draw a frame. Return true while something still moves. */
  draw(g: CanvasRenderingContext2D, now: number): boolean;
  /** Pointer input in CSS pixels relative to the canvas. */
  pointerDown(e: StagePointer): void;
  pointerMove(e: StagePointer): void;
  pointerUp(e: StagePointer): void;
  /** Desktop keys (the experiments' A–L / A–Ö). True when the key was used. */
  keyDown(key: string, shift: boolean): boolean;
  keyUp(key: string): void;
  /** Play one answer note: sound and the answer colour, no vibration. */
  playAnswer(stroke: Stroke): Voice | null;
  /**
   * The onboarding note (`instrument_sounds.demo`): sound and the played
   * colour so the person sees where to touch; no vibration, no `played`.
   * Returns a short description for the screen reader, e.g. the degree.
   */
  playDemo(): { degree: number };
  /** Called every ~100 ms with the session's calm (marimba) — optional. */
  tick?(now: number): void;
  dispose(): void;
}

/** A pointer event reduced to what an instrument reads. */
export interface StagePointer {
  id: number;
  x: number;
  y: number;
  t: number;
  type: 'mouse' | 'pen' | 'touch';
  /** `Touch.radiusX` / `force` where the browser has them (the marimba's strike). */
  radius?: number;
  force?: number;
  /** Coalesced points since the last move, oldest first, for fast strums. */
  coalesced?: { x: number; y: number; t: number }[];
}

export type InstrumentFactory = (definition: InstrumentDefinition, host: InstrumentHost) => InstrumentAdapter;
