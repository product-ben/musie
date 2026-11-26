/**
 * What the panel sets. The answer (conversation.ts) reads it LIVE, on every
 * note and every answer, so a switch takes effect at the next answer without
 * restarting the instrument.
 *
 * DEFAULTS is „wie heute“: every switch off, no figure. With DEFAULTS the
 * experiment answers exactly like the app — answer2.test.ts proves it note for
 * note against `compose` and `pauseMs` in src/instruments/engine/answer.ts.
 *
 * Every slider default is the value a switch starts at when it is turned on.
 * They are GUESSES, not measurements: nobody has played them yet.
 *
 * START is where a visitor begins: Ben's combination of 2026-11-26, sent as a
 * link. It is NOT DEFAULTS, on purpose. The address and PostHog's
 * `settings_key` stay relative to today, so every link already shared, and
 * every event already recorded, keeps meaning what it meant. „Alles wie heute“
 * is still one press away. All switches off now has its own address, `#heute`,
 * because the bare address is START now.
 *
 * The state lives in the address (`#…`), so a combination can be sent as a
 * link, and in localStorage, so a reload keeps it — until START changes. A
 * stored state remembers the START it was made under, and when that is no
 * longer the START, the page opens on the new one (Ben, 2026-11-26: the third
 * link was live, and a browser that had visited before still showed six
 * figures). A link still opens on what it says.
 */
import type { InstrumentId } from '../../../src/instruments/types';

export const FIGURE_IDS = [
  'echo', 'frage', 'sequenz', 'spiegel', 'erinnerung', 'bogen', 'pendel', 'lauf',
  'vorschlag', 'zweiklang',
] as const;
export type FigureId = (typeof FIGURE_IDS)[number];
/** A figure that decides the whole answer — one per answer. */
export type ShapeId = Exclude<FigureId, 'vorschlag' | 'zweiklang'>;
export const SHAPES: readonly ShapeId[] = ['echo', 'frage', 'sequenz', 'spiegel', 'erinnerung', 'bogen', 'pendel', 'lauf'];
/** A figure laid on top of whatever answer was composed — they stack. */
export const ORNAMENTS = ['vorschlag', 'zweiklang'] as const satisfies readonly FigureId[];

export const FIGURE_TEXT: Record<FigureId, { label: string; hint: string }> = {
  echo: { label: 'Echo', hint: 'Deine letzten Töne, eine Stufe versetzt und leiser.' },
  frage: { label: 'Frage und Antwort', hint: 'Beginnt genau wie du, geht dann anders weiter und schließt auf dem Grundton.' },
  sequenz: { label: 'Sequenz', hint: 'Ein Motiv von dir, zwei- bis viermal Stufe um Stufe versetzt.' },
  spiegel: { label: 'Spiegel', hint: 'Deine Melodie gespiegelt: Wo du hinaufgingst, geht Musie hinab, in deinem Rhythmus.' },
  erinnerung: { label: 'Erinnerung', hint: 'Ein Motiv aus einer früheren Runde kehrt zurück.' },
  bogen: { label: 'Bogen', hint: 'Steigt über deinen höchsten Ton hinaus, lauter werdend, und kehrt leiser zurück.' },
  pendel: { label: 'Pendel', hint: 'Zwei Töne im Wechsel, ruhig wiegend, dann nach Hause.' },
  lauf: { label: 'Lauf', hint: 'Ein Ton, dann ein schneller Lauf, der auf dem Grundton landet.' },
  vorschlag: { label: 'Vorschlag', hint: 'Ein kurzer Nachbarton vor ein, zwei Tönen der Antwort.' },
  zweiklang: { label: 'Zweiklang', hint: 'Der Schlusston klingt mit seiner Oktave oder Quarte.' },
};

/* ── chords: when Musie plays one, and which kind ── */

export const CHORD_MOMENTS = ['anfang', 'schluss', 'lang', 'jeder', 'allein', 'begleitung'] as const;
export type ChordMoment = (typeof CHORD_MOMENTS)[number];

