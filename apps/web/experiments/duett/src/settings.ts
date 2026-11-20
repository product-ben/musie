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
 * The state lives in the address (`#…`), so a combination can be sent as a
 * link, and in localStorage, so a reload keeps it.
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
}

export type BoolKey = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];
export type NumberKey = {
  [K in keyof Settings]: Settings[K] extends number ? K : never;
}[keyof Settings];

const noFigures = Object.fromEntries(FIGURE_IDS.map((id) => [id, false])) as Record<FigureId, boolean>;

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
};

export const BOOL_KEYS: readonly BoolKey[] = [
  'faster', 'onLift', 'phraseEnd', 'learn', 'keepRhythm', 'followTempo', 'followDynamics',
  'longer', 'growing', 'noTiny', 'wider',
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
  return p.toString().replace(/%2C/g, ',');
}

export function decode(text: string): Settings {
  const p = new URLSearchParams(text.replace(/^#/, ''));
  const s: Settings = { ...DEFAULTS, figures: { ...DEFAULTS.figures } };
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
  return s;
}

/* ── the store ───────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'duett-settings';

function initial(): Settings {
  if (typeof window === 'undefined') return DEFAULTS;
  if (window.location.hash.length > 1) return decode(window.location.hash);
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return decode(stored);
  } catch {
    /* private mode: start from today */
  }
  return DEFAULTS;
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
    const url = `${window.location.pathname}${window.location.search}${text ? `#${text}` : ''}`;
    window.history.replaceState(null, '', url);
    try {
      window.localStorage.setItem(STORAGE_KEY, text);
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
