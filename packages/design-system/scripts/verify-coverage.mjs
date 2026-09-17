/**
 * The done-criterion, proved against the rendered DOM.
 *
 * verify-tokens.mjs checks the group PREDICATES partition cleanly. That is
 * necessary but not sufficient: a predicate can claim a token that the page
 * then never renders. --type-body-min-size did exactly that — it matched the
 * typography group, and it also matched the "is a per-step property" regex the
 * page used to exclude step properties, so it was claimed and documented
 * nowhere while every static check passed.
 *
 * So this walks the actual pages in a real browser and asserts:
 *   every custom property in musy-foundations.css is DOCUMENTED on exactly one
 *   foundations page.
 *
 * Documented means owning a row — the first cell of a table row, or a swatch
 * titled with the token name. A token named inside another token's declared
 * value (`--gutter: var(--sp-4)`) is a cross-reference, not a second home.
 * Contrast is excluded from ownership: it must name semantic tokens to
 * describe a pair, but it is not their home.
 *
 * Requires a running Storybook:  pnpm storybook   (then, in another shell)
 *                                node scripts/verify-coverage.mjs
 * Not part of `pnpm check`, which must not depend on a dev server or a browser.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';

const SB = process.env.SB_URL ?? 'http://127.0.0.1:6006';
const PORT = 9222 + (process.pid % 500);
const CHROME = process.env.CHROME_PATH
  ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const idx = await fetch(`${SB}/index.json`).then((r) => r.json()).catch(() => null);
if (!idx) {
  console.error(`FAIL  no Storybook at ${SB} — start it with \`pnpm storybook\` first.`);
  process.exit(1);
}
/* FOUNDATIONS pages only, minus Contrast.
   Ownership is a question about the foundations reference: which page is a
   token's home. Contrast must name semantic tokens to describe a pair, and the
   Layout rules page quotes token names inside its own tables (L9's drop
   indicator names --interactive-accent-placeholder2). Neither is a home, and
   counting them makes real duplicates impossible to see. */
const docs = Object.keys(idx.entries).filter(
  (k) => idx.entries[k].type === 'docs' && k.startsWith('foundations-') && !k.includes('contrast'),
);

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/musy-cov-${process.pid}`,
  'about:blank',
], { stdio: 'ignore' });
const stop = () => { try { chrome.kill(); } catch { /* already gone */ } };

const rpc = (ws, id, method, params = {}) =>
  new Promise((res) => {
    const h = (e) => {
      const m = JSON.parse(e.data);
      if (m.id === id) { ws.removeEventListener('message', h); res(m); }
    };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });

let targets = null;
for (let i = 0; i < 40 && !targets; i++) {
  await new Promise((r) => setTimeout(r, 250));
  targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json()).catch(() => null);
}
if (!targets) { console.error('FAIL  headless Chrome did not start'); stop(); process.exit(1); }

const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 1;
await rpc(ws, id++, 'Page.enable');
await rpc(ws, id++, 'Runtime.enable');

const OWNS = `(() => {
  const root = document.querySelector('#storybook-docs') || document.body;
  const out = new Set();
  for (const tr of root.querySelectorAll('tbody tr'))
    for (const m of (tr.children[0]?.innerText || '').matchAll(/--[a-z0-9-]+/g)) out.add(m[0]);
  for (const el of root.querySelectorAll('[title]')) {
    const t = el.getAttribute('title') || '';
    if (t.startsWith('--')) out.add(t.split(/[\\s\\u2014]/)[0]);
  }
  return [...out];
})()`;

const owners = new Map();
for (const d of docs) {
  await rpc(ws, id++, 'Page.navigate', { url: `${SB}/iframe.html?id=${d}&viewMode=docs` });
  await new Promise((r) => setTimeout(r, 2800));
  const r = await rpc(ws, id++, 'Runtime.evaluate', { returnByValue: true, expression: OWNS });
  for (const t of r.result?.result?.value ?? []) {
    if (!owners.has(t)) owners.set(t, []);
    owners.get(t).push(d.replace('foundations-', '').replace('--docs', ''));
  }
}
ws.close();
stop();

const css = readFileSync(join(root, 'tokens/musy-foundations.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');
const all = [...new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]))].sort();
const missing = all.filter((t) => !owners.has(t));
const multi = all.filter((t) => (owners.get(t) ?? []).length > 1);

let bad = false;
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) bad = true; };
console.log(`  ${all.length} custom properties in musy-foundations.css, ${docs.length} pages walked\n`);
ok(missing.length === 0, `every property is documented on a page (${missing.length} missing)`);
if (missing.length) console.error('        ' + missing.join(', '));
ok(multi.length === 0, `no property is documented on two pages (${multi.length} duplicated)`);
for (const t of multi) console.error(`        ${t} -> ${owners.get(t).join(', ')}`);
process.exit(bad ? 1 : 0);