export const CHORD_MOMENT_TEXT: Record<ChordMoment, { label: string; hint: string }> = {
  anfang: { label: 'Zu Beginn', hint: 'Der erste Ton der Antwort.' },
  schluss: { label: 'Am Schluss', hint: 'Der letzte Ton der Antwort.' },
  lang: { label: 'Auf langen Tönen', hint: 'Wo nach einem Ton eine längere Pause kommt, so dass der Akkord ausklingen kann.' },
  jeder: { label: 'Auf jedem Ton', hint: 'Die ganze Antwort in Akkorden, wie ein Choral.' },
  allein: { label: 'Ein Akkord als Antwort', hint: 'Spielst du nur einen oder zwei Töne, antwortet Musie mit einem einzigen Akkord.' },
  begleitung: { label: 'Unter deinem Spiel', hint: 'Musie legt einen leisen Akkord unter deinen ersten Ton, während du spielst.' },
};

export const CHORD_KINDS = ['oktave', 'quinte', 'dreiklang', 'vierklang', 'schwebend', 'schimmernd'] as const;
export type ChordKind = (typeof CHORD_KINDS)[number];

export const CHORD_KIND_TEXT: Record<ChordKind, { label: string; hint: string }> = {
  oktave: { label: 'Oktave', hint: 'Der Ton mit sich selbst, eine Oktave tiefer. Klar und ruhig. Die Harfe hat dafür nur auf d und e Platz.' },
  quinte: { label: 'Quinte', hint: 'Der Ton mit seiner Quinte darunter, auf g mit der Quarte. Leer und offen, wie ein Dudelsack.' },
  dreiklang: { label: 'Dreiklang', hint: 'G-Dur oder e-Moll, je nach Ton; auf a ein D mit Quarte statt Terz. Wie in einem Lied.' },
  vierklang: { label: 'Vierklang', hint: 'e, g, h und d zusammen: G-Dur mit Sexte. Weich, wie ein Wiegenlied.' },
  schwebend: { label: 'Schwebend', hint: 'Je zwei Leitertöne Abstand, meist Quarten. Offen und schwebend.' },
  schimmernd: { label: 'Schimmernd', hint: 'Die zwei Nachbartöne darunter, dicht wie ein Windspiel.' },
};

export interface Settings {
  instrument: InstrumentId;

  /* ── Einsteigen ── */
  /** Lower floor and less patience than today (1.8 s, 2.5 × / 1.4 ×). */
  faster: boolean;
  /** The floor, ms. Today 1800. */
  minMs: number;
  /** Scales both factors (2.5 × median, 1.4 × longest); the longest never below 1 ×. */
  patience: number;
  /** A resting finger is re-checked every 30 ms instead of every 400 ms. */
  onLift: boolean;
  /** Shorter when the phrase sounds finished, longer in the middle of a run. */
  phraseEnd: boolean;
  /** Longer after the person played into Musie's entry, a little shorter otherwise. */
  learn: boolean;

  /* ── Aufnehmen ── */
  /** Their gaps in their order, not rotated. */
  keepRhythm: boolean;
  /** Gaps may be as fast and as slow as theirs (today 220–1400 ms). */
  followTempo: boolean;
  /** Starts as loud as they ended; a wider arch. */
  followDynamics: boolean;

  /* ── Länger und spannender ── */
  longer: boolean;
  /** Up to this many times their phrase, in notes and in time. */
  timesYours: number;
  /** And never more notes than this. Today 8. */
  maxNotes: number;
  /** Starts at half the allowed length and grows to all of it. */
  growing: boolean;
  /** …after this many answers. */
  growRounds: number;
  /** No 2–3 note answers to a longer phrase. */
  noTiny: boolean;
  /** May leave their register by more than one step. */
  wider: boolean;
  /** …by up to this many steps. */
  widerBy: number;

  /* ── Figuren ── */
  figures: Record<FigureId, boolean>;
  /** How often a checked shape replaces today's answer, 0 … 1. */
  figureShare: number;
  /** How often each checked ornament is added, 0 … 1. */
  ornamentChance: number;

