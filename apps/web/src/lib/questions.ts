/**
 * Which listening question a session gets, and what happens when it does not
 * work.
 *
 * `docs/LISTENING-QUESTION-ITERATION.md` §6 is the specification; this file is
 * it, and §3's decision table is the authority for every choice below.
 *
 * ── THE SPLIT THIS FILE KEEPS ──────────────────────────────────────────────
 * The top half is PURE and tested: given what somebody has already seen, which
 * question is next. The bottom half is the two database reads that supply the
 * arguments and the three writes that record the answer. The rule is a
 * function with a test rather than a condition inside a component, which is
 * the same split `lib/markdown.ts` makes with its block operations.
 */
import { getSupabase } from './supabase';
import {
  QUESTION_ORDER, QUESTION_SETS, questionsDe, questionsEn,
} from '../content/questions';
import type { QuestionId, QuestionText } from '../content/questions';
import type { Locale } from '../i18n';

/* ── The catalogue, resolved ────────────────────────────────────────────────*/

/**
 * The question's three strings in one locale.
 *
 * NO FALLBACK CHAIN, unlike `lib/content.ts`'s `pickTranslation`. That exists
 * because a database row can be missing a translation at runtime; this
 * catalogue cannot — `Record<QuestionId, QuestionText>` makes a missing locale
 * a compile error (`content/questions.ts`). So a locale is a lookup, and the
 * only reachable absence is an id that is not in the set, which is the next
 * function's problem.
 */
export function questionText(id: QuestionId, locale: Locale): QuestionText {
  return (locale === 'de' ? questionsDe : questionsEn)[id];
}

/** The questions an exercise draws, or `[]` for one with no set. */
export function questionsFor(exerciseId: string): readonly QuestionId[] {
  return QUESTION_SETS[exerciseId] ?? [];
}

/**
 * Does this exercise rotate questions at all?
 *
 * The one thing the screens ask before drawing any of the new furniture. False
 * for `breathing-score`, `sound-journey` and `body-scan-soundwalk`, and then
 * every screen falls back to the copy out of `exercise_i18n` exactly as
 * before.
 */
export function hasQuestionSet(exerciseId: string): boolean {
  return questionsFor(exerciseId).length > 0;
}

/**
 * Is this a question the set still contains?
 *
 * `sessions.listening_question_id` has NO foreign key — the catalogue is a
 * repo file (D1) — so a stored id can outlive the question it names. Every
 * read of that column goes through here, and an unknown id is treated as "not
 * in the set": it contributes nothing to the rotation and the screens draw
 * their fallback. The diary is unaffected, because it renders the snapshot in
 * `sessions.listening_question` and never resolves the id.
 */
export function isKnownQuestion(id: string | null): id is QuestionId {
  return id !== null && QUESTION_ORDER.includes(id as QuestionId);
}

/* ── The rotation ───────────────────────────────────────────────────────────*/

/**
 * What the picker needs to know about somebody's history.
 *
 * Both facts come from the caller's own `sessions` rows, so this works across
 * devices for free and needs no new table. `readQuestionHistory` below is the
 * one place either is read.
 */
export interface QuestionHistory {
  /**
   * Questions already used up — shown in a session that reached
   * `status = 'finished'`, **whether or not anything was written** (D3).
   *
   * D3's first answer was the brief's literal wording, "hasn't answered in any
   * reflection". It was revised on 2026-10-11 because spending is the only
   * thing that shrinks the pool: somebody who never writes spends nothing, so
   * `next` would return the lowest-ordered question every session and the
   * tie-breaker could only push it one place along — two questions, forever,
   * with the other three reachable only through the re-roll button.
   *
   * Finishing is therefore what spends a question. The cost, accepted: pressing
   * *Weiter* past an empty answer field uses one up.
   */
  spent: readonly string[];
  /**
   * The question the most recent session used, or null.
   *
   * This is the tie-breaker's whole input (D6), and it still earns its keep
   * under the revised `spent`: an ABANDONED session spends nothing, so without
   * it, abandoning on one question and starting again would serve the same one
   * straight back.
   */
  previous: string | null;
}

