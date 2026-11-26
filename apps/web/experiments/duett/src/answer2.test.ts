/**
 * Experiment „Duett 01“: the answer with switches.
 *
 * The first block is the experiment's footing: with every switch off it IS
 * the app's answer — `compose` and `pauseMs` from engine/answer.ts, same
 * random stream, same notes. The rest holds each switch and each figure to
 * what the panel says it does, and to the promises every answer keeps: in
 * range, in order, ending at home, within the caps.
 */
import { describe, expect, it, vi } from 'vitest';
import { compose, pauseMs } from '../../../src/instruments/engine/answer';
import { fakeTime, seeded } from '../../../src/instruments/engine/testing';
import type { AnswerConfig, Stroke, Voice } from '../../../src/instruments/types';
import { ABSOLUTE_MIN_MS, compose2, endingOf, GRACE, motifOf, NO_TINY_MIN, OCTAVE, pause2, RUN_GAP } from './answer2';
import type { ComposeContext, Motif } from './answer2';
import { COLLISION_MS, createConversation, LEARN, LIFT_RETRY_MS } from './conversation';
import { DEFINITIONS } from './instruments';
import { runState } from './run';
import { DEFAULTS, decode, encode, FIGURE_IDS, setSettings, SHAPES, START } from './settings';
import type { Settings, ShapeId } from './settings';

const DEGREES = { harp: 7, kalimba: 9, marimba: 10 } as const;
const INSTRUMENTS = Object.keys(DEGREES) as (keyof typeof DEGREES)[];
const configOf = (id: keyof typeof DEGREES): AnswerConfig => DEFINITIONS[id].answer;
const fresh = (round = 0, memory: Motif[] = []): ComposeContext => ({ previousLength: 0, round, memory });
const only = (patch: Partial<Settings>): Settings => ({ ...DEFAULTS, figures: { ...DEFAULTS.figures }, ...patch });
const withFigure = (id: ShapeId, patch: Partial<Settings> = {}): Settings =>
  only({ ...patch, figures: { ...DEFAULTS.figures, [id]: true } });

/** A phrase as a person might play it: 1–12 notes, gaps 80 ms … 2.5 s (answer.test.ts's). */
function phraseOf(random: () => number, degrees: number, rolls: boolean, min = 1): Stroke[] {
  const count = min + Math.floor(random() * (13 - min));
  let at = 5000;
  const out: Stroke[] = [];
  for (let k = 0; k < count; k += 1) {
    at += k === 0 ? 0 : 80 + random() * 2420;
    out.push({ degree: Math.floor(random() * degrees), velocity: 0.1 + random() * 0.9, at });
  }
  if (rolls && random() < 0.3) out[out.length - 1].roll = true;
  return out;
}
const at = (degrees: number[], gap = 400, velocity = 0.6): Stroke[] =>
  degrees.map((degree, k) => ({ degree, velocity, at: 1000 + k * gap }));
const intervals = (ds: number[]) => ds.slice(1).map((d, k) => d - ds[k]);

/* ── with every switch off, it is the app ───────────────────────────────── */

describe('every switch off = the app, note for note', () => {
  it.each(INSTRUMENTS)('%s: 400 phrases, the same answers from the same random stream', (id) => {
    const config = configOf(id);
    const phrases = seeded(5);
    const ours = seeded(99);
    const theirs = seeded(99);
    let previous = 0;
    const lengths = new Set<number>();
    for (let k = 0; k < 400; k += 1) {
      const phrase = phraseOf(phrases, DEGREES[id], config.roll !== null);
      const expected = compose(phrase, config, DEGREES[id], theirs, previous);
      const got = compose2(phrase, config, DEGREES[id], ours, DEFAULTS, { previousLength: previous, round: k, memory: [] });
      expect(got.notes).toEqual(expected);
      expect(got.figure).toBe('heute');
      previous = expected.length;
      lengths.add(expected.length);
    }
    expect(lengths.size).toBe(8); // every length from 1 to 8 was compared
  });

  it.each(INSTRUMENTS)('%s: the wait is today’s', (id) => {
    const config = configOf(id);
    const random = seeded(17);
    for (let k = 0; k < 400; k += 1) {
      const phrase = phraseOf(random, DEGREES[id], config.roll !== null);
      expect(pause2(phrase, config, DEFAULTS, 1.7)).toEqual({ ms: pauseMs(phrase, config), ending: 'neutral' });
    }
  });
});

