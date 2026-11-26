/**
 * The section „Akkorde“: that each kind is the chord its text names, built
 * from the scale's own notes; that each moment puts chords where its text
 * says; and that with nothing checked the answer is the one it was.
 */
import { describe, expect, it, vi } from 'vitest';
import type { AnswerNote } from '../../../src/instruments/engine/answer';
import { fakeTime, seeded } from '../../../src/instruments/engine/testing';
import type { Stroke, Voice } from '../../../src/instruments/types';
import { compose2 } from './answer2';
import { harmonise, LONG_NOTE, pitchesOf, SPREAD_SHARE, underneath, UNDER_SOFTER, voicing } from './chords';
import { createConversation, UNDER_PILL_MS } from './conversation';
import { DEFINITIONS } from './instruments';
import { runState } from './run';
import { CHORD_KINDS, CHORD_MOMENTS, decode, DEFAULTS, encode, setSettings } from './settings';
import type { ChordKind, ChordMoment, Settings } from './settings';

const DEGREES = { harp: 7, kalimba: 9, marimba: 10 } as const;
const INSTRUMENTS = Object.keys(DEGREES) as (keyof typeof DEGREES)[];
const configOf = (id: keyof typeof DEGREES) => DEFINITIONS[id].answer;

const none = <K extends string>(ids: readonly K[]) => Object.fromEntries(ids.map((id) => [id, false])) as Record<K, boolean>;
/** DEFAULTS with these moments and kinds checked. */
function chords(when: ChordMoment[], kinds: ChordKind[], patch: Partial<Settings> = {}): Settings {
  const chordWhen = none(CHORD_MOMENTS);
  when.forEach((id) => (chordWhen[id] = true));
  const chordKinds = none(CHORD_KINDS);
  kinds.forEach((id) => (chordKinds[id] = true));
  return { ...DEFAULTS, figures: { ...DEFAULTS.figures }, chordWhen, chordKinds, ...patch };
}
const at = (degrees: number[], gap = 400): Stroke[] => degrees.map((degree, k) => ({ degree, velocity: 0.6, at: 1000 + k * gap }));
const melodyOf = (degrees: number[], times: number[]): AnswerNote[] =>
  degrees.map((degree, k) => ({ degree, t: times[k], velocity: 0.6, roll: false }));

/* d e g a h as pitch classes 0–4 */
const [D, E, G, A, H] = [0, 1, 2, 3, 4];

describe('the pitch of a degree', () => {
  it.each(INSTRUMENTS)('%s: config.home[0] is d, and every home is a d or a g', (id) => {
    const config = configOf(id);
    const p = pitchesOf(config, DEGREES[id]);
    const names = (config as unknown as { homeNames: string[] }).homeNames;
    config.home.forEach((h, i) => expect(p.pc(h)).toBe(names[i].startsWith('d') ? D : G));
  });

  it('harp and marimba: the semitones are the instruments’ own MIDI notes', () => {
    const harp = pitchesOf(configOf('harp'), 7);
    const midis = (DEFINITIONS.harp.sound as { tuning: { midis: number[] } }).tuning.midis;
    midis.forEach((m, k) => expect(harp.semi(k)).toBe(m - midis[0]));
    const marimba = pitchesOf(configOf('marimba'), 10);
    const scale = (DEFINITIONS.marimba.sound as { SCALE: { midi: number }[] }).SCALE;
    scale.forEach(({ midi }, k) => expect(marimba.semi(k)).toBe(midi - scale[0].midi));
  });
});

