/**
 * The Layout page is parsed from docs/10-layout.md, which is a copy of
 * reference/design_system/docs/10-layout.md. A copy drifts. This asserts:
 *
 *   1. the two copies are byte-identical (when the reference tree is present);
 *   2. every `## L<n> · ` heading in the markdown parses into a rule, with no
 *      gap in the numbering — a rule renumbered or lost in an edit fails here
 *      rather than quietly vanishing from the page;
 *   3. no rule body is empty.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = [['10-layout.md', true], ['15-layout-evidence.md', false]];

let bad = false;
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) bad = true; };

for (const [file] of DOCS) {
  const mine = join(root, 'docs', file);
  const ref = join(root, '../../reference/design_system/docs', file);
  if (!existsSync(ref)) { console.log(`SKIP  ${file} — reference tree not present`); continue; }
  ok(readFileSync(mine, 'utf8') === readFileSync(ref, 'utf8'),
    `docs/${file} is byte-identical to the reference copy`);
}

const src = readFileSync(join(root, 'docs/10-layout.md'), 'utf8');
const headings = [...src.matchAll(/^## (L(\d+)) · (.+)$/gm)];
const ids = headings.map((m) => Number(m[2]));

ok(headings.length > 0, `parsed ${headings.length} rules from docs/10-layout.md`);
const expected = Array.from({ length: ids.length }, (_, i) => i);
ok(JSON.stringify(ids) === JSON.stringify(expected),
  `rules are L0…L${ids.length - 1} with no gaps (found ${ids.join(',')})`);

const empties = headings.filter((m, i) => {
  const start = m.index + m[0].length;
  const end = i + 1 < headings.length ? headings[i + 1].index : src.length;
  return src.slice(start, end).replace(/[-\s]/g, '') === '';
}).map((m) => m[1]);
ok(empties.length === 0, `every rule has a body (${empties.length} empty${empties.length ? ': ' + empties.join(', ') : ''})`);

process.exit(bad ? 1 : 0);