/* ── every answer, every switch ─────────────────────────────────────────── */

const VARIANTS: Partial<Settings>[] = [
  {},
  { longer: true, timesYours: 2.5, maxNotes: 20 },
  { keepRhythm: true, followTempo: true, followDynamics: true },
  { wider: true, widerBy: 5, noTiny: true },
  { growing: true, growRounds: 4, longer: true },
];

describe.each(INSTRUMENTS)('the %s: every figure keeps the promises', (id) => {
  const config = configOf(id);
  const n = DEGREES[id];
  const homes = config.home.filter((h) => h < n);

  it.each([...SHAPES, 'alle' as const])('%s', (figure) => {
    const random = seeded(figure.length * 31 + n);
    let applied = 0;
    for (const variant of VARIANTS) {
      const s = figure === 'alle'
        ? only({ ...variant, figures: Object.fromEntries(FIGURE_IDS.map((f) => [f, true])) as Settings['figures'] })
        : withFigure(figure, variant);
      const memory = [motifOf(at([0, 2, 1, 3]), 1)!, motifOf(at([4, 3, 5, 2]), 2)!];
      for (let k = 0; k < 150; k += 1) {
        const phrase = phraseOf(random, n, config.roll !== null);
        const got = compose2(phrase, config, n, random, s, { previousLength: 0, round: k % 8, memory });
        const { notes } = got;
        if (got.figure !== 'heute') applied += 1;
        expect(notes.length).toBeGreaterThanOrEqual(1);
        expect(got.length).toBeLessThanOrEqual(got.cap);
        expect(got.cap).toBeLessThanOrEqual(s.longer ? s.maxNotes : config.maxNotes);
        expect(notes[0].t).toBeGreaterThanOrEqual(0);
        for (let j = 1; j < notes.length; j += 1) expect(notes[j].t).toBeGreaterThanOrEqual(notes[j - 1].t);
        for (const note of notes) {
          expect(Number.isInteger(note.degree)).toBe(true);
          expect(note.degree).toBeGreaterThanOrEqual(0);
          expect(note.degree).toBeLessThan(n);
          expect(note.velocity).toBeGreaterThan(0);
          expect(note.velocity).toBeLessThanOrEqual(1);
        }
        const main = got.ornaments.length ? null : notes[notes.length - 1];
        if (main) expect(homes).toContain(main.degree);
        if (!s.longer && !s.growing) {
          expect(got.length).toBeLessThanOrEqual(Math.min(phrase.length, config.maxNotes));
          const yours = phrase[phrase.length - 1].at - phrase[0].at;
          expect(notes[notes.length - 1].t).toBeLessThanOrEqual(yours + 1e-6);
        }
      }
    }
    expect(applied).toBeGreaterThan(100); // the figure really played, not only the fallback
  });
});

/* ── each figure does what its line in the panel says ──────────────────── */

