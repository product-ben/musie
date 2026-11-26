/**
 * The duet's answer with switches — the question of experiment „Duett 01“:
 * which of these makes Musie take up the playing better, come in sooner, and
 * play something more exciting and longer?
 *
 * ── TODAY IS THE BASELINE, NOTE FOR NOTE ──────────────────────────────────
 * `base` below is `compose` from src/instruments/engine/answer.ts (Lucia's
 * marimba v6), copied with hooks. Every hook is inert under DEFAULTS, and the
 * random numbers are drawn in the same order, so with every switch off
 * `compose2` returns what the app plays — answer2.test.ts runs both over 400
 * seeded phrases per instrument to prove it. `pause2` likewise equals
 * `pauseMs`. So whatever sounds different in the experiment is a switch, not
 * a porting slip.
 *
 * ── THE FIGURES ───────────────────────────────────────────────────────────
 * Eight SHAPES each decide a whole answer (Musie picks one of the checked
 * ones per answer, and falls back to today's answer when none fits the
 * phrase — too short, nothing remembered yet). Two ORNAMENTS are laid on top
 * of whatever was composed, and stack. Every figure ends on a home degree, as
 * today's answer does, and never exceeds the note cap the length switches set.
 *
 * Chords (section „Akkorde“) are chords.ts: laid under the finished melody,
 * before the ornaments, and inert with nothing checked.
 *
 * The three instruments share one scale, the pentatonic d e g a h (the
 * kalimba's two low tines A H below it), five degrees to the octave: that is
 * what makes `OCTAVE = 5` and the Zweiklang's intervals hold for all three.
 *
 * Every constant marked GUESSED below is a first ear's guess, unmeasured.
 */
import { gapsOf, pauseMs } from '../../../src/instruments/engine/answer';
import type { AnswerNote, Random } from '../../../src/instruments/engine/answer';
import type { AnswerConfig, Stroke } from '../../../src/instruments/types';
import { ALONE_UP_TO, chordFits, chordsAt, harmonise } from './chords';
import { SHAPES } from './settings';
import type { ChordKind, FigureId, Settings, ShapeId } from './settings';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const mean = (a: readonly number[]) => a.reduce((s, v) => s + v, 0) / a.length;
/** The experiment's median: the upper middle, not the average of two. */
const median = (a: readonly number[]) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

/* Today's — from answer.ts, unchanged. */
const FALLBACK_STEPS = [1, 1, 2];
const MIN_PHRASE_ANSWER = 2;
const LENGTH_KINDS = ['short', 'medium', 'long'] as const;
const STEP_DIRECTIONS = [-1, 1];

/** Pentatonic: five degrees to the octave on all three instruments. */
export const OCTAVE = 5;

/** GUESSED. `phraseEnd`: how a finished phrase and an unfinished one change the wait. */
export const PHRASE_END = {
  /** Sounds finished: wait this fraction. */
  closedFactor: 0.55,
  /** In the middle of a run: wait this much longer. */
  openFactor: 1.3,
  /** The last gap counts as stretched from this × the median before it. */
  slowerBy: 1.25,
  /** The last note counts as softer below this × the mean before it. */
  softerBy: 0.85,
  /** A last gap below this × the median counts as speeding up. */
  accelBelow: 0.8,
} as const;
/** GUESSED. No wait ever shorter, whatever the switches multiply. */
export const ABSOLUTE_MIN_MS = 350;

/** GUESSED. `followTempo`: today's gap limits (220–1400, base 260–1000) widened. */
export const TEMPO_FOLLOW = { minMs: 70, maxMs: 2200, baseMinMs: 90, baseMaxMs: 1600 } as const;
/** GUESSED. `followDynamics`: start where they ended, more arch. */
export const DYNAMICS_FOLLOW = { lastNotes: 3, min: 0.2, max: 1, archBase: 0.85, archSpan: 0.3, clampMin: 0.15, clampMax: 1 } as const;
/** GUESSED. Ornaments. */
export const GRACE = { beforeMs: 70, roomMs: 180, velocity: 0.55 } as const;
export const CHORD_VELOCITY = 0.75;
/** `noTiny`: the shortest answer to a phrase that allows this many. */
export const NO_TINY_MIN = 4;
/** GUESSED. Lauf: the run's notes are this far apart, ms. */
export const RUN_GAP = [85, 120] as const;

export type Ending = 'closed' | 'open' | 'neutral';

export interface Pause {
  ms: number;
  ending: Ending;
}

/** A motif heard in an earlier round, for `erinnerung`. */
export interface Motif {
  steps: number[];
  gaps: number[];
  /** The answer round in which it was heard, 1-based. */
  round: number;
}

export interface ComposeContext {
  /** The previous answer's length in notes (today's `lastAnsLen`). */
  previousLength: number;
  /** Answers given so far in this run — `growing` counts them. */
  round: number;
  /** Motifs from earlier rounds, oldest first. */
  memory: readonly Motif[];
}

