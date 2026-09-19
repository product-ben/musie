/**
 * Closing an overlay route.
 *
 * Shared by the drawer, the settings sheet and the diary entry so they cannot
 * drift: the scrim, the close button, Escape and the browser's own Back button
 * all end up here and all do the same thing.
 *
 * React Router labels the first history entry 'default'. On a cold deep-link
 * straight to an overlay there is nothing behind it, so `navigate(-1)` would
 * leave the app entirely; going somewhere inside it keeps the user here.
 *
 * WHERE that is depends on the overlay, which is why `fallback` is a
 * parameter. /menu and /settings cover whatever page you were on and belong to
 * none of them, so they take the default — the root. /diary/:id is one entry
 * OF a list, and the list is where closing it means to land, so it passes
 * '/diary'. The default is '/' so neither of the first two had to change.
 */
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';

export function useCloseOverlay(fallback = '/'): () => void {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    if (location.key === 'default') navigate(fallback, { replace: true });
    else navigate(-1);
  }, [fallback, location.key, navigate]);
}
