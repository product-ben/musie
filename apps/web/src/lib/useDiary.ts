/**
 * The diary's hooks.
 *
 * Thin, like useContent.ts and for the same reason: the locale comes from
 * context, the query lives in diary.ts, the loading / error state machine
 * lives in useAsync. Three things tied together in one place, so there is one
 * obvious file to open when a screen shows the wrong language or never stops
 * loading.
 */
import * as React from 'react';
import { readDiary, readDiaryEntry } from './diary';
import type { DiaryEntry, DiaryEntryView } from './diary';
import { useAsync } from './useAsync';
import type { AsyncState } from './useAsync';
import { useLocale } from '../i18n/localeContext';

/**
 * The locale is in the key, so switching language re-runs the read and the
 * exercise names swap with no reload — the same contract useExercises has.
 * There is no user in the key: one browser holds one anonymous user, and the
 * policy decides whose rows these are in any case.
 */
export function useDiary(): AsyncState<DiaryEntry[]> {
  const { locale } = useLocale();

  const run = React.useCallback(() => readDiary(locale), [locale]);

  return useAsync(run, `diary:${locale}`);
}

/**
 * `null` data is a 404 — the entry does not exist, or does not belong to this
 * user, and RLS makes those two indistinguishable ON PURPOSE: telling somebody
 * "that entry exists but is not yours" is telling them something about another
 * person's diary.
 *
 * Non-null is a `DiaryEntryView`, so the screen also gets the third answer the
 * id can have: a session that is still running, which is a redirect into the
 * session rather than anything to draw. Still ONE read and one set of
 * loading / failure / nothing states — which is what kept this route out of a
 * loader (router.tsx), and stays true now that the route has a redirect in it.
 */
export function useDiaryEntry(id: string): AsyncState<DiaryEntryView | null> {
  const { locale } = useLocale();

  const run = React.useCallback(() => readDiaryEntry(id, locale), [id, locale]);

  return useAsync(run, `diary-entry:${id}:${locale}`);
}
