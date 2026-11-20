/**
 * Experiment „Duett 01“: its own Vite build, outside the app's route table,
 * the way the Reflexion experiment is built (its vite.config.ts says why).
 *
 * ONE SHIM: `src/instruments/engine/answer.ts` is replaced by
 * `src/shims/instruments__engine__answer.ts` — for importers inside the app's
 * `src/` only (host.ts). The experiment's own modules import the real one,
 * which the shim itself re-exports, so there is no cycle.
 *
 * dev:   pnpm --filter web experiment:duett:dev  → http://localhost:5182/
 * build: chained into `pnpm --filter web build` → dist/experiments/duett/index.html
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
const OUT = path.join(APP_ROOT, 'dist', 'experiments', 'duett');

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
    name: 'duett-shims',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (importer === undefined || !importer.startsWith(APP_SRC)) return null;
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
    /* Dev serves at the site root so /instruments and /fonts resolve exactly
       as on musie.org; the build lives under its own folder. */
    base: command === 'build' ? '/experiments/duett/' : '/',
    publicDir: command === 'build' ? false : path.join(APP_ROOT, 'public'),
    plugins: [shims()],
    server: { port: 5182, strictPort: true },
    preview: { port: 5183 },
    build: {
      outDir: OUT,
      /* The app's build ran first and owns dist/. */
      emptyOutDir: false,
    },
  }),
);