describe('each kind is the chord its text names', () => {
  const each = (fn: (kind: ChordKind, k: number, tones: number[], p: ReturnType<typeof pitchesOf>) => void) => {
    for (const id of INSTRUMENTS) {
      const p = pitchesOf(configOf(id), DEGREES[id]);
      for (const kind of CHORD_KINDS) {
        for (let k = 0; k < p.n; k += 1) {
          for (let seed = 1; seed <= 4; seed += 1) fn(kind, k, voicing(kind, k, p, seeded(seed)), p);
        }
      }
    }
  };

  it('on the instrument, distinct, never the melody note itself, low to high', () => {
    each((kind, k, tones, p) => {
      const noOctave = k - 5 < 0 && k + 5 > p.n - 1; // the harp's g, a, h
      if (kind === 'oktave' && noOctave) expect(tones).toEqual([]);
      else expect(tones.length).toBeGreaterThan(0);
      tones.forEach((d) => {
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThan(p.n);
        expect(d).not.toBe(k);
      });
      expect(new Set(tones).size).toBe(tones.length);
      expect([...tones].sort((a, b) => a - b)).toEqual(tones);
    });
  });

  it('Oktave: the same note an octave away, below when there is room', () => {
    each((kind, k, tones, p) => {
      if (kind !== 'oktave' || (k - 5 < 0 && k + 5 > p.n - 1)) return;
      expect(tones).toHaveLength(1);
      expect(Math.abs(p.semi(tones[0]) - p.semi(k))).toBe(12);
      if (k >= 5) expect(tones[0]).toBe(k - 5);
    });
  });

  it('Quinte: a fifth below, on g a fourth; above only where nothing is below', () => {
    each((kind, k, tones, p) => {
      if (kind !== 'quinte') return;
      expect(tones).toHaveLength(1);
      const diff = p.semi(tones[0]) - p.semi(k);
      expect([-7, -5, 7, 5]).toContain(diff);
      if (p.pc(k) === G && diff < 0) expect(diff).toBe(-5);
      if (p.pc(k) !== G && p.bySemi.has(p.semi(k) - 7)) expect(diff).toBe(-7);
    });
  });

  it('Dreiklang: G-Dur or e-Moll; on a, d g a', () => {
    const G_DUR = [D, G, H].join();
    const E_MOLL = [E, G, H].join();
    const D_SUS = [D, G, A].join();
    each((kind, k, tones, p) => {
      if (kind !== 'dreiklang') return;
      expect(tones).toHaveLength(2);
      const pcs = [...new Set([k, ...tones].map(p.pc))].sort().join();
      if (p.pc(k) === A) expect(pcs).toBe(D_SUS);
      else expect([G_DUR, E_MOLL]).toContain(pcs);
    });
  });

  it('Vierklang: four notes of e g h d (on a: a d e g)', () => {
    each((kind, k, tones, p) => {
      if (kind !== 'vierklang') return;
      expect(tones).toHaveLength(3);
      const pcs = [...new Set([k, ...tones].map(p.pc))].sort().join();
      expect(pcs).toBe(p.pc(k) === A ? [D, E, G, A].join() : [D, E, G, H].join());
    });
  });

  it('Schwebend two and four steps away; Schimmernd one and two', () => {
    each((kind, k, tones) => {
      if (kind === 'schwebend') {
        expect(tones).toHaveLength(2);
        tones.forEach((d) => expect([2, 4]).toContain(Math.abs(d - k)));
      }
      if (kind === 'schimmernd') {
        expect(tones).toHaveLength(2);
        tones.forEach((d) => expect([1, 2]).toContain(Math.abs(d - k)));
      }
    });
  });

  it('Oktave on the harp’s g: another checked kind steps in', () => {
    const got = harmonise(melodyOf([2], [0]), configOf('harp'), 7, seeded(1), chords(['schluss'], ['oktave', 'quinte']));
    expect(got.kinds).toEqual(['quinte']);
  });

  it('the melody note stays on top where the instrument has room below', () => {
    const p = pitchesOf(configOf('marimba'), 10);
    for (const kind of CHORD_KINDS) {
      for (const k of [7, 8, 9]) expect(Math.max(...voicing(kind, k, p, seeded(3)))).toBeLessThan(k);
    }
  });
});

