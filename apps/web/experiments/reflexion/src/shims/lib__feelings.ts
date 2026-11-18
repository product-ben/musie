/**
 * `src/lib/feelings.ts`: the wheel is real; the session's held feelings are
 * an empty list. Session.tsx only enables the hook on its own reflect step,
 * which this page replaces — so this is never more than a quiet default.
 */
import * as React from 'react';
import type { Locale } from '../../../../src/i18n';
import type {
  AddFeelingResult, FeelingPath, HeldFeeling, SessionFeelings,
} from '../../../../src/lib/feelings';

export * from '../../../../src/lib/feelings';

export async function listFeelings(_sessionId: string, _locale: Locale): Promise<HeldFeeling[]> {
  return [];
}

export async function addFeeling(_sessionId: string, _path: FeelingPath): Promise<AddFeelingResult> {
  return 'added';
}

export async function removeFeeling(_id: string): Promise<void> {}

export function useSessionFeelings(_sessionId: string, _locale: Locale, _enabled = true): SessionFeelings {
  const add = React.useCallback(async (path: FeelingPath) => addFeeling(_sessionId, path), [_sessionId]);
  const remove = React.useCallback(async (id: string) => removeFeeling(id), []);
  return { feelings: [], loading: false, error: null, add, remove };
}
