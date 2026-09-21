/**
 * The diary — its two reads, and the pure parts the two screens share.
 *
 * It follows content.ts's rules rather than restating them:
 *
 *   1. SCREENS NEVER SEE THE JOIN. A `sessions` row arrives joined to
 *      `exercises` and `cards`, each of those joined to its own `_i18n`
 *      table; what leaves this module is `entry.exerciseName` and
 *      `entry.cardFeeling`. Three tables of column spellings stop here.
 *
 *   2. A MISSING TRANSLATION IS NEVER SILENT. `pickTranslation` is IMPORTED
 *      from content.ts, not copied: a second copy is a second place for the
 *      warning to be deleted from, and the warning is the rule.
 *
 * ── A QUERY, NOT A VIEW ────────────────────────────────────────────────────
 * The obvious alternative is a `public.diary` view. It would need its own
 * grant, its own `security_invoker = on` so RLS still applies as the caller,
 * and its own row in the security tests — for one caller and no reuse. The
 * join below is two embeds deep and costs none of that.
 *
 * ── NO user_id FILTER, ON PURPOSE ──────────────────────────────────────────
 * `sessions_select_own` already restricts every row to `auth.uid()`, and
 * `reflections_select_own` follows the session. Repeating the filter in the
 * client would read as the access model while the real one lives in the
 * policy — and the day the two disagree, the client's copy is the one that
 * looks authoritative and is wrong. Rule 3's corollary: an empty diary is a
 * missing policy or a missing grant, never something to paper over here.
 *
 * ── WHAT `status <> 'started'` MEANS, AND WHERE IT STOPPED APPLYING ────────
 * A running session is not a diary entry; it is the session you are in, and
 * it lives at /session/:id/:step. THE LIST still excludes it, so a run in
 * progress never appears as history.
 *
 * THE ENTRY READ NO LONGER FILTERS IT OUT, and the asymmetry is the decision.
 * Deep-linking a running session's id used to land on "this diary entry does
 * not exist" — true of the diary, and useless to the person holding the link:
 * the session exists, it is theirs, and the nav drawer is already offering
 * that same session as *Continue session*. So the read reports it as what it
 * is, `{ kind: 'running' }`, and the screen redirects into the session at the
 * step it is actually on.
 *
 * A filter could not do that. It returns nothing, and nothing cannot tell
 * "there is no such row" apart from "this one is not history yet" — the
 * caller would have to ask a second time, without the filter, to find out.
 *
 * The status is still NARROWED rather than trusted: 'started' is the only
 * non-terminal value `sessions_status_check` allows, and any other value is
 * dropped exactly as before.
 *
 * An ABANDONED one is the opposite case: it IS an entry, marked unfinished
 * (D7). A diary that recorded only completions would be a diary that
 * flatters, which is the same argument the migration makes for keeping the
 * status at all.
 */
import { getSupabase } from './supabase';
import { pickTranslation } from './content';
import { isStepId } from '../routeHandle';
import type { StepId } from '../routeHandle';
import { INTL_LOCALES } from '../i18n';
import type { Locale, MessageKey } from '../i18n';
import type { SessionStatus } from './sessionMachine';

/* ── Shapes the screens see ────────────────────────────────────────────────*/

/**
 * The two TERMINAL statuses, derived from the state machine's own union
 * rather than written out again. `Exclude` and not a fresh `'finished' |
 * 'abandoned'`: the day a fourth status lands, this line is where the diary
 * has to decide whether it is history or not, and a hand-written copy would
 * simply not mention it.
 */
export type DiaryStatus = Exclude<SessionStatus, 'started'>;

