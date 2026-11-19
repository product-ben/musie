/**
 * `src/i18n/localeContext.ts` with ONE string adjusted for the experiment's
 * adjective-only feelings (shims/content__emotionWheel.ts, Ben, 2026-11-19).
 *
 * The feelings sheet's stop row is „einfach nur {feeling}“. With the app's
 * nouns that reads „einfach nur Angst“, and the word stays capitalised. With
 * the experiment's adjectives it would read „einfach nur Ängstlich“, so here,
 * and only for that key, the word is lower-cased: „einfach nur ängstlich“. The
 * app's own comment on the string asks for the same („Klein nach ‚einfach nur‘,
 * weil die Zeile weitergeht“).
 *
 * Everything else is the real module, re-exported. `LocaleContext` is the same
 * object, so the app's provider and every consumer still meet.
 */
import { useCallback } from 'react';
import { useLocale, useT as realUseT } from '../../../../src/i18n/localeContext';
import type { MessageKey } from '../../../../src/i18n';

export * from '../../../../src/i18n/localeContext';

const LOWER_FEELING: ReadonlySet<MessageKey> = new Set<MessageKey>(['reflect.feelings.sheet.just']);

export function useT(): (key: MessageKey, params?: Record<string, string | undefined>) => string {
  const t = realUseT();
  const { locale } = useLocale();
  return useCallback(
    (key: MessageKey, params?: Record<string, string | undefined>) => {
      const feeling = params?.feeling;
      if (!LOWER_FEELING.has(key) || feeling === undefined || feeling === '') return t(key, params);
      return t(key, { ...params, feeling: feeling.charAt(0).toLocaleLowerCase(locale) + feeling.slice(1) });
    },
    [t, locale],
  );
}
