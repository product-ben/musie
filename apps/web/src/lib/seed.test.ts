/**
 * The content seed carries no placeholder prefix.
 *
 * A FILE test, not a query: the migration is the artefact that gets reviewed,
 * merged and re-applied, so it is the thing to assert on. `supabase db reset`
 * can make the database right while the file someone reads is still wrong, and
 * the database check lives in db.content.db.test.ts alongside it.
 *
 * This is in apps/web rather than a repo-level test package because apps/web
 * is where the test runner lives, and a second package for one file would cost
 * more than it explains.
 *
 * WHY THIS EXISTS AT ALL. Every German content string used to be the English
 * text behind a '[DE] ' prefix. That prefix was doing real work — it made a
 * placeholder impossible to mistake for finished copy, in the database and on
 * screen. It is gone, and the distinction it carried now lives in comments
 * (PROVISIONAL GERMAN). This test is what stops the prefix creeping back as a
 * shortcut the next time a string is owed.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const MIGRATIONS = fileURLToPath(
  new URL('../../../../supabase/migrations/', import.meta.url),
);

describe('the content seed', () => {
  it('has migrations to check, so this suite cannot pass vacuously', () => {
    expect(readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).length)
      .toBeGreaterThan(0);
  });

  it('carries no [DE] placeholder prefix in any migration', () => {
    const offenders = readdirSync(MIGRATIONS)
      .filter((file) => file.endsWith('.sql'))
      .flatMap((file) => {
        const lines = readFileSync(`${MIGRATIONS}${file}`, 'utf8').split('\n');
        return lines
          .map((line, index) => ({ file, line: index + 1, text: line }))
          .filter((entry) => entry.text.includes('[DE] '));
      })
      .map((entry) => `${entry.file}:${entry.line}`);

    expect(offenders).toEqual([]);
  });
});
