/**
 * The deck's rules, as functions — for the maintenance form.
 *
 * ── WHERE THE RULES ACTUALLY LIVE, AND WHY THERE ARE THREE COPIES ─────────
 * There are three places that check the deck, and they are not redundant:
 *
 *   `scripts/deck.mjs`   validates the FILE — the exported snapshot. Plain
 *                        ESM with a hand-written `.d.mts`, because both deck
 *                        scripts run under bare `node`.
 *   this module          validates the FORM, in the browser, before a write
 *                        is sent, so the operator gets a sentence rather than
 *                        a Postgres error code.
 *   the schema           validates the TRUTH. `cards_code_shape`,
 *                        `cards_id_is_code`, `cards_one_per_cell`,
 *                        `tracks_tempo_sane` and the write-once trigger are
 *                        the only ones that cannot be bypassed.
 *
 * The database is the authority. If this module and the schema ever disagree,
 * the schema is right and this one is a stale error message — which is the
 * cheap failure of the two, and the reason the form is allowed to have its own
 * copy at all. `deck.db.test.ts` asserts the schema actually refuses what this
 * says it will.
 *
 * Pure and in `lib/` for the usual reason: `vitest.config.ts` runs
 * `src/**\/*.test.ts` in a node environment with no DOM.
 */

/* ═══ CODES ═════════════════════════════════════════════════════════════════ */

/**
 * `MC-01` … `MC-99`, and the ceiling is in a constant because *for now* is
 * what Ben said about it (2026-10-14). A second deck means a second prefix,
 * which is this line plus a migration for `cards_code_shape`.
 */
export const CODE_PREFIX = 'MC';

/** Ninety-nine. There is no `MC-00`: the deck is one-based. */
export const CODE_CEILING = 99;

/**
 * Two digits, zero-padded, 01–99.
 *
 * `MC-1` is refused as firmly as `MC-100`: what is printed on the card is two
 * digits, and a code that reads one way in the database and another on the
 * paper is the same card with two names.
 */
export const CODE_SHAPE = /^MC-(0[1-9]|[1-9][0-9])$/;

export function isCardCode(value: string): boolean {
  return CODE_SHAPE.test(value);
}

/**
 * The id a code implies. Always the lower case, never anything else — it is
 * what `sessions.card_id` stores, so a diary row read in a year should name
 * the paper card without a join. `cards_id_is_code` enforces it.
 */
export function cardIdFor(code: string): string {
  return code.toLowerCase();
}

/** The code a number implies: `3` → `MC-03`. */
export function codeFor(number: number): string {
  return `${CODE_PREFIX}-${String(number).padStart(2, '0')}`;
}

/**
 * The lowest code nobody has taken, or null when all ninety-nine are gone.
 *
 * ── TAKEN MEANS TAKEN FOREVER ─────────────────────────────────────────────
 * Ben, 2026-10-14: *once a code exists, it can't be deleted, but only new
 * codes can be made up.* So the list this is given must be EVERY code the
 * deck has ever had, archived ones included — nothing in the schema can be
 * hard-deleted, which is what makes that list obtainable at all. Handing it
 * only the live cards would re-offer MC-03 to a second card, and every diary
 * row that drew the first one would then point at a card it never drew.
 */
export function nextFreeCode(taken: readonly string[]): string | null {
  const used = new Set(taken.map((code) => code.toUpperCase()));
  for (let n = 1; n <= CODE_CEILING; n += 1) {
    const code = codeFor(n);
    if (!used.has(code)) return code;
  }
  return null;
}

/* ═══ THE GRID ══════════════════════════════════════════════════════════════ */

export const AXIS_MIN = -2;
export const AXIS_MAX = 2;

export interface Cell {
  /** How pleasant, −2…+2. */
  valence: number;
  /** How activating, −2…+2. */
  arousal: number;
}

export function isAxisValue(value: number): boolean {
  return Number.isInteger(value) && value >= AXIS_MIN && value <= AXIS_MAX;
}

