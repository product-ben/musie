/**
 * THE BROWSER'S OWN FULLSCREEN — the Fullscreen API, which is what YouTube's
 * mobile site uses on Android: the address bar and the tab bar go, and what
 * stays is whatever lives inside the element that went fullscreen.
 *
 * WHY THE WHOLE DOCUMENT, not the sheet. `Sheet` is a base-ui Dialog and
 * renders through a portal into `<body>`, and so does anything it opens. Only
 * the fullscreen element and its descendants are drawn while it is
 * fullscreen, so fullscreening the sheet's popup would hide every popover
 * portalled beside it. `<html>` contains them all.
 *
 * WHERE IT WORKS (2026-11): Chrome on Android, Safari on iPad (16.4+), every
 * desktop browser. NOT Safari on iPhone: there the API does not exist at all
 * (WebKit bug 206854, open since 2020; Safari 27 beta adds nothing). An
 * iPhone page can only send a `<video>` to the system's own player, which
 * this page has none of — so on an iPhone the sheet opens exactly as in the
 * app, and the line under the panel says why.
 *
 * MUST BE CALLED INSIDE THE TAP. Browsers grant fullscreen to a user gesture,
 * so `enterFullscreen` makes its request synchronously, before anything is
 * awaited.
 */

type FullscreenDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};

type FullscreenRoot = HTMLElement & {
  webkitRequestFullscreen?: () => void;
};

function doc(): FullscreenDocument {
  return document as FullscreenDocument;
}

/** Does this browser offer the API at all? Unprefixed, or WebKit's older iPad prefix. */
export function fullscreenAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  return doc().fullscreenEnabled === true || doc().webkitFullscreenEnabled === true;
}

export function isFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  return (doc().fullscreenElement ?? doc().webkitFullscreenElement ?? null) !== null;
}

/**
 * Opened from the home screen, where there are no browser bars to hide.
 *
 * NOT `(display-mode: fullscreen)`: that one also matches a page the
 * Fullscreen API has just put into fullscreen — measured in Chromium, where
 * it made the status line call this page a home-screen app the moment the
 * sheet opened. A home-screen app in fullscreen mode would need a manifest,
 * and the site has none.
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const legacy = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return legacy || window.matchMedia('(display-mode: standalone)').matches;
}

export function enterFullscreen(): void {
  if (!fullscreenAvailable() || isFullscreen()) return;
  const root = document.documentElement as FullscreenRoot;
  try {
    if (typeof root.requestFullscreen === 'function') {
      /* `navigationUI: 'hide'` asks Chrome on Android to drop its own
         navigation bar as well; a browser that does not know it ignores it. */
      root.requestFullscreen({ navigationUI: 'hide' }).catch((error: unknown) => {
        console.info('[focus-sheet] fullscreen refused', error);
      });
    } else {
      root.webkitRequestFullscreen?.();
    }
  } catch (error) {
    console.info('[focus-sheet] fullscreen refused', error);
  }
}

export function exitFullscreen(): void {
  if (!isFullscreen()) return;
  try {
    if (typeof document.exitFullscreen === 'function') {
      document.exitFullscreen().catch(() => { /* already out */ });
    } else {
      doc().webkitExitFullscreen?.();
    }
  } catch {
    /* already out */
  }
}

/** Calls `listener` whenever fullscreen is entered or left — from here or by the browser. */
export function onFullscreenChange(listener: () => void): () => void {
  document.addEventListener('fullscreenchange', listener);
  document.addEventListener('webkitfullscreenchange', listener);
  return () => {
    document.removeEventListener('fullscreenchange', listener);
    document.removeEventListener('webkitfullscreenchange', listener);
  };
}
