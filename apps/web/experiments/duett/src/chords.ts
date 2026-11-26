/**
 * Chords: the section „Akkorde“ of experiment „Duett 01“. Which chord Musie
 * plays, and when. Today Musie never plays two notes at once (the Zweiklang
 * figure aside), so with nothing checked here nothing changes.
 *
 * ── THE SCALE ─────────────────────────────────────────────────────────────
 * All three instruments play the pentatonic d e g a h (answer2.ts). Its only
 * triads are G-Dur (g h d) and e-Moll (e g h), and a stands in neither, so the
 * Dreiklang gives a its D with a fourth instead of a third (d g a). Every
 * chord here is built from the scale's own notes, so nothing can clash.
 *
 * The pitch of a degree is read from where d sits: `config.home[0]` is d on
 * all three (harp d, kalimba d′, marimba d; chords.test.ts holds it to the
 * instruments' `homeNames`). Five degrees to the octave.
 *
 * ── THE VOICING ───────────────────────────────────────────────────────────
 * The melody note stays the melody: the chord's other notes go below it, the
 * nearest of each wanted pitch, and only above where the instrument has no
 * room below. Broken (`chordSpread`), the notes come low to high.
 *
 * Every constant marked GUESSED is a first guess, nobody has listened yet.
 */
import type { AnswerNote, Random } from '../../../src/instruments/engine/answer';
import type { AnswerConfig, Stroke } from '../../../src/instruments/types';
import { CHORD_KINDS } from './settings';
import type { ChordKind, ChordMoment, Settings } from './settings';

/** Semitones above d of the scale's five pitch classes: d e g a h. */
const PC_SEMI = [0, 2, 5, 7, 9] as const;
const D = 0;
const E = 1;
const G = 2;
const A = 3;
const H = 4;

/** GUESSED. „Auf langen Tönen“: the gap after the note is at least this × the answer's median gap, and this long. */
export const LONG_NOTE = { factor: 1.4, minMs: 350 } as const;
/** GUESSED. „Ein Akkord als Antwort“: to a phrase of at most this many notes. */
export const ALONE_UP_TO = 2;
/** GUESSED. „Unter deinem Spiel“ is softer still than an answer's chord. */
export const UNDER_SOFTER = 0.7;
/** A broken chord never takes more than this share of the gap to the next note. */
export const SPREAD_SHARE = 0.5;

const mod = (v: number, m: number) => ((v % m) + m) % m;
const median = (a: readonly number[]) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

export function checkedKinds(s: Settings): ChordKind[] {
  return CHORD_KINDS.filter((id) => s.chordKinds[id]);
}

/** A moment is live only when it is checked and some kind is too. */
export function chordsAt(s: Settings, moment: ChordMoment): boolean {
  return s.chordWhen[moment] && checkedKinds(s).length > 0;
}

/** The instrument's degrees as pitches: pitch class 0–4 (d e g a h) and semitones from the d at `config.home[0]`. */
export function pitchesOf(config: AnswerConfig, degrees: number) {
  const d0 = config.home[0] ?? 0;
  const n = Math.max(1, Math.floor(degrees));
  const pc = (k: number) => mod(k - d0, 5);
  const semi = (k: number) => 12 * Math.floor((k - d0) / 5) + PC_SEMI[pc(k)];
  const bySemi = new Map<number, number>();
  for (let k = 0; k < n; k += 1) bySemi.set(semi(k), k);
  return { n, pc, semi, bySemi };
}

type Pitches = ReturnType<typeof pitchesOf>;

/** The nearest degree below `k` with pitch class `want`, else the nearest above, else null. */
function nearestOf(p: Pitches, k: number, want: number, taken: ReadonlySet<number>): number | null {
  for (let d = k - 1; d >= 0; d -= 1) if (p.pc(d) === want && !taken.has(d)) return d;
  for (let d = k + 1; d < p.n; d += 1) if (p.pc(d) === want && !taken.has(d)) return d;
  return null;
}

/** The first of `candidates` that is on the instrument, distinct, and not the melody note. */
function firstIn(p: Pitches, k: number, candidates: number[], count: number): number[] {
  const out: number[] = [];
  for (const d of candidates) {
    if (out.length >= count) break;
    if (d >= 0 && d < p.n && d !== k && !out.includes(d)) out.push(d);
  }
  return out;
}