export interface DiaryEntry {
  id: string;
  status: DiaryStatus;
  /** Where the run got to. For an abandoned entry this is what it stopped at. */
  step: StepId;
  startedAt: string;
  /**
   * `string | null`, although `sessions_ended_at_matches_status` guarantees a
   * terminal row HAS one. The generated type is nullable because the column
   * is, and the honest way to consume a constraint the type system cannot see
   * is a total function over the nullable value — `durationMinutes` returns
   * null — rather than an `as string` that asserts the same thing while
   * hiding the day the constraint changes.
   */
  endedAt: string | null;
  exerciseName: string;
  /**
   * The exercise's own description, in the active locale.
   *
   * ON `DiaryEntry`, AND SO IN BOTH SELECTS, although only the entry page
   * draws it. The two alternatives are worse: a second `pickTranslation` in
   * the detail read would WARN A SECOND TIME about the same missing
   * translation, and a generic over the i18n row shape would buy one pick with
   * two column lists at the price of a type nobody can read. One paragraph on
   * the wire for a list that ignores it is the cheap option, and it keeps one
   * row shape and one pick.
   */
  exerciseDescription: string;
  /** Null when the exercise drew no card, which two of the three do not. */
  cardFeeling: string | null;
}

export interface DiaryReflection {
  /** 'text' or 'voice'. A voice answer is stored as its transcript. */
  mode: string;
  body: string;
}

/**
 * What the client is ALLOWED to know about a track — four columns, and the
 * list is not a preference.
 *
 * `20260918150500_content_schema.sql` revokes `public.tracks` and grants back
 * `id, src, duration_seconds, licence_ref`. `title` and `artist` are not
 * granted AT ALL, so naming either in the select fails the whole request with
 * insufficient privilege; it does not come back null. That is the shape of the
 * diary's offer: the recording, handed back, by a screen that cannot say what
 * it was — which is why `diary.listenAgain` names the action and no title
 * appears beside it. Naming it needs E.5's reveal function.
 */
export interface DiaryTrack {
  id: string;
  /** Object key in the private `tracks` bucket, or NULL where there is no
   *  recording. `useTrackSource` in lib/audio.ts signs it. */
  src: string | null;
  durationSeconds: number;
  licenceRef: string | null;
}

export interface DiaryEntryDetail extends DiaryEntry {
  reflection: DiaryReflection | null;
  /**
   * What played, when anything did. NULL FOR EVERY ROW TODAY: no session
   * writes `track_id` yet and there are no audio files (E.4), so the screen's
   * track block does not render at all. That is the honest state — an absent
   * control says nothing, where a disabled one promises a recording that is
   * not there.
   */
  track: DiaryTrack | null;
}

/** A session that is still running: not history, but somewhere to go. */
export interface RunningSession {
  id: string;
  step: StepId;
}

/**
 * What the entry read finds at an id: an entry, or a session in progress.
 * Nothing at all is `null`, outside the union, because it is the absence of
 * both rather than a third kind of thing.
 *
 * A DISCRIMINATED UNION and not two nullable fields: exactly one of the two is
 * ever true, and a screen handed both can forget one and still typecheck.
 */
export type DiaryEntryView =
  | { kind: 'entry'; entry: DiaryEntryDetail }
  | { kind: 'running'; session: RunningSession };

/* ── The pure parts ───────────────────────────────────────────────────────*/

/**
 * How long the session took, in whole minutes, or null when that cannot be
 * said.
 *
 * NEVER ZERO. `Math.round` alone renders a 20-second session as "0 min",
 * which reads as "this did not happen" about something that did. The floor of
 * one minute is a rounding decision about copy, and it belongs here with the
 * arithmetic rather than in each screen that shows the number.
 *
 * Null covers the three cases where a number would be a lie: no end time, an
 * unparseable timestamp, and an end before the start. Null renders as
 * nothing, and nothing is the correct rendering of "we cannot say".
 */
export function durationMinutes(startedAt: string, endedAt: string | null): number | null {
  if (endedAt === null) return null;

  const from = Date.parse(startedAt);
  const to = Date.parse(endedAt);
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  if (to < from) return null;

  return Math.max(1, Math.round((to - from) / 60_000));
}

