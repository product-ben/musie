/**
 * The locale, for a page that has nobody signed in — `/beta`.
 *
 * `LocaleProvider` cannot be used there and is not a near miss: it derives
 * from `ProfileProvider`, which derives from `AuthProvider`, and the whole
 * point of the public page is that none of those three is mounted (see
 * `lib/publicRoute.ts`). This publishes the same `LocaleContext`, so `useT()`
 * and `MusyLocaleProvider` work exactly as they do everywhere else — the
 * screen cannot tell which provider is above it, and that is the property
 * worth having.
 *
 * ── WHAT IT KEEPS FROM LocaleProvider ──────────────────────────────────────
 * The first-paint resolution — the cached choice, then the browser's language,
 * then English — and the `<html lang>` effect, which is rule 5 and is not
 * cosmetic: Layer 1 sets `--text-hyphens: auto`, and `hyphens: auto`
 * hyphenates by the element's DECLARED language, so German copy under
 * `lang="en"` breaks German compounds at English points. The landing page is
 * one long column of German prose on a phone, which is precisely where that
 * shows.
 *
 * ── AND WHAT IT DROPS ──────────────────────────────────────────────────────
 * `profiles.language`, in both directions. There is no row to read, so the
 * cached-or-detected locale is not a guess waiting to be corrected — it is the
 * answer, and `resolved` is therefore true from the first render rather than
 * after a round trip. And switching language here writes the CACHE only, where
 * `LocaleProvider.setLocale` also writes the profile.
 *
 * That shared cache is deliberate rather than a leak: somebody who reads the
 * pitch in German and is later given an account gets a German first paint
 * instead of a frame of English, because `index.html` reads the same key
 * before React runs. `profiles.language` still outranks it the moment it
 * arrives.
 */
import * as React from 'react';
import { cacheLocale, detectLocale, readCachedLocale } from './i18n';
import type { Locale } from './i18n';
import { LocaleContext } from './i18n/localeContext';

export function PublicLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(
    () => readCachedLocale() ?? detectLocale(),
  );

  React.useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = React.useCallback((next: Locale) => {
    /* Switch first, persist second — the UI must not wait on storage, and
       `cacheLocale` swallows a private-mode failure by design. */
    setLocaleState(next);
    cacheLocale(next);
  }, []);

  const value = React.useMemo(
    () => ({ locale, resolved: true, setLocale }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