export interface Composed {
  notes: AnswerNote[];
  /** The answer's own notes, without ornaments. */
  length: number;
  /** The note cap the length switches allowed. */
  cap: number;
  /** `akkord`: „Ein Akkord als Antwort“ — one note and its chord. */
  figure: ShapeId | 'heute' | 'akkord';
  ornaments: FigureId[];
  /** One per chord in the answer, in order (chords.ts). */
  chords: ChordKind[];
  /** `erinnerung`: the round the motif came from. */
  fromRound?: number;
}

/* ═══ the wait ═════════════════════════════════════════════════════════════ */

/** Does the phrase sound finished, unfinished, or neither? */
export function endingOf(phrase: readonly Stroke[], config: AnswerConfig): Ending {
  if (phrase.length < 3) return 'neutral';
  const last = phrase[phrase.length - 1];
  const g = gapsOf(phrase);
  const lastGap = g[g.length - 1];
  const before = g.slice(0, -1);
  const m = median(before);
  let score = 0;
  if (config.home.includes(last.degree)) score += 1; // landed at home
  if (lastGap >= m * PHRASE_END.slowerBy) score += 1; // slowed into the last note
  if (last.velocity <= mean(phrase.slice(0, -1).map((p) => p.velocity)) * PHRASE_END.softerBy) score += 1; // and softer
  if (score >= 2) return 'closed';
  if (score === 0 && lastGap < m * PHRASE_END.accelBelow) return 'open';
  return 'neutral';
}

/**
 * How long Musie waits after this phrase. Today's rule (`pauseMs`) unless a
 * switch says otherwise; `learn` is the factor `conversation.ts` keeps.
 */
export function pause2(phrase: readonly Stroke[], config: AnswerConfig, s: Settings, learn = 1): Pause {
  if (!s.faster && !s.phraseEnd && !s.learn) return { ms: pauseMs(phrase, config), ending: 'neutral' };
  const p = config.pause;
  const minMs = s.faster ? s.minMs : p.minMs;
  const medianFactor = s.faster ? p.medianFactor * s.patience : p.medianFactor;
  /* Never sooner than the longest pause they already made in this phrase. */
  const longestFactor = s.faster ? Math.max(1, p.longestFactor * s.patience) : p.longestFactor;
  const g = gapsOf(phrase).slice(-p.lastGaps);
  const m = g.length ? median(g) : p.fallbackMedianMs;
  const longest = g.length ? Math.max(...g) : 0;
  const last = phrase[phrase.length - 1];
  const afterRoll = config.roll !== null && last?.roll === true ? p.afterRollMs : 0;
  let ms = clamp(Math.max(m * medianFactor, longest * longestFactor, minMs), minMs, p.maxMs) + afterRoll;
  const ending = s.phraseEnd ? endingOf(phrase, config) : 'neutral';
  if (ending === 'closed') ms *= PHRASE_END.closedFactor;
  else if (ending === 'open') ms *= PHRASE_END.openFactor;
  if (s.learn) ms *= learn;
  return { ms: clamp(ms, ABSOLUTE_MIN_MS, p.maxMs + afterRoll), ending };
}

/* ═══ memory ═══════════════════════════════════════════════════════════════ */

/** The phrase's most characteristic 3–4 notes: the window with the widest range. */
export function motifOf(phrase: readonly Stroke[], round: number): Motif | null {
  if (phrase.length < 3) return null;
  const degs = phrase.map((p) => p.degree);
  const g = gapsOf(phrase);
  let best: { at: number; size: number; range: number } | null = null;
  for (const size of [4, 3]) {
    for (let at = 0; at + size <= degs.length; at += 1) {
      const win = degs.slice(at, at + size);
      const range = Math.max(...win) - Math.min(...win);
      if (range > 0 && (best === null || range > best.range)) best = { at, size, range };
    }
  }
  if (best === null) return null;
  const win = degs.slice(best.at, best.at + best.size);
  return {
    steps: win.slice(1).map((d, k) => d - win[k]),
    gaps: g.slice(best.at, best.at + best.size - 1),
    round,
  };
}

/* ═══ the workspace every path shares ══════════════════════════════════════ */

interface PlanNote {
  degree: number;
  /** ms since the previous note; 0 for the first. */
  gap: number;
  /** Multiplies the velocity; 1 is today's arch. */
  accent?: number;
}