/* ── G.1 · THE TIMELINE AT A MONTH'S SCALE ────────────────────────────────
 *
 * The diary used to group by calendar day and nothing else. At ten entries
 * that is the right picture; at three hundred it is three hundred headings,
 * most of them over a single row, and the screen becomes a list of dates with
 * the sessions hidden between them.
 *
 * So the grouping now has TWO resolutions, and how long ago an entry was
 * decides which one it gets:
 *
 *   the last seven days   one group per DAY    'Today', 'Friday 18 September'
 *   anything older        one group per MONTH  'September 2026'
 *
 * Seven is `DAY_SCALE_DAYS` below. A week is the window in which a person
 * still remembers a session as *a day* — "the one on Tuesday" — and past it
 * they remember it as *a month*, which is the resolution the heading should
 * then offer. It also bounds the screen: at most seven day headings, one per
 * month after that, whatever the diary holds.
 *
 * THE CURRENT MONTH IS THEREFORE SPLIT, and that is the design rather than an
 * oversight: on the 20th, the 19th is 'Yesterday' and the 3rd sits under
 * 'September 2026'. The alternative — day resolution for the whole current
 * month — puts thirty-one headings on the screen on the 31st, which is the
 * thing this change exists to stop.
 */

export type DiaryPeriodKind = 'day' | 'month';

export interface DiaryPeriod<T> {
  /** Stable identity — `2026-09-19` for a day, `2026-09` for a month. */
  key: string;
  kind: DiaryPeriodKind;
  /** The first entry's timestamp, for the screen to format as the heading. */
  date: string;
  /**
   * Whole local days back from today: 0 is today, 1 is yesterday. Null on a
   * month period, and on a day period far enough back to have no name.
   *
   * A NUMBER rather than a ready-made label, because the label is copy:
   * 'Today' and 'Heute' are catalogue strings and this module holds no `t`.
   * The same boundary that keeps `formatDay` out of the design system keeps
   * the word out of here.
   */
  dayOffset: number | null;
  entries: T[];
}

/** How far back the day headings reach. Past this, a month heading. */
export const DAY_SCALE_DAYS = 7;

/**
 * The LOCAL calendar day an instant falls in.
 *
 * Built from the local getters, NOT from `toISOString().slice(0, 10)`: a
 * session started at 00:30 in Berlin is a UTC date of the previous day, and a
 * diary that filed it under yesterday would be wrong about the one thing a
 * diary is for. The day boundary a person means is the one their device is in.
 */
function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The same, one resolution up. `2026-09`. */
function localMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Whole local days between two instants, counted in CALENDAR days rather than
 * in elapsed milliseconds.
 *
 * Both sides are flattened to their local midnight first, so "yesterday" means
 * the day before this one and not "between 24 and 48 hours ago" — a session at
 * 23:00 and one at 01:00 are one day apart on the wall clock and two hours
 * apart by subtraction.
 *
 * `Math.round` over the midnight difference rather than a plain division,
 * because a DST day is 23 or 25 hours long: dividing by 86 400 000 across the
 * March change gives 0.958 of a day, and `Math.floor` would report the day
 * before yesterday as yesterday, twice a year.
 */
function dayOffset(now: Date, when: Date): number {
  const midnight = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((midnight(now) - midnight(when)) / 86_400_000);
}

/**
 * Group entries into day periods for the last week and month periods before
 * that, in the order they arrive.
 *
 * IT DOES NOT SORT. The query orders by `started_at desc`, which the
 * `sessions (user_id, started_at desc)` index answers without a sort step; a
 * client-side re-sort would be a second, weaker statement of the same
 * ordering, and the two can disagree the day the query changes. So the periods
 * come out newest-first because the rows do, and each holds its own rows in
 * the order they arrived.
 *
 * `now` is a parameter with a default rather than a `new Date()` buried in the
 * body, because "today" is the one input here that a fixture cannot otherwise
 * pin down — and a test that has to wait for midnight is a test that fails
 * once a year on somebody else's machine.
 */
