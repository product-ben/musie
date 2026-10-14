/**
 * Where a content image actually lives, now that there are two answers.
 *
 * The bundle path is the shape every content table has held since September;
 * the object key arrived with the artwork bucket on 2026-10-14. Both have to
 * survive, because `exercises.image_url` and `user_types.image_url` are not
 * moving — so the interesting cases are the ones where a reader might guess
 * wrong about which shape it is holding.
 */
import { describe, expect, it } from 'vitest';
import { contentImageUrl, fromRoot } from './assets';

const BASE = 'http://127.0.0.1:54321';

describe('fromRoot', () => {
  /* The bug this function exists for: a relative path resolves against the
     CURRENT path, so on a two-segment route it lands somewhere else. */
  it('makes a stored path root-relative', () => {
    expect(fromRoot('assets/web/cards/mc-01.webp')).toBe('/assets/web/cards/mc-01.webp');
  });

  it('leaves an absolute url and an already-rooted path alone', () => {
    expect(fromRoot('https://example.com/a.webp')).toBe('https://example.com/a.webp');
    expect(fromRoot('//example.com/a.webp')).toBe('//example.com/a.webp');
    expect(fromRoot('/assets/web/a.webp')).toBe('/assets/web/a.webp');
  });
});

describe('contentImageUrl', () => {
  it('still roots a bundle path, like the exercise pictures', () => {
    expect(contentImageUrl('assets/web/exercises/body-scan.webp', BASE))
      .toBe('/assets/web/exercises/body-scan.webp');
  });

  it('builds a public storage address for an artwork key', () => {
    expect(contentImageUrl('art-07-a3f91b2c.webp', BASE))
      .toBe('http://127.0.0.1:54321/storage/v1/object/public/artworks/art-07-a3f91b2c.webp');
  });

  it('does not double a slash when the base carries one', () => {
    expect(contentImageUrl('art-01-ffffffff.webp', 'http://127.0.0.1:54321/'))
      .toBe('http://127.0.0.1:54321/storage/v1/object/public/artworks/art-01-ffffffff.webp');
  });

  /* The nine imported rows point at the committed files and keep doing so
     until each picture is replaced through the UI. An id that merely STARTS
     like an artwork id is not a key: a key always carries its random suffix. */
  it('treats an id without a suffix as a path, not a key', () => {
    expect(contentImageUrl('art-07.webp', BASE)).toBe('/art-07.webp');
  });

  it('leaves an absolute url alone', () => {
    expect(contentImageUrl('https://example.com/a.webp', BASE))
      .toBe('https://example.com/a.webp');
  });

  /* A missing base must not take a screen down over one picture. */
  it('falls back to the bare key when there is no storage base', () => {
    expect(contentImageUrl('art-07-a3f91b2c.webp', '')).toBe('art-07-a3f91b2c.webp');
  });
});
