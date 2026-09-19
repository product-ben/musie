/**
 * Closing an overlay route.
 *
 * Shared by the drawer and the settings sheet so the two cannot drift: the
 * scrim, the close button, Escape and the browser's own Back button all end up
 * here and all do the same thing.
 *
 * React Router labels the first history entry 'default'. On a cold deep-link
 * straight to an overlay there is nothing behind it, so `navigate(-1)` would
 * leave the app entirely; going to the root keeps the user inside it.
 */
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';

export function useCloseOverlay(): () => void {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    if (location.key === 'default') navigate('/', { replace: true });
    else navigate(-1);
  }, [location.key, navigate]);
}
