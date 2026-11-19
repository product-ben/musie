/**
 * The experiment's whole "database": the baked content and ONE in-memory
 * session row. Read by the shims in `../shims/`, never by the app directly.
 *
 * Visitors have no Supabase session and the content tables are closed to
 * `anon`, so nothing here talks to a server. The row lives as long as the page;
 * a reload is a new run with a new id (`run.ts`).
 */
import type { Card, Exercise, ListenAudio, Track } from '../../../../src/lib/content';
import type { SessionRow } from '../../../../src/lib/session';
import type { InstrumentDefinition } from '../../../../src/instruments/types';
import type { Locale } from '../../../../src/i18n';
import type { StepId } from '../../../../src/routeHandle';
import { BODY_SCAN_AUDIO_SRC, FREIE_BAHN } from '../config';
import { RUN } from '../run';
import baked from './content.json';
import { applyCopyFixes } from './copyFixes';

/* ── The baked content ────────────────────────────────────────────────────*/

interface Baked {
  exercises: Record<Locale, Record<string, Exercise>>;
  cards: Record<Locale, Card>;
  listenAudio: Record<string, ListenAudio | null>;
  tracks: Record<string, Track | null>;
  instruments: Record<string, InstrumentDefinition>;
}

const CONTENT = baked as unknown as Baked;

/* Ben's copy changes of 2026-11-19, over the baked texts (copyFixes.ts). */
applyCopyFixes(CONTENT.exercises as unknown as Record<string, Record<string, unknown>>);

/** The one exercise that deals a card, and only digitally, one card. */
export const FREE_REIN = 'free-rein';

export function exercise(id: string, locale: Locale): Exercise | null {
  const found = CONTENT.exercises[locale]?.[id] ?? CONTENT.exercises.en[id] ?? null;
  if (found === null) return null;
  /* Freie Bahn is ALWAYS the digital one-card run here, whatever the content
     says (brief). The DB says 1 today; forcing it keeps a content edit from
     turning the experiment into a five-card deal. */
  if (id === FREE_REIN) return { ...found, cardsDealt: 1 };
  return { ...found };
}

/** The one card Freie Bahn deals: MC-01's own words, the configured picture. */
export function theCard(locale: Locale): Card {
  const card = CONTENT.cards[locale] ?? CONTENT.cards.en;
  return { ...card, imageUrl: FREIE_BAHN.imageSrc };
}

/** „Aura“, which the local stack does not carry — so it is configured, not baked. */
export const AURA: Track = {
  id: FREIE_BAHN.trackId,
  src: FREIE_BAHN.trackSrc,
  /* 151.32 s by `afinfo`; music.json says 151. */
  durationSeconds: 151,
};

/** What `reveal-track` would answer for a track id. */
export const REVEALS: Record<string, { title: string; artist: string; licenceRef: string | null }> = {
  [FREIE_BAHN.trackId]: { title: FREIE_BAHN.trackTitle, artist: FREIE_BAHN.trackArtist, licenceRef: null },
};

export function trackFor(exerciseId: string, cardId: string | null): Track | null {
  if (exerciseId === FREE_REIN) return cardId === null ? null : { ...AURA };
  return CONTENT.tracks[`${exerciseId}|${cardId ?? 'null'}`] ?? null;
}

export function listenAudio(exerciseId: string, locale: Locale, posture: string, ending: string): ListenAudio | null {
  const found = CONTENT.listenAudio[`${exerciseId}|${locale}|${posture}|${ending}`] ?? null;
  return found === null ? null : { ...found };
}

export function instrument(id: string): InstrumentDefinition {
  const found = CONTENT.instruments[id];
  if (found === undefined) throw new Error(`instruments: no instrument "${id}"`);
  return found;
}

/**
 * Object key → the static file that stands in for the private `tracks` bucket.
 * The cut's two stems are the files whose sha256 starts with the hash in the
 * key (`BodyScan - mit/ohne Hintergrund.mp3`); Aura is already a URL.
 */
export const MEDIA: Record<string, string> = {
  'cut-body-scan-soundwalk-de-any-any-mixed-4343cfff.mp3': BODY_SCAN_AUDIO_SRC,
  'cut-body-scan-soundwalk-de-any-any-voice-ed6246c4.mp3': '/experiments/reflexion/media/body-scan-de-voice.mp3',
};

/* ── The one session row ──────────────────────────────────────────────────*/

function freshRow(): SessionRow {
  const exerciseId = RUN.exercise?.exerciseId ?? '';
  return {
    id: RUN.sessionId,
    exerciseId,
    cardId: null,
    trackId: null,
    status: 'started',
    step: 'intro' as StepId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    listeningQuestionId: null,
    listeningQuestion: null,
    /* Freie Bahn: the digital run from the first frame, so the intro's
       switch starts at "no cards in front of me". */
    digitalCards: exerciseId === FREE_REIN,
    rejectedQuestionIds: [],
    rejectedThisRound: [],
    posture: null,
    ending: null,
  };
}

let row: SessionRow = freshRow();

/** A copy, so nothing that holds a read can see a later write. */
export function readRow(id: string): SessionRow | null {
  if (id !== row.id) return null;
  return { ...row, rejectedQuestionIds: [...row.rejectedQuestionIds], rejectedThisRound: [...row.rejectedThisRound] };
}

export function updateRow(id: string, patch: Partial<SessionRow>): void {
  if (id !== row.id) return;
  row = { ...row, ...patch, id: row.id };
  /* Freie Bahn cannot become the paper run here. */
  if (row.exerciseId === FREE_REIN) row.digitalCards = true;
}

/**
 * Ending a run starts it again. Session.tsx redirects a row that is no longer
 * `started` to /diary, which this page's router sends back to intro — so a
 * row left `abandoned` would loop. Same id, fresh row.
 */
export function resetRow(): void {
  row = freshRow();
}

/** Simulated round trip, so the stepper's loading states behave as in the app. */
export function tick<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}
