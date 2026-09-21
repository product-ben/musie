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
import { useLocation } from 'react-router';
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
 *
 * ── AND SO IS THE HISTORY KEY, WHICH IS WHAT MAKES THE LIST HONEST ─────────
 * `location.key` is React Router's identity for one entry in the history
 * stack. Putting it in the cache key gives one rule: **the diary re-reads
 * whenever you ARRIVE at it, and not when an overlay over it merely closes.**
 *
 * Both halves of that matter, and they are the same mechanism:
 *
 *   Closing an entry goes BACK, which restores the previous history entry and
 *   its original key — so the list you already had is the list you get, which
 *   is right, because nothing changed.
 *
 *   Finishing a session, closing one, or deleting an entry all NAVIGATE to
 *   /diary, which is a new entry with a new key — so the list re-reads, which
 *   is right, because something did.
 *
 * Without it, deleting an entry left the deleted row on screen: AppShell keeps
 * the list mounted beneath an overlay, so going back re-rendered a component
 * that had no reason to fetch again.
 */
export function useDiary(): AsyncState<DiaryEntry[]> {
  const { locale } = useLocale();
  const location = useLocation();

  const run = React.useCallback(() => readDiary(locale), [locale]);

  return useAsync(run, `diary:${locale}:${location.key}`);
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