interface Work {
  phrase: readonly Stroke[];
  config: AnswerConfig;
  s: Settings;
  ctx: ComposeContext;
  random: Random;
  rnd: (a: number, b: number) => number;
  pick: <T>(a: readonly T[]) => T;
  n: number;
  degs: number[];
  g: number[];
  fold: (d: number) => number;
  steps: number[];
  pool: number[];
  lo: number;
  hi: number;
  centre: number;
  span: number;
  homes: number[];
  /** How far beyond their register the walk may go (today 1). */
  reach: number;
  /** Note cap. */
  cap: number;
  /** Their playing time × the length factor, or Infinity when it does not bind. */
  timeCap: number;
  gapLimits: { minMs: number; maxMs: number; baseMinMs: number; baseMaxMs: number };
  /** Their median gap, clamped — today's `base`. */
  base: number;
  /** The gap before note k+1 — their gaps, today's way. Draws its offset on first use. */
  rhythm: (k: number) => number;
  /** Draw the rhythm's offset now, where today's `compose` draws it (even for one note). */
  ensureOffset: () => void;
  nearestHome: (d: number) => number;
  endsInRoll: boolean;
}

function work(phrase: readonly Stroke[], config: AnswerConfig, degrees: number, random: Random, s: Settings, ctx: ComposeContext): Work {
  const rnd = (a: number, b: number) => a + random() * (b - a);
  const pick = <T>(a: readonly T[]): T => a[Math.floor(random() * a.length)];
  const n = Math.max(1, Math.floor(degrees));
  const degs = phrase.map((p) => clamp(p.degree, 0, n - 1));
  const g = gapsOf(phrase);
  const fold = (d: number) => {
    if (n < 2) return 0;
    while (d < 0 || d > n - 1) d = d < 0 ? -d : 2 * (n - 1) - d;
    return d;
  };
  const steps = degs.slice(1).map((d, k) => d - degs[k]);
  const sizes = steps.map(Math.abs).filter((v) => v > 0);
  const inRange = config.home.filter((h) => h >= 0 && h < n);
  const homes = inRange.length ? inRange : [0];

  /* LENGTH: today `min(phrase, maxNotes)` and never longer in time. */
  const growth = s.growing ? 0.5 + 0.5 * Math.min(1, ctx.round / s.growRounds) : 1;
  const factor = (s.longer ? s.timesYours : 1) * growth;
  const noteCap = s.longer ? s.maxNotes : config.maxNotes;
  const cap = clamp(Math.round(phrase.length * factor), 1, noteCap);
  const yours = phrase[phrase.length - 1].at - phrase[0].at;
  /* With factor 1 this is today's `yours`. Allowed longer, a single-note
     phrase (yours = 0) must not squeeze a two-note answer into a chord. */
  const timeCap = factor === 1 ? yours : yours > 0 ? yours * factor : Infinity;

  const G = config.gaps;
  const gapLimits = s.followTempo
    ? { minMs: TEMPO_FOLLOW.minMs, maxMs: TEMPO_FOLLOW.maxMs, baseMinMs: TEMPO_FOLLOW.baseMinMs, baseMaxMs: TEMPO_FOLLOW.baseMaxMs }
    : { minMs: G.minMs, maxMs: G.maxMs, baseMinMs: G.baseMinMs, baseMaxMs: G.baseMaxMs };
  const base = clamp(g.length ? median(g) : G.fallbackMs, gapLimits.baseMinMs, gapLimits.baseMaxMs);

  let offset: number | null = null;
  const ensureOffset = () => {
    if (offset === null) offset = s.keepRhythm ? 0 : Math.floor(random() * Math.max(1, g.length));
  };
  const rhythm = (k: number) => {
    ensureOffset();
    return clamp((g.length ? g[(k + (offset ?? 0)) % g.length] : base) * rnd(G.jitter[0], G.jitter[1]), gapLimits.minMs, gapLimits.maxMs);
  };

  const nearestHome = (d: number) => {
    const near = Math.min(...homes.map((h) => Math.abs(h - d)));
    return pick(homes.filter((h) => Math.abs(h - d) === near));
  };

  return {
    phrase, config, s, ctx, random, rnd, pick, n, degs, g, fold, steps,
    pool: sizes.length ? sizes : FALLBACK_STEPS,
    lo: Math.min(...degs),
    hi: Math.max(...degs),
    centre: mean(degs),
    span: Math.max(2, Math.max(...degs) - Math.min(...degs)),
    homes,
    reach: s.wider ? s.widerBy : 1,
    cap,
    timeCap,
    gapLimits,
    base,
    rhythm,
    ensureOffset,
    nearestHome,
    endsInRoll: config.roll !== null && phrase[phrase.length - 1].roll === true,
  };
}