export function groupByPeriod<T extends { startedAt: string }>(
  entries: readonly T[],
  now: Date = new Date(),
): DiaryPeriod<T>[] {
  const periods: DiaryPeriod<T>[] = [];
  const byKey = new Map<string, DiaryPeriod<T>>();

  for (const entry of entries) {
    const when = new Date(entry.startedAt);
    const offset = dayOffset(now, when);

    /* A FUTURE timestamp — a device an hour ahead, a clock corrected after
       the fact — is a negative offset, and it takes day resolution rather
       than falling through to a month heading. It is still the newest thing
       in the diary, and `< DAY_SCALE_DAYS` says that without a second test. */
    const isDay = offset < DAY_SCALE_DAYS;

    const key = isDay ? localDayKey(when) : localMonthKey(when);
    const existing = byKey.get(key);
    if (existing !== undefined) {
      existing.entries.push(entry);
      continue;
    }

    const period: DiaryPeriod<T> = {
      key,
      kind: isDay ? 'day' : 'month',
      date: entry.startedAt,
      /* Only today and yesterday have names. Two days back is a weekday, and
         a weekday is a format rather than a word the catalogue holds. */
      dayOffset: isDay && offset >= 0 && offset <= 1 ? offset : null,
      entries: [entry],
    };
    byKey.set(key, period);
    periods.push(period);
  }

  return periods;
}

/* ── G.1 · FILTERING ──────────────────────────────────────────────────────*/

/**
 * What the diary can be narrowed to.
 *
 * The axis is STATUS, and the other candidate was the exercise. Status is the
 * question a long diary actually raises — *did I leave anything unfinished?* —
 * and every row already carries the column that answers it. An exercise filter
 * needs a list that grows with the content: three segments today and eleven
 * once the Mindfulness Cards spreadsheet lands, which is past the point where
 * `SegmentedControl` is the right component at all (its own header says 2–4).
 *
 * 'all' is a MEMBER of the union rather than `DiaryFilter | null`, because the
 * control always has exactly one of three answers selected, and a null would
 * make "showing everything" indistinguishable from "nothing chosen yet".
 */
export type DiaryFilter = 'all' | DiaryStatus;

/** The order the segments are drawn in. Widest first. */
export const DIARY_FILTERS: readonly DiaryFilter[] = ['all', 'finished', 'abandoned'];

/** Narrowing for the component callback, which hands back a bare string. */
export function isDiaryFilter(value: string): value is DiaryFilter {
  return (DIARY_FILTERS as readonly string[]).includes(value);
}

/**
 * The filter, applied. A copy on BOTH branches, so a caller is never handed
 * the array it passed in on one and a new one on the other — the kind of
 * asymmetry that makes an identity check in a consumer accidentally load
 * bearing.
 */
export function filterByStatus<T extends { status: DiaryStatus }>(
  entries: readonly T[],
  filter: DiaryFilter,
): T[] {
  if (filter === 'all') return [...entries];
  return entries.filter((entry) => entry.status === filter);
}

/**
 * How long the diary has to be before the filter is drawn at all.
 *
 * A filter makes a long list shorter, and on day one there is no list to
 * shorten: three segments over two rows would be chrome explaining itself.
 * Five is where the run stops fitting under the latest entry's card on a
 * phone — a judgement rather than a measurement, kept as ONE constant so
 * moving it is a one-line change. Logged in OPEN-QUESTIONS.md.
 */
export const FILTER_FROM_ENTRIES = 5;

/**
 * The schema's step id, as a catalogue key.
 *
 * A fixed relation between two vocabularies that are deliberately NOT the
 * same one: `sessions.step` holds English slugs under a check constraint, and
 * the catalogue holds their display names per locale. Written once, here,
 * because both diary screens need it — and as a `Record<StepId, …>`, so
 * adding a fifth step to STEP_IDS fails the typecheck instead of rendering a
 * raw slug at somebody.
 */
const STEP_MESSAGE_KEY: Record<StepId, MessageKey> = {
  intro: 'session.step.intro',
  scan: 'session.step.scan',
  listen: 'session.step.listen',
  reflect: 'session.step.reflect',
};

