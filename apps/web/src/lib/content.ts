/**
 * Locale-aware content queries.
 *
 * Two rules the rest of the app depends on:
 *
 *   1. SCREENS NEVER SEE THE JOIN. Everything here returns flat objects —
 *      `exercise.name`, never `exercise.exercise_i18n[0].name`. The i18n table is
 *      this module's problem and nobody else's.
 *
 *   2. A MISSING TRANSLATION IS NEVER SILENT. If a row has no translation for
 *      the active locale we fall back to English AND warn with the table, the
 *      id and the missing locale. Wrong-language text that nobody notices is
 *      worse than a visible gap: it ships.
 *
 * ── ONE ROUND TRIP, NOT TWO ────────────────────────────────────────────────
 * Each query asks for BOTH the active locale and English in a single request
 * (`locale=in.(de,en)`) and picks per row. Fetching the active locale and
 * then re-querying the gaps would double the latency of the common case to
 * make the rare case tidier.
 *
 * Column names are mapped to camelCase here, at the boundary, so exactly one
 * place knows both spellings.
 */
import { getSupabase } from './supabase';
import type { Locale } from '../i18n';

/* ── Shapes the screens see ────────────────────────────────────────────────*/

export interface UserType {
  id: string;
  implemented: boolean;
  imageUrl: string | null;
  sort: number;
  label: string;
  imageAlt: string;
}

export interface Exercise {
  id: string;
  timeframeMin: number;
  timeframeMax: number;
  needsCards: boolean;
  needsSound: boolean;
  imageUrl: string | null;
  implemented: boolean;
  sort: number;
  /**
   * How much of the track has to be behind you before the reflection unlocks,
   * in seconds. Per exercise, because it varies with the exercise — a
   * two-minute card draw and a twenty-minute soundwalk do not earn the same
   * gate.
   *
   * `not null` in the schema, so no coalescing here. The listen step still
   * caps it at the track's own duration: a gate longer than the recording is
   * satisfied by finishing it rather than being unreachable.
   */
  listenGateSeconds: number;
  name: string;
  description: string;
  /** Null for exercises the source has no `needs` for. Absent, not untranslated. */
  needs: string | null;
  durationLabel: string | null;
  /**
   * THE FOUR STEPS' COPY, one array each, in step order: intro → scan →
   * listen → reflect. Each element is ONE PARAGRAPH — the array boundary is
   * the paragraph break, so a screen maps over it and never splits prose on
   * punctuation.
   *
   * `string[]`, NEVER `string[] | null`. The column is nullable and the rows
   * are null today, but null and `[]` render identically — as nothing — so
   * handing both shapes to every screen would buy a null check that has no
   * distinct branch. Coalesced here, at the boundary, with the rest of the
   * column mapping; a screen asks `.length === 0`.
   */
  introText: string[];
  scanText: string[];
  listenText: string[];
  reflectText: string[];
  /**
   * ONE question, SHOWN TWICE: on the listen step and again on the reflect
   * step. Still `string | null`, unlike the arrays above, because a question
   * is one sentence and its absence is a real branch — there is no question
   * to show rather than an empty list of them.
   *
   * Null until the spreadsheet supplies it — the prototype wrote nine per-card
   * variants and no exercise-level one.
   */
  question: string | null;
  imageAlt: string;
}

/**
 * A card carries its FEELING and nothing else that reads.
 *
 * The listening instruction and the question moved to the exercise, and the
 * track moved to the (exercise, card) pair. Card 3 is Anger in every exercise;
 * what it sounds like, and what you are asked about it, are not the card's to
 * say.
 */
export interface Card {
  id: string;
  code: string;
  imageUrl: string | null;
  sort: number;
  feeling: string;
  /** Always null today: the source carries no per-card alt text. */
  imageAlt: string | null;
}

/* ── Translation selection ────────────────────────────────────────────────*/

interface Translated {
  locale: string;
}

/**
 * Pick the row for `locale`, else the English one.
 *
 * Returns null when there is no translation at all, which is a different
 * failure from a missing German one: there is nothing to render, so the caller
 * drops the record rather than putting `undefined` on screen.
 */
export function pickTranslation<T extends Translated>(
  rows: T[] | null | undefined,
  locale: Locale,
  table: string,
  id: string,
): T | null {
  const exact = rows?.find((row) => row.locale === locale);
  if (exact !== undefined) return exact;

  const english = rows?.find((row) => row.locale === 'en');
  if (english !== undefined) {
    /* Never silent. Table, id, and the locale that was missing. */
    console.warn(
      `[musie] ${table}: no "${locale}" translation for id="${id}" — falling back to "en"`,
    );
    return english;
  }

  console.error(
    `[musie] ${table}: NO translation for id="${id}" in "${locale}" or "en" — record dropped`,
  );
  return null;
}