/**
 * Pick a question.
 *
 * Three rules, in order:
 *
 *   1. UNSPENT FIRST, in `QUESTION_ORDER`.
 *   2. NEVER THE SAME QUESTION TWICE RUNNING — if rule 1 lands on `previous`,
 *      take the next candidate instead. Only while two or more remain, because
 *      with one candidate the alternative is no question at all.
 *   3. EVERYTHING SPENT → RANDOM, excluding `previous` for the same reason.
 *
 * `exclude` is the re-roll's input: questions turned down in THIS session,
 * which are not spent (they were never finished with) but must not be offered
 * again until *Fragen zurücksetzen*.
 *
 * NULL when there is nothing left to offer, which is a real state and not a
 * failure — it is the dead end §7.4 draws, reached by rejecting everything.
 *
 * `random` is injected so the test can be deterministic. It is the only
 * impurity and it is the caller's.
 */
export function nextQuestion(
  exerciseId: string,
  history: QuestionHistory,
  exclude: readonly string[] = [],
  random: () => number = Math.random,
): QuestionId | null {
  const pool = questionsFor(exerciseId).filter((id) => !exclude.includes(id));
  if (pool.length === 0) return null;

  const unspent = pool.filter((id) => !history.spent.includes(id));

  /* Rules 1 and 2. `unspent` is already in QUESTION_ORDER — `questionsFor`
     returns the set in order and `filter` preserves it — so "lowest-ordered"
     is just the first element. */
  if (unspent.length > 0) {
    const notPrevious = unspent.filter((id) => id !== history.previous);
    return (notPrevious.length > 0 ? notPrevious : unspent)[0] ?? null;
  }

  /* Rule 3. Everything in the pool has been spent, so the brief's "display a
     random one" applies — still never the previous one. */
  const candidates = pool.filter((id) => id !== history.previous);
  const from = candidates.length > 0 ? candidates : pool;
  /* `Math.floor(random() * n)` can reach `n` only if `random()` returns
     exactly 1, which Math.random never does; clamped anyway so an injected
     generator cannot index past the end. */
  return from[Math.min(from.length - 1, Math.floor(random() * from.length))] ?? null;
}

/**
 * Is there anything left to offer instead of the one on screen?
 *
 * What decides between §7.4's second and third button states. True while a
 * re-roll would produce something; false at the dead end, where the button
 * goes disabled and *Fragen zurücksetzen* appears beside it.
 *
 * The question CURRENTLY shown counts as excluded even before it is rejected:
 * offering the question already on the screen is not an offer.
 */
export function canReroll(
  exerciseId: string,
  current: string | null,
  rejected: readonly string[],
): boolean {
  const seen = current === null ? rejected : [...rejected, current];
  return questionsFor(exerciseId).some((id) => !seen.includes(id));
}

/* ── The helper's disclosure, per tab ───────────────────────────────────────*/

/**
 * Whether the `?` has already been pressed for a given question.
 *
 * `sessionStorage`, NOT a column and not component state (D15, §7.3). A
 * disclosure state is not worth a column; component state alone would
 * re-collapse the helper every time the sheet is closed and reopened, which
 * for a one-way reveal reads as the app forgetting.
 *
 * The same choice `lib/scan.ts` makes for a scanned code, with the same
 * reasoning: it belongs to the tab that produced it. It dies with the tab,
 * which is the right lifetime for "I have read this".
 *
 * KEYED BY SESSION AND QUESTION, because revealing one question's helper says
 * nothing about the next one's — a re-roll brings a new question with its `?`
 * back.
 *
 * Both halves swallow everything. Storage can be absent or throw in a private
 * window, and a thrown error inside a listening screen over a disclosure flag
 * would be a far worse failure than a helper that forgets.
 */