/** Velocity of note k of `count` — today's arch, or `followDynamics`'. */
function velocities(w: Work) {
  const V = w.config.velocity;
  const follow = w.s.followDynamics;
  const D = DYNAMICS_FOLLOW;
  const v0 = follow
    ? clamp(mean(w.phrase.slice(-D.lastNotes).map((p) => p.velocity)), D.min, D.max)
    : clamp(mean(w.phrase.map((p) => p.velocity)) * V.meanFactor, V.min, V.max);
  const archBase = follow ? D.archBase : V.archBase;
  const archSpan = follow ? D.archSpan : V.archSpan;
  const lo = follow ? D.clampMin : V.clampMin;
  const hi = follow ? D.clampMax : V.clampMax;
  return (k: number, count: number, accent = 1) => {
    const arch = Math.sin((Math.PI * (k + 0.5)) / count); // a little louder in the middle, softer at the end
    const last = k === count - 1;
    return clamp(v0 * accent * (archBase + archSpan * arch) + w.rnd(-V.jitter, V.jitter), lo, hi) * (last ? V.lastFactor : 1);
  };
}

/* ═══ today's answer, with hooks ═══════════════════════════════════════════ */

function base(w: Work): AnswerNote[] {
  const { config, random, rnd, pick, degs, fold, steps, pool, lo, hi, centre, span, homes, s } = w;
  const maxLen = w.cap;
  const L = config.length;
  const kinds = s.noTiny ? (['medium', 'long'] as const) : LENGTH_KINDS;
  const lengthFor = () => {
    if (maxLen <= L.shortUpTo) return s.noTiny ? maxLen : 1 + Math.floor(random() * maxLen); // played briefly: a brief answer
    const kind = pick(kinds);
    if (kind === 'short') return Math.min(maxLen, L.short[0] + Math.floor(random() * (L.short[1] - L.short[0] + 1)));
    if (kind === 'medium') return clamp(Math.round(maxLen * rnd(L.medium[0], L.medium[1])), MIN_PHRASE_ANSWER, maxLen);
    return clamp(Math.round(maxLen * rnd(L.long[0], L.long[1])), MIN_PHRASE_ANSWER, maxLen);
  };
  let len = lengthFor();
  for (let k = 0; k < L.avoidRepeatTries && len === w.ctx.previousLength && maxLen > 1; k += 1) len = lengthFor();
  /* `noTiny`: a medium answer to four or five notes would still be two or three. */
  if (s.noTiny) len = Math.max(len, Math.min(NO_TINY_MIN, maxLen));

  const isCopy = (a: number[]) => {
    const iv = a.slice(1).map((d, k) => d - a[k]);
    if (a.length === degs.length && iv.join() === steps.join()) return true;
    for (let k = 0; k + 2 < a.length; k += 1) {
      const tri = a.slice(k, k + 3).join();
      for (let j = 0; j + 2 < degs.length; j += 1) if (degs.slice(j, j + 3).join() === tri) return true;
    }
    return false;
  };

  let notes: number[] | null = null;
  if (len === 1) {
    const near = Math.min(...homes.map((h) => Math.abs(h - centre)));
    const opts = homes.filter((h) => Math.abs(h - centre) <= near + 2 && h !== degs[degs.length - 1]);
    notes = [pick(opts.length ? opts : homes)];
  }
  const M = config.motif;
  /* `wider`: start and wander further from their register. Today: span/2 and 1. */
  const spread = span / 2 + (w.reach - 1);
  for (let tries = 0; tries < M.tries && !notes; tries += 1) {
    let motif: number[] = [];
    if (steps.length) {
      const k = Math.min(steps.length, pick(M.sizes));
      const s0 = Math.floor(random() * (steps.length - k + 1));
      const tf = pick(M.transforms);
      motif = steps.slice(s0, s0 + k);
      if (tf !== 'retro') motif = motif.map((v) => -v);
      if (tf !== 'inv') motif = motif.reverse();
    }
    let d = fold(Math.round(centre + rnd(-spread, spread)));
    if (d === degs[0]) d = fold(d + pick(STEP_DIRECTIONS));
    const a = [d];
    for (const v of motif) {
      if (a.length >= len - 1) break;
      d = fold(d + v);
      a.push(d);
    }
    while (a.length < len - 1) {
      let dir = random() < 0.5 ? -1 : 1;
      if (d >= hi + w.reach) dir = -1;
      else if (d <= lo - w.reach) dir = 1;
      d = fold(d + dir * pick(pool));
      a.push(d);
    }
    const near = Math.min(...homes.map((h) => Math.abs(h - d)));
    a.push(pick(homes.filter((h) => Math.abs(h - d) === near)));
    if (!isCopy(a) || tries === M.tries - 1) notes = a;
  }
  const chosen = notes ?? [homes[0]];

  const G = config.gaps;
  w.ensureOffset(); // today draws it here, before the gaps, whatever the length
  const ds = chosen.map((_, k) => (k === 0 ? 0 : w.rhythm(k - 1) * (k === chosen.length - 1 ? G.lastFactor : 1)));
  const total = ds.reduce((sum, v) => sum + v, 0);
  const squeeze = total > w.timeCap && total > 0 ? w.timeCap / total : 1;
  const velocity = velocities(w);
  let t = 0;
  return chosen.map((degree, k) => {
    t += ds[k] * squeeze;
    const last = k === chosen.length - 1;
    return { degree, t, velocity: velocity(k, chosen.length), roll: last && w.endsInRoll };
  });
}

