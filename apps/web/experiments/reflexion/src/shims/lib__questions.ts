/**
 * `src/lib/questions.ts`: the catalogue and the rotation are the real ones
 * (local constants); the four reads/writes of `sessions` go to the in-memory
 * row. A first visit has no history, so the rotation offers its first question.
 */
import type { Locale } from '../../../../src/i18n';
import type { QuestionId } from '../../../../src/content/questions';
import { questionText } from '../../../../src/lib/questions';
import type { QuestionHistory } from '../../../../src/lib/questions';
import * as store from '../data/store';

export * from '../../../../src/lib/questions';

export async function readQuestionHistory(): Promise<QuestionHistory> {
  return store.tick({ spent: [], previous: null });
}

export async function saveQuestion(sessionId: string, questionId: QuestionId, locale: Locale): Promise<void> {
  store.updateRow(sessionId, {
    listeningQuestionId: questionId,
    listeningQuestion: questionText(questionId, locale).reflect,
  });
}

export async function rejectQuestion(
  sessionId: string,
  rejectedId: string,
  log: readonly string[],
  round: readonly string[],
  next: QuestionId | null,
  locale: Locale,
): Promise<void> {
  store.updateRow(sessionId, {
    rejectedQuestionIds: [...log, rejectedId],
    rejectedThisRound: [...round, rejectedId],
    listeningQuestionId: next,
    listeningQuestion: next === null ? null : questionText(next, locale).reflect,
  });
}

export async function resetQuestionRound(sessionId: string, next: QuestionId | null, locale: Locale): Promise<void> {
  store.updateRow(sessionId, {
    rejectedThisRound: [],
    listeningQuestionId: next,
    listeningQuestion: next === null ? null : questionText(next, locale).reflect,
  });
}
