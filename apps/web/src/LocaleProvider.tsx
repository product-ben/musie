/**
 * Resolves the active locale and keeps <html lang> in step with it.
 *
 * Resolution order, and each step exists for a reason:
 *
 *   1. profiles.language          — an explicit choice, and it follows the
 *                                   user to any device
 *   2. navigator.language ~ 'de'  — what the browser asks for, consulted only
 *                                   when no choice has been recorded. This is
 *                                   reachable ONLY because profiles.language
 *                                   is nullable; while it was `not null
 *                                   default 'en'` this branch was dead code
 *   3. 'en'
 *
 * The cached locale in localStorage is not part of that order. It is a
 * first-paint guess so the chrome is not briefly wrong, and profiles always
 * wins once it arrives.
 *
 * ── LANGUAGE AND THEME ARE MIRRORED, NOT PARALLEL ──────────────────────────
 * profiles.language is the SOURCE OF TRUTH here, because there is no
 * flash-of-wrong-language to solve: nothing is painted before React runs
 * except <html lang>, and correcting that costs nothing visible.
 *
 * Theme is the opposite: localStorage owns it, because a flash of the wrong
 * theme is the whole problem theme-init.js exists to prevent, and it has to be
 * decided before the first stylesheet loads. See `ThemeSwitch` in
 * components/MenuPreferences.tsx.
 *
 * Mounted below ProfileProvider, from which this DERIVES — it no longer
 * fetches. The timeout that used to live here moved to lib/profile.ts with the
 * read.
 */
import * as React from 'react';
import { cacheLocale, detectLocale, isLocale, readCachedLocale } from './i18n';
import type { Locale } from './i18n';
import { LocaleContext } from './i18n/localeContext';
import { useProfile } from './lib/profileContext';

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { profile, status, update } = useProfile();

  /* The first-paint guess. Correct for every returning user. */
  const [locale, setLocaleState] = React.useState<Locale>(
    () => readCachedLocale() ?? detectLocale(),
  );

  /* Content waits on this; the chrome does not. 'error' counts as resolved:
     the guess is serviceable, and a locale lookup must never be the reason the
     app will not render. */
  const resolved = status !== 'pending';

  const recordedLanguage = profile?.language ?? null;

  React.useEffect(() => {
    if (status !== 'ready') return;

    /* null means no choice recorded — fall through to the browser. */
    const next = isLocale(recordedLanguage) ? recordedLanguage : detectLocale();
    setLocaleState(next);
    cacheLocale(next);
  }, [status, recordedLanguage]);

  /**
   * <html lang>, reactively. index.html sets it once before paint from the
   * same cache; this keeps it true afterwards. Not a constant in the markup,
   * because `hyphens: auto` breaks compounds at the DECLARED language's
   * points, so German under lang="en" hyphenates wrongly and silently.
   */
  React.useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = React.useCallback(
    (next: Locale) => {
      /* Switch first, persist second. The UI must not wait on a round trip,
         and this is the whole of "changing locale must not require a reload".
         The write goes through the profile, so there is ONE write path. */
      setLocaleState(next);
      cacheLocale(next);
      update({ language: next });
    },
    [update],
  );

  const value = React.useMemo(
    () => ({ locale, resolved, setLocale }),
    [locale, resolved, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