/* ═══ the eight shapes ═════════════════════════════════════════════════════ */

/** The run of `plan`'s gaps, squeezed into the time cap; ends in a roll when theirs did. */
function render(w: Work, plan: PlanNote[]): AnswerNote[] {
  const total = plan.reduce((sum, p) => sum + p.gap, 0);
  const squeeze = total > w.timeCap && total > 0 ? w.timeCap / total : 1;
  const velocity = velocities(w);
  let t = 0;
  return plan.map((p, k) => {
    t += p.gap * squeeze;
    const last = k === plan.length - 1;
    return {
      degree: clamp(Math.round(p.degree), 0, w.n - 1),
      t,
      velocity: velocity(k, plan.length, p.accent ?? 1),
      roll: last && w.endsInRoll,
    };
  });
}

/**
 * At most `cap` notes, ending at home: a home appended when there is room,
 * otherwise the last note becomes one. `stretch` breathes out the last gap.
 */
function finish(w: Work, plan: PlanNote[], stretch = true): PlanNote[] {
  const out = plan.slice(0, w.cap).map((p) => ({ ...p }));
  const last = out[out.length - 1];
  const lastFactor = w.config.gaps.lastFactor;
  if (!w.homes.includes(last.degree)) {
    if (out.length < w.cap) {
      out.push({ degree: w.nearestHome(last.degree), gap: w.rhythm(out.length - 1) * lastFactor, accent: (last.accent ?? 1) * 0.95 });
      return out;
    }
    last.degree = w.nearestHome(last.degree);
  }
  if (stretch && out.length > 1) last.gap *= lastFactor;
  return out;
}

/** Their gaps g[from … from+count-1], loosened like today's, inside the gap limits. */
function theirGaps(w: Work, from: number, count: number): number[] {
  const G = w.config.gaps;
  return Array.from({ length: count }, (_, k) => {
    const gap = w.g[from + k] ?? w.base;
    return clamp(gap * w.rnd(G.jitter[0], G.jitter[1]), w.gapLimits.minMs, w.gapLimits.maxMs);
  });
}

/** Shift a contour into [0, n-1] whole, keeping its shape; fold only if it is wider than the instrument. */
function fit(w: Work, ds: number[]): number[] {
  const lo = Math.min(...ds);
  const hi = Math.max(...ds);
  if (hi - lo > w.n - 1) return ds.map(w.fold);
  const shift = lo < 0 ? -lo : hi > w.n - 1 ? w.n - 1 - hi : 0;
  return ds.map((d) => d + shift);
}

type Shape = (w: Work) => { plan: PlanNote[]; stretch?: boolean; fromRound?: number } | null;

/** Their last notes, a step or two away, softer and fading — the echo of a room. */
const echo: Shape = (w) => {
  if (w.degs.length < 2 || w.cap < 2) return null;
  const k = Math.min(4, w.degs.length, w.cap);
  const tail = w.degs.slice(-k);
  const gaps = theirGaps(w, w.g.length - (k - 1), k - 1);
  const shifts = [1, -1, 2, -2].filter((sh) => tail.every((d) => d + sh >= 0 && d + sh <= w.n - 1));
  const sh = shifts.length ? w.pick(shifts) : w.pick([1, -1]);
  const plan = tail.map((d, i) => ({ degree: w.fold(d + sh), gap: i === 0 ? 0 : gaps[i - 1], accent: 0.8 - 0.06 * i }));
  return { plan };
};

/** Their opening, exactly; then another way, against their direction, home. */
const frage: Shape = (w) => {
  if (w.degs.length < 3 || w.cap < 4) return null;
  const q = Math.min(3, w.degs.length - 1, w.cap - 2);
  const target = clamp(Math.round(Math.max(w.degs.length, w.cap * w.rnd(0.7, 1))), q + 2, w.cap);
  const theirs = w.degs.slice(q - 1).join();
  const net = w.degs[w.degs.length - 1] - w.degs[q - 1];
  const prefer = net === 0 ? w.pick([-1, 1]) : -Math.sign(net);
  let a: number[] = [];
  for (let tries = 0; tries < 8; tries += 1) {
    a = w.degs.slice(0, q);
    let d = a[q - 1];
    while (a.length < target - 1) {
      let dir = w.random() < 0.7 ? prefer : -prefer;
      if (d >= w.hi + w.reach) dir = -1;
      else if (d <= w.lo - w.reach) dir = 1;
      d = w.fold(d + dir * w.pick(w.pool));
      a.push(d);
    }
    a.push(w.nearestHome(d));
    if (a.slice(q - 1).join() !== theirs) break;
  }
  const quoted = theirGaps(w, 0, q - 1);
  const plan = a.map((degree, k) => ({
    degree,
    gap: k === 0 ? 0 : k < q ? quoted[k - 1] : w.rhythm(k - 1),
    accent: k < q ? 1 : 1.05 - (0.15 * (k - q)) / Math.max(1, a.length - q),
  }));
  return { plan };
};