/** Both locales worth asking for: the active one, and English to fall back to. */
function wanted(locale: Locale): Locale[] {
  return locale === 'en' ? ['en'] : [locale, 'en'];
}

function fail(table: string, message: string): never {
  throw new Error(`[musie] could not load ${table}: ${message}`);
}

/* ── Queries ──────────────────────────────────────────────────────────────*/

export async function getUserTypes(locale: Locale): Promise<UserType[]> {
  const { data, error } = await getSupabase()
    .from('user_types')
    .select('id, implemented, image_url, sort, user_type_i18n(locale, label, image_alt)')
    .in('user_type_i18n.locale', wanted(locale))
    .order('sort');

  if (error !== null) fail('user_types', error.message);

  return (data ?? []).flatMap((row) => {
    const text = pickTranslation(row.user_type_i18n, locale, 'user_type_i18n', row.id);
    if (text === null) return [];
    return [{
      id: row.id,
      implemented: row.implemented,
      imageUrl: row.image_url,
      sort: row.sort,
      label: text.label,
      imageAlt: text.image_alt,
    }];
  });
}

/* ONE STRING LITERAL, NOT A CONCATENATION. supabase-js parses this select at
   the TYPE level to infer the row shape, and TypeScript does not fold `'a' +
   'b'` into a literal type — so splitting this across a `+` degrades the
   result to GenericStringError and every field access becomes an error. */
// prettier-ignore
const EXERCISE_SELECT = 'id, timeframe_min, timeframe_max, needs_cards, needs_sound, image_url, implemented, sort, listen_gate_seconds, exercise_i18n(locale, name, description, needs, duration_label, intro_text, scan_text, listen_text, reflect_text, question, image_alt)';

interface ExerciseRow {
  id: string;
  timeframe_min: number;
  timeframe_max: number;
  needs_cards: boolean;
  needs_sound: boolean;
  image_url: string | null;
  implemented: boolean;
  sort: number;
  listen_gate_seconds: number;
  exercise_i18n: {
    locale: string;
    name: string;
    description: string;
    needs: string | null;
    duration_label: string | null;
    intro_text: string[] | null;
    scan_text: string[] | null;
    listen_text: string[] | null;
    reflect_text: string[] | null;
    question: string | null;
    image_alt: string;
  }[];
}

function toExercise(row: ExerciseRow, locale: Locale): Exercise[] {
  const text = pickTranslation(row.exercise_i18n, locale, 'exercise_i18n', row.id);
  if (text === null) return [];
  return [{
    id: row.id,
    timeframeMin: row.timeframe_min,
    timeframeMax: row.timeframe_max,
    needsCards: row.needs_cards,
    needsSound: row.needs_sound,
    imageUrl: row.image_url,
    implemented: row.implemented,
    sort: row.sort,
    listenGateSeconds: row.listen_gate_seconds,
    name: text.name,
    description: text.description,
    needs: text.needs,
    durationLabel: text.duration_label,
    /* ?? [] is the whole of the null-versus-empty decision: it happens once,
       here, so no screen ever sees the nullable column. */
    introText: text.intro_text ?? [],
    scanText: text.scan_text ?? [],
    listenText: text.listen_text ?? [],
    reflectText: text.reflect_text ?? [],
    question: text.question,
    imageAlt: text.image_alt,
  }];
}

export async function getExercises(locale: Locale): Promise<Exercise[]> {
  const { data, error } = await getSupabase()
    .from('exercises')
    .select(EXERCISE_SELECT)
    .in('exercise_i18n.locale', wanted(locale))
    .order('sort');

  if (error !== null) fail('exercises', error.message);

  return (data ?? []).flatMap((row) => toExercise(row, locale));
}

/** Null when there is no such exercise, which is a 404 rather than an error. */
export async function getExercise(id: string, locale: Locale): Promise<Exercise | null> {
  const { data, error } = await getSupabase()
    .from('exercises')
    .select(EXERCISE_SELECT)
    .in('exercise_i18n.locale', wanted(locale))
    .eq('id', id)
    .maybeSingle();

  if (error !== null) fail(`exercises (id=${id})`, error.message);
  if (data === null) return null;

  return toExercise(data, locale)[0] ?? null;
}

const CARD_SELECT = 'id, code, image_url, sort, card_i18n(locale, feeling, image_alt)';

interface CardRow {
  id: string;
  code: string;
  image_url: string | null;
  sort: number;
  card_i18n: {
    locale: string;
    feeling: string;
    image_alt: string | null;
  }[];
}