/** The notes of G-Dur, where a melody rests: `chordRest` puts chords only here. */
export const REST_PCS: ReadonlySet<number> = new Set([G, H, D]);

/** The pitch classes that join the melody note's, per kind of triad. `tonic`: always G-Dur where it can be. */
function triadFor(pc: number, random: Random, tonic: boolean): number[] {
  const either = (a: number[], b: number[]) => (tonic ? a : random() < 0.5 ? a : b);
  switch (pc) {
    case D: return [G, H]; // G-Dur
    case E: return [G, H]; // e-Moll
    case G: return either([H, D], [E, H]); // G-Dur or e-Moll
    case A: return [D, G]; // D with a fourth: d g a
    default: return either([G, D], [E, G]); // h: G-Dur or e-Moll
  }
}

/** The chord's other notes for melody degree `k`, as degrees, low to high. */
export function voicing(kind: ChordKind, k: number, p: Pitches, random: Random, tonic = false): number[] {
  const byPc = (pcs: number[]) => {
    const taken = new Set([k]);
    const out: number[] = [];
    for (const want of pcs) {
      const d = nearestOf(p, k, want, taken);
      if (d !== null) {
        out.push(d);
        taken.add(d);
      }
    }
    return out;
  };
  const bySemis = (offsets: number[]) => {
    for (const off of offsets) {
      const d = p.bySemi.get(p.semi(k) + off);
      if (d !== undefined) return [d];
    }
    return [];
  };
  let out: number[];
  switch (kind) {
    case 'oktave':
      out = bySemis([-12, 12]);
      break;
    case 'quinte':
      out = bySemis([-7, -5, 7, 5]); // the fifth below; on g (no c) the fourth
      break;
    case 'dreiklang':
      out = byPc(triadFor(p.pc(k), random, tonic));
      break;
    case 'vierklang':
      out = byPc(p.pc(k) === A ? [D, E, G] : [E, G, H, D].filter((pc) => pc !== p.pc(k)));
      break;
    case 'schwebend':
      out = firstIn(p, k, [k - 2, k - 4, k + 2, k + 4], 2);
      break;
    case 'schimmernd':
      out = firstIn(p, k, [k - 1, k - 2, k + 1, k + 2], 2);
      break;
  }
  return out.sort((a, b) => a - b);
}

/**
 * One of the checked kinds at random — or, where that one has no room on this
 * note (the harp's seven strings hold an octave only on d and e), the next
 * checked one that has. Null when none has.
 */
function chordOn(kinds: readonly ChordKind[], k: number, p: Pitches, random: Random, s: Settings): { kind: ChordKind; others: number[] } | null {
  const first = Math.floor(random() * kinds.length);
  for (let i = 0; i < kinds.length; i += 1) {
    const kind = kinds[(first + i) % kinds.length];
    const others = voicing(kind, k, p, random, s.chordRest);
    /* `chordBelow`: the melody note on top, the whole chord under it. */
    if (others.length && (!s.chordBelow || others.every((d) => d < k))) return { kind, others };
  }
  return null;
}

/**
 * Can a chord of a checked kind stand on degree `k`, under the rules?
 * „Ein Akkord als Antwort“ asks it to choose a home note with room under it.
 * Both triad choices are tried, so it decides without drawing at random.
 */
export function chordFits(k: number, config: AnswerConfig, degrees: number, s: Settings): boolean {
  const p = pitchesOf(config, degrees);
  if (s.chordRest && !REST_PCS.has(p.pc(k))) return false;
  return checkedKinds(s).some((kind) =>
    [() => 0, () => 0.99].some((pick) => {
      const others = voicing(kind, k, p, pick, s.chordRest);
      return others.length > 0 && (!s.chordBelow || others.every((d) => d < k));
    }),
  );
}

export interface Harmonised {
  /** The melody, a note later where a broken chord ends on it. */
  melody: AnswerNote[];
  /** The chords' other notes. */
  tones: AnswerNote[];
  /** One entry per chord, in order. */
  kinds: ChordKind[];
  /** Per melody index: the degrees its chord added. */
  under: Map<number, number[]>;
}

