/**
 * The rotating question, for the length of one session.
 *
 * `lib/questions.ts` owns the RULES and is pure; this owns the per-run state
 * and the three writes. It is a hook rather than state inside `SessionListen`
 * for the same reason `feelingChange` is lifted: the reflect step needs the
 * same question, and the rail unmounts each step when you walk between them.
 *
 * So it is called once in `SessionRun`, which is below `Session`'s load guard
 * and therefore has a row to seed from.
 *
 * ── SEEDED FROM THE ROW, WHICH IS WHAT MAKES IT CROSS-DEVICE ──────────────
 * `sessions.listening_question_id` is written the moment a question is
 * assigned, so a reload, a second tab or a second device all resume with the
 * question they were given rather than drawing a new one. That is the whole of
 * the brief's "has to work also between devices" — no new table, and no
 * client-side cache that can disagree with the row.
 */
import * as React from 'react';
import {
  canReroll, hasQuestionSet, isKnownQuestion, nextQuestion, questionText,
  readQuestionHistory, rejectQuestion, resetQuestionRound, saveQuestion,
} from './questions';
import type { QuestionHistory } from './questions';
import type { QuestionId, QuestionText } from '../content/questions';
import type { SessionRow } from './session';
import type { Locale } from '../i18n';

export interface SessionQuestion {
  /**
   * The question on screen.
   *
   * Null in three cases a screen does not have to tell apart, because all
   * three mean "draw the exercise's own copy instead": the exercise has no
   * set, the first assignment has not landed, or everything was rejected.
   * `rotates` and `assigning` are there for the two that do matter.
   */
  id: QuestionId | null;
  /** The three strings, in the active locale. Null whenever `id` is. */
  text: QuestionText | null;
  /** Does this exercise rotate at all? False ⇒ no `?`, no re-roll button. */
  rotates: boolean;
  /** True while the first assignment is in flight — the sheet shows nothing yet. */
  assigning: boolean;
  /** Is there another question to offer? False at the dead end (§7.4). */
  canSwap: boolean;
  /**
   * The dead end: nothing on screen and nothing left to offer, because
   * everything was turned down.
   *
   * SEPARATE FROM `id === null`, and that distinction is load-bearing. Three
   * different things make `id` null — no question set, assignment in flight,
   * and this — and only this one should still draw the swap row. Without it
   * the row disappears exactly when it has something to say, taking the
   * *Keine weitere Frage übrig* line and *Fragen zurücksetzen* with it.
   */
  exhausted: boolean;
  /** Turn this one down and take the next. */
  reject: () => void;
  /** *Fragen zurücksetzen* — put them all back in reach (D16). */
  reset: () => void;
}

export function useSessionQuestion(
  row: SessionRow,
  locale: Locale,
): SessionQuestion {
  const { id: sessionId, exerciseId } = row;
  const rotates = hasQuestionSet(exerciseId);

  /* SEEDED FROM THE ROW, then owned here. `isKnownQuestion` is the guard for
     an id that outlived its question — there is no foreign key (D1), so a
     retired id can come back out of the database and must read as "no
     question" rather than crashing a lookup. */
  const [id, setId] = React.useState<QuestionId | null>(
    isKnownQuestion(row.listeningQuestionId) ? row.listeningQuestionId : null,
  );
  const [log, setLog] = React.useState<string[]>(row.rejectedQuestionIds);
  const [round, setRound] = React.useState<string[]>(row.rejectedThisRound);
  const [assigning, setAssigning] = React.useState(false);

  /* The cross-session history, read once. A ref rather than state: nothing
     renders from it, and re-rendering when it arrives would be a render for a
     value only the next press reads. */
  const history = React.useRef<QuestionHistory>({ spent: [], previous: null });

  /* ── THE FIRST ASSIGNMENT ────────────────────────────────────────────────
     On entry to the listen step, not at session creation (§5.5): a session
     abandoned at intro or scan was never shown a question, so it should not
     appear in the rotation or the rejection log.

     THE REF GUARD IS NOT BELT-AND-BRACES. React 19 double-invokes effects in
     development, and without it a fresh session would assign twice — the
     second run reading the same `id === null` state as the first, because the
     write has not come back yet. Two writes of two different questions, and
     the one on screen would be whichever resolved last. */
  const assigned = React.useRef(false);

  React.useEffect(() => {
    if (!rotates || assigned.current) return;
    assigned.current = true;

    /* Already carrying one — a resume, another device, or a reload. Still read
       the history, because a re-roll needs it. */
    if (id !== null) {
      void readQuestionHistory().then((read) => { history.current = read; });
      return;
    }

    /* Nothing to assign: everything was already rejected, which is the dead
       end surviving a reload. */
    if (!canReroll(exerciseId, null, round)) return;

    setAssigning(true);
    void (async () => {
      try {
        const read = await readQuestionHistory();
        history.current = read;

        const picked = nextQuestion(exerciseId, read, round);
        if (picked === null) return;

        await saveQuestion(sessionId, picked, locale);
        setId(picked);
      } catch (cause) {
        /* THE SCREEN FALLS BACK RATHER THAN FAILING. A question that could not
           be assigned leaves `id` null, and every surface draws the exercise's
           own copy — which is what the three unbuilt exercises do permanently.
           A listening step that refuses to open because the rotation is down
           would be a far worse failure than one that asks last month's
           question. */
        console.warn(`[musie] could not assign a question: ${String(cause)}`);
      } finally {
        setAssigning(false);
      }
    })();
    /* `id`, `round` and `locale` are READ ONCE, at the moment the guard opens,
       and the guard makes this effect run exactly once per mount — so they are
       deliberately not dependencies. Listing them would re-run an effect whose
       whole job is to happen once, and the ref would then suppress it anyway. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotates, exerciseId, sessionId]);

  const reject = React.useCallback(() => {
    if (id === null) return;

    const nextRound = [...round, id];
    const picked = nextQuestion(exerciseId, history.current, nextRound);

    /* OPTIMISTIC, and the write is what persists it. A re-roll is a press on a
       listening screen; waiting for a round trip before the question changes
       would make the control feel broken on a slow connection. If the write
       fails the row keeps the old question and a reload shows it again, which
       is recoverable and quiet. */
    setLog((was) => [...was, id]);
    setRound(nextRound);
    setId(picked);

    void rejectQuestion(sessionId, id, log, round, picked, locale)
      .catch((cause: unknown) => {
        console.warn(`[musie] could not record the rejection: ${String(cause)}`);
      });
  }, [exerciseId, id, locale, log, round, sessionId]);

  const reset = React.useCallback(() => {
    /* The working set empties; THE LOG DOES NOT (§5.3.1). That is the whole
       reason there are two arrays, and the reason a reset is the loudest row
       in `question_rejections` rather than the one that erases itself. */
    const picked = nextQuestion(exerciseId, history.current, []);

    setRound([]);
    setId(picked);

    void resetQuestionRound(sessionId, picked, locale)
      .catch((cause: unknown) => {
        console.warn(`[musie] could not reset the questions: ${String(cause)}`);
      });
  }, [exerciseId, locale, sessionId]);

  return {
    id,
    text: id === null ? null : questionText(id, locale),
    rotates,
    assigning,
    canSwap: canReroll(exerciseId, id, round),
    exhausted: rotates && id === null && round.length > 0,
    reject,
    reset,
  };
}