function toCard(row: CardRow, locale: Locale): Card[] {
  const text = pickTranslation(row.card_i18n, locale, 'card_i18n', row.id);
  if (text === null) return [];
  return [{
    id: row.id,
    code: row.code,
    imageUrl: row.image_url,
    sort: row.sort,
    feeling: text.feeling,
    imageAlt: text.image_alt,
  }];
}

export async function getCards(locale: Locale): Promise<Card[]> {
  const { data, error } = await getSupabase()
    .from('cards')
    .select(CARD_SELECT)
    .in('card_i18n.locale', wanted(locale))
    .order('sort');

  if (error !== null) fail('cards', error.message);

  return (data ?? []).flatMap((row) => toCard(row, locale));
}

/** One card, by id. What the session screen reads back from `sessions.card_id`. */
export async function getCard(id: string, locale: Locale): Promise<Card | null> {
  const { data, error } = await getSupabase()
    .from('cards')
    .select(CARD_SELECT)
    .in('card_i18n.locale', wanted(locale))
    .eq('id', id)
    .maybeSingle();

  if (error !== null) fail(`cards (id=${id})`, error.message);
  if (data === null) return null;

  return toCard(data, locale)[0] ?? null;
}

/**
 * The recording, and the four columns of it the client is allowed to have.
 *
 * `title` and `artist` are NOT GRANTED AT ALL — naming either here does not
 * return null, it fails the whole request with 42501. That is the design: the
 * premise of the exercise is a listener who has not been primed by the track
 * name, and the reveal is E.5's own function. The same four columns the diary
 * reads, for the same reason and documented at `DiaryTrack`.
 */
export interface Track {
  id: string;
  /** Repo-relative, as the seed stores it. `trackUrl` in diary.ts resolves it. */
  src: string;
  durationSeconds: number;
  licenceRef: string | null;
}

/**
 * WHICH RECORDING PLAYS, for an (exercise, card) pair.
 *
 * Two tables, and the split is the point: `tracks` is the recording, stored
 * once and licensed once; `exercise_tracks` says when it plays. So this reads
 * the PAIRING and embeds the recording, rather than looking a track up by card.
 *
 * `cardId` is nullable because a cardless exercise has its own track — one
 * pairing row with a null `card_id`, under `unique nulls not distinct`. Null
 * therefore has to be matched with `is`, not `eq`: PostgREST's `eq.null`
 * compares with `=`, which is never true of NULL in SQL and would silently
 * return nothing for exactly the exercises this branch exists for.
 *
 * Null for "no pairing row", which is ORDINARY today: Breathing Score and Body
 * Scan Soundwalk both need sound, draw no card, and the source has no file for
 * either. The listen step renders its no-recording line rather than an error.
 */
export async function getTrackFor(
  exerciseId: string,
  cardId: string | null,
): Promise<Track | null> {
  const query = getSupabase()
    .from('exercise_tracks')
    .select('track_id, tracks(id, src, duration_seconds, licence_ref)')
    .eq('exercise_id', exerciseId);

  const { data, error } = await (cardId === null
    ? query.is('card_id', null)
    : query.eq('card_id', cardId)
  ).maybeSingle();

  if (error !== null) fail(`exercise_tracks (${exerciseId}, ${cardId ?? 'null'})`, error.message);
  if (data === null) return null;

  /* PostgREST returns an OBJECT for a to-one embed and an ARRAY for a to-many
     one, and supabase-js's inference reads the generated relationship rather
     than the shape on the wire — the same trap diary.ts documents at
     `Embedded<T>`. Collapsed here, at the boundary. */
  const embed = data.tracks as unknown;
  const track = (Array.isArray(embed) ? embed[0] : embed) as Track & {
    duration_seconds: number;
    licence_ref: string | null;
  } | null | undefined;

  if (track === null || track === undefined) return null;

  return {
    id: track.id,
    src: track.src,
    durationSeconds: track.duration_seconds,
    licenceRef: track.licence_ref,
  };
}

/**
 * The scan step's lookup: `code` is what the QR on the paper card carries.
 *
 * Deliberately does NOT join `tracks`. A track belongs to an (exercise, card)
 * PAIR, so a card alone cannot name one — and `title` and `artist` are answers
 * the client is not granted at all, so the reveal needs its own call, designed
 * with the reveal.
 */
export async function getCardByCode(code: string, locale: Locale): Promise<Card | null> {
  const { data, error } = await getSupabase()
    .from('cards')
    .select(CARD_SELECT)
    .in('card_i18n.locale', wanted(locale))
    .eq('code', code)
    .maybeSingle();

  if (error !== null) fail(`cards (code=${code})`, error.message);
  if (data === null) return null;

  return toCard(data, locale)[0] ?? null;
}