/** Which melody notes the checked moments ask a chord for. `always` adds indices regardless. */
function momentsOf(melody: readonly AnswerNote[], s: Settings, always: readonly number[]): number[] {
  const at = new Set(always);
  const last = melody.length - 1;
  if (s.chordWhen.jeder) melody.forEach((_, k) => at.add(k));
  if (s.chordWhen.anfang) at.add(0);
  if (s.chordWhen.schluss) at.add(last);
  if (s.chordWhen.lang && melody.length > 1) {
    const gaps = melody.slice(1).map((nt, k) => nt.t - melody[k].t);
    const m = median(gaps);
    gaps.forEach((gap, k) => {
      if (gap >= Math.max(LONG_NOTE.minMs, m * LONG_NOTE.factor)) at.add(k);
    });
  }
  return [...at].sort((a, b) => a - b);
}

/**
 * Lay chords under the melody where the moments ask for them. With nothing
 * checked it returns the melody untouched and draws no random number, so the
 * answer stays the one the rest of the switches made.
 */
export function harmonise(
  melody: readonly AnswerNote[],
  config: AnswerConfig,
  degrees: number,
  random: Random,
  s: Settings,
  always: readonly number[] = [],
): Harmonised {
  const kinds = checkedKinds(s);
  const out: Harmonised = { melody: melody.map((nt) => ({ ...nt })), tones: [], kinds: [], under: new Map() };
  if (!kinds.length || !melody.length) return out;
  const p = pitchesOf(config, degrees);
  const forced = new Set(always);
  let spots = momentsOf(melody, s, always);
  /* `chordRest`: a melody passing through e or a gets no chord. */
  if (s.chordRest) spots = spots.filter((k) => forced.has(k) || REST_PCS.has(p.pc(melody[k].degree)));

  const place = (k: number): boolean => {
    const nt = melody[k];
    const chord = chordOn(kinds, nt.degree, p, random, s);
    if (chord === null) return false;
    const { kind, others } = chord;
    out.kinds.push(kind);
    out.under.set(k, others);
    /* Broken: low to high, the melody note in its place among them. */
    const members = [...others, nt.degree].sort((a, b) => a - b);
    const room = k < melody.length - 1 ? melody[k + 1].t - nt.t : Infinity;
    const step = Math.min(s.chordSpread, (SPREAD_SHARE * room) / (members.length - 1));
    members.forEach((degree, i) => {
      const t = nt.t + i * step;
      if (degree === nt.degree) out.melody[k].t = t;
      else out.tones.push({ degree, t, velocity: nt.velocity * s.chordVolume, roll: false });
    });
    return true;
  };

  if (s.chordOne) {
    /* The strongest place first: the last note, then the one with the longest gap after it. */
    const gapAfter = (k: number) => (k < melody.length - 1 ? melody[k + 1].t - melody[k].t : Infinity);
    spots.sort((a, b) => gapAfter(b) - gapAfter(a) || b - a);
    /* „Wie oft“ asks once per answer here, not once per place. */
    if (!spots.some((k) => forced.has(k)) && random() >= s.chordChance) return out;
    for (const k of spots) if (place(k)) break;
    return out;
  }
  for (const k of spots) {
    if (!forced.has(k) && random() >= s.chordChance) continue;
    place(k);
  }
  return out;
}

/** „Unter deinem Spiel“: the chord under a note of theirs, to sound now (`t` from now). */
export function underneath(stroke: Stroke, config: AnswerConfig, degrees: number, random: Random, s: Settings): { notes: AnswerNote[]; kind: ChordKind } | null {
  const kinds = checkedKinds(s);
  const p = pitchesOf(config, degrees);
  if (!kinds.length || (s.chordRest && !REST_PCS.has(p.pc(stroke.degree))) || random() >= s.chordChance) return null;
  const chord = chordOn(kinds, stroke.degree, p, random, s);
  if (chord === null) return null;
  return {
    kind: chord.kind,
    notes: chord.others.map((degree, i) => ({ degree, t: i * s.chordSpread, velocity: stroke.velocity * s.chordVolume * UNDER_SOFTER, roll: false })),
  };
}