function helperStore(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function helperKey(sessionId: string, questionId: string): string {
  return `musie-helper:${sessionId}:${questionId}`;
}

export function isHelperRevealed(sessionId: string, questionId: string): boolean {
  try {
    return helperStore()?.getItem(helperKey(sessionId, questionId)) === '1';
  } catch {
    return false;
  }
}

export function rememberHelperRevealed(sessionId: string, questionId: string): void {
  try {
    helperStore()?.setItem(helperKey(sessionId, questionId), '1');
  } catch {
    /* Nothing to do and nothing to say: the helper is on screen either way,
       and it will simply be collapsed again next time the sheet opens. */
  }
}

/* ── The database ───────────────────────────────────────────────────────────*/

/**
 * The two facts `nextQuestion` needs, in ONE request.
 *
 * `spent` reads `status = 'finished'` rather than joining `reflections`, which
 * is what the revised D3 bought: one table, and `status` sits beside `user_id`
 * in `sessions_user_id_started_at_idx`'s leading column.
 *
 * ONE QUERY, NOT TWO. `previous` is the most recent row and `spent` is a
 * filter over the same set, so both come out of one ordered read of the
 * caller's sessions that carry a question. RLS restricts it to them.
 *
 * Pre-change sessions have a null `listening_question_id` and are excluded by
 * the `not.is` filter, so they contribute to neither — which is the brief's
 * "doesn't have to work for any past session, but only new ones".
 *
 * IT NEVER THROWS. It is called while opening a listening sheet, and the
 * honest failure is an empty history — the rotation then offers the
 * lowest-ordered question, which is a worse recommendation and not a broken
 * screen.
 */
export async function readQuestionHistory(): Promise<QuestionHistory> {
  const { data, error } = await getSupabase()
    .from('sessions')
    .select('listening_question_id, status')
    .not('listening_question_id', 'is', null)
    .order('started_at', { ascending: false });

  if (error !== null) {
    console.warn(`[musie] could not read the question history: ${error.message}`);
    return { spent: [], previous: null };
  }

  const rows = data ?? [];
  return {
    spent: rows
      .filter((row) => row.status === 'finished')
      .flatMap((row) => (row.listening_question_id === null ? [] : [row.listening_question_id])),
    /* The first row is the most recent: the read is ordered descending and
       every row here has a question. */
    previous: rows[0]?.listening_question_id ?? null,
  };
}

/**
 * Record which question this session was given, and what it said.
 *
 * ONE WRITE, TWO FACTS — the same call `saveCard` makes for the same reason.
 * `sessions_listening_question_pairs` refuses a row that has one without the
 * other, so writing them separately would be a round trip that can only fail.
 *
 * `text` is the REFLECT phrasing and the snapshot is taken HERE rather than at
 * the reflect step, so the row is complete from the moment the question is
 * assigned. See the column's comment in the migration for why there is a
 * snapshot at all.
 */
export async function saveQuestion(
  sessionId: string,
  questionId: QuestionId,
  locale: Locale,
): Promise<void> {
  const { error } = await getSupabase()
    .from('sessions')
    .update({
      listening_question_id: questionId,
      listening_question: questionText(questionId, locale).reflect,
    })
    .eq('id', sessionId);

  if (error !== null) {
    throw new Error(`[musie] could not save the question: ${error.message}`);
  }
}

/**
 * Turn the current question down and take the next one.
 *
 * THREE COLUMNS IN ONE UPDATE, and the arrays are the reason this is not two
 * calls: a reload between them would leave a question rejected in the log but
 * still offerable, or offered again having been rejected.
 *
 * `rejected` and `round` are passed IN rather than read-then-written. The
 * caller already holds both — it has just rendered from them — and a
 * read-modify-write here would race with itself on a double tap.
 */
export async function rejectQuestion(
  sessionId: string,
  rejectedId: string,
  log: readonly string[],
  round: readonly string[],
  next: QuestionId | null,
  locale: Locale,
): Promise<void> {
  const { error } = await getSupabase()
    .from('sessions')
    .update({
      /* THE LOG GROWS AND IS NEVER CLEARED; the working set is what
         `resetQuestionRound` empties. §5.3.1 is why these are two columns. */
      rejected_question_ids: [...log, rejectedId],
      rejected_this_round: [...round, rejectedId],
      /* Null only at the dead end, where there is nothing to move on to. The
         pairing constraint wants both or neither, so the snapshot goes with
         it. */
      listening_question_id: next,
      listening_question: next === null ? null : questionText(next, locale).reflect,
    })
    .eq('id', sessionId);

  if (error !== null) {
    throw new Error(`[musie] could not change the question: ${error.message}`);
  }
}

/**
 * *Fragen zurücksetzen* — put every question back in reach (D16).
 *
 * Empties `rejected_this_round` AND NOTHING ELSE. `rejected_question_ids`
 * keeps every rejection, which is what makes a reset the loudest row in
 * `question_rejections` rather than the one that erases itself.
 *
 * It also assigns `next`, because the dead end is the only place this is
 * reachable from and there the session is holding no question at all.
 */
export async function resetQuestionRound(
  sessionId: string,
  next: QuestionId | null,
  locale: Locale,
): Promise<void> {
  const { error } = await getSupabase()
    .from('sessions')
    .update({
      rejected_this_round: [],
      listening_question_id: next,
      listening_question: next === null ? null : questionText(next, locale).reflect,
    })
    .eq('id', sessionId);

  if (error !== null) {
    throw new Error(`[musie] could not reset the questions: ${error.message}`);
  }
}
