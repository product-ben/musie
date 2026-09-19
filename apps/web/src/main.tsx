import { StrictMode } from 'react';
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

import { AuthProvider } from './AuthProvider';
import { LocaleProvider } from './LocaleProvider';
import { ProfileProvider } from './ProfileProvider';
import { router } from './router';

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
          <RouterProvider router={router} />
        </LocaleProvider>
      </ProfileProvider>
    </AuthProvider>
  </StrictMode>,
);