/**
 * The twenty-five, **in reading order** — top row first, left to right, which
 * is how the screen draws them and therefore how a `CELLS.map()` lays out a
 * grid without a sort step. Arousal descends because up is more activating.
 */
export const CELLS: readonly Cell[] = (() => {
  const cells: Cell[] = [];
  for (let arousal = AXIS_MAX; arousal >= AXIS_MIN; arousal -= 1) {
    for (let valence = AXIS_MIN; valence <= AXIS_MAX; valence += 1) {
      cells.push({ valence, arousal });
    }
  }
  return cells;
})();

/**
 * A cell's id, which is its position: `"2,1"`.
 *
 * It is what `content_edits.row_id` carries for a cell, so the history can
 * name a position without a surrogate key — and what `admin_write` splits
 * back apart. One spelling, defined once, used on both sides of the wire.
 */
export function cellId(cell: Cell): string {
  return `${cell.valence},${cell.arousal}`;
}

export function parseCellId(id: string): Cell | null {
  const parts = id.split(',');
  if (parts.length !== 2) return null;
  const valence = Number(parts[0]);
  const arousal = Number(parts[1]);
  if (!isAxisValue(valence) || !isAxisValue(arousal)) return null;
  return { valence, arousal };
}

export function sameCell(a: Cell | null, b: Cell | null): boolean {
  if (a === null || b === null) return a === b;
  return a.valence === b.valence && a.arousal === b.arousal;
}

/* ═══ IDS AND VALUES ════════════════════════════════════════════════════════ */

/** Opaque on purpose: a title-derived slug would leak the credit. */
export const TRACK_ID_SHAPE = /^trk-[0-9]{2,}$/;
export const ARTWORK_ID_SHAPE = /^art-[0-9]{2,}$/;

export function isTrackId(value: string): boolean {
  return TRACK_ID_SHAPE.test(value);
}

export function isArtworkId(value: string): boolean {
  return ARTWORK_ID_SHAPE.test(value);
}

/** The next `trk-NN` / `art-NN`, from the ids already in use. */
export function nextId(prefix: 'trk' | 'art', taken: readonly string[]): string {
  let highest = 0;
  for (const id of taken) {
    const match = /^(?:trk|art)-([0-9]+)$/.exec(id);
    if (match !== null) highest = Math.max(highest, Number(match[1]));
  }
  return `${prefix}-${String(highest + 1).padStart(2, '0')}`;
}

/**
 * Epidemic Sound is a SUBSCRIPTION licence, not the per-track clearance
 * BUILD-PLAN assumed everywhere it says *cleared* — `20260921160000`. That is
 * the distinction this list exists to make recordable.
 */
export const LICENCE_TYPES = ['subscription', 'per_track', 'none_yet'] as const;
export type LicenceType = (typeof LICENCE_TYPES)[number];

export function isLicenceType(value: string): value is LicenceType {
  return (LICENCE_TYPES as readonly string[]).includes(value);
}

export const YEAR_MIN = 1900;
export const YEAR_MAX = 2100;
/** Past the top of drum and bass; 0 is not a tempo. */
export const TEMPO_MIN = 1;
export const TEMPO_MAX = 400;

/* ═══ WHAT THE FORM REFUSES ═════════════════════════════════════════════════ */

/**
 * A problem is a SENTENCE, not a code.
 *
 * The one reader is the operator, and a list of field names tells them which
 * box is red without telling them what is wrong with it. Each of these says
 * what the rule is, because the rule is usually the surprising part.
 */
export type Problems = string[];

export interface CardFields {
  code: string;
  valence: number | null;
  arousal: number | null;
}

