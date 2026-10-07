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

/**
 * What a person is after when they start a session.
 *
 * Three rows — Achtsamkeit stärken, Entspannen, Aufwachen — and the fourth
 * option on screen is not one of them: "Musie entdecken" is the ABSENCE of a
 * goal, so it has no row here and writes null to `sessions.goal_id`. See
 * `lib/goals.ts`, which owns that distinction, and the header of
 * `20261007100100_goals_seed.sql`, which owns the reason.
 *
 * Was `Situation` in the schema until 2026-10-07, and never read by anything.
 */
export interface Goal {
  id: string;
  sort: number;
  label: string;
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
   * two-minute card draw and a fifteen-minute sound journey do not earn the
   * same gate.
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
  /**
   * THE FOUR STEPS' COPY, one Markdown document each, in step order: intro →
   * scan → listen → reflect. Each carries that step's HEADLINE and its
   * DESCRIPTION — Ben, 2026-09-23 — which is why it is one string with a
   * format rather than the `text[]` of paragraphs this replaced: a headline is
   * not a paragraph, and the copy is numbered.
   *
   * What of Markdown actually renders is `lib/markdown.ts`, and the migration
   * that added the columns names that file as the normative statement of it.
   *
   * `string`, NEVER `string | null`. The columns are nullable — three of the
   * five exercises carry no step copy at all — but null and `''` render
   * identically, as nothing, so handing both shapes to every screen would buy
   * a null check with no distinct branch. Coalesced here, at the boundary,
   * with the rest of the column mapping; a screen asks `=== ''`, or simply
   * passes it to `Markdown`.
   */
  introMd: string;
  scanMd: string;
  listenMd: string;
  reflectMd: string;
  /**
   * THE REFLECT FIELD'S PROMPT — this exercise's own questions, shown inside
   * the box they are answered in rather than as body copy above it.
   *
   * `string | null`, AND THE NULL IS KEPT, which is the opposite of the four
   * `*_md` columns directly above. There, null and `''` both render as
   * nothing, so coalescing buys a null check with no branch behind it. Here
   * the two answers are different things: null means this exercise asks
   * nothing specific, and the screen falls back to the catalogue's own
   * sentence — `''` would be a field with no prompt at all.
   *
   * Plain text, never Markdown. A placeholder is an attribute on an <input>,
   * so there is nothing there to render and `##` would reach the reader.
   */
  reflectPlaceholder: string | null;
  imageAlt: string;
  /**
   * The goals this exercise serves — 1..N of them, and the join is read in
   * the same round trip as the row.
   *
   * NOT nullable and not optional: an exercise mapped to no goal is reachable
   * only through "Musie entdecken", which is a real state the seed can be in,
   * so the empty array is the honest answer rather than a missing field.
   */
  goalIds: string[];
}

/**
 * A card carries its FEELING and nothing else that reads.
 *
 * The listening instruction and the question moved to the exercise's own step
 * copy, and the track moved to the (exercise, card) pair. Card 3 is Anger in
 * every exercise; what it sounds like, and what you are asked about it, are
 * not the card's to say.
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

/**
 * The goals, in the order they are offered.
 *
 * Ordered by `sort` rather than by label: the order is a content decision
 * (the schema's `sort integer not null unique`), and sorting by a translated
 * string would put the list in a different order in each locale.
 *
 * "Musie entdecken" is NOT in here. It is the absence of a goal, it has no
 * row, and the picker appends it — see `lib/goals.ts`.
 */
export async function getGoals(locale: Locale): Promise<Goal[]> {
  const { data, error } = await getSupabase()
    .from('goals')
    .select('id, sort, goal_i18n(locale, label)')
    .in('goal_i18n.locale', wanted(locale))
    .order('sort');

  if (error !== null) fail('goals', error.message);

  return (data ?? []).flatMap((row) => {
    const text = pickTranslation(row.goal_i18n, locale, 'goal_i18n', row.id);
    if (text === null) return [];
    return [{
      id: row.id,
      sort: row.sort,
      label: text.label,
    }];
  });
}

/* ONE STRING LITERAL, NOT A CONCATENATION. supabase-js parses this select at
   the TYPE level to infer the row shape, and TypeScript does not fold `'a' +
   'b'` into a literal type — so splitting this across a `+` degrades the
   result to GenericStringError and every field access becomes an error. */
// prettier-ignore
const EXERCISE_SELECT = 'id, timeframe_min, timeframe_max, needs_cards, needs_sound, image_url, implemented, sort, listen_gate_seconds, exercise_i18n(locale, name, description, needs, intro_md, scan_md, listen_md, reflect_md, reflect_placeholder, image_alt), exercise_goals(goal_id)';

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
    intro_md: string | null;
    scan_md: string | null;
    listen_md: string | null;
    reflect_md: string | null;
    reflect_placeholder: string | null;
    image_alt: string;
  }[];
  /* A to-many embed, so PostgREST returns an array — never an object. The
     collapse `getTrackFor` has to perform does not apply here. */
  exercise_goals: { goal_id: string }[];
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
    /* ?? '' is the whole of the null-versus-empty decision: it happens once,
       here, so no screen ever sees the nullable column. */
    introMd: text.intro_md ?? '',
    scanMd: text.scan_md ?? '',
    listenMd: text.listen_md ?? '',
    reflectMd: text.reflect_md ?? '',
    /* NOT coalesced, unlike the four above: null is the answer "this exercise
       has no questions of its own", and the screen has a different thing to
       draw for it. See the field's docblock. */
    reflectPlaceholder: text.reflect_placeholder,
    imageAlt: text.image_alt,
    /* Sorted so two renders of the same row cannot disagree about order —
       PostgREST does not promise one for an embed, and this array reaches a
       `useMemo` dependency in Exercises.tsx. */
    goalIds: row.exercise_goals.map((pair) => pair.goal_id).sort(),
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
  /** Object key in the private `tracks` bucket, or NULL where there is no
   *  recording — which is ordinary: five of the nine cards are silent.
   *  `useTrackSource` in lib/audio.ts turns it into a signed URL. */
  src: string | null;
  durationSeconds: number;
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
 * Null for "no pairing row", which is ORDINARY today: Mindful Breathing, Sound
 * Journey and Body Scan all need sound, draw no card, and there is no file for
 * any of them. The listen step renders its no-recording line rather than an
 * error.
 *
 * NOT null for a SECOND exercise over the same deck. Free Rein draws the same
 * nine cards as Mindful Break and plays the same nine recordings, through nine
 * pairing rows of its own (`20260923150000`) — which is the split working as
 * designed: one row per recording, one pairing row per place it plays.
 */
export async function getTrackFor(
  exerciseId: string,
  cardId: string | null,
): Promise<Track | null> {
  const query = getSupabase()
    .from('exercise_tracks')
    .select('track_id, tracks(id, src, duration_seconds)')
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
  } | null | undefined;

  if (track === null || track === undefined) return null;

  return {
    id: track.id,
    src: track.src,
    durationSeconds: track.duration_seconds,
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