/** The window of `size` notes with the widest range (ties at random), or null when flat. */
function widestWindow(w: Work, size: number): number | null {
  let best = -1;
  let at: number[] = [];
  for (let i = 0; i + size <= w.degs.length; i += 1) {
    const win = w.degs.slice(i, i + size);
    const range = Math.max(...win) - Math.min(...win);
    if (range === 0) continue;
    if (range > best) {
      best = range;
      at = [i];
    } else if (range === best) at.push(i);
  }
  return at.length ? w.pick(at) : null;
}

/** A motif of theirs, two to four times, a degree higher (or lower) each time. */
const sequenz: Shape = (w) => {
  if (w.degs.length < 2) return null;
  let size = w.degs.length >= 3 && w.cap >= 7 ? 3 : 2;
  let at = widestWindow(w, size);
  if (at === null && size === 3) {
    size = 2;
    at = widestWindow(w, 2);
  }
  if (at === null || w.cap < 2 * size + 1) return null;
  const rel = w.degs.slice(at, at + size).map((d) => d - w.degs[at]);
  const motifGaps = theirGaps(w, at, size - 1);
  const breath = mean(motifGaps.length ? motifGaps : [w.base]) * 1.3;
  const minP = Math.min(...rel);
  const maxP = Math.max(...rel);
  const dirs = w.centre <= (w.n - 1) / 2 ? [1, -1] : [-1, 1]; // toward the room there is
  for (let reps = Math.min(4, Math.floor((w.cap - 1) / size)); reps >= 2; reps -= 1) {
    for (const dir of dirs) {
      const lowest = -minP - Math.min(0, dir * (reps - 1));
      const highest = w.n - 1 - maxP - Math.max(0, dir * (reps - 1));
      if (lowest > highest) continue;
      const start = clamp(Math.round(w.centre - (minP + maxP) / 2), lowest, highest);
      const plan: PlanNote[] = [];
      for (let r = 0; r < reps; r += 1) {
        rel.forEach((p, i) => {
          plan.push({
            degree: start + dir * r + p,
            gap: plan.length === 0 ? 0 : i === 0 ? breath : motifGaps[i - 1],
            accent: dir > 0 ? 0.85 + 0.1 * r : 1.1 - 0.08 * r, // climbing grows, falling calms
          });
        });
      }
      return { plan };
    }
  }
  return null;
};

/** Their melody mirrored on its first note, in their rhythm. */
const spiegel: Shape = (w) => {
  if (w.degs.length < 3 || w.cap < 3 || !w.steps.some((v) => v !== 0)) return null;
  const k = Math.min(w.degs.length, w.cap);
  const win = w.degs.slice(-k);
  const mirrored = fit(w, win.map((d) => 2 * win[0] - d));
  const gaps = theirGaps(w, w.g.length - (k - 1), k - 1);
  return { plan: mirrored.map((degree, i) => ({ degree, gap: i === 0 ? 0 : gaps[i - 1] })) };
};

/** A motif from an earlier round, placed in their register now, then home. */
const erinnerung: Shape = (w) => {
  if (!w.ctx.memory.length || w.cap < 4) return null;
  const m = w.pick(w.ctx.memory);
  const rel = [0];
  for (const v of m.steps) rel.push(rel[rel.length - 1] + v);
  const minP = Math.min(...rel);
  const maxP = Math.max(...rel);
  if (maxP - minP > w.n - 1) return null;
  const start = clamp(Math.round(w.centre - (minP + maxP) / 2), -minP, w.n - 1 - maxP);
  const G = w.config.gaps;
  const plan: PlanNote[] = rel.slice(0, w.cap - 1).map((p, i) => ({
    degree: start + p,
    gap: i === 0 ? 0 : clamp((m.gaps[i - 1] ?? w.base) * w.rnd(G.jitter[0], G.jitter[1]), w.gapLimits.minMs, w.gapLimits.maxMs),
    accent: 1.05,
  }));
  /* One step of their own toward the middle, when there is room, before home. */
  const last = plan[plan.length - 1].degree;
  if (plan.length < w.cap - 1 && !w.homes.includes(last)) {
    const dir = last > w.centre ? -1 : 1;
    plan.push({ degree: w.fold(last + dir * w.pick(w.pool)), gap: w.rhythm(plan.length - 1) });
  }
  return { plan, fromRound: m.round };
};