describe('nothing checked, nothing changes', () => {
  const settingsWith = [
    chords(['schluss', 'jeder', 'allein'], []), // moments without a kind
    chords([], ['dreiklang', 'quinte']), // kinds without a moment
    chords(['begleitung'], ['dreiklang']), // only under their playing: the answer itself is untouched
  ];
  it.each(INSTRUMENTS)('%s: the same answers as with the section untouched', (id) => {
    const config = configOf(id);
    for (const s of settingsWith) {
      const ours = seeded(7);
      const theirs = seeded(7);
      for (let k = 0; k < 60; k += 1) {
        const phrase = at([k % DEGREES[id], (k + 2) % DEGREES[id], (k * 3) % DEGREES[id]].slice(0, 1 + (k % 3)), 300 + (k % 5) * 200);
        const ctx = { previousLength: 0, round: k, memory: [] };
        expect(compose2(phrase, config, DEGREES[id], ours, s, ctx)).toEqual(compose2(phrase, config, DEGREES[id], theirs, DEFAULTS, ctx));
      }
    }
  });
});

describe('when chords come', () => {
  const config = configOf('marimba');
  const n = DEGREES.marimba;
  const timesOf = (notes: AnswerNote[]) => [...new Set(notes.map((x) => x.t))];

  it('Am Schluss: one chord, on the last note, and the answer keeps its length', () => {
    for (let seed = 1; seed < 30; seed += 1) {
      const got = compose2(at([1, 3, 5, 4, 2, 3]), config, n, seeded(seed), chords(['schluss'], ['dreiklang']), { previousLength: 0, round: 0, memory: [] });
      expect(got.chords).toEqual(['dreiklang']);
      const last = Math.max(...got.notes.map((x) => x.t));
      expect(got.notes.filter((x) => x.t === last)).toHaveLength(3);
      expect(timesOf(got.notes)).toHaveLength(got.length);
    }
  });

  it('Zu Beginn: on the first note', () => {
    const got = compose2(at([1, 3, 5, 4]), config, n, seeded(2), chords(['anfang'], ['quinte']), { previousLength: 0, round: 0, memory: [] });
    expect(got.notes.filter((x) => x.t === 0)).toHaveLength(2);
  });

  it('Auf jedem Ton: every note of the answer', () => {
    for (let seed = 1; seed < 20; seed += 1) {
      const got = compose2(at([1, 3, 5, 4, 2]), config, n, seeded(seed), chords(['jeder'], ['oktave', 'quinte']), { previousLength: 0, round: 0, memory: [] });
      expect(got.chords).toHaveLength(got.length);
      expect(got.notes).toHaveLength(2 * got.length);
    }
  });

  it('Auf langen Tönen: only before a gap well above the answer’s middle one', () => {
    /* Gaps 300, 300, 1000, 300: the middle one is 300, so only the 1000 is long. */
    const melody = melodyOf([5, 6, 7, 6, 5], [0, 300, 600, 1600, 1900]);
    const got = harmonise(melody, config, n, seeded(1), chords(['lang'], ['dreiklang']));
    expect([...got.under.keys()]).toEqual([2]);
    /* Just under the factor is not long. */
    const nearly = melodyOf([5, 6, 7, 6], [0, 400, 800, 800 + 400 * LONG_NOTE.factor - 1]);
    expect(harmonise(nearly, config, n, seeded(1), chords(['lang'], ['dreiklang'])).under.size).toBe(0);
  });

  it('Wie oft: at 0 no chord comes, not even as the answer', () => {
    const s = chords(['jeder', 'allein'], ['dreiklang'], { chordChance: 0 });
    const got = compose2(at([4]), config, n, seeded(1), s, { previousLength: 0, round: 0, memory: [] });
    expect(got.chords).toEqual([]);
    expect(got.figure).not.toBe('akkord');
  });

  it('Ein Akkord als Antwort: to one or two notes, a home note and its chord; to three, not', () => {
    const s = chords(['allein'], ['dreiklang']);
    for (const phrase of [at([3]), at([3, 6])]) {
      const got = compose2(phrase, config, n, seeded(4), s, { previousLength: 0, round: 0, memory: [] });
      expect(got).toMatchObject({ figure: 'akkord', length: 1, chords: ['dreiklang'] });
      expect(got.notes).toHaveLength(3);
      expect(got.notes.every((x) => x.t === 0)).toBe(true);
      const melody = got.notes.reduce((a, b) => (b.velocity > a.velocity ? b : a)); // the chord's notes are softer
      expect(config.home).toContain(melody.degree);
    }
    const three = compose2(at([3, 6, 4]), config, n, seeded(4), s, { previousLength: 0, round: 0, memory: [] });
    expect(three.figure).not.toBe('akkord');
    expect(three.chords).toEqual([]);
  });
});

