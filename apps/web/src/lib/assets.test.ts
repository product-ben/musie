/**
 * Where a content image actually lives, now that there are two answers.
 *
 * The bundle path is the shape every content table has held since September;
 * the object key arrived with the artwork bucket on 2026-10-14. Both have to
 * survive, because `exercises.image_url` and `user_types.image_url` are not
 * moving — so the interesting cases are the ones where a reader might guess
 * wrong about which shape it is holding.
 */
import { readFileSync, readdirSync } from 'node:fs';
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

/**
 * ── WHICH HELPER A SCREEN MAY CALL, AS A RULE RATHER THAN A HABIT ─────────
 * `contentImageUrl` exists because a deck picture's `image_url` holds a BUNDLE
 * PATH today and an OBJECT KEY the moment an operator uploads artwork at
 * `/maintenance` — `project_deck()` writes the artwork's `src` straight into
 * the column. `fromRoot` cannot tell the two apart: handed
 * `art-07-a3f91b2c.webp` it returns `/art-07-a3f91b2c.webp`, a 404 at a path
 * that names the key.
 *
 * Nothing catches that today, and that is the point of this test. Factory
 * content holds bundle paths, so every card renders, every walk passes and
 * every screenshot looks right — until the first upload, which is the whole
 * purpose of the screen that writes it. `pnpm check` touches no database and a
 * Playwright `toBeVisible` passes on a broken `<img>`.
 *
 * So the rule is checked against the SOURCE: `fromRoot` is allowed only where
 * the column is staying a bundle path, which is `exercises.image_url` and
 * `user_types.image_url` (the helper's own docblock names both). Everything a
 * card shows — the listen step, the diary entry, and the digital path's view,
 * select and sheet — goes through `contentImageUrl`.
 *
 * An allowlist rather than a pattern over the argument, because the argument is
 * `card.imageUrl`, `one.imageUrl` and `entry.cardImageUrl` in five different
 * files: a regex over those names would be the thing most likely to rot. A new
 * `fromRoot` call now fails here and asks its author to say why it is exempt.
 */
describe('the source rule: a card picture never goes through fromRoot', () => {
  const SRC = new URL('../', import.meta.url).pathname;

  /** Every `.ts`/`.tsx` under `src/`, excluding tests and the helper itself. */
  function sources(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = `${dir}${entry.name}`;
      if (entry.isDirectory()) return sources(`${path}/`);
      if (!/\.tsx?$/.test(entry.name)) return [];
      if (/\.test\.tsx?$/.test(entry.name)) return [];
      if (path.endsWith('lib/assets.ts')) return [];
      return [path];
    });
  }

  /* The two bundle-path columns, and nothing else. Add a line here only with
     the column that justifies it. */
  const ALLOWED = new Map([
    ['routes/Exercises.tsx', 'exercises.image_url — not moving'],
  ]);

  const files = sources(SRC);

  it('has sources to check, so this cannot pass vacuously', () => {
    expect(files.length).toBeGreaterThan(40);
    /* And the helper is actually reached by the screens — a rule that passed
       because every call had been deleted would be worse than no rule. */
    const users = files.filter((file) =>
      /\bcontentImageUrl\(/.test(readFileSync(file, 'utf8')));
    expect(users.length).toBeGreaterThanOrEqual(5);
  });

  it('calls fromRoot only where a column is staying a bundle path', () => {
    const offenders = files
      .filter((file) => /\bfromRoot\(/.test(readFileSync(file, 'utf8')))
      .map((file) => file.slice(SRC.length))
      .filter((relative) => !ALLOWED.has(relative));

    expect(
      offenders,
      `these call fromRoot on a column that can become an object key: ${offenders.join(', ')}`,
    ).toEqual([]);
  });
});
