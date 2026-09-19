import { StrictMode } from 'react';
import type * as React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

/**
 * THE ORDER OF THESE FOUR IS LOAD-BEARING, and it is four, not three:
 * packages/design-system/README.md puts musy-fonts.css FIRST, ahead of the
 * three the brief names. Without it every type token still resolves but every
 * step renders in a system fallback.
 *
 *   musy-fonts.css                  @font-face for --font-display / --font-text
 *   musy-foundations.css            the whole token system, [LOCKED]
 *   musy-foundations-amendments.css token gaps G1 (--icon-stroke-sm) and
 *                                   G2 (--border-style-dashed)
 *   musy-components.css             consumes both; loading it before the
 *                                   amendments leaves those two unresolved
 *
 * The app's own sheets come last so they can build on the tokens.
 *
 * theme-init.js is NOT imported here. It has to run before first paint, so it
 * is inlined in index.html's <head> — an import would run after the stylesheet
 * and flash the wrong theme.
 */
import '@musie/design-system/tokens/musy-fonts.css';
import '@musie/design-system/tokens/musy-foundations.css';
import '@musie/design-system/tokens/musy-foundations-amendments.css';
import '@musie/design-system/musy-components.css';
import './styles.css';
import './shell.css';

import { MusyLocaleProvider } from '@musie/design-system';

import { AuthProvider } from './AuthProvider';
import { LocaleProvider } from './LocaleProvider';
import { useLocale } from './i18n/localeContext';
import { ProfileProvider } from './ProfileProvider';
import { router } from './router';

/**
 * The design system's own chrome words follow the app's locale.
 *
 * Every component default the package ships — including the ones with no prop
 * at all, like Badge's and Message's screen-reader status word — is read from
 * @musie/design-system's catalogue through this provider. Unmounted, the set
 * speaks German, so an English session would announce "Fehler: …" to exactly
 * the users who cannot see the colour.
 *
 * It sits INSIDE LocaleProvider because it derives from it, and it is a
 * component rather than a value because `locale` changes at runtime with no
 * reload: a module-level setter would not re-render anything.
 *
 * This does not soften the app's own rule. apps/web still passes every
 * user-visible string explicitly (CLAUDE.md rule 7); the catalogue is the
 * floor under the strings a screen cannot pass.
 */
/* eslint-disable-next-line react-refresh/only-export-components --
   the rule wants components in a file that exports them, so Fast Refresh can
   replace them. main.tsx is the entry point and exports nothing at all, so
   Fast Refresh never applies to it either way, and a file of its own for three
   lines that only ever mount here would hide the wiring rather than show it. */
function DesignSystemLocale({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  return <MusyLocaleProvider locale={locale}>{children}</MusyLocaleProvider>;
}

const container = document.getElementById('root');
if (container === null) throw new Error('#root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    {/* Above the router: signing in needs no routing, and this way a route
        change cannot remount it. The gate that decides what renders while it
        is pending is in AppShell. */}
    <AuthProvider>
      {/* ProfileProvider reads the profiles row ONCE — reading it needs a
          user, so it sits inside AuthProvider. LocaleProvider then derives the
          locale from that row instead of fetching it again, and the theme
          mirror and "Here as" write through the same place. The gate that
          waits for auth and locale together is in AppShell. */}
      <ProfileProvider>
        <LocaleProvider>
          <DesignSystemLocale>
            <RouterProvider router={router} />
          </DesignSystemLocale>
        </LocaleProvider>
      </ProfileProvider>
    </AuthProvider>
  </StrictMode>,
);