describe('how a chord sounds', () => {
  const config = configOf('marimba');

  it('Gebrochen: low to high, a step apart, the melody note in its place', () => {
    const melody = melodyOf([8, 5], [0, 2000]);
    const got = harmonise(melody, config, 10, seeded(1), chords(['anfang'], ['vierklang'], { chordSpread: 60 }));
    const all = [...got.tones, got.melody[0]].sort((a, b) => a.t - b.t);
    expect(all.map((x) => x.t)).toEqual([0, 60, 120, 180]);
    expect(all.map((x) => x.degree)).toEqual([...all.map((x) => x.degree)].sort((a, b) => a - b));
    expect(got.melody[0].t).toBe(180);
    expect(got.melody[1].t).toBe(2000);
  });

  it('Gebrochen never takes more than half the gap to the next note', () => {
    const melody = melodyOf([8, 5], [0, 240]);
    const got = harmonise(melody, config, 10, seeded(1), chords(['anfang'], ['vierklang'], { chordSpread: 200 }));
    expect(got.melody[0].t).toBeCloseTo(240 * SPREAD_SHARE);
  });

  it('Lautstärke: the chord’s notes at that share of the melody note', () => {
    const got = harmonise(melodyOf([8], [0]), config, 10, seeded(1), chords(['schluss'], ['dreiklang'], { chordVolume: 0.4 }));
    got.tones.forEach((x) => expect(x.velocity).toBeCloseTo(0.6 * 0.4));
  });

  it('Zweiklang with Vorschlag pairs the answer’s last note, not a grace note', () => {
    const s = { ...DEFAULTS, figures: { ...DEFAULTS.figures, vorschlag: true, zweiklang: true }, ornamentChance: 1 };
    for (let seed = 1; seed < 30; seed += 1) {
      const got = compose2(at([1, 3, 5, 4, 2, 6, 7], 500), config, 10, seeded(seed), s, { previousLength: 0, round: 0, memory: [] });
      expect(got.ornaments).toEqual(['vorschlag', 'zweiklang']);
      const last = Math.max(...got.notes.map((x) => x.t));
      expect(got.notes.filter((x) => x.t === last)).toHaveLength(2);
    }
  });

  it('Zweiklang beside a final chord adds no note the chord already plays', () => {
    const s = chords(['schluss'], ['oktave'], { figures: { ...DEFAULTS.figures, vorschlag: true, zweiklang: true }, ornamentChance: 1 });
    for (let seed = 1; seed < 30; seed += 1) {
      const got = compose2(at([1, 3, 5, 4, 2, 6, 7]), config, 10, seeded(seed), s, { previousLength: 0, round: 0, memory: [] });
      const last = Math.max(...got.notes.map((x) => x.t));
      const together = got.notes.filter((x) => x.t === last).map((x) => x.degree);
      expect(new Set(together).size).toBe(together.length);
    }
  });
});