  /* ── Akkorde ── */
  /** When a chord may come. None checked: none comes, as today. */
  chordWhen: Record<ChordMoment, boolean>;
  /** Which chords; one of the checked per chord. None checked: none comes. */
  chordKinds: Record<ChordKind, boolean>;
  /** How often a chord comes where one may, 0 … 1. */
  chordChance: number;
  /** Broken: ms between the chord's notes, low to high. 0 is together. */
  chordSpread: number;
  /** The chord's other notes, relative to the melody note. */
  chordVolume: number;
  /* Where they fit (chords.ts): each makes chords rarer, and each for a reason. */
  /** Of the places the moments allow, only the strongest: the end, else the longest note. */
  chordOne: boolean;
  /** Only on g, h and d — the notes of G-Dur — and the triad there is G-Dur. */
  chordRest: boolean;
  /** Only where the whole chord fits under the melody note. */
  chordBelow: boolean;
}

export type BoolKey = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];
export type NumberKey = {
  [K in keyof Settings]: Settings[K] extends number ? K : never;
}[keyof Settings];

const noFigures = Object.fromEntries(FIGURE_IDS.map((id) => [id, false])) as Record<FigureId, boolean>;
const noMoments = Object.fromEntries(CHORD_MOMENTS.map((id) => [id, false])) as Record<ChordMoment, boolean>;
const noKinds = Object.fromEntries(CHORD_KINDS.map((id) => [id, false])) as Record<ChordKind, boolean>;

export const DEFAULTS: Settings = {
  instrument: 'harp',
  faster: false, minMs: 1000, patience: 0.7,
  onLift: false,
  phraseEnd: false,
  learn: false,
  keepRhythm: false,
  followTempo: false,
  followDynamics: false,
  longer: false, timesYours: 1.5, maxNotes: 12,
  growing: false, growRounds: 6,
  noTiny: false,
  wider: false, widerBy: 3,
  figures: noFigures,
  figureShare: 1,
  ornamentChance: 0.5,
  chordWhen: noMoments,
  chordKinds: noKinds,
  /* GUESSES, like every slider here. 0.75 is the Zweiklang's partner. */
  chordChance: 1,
  chordSpread: 0,
  chordVolume: 0.75,
  chordOne: false,
  chordRest: false,
  chordBelow: false,
};

/**
 * Ben's link of 2026-11-26, the third one (the first had no chords, the
 * second all six figures and „Wie viel länger“ at 3):
 * #on=faster,followTempo,longer,growing,noTiny,wider&timesYours=2.5&maxNotes=9&growRounds=4&fig=frage,pendel&wann=schluss,lang,allein&akk=quinte,dreiklang
 */
export const START: Settings = {
  ...DEFAULTS,
  faster: true,
  followTempo: true,
  longer: true, timesYours: 2.5, maxNotes: 9,
  growing: true, growRounds: 4,
  noTiny: true,
  wider: true,
  figures: { ...noFigures, frage: true, pendel: true },
  chordWhen: { ...noMoments, schluss: true, lang: true, allein: true },
  chordKinds: { ...noKinds, quinte: true, dreiklang: true },
};

export const BOOL_KEYS: readonly BoolKey[] = [
  'faster', 'onLift', 'phraseEnd', 'learn', 'keepRhythm', 'followTempo', 'followDynamics',
  'longer', 'growing', 'noTiny', 'wider', 'chordOne', 'chordRest', 'chordBelow',
];

/** [min, max, step] for every slider. */
export const RANGES: Record<NumberKey, readonly [number, number, number]> = {
  minMs: [400, 1800, 100],
  patience: [0.4, 1, 0.05],
  timesYours: [1, 3, 0.1],
  maxNotes: [4, 24, 1],
  growRounds: [2, 16, 1],
  widerBy: [1, 5, 1],
  figureShare: [0, 1, 0.05],
  ornamentChance: [0, 1, 0.05],
  chordChance: [0, 1, 0.05],
  chordSpread: [0, 200, 10],
  chordVolume: [0.3, 1, 0.05],
};
const NUMBER_KEYS = Object.keys(RANGES) as NumberKey[];

