/**
 * Locale resolution and message lookup — the pure parts.
 *
 * No i18n library. Two locales and a flat catalogue do not need one: German
 * plurals follow the same one/other rule as English, so there is nothing for
 * ICU message format to do. If a third locale or real plural rules arrive,
 * that is the moment to add a library, deliberately.
 *
 * Nothing here holds state. The ACTIVE locale lives in LocaleProvider,
 * because it can change at runtime and the UI has to re-render when it does —
 * an earlier version resolved it once at import time, which was correct while
 * there was no way to change it and wrong the moment there was.
 *
 * ── WHY <html lang> MATTERS, AND WHY IT IS NOT COSMETIC ────────────────────
 * Layer 1 sets `--text-hyphens: auto`, which 12 rules in musy-components.css
 * consume, and `hyphens: auto` hyphenates according to the ELEMENT'S DECLARED
 * LANGUAGE. German copy rendering under `lang="en"` does not fail loudly — it
 * breaks German compounds at English hyphenation points, which is worse than
 * no hyphenation and invisible until someone reads it.
 */
import { de } from './de';
import { en } from './en';
import type { MessageKey, Messages } from './en';

export type { MessageKey, Messages } from './en';

export type Locale = 'en' | 'de';

export const LOCALES: readonly Locale[] = ['en', 'de'];

/**
 * A language picker shows each language in ITS OWN name — a German speaker
 * looking for German looks for "Deutsch", not "German". So these are endonyms
 * and deliberately do NOT go through t(): translating them is the bug.
 */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
};

/**
 * The BCP-47 tag to hand `Intl`, which is NOT the same string as the locale id.
 *
 * `new Intl.DateTimeFormat('en')` resolves to **en-US**, so a bare `'en'`
 * renders "September 19, 2026 at 2:32 PM" — American month-first dates and a
 * 12-hour clock, in a German-first product whose English copy is otherwise
 * British. `'en-GB'` gives "19 September 2026 at 14:32", which matches both the
 * German column beside it and the register the catalogue is written in.
 *
 * Separate from `Locale` on purpose. `Locale` is an ID — it is the URL, the
 * `locale` column in every `_i18n` table, and the catalogue key, and widening
 * it to `'en-GB'` would mean re-seeding content rows to match a formatting
 * decision. One map, at the one boundary that needs the distinction.
 */
export const INTL_LOCALES: Record<Locale, string> = {
  en: 'en-GB',
  de: 'de-DE',
};

/** Also hardcoded in index.html's pre-paint snippet, which cannot import. */
export const LOCALE_STORAGE_KEY = 'musie-locale';

export const DEFAULT_LOCALE: Locale = 'en';

const CATALOGUES: Record<Locale, Messages> = { en, de };

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'de';
}

/**
 * The last locale this browser resolved, or null.
 *
 * A CACHE, not the source of truth — profiles.language is. It exists so the
 * chrome can render in the right language on the very first frame, before the
 * profile round trip has finished. For a returning user it is always right,
 * so nothing visibly flips.
 */
export function readCachedLocale(): Locale | null {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(stored) ? stored : null;
  } catch {
    /* Private mode, blocked site data. */
    return null;
  }
}

export function cacheLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* Losing the cache costs one frame in the wrong language, not correctness. */
  }
}

/**
 * What the browser asks for. Consulted only when the user has recorded no
 * choice — which is why profiles.language has to be NULLABLE. While it was
 * `not null default 'en'` this function was unreachable.
 *
 * `startsWith` rather than equality: 'de-AT' and 'de-CH' are German.
 */
export function detectLocale(): Locale {
  try {
    const preferred = navigator.languages?.length
      ? navigator.languages
      : [navigator.language];
    for (const tag of preferred) {
      if (typeof tag === 'string' && tag.toLowerCase().startsWith('de')) return 'de';
      if (typeof tag === 'string' && tag.toLowerCase().startsWith('en')) return 'en';
    }
  } catch {
    /* No navigator (a test environment, say). */
  }
  return DEFAULT_LOCALE;
}

/**
 * Look up a message. `{name}` slots are filled from `params`; an unmatched
 * slot is left verbatim so it shows up in the UI rather than rendering as an
 * empty gap.
 *
 * Prefer `useT()` in components — it binds the active locale for you.
 */
export function translate(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | undefined>,
): string {
  const template = CATALOGUES[locale][key];
  if (params === undefined) return template;
  return template.replace(/\{(\w+)\}/g, (slot, name: string) => params[name] ?? slot);
}