export function validateCard(card: CardFields, takenCodes: readonly string[]): Problems {
  const problems: Problems = [];

  if (!isCardCode(card.code)) {
    problems.push(
      `${card.code || 'A code'} is not a card code. They run MC-01 to MC-99, ` +
      'two digits, zero-padded.',
    );
  } else if (takenCodes.some((taken) => taken.toUpperCase() === card.code.toUpperCase())) {
    problems.push(
      `${card.code} has been used before. A code is never reused, even once ` +
      'its card is retired — a diary entry that drew the old one would ' +
      'otherwise point at a card it never drew.',
    );
  }

  /* A card off the grid is legal — it is a card made but not yet dealt — but
     half a coordinate is not a position. */
  if ((card.valence === null) !== (card.arousal === null)) {
    problems.push('A card is either on the grid or off it, never half-placed.');
  }

  if (card.valence !== null && !isAxisValue(card.valence)) {
    problems.push(`Valence is ${card.valence}; the grid runs −2 to +2.`);
  }
  if (card.arousal !== null && !isAxisValue(card.arousal)) {
    problems.push(`Arousal is ${card.arousal}; the grid runs −2 to +2.`);
  }

  return problems;
}

export interface TrackFields {
  title: string;
  artist: string;
  album: string | null;
  releaseYear: number | null;
  tempoBpm: number | null;
  licenceType: string | null;
  durationSeconds: number | null;
}

export function validateTrack(track: TrackFields): Problems {
  const problems: Problems = [];

  /* The credit is the one thing a piece cannot be without: `reveal-track`
     exists to say it at the end of a session, and it cannot say nothing. */
  if (track.title.trim() === '') problems.push('A piece needs a title.');
  if (track.artist.trim() === '') problems.push('A piece needs an artist.');

  if (track.releaseYear !== null) {
    if (!Number.isInteger(track.releaseYear)
        || track.releaseYear < YEAR_MIN || track.releaseYear > YEAR_MAX) {
      problems.push(`${track.releaseYear} is not a release year between ${YEAR_MIN} and ${YEAR_MAX}.`);
    }
  }

  if (track.tempoBpm !== null) {
    if (!Number.isInteger(track.tempoBpm)
        || track.tempoBpm < TEMPO_MIN || track.tempoBpm > TEMPO_MAX) {
      problems.push(`${track.tempoBpm} is not a tempo between ${TEMPO_MIN} and ${TEMPO_MAX} bpm.`);
    }
  }

  if (track.licenceType !== null && !isLicenceType(track.licenceType)) {
    problems.push(
      `${track.licenceType} is not a licence type. It is one of ${LICENCE_TYPES.join(', ')}.`,
    );
  }

  /* MEASURED, never typed — so this is a guard against a measurement that
     failed rather than against a typo. A duration of zero is what a decoder
     reports when it could not read the file at all. */
  if (track.durationSeconds !== null
      && (!Number.isFinite(track.durationSeconds) || track.durationSeconds <= 0)) {
    problems.push(
      'The duration could not be measured from the file. It is read off the ' +
      'recording and never typed, so this is a broken upload rather than a ' +
      'missing field.',
    );
  }

  return problems;
}

export interface ArtworkFields {
  src: string;
  altDe: string | null;
  altEn: string | null;
}

export function validateArtwork(artwork: ArtworkFields): Problems {
  const problems: Problems = [];

  if (artwork.src.trim() === '') problems.push('An artwork needs a file.');

  /**
   * ── BOTH LOCALES OR NEITHER ─────────────────────────────────────────────
   * Null in both is DATA: nobody has described the picture yet, and
   * `missing_translations` stays quiet about it because it compares the
   * locales against each other rather than testing for null. Null in ONE is a
   * dropped translation, which is the hole that view exists to report. Alt
   * text is the only translated string left in the deck.
   */
  const de = (artwork.altDe ?? '').trim();
  const en = (artwork.altEn ?? '').trim();
  if ((de === '') !== (en === '')) {
    problems.push(
      'Alt text is written in both languages or in neither. One of the two ' +
      'is a dropped translation rather than a decision.',
    );
  }

  return problems;
}
