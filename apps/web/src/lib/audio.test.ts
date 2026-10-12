/**
 * The signed-URL cache — the loading defect this branch fixed, in test form.
 *
 * A Supabase signed URL carries a token whose `iat`/`exp` differ on every
 * call, so a second mint of one object is a second URL and therefore a second
 * entry in the browser's HTTP cache. Re-entering the listen step used to
 * re-download the whole file. The assertion that keeps that fixed is not "the
 * URL is right" but **"no request was made"**, which is why every test here
 * counts calls.
 *
 * `supabase.ts` is mocked rather than the network: the thing under test is how
 * often the storage API is reached and with what, and a fake `createSignedUrls`
 * says that exactly.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SIGNED_URL_TTL, clearTrackUrls, forgetTrackUrl, signedTrackUrl, signedTrackUrls,
} from './audio';

/** One call per invocation, so a token differs every time — as the real API's does. */
let calls: string[][] = [];
let answer: (paths: string[]) => { data: unknown; error: unknown };

const createSignedUrls = vi.fn(async (paths: string[]) => {
  calls.push(paths);
  return answer(paths);
});

vi.mock('./supabase', () => ({
  getSupabase: () => ({ storage: { from: () => ({ createSignedUrls }) } }),
}));

const signed = (paths: string[], nonce = 0) => ({
  data: paths.map((path) => ({
    path,
    signedUrl: `https://stack.test/${path}?token=${nonce}`,
    error: null,
  })),
  error: null,
});

beforeEach(() => {
  calls = [];
  answer = (paths) => signed(paths, Date.now());
  clearTrackUrls();
  createSignedUrls.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('signedTrackUrl', () => {
  it('mints a URL for an object key', async () => {
    await expect(signedTrackUrl('trk-01.mp3')).resolves.toContain('trk-01.mp3');
    expect(calls).toEqual([['trk-01.mp3']]);
  });

  /* THE WHOLE POINT. The second read is the second mount of the listen step,
     and it must not cost a request — or the eleven megabytes behind it. */
  it('does not ask twice for the same key, and answers with the same string', async () => {
    const first = await signedTrackUrl('trk-01.mp3');
    const second = await signedTrackUrl('trk-01.mp3');

    expect(second).toBe(first);
    expect(createSignedUrls).toHaveBeenCalledTimes(1);
  });

  it('asks nothing at all for a key that is null or blank', async () => {
    await expect(signedTrackUrl(null)).resolves.toBeNull();
    await expect(signedTrackUrl('   ')).resolves.toBeNull();
    expect(createSignedUrls).not.toHaveBeenCalled();
  });

  it('re-mints once the token is close to expiring', async () => {
    vi.useFakeTimers();
    const first = await signedTrackUrl('trk-01.mp3');

    /* Inside the margin: still the cached one. */
    vi.advanceTimersByTime((SIGNED_URL_TTL - 6 * 60) * 1000);
    expect(await signedTrackUrl('trk-01.mp3')).toBe(first);
    expect(createSignedUrls).toHaveBeenCalledTimes(1);

    /* Past it: a fresh URL, because one handed out at 59:59 is valid and
       useless. */
    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(await signedTrackUrl('trk-01.mp3')).not.toBe(first);
    expect(createSignedUrls).toHaveBeenCalledTimes(2);
  });

  it('returns null and warns when the request fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    answer = () => ({ data: null, error: { message: 'no' } });

    await expect(signedTrackUrl('trk-01.mp3')).resolves.toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  /* A failure must not be cached as an answer: the next read is a retry. */
  it('does not cache a failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    answer = () => ({ data: null, error: { message: 'no' } });
    await signedTrackUrl('trk-01.mp3');

    answer = (paths) => signed(paths, 1);
    await expect(signedTrackUrl('trk-01.mp3')).resolves.toContain('trk-01.mp3');
    expect(createSignedUrls).toHaveBeenCalledTimes(2);
  });
});

describe('signedTrackUrls', () => {
  /* The listening step plays two stems. Two round trips before any audio can
     start is latency spent for nothing. */
  it('signs a pair in one call', async () => {
    const found = await signedTrackUrls(['voice.m4a', 'music.m4a']);

    expect(found.size).toBe(2);
    expect(calls).toEqual([['voice.m4a', 'music.m4a']]);
  });

  it('asks only for what is not already cached', async () => {
    await signedTrackUrl('voice.m4a');
    calls = [];

    const found = await signedTrackUrls(['voice.m4a', 'music.m4a']);
    expect(found.size).toBe(2);
    expect(calls).toEqual([['music.m4a']]);
  });

  it('makes no request when both are cached', async () => {
    await signedTrackUrls(['voice.m4a', 'music.m4a']);
    createSignedUrls.mockClear();

    const found = await signedTrackUrls(['voice.m4a', 'music.m4a']);
    expect(found.size).toBe(2);
    expect(createSignedUrls).not.toHaveBeenCalled();
  });

  it('drops nulls rather than asking about them', async () => {
    const found = await signedTrackUrls(['voice.m4a', null, '  ']);
    expect(found.size).toBe(1);
    expect(calls).toEqual([['voice.m4a']]);
  });

  it('asks once for a key given twice', async () => {
    await signedTrackUrls(['voice.m4a', 'voice.m4a']);
    expect(calls).toEqual([['voice.m4a']]);
  });

  /* The API answers per path, so one unsignable key must not cost the other
     one its URL — a cut whose bed is missing should still speak. */
  it('keeps the keys it could sign when one of them fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    answer = (paths) => ({
      data: paths.map((path) => (path === 'music.m4a'
        ? { path, signedUrl: null, error: 'gone' }
        : { path, signedUrl: `https://stack.test/${path}`, error: null })),
      error: null,
    });

    const found = await signedTrackUrls(['voice.m4a', 'music.m4a']);
    expect(found.has('voice.m4a')).toBe(true);
    expect(found.has('music.m4a')).toBe(false);
    expect(warn).toHaveBeenCalled();
  });
});

describe('forgetTrackUrl', () => {
  /* The expiry case: an element that errors on a non-null src after a long
     pause has a good file and an old token. Forgetting is what makes the retry
     a retry rather than a cache hit on the dead URL. */
  it('makes the next read mint a new URL', async () => {
    const first = await signedTrackUrl('trk-01.mp3');
    answer = (paths) => signed(paths, 1);

    forgetTrackUrl('trk-01.mp3');

    expect(await signedTrackUrl('trk-01.mp3')).not.toBe(first);
    expect(createSignedUrls).toHaveBeenCalledTimes(2);
  });

  it('is safe to call with null', () => {
    expect(() => forgetTrackUrl(null)).not.toThrow();
  });
});
