/**
 * The app's PublicLocaleProvider, with the experiment's two differences:
 * the fallback is German (the app's is English), and an exercise that exists
 * in German only pins the locale to `de`. Its own storage key, so switching
 * language here never changes the app's remembered language on musie.org.
 */
import * as React from 'react';
import type { Locale } from '../../../src/i18n';
import { LocaleContext } from '../../../src/i18n/localeContext';

export const EXPERIMENT_LOCALE_KEY = 'reflexion-locale';

function initialLocale(): Locale {
  try {
    const stored = localStorage.getItem(EXPERIMENT_LOCALE_KEY);
    if (stored === 'de' || stored === 'en') return stored;
  } catch {
    /* fall through */
  }
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of tags) {
    const lower = String(tag ?? '').toLowerCase();
    if (lower.startsWith('de')) return 'de';
    if (lower.startsWith('en')) return 'en';
  }
  return 'de';
}

export function ExperimentLocaleProvider({
  germanOnly,
  onChange,
  children,
}: {
  germanOnly: boolean;
  onChange?: (from: Locale, to: Locale) => void;
  children: React.ReactNode;
}) {
  const [chosen, setChosen] = React.useState<Locale>(initialLocale);
  const locale: Locale = germanOnly ? 'de' : chosen;

  React.useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = React.useCallback(
    (next: Locale) => {
      if (germanOnly || next === locale) return;
      onChange?.(locale, next);
      setChosen(next);
      try {
        localStorage.setItem(EXPERIMENT_LOCALE_KEY, next);
      } catch {
        /* switching still works for this page */
      }
    },
    [germanOnly, locale, onChange],
  );

  const value = React.useMemo(() => ({ locale, resolved: true, setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
