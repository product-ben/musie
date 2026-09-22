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
import { SignInGate } from './components/SignInGate';
import { useAuth } from './lib/authContext';
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

/**
 * The sign-in gate, at the ONE depth where it can be rendered correctly.
 *
 * ── WHY NOT IN AuthProvider, WHICH IS WHERE THE PLAN PUT IT ────────────────
 * BUILD-PLAN's H.0b says `AuthProvider` renders the gate instead of falling
 * through, and AuthProvider is mounted above everything — deliberately, since
 * signing in needs no routing. That is the wrong place for a SCREEN, and not
 * marginally: `useT()` reads LocaleProvider, and the design system's own
 * defaults read MusyLocaleProvider, and both are mounted BELOW it. A gate
 * rendered from AuthProvider would therefore throw on the app's first `t(...)`
 * call, and every design-system label on it would fall back to the package
 * catalogue's German whatever the locale said — the half-German UI rule 7
 * exists to prevent, on the first screen a tester ever sees.
 *
 * So AuthProvider keeps its job of PUBLISHING the state, including the new
 * 'signedOut', and the decision about what to render moves here, below the two
 * providers that make copy work. The substance of the plan is unchanged: there
 * is a gate, and nothing falls through to anonymous sign-in behind it. Logged
 * in apps/web/OPEN-QUESTIONS.md.
 *
 * ── AND WHY THE PROVIDERS ABOVE IT ARE FINE WITH NO USER ──────────────────
 * Checked rather than assumed: with `status: 'signedOut'`, ProfileProvider's
 * effect returns before fetching (it needs a user) and stays 'pending', and
 * LocaleProvider still resolves a locale, because its initial state is the
 * cached locale or `navigator.language` and it only OVERRIDES that from
 * profiles.language once a profile arrives. So the gate is in the right
 * language for a returning tester and in the browser's language for a new one.
 *
 * 'pending' and 'error' keep rendering the app exactly as before: the shell's
 * own gate in AppShell holds an empty <main> for both, which is a decision
 * already made and not one to re-take from up here.
 */
/* eslint-disable-next-line react-refresh/only-export-components --
   the same exemption, and the same reason, as DesignSystemLocale above: this
   is the entry point, it exports nothing, so Fast Refresh never applies to it
   either way. */
function SessionGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  return status === 'signedOut' ? <SignInGate /> : <>{children}</>;
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
            {/* INSIDE DesignSystemLocale, so the gate's own labels and the
                design system's defaults are both in the app's language. */}
            <SessionGate>
              <RouterProvider router={router} />
            </SessionGate>
          </DesignSystemLocale>
        </LocaleProvider>
      </ProfileProvider>
    </AuthProvider>
  </StrictMode>,
);