describe('the figures', () => {
  const config = configOf('marimba');
  const n = DEGREES.marimba;
  const compose1 = (figure: ShapeId, phrase: Stroke[], seed: number, patch: Partial<Settings> = {}, ctx = fresh()) =>
    compose2(phrase, config, n, seeded(seed), withFigure(figure, patch), ctx);

  it('Echo: their last notes, shifted a step or two, softer', () => {
    const phrase = at([3, 4, 6, 5, 4], 300, 0.7);
    for (let seed = 1; seed < 40; seed += 1) {
      const got = compose1('echo', phrase, seed);
      expect(got.figure).toBe('echo');
      const echoed = got.notes.slice(0, 4).map((x) => x.degree);
      expect(intervals(echoed)).toEqual(intervals([4, 6, 5, 4]));
      expect([1, -1, 2, -2]).toContain(echoed[0] - 4);
    }
  });

  it('Frage und Antwort: their opening exactly, then a different continuation home', () => {
    const phrase = at([2, 3, 4, 6, 7, 6], 350);
    for (let seed = 1; seed < 40; seed += 1) {
      /* Allowed longer, so nothing squeezes the quoted rhythm into their length. */
      const got = compose1('frage', phrase, seed, { longer: true, timesYours: 2 });
      const ds = got.notes.map((x) => x.degree);
      expect(ds.slice(0, 3)).toEqual([2, 3, 4]);
      expect(ds.slice(2).join()).not.toBe([4, 6, 7, 6].join());
      /* Their two equal gaps stay equal, up to today's loosening — the time
         cap may squeeze the whole answer, never one gap against another. */
      const ratio = (got.notes[2].t - got.notes[1].t) / got.notes[1].t;
      expect(ratio).toBeGreaterThanOrEqual(0.92 / 1.15 - 1e-6);
      expect(ratio).toBeLessThanOrEqual(1.15 / 0.92 + 1e-6);
    }
  });

  it('Sequenz: one motif of theirs, two to four times, a degree apart', () => {
    const phrase = at([4, 5, 7, 6, 4, 5, 3, 4], 300);
    for (let seed = 1; seed < 40; seed += 1) {
      const got = compose1('sequenz', phrase, seed);
      expect(got.figure).toBe('sequenz');
      const ds = got.notes.map((x) => x.degree);
      const size = 3; // the cap (8) allows a three-note motif
      const reps = Math.floor(ds.length / size); // the home after them may be the last repetition's own note
      expect(reps).toBeGreaterThanOrEqual(2);
      const first = ds.slice(0, size);
      for (let r = 1; r < reps; r += 1) {
        const rep = ds.slice(r * size, r * size + size);
        expect(intervals(rep)).toEqual(intervals(first));
        expect(Math.abs(rep[0] - ds[(r - 1) * size])).toBe(1);
      }
    }
  });

  it('Spiegel: their intervals turned upside down, in their rhythm', () => {
    const phrase = at([3, 5, 4, 6], 320);
    for (let seed = 1; seed < 40; seed += 1) {
      const got = compose1('spiegel', phrase, seed);
      const ds = got.notes.map((x) => x.degree);
      expect(intervals(ds.slice(0, 3))).toEqual([-2, 1]);
    }
  });

  it('Erinnerung: an earlier round’s motif, or today’s answer when nothing is remembered', () => {
    const phrase = at([1, 2, 3, 2], 400);
    expect(compose1('erinnerung', phrase, 3).figure).toBe('heute');
    const memory = [motifOf(at([5, 8, 6, 7]), 2)!];
    expect(memory[0].steps).toEqual([3, -2, 1]);
    for (let seed = 1; seed < 30; seed += 1) {
      const got = compose1('erinnerung', phrase, seed, { longer: true, timesYours: 2 }, fresh(3, memory));
      expect(got.figure).toBe('erinnerung');
      expect(got.fromRound).toBe(2);
      expect(intervals(got.notes.slice(0, 4).map((x) => x.degree))).toEqual([3, -2, 1]);
    }
  });

  it('Bogen: climbs past their highest note, louder, and comes down to a home, softer', () => {
    const phrase = at([2, 3, 4, 3, 2, 3], 400, 0.6);
    for (let seed = 1; seed < 40; seed += 1) {
      const got = compose1('bogen', phrase, seed);
      const ds = got.notes.map((x) => x.degree);
      const peak = ds.indexOf(Math.max(...ds));
      expect(Math.max(...ds)).toBeGreaterThan(4);
      expect(peak).toBeGreaterThan(0);
      expect(peak).toBeLessThan(ds.length - 1);
      expect(config.home).toContain(ds[ds.length - 1]);
    }
  });

  it('Pendel: two notes rocking, then home', () => {
    const phrase = at([4, 5, 4, 5, 4, 3], 400);
    for (let seed = 1; seed < 40; seed += 1) {
      const ds = compose1('pendel', phrase, seed).notes.map((x) => x.degree);
      const body = ds.slice(0, -1);
      expect(new Set(body).size).toBe(2);
      for (let k = 2; k < body.length; k += 1) expect(body[k]).toBe(body[k - 2]);
    }
  });

  it('Lauf: a breath, then a run of neighbouring notes, fast, landing on a home', () => {
    const phrase = at([4, 3, 4, 6, 5, 4, 3, 4], 400);
    for (let seed = 1; seed < 40; seed += 1) {
      const got = compose1('lauf', phrase, seed);
      const ds = got.notes.map((x) => x.degree);
      const steps = intervals(ds);
      expect(new Set(steps.map(Math.abs))).toEqual(new Set([1]));
      expect(new Set(steps.map(Math.sign)).size).toBe(1);
      for (let k = 2; k < got.notes.length; k += 1) {
        expect(got.notes[k].t - got.notes[k - 1].t).toBeLessThanOrEqual(RUN_GAP[1] + 1e-6);
      }
      expect(config.home).toContain(ds[ds.length - 1]);
    }
  });

  it('Vorschlag: a neighbour 70 ms before a note of the answer', () => {
    const s = only({ figures: { ...DEFAULTS.figures, vorschlag: true }, ornamentChance: 1 });
    for (let seed = 1; seed < 40; seed += 1) {
      const got = compose2(at([1, 3, 5, 4, 2, 3, 5, 6], 500), config, n, seeded(seed), s, fresh());
      expect(got.ornaments).toContain('vorschlag');
      const graces = got.notes.filter((g) => got.notes.some((x) => Math.abs(x.t - g.t - GRACE.beforeMs) < 1e-6 && Math.abs(x.degree - g.degree) === 1));
      expect(graces.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('Zweiklang: the last note sounds with its octave, fourth below or fifth above', () => {
    const s = only({ figures: { ...DEFAULTS.figures, zweiklang: true }, ornamentChance: 1 });
    for (let seed = 1; seed < 40; seed += 1) {
      const got = compose2(at([1, 3, 5, 4, 2], 500), config, n, seeded(seed), s, fresh());
      const lastT = got.notes[got.notes.length - 1].t;
      const together = got.notes.filter((x) => x.t === lastT).map((x) => x.degree);
      expect(together).toHaveLength(2);
      expect([OCTAVE, 2, 3]).toContain(Math.abs(together[0] - together[1]));
    }
  });

  it('a figure share of 0 plays today’s answer', () => {
    for (let seed = 1; seed < 20; seed += 1) {
      expect(compose1('bogen', at([1, 3, 5, 4, 2, 3]), seed, { figureShare: 0 }).figure).toBe('heute');
    }
  });
});

/* ── the length switches ────────────────────────────────────────────────── */

describe('längere Antworten', () => {
  const config = configOf('harp');
  const n = DEGREES.harp;

  it('Darf länger spielen: longer than the phrase, up to the cap, also in time', () => {
    const random = seeded(4);
    const s = only({ longer: true, timesYours: 2, maxNotes: 14 });
    let longer = 0;
    for (let k = 0; k < 400; k += 1) {
      const phrase = phraseOf(random, n, false);
      const got = compose2(phrase, config, n, random, s, fresh());
      expect(got.length).toBeLessThanOrEqual(Math.min(14, Math.round(phrase.length * 2)));
      const yours = phrase[phrase.length - 1].at - phrase[0].at;
      if (yours > 0) expect(got.notes[got.notes.length - 1].t).toBeLessThanOrEqual(yours * 2 + 1e-6);
      if (got.length > phrase.length) longer += 1;
    }
    expect(longer).toBeGreaterThan(80);
  });

  it('one note, allowed longer, is not squeezed into a chord', () => {
    const got = compose2(at([3]), config, n, seeded(1), only({ longer: true, timesYours: 3, noTiny: true }), fresh());
    expect(got.length).toBe(3);
    expect(got.notes[2].t).toBeGreaterThan(got.notes[1].t);
  });

  it('Kommt in Fahrt: half the length at first, all of it after the rounds', () => {
    const s = only({ growing: true, growRounds: 4 });
    const phrase = at([1, 2, 3, 4, 5, 4, 3, 2], 300);
    expect(compose2(phrase, config, n, seeded(1), s, fresh(0)).cap).toBe(4);
    expect(compose2(phrase, config, n, seeded(1), s, fresh(2)).cap).toBe(6);
    expect(compose2(phrase, config, n, seeded(1), s, fresh(9)).cap).toBe(8);
  });

  it('Keine Mini-Antworten: at least four notes to a phrase of four or more', () => {
    const random = seeded(8);
    for (let k = 0; k < 400; k += 1) {
      const phrase = phraseOf(random, n, false, 4);
      expect(compose2(phrase, config, n, random, only({ noTiny: true }), fresh()).length).toBeGreaterThanOrEqual(NO_TINY_MIN);
    }
  });

  it('Größerer Tonraum: leaves their register further than today', () => {
    /* The marimba: ten bars, room on both sides of 4–5. */
    const marimba = configOf('marimba');
    const phrase = at([4, 5, 4, 5, 4, 5, 4, 5], 300);
    const outside = (s: Settings) => {
      const random = seeded(12);
      const away: number[] = [];
      for (let k = 0; k < 300; k += 1) {
        for (const x of compose2(phrase, marimba, 10, random, s, fresh()).notes) away.push(Math.max(0, 4 - x.degree, x.degree - 5));
      }
      return away.reduce((a, b) => a + b, 0) / away.length;
    };
    expect(outside(only({ wider: true, widerBy: 5 }))).toBeGreaterThan(outside(DEFAULTS) * 1.3);
  });
});

/* ── the wait ───────────────────────────────────────────────────────────── */

describe('einsteigen', () => {
  const config = configOf('kalimba');

  it('Schneller einsteigen: the floor and the patience, never sooner than their longest pause', () => {
    const s = only({ faster: true, minMs: 1000, patience: 0.7 });
    expect(pause2(at([1, 2, 3, 2], 400), config, s).ms).toBe(1000); // today 1800
    expect(pause2(at([1, 2, 3, 2], 1000), config, s).ms).toBe(1750); // 2.5 × 0.7 × 1000; today 2500
    const ragged = [1000, 1400, 3200, 3600].map((t, k) => ({ degree: k, velocity: 0.6, at: t }));
    expect(pause2(ragged, config, s).ms).toBeGreaterThanOrEqual(1800); // their 1.8 s pause
  });

  it('Phrasenende hören: finished sooner, mid-run later', () => {
    const closed: Stroke[] = [...at([5, 4, 3], 300, 0.7), { degree: 2, velocity: 0.4, at: 1000 + 2 * 300 + 500 }];
    const open = at([6, 1, 6, 3, 8, 1], 300).map((x, k) => (k === 5 ? { ...x, at: x.at - 120 } : x));
    expect(endingOf(closed, config)).toBe('closed');
    expect(endingOf(open, config)).toBe('open');
    const s = only({ phraseEnd: true });
    expect(pause2(closed, config, s).ms).toBeLessThan(pauseMs(closed, config));
    expect(pause2(open, config, s).ms).toBeGreaterThan(pauseMs(open, config));
    expect(pause2(closed, config, only({ phraseEnd: true, faster: true, minMs: 400, patience: 0.4 })).ms).toBeGreaterThanOrEqual(ABSOLUTE_MIN_MS);
  });

  it('Lernt mit: the learned factor multiplies the wait', () => {
    const phrase = at([1, 2, 3], 300);
    expect(pause2(phrase, config, only({ learn: true }), 0.5).ms).toBe(900);
    expect(pause2(phrase, config, only({ learn: true }), 2).ms).toBe(3600);
  });
});

/* ── the conversation ───────────────────────────────────────────────────── */

function conversation(id: keyof typeof DEGREES, patch: Partial<Settings>, isHolding: () => boolean = () => false) {
  setSettings(only(patch));
  const time = fakeTime();
  const played: Stroke[] = [];
  const onAnswered = vi.fn();
  const c = createConversation({
    config: configOf(id),
    degrees: () => DEGREES[id],
    now: time.now,
    timers: time.timers,
    random: seeded(11),
    isHolding,
    enabled: () => true,
    play: (stroke) => {
      played.push(stroke);
      return { fade: vi.fn() } as Voice;
    },
    onAnswered,
  });
  const play = (notes: number[], gap = 300) => {
    notes.forEach((degree, k) => {
      if (k > 0) time.advance(gap);
      c.heard({ degree, velocity: 0.6, at: time.now() });
    });
  };
  return { c, time, played, onAnswered, play };
}

describe('the conversation with switches', () => {
  it('with every switch off it answers when today’s does', () => {
    const d = conversation('kalimba', {});
    d.play([0, 2, 4, 6, 8, 7, 5, 3], 400);
    d.time.advance(1799);
    expect(d.onAnswered).not.toHaveBeenCalled();
    d.time.advance(1);
    expect(d.onAnswered).toHaveBeenCalledTimes(1);
  });

  it('Sofort beim Loslassen: answers within 30 ms of the finger lifting', () => {
    let holding = true;
    const d = conversation('harp', { onLift: true }, () => holding);
    d.play([1, 3, 2]);
    d.time.advance(3000);
    expect(d.onAnswered).not.toHaveBeenCalled();
    holding = false;
    d.time.advance(LIFT_RETRY_MS);
    expect(d.onAnswered).toHaveBeenCalledTimes(1);
  });

  it('Lernt mit: playing into Musie’s first moment makes the next wait longer, a clean turn shorter', () => {
    const d = conversation('harp', { learn: true });
    d.play([1, 3, 2, 4]);
    d.time.advance(1800); // the answer starts
    d.time.advance(COLLISION_MS - 100);
    d.play([2]); // into it
    expect(runState().learn).toBeCloseTo(LEARN.up);
    expect(runState().entries[0].turn).toMatchObject({ collision: true, interrupted: true });
    d.play([3, 1]);
    d.time.advance(Math.round(1800 * LEARN.up) - 1);
    expect(d.onAnswered).toHaveBeenCalledTimes(1);
    d.time.advance(1);
    expect(d.onAnswered).toHaveBeenCalledTimes(2);
    d.time.advance(8000); // the answer is over long since
    d.play([4]);
    expect(runState().learn).toBeCloseTo(LEARN.up * LEARN.down);
    expect(runState().entries[0].turn).toMatchObject({ collision: false, interrupted: false });
  });

  it('remembers a motif per round, and Erinnerung brings back an earlier one', () => {
    const d = conversation('marimba', { figures: { ...DEFAULTS.figures, erinnerung: true }, longer: true, timesYours: 2 });
    d.play([2, 6, 3, 5]);
    d.time.advance(10_000);
    expect(runState().memory).toHaveLength(1);
    expect(runState().entries[0].figure).toBe('heute'); // nothing remembered before the first answer
    d.play([4, 5, 4, 3, 4]);
    d.time.advance(10_000);
    expect(runState().entries[0]).toMatchObject({ figure: 'erinnerung', fromRound: 1 });
    expect(runState().round).toBe(2);
  });
});

describe('the address', () => {
  it('carries only what differs from today, and reads back the same', () => {
    expect(encode(DEFAULTS)).toBe('');
    const s = only({ instrument: 'kalimba', faster: true, minMs: 900, longer: true, figures: { ...DEFAULTS.figures, bogen: true, zweiklang: true } });
    expect(encode(s)).toBe('i=kalimba&on=faster,longer&minMs=900&fig=bogen,zweiklang');
    expect(decode(`#${encode(s)}`)).toEqual(s);
    expect(decode('#minMs=99999&i=piano').minMs).toBe(1800);
  });

  it('starts at the link Ben sent on 2026-11-26, and today keeps an address of its own', () => {
    const link =
      'on=faster,followTempo,longer,growing,noTiny,wider&timesYours=3&maxNotes=9&growRounds=4&fig=frage,sequenz,spiegel,erinnerung,bogen,pendel';
    expect(encode(START)).toBe(link);
    expect(decode(`#${link}`)).toEqual(START);
    expect(decode('#heute')).toEqual(DEFAULTS);
  });
});