/** Up past their highest note, louder; back down to a low home, softer. */
const bogen: Shape = (w) => {
  if (w.cap < 4) return null;
  const length = clamp(Math.round(w.cap * w.rnd(0.75, 1)), 4, w.cap);
  const top = Math.min(w.n - 1, w.hi + 1 + Math.floor(w.random() * (w.s.wider ? w.reach : 2)));
  const lowHomes = w.homes.filter((h) => h <= top - 2);
  if (!lowHomes.length) return null;
  const end = lowHomes.reduce((best, h) => (Math.abs(h - w.lo) < Math.abs(best - w.lo) ? h : best));
  let up = Math.max(1, Math.round((length - 1) * 0.6));
  let start = Math.min(w.lo, top - 1);
  if (top - start < up) start = Math.max(0, top - up);
  up = Math.min(up, top - start);
  const down = Math.min(Math.max(1, length - 1 - up), top - end);
  if (up < 1 || down < 1) return null;
  const climb = w.base * 0.85; // pressing on
  const fall = w.base * 1.1; // letting go
  const plan: PlanNote[] = [];
  for (let k = 0; k <= up; k += 1) {
    plan.push({ degree: Math.round(start + ((top - start) * k) / up), gap: k === 0 ? 0 : climb, accent: 0.8 + (0.45 * k) / up });
  }
  for (let j = 1; j <= down; j += 1) {
    const lastOne = j === down;
    plan.push({
      degree: Math.round(top + ((end - top) * j) / down),
      gap: fall * (lastOne ? w.config.gaps.lastFactor : 1),
      accent: 1.25 - (0.45 * j) / down,
    });
  }
  return { plan, stretch: false };
};

/** Two notes rocking — their favourite and a neighbour by their favourite step — then home. */
const pendel: Shape = (w) => {
  if (w.cap < 4) return null;
  const count = new Map<number, number>();
  w.degs.forEach((d) => count.set(d, (count.get(d) ?? 0) + 1));
  let a = w.degs[w.degs.length - 1];
  for (const [d, c] of count) if (c > (count.get(a) ?? 0)) a = d;
  const sizes = new Map<number, number>();
  w.pool.forEach((v) => sizes.set(v, (sizes.get(v) ?? 0) + 1));
  let step = w.pool[0];
  for (const [v, c] of sizes) if (c > (sizes.get(step) ?? 0) || (c === sizes.get(step) && v < step)) step = v;
  const options = [a + step, a - step, a + 1, a - 1].filter((d) => d >= 0 && d <= w.n - 1 && d !== a);
  if (!options.length) return null;
  const homeFirst = options.filter((d) => w.homes.includes(d));
  const b = homeFirst.length ? homeFirst[0] : options[0];
  const length = clamp(Math.round(w.cap * w.rnd(0.7, 1)), 4, w.cap);
  const steady = clamp(w.base * 1.1, w.gapLimits.minMs, w.gapLimits.maxMs);
  const plan: PlanNote[] = [];
  for (let k = 0; k < length - 1; k += 1) {
    const slowing = k >= length - 3 ? 1 + 0.15 * (k - (length - 4)) : 1; // a little ritardando
    plan.push({ degree: k % 2 === 0 ? a : b, gap: k === 0 ? 0 : steady * slowing * w.rnd(0.97, 1.03), accent: 0.95 - (0.2 * k) / length });
  }
  return { plan };
};

/** One note in their register, a breath, then a quick run that lands on a home. */
const lauf: Shape = (w) => {
  if (w.cap < 4) return null;
  const start = w.fold(w.degs[w.degs.length - 1] + w.pick([-1, 1]));
  const far = w.homes.filter((h) => Math.abs(h - start) >= 3 && Math.abs(h - start) + 1 <= w.cap);
  const near = w.homes.filter((h) => Math.abs(h - start) >= 2 && Math.abs(h - start) + 1 <= w.cap);
  const targets = far.length ? far : near;
  if (!targets.length) return null;
  const target = w.pick(targets);
  const dir = Math.sign(target - start);
  const steps = Math.abs(target - start);
  const plan: PlanNote[] = [{ degree: start, gap: 0, accent: 0.95 }];
  for (let k = 1; k <= steps; k += 1) {
    plan.push({
      degree: start + dir * k,
      gap: k === 1 ? w.base : w.rnd(RUN_GAP[0], RUN_GAP[1]),
      accent: k === steps ? 1.1 : 0.75 + (0.3 * k) / steps,
    });
  }
  return { plan, stretch: false };
};

export const SHAPE_FUNCTIONS: Record<ShapeId, Shape> = { echo, frage, sequenz, spiegel, erinnerung, bogen, pendel, lauf };

/* ═══ the two ornaments ════════════════════════════════════════════════════ */

