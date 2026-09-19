/**
 * Content hooks.
 *
 * Thin by design: the locale comes from context, the query lives in
 * content.ts, and the state machine lives in useAsync. This file only ties the
 * three together, so there is one obvious place to look when a screen loads
 * the wrong language.
 *
 * Only the hooks a screen actually uses are here. The remaining queries in
 * content.ts get theirs when their screens land — a hook nobody calls is
 * dead code that still has to be maintained.
 */
import * as React from 'react';
import { getExercises, getUserTypes } from './content';
import type { Exercise, UserType } from './content';
import { useAsync } from './useAsync';
import type { AsyncState } from './useAsync';
import { useLocale } from '../i18n/localeContext';

export function useExercises(): AsyncState<Exercise[]> {
  const { locale } = useLocale();

  const run = React.useCallback(() => getExercises(locale), [locale]);

  /* The locale is in the key, so switching it re-runs the query — which is
     what makes the list swap language with no reload. */
  return useAsync(run, `exercises:${locale}`);
}

export function useUserTypes(): AsyncState<UserType[]> {
  const { locale } = useLocale();

  const run = React.useCallback(() => getUserTypes(locale), [locale]);

  return useAsync(run, `user-types:${locale}`);
}