export function stepMessageKey(step: StepId): MessageKey {
  return STEP_MESSAGE_KEY[step];
}

/* ── Two URLs, both built here ────────────────────────────────────────────*/

/**
 * Where a running session lives.
 *
 * Here rather than inline in the screen for the reason Diary.tsx's row link is
 * `encodeURIComponent`'d: a path built by concatenation is exactly the kind of
 * thing that works until the day it is handed an id with a slash in it. Here it
 * is also TESTED, and there is one spelling of the session URL for the
 * redirect and for whatever offers to resume next.
 *
 * The step is a `StepId`, so it needs no encoding — the four ids are bare
 * ASCII words, and `sessionLoader` validates whatever arrives in any case.
 */
export function sessionPath(session: RunningSession): string {
  return `/session/${encodeURIComponent(session.id)}/${session.step}`;
}

/**
 * The URL an `<audio>` element can load a track from.
 *
 * `tracks.src` is stored REPO-RELATIVE — 'assets/audio/mc-01-joy.mp3' — and
 * the app serves `apps/web/public/assets/**` at `/assets
/* ── Dates on screen ──────────────────────────────────────────────────────*/

/**
 * Timeline never formats a date — by design, because formatting one is locale
 * work and the design system holds no locale. So it happens here, in the app,
 * against the ACTIVE locale, where the point separating `19. September` from
 * `19 September` is exactly the kind of detail `Intl` owns and a hand-rolled
 * formatter gets wrong.
 *
 * `INTL_LOCALES[locale]`, NOT `locale`. A bare `'en'` resolves to en-US and
 * renders "September 19, 2026 at 2:32 PM" — month-first and a 12-hour clock,
 * neither of which matches the British English the catalogue is written in or
 * the German column beside it. See the map's comment in i18n/index.ts.
 *
 * ── THREE FORMATS, ONE PER RESOLUTION — G.1 ───────────────────────────────
 * The heading says as much as its period knows and no more, so the three are
 * not one function with options:
 *
 *   formatRecentDay   a day inside the last week: 'Friday 18 September'
 *   formatMonth       everything older, one heading a month: 'September 2026'
 *   formatDateTime    one entry, to the minute, on the entry card
 *
 * NO YEAR on a recent day, and that is the opposite of what this file used to
 * say. The old `formatDay` carried `dateStyle: 'long'` with the note that "a
 * diary outlives a year, and a heading that reads '14 September' in two
 * consecutive Septembers is a heading that lies once a year". True of a day
 * heading that could be any day; not true of this one, which by construction
 * is inside the last seven days and therefore cannot be last year's. The
 * WEEKDAY is what a person recognises a recent session by, and it is what the
 * year's characters are spent on instead.
 *
 * The year has not gone anywhere, either: every heading older than the week is
 * a month heading, and `formatMonth` carries it.
 *
 * 'Today' and 'Yesterday' are NOT here. They are copy, they live in the
 * catalogue in both languages, and the screen picks them off `dayOffset`
 * before it reaches either of these.
 */
export function formatRecentDay(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso));
}

/** One heading a month, for everything past the week. 'September 2026'. */
export function formatMonth(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    year: 'numeric',
    month: 'long',
  }).format(new Date(iso));
}

/** The entry page says when, to the minute: the date plus the clock time. */
export function formatDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(iso));
}

/* ── Queries ──────────────────────────────────────────────────────────────*/

/**
 * Both locales worth asking for in one round trip: the active one, and
 * English to fall back to.
 *
 * content.ts has this function and does not export it. `pickTranslation` IS
 * exported and is imported above, because the warning it carries is the rule
 * that must not be copied; this is four tokens with no behaviour to drift, so
 * repeating it costs less than widening another module's surface to share it.
 * If the fallback ever stops being "and English", both call sites have to be
 * found — and the grep for `wanted(` finds them.
 */
function wanted(locale: Locale): Locale[] {
  return locale === 'en' ? ['en'] : [locale, 'en'];
}

