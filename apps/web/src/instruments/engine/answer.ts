/**
 * The conversation: the instrument listens until you pause, then answers.
 *
 * Ported from Lucia's marimba v6 (`public/experiments/marimba/261108-1740`,
 * functions `listen`, `pauseMs`, `maybeAnswer`, `compose`, `playAnswer`,
 * `stopAnswer`), which the harp already carried over verbatim (harp/261109-0920,
 * „Gespräch“). Ben, 2026-11-09: that algorithm answers for all three
 * instruments, the kalimba included; only `home`, `roll` and the kalimba's
 * `pitchOrder` differ, and they arrive in `AnswerConfig`.
 *
 * ── WHAT CHANGED IN THE PORT, AND WHAT DID NOT ────────────────────────────
 * - Bars and strings became DEGREES (pitch order, 0 = lowest — types.ts). The
 *   marimba's `i` and the harp's string index already were degrees; the
 *   kalimba's adapter maps tines to degrees before the engine sees them.
 * - Every literal the experiment wrote inline is read from `AnswerConfig`
 *   (`answer.json`, which `sources.test.ts` holds to the experiment), except
 *   three the config does not carry: the step pool `[1, 1, 2]` when the phrase
 *   had no steps, the shortest medium or long answer (2 notes), and the motif
 *   transform's names. They are the experiment's, unchanged.
 * - `Math.random` is injected, and the random numbers are drawn IN THE SAME
 *   ORDER as the experiment draws them, so that with the same random stream
 *   `compose` returns the experiment's answer note for note — answer.test.ts
 *   runs the marimba's and the harp's own `compose` beside this one to prove it.
 * - `compose` is pure; the length of the previous answer (`lastAnsLen`, a
 *   module variable in the experiment) is passed in and kept by the caller.
 * - The roll is the marimba's and only exists where `config.roll` is set: a
 *   roll stroke on the same note is one held note, not a new one, the pause
 *   waits a little longer after one, and an answer to a phrase that ended in a
 *   roll ends in one. With `roll: null` (harp, kalimba) a stroke's `roll` flag
 *   is ignored.
 * - One guard the experiment did not need: an answer is never longer than the
 *   phrase even if `length.short` were configured above `length.shortUpTo`.
 *
 * Voice: the person may always interrupt the instrument, the instrument never
 * interrupts the person — it waits well past their longest pause, and while a
 * finger is still down it waits again.
 */
import type { AnswerConfig, Stroke, Voice } from '../types';
import type { Timers } from './time';

/** One note of a composed answer. */
export interface AnswerNote {
  degree: number;
  /** Milliseconds after the answer begins. */
  t: number;
  velocity: number;
  /** The phrase ended in a roll, so this — the last — note is one. Marimba only. */
  roll: boolean;
}

export type Random = () => number;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const mean = (a: readonly number[]) => a.reduce((s, v) => s + v, 0) / a.length;
const median = (a: readonly number[]) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};
/** The gaps between consecutive strokes, in ms. */
export const gapsOf = (phrase: readonly Pick<Stroke, 'at'>[]): number[] =>
  phrase.slice(1).map((p, k) => p.at - phrase[k].at);

/** The experiment's: when a phrase had no steps, walk by these. */
const FALLBACK_STEPS = [1, 1, 2];
/** The experiment's: a medium or long answer has at least two notes. */
const MIN_PHRASE_ANSWER = 2;
const LENGTH_KINDS = ['short', 'medium', 'long'] as const;
const STEP_DIRECTIONS = [-1, 1];

/**
 * How long a pause must be before the instrument answers: well past the
 * person's own pauses (2.5 × the median, 1.4 × the longest of the last six),
 * never under 1.8 s, never over 6 s; a little longer after a roll.
 */
