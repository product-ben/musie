/**
 * `src/lib/session.ts` against ONE in-memory row (`../data/store.ts`).
 *
 * Every save updates the row; ending the run — either way — resets it to a
 * fresh `started` row at intro, because Session.tsx redirects any other status
 * to /diary and this page's router sends that back to intro (a loop).
 * `completedBefore` is the real, pure function (re-exported).
 */
import type { StepId } from '../../../../src/routeHandle';
import type { SessionRow } from '../../../../src/lib/session';
import type { SessionStatus } from '../../../../src/lib/sessionMachine';
import * as store from '../data/store';

export * from '../../../../src/lib/session';

export async function readSession(id: string): Promise<SessionRow | null> {
  return store.tick(store.readRow(id));
}

export async function saveStep(id: string, step: StepId): Promise<void> {
  store.updateRow(id, { step });
}

export async function saveCard(id: string, cardId: string | null, trackId: string | null): Promise<void> {
  store.updateRow(id, { cardId, trackId });
}

/** Freie Bahn stays digital whatever is asked (`store.updateRow`). */
export async function saveDigitalCards(id: string, digitalCards: boolean): Promise<void> {
  store.updateRow(id, { digitalCards });
}

export async function saveListeningAnswers(id: string, posture: string | null, ending: string): Promise<void> {
  store.updateRow(id, { posture, ending });
}

export async function savePlay(_id: string, _mode: 'solo' | 'with_musie', _seconds: number): Promise<void> {
  /* Not a column the stepper reads back. The experiment's own tracking owns it. */
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