/* ONE STRING LITERAL, NOT A CONCATENATION — the same trap content.ts
   documents: supabase-js parses this select at the TYPE level, and TypeScript
   does not fold `'a' + 'b'` into a literal type, so a split select degrades
   the row to GenericStringError and every field access below becomes an
   error. */
// prettier-ignore
const ENTRY_SELECT = 'id, status, step, started_at, ended_at, exercises(id, exercise_i18n(locale, name, description)), cards(id, card_i18n(locale, feeling))';

// prettier-ignore
/* `tracks(id, src, duration_seconds, licence_ref)` AND NOT ONE COLUMN MORE.
   Adding `title` or `artist` here does not return null for them — it fails
   the request outright with 42501, and the screen shows its error state for
   what is really a grant the client was never given. See DiaryTrack. */
// prettier-ignore
const DETAIL_SELECT = 'id, status, step, started_at, ended_at, exercises(id, exercise_i18n(locale, name, description)), cards(id, card_i18n(locale, feeling)), reflections(mode, body), tracks(id, src, duration_seconds, licence_ref)';

/**
 * ONE EMBED, TWO SHAPES, AND BOTH HAVE TO BE ACCEPTED.
 *
 * PostgREST returns an OBJECT for a to-one embed and an ARRAY for a to-many
 * one. `sessions.exercise_id` is a plain foreign key, so `exercises` arrives
 * as an object — but supabase-js's type inference reads `isOneToOne: false`
 * off the generated relationship and types it as an array. MEASURED, not
 * assumed: typing it as an object alone fails `tsc`.
 *
 * So the row types say "either", and `one()` collapses it at the boundary.
 * The alternative is `as unknown as` over the whole row, which would silence
 * this and every other shape error in the same breath — including the day a
 * column is renamed.
 */
type Embedded<T> = T | T[] | null;

function one<T>(embed: Embedded<T> | undefined): T | null {
  if (embed === null || embed === undefined) return null;
  return Array.isArray(embed) ? embed[0] ?? null : embed;
}

interface SessionRow {
  id: string;
  status: string;
  step: string;
  started_at: string;
  ended_at: string | null;
  exercises: Embedded<{
    id: string;
    exercise_i18n: { locale: string; name: string; description: string }[];
  }>;
  cards: Embedded<{ id: string; card_i18n: { locale: string; feeling: string }[] }>;
}

/**
 * `reflections` is at most one row today, because of the
 * `reflections_one_per_session` unique — which the migration says is
 * TEMPORARY and will be dropped once one answer per mode ships. `one()`
 * taking the first of an array is what keeps that drop a change in how many
 * answers are shown rather than in whether any appears at all.
 */
interface DetailRow extends SessionRow {
  reflections: Embedded<DiaryReflection>;
  tracks: Embedded<{
    id: string;
    src: string;
    duration_seconds: number;
    licence_ref: string | null;
  }>;
}

/** Column spellings stop here, like every other join in this module. */
function toTrack(embed: DetailRow['tracks']): DiaryTrack | null {
  const track = one(embed);
  if (track === null) return null;
  return {
    id: track.id,
    src: track.src,
    durationSeconds: track.duration_seconds,
    licenceRef: track.licence_ref,
  };
}

function fail(what: string, message: string): never {
  throw new Error(`[musie] could not load ${what}: ${message}`);
}

/**
 * NARROWING, NOT VALIDATION — the same move readActiveSession makes, for the
 * same reason. Both columns carry check constraints, so neither branch below
 * is reachable through the database; they exist because the GENERATED type is
 * `string`, and the alternative is a cast that asserts exactly this while
 * also hiding the day somebody widens a constraint.
 *
 * A row that fails either is DROPPED rather than guessed at. This is history:
 * an entry whose status nobody can read is one we cannot honestly label, and
 * an invented label is worse than a missing row on a screen that has a real
 * empty state.
 */