describe('Unter deinem Spiel', () => {
  function duet(s: Settings) {
    setSettings(s);
    const time = fakeTime();
    const played: Stroke[] = [];
    const c = createConversation({
      config: configOf('harp'),
      degrees: () => DEGREES.harp,
      now: time.now,
      timers: time.timers,
      random: seeded(11),
      isHolding: () => false,
      enabled: () => true,
      play: (stroke) => {
        played.push(stroke);
        return { fade: vi.fn() } as Voice;
      },
    });
    const play = (degree: number) => c.heard({ degree, velocity: 0.6, at: time.now() });
    return { c, time, played, play };
  }

  it('a soft chord under the first note of a phrase, at once; none under the second', () => {
    const d = duet(chords(['begleitung'], ['dreiklang']));
    d.play(5);
    expect(d.played).toHaveLength(2);
    d.played.forEach((x) => {
      expect(x.degree).toBeLessThan(5);
      expect(x.velocity).toBeCloseTo(0.6 * DEFAULTS.chordVolume * UNDER_SOFTER);
    });
    d.time.advance(300);
    d.play(4);
    expect(d.played).toHaveLength(2);
  });

  it('again after Musie answered, and the answer’s entry names the chord', () => {
    const d = duet(chords(['begleitung'], ['quinte']));
    d.play(5);
    d.time.advance(300);
    d.play(3);
    d.time.advance(10_000); // Musie has answered and finished
    expect(runState().entries[0].under).toBe('quinte');
    const before = d.played.length;
    d.play(6);
    expect(d.played.length).toBe(before + 1);
  });

  it('broken, the chord’s notes follow one another', () => {
    const d = duet(chords(['begleitung'], ['vierklang'], { chordSpread: 80 }));
    d.play(6);
    expect(d.played).toHaveLength(1);
    d.time.advance(80);
    expect(d.played).toHaveLength(2);
    d.time.advance(80);
    expect(d.played).toHaveLength(3);
    d.c.stop();
  });
});

describe('where they fit', () => {
  const config = configOf('marimba');
  const p = pitchesOf(config, 10);
  /* A melody through every pitch class, with room below and some notes long. */
  const melody = melodyOf([7, 6, 8, 9, 5, 6, 7], [0, 300, 600, 1500, 1800, 2100, 2400]);

  it('Nur auf Ruhetönen: chords only on g, h and d, and the triad there is G-Dur', () => {
    for (let seed = 1; seed < 40; seed += 1) {
      const got = harmonise(melody, config, 10, seeded(seed), chords(['jeder'], ['dreiklang'], { chordRest: true }));
      expect(got.under.size).toBeGreaterThan(0);
      for (const [k, tones] of got.under) {
        expect([D, G, H]).toContain(p.pc(melody[k].degree));
        expect([...new Set([melody[k].degree, ...tones].map(p.pc))].sort().join()).toBe([D, G, H].join());
      }
    }
  });

  it('Melodie bleibt oben: no chord where it would reach above the melody note', () => {
    const low = melodyOf([0, 1, 2, 7], [0, 300, 600, 900]);
    for (let seed = 1; seed < 40; seed += 1) {
      const got = harmonise(low, config, 10, seeded(seed), chords(['jeder'], ['dreiklang', 'quinte'], { chordBelow: true }));
      for (const [k, tones] of got.under) tones.forEach((d) => expect(d).toBeLessThan(low[k].degree));
      expect(got.under.has(0)).toBe(false); // the lowest d has nothing under it
    }
  });

  it('Höchstens einer: one chord, on the last note when it can carry one', () => {
    for (let seed = 1; seed < 40; seed += 1) {
      const got = harmonise(melody, config, 10, seeded(seed), chords(['jeder'], ['quinte'], { chordOne: true }));
      expect([...got.under.keys()]).toEqual([melody.length - 1]);
    }
  });

  it('Höchstens einer: when the end has no room, the longest note instead', () => {
    const endsLow = melodyOf([7, 8, 6, 0], [0, 300, 1400, 1700]);
    const got = harmonise(endsLow, config, 10, seeded(3), chords(['jeder'], ['dreiklang'], { chordOne: true, chordBelow: true }));
    expect([...got.under.keys()]).toEqual([1]); // 1100 ms after it, the longest gap
  });

  it('Höchstens einer: „Wie oft“ decides per answer', () => {
    let answers = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      const got = harmonise(melody, config, 10, seeded(seed), chords(['jeder'], ['quinte'], { chordOne: true, chordChance: 0.5 }));
      expect(got.under.size).toBeLessThanOrEqual(1);
      answers += got.under.size;
    }
    expect(answers).toBeGreaterThan(70);
    expect(answers).toBeLessThan(130);
  });

  it('Ein Akkord als Antwort with Melodie bleibt oben: a home with room under it', () => {
    const s = chords(['allein'], ['dreiklang'], { chordBelow: true });
    for (let seed = 1; seed < 30; seed += 1) {
      const got = compose2(at([0]), config, 10, seeded(seed), s, { previousLength: 0, round: 0, memory: [] }); // they played the lowest d
      expect(got.figure).toBe('akkord');
      expect(got.chords).toEqual(['dreiklang']);
      const melodyNote = got.notes.reduce((a, b) => (b.velocity > a.velocity ? b : a));
      expect(config.home).toContain(melodyNote.degree);
      got.notes.forEach((x) => expect(x.degree).toBeLessThanOrEqual(melodyNote.degree));
    }
  });

  it('Unter deinem Spiel follows the rules too', () => {
    const s = chords(['begleitung'], ['dreiklang'], { chordRest: true, chordBelow: true });
    expect(underneath({ degree: 8, velocity: 0.6, at: 0 }, config, 10, seeded(1), s)).toBeNull(); // a: not a rest tone
    expect(underneath({ degree: 0, velocity: 0.6, at: 0 }, config, 10, seeded(1), s)).toBeNull(); // the lowest d: no room below
    expect(underneath({ degree: 7, velocity: 0.6, at: 0 }, config, 10, seeded(1), s)?.notes.every((x) => x.degree < 7)).toBe(true);
  });
});

