/**
 * The active locale, shared through context.
 *
 * Separate from LocaleProvider.tsx so that file exports a component and
 * nothing else, which is what Fast Refresh needs to replace it cleanly.
 */
import { createContext, useCallback, useContext } from 'react';
import { DEFAULT_LOCALE, translate } from './index';
import type { Locale, MessageKey } from './index';

export interface LocaleState {
  /**
   * Always usable. Starts as the cached or browser-detected locale so the
   * chrome can render immediately, then is corrected once profiles.language
   * is known.
   */
  locale: Locale;
  /**
   * False until profiles.language has been read. CONTENT waits on this — the
   * chrome does not, because re-labelling a button is cheap and re-fetching a
   * list in the wrong language is not.
   */
  resolved: boolean;
  /** Records the choice in profiles and switches immediately. No reload. */
  setLocale: (next: Locale) => void;
}

export const LocaleContext = createContext<LocaleState>({
  locale: DEFAULT_LOCALE,
  resolved: false,
  setLocale: () => {},
});

export function useLocale(): LocaleState {
  return useContext(LocaleContext);
}

/**
 * The translator, bound to the active locale.
 *
 * `key` is typed as MessageKey, so an unknown key fails `tsc` rather than
 * rendering a fallback nobody notices.
 */
export function useT(): (
  key: MessageKey,
  params?: Record<string, string | undefined>,
) => string {
  const { locale } = useLocale();

  return useCallback(
    (key: MessageKey, params?: Record<string, string | undefined>) =>
      translate(locale, key, params),
    [locale],
  );
}