function toEntry(row: SessionRow, locale: Locale): DiaryEntry[] {
  if (row.status !== 'finished' && row.status !== 'abandoned') {
    console.error(`[musie] session ${row.id} has status "${row.status}" — entry dropped`);
    return [];
  }
  if (!isStepId(row.step)) {
    console.error(`[musie] session ${row.id} has step "${row.step}" — entry dropped`);
    return [];
  }

  /* `exercise_id` is NOT NULL and RESTRICTed, so a missing embed is not a
     retired exercise — it is a join that returned nothing, which today means
     a missing grant or policy on the content tables. Loud, and dropped. */
  const exercise = one(row.exercises);
  if (exercise === null) {
    console.error(`[musie] session ${row.id} joined no exercise — entry dropped`);
    return [];
  }

  const name = pickTranslation(
    exercise.exercise_i18n, locale, 'exercise_i18n', exercise.id,
  );
  if (name === null) return [];

  /* A null card is ORDINARY: two of the three exercises draw none, and
     `card_id` is SET NULL so a retired card leaves the entry standing. Only a
     card that exists and has no translation at all is a problem, and
     pickTranslation has already said so by the time we read null here. */
  const card = one(row.cards);
  const feeling = card === null
    ? null
    : pickTranslation(card.card_i18n, locale, 'card_i18n', card.id)?.feeling ?? null;

  return [{
    id: row.id,
    status: row.status,
    step: row.step,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    exerciseName: name.name,
    exerciseDescription: name.description,
    cardFeeling: feeling,
  }];
}

export async function readDiary(locale: Locale): Promise<DiaryEntry[]> {
  const { data, error } = await getSupabase()
    .from('sessions')
    .select(ENTRY_SELECT)
    .in('exercises.exercise_i18n.locale', wanted(locale))
    .in('cards.card_i18n.locale', wanted(locale))
    .neq('status', 'started')
    .order('started_at', { ascending: false });

  if (error !== null) fail('the diary', error.message);

  return (data ?? []).flatMap((row) => toEntry(row, locale));
}

/**
 * What is at this id: an entry, a session still running, or nothing.
 *
 * NO `neq('status', 'started')` — see the header. Nothing at this id is `null`
 * and is a 404 rather than an error: either there is no such session, or it is
 * not this person's, and RLS makes those two indistinguishable on purpose.
 */
export async function readDiaryEntry(
  id: string,
  locale: Locale,
): Promise<DiaryEntryView | null> {
  const { data, error } = await getSupabase()
    .from('sessions')
    .select(DETAIL_SELECT)
    .in('exercises.exercise_i18n.locale', wanted(locale))
    .in('cards.card_i18n.locale', wanted(locale))
    .eq('id', id)
    .maybeSingle();

  if (error !== null) fail(`diary entry ${id}`, error.message);
  if (data === null) return null;

  const row: DetailRow = data;

  /* STILL RUNNING: not history, and not a 404 either. It is reported with the
     step it is actually on, so the caller can send the person into their own
     session instead of telling them it does not exist.

     The step is NARROWED here rather than trusted, the same rule toEntry
     applies — and a step nobody can read is a step nobody can route on, so it
     is dropped to the 404 instead of being guessed at. `sessionLoader` would
     forgive a bad step by sending it to intro; guessing here would mean
     REPORTING a step this row does not have, which is a different thing. */
  if (row.status === 'started') {
    if (!isStepId(row.step)) {
      console.error(`[musie] session ${row.id} has step "${row.step}" — cannot resume`);
      return null;
    }
    return { kind: 'running', session: { id: row.id, step: row.step } };
  }

  const entry = toEntry(row, locale)[0];
  /* Undefined here is a row that arrived and could not be read — already
     logged by toEntry. To the screen it is the same 404: there is nothing to
     show, and an error banner would blame the network for a data problem. */
  if (entry === undefined) return null;

  return {
    kind: 'entry',
    entry: { ...entry, reflection: one(row.reflections), track: toTrack(row.tracks) },
  };
}
