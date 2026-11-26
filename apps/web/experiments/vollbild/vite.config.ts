/**
 * Experiment „Vollbild“ (Ben, 2026-11-26): the listen step's overview, and the
 * focus sheet opening in the browser's REAL fullscreen — no address bar, no
 * tab bar, only the sheet. Its own Vite build, outside the app's route table,
 * the way Reflexion and Duett are built (Reflexion's vite.config.ts says why).
 *
 * It renders the app's REAL `SessionListen` and its `Sheet`; `apps/web/src`
 * is not edited. What the experiment adds is one click handler and one effect
 * (`src/fullscreen.ts`, `src/App.tsx`).
 *
 * THE SHIM RULE is Reflexion's: `src/shims/<path with / as __>.ts` replaces
 * `apps/web/src/<path>` for every importer outside `src/shims/`, and a shim can
 * still `export * from` the real module to keep what it does not override.
 *
 * dev:   pnpm --filter web experiment:vollbild:dev  → http://localhost:5184/
 * build: chained into `pnpm --filter web build` → dist/experiments/vollbild/index.html
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';
import type { Plugin } from 'vite';
import appConfig from '../../vite.config';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(HERE, '../..');
const APP_SRC = path.join(APP_ROOT, 'src');
const SHIMS = path.join(HERE, 'src', 'shims');
const OUT = path.join(APP_ROOT, 'dist', 'experiments', 'vollbild');

function shimTable(): Map<string, string> {
  const table = new Map<string, string>();
  for (const file of fs.readdirSync(SHIMS)) {
    const match = /^(.+)\.tsx?$/.exec(file);
    if (match !== null) table.set(match[1].split('__').join('/'), path.join(SHIMS, file));
  }
  return table;
}

function shims(): Plugin {
  return {
    name: 'vollbild-shims',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (importer === undefined || importer.startsWith(SHIMS)) return null;
      if (!source.startsWith('.') && !source.startsWith('/')) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (resolved === null || !resolved.id.startsWith(APP_SRC)) return null;
      const rel = path.relative(APP_SRC, resolved.id).replace(/\.(ts|tsx)$/, '');
      return shimTable().get(rel) ?? null;
    },
  };
}

export default defineConfig(({ command }) =>
  mergeConfig(appConfig, {
    root: HERE,
    envDir: APP_ROOT,
    /* Dev serves at the site root so /assets and /experiments/reflexion/media
       resolve exactly as on musie.org; the build lives under its own folder. */
    base: command === 'build' ? '/experiments/vollbild/' : '/',
    publicDir: command === 'build' ? false : path.join(APP_ROOT, 'public'),
    plugins: [shims()],
    server: { port: 5184, strictPort: true },
    preview: { port: 5185 },
    build: {
      outDir: OUT,
      /* The app's build ran first and owns dist/. */
      emptyOutDir: false,
    },
  }),
);
