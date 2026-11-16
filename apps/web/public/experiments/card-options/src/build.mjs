/* global process, console, URL */
/**
 * Builds card-options into ONE static file, `../<stamp>/index.html`, which is
 * the shape CLAUDE.md rule 10 asks of an experiment:
 *
 *   node apps/web/public/experiments/card-options/src/build.mjs 261112-1137
 *
 * The script and the stylesheet are inlined. The fonts are NOT: the CSS asks
 * for /fonts/<name>.woff2, which is where the app already serves them in both
 * dev and production (vite.config.ts pins them there), and the pictures are
 * the app's own /assets/web/exercises/*.webp. So the file carries nothing that
 * the app does not already ship.
 *
 * Anything else the bundle tries to emit is an error rather than a silent
 * 404: a single file cannot carry it, and nothing would notice it missing.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { build } from 'vite';

const here = fileURLToPath(new URL('.', import.meta.url));
const stamp = process.argv[2];
if (!/^\d{6}-\d{4}$/.test(stamp ?? '')) {
  throw new Error('usage: node build.mjs <yymmdd-hhmm>');
}

const out = mkdtempSync(join(tmpdir(), 'card-options-'));
await build({
  configFile: false,
  root: here,
  base: '/',
  logLevel: 'warn',
  plugins: [react()],
  build: {
    outDir: out,
    emptyOutDir: true,
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: {
      output: {
        assetFileNames(asset) {
          const name = asset.names?.[0] ?? asset.name ?? '';
          return name.endsWith('.woff2') ? 'fonts/[name][extname]' : 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
});

const files = readdirSync(out, { recursive: true }).map(String);
const js = files.filter((f) => /^assets\/index-[\w-]+\.js$/.test(f));
const css = files.filter((f) => /^assets\/(index|style)-[\w-]+\.css$/.test(f));
const fonts = files.filter((f) => /^fonts\/[\w-]+\.woff2$/.test(f));
const stray = files.filter((f) => ![...js, ...css, ...fonts, 'index.html', 'assets', 'fonts'].includes(f));
if (js.length !== 1 || css.length !== 1 || stray.length > 0) {
  throw new Error(`unexpected build output: ${JSON.stringify({ js, css, stray })}`);
}

const fontsDir = fileURLToPath(new URL('../../../../../../packages/design-system/tokens/fonts/', import.meta.url));
for (const font of fonts) {
  if (!existsSync(join(fontsDir, font.slice('fonts/'.length)))) {
    throw new Error(`${font} is not one of the design system's fonts, so the app does not serve it`);
  }
}

const script = readFileSync(join(out, js[0]), 'utf8').replaceAll('</script', '<\\/script');
const style = readFileSync(join(out, css[0]), 'utf8').replaceAll('</style', '<\\/style');
let html = readFileSync(join(out, 'index.html'), 'utf8');
const scriptTag = new RegExp(`<script type="module" crossorigin src="/${js[0]}"></script>`);
const styleTag = new RegExp(`<link rel="stylesheet" crossorigin href="/${css[0]}">`);
if (!scriptTag.test(html) || !styleTag.test(html)) throw new Error('entry tags not found in the built index.html');
html = html
  .replace(styleTag, () => `<style>${style}</style>`)
  .replace(scriptTag, () => `<script type="module">${script}</script>`);

const target = fileURLToPath(new URL(`../${stamp}/`, import.meta.url));
mkdirSync(target, { recursive: true });
writeFileSync(join(target, 'index.html'), html);
rmSync(out, { recursive: true, force: true });
console.log(`${stamp}/index.html  ${Math.round(html.length / 1024)} KB  (fonts from /fonts/: ${fonts.length})`);