const INSTRUMENTS: readonly InstrumentId[] = ['harp', 'kalimba', 'marimba'];

/* ── the address ─────────────────────────────────────────────────────────── */

/** Only what differs from DEFAULTS: `#i=kalimba&on=faster,longer&minMs=900&fig=bogen`. */
export function encode(s: Settings): string {
  const p = new URLSearchParams();
  if (s.instrument !== DEFAULTS.instrument) p.set('i', s.instrument);
  const on = BOOL_KEYS.filter((k) => s[k]);
  if (on.length) p.set('on', on.join(','));
  for (const k of NUMBER_KEYS) if (s[k] !== DEFAULTS[k]) p.set(k, String(s[k]));
  const fig = FIGURE_IDS.filter((id) => s.figures[id]);
  if (fig.length) p.set('fig', fig.join(','));
  const wann = CHORD_MOMENTS.filter((id) => s.chordWhen[id]);
  if (wann.length) p.set('wann', wann.join(','));
  const akk = CHORD_KINDS.filter((id) => s.chordKinds[id]);
  if (akk.length) p.set('akk', akk.join(','));
  return p.toString().replace(/%2C/g, ',');
}

export function decode(text: string): Settings {
  const p = new URLSearchParams(text.replace(/^#/, ''));
  const s: Settings = {
    ...DEFAULTS,
    figures: { ...DEFAULTS.figures },
    chordWhen: { ...DEFAULTS.chordWhen },
    chordKinds: { ...DEFAULTS.chordKinds },
  };
  const i = p.get('i');
  if (i !== null && (INSTRUMENTS as readonly string[]).includes(i)) s.instrument = i as InstrumentId;
  const on = new Set((p.get('on') ?? '').split(',').filter(Boolean));
  for (const k of BOOL_KEYS) s[k] = on.has(k);
  for (const k of NUMBER_KEYS) {
    const raw = p.get(k);
    if (raw === null) continue;
    const v = Number(raw);
    const [min, max] = RANGES[k];
    if (Number.isFinite(v)) s[k] = Math.min(max, Math.max(min, v));
  }
  const fig = new Set((p.get('fig') ?? '').split(',').filter(Boolean));
  for (const id of FIGURE_IDS) s.figures[id] = fig.has(id);
  const wann = new Set((p.get('wann') ?? '').split(',').filter(Boolean));
  for (const id of CHORD_MOMENTS) s.chordWhen[id] = wann.has(id);
  const akk = new Set((p.get('akk') ?? '').split(',').filter(Boolean));
  for (const id of CHORD_KINDS) s.chordKinds[id] = akk.has(id);
  return s;
}

/* ── the store ───────────────────────────────────────────────────────────── */

export const STORAGE_KEY = 'duett-settings';
/** The START a stored state was made under, as its address. */
export const STORAGE_START_KEY = 'duett-start';

function initial(): Settings {
  if (typeof window === 'undefined') return DEFAULTS;
  if (window.location.hash.length > 1) return decode(window.location.hash);
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    /* A state stored before START last changed — or before this key existed —
       is dropped: the visitor gets the new start, not the one they left. */
    if (stored !== null && window.localStorage.getItem(STORAGE_START_KEY) === encode(START)) return decode(stored);
  } catch {
    /* private mode: start from START */
  }
  return START;
}

let current: Settings = initial();
const listeners = new Set<(s: Settings) => void>();

export function settings(): Settings {
  return current;
}

export function setSettings(next: Settings | ((s: Settings) => Settings)): void {
  current = typeof next === 'function' ? next(current) : next;
  if (typeof window !== 'undefined') {
    const text = encode(current);
    /* Today encodes to nothing, and nothing is START now, so today says so. */
    const url = `${window.location.pathname}${window.location.search}#${text || 'heute'}`;
    window.history.replaceState(null, '', url);
    try {
      window.localStorage.setItem(STORAGE_KEY, text);
      window.localStorage.setItem(STORAGE_START_KEY, encode(START));
    } catch {
      /* the address still carries it */
    }
  }
  listeners.forEach((fn) => fn(current));
}

export function subscribe(fn: (s: Settings) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
