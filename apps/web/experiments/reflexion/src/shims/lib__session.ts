/**
 * `src/lib/session.ts` against ONE in-memory row (`../data/store.ts`).
 *
 * Every save updates the row; ending the run — either way — resets it to a
 * fresh `started` row at intro, because Session.tsx redirects any other status
 * to /diary and this page's router sends that back to intro (a loop).
 * `completedBefore` is the real, pure function (re-exported).
 */
import type { StepId } from '../../../../src/routeHandle';
import type { MusicMode, SessionRow } from '../../../../src/lib/session';
import type { SessionStatus } from '../../../../src/lib/sessionMachine';
import * as store from '../data/store';
import { playFinished } from '../track';

export * from '../../../../src/lib/session';

export async function readSession(id: string): Promise<SessionRow | null> {
  return store.tick(store.readRow(id));
}

export async function saveStep(id: string, step: StepId): Promise<void> {
  store.updateRow(id, { step });
}

/**
 * What the database trigger `sessions_card_plays()` does in the app: the card
 * is written, and the piece and mode are decided with it and handed back
 * (two tracks per card, 2026-11-20). The experiment has no goals, so it is
 * always the activation piece — Freie Bahn's „Aura“, as before.
 */
export async function saveCard(
  id: string,
  cardId: string | null,
): Promise<{ trackId: string | null; musicMode: MusicMode | null }> {
  const row = store.readRow(id);
  const trackId = cardId === null || row === null
    ? null
    : store.trackFor(row.exerciseId, cardId)?.id ?? null;
  const musicMode: MusicMode | null = cardId === null ? null : 'activate';
  store.updateRow(id, { cardId, trackId, musicMode });
  return store.tick({ trackId, musicMode });
}

/** Freie Bahn stays digital whatever is asked (`store.updateRow`). */
export async function saveDigitalCards(id: string, digitalCards: boolean): Promise<void> {
  store.updateRow(id, { digitalCards });
}

/** The intro's goal question (printed cards, 2026-11-23) — asked only on a
 *  QR start, which this page never is; held anyway so a call cannot reach the
 *  throwing Supabase shim. */
export async function saveGoal(id: string, goalId: string): Promise<void> {
  store.updateRow(id, { goalId });
}

export async function saveListeningAnswers(id: string, posture: string | null, ending: string): Promise<void> {
  store.updateRow(id, { posture, ending });
}

export async function savePlay(_id: string, mode: 'solo' | 'with_musie', seconds: number): Promise<void> {
  /* The harp's "finished playing" (Session's finishPlay is the only caller). */
  playFinished(seconds, mode);
}

export async function savePlayed(id: string, trackId: string | null, _cutId: string | null): Promise<void> {
  store.updateRow(id, { trackId });
}

export async function markListened(_id: string): Promise<void> {
  /* Nothing reads it back in the stepper. */
}

export async function endSession(
  _id: string,
  _status: Exclude<SessionStatus, 'started'>,
  _endedAt: string,
): Promise<void> {
  store.resetRow();
}

/** The experiment's own reflect step saves; the app's is never reached. */
export async function saveReflection(_sessionId: string, _mode: 'text' | 'voice' | 'photo', _body: string): Promise<void> {}

export async function saveFeelingChange(_sessionId: string, _feelingChange: 'worse' | 'same' | 'better'): Promise<void> {}
