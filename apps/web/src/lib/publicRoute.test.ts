/**
 * Which paths are public.
 *
 * Small, and worth testing anyway: this function is what stands between the
 * landing page and the session providers, and it is read from
 * `window.location.pathname` once, at boot, before anything renders. A wrong
 * answer in either direction is silent — a stranger meeting the sign-in gate,
 * or the app's own routes rendering a sign-up form.
 */
import { describe, expect, it } from 'vitest';

import { BETA_PATH, isPublicPath } from './publicRoute';

describe('isPublicPath', () => {
  it('matches the canonical path', () => {
    expect(isPublicPath(BETA_PATH)).toBe(true);
    expect(BETA_PATH).toBe('/beta');
  });

  it('matches the spellings a typed URL arrives in', () => {
    /* This path is read off a slide and typed. Cloudflare answers every
       unmatched path with index.html, so the alternative to accepting these is
       not a 404 — it is the sign-in gate, for somebody who got the address
       right. */
    for (const pathname of ['/beta/', '/Beta', '/BETA', '/Beta/']) {
      expect(isPublicPath(pathname)).toBe(true);
    }
  });

  it('does not match a path that merely starts with it', () => {
    for (const pathname of ['/beta-test', '/betamax', '/beta/thanks']) {
      expect(isPublicPath(pathname)).toBe(false);
    }
  });

  it('does not match the app', () => {
    /* The negative control for the whole mechanism: every one of these has to
       reach the router, and `/` most of all. */
    for (const pathname of ['/', '/about', '/exercises', '/diary', '/s/ABCD', '/menu']) {
      expect(isPublicPath(pathname)).toBe(false);
    }
  });

  it('does not match a path that only contains it', () => {
    expect(isPublicPath('/app/beta')).toBe(false);
    expect(isPublicPath('beta')).toBe(false);
  });
});