export function pauseMs(phrase: readonly Stroke[], config: AnswerConfig): number {
  const p = config.pause;
  const g = gapsOf(phrase).slice(-p.lastGaps);
  const m = g.length ? median(g) : p.fallbackMedianMs;
  const longest = g.length ? Math.max(...g) : 0;
  const last = phrase[phrase.length - 1];
  const afterRoll = config.roll !== null && last?.roll === true ? p.afterRollMs : 0;
  return clamp(Math.max(m * p.medianFactor, longest * p.longestFactor, p.minMs), p.minMs, p.maxMs) + afterRoll;
}

/**
 * The answer to a phrase. Takes the person's CHARACTER, not their notes:
 * where they play, their step sizes, a small motif of two or three of their
 * steps inverted or reversed, their tempo and their loudness. A check rejects
 * a copy, a mere transposition, and three of their notes in a row. Never
 * longer than the phrase, in notes or in time; ends on a home degree.
 *
 * `degrees` is how many the instrument has (`InstrumentAdapter.degrees`);
 * `previousLength` is the last answer's length, avoided where possible.
 */
export function compose(
  phrase: readonly Stroke[],
  config: AnswerConfig,
  degrees: number,
  random: Random,
  previousLength = 0,
): AnswerNote[] {
  if (phrase.length === 0) return [];
  const rnd = (a: number, b: number) => a + random() * (b - a);
  const pick = <T>(a: readonly T[]): T => a[Math.floor(random() * a.length)];

  const n = Math.max(1, Math.floor(degrees));
  const degs = phrase.map((p) => clamp(p.degree, 0, n - 1));
  const g = gapsOf(phrase);
  /* Reflect at both ends. With one degree there is nowhere to go — and the
     experiment's loop would never end. */
  const fold = (d: number) => {
    if (n < 2) return 0;
    while (d < 0 || d > n - 1) d = d < 0 ? -d : 2 * (n - 1) - d;
    return d;
  };
  const steps = degs.slice(1).map((d, k) => d - degs[k]);
  const sizes = steps.map(Math.abs).filter((s) => s > 0);
  const pool = sizes.length ? sizes : FALLBACK_STEPS;
  const lo = Math.min(...degs);
  const hi = Math.max(...degs);
  const centre = mean(degs);
  const span = Math.max(2, hi - lo);
  const inRange = config.home.filter((h) => h >= 0 && h < n);
  const homes = inRange.length ? inRange : [0];
  const maxLen = Math.min(phrase.length, config.maxNotes);

  const L = config.length;
  const lengthFor = () => {
    if (maxLen <= L.shortUpTo) return 1 + Math.floor(random() * maxLen); // played briefly: a brief answer
    const kind = pick(LENGTH_KINDS);
    if (kind === 'short') return Math.min(maxLen, L.short[0] + Math.floor(random() * (L.short[1] - L.short[0] + 1)));
    if (kind === 'medium') return clamp(Math.round(maxLen * rnd(L.medium[0], L.medium[1])), MIN_PHRASE_ANSWER, maxLen);
    return clamp(Math.round(maxLen * rnd(L.long[0], L.long[1])), MIN_PHRASE_ANSWER, maxLen);
  };
  let len = lengthFor();
  for (let k = 0; k < L.avoidRepeatTries && len === previousLength && maxLen > 1; k += 1) len = lengthFor();

  const isCopy = (a: number[]) => {
    const iv = a.slice(1).map((d, k) => d - a[k]);
    if (a.length === degs.length && iv.join() === steps.join()) return true; // the same, or only higher or lower
    for (let k = 0; k + 2 < a.length; k += 1) {
      const tri = a.slice(k, k + 3).join(); // three of their notes in a row
      for (let j = 0; j + 2 < degs.length; j += 1) if (degs.slice(j, j + 3).join() === tri) return true;
    }
    return false;
  };

  let notes: number[] | null = null;
  if (len === 1) {
    // A single note: calm, in their register, not their last note.
    const near = Math.min(...homes.map((h) => Math.abs(h - centre)));
    const opts = homes.filter((h) => Math.abs(h - centre) <= near + 2 && h !== degs[degs.length - 1]);
    notes = [pick(opts.length ? opts : homes)];
  }
  const M = config.motif;
  for (let tries = 0; tries < M.tries && !notes; tries += 1) {
    let motif: number[] = [];
    if (steps.length) {
      const k = Math.min(steps.length, pick(M.sizes));
      const s0 = Math.floor(random() * (steps.length - k + 1));
      const tf = pick(M.transforms);
      motif = steps.slice(s0, s0 + k);
      if (tf !== 'retro') motif = motif.map((s) => -s); // inverted: up becomes down
      if (tf !== 'inv') motif = motif.reverse(); // backwards
    }
    let d = fold(Math.round(centre + rnd(-span / 2, span / 2))); // start in their register, not on their first note
    if (d === degs[0]) d = fold(d + pick(STEP_DIRECTIONS));
    const a = [d];
    for (const s of motif) {
      if (a.length >= len - 1) break;
      d = fold(d + s);
      a.push(d);
    }
    while (a.length < len - 1) {
      let dir = random() < 0.5 ? -1 : 1;
      if (d >= hi + 1) dir = -1;
      else if (d <= lo - 1) dir = 1; // do not wander out of their register
      d = fold(d + dir * pick(pool));
      a.push(d);
    }
    const near = Math.min(...homes.map((h) => Math.abs(h - d))); // end on the nearest home
    a.push(pick(homes.filter((h) => Math.abs(h - d) === near)));
    if (!isCopy(a) || tries === M.tries - 1) notes = a;
  }
  const chosen = notes ?? [homes[0]];

  // Time: their gaps, in another order and slightly loosened; the last longer, like breathing out.
  const G = config.gaps;
  const base = clamp(g.length ? median(g) : G.fallbackMs, G.baseMinMs, G.baseMaxMs);
  const off = Math.floor(random() * Math.max(1, g.length));
  const gap = (k: number) => clamp((g.length ? g[(k + off) % g.length] : base) * rnd(G.jitter[0], G.jitter[1]), G.minMs, G.maxMs);
  const V = config.velocity;
  const v0 = clamp(mean(phrase.map((p) => p.velocity)) * V.meanFactor, V.min, V.max);
  const ds = chosen.map((_, k) => (k === 0 ? 0 : gap(k - 1) * (k === chosen.length - 1 ? G.lastFactor : 1)));
  const total = ds.reduce((s, v) => s + v, 0);
  const yours = phrase[phrase.length - 1].at - phrase[0].at;
  const squeeze = total > yours && total > 0 ? yours / total : 1; // never longer than their playing
  const endsInRoll = config.roll !== null && phrase[phrase.length - 1].roll === true;
  let t = 0;
  return chosen.map((degree, k) => {
    t += ds[k] * squeeze;
    const last = k === chosen.length - 1;
    const arch = Math.sin((Math.PI * (k + 0.5)) / chosen.length); // a little louder in the middle, softer at the end
    const velocity = clamp(v0 * (V.archBase + V.archSpan * arch) + rnd(-V.jitter, V.jitter), V.clampMin, V.clampMax) * (last ? V.lastFactor : 1);
    return { degree, t, velocity, roll: last && endsInRoll };
  });
}

