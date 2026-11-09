/**
 * The answer: the marimba's algorithm, for all three instruments.
 *
 * The first block is the proof of the port — the marimba's and the harp's own
 * `compose`, cut out of the experiments' HTML and run with the same seeded
 * random stream as `compose` here, must return the same answer note for note
 * (the way shadow.test.ts holds the shadow to the harp). The rest holds the
 * promises the copy makes: never longer than you, ends at home, never in solo,
 * and a touch stops it.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { AnswerConfig, Stroke, Voice } from '../types';
import { compose, createConversation, pauseMs } from './answer';
import { fakeTime, seeded } from './testing';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const text = (path: string) => readFileSync(join(ROOT, path), 'utf8');
const json = (path: string) => JSON.parse(text(path)) as Record<string, unknown>;

function configOf(id: 'harp' | 'kalimba' | 'marimba'): AnswerConfig {
  const shared = json('supabase/content/instruments/answer.json');
  const own = json(`supabase/content/instruments/${id}.json`).answer as Record<string, unknown>;
  return { ...shared, ...own } as unknown as AnswerConfig;
}

const CONFIGS = {
  harp: { config: configOf('harp'), degrees: 7 },
  kalimba: { config: configOf('kalimba'), degrees: 9 },
  marimba: { config: configOf('marimba'), degrees: 10 },
} as const;

/** A phrase as a person might play it: 1–12 notes, gaps 80 ms … 2.5 s. */
function phraseOf(random: () => number, degrees: number, rolls: boolean): Stroke[] {
  const count = 1 + Math.floor(random() * 12);
  let at = 5000;
  const out: Stroke[] = [];
  for (let k = 0; k < count; k += 1) {
    at += k === 0 ? 0 : 80 + random() * 2420;
    out.push({ degree: Math.floor(random() * degrees), velocity: 0.1 + random() * 0.9, at });
  }
  if (rolls && random() < 0.3) out[out.length - 1].roll = true;
  return out;
}

/* ── the experiments' own compose ───────────────────────────────────────── */

type ExperimentNote = { i: number; t: number; vel: number; roll?: boolean };
type ExperimentCompose = (ph: { i: number; vel: number; t: number; roll?: boolean }[]) => ExperimentNote[];

function experimentCompose(path: string, from: string, to: string, n: number, home: number[], random: () => number): ExperimentCompose {
  const html = text(path);
  const a = html.indexOf(from);
  const b = html.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error(`${path}: compose not found`);
  const M = Object.create(Math) as Math;
  M.random = random;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const rnd = (x: number, y: number) => x + random() * (y - x);
  const pick = <T>(arr: T[]) => arr[Math.floor(random() * arr.length)];
  const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const median = (arr: number[]) => {
    const s = [...arr].sort((x, y) => x - y);
    return s[Math.floor(s.length / 2)];
  };
  const gaps = (ph: { t: number }[]) => ph.slice(1).map((p, k) => p.t - ph[k].t);
  // The experiments are our own files in this repo; that is why running them is fine.
  const make = new Function('N', 'COUNT', 'HOME', 'clamp', 'rnd', 'pick', 'mean', 'median', 'gaps', 'Math', `${html.slice(a, b)}; return compose;`);
  return make(() => n, n, home, clamp, rnd, pick, mean, median, gaps, M) as ExperimentCompose;
}