/** A quick neighbour, from above where there is one, before one or two notes. Returns the graces. */
function vorschlag(w: Work, notes: AnswerNote[]): AnswerNote[] {
  const room = notes.map((nt, k) => k).filter((k) => k > 0 && notes[k].t - notes[k - 1].t >= GRACE.roomMs);
  if (!room.length) return [];
  const howMany = notes.length > 5 && room.length > 1 ? 2 : 1;
  const chosen = new Set<number>();
  while (chosen.size < howMany) chosen.add(w.pick(room));
  const graces: AnswerNote[] = [...chosen].map((k) => {
    const target = notes[k];
    const above = target.degree + 1 <= w.n - 1;
    const below = target.degree - 1 >= 0;
    const degree = above && (!below || w.random() < 0.7) ? target.degree + 1 : target.degree - 1;
    return { degree, t: target.t - GRACE.beforeMs, velocity: target.velocity * GRACE.velocity, roll: false };
  });
  return graces;
}

/**
 * The melody's last note with its octave, or else its fourth below or fifth
 * above — none a chord already put there. Returns the partner.
 */
function zweiklang(w: Work, melody: AnswerNote[], taken: readonly number[]): AnswerNote | null {
  const last = melody[melody.length - 1];
  const partner = [-OCTAVE, OCTAVE, -2, 3].map((v) => last.degree + v).find((d) => d >= 0 && d <= w.n - 1 && !taken.includes(d));
  if (partner === undefined) return null;
  return { degree: partner, t: last.t, velocity: last.velocity * CHORD_VELOCITY, roll: false };
}

/* ═══ compose ══════════════════════════════════════════════════════════════ */

export function compose2(
  phrase: readonly Stroke[],
  config: AnswerConfig,
  degrees: number,
  random: Random,
  s: Settings,
  ctx: ComposeContext,
): Composed {
  if (phrase.length === 0) return { notes: [], length: 0, cap: 0, figure: 'heute', ornaments: [], chords: [] };
  const w = work(phrase, config, degrees, random, s, ctx);

  let figure: Composed['figure'] = 'heute';
  let notes: AnswerNote[] | null = null;
  let fromRound: number | undefined;
  /** Melody notes that carry a chord whatever the moments say. */
  const always: number[] = [];
  /* „Ein Akkord als Antwort“: to a very short phrase, one note at home and its chord. */
  if (chordsAt(s, 'allein') && phrase.length <= ALONE_UP_TO && random() < s.chordChance) {
    /* The home nearest their last note — among those a chord fits on, under the rules, when there is one. */
    const last = w.degs[w.degs.length - 1];
    const roomy = w.homes.filter((h) => chordFits(h, config, degrees, s));
    const near = Math.min(...(roomy.length ? roomy : w.homes).map((h) => Math.abs(h - last)));
    const degree = roomy.length ? w.pick(roomy.filter((h) => Math.abs(h - last) === near)) : w.nearestHome(last);
    notes = [{ degree, t: 0, velocity: velocities(w)(0, 1), roll: w.endsInRoll }];
    figure = 'akkord';
    always.push(0);
  }
  const checked = SHAPES.filter((id) => s.figures[id]);
  if (notes === null && checked.length && random() < s.figureShare) {
    /* In random order, the first that fits this phrase. */
    const order = [...checked];
    for (let k = order.length - 1; k > 0; k -= 1) {
      const j = Math.floor(random() * (k + 1));
      [order[k], order[j]] = [order[j], order[k]];
    }
    for (const id of order) {
      const made = SHAPE_FUNCTIONS[id](w);
      if (made === null) continue;
      notes = render(w, finish(w, made.plan, made.stretch ?? true));
      figure = id;
      fromRound = made.fromRound;
      break;
    }
  }
  notes ??= base(w);
  const length = notes.length;

  /* Chords first: a broken one may move its melody note a little later. */
  const harm = harmonise(notes, config, degrees, random, s, always);
  const melody = harm.melody;

  /* The ornaments read the melody alone — not each other's notes, not the chords'. */
  const ornaments: FigureId[] = [];
  const extra: AnswerNote[] = [];
  if (s.figures.vorschlag && random() < s.ornamentChance) {
    const graces = vorschlag(w, melody);
    if (graces.length) {
      extra.push(...graces);
      ornaments.push('vorschlag');
    }
  }
  if (s.figures.zweiklang && random() < s.ornamentChance) {
    const partner = zweiklang(w, melody, harm.under.get(melody.length - 1) ?? []);
    if (partner !== null) {
      extra.push(partner);
      ornaments.push('zweiklang');
    }
  }
  let all = [...melody, ...extra, ...harm.tones];
  if (all.length > melody.length) all = all.sort((a, b) => a.t - b.t);

  return { notes: all, length, cap: w.cap, figure, ornaments, chords: harm.kinds, fromRound };
}
