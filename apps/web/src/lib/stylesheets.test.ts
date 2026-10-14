/**
 * EVERY STYLESHEET CLOSES EVERY BLOCK IT OPENS.
 *
 * ── THE BUG THIS EXISTS FOR, 2026-10-14 ───────────────────────────────────
 * `shell.css` ended with one `}` too many — the digital-cards two-column row
 * closed its media query twice. It cost nothing in `pnpm --filter web dev`,
 * because Vite serves each imported stylesheet as its own `<style>` and a
 * stray brace at the end of a file has nothing after it to damage.
 *
 * THE BUILD CONCATENATES. `exercises.css` followed `shell.css` in the bundle,
 * so the stray brace landed immediately before
 * `.musie-exercises{display:grid;gap:var(--space-gap-group)}` and the browser's
 * error recovery discarded exactly that rule — while the very next rule,
 * `.musie-exercises > .musie-placeholder { margin-block-end: 0 }`, survived.
 * So the library lost its grid AND kept the correction that stops the grid's
 * gap being doubled: every block on `/exercises` sat flush against the next.
 *
 * Nothing could catch it. `tsc` does not parse CSS, eslint does not parse CSS,
 * the bundle build does not fail on a brace, and the dev server renders it
 * correctly — so a walk against `pnpm dev` passes and the deployed page is
 * wrong. It reached production and was found by Ben looking at the page.
 *
 * ── WHY A COUNT AND NOT A PARSER ──────────────────────────────────────────
 * Depth, tracked character by character with comments blanked, which is enough
 * to catch both halves of the class: a stray `}` (depth goes negative, naming
 * the line) and a missing one (depth ends above zero). A real CSS parser would
 * catch more and would be a dependency to keep current for a bug that is
 * always one character.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROOTS = [
  new URL('../../../../apps/web/src/', import.meta.url).pathname,
  new URL('../../../../packages/design-system/src/', import.meta.url).pathname,
];

function stylesheets(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}${entry.name}`;
    if (entry.isDirectory()) return stylesheets(`${path}/`);
    return entry.name.endsWith('.css') ? [path] : [];
  });
}

/** The first line where a block closes that nothing opened, or null. */
function strayCloseLine(css: string): number | null {
  /* Comments blanked rather than removed, so a reported line number is the
     line somebody has to open. */
  const text = css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  let depth = 0;
  let line = 1;
  for (const ch of text) {
    if (ch === '\n') line += 1;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth < 0) return line;
    }
  }
  return null;
}

/** How many blocks are left open at the end of the file. */
function unclosed(css: string): number {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...text].reduce((d, ch) => (ch === '{' ? d + 1 : ch === '}' ? d - 1 : d), 0);
}

describe('every stylesheet is balanced, because the build concatenates them', () => {
  const files = ROOTS.flatMap(stylesheets);

  it('has stylesheets to check, so this cannot pass vacuously', () => {
    expect(files.length).toBeGreaterThanOrEqual(6);
    /* And the big ones are among them — a scan that found only two small
       files would pass while saying nothing about the two that matter. */
    expect(files.some((f) => f.endsWith('shell.css'))).toBe(true);
    expect(files.some((f) => f.endsWith('musy-components.css'))).toBe(true);
  });

  it('closes every block it opens', () => {
    const offenders = files
      .map((file) => {
        const css = readFileSync(file, 'utf8');
        const stray = strayCloseLine(css);
        const open = unclosed(css);
        if (stray !== null) return `${file}:${stray} — a } closing a block nothing opened`;
        if (open !== 0) return `${file} — ${open} block(s) left open at the end of the file`;
        return null;
      })
      .filter((problem): problem is string => problem !== null);

    expect(
      offenders,
      `a stray or missing brace silently eats the FIRST RULE OF THE NEXT FILE in the ` +
        `bundle, and renders correctly in dev:\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });
});