describe('the pill', () => {
  function duet(s: Settings) {
    setSettings(s);
    const time = fakeTime();
    const c = createConversation({
      config: configOf('harp'),
      degrees: () => DEGREES.harp,
      now: time.now,
      timers: time.timers,
      random: seeded(11),
      isHolding: () => false,
      enabled: () => true,
      play: () => ({ fade: vi.fn() }) as Voice,
    });
    const play = (degree: number) => c.heard({ degree, velocity: 0.6, at: time.now() });
    return { c, time, play };
  }

  it('names the answer while it sounds, and is gone when it has rung out', () => {
    const d = duet(DEFAULTS);
    d.play(3);
    d.time.advance(300);
    d.play(5);
    expect(runState().playing).toBeNull();
    d.time.advance(1800); // today's wait: the answer starts
    expect(runState().playing).toMatchObject({ kind: 'answer', entry: { figure: 'heute' } });
    d.time.advance(10_000);
    expect(runState().playing).toBeNull();
  });

  it('goes when the person plays into the answer', () => {
    const d = duet(DEFAULTS);
    d.play(3);
    d.time.advance(1800);
    expect(runState().playing?.kind).toBe('answer');
    d.play(4);
    expect(runState().playing).toBeNull();
  });

  it('names a chord laid under their note, for a moment', () => {
    const d = duet(chords(['begleitung'], ['quinte']));
    d.play(5);
    expect(runState().playing).toEqual({ kind: 'under', chord: 'quinte' });
    d.time.advance(UNDER_PILL_MS);
    expect(runState().playing).toBeNull();
    d.c.stop();
  });
});

describe('the address', () => {
  it('carries the chords, and reads them back', () => {
    const s = chords(['schluss', 'begleitung'], ['quinte', 'schwebend'], { chordSpread: 40 });
    expect(encode(s)).toBe('chordSpread=40&wann=schluss,begleitung&akk=quinte,schwebend');
    expect(decode(`#${encode(s)}`)).toEqual(s);
    expect(encode(DEFAULTS)).toBe('');
  });
});
