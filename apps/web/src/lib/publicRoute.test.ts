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

import { BETA_PATH, IMPRINT_PATH, PRIVACY_PATH, isPublicPath, publicPage } from './publicRoute';

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

describe('publicPage', () => {
  it('names which page a path is', () => {
    expect(publicPage('/beta')).toBe('beta');
    expect(publicPage('/impressum')).toBe('imprint');
    expect(publicPage('/privacy')).toBe('privacy');
  });

  it('accepts the other word for each legal page', () => {
    /* The word somebody types depends on the language they are thinking in,
       and the links themselves always use the canonical spelling. */
    expect(publicPage('/imprint')).toBe('imprint');
    expect(publicPage('/datenschutz')).toBe('privacy');
  });

  it('accepts the spellings a typed legal URL arrives in', () => {
    for (const pathname of ['/Impressum', '/IMPRESSUM', '/impressum/', '/Datenschutz']) {
      expect(publicPage(pathname)).not.toBeNull();
    }
  });

  it('is not forgiving about prefixes', () => {
    /* A legal page behind a login is the failure this list exists to prevent,
       and a near-miss that silently reaches the gate is the same failure. */
    for (const pathname of ['/privacy-policy', '/impressum-alt', '/privacy/cookies']) {
      expect(publicPage(pathname)).toBeNull();
    }
  });

  it('answers null for the app', () => {
    for (const pathname of ['/', '/about', '/exercises', '/menu']) {
      expect(publicPage(pathname)).toBeNull();
    }
  });

  it('canonical constants are the spellings that get linked', () => {
    expect(IMPRINT_PATH).toBe('/impressum');
    expect(PRIVACY_PATH).toBe('/privacy');
  });
});
