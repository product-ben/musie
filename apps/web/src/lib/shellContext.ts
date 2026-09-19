/**
 * The path of the page rendered BENEATH an overlay route.
 *
 * The drawer needs it for `aria-current`. An overlay route is the current
 * location — open the drawer and `useLocation()` says `/menu` — but the page
 * the user is actually on is the one still mounted underneath, and that is
 * what a nav item should mark as current.
 *
 * AppShell already tracks it to keep that page mounted, so this only shares
 * what it knows rather than working it out twice.
 *
 * Null on a cold deep-link to an overlay, where nothing preceded it — and
 * then no nav item is current, which is correct.
 */
import { createContext, useContext } from 'react';

export const PagePathContext = createContext<string | null>(null);

export function usePagePath(): string | null {
  return useContext(PagePathContext);
}
