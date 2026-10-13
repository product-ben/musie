/**
 * Which half of every page you are reading, and where that choice is kept.
 *
 * Three places hold it, in this order of authority:
 *   1. `?for=devs` in the URL — so a link can carry the tab it was read in.
 *   2. `localStorage` — so the choice survives the next visit.
 *   3. `designers` — the default (see markdown/audience.ts for why).
 *
 * The inline script in config.ts resolves all three BEFORE the first paint and
 * writes the answer onto <html data-audience>. This module does not re-decide
 * it; `initAudience` reads what the script already concluded. Two deciders
 * would eventually disagree, and the one that paints first would win.
 */
import { ref } from 'vue';
import { AUDIENCES, DEFAULT_AUDIENCE, type Audience } from '../markdown/audience';

export const STORAGE_KEY = 'musie-docs-audience';
export const QUERY_KEY = 'for';

export const audience = ref<Audience>(DEFAULT_AUDIENCE);

export function isAudience(value: string | null | undefined): value is Audience {
  return !!value && (AUDIENCES as readonly string[]).includes(value);
}

/** Adopt what the pre-paint script decided. Client only. */
export function initAudience(): void {
  const fromDom = document.documentElement.dataset.audience;
  const resolved = isAudience(fromDom) ? fromDom : DEFAULT_AUDIENCE;
  audience.value = resolved;
  document.documentElement.dataset.audience = resolved;
}

export function setAudience(next: Audience): void {
  audience.value = next;
  document.documentElement.dataset.audience = next;

  /* A private window, or site data blocked, throws on write rather than
     returning false. The choice is then good for this page only, which is
     the right failure. */
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }

  /* Write the tab into the address bar so copying the URL shares the half you
     are reading. An internal navigation drops the query again — localStorage
     and the <html> attribute are what actually carry it — so URLs do not stay
     noisy. */
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(QUERY_KEY, next);
    window.history.replaceState(window.history.state, '', url);
  } catch {
    /* ignore */
  }
}
