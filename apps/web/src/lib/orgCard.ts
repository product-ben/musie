/**
 * WHAT THE CARD SHOWS — one pure function per thing it can draw.
 *
 * The map answers "where" and "how are they"; the card answers "on what
 * evidence". Each metric asks for something different, so there is no single
 * card shape — there are five, and this file supplies the numbers for all of
 * them without knowing how any of them look.
 *
 * Pure and in `lib/` for the usual reason: `vitest.config.ts` runs
 * `src/**\/*.test.ts` in a node environment with no jsdom.
 *
 * ── EVERY FIGURE IS WEIGHTED BY PEOPLE, NOT BY PODS ───────────────────────
 * A department's median is the median its PEOPLE experience, so Support's
 * nineteen weigh more than Renewals' five. Taking a mean of pod medians would
 * let two small pods outvote one large one, which is the same mistake the
 * headcount model refuses everywhere else.
 */
import { EXERCISES, FEELING_WORDS, MOOD_MIXES, PODS } from './orgFixture';
import type { DepartmentId, DimensionId, MetricId, Pod, Valence } from './orgFixture';
import { COMPANY_NODE, DEPARTMENT_NODES, podTotal, scoreOf } from './orgModel';

/** How many of a node's people sit in a given pod. */
function peopleOf(nodeId: string, pod: Pod): number {
  if (nodeId === COMPANY_NODE.id) return podTotal(pod);
  if (DEPARTMENT_NODES.some((node) => node.id === nodeId)) {
    return pod.members[nodeId as DepartmentId] ?? 0;
  }
  return pod.id === nodeId ? podTotal(pod) : 0;
}

/** The pods a node is made of, with the weight each carries for it. */
function weightsFor(nodeId: string): { pod: Pod; people: number }[] {
  return PODS
    .map((pod) => ({ pod, people: peopleOf(nodeId, pod) }))
    .filter((entry) => entry.people > 0);
}

function weightedMean(
  parts: { pod: Pod; people: number }[],
  pick: (pod: Pod) => number,
): number {
  const people = parts.reduce((total, part) => total + part.people, 0);
  if (people === 0) return 0;
  return parts.reduce((total, part) => total + pick(part.pod) * part.people, 0) / people;
}

/* ═══ MENTAL HEALTH BREAKS ══════════════════════════════════════════════════ */

export interface BreaksCard {
  /** Musie Moments a day, median. Zero is a measured zero. */
  perDay: number;
  /** The change on last month, signed. */
  delta: number;
  /** True when NOBODY in this group takes them — a reading, not a gap. */
  silent: boolean;
}

/**
 * ── THE MEDIAN IS TAKEN OVER THE PODS THAT TAKE THEM ─────────────────────
 * A pod on zero is excluded from the average and reported separately, because
 * folding it in would answer a different question: "how often does a Northwind
 * person take a Musie Moment" rather than "how often does somebody who uses
 * Musie take one". The second is the one the card is asking, and the first is
 * already on the map as the colour.
 */
export function breaksCard(nodeId: string): BreaksCard {
  const parts = weightsFor(nodeId).filter((part) => part.pod.breaksPerDay > 0);
  if (parts.length === 0) return { perDay: 0, delta: 0, silent: true };
  return {
    perDay: round1(weightedMean(parts, (pod) => pod.breaksPerDay)),
    delta: round1(weightedMean(parts, (pod) => pod.breaksDelta)),
    silent: false,
  };
}

/* ═══ THE WORD CLOUDS ═══════════════════════════════════════════════════════ */

export type CloudWhen = 'during' | 'after';

export interface CloudWord {
  id: string;
  word: string;
  valence: Valence;
  /** Share of the words people reach for, 0–100. */
  share: number;
  /** 1–4. Drives the type step; bigger is more often. */
  weight: number;
}

/** How many words a card shows. */
export const CLOUD_SIZE = 6;

/**
 * The words a group reaches for, most common first.
 *
 * ── SIX, AND IT SAYS SO ──────────────────────────────────────────────────
 * The full vocabulary is ten and the card is about three hundred pixels wide.
 * Showing all ten at a legible size is not possible, so the card shows the six
 * most common and the heading says "most common" rather than implying these
 * are all the words there were. The share is printed beside each one, because
 * four type steps cannot carry a range that runs past fifteen to one.
 */
export function cloudCard(nodeId: string, when: CloudWhen): CloudWord[] {
  const parts = weightsFor(nodeId);
  return FEELING_WORDS
    .map((entry, index) => {
      const share = weightedMean(parts, (pod) => MOOD_MIXES[pod.moodMix][when][index] ?? 0);
      return {
        id: entry.id,
        word: entry.word,
        valence: entry.valence,
        share: round1(share),
        weight: weightOf(share),
      };
    })
    .sort((a, b) => b.share - a.share || a.id.localeCompare(b.id))
    .slice(0, CLOUD_SIZE);
}

/** Share → one of four rungs. Four because the card has four type steps. */
function weightOf(share: number): number {
  if (share >= 18) return 4;
  if (share >= 12) return 3;
  if (share >= 7) return 2;
  return 1;
}

/* ═══ THE SCALES ════════════════════════════════════════════════════════════ */

export interface ScaleCard {
  /** Nought to ten. */
  value: number;
  /** Where the marker sits, as a percentage of the track. */
  position: number;
}

export function scaleCard(nodeId: string, metric: DimensionId): ScaleCard | null {
  const value = scoreOf(nodeId, metric);
  if (value === null) return null;
  return { value: round1(value), position: Math.min(Math.max(value, 0), 10) * 10 };
}

/* ═══ THE EXERCISES ═════════════════════════════════════════════════════════ */

/**
 * The three a group reaches for most, for this metric.
 *
 * ── RANKED, AND DELIBERATELY WITHOUT COUNTS ──────────────────────────────
 * "Most used" is an order, and an order is a true thing to show. A count
 * beside each one would be a number invented to look like evidence — this
 * whole fixture is invented, but there is a difference between a shape nobody
 * will read as a fact and a figure somebody might.
 *
 * WHICH THREE is deterministic rather than authored: a rotation through the
 * exercises that serve this metric, offset by the node's own name. Eighteen
 * pods times two metrics is fifty-four hand-written trios that would carry no
 * more meaning than this does, and this cannot drift out of step with a pod
 * that gets renamed.
 */
export function exercisesCard(nodeId: string, metric: MetricId): string[] {
  /* THE SPECIFIC ONES FIRST, and the general ones only to make up the number.
     Pooling them together looked right and measured wrong: with four tagged
     for a metric and four tagged `both`, a rotation through all eight gave a
     safety card and a connectedness card two of the same three, which made the
     tag decoration. */
  const specific = EXERCISES.filter((exercise) => exercise.serves === metric);
  const serving = specific.length >= 3
    ? specific
    : [...specific, ...EXERCISES.filter((exercise) => exercise.serves === 'both')];
  if (serving.length === 0) return [];
  let offset = 0;
  for (const char of nodeId) offset += char.charCodeAt(0);
  return [0, 1, 2].map((step) => serving[(offset + step) % serving.length].name);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