describe('compose = the experiments’ compose', () => {
  const cases = [
    { name: 'marimba', path: 'apps/web/public/experiments/marimba/261108-1740/index.html', to: 'function answerStroke', rolls: true, ...CONFIGS.marimba },
    { name: 'harp', path: 'apps/web/public/experiments/harp/261109-0920/index.html', to: 'function playAnswer', rolls: false, ...CONFIGS.harp },
  ];

  it.each(cases)('$name: 400 phrases, the same answers from the same random stream', ({ path, to, rolls, config, degrees }) => {
    const phrases = seeded(7);
    const ours = seeded(42);
    const theirs = seeded(42);
    const experiment = experimentCompose(path, 'let lastAnsLen = 0;', to, degrees, config.home, theirs);
    let previous = 0;
    const lengths = new Set<number>();
    let endedInRoll = 0;
    for (let k = 0; k < 400; k += 1) {
      const phrase = phraseOf(phrases, degrees, rolls);
      const mine = compose(phrase, config, degrees, ours, previous);
      previous = mine.length;
      const expected = experiment(phrase.map((p) => ({ i: p.degree, vel: p.velocity, t: p.at, ...(p.roll ? { roll: true } : {}) })));
      expect(mine).toEqual(expected.map((e) => ({ degree: e.i, t: e.t, velocity: e.vel, roll: e.roll === true })));
      lengths.add(mine.length);
      if (mine[mine.length - 1].roll) endedInRoll += 1;
    }
    // The comparison covered every answer length, and the marimba's roll endings.
    expect([...lengths].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    if (rolls) expect(endedInRoll).toBeGreaterThan(20);
  });
});

/* ── what the answer promises, for all three ─────────────────────────────── */

describe.each(Object.entries(CONFIGS))('the %s answers', (name, { config, degrees }) => {
  const homes = config.home.filter((h) => h < degrees);

  it('uses the right home degrees and degree count', () => {
    expect(degrees).toBe({ harp: 7, kalimba: 9, marimba: 10 }[name]);
    expect(config.home).toEqual({ harp: [0, 2, 5], kalimba: [2, 4, 7], marimba: [0, 2, 5, 7] }[name]);
    expect(config.roll === null).toBe(name !== 'marimba');
  });

  it('is never longer than the phrase, in notes or in time, and ends on a home degree', () => {
    const random = seeded(name.length * 97);
    let previous = 0;
    for (let k = 0; k < 1000; k += 1) {
      const phrase = phraseOf(random, degrees, config.roll !== null);
      const notes = compose(phrase, config, degrees, random, previous);
      previous = notes.length;
      expect(notes.length).toBeGreaterThanOrEqual(1);
      expect(notes.length).toBeLessThanOrEqual(Math.min(phrase.length, config.maxNotes));
      expect(notes[0].t).toBe(0);
      expect(notes[notes.length - 1].t).toBeLessThanOrEqual(phrase[phrase.length - 1].at - phrase[0].at + 1e-6);
      for (let j = 1; j < notes.length; j += 1) expect(notes[j].t).toBeGreaterThanOrEqual(notes[j - 1].t);
      expect(homes).toContain(notes[notes.length - 1].degree);
      for (const note of notes) {
        expect(Number.isInteger(note.degree)).toBe(true);
        expect(note.degree).toBeGreaterThanOrEqual(0);
        expect(note.degree).toBeLessThan(degrees);
        expect(note.velocity).toBeGreaterThan(0);
        expect(note.velocity).toBeLessThanOrEqual(config.velocity.clampMax);
      }
    }
  });

  it('waits 1.8 to 6 seconds for a pause', () => {
    const at = (gaps: number[]) => gaps.reduce<Stroke[]>((ph, gap) => [...ph, { degree: 1, velocity: 0.5, at: (ph[ph.length - 1]?.at ?? 0) + gap }], []);
    expect(pauseMs(at([0]), config)).toBe(1800);
    expect(pauseMs(at([0, 300, 300, 300]), config)).toBe(1800);
    expect(pauseMs(at([0, 1000, 1000, 1000]), config)).toBe(2500);
    expect(pauseMs(at([0, 400, 400, 4000]), config)).toBe(5600); // 1.4 × the longest
    expect(pauseMs(at([0, 5000, 5000]), config)).toBe(6000);
  });
});

it('the kalimba answers within its nine degrees from tine-mapped input', () => {
  const { config, degrees } = CONFIGS.kalimba;
  expect(config.pitchOrder).toEqual([4, 5, 3, 6, 2, 7, 1, 8, 0]);
  const notes = compose([0, 8, 4, 2, 6].map((degree, k) => ({ degree, velocity: 0.6, at: k * 400 })), config, degrees, seeded(3));
  for (const n of notes) expect(n.degree).toBeLessThan(9);
});

/* ── the conversation ────────────────────────────────────────────────────── */

function conversationWith(name: keyof typeof CONFIGS, overrides: { enabled?: () => boolean; isHolding?: () => boolean } = {}) {
  const { config, degrees } = CONFIGS[name];
  const time = fakeTime();
  const played: Stroke[] = [];
  const voices: { fade: ReturnType<typeof vi.fn> }[] = [];
  const onAnswered = vi.fn();
  const conversation = createConversation({
    config,
    degrees: () => degrees,
    now: time.now,
    timers: time.timers,
    random: seeded(11),
    isHolding: overrides.isHolding ?? (() => false),
    enabled: overrides.enabled ?? (() => true),
    play: (stroke) => {
      played.push(stroke);
      const voice = { fade: vi.fn() };
      voices.push(voice);
      return voice as Voice;
    },
    onAnswered,
  });
  /** The person plays `degrees`, `gap` ms apart, starting now. */
  const play = (notes: number[], gap = 300, extra: Partial<Stroke> = {}) => {
    notes.forEach((degree, k) => {
      if (k > 0) time.advance(gap);
      conversation.heard({ degree, velocity: 0.6, at: time.now(), ...extra });
    });
  };
  return { conversation, time, played, voices, onAnswered, play, config };
}

describe('the conversation', () => {
  it('answers after a pause that fits the tempo — with Musie', () => {
    const c = conversationWith('harp');
    c.play([1, 3, 2, 4]);
    c.time.advance(1799);
    expect(c.onAnswered).not.toHaveBeenCalled();
    c.time.advance(1);
    expect(c.onAnswered).toHaveBeenCalledTimes(1);
    expect(c.conversation.answering()).toBe(true);
    c.time.advance(10_000);
    const { notes } = c.onAnswered.mock.calls[0][0] as { heard: number; notes: number };
    expect(c.onAnswered.mock.calls[0][0]).toMatchObject({ heard: 4 });
    expect(c.played).toHaveLength(notes);
    expect(c.played.every((s) => s.roll === false)).toBe(true);
    expect(c.conversation.answering()).toBe(false);
  });

  it.each(['harp', 'kalimba', 'marimba'] as const)('the %s never answers in solo', (name) => {
    const c = conversationWith(name, { enabled: () => false });
    c.play([1, 3, 2, 4, 5]);
    c.time.advance(60_000);
    expect(c.onAnswered).not.toHaveBeenCalled();
    expect(c.played).toHaveLength(0);
    expect(c.time.pending()).toBe(0);
  });

  it('does not answer while the person keeps playing', () => {
    const c = conversationWith('marimba');
    c.play([1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5], 1500);
    expect(c.onAnswered).not.toHaveBeenCalled();
    expect(c.conversation.phraseLength()).toBe(c.config.phraseMemory);
  });

  it('waits while a finger still rests, and answers once it lifts', () => {
    let holding = true;
    const c = conversationWith('harp', { isHolding: () => holding });
    c.play([1, 3, 2]);
    c.time.advance(1800 + 400 * 3);
    expect(c.onAnswered).not.toHaveBeenCalled();
    holding = false;
    c.time.advance(400);
    expect(c.onAnswered).toHaveBeenCalledTimes(1);
  });

  it('a touch interrupts the answer: pending notes are dropped, sounding ones fade', () => {
    const c = conversationWith('kalimba');
    c.play([0, 2, 4, 6, 8, 7, 5, 3], 400);
    c.time.advance(1799); // 2.5 × the 400 ms median is 1000, floored at 1800
    expect(c.conversation.answering()).toBe(false);
    c.time.advance(1); // the answer starts, and its first note sounds at once
    expect(c.conversation.answering()).toBe(true);
    const soundedSoFar = c.played.length;
    expect(soundedSoFar).toBeGreaterThanOrEqual(1);
    c.conversation.heard({ degree: 1, velocity: 0.5, at: c.time.now() });
    expect(c.conversation.answering()).toBe(false);
    for (const v of c.voices) expect(v.fade).toHaveBeenCalledWith(c.config.interruptFadeTau);
    c.time.advance(1700); // less than the next pause: nothing more of the old answer
    expect(c.played).toHaveLength(soundedSoFar);
  });

  it('the marimba hears a roll as one note, waits longer, and answers with a roll', () => {
    const c = conversationWith('marimba');
    c.play([1, 3, 2]);
    c.time.advance(100);
    c.play([5, 5, 5, 5], 100, { roll: true }); // the first stroke of a roll on a new bar is a note…
    expect(c.conversation.phraseLength()).toBe(4); // …the rest of the roll is that note held
    c.time.advance(1800 + 400 - 1);
    expect(c.onAnswered).not.toHaveBeenCalled();
    c.time.advance(1);
    expect(c.onAnswered).toHaveBeenCalledTimes(1);
    c.time.advance(10_000);
    const roll = c.config.roll;
    if (roll === null) throw new Error('marimba has a roll');
    const rolled = c.played.filter((s) => s.roll === true);
    expect(rolled).toHaveLength(roll.strokes);
    rolled.forEach((s, k) => expect(s.velocity).toBeCloseTo(roll.velocity - (k + 1) * roll.step));
    expect(new Set(rolled.map((s) => s.degree)).size).toBe(1);
    // The ending's first note is a plain stroke; only the seven after it roll, 115 ms apart.
    const first = c.played[c.played.length - roll.strokes - 1];
    expect(first.roll).toBe(false);
    expect(first.degree).toBe(rolled[0].degree);
    expect(c.played.slice(-roll.strokes)).toEqual(rolled);
    rolled.forEach((s, k) => expect(s.at - first.at).toBe((k + 1) * roll.everyMs));
    expect(c.conversation.answering()).toBe(false);
  });

  it('the kalimba has no roll: roll strokes are notes like any other', () => {
    const c = conversationWith('kalimba');
    c.play([5, 5, 5, 5], 100, { roll: true });
    expect(c.conversation.phraseLength()).toBe(4);
    c.time.advance(1800);
    expect(c.onAnswered).toHaveBeenCalledTimes(1);
    c.time.advance(10_000);
    expect(c.played.some((s) => s.roll === true)).toBe(false);
  });

  it('stop forgets the phrase and the pause', () => {
    const c = conversationWith('harp');
    c.play([1, 2, 3]);
    c.conversation.stop();
    c.time.advance(60_000);
    expect(c.onAnswered).not.toHaveBeenCalled();
    expect(c.conversation.phraseLength()).toBe(0);
  });
});