export interface AnsweredMeta {
  /** Strokes in the phrase that was answered. */
  heard: number;
  /** Notes in the answer. */
  notes: number;
}

export interface ConversationDeps {
  config: AnswerConfig;
  /** How many degrees the instrument has — read when an answer is composed. */
  degrees: () => number;
  now: () => number;
  timers: Timers;
  random: Random;
  /** A finger is still down: the answer waits for it. */
  isHolding: () => boolean;
  /** The play mode: true for `with_musie`, false for `solo`. */
  enabled: () => boolean;
  /** Sound one answer note — the adapter's `playAnswer`. */
  play: (stroke: Stroke) => Voice | null;
  onAnswered?: (meta: AnsweredMeta) => void;
}

export interface Conversation {
  /**
   * An own note. Interrupts an answer in any mode; with Musie it joins the
   * phrase and the wait for a pause starts again.
   */
  heard(stroke: Stroke): void;
  /** Stop a sounding answer: its pending notes are dropped, its voices fade. */
  interrupt(): void;
  /** Interrupt, and forget the phrase and the pending pause (`quiet` in the harp). */
  stop(): void;
  answering(): boolean;
  /** Strokes waiting for a pause. */
  phraseLength(): number;
}

export function createConversation(deps: ConversationDeps): Conversation {
  const { config, timers } = deps;
  let phrase: Stroke[] = [];
  let pauseTimer: number | null = null;
  let answering = false;
  let answerTimers: number[] = [];
  let voices: Voice[] = [];
  let lastLength = 0;

  const clearPause = () => {
    if (pauseTimer !== null) timers.clearTimeout(pauseTimer);
    pauseTimer = null;
  };

  function interrupt() {
    if (!answering) return;
    answerTimers.forEach((h) => timers.clearTimeout(h));
    answerTimers = [];
    answering = false;
    voices.forEach((v) => v.fade(config.interruptFadeTau));
    voices = [];
  }

  function sound(degree: number, velocity: number, roll: boolean) {
    const voice = deps.play({ degree, velocity, roll, at: deps.now() });
    if (voice) voices.push(voice);
  }

  function playAnswer(notes: AnswerNote[]) {
    answering = true;
    voices = [];
    const R = config.roll;
    for (const nt of notes) {
      answerTimers.push(timers.setTimeout(() => sound(nt.degree, nt.velocity, false), nt.t));
      // They ended with a roll: the answer does too, fading.
      if (nt.roll && R !== null) {
        for (let k = 1; k <= R.strokes; k += 1) {
          answerTimers.push(timers.setTimeout(() => sound(nt.degree, R.velocity - k * R.step, true), nt.t + k * R.everyMs));
        }
      }
    }
    const last = notes[notes.length - 1];
    const tail = last.roll && R !== null ? R.tailMs : config.endMs;
    answerTimers.push(
      timers.setTimeout(() => {
        answering = false;
        answerTimers = [];
        voices = [];
      }, last.t + tail),
    );
  }

  function maybeAnswer() {
    pauseTimer = null;
    if (!deps.enabled() || !phrase.length) return;
    if (deps.isHolding()) {
      pauseTimer = timers.setTimeout(maybeAnswer, config.pause.heldRetryMs); // a finger still rests: not finished yet
      return;
    }
    const heard = phrase;
    phrase = [];
    const notes = compose(heard, config, deps.degrees(), deps.random, lastLength);
    if (!notes.length) return;
    lastLength = notes.length;
    deps.onAnswered?.({ heard: heard.length, notes: notes.length });
    playAnswer(notes);
  }

  return {
    heard(stroke) {
      interrupt();
      if (!deps.enabled()) {
        clearPause();
        phrase = [];
        return;
      }
      const last = phrase[phrase.length - 1];
      const prev = phrase[phrase.length - 2];
      if (config.roll !== null && stroke.roll === true && last && (last.degree === stroke.degree || prev?.degree === stroke.degree)) {
        last.roll = true; // a roll is one note, not a phrase
      } else {
        phrase.push({ degree: stroke.degree, velocity: stroke.velocity, at: stroke.at });
      }
      if (phrase.length > config.phraseMemory) phrase.shift();
      clearPause();
      pauseTimer = timers.setTimeout(maybeAnswer, pauseMs(phrase, config));
    },
    interrupt,
    stop() {
      interrupt();
      clearPause();
      phrase = [];
    },
    answering: () => answering,
    phraseLength: () => phrase.length,
  };
}
