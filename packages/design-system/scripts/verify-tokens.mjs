/**
 * Coverage + drift check for the foundations documentation.
 *
 * Asserts three things, and exits non-zero on any of them:
 *   1. Every custom property declared in musy-foundations.css is claimed by
 *      exactly ONE page group. Not zero (undocumented), not two (duplicated).
 *   2. Every page group's predicate claims at least one token, so a group whose
 *      tokens were all renamed fails loudly rather than rendering an empty page.
 *   3. TOKEN-DRIFT.md lists exactly the properties the CSS declares and the
 *      token JSON cannot express.
 *
 * The group predicates are read out of stories/foundations/_lib/tokens.ts — the
 * same source the pages use — so this cannot pass while the pages disagree.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const decomment = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

function declared(css) {
  const out = new Set();
  for (const m of decomment(css).matchAll(/(--[a-z0-9-]+)\s*:/g)) out.add(m[1]);
  return out;
}

const cssTokens = [...declared(read('tokens/musy-foundations.css'))].sort();
const amendTokens = [...declared(read('tokens/musy-foundations-amendments.css'))].sort();

/* ── 1 + 2 · partition ─────────────────────────────────────────────────────
   The predicates are evaluated from the TS source rather than duplicated here.
   A regex pulls each `name: (n: string) => …` body out of the GROUPS object;
   duplicating them would let this check drift from the pages it certifies.  */
const src = read('stories/foundations/_lib/tokens.ts');
const groupsBlock = src.slice(src.indexOf('export const GROUPS'), src.indexOf('} as const;'));
const SCALES = JSON.parse(read('tokens/proof-manifest.json')).scales;
const isScaleStep = (n) => SCALES.some((s) => n.startsWith(`--${s}-`));

const predicates = {};
/* A sentinel key so the LAST entry has the same trailing shape as the others —
   without it the final group is silently dropped and the partition looks 11
   groups wide. */
for (const m of `${groupsBlock}\n  __end__:`.matchAll(
  /'?([a-z-]+)'?:\s*\(n: string\) =>\s*([\s\S]*?),\n(?=\s*(?:\/\*|'?[a-z_-]+'?:))/g,
)) {
  if (m[1] === '__end__') continue;
  const body = m[2].replace(/\s+/g, ' ').trim();
  predicates[m[1]] = new Function('n', 'isScaleStep', `return (${body});`);
}
if (Object.keys(predicates).length < 12) {
  console.error(`FAIL  parsed only ${Object.keys(predicates).length} group predicates from tokens.ts (expected 12)`);
  process.exit(1);
}

const claims = new Map();
for (const t of cssTokens) {
  const owners = Object.entries(predicates)
    .filter(([, fn]) => fn(t, isScaleStep))
    .map(([g]) => g);
  claims.set(t, owners);
}

const orphans = [...claims].filter(([, o]) => o.length === 0).map(([t]) => t);
const dupes = [...claims].filter(([, o]) => o.length > 1);
const empty = Object.keys(predicates).filter((g) => ![...claims.values()].some((o) => o.includes(g)));

/* ── 3 · drift ─────────────────────────────────────────────────────────── */
const json = JSON.parse(read('tokens/musy-foundations.tokens.json'));
const expressible = new Set();
for (const sc of SCALES)
  for (const step of Object.keys(json.palette.light[sc] ?? {}))
    if (!step.startsWith('$')) expressible.add(`--${sc}-${step}`);
for (const k of Object.keys(json.palette.light.alpha ?? {}))
  if (!k.startsWith('$')) expressible.add(`--alpha-${k}`);
for (const k of Object.keys(json.semantic.light)) if (!k.startsWith('$')) expressible.add(`--${k}`);
for (const k of Object.keys(json.dimension)) if (!k.startsWith('$')) expressible.add(`--${k}`);
for (const [grp, pre] of [['motion', 'motion-'], ['layout', ''], ['icon', 'icon-'], ['zIndex', 'z-'], ['elevation', 'elevation-']])
  for (const k of Object.keys(json[grp])) if (!k.startsWith('$')) expressible.add(`--${pre}${k}`);
for (const k of Object.keys(json.typography)) {
  if (k.startsWith('$') || k === 'family' || k === 'rules') continue;
  for (const s of ['size', 'line', 'tracking', 'weight', 'family']) expressible.add(`--type-${k}-${s}`);
}
for (const k of Object.keys(json.typography.family)) if (!k.startsWith('$')) expressible.add(`--font-${k}`);

const drift = [...cssTokens.filter((t) => !expressible.has(t)), ...amendTokens].sort();
const listed = [...read('TOKEN-DRIFT.md').matchAll(/`(--[a-z0-9-]+)`/g)].map((m) => m[1]);
const listedSet = new Set(listed);
const missingFromDoc = drift.filter((t) => !listedSet.has(t));
const extraInDoc = [...listedSet].filter((t) => !drift.includes(t));

/* ── report ────────────────────────────────────────────────────────────── */
let bad = false;
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) bad = true; };

ok(orphans.length === 0, `every token is claimed by a page (${cssTokens.length} tokens, ${orphans.length} orphaned)`);
if (orphans.length) console.error('        orphaned: ' + orphans.join(', '));
ok(dupes.length === 0, `no token is claimed twice (${dupes.length} duplicated)`);
for (const [t, o] of dupes) console.error(`        ${t} claimed by ${o.join(' + ')}`);
ok(empty.length === 0, `every page group claims at least one token (${empty.length} empty)`);
if (empty.length) console.error('        empty groups: ' + empty.join(', '));
ok(missingFromDoc.length === 0, `TOKEN-DRIFT.md lists every drifted token (${drift.length} drifted, ${missingFromDoc.length} unlisted)`);
if (missingFromDoc.length) console.error('        unlisted: ' + missingFromDoc.join(', '));
ok(extraInDoc.length === 0, `TOKEN-DRIFT.md lists nothing that is not drifted (${extraInDoc.length} stale)`);
if (extraInDoc.length) console.error('        stale: ' + extraInDoc.join(', '));

console.log('\n  coverage by page:');
const counts = {};
for (const [, o] of claims) if (o.length === 1) counts[o[0]] = (counts[o[0]] ?? 0) + 1;
for (const [g, n] of Object.entries(counts).sort((a, b) => b[1] - a[1]))
  console.log(`    ${g.padEnd(18)}${String(n).padStart(4)}`);
console.log(`    ${'TOTAL'.padEnd(18)}${String(Object.values(counts).reduce((a, b) => a + b, 0)).padStart(4)}`);

process.exit(bad ? 1 : 0);
