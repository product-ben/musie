/**
 * Experiment „Reflexion 01“: its own Vite build, OUTSIDE the app's route table.
 *
 * WHY A SEPARATE BUILD (CLAUDE.md rule 10, Phase 0 of the brief): every route
 * of the app sits behind the sign-in gate, and the content tables, the track
 * bucket and the instrument definitions are closed to `anon`. So the
 * experiment is a static page under /experiments that mounts the app's REAL
 * stepper (`routes/Session.tsx`) and swaps the modules that talk to Supabase
 * for in-memory shims with baked content. `apps/web/src` is not edited.
 *
 * THE SHIM RULE: a file `src/shims/<path with / as __>.ts` replaces
 * `apps/web/src/<path>` for every importer outside `src/shims/`. So
 * `src/shims/lib__content.ts` replaces `src/lib/content.ts`, and the shim
 * itself can still `export * from '../../../../src/lib/content'` to keep
 * everything it does not override. Adding a shim is adding a file.
 *
 * dev:   pnpm --filter web experiment:reflexion:dev  → http://localhost:5180/experiments/reflexion/harfe/
 * build: chained into `pnpm --filter web build`, writes
 *        dist/experiments/reflexion/{harfe,body-scan,freie-bahn}/index.html
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
const OUT = path.join(APP_ROOT, 'dist', 'experiments', 'reflexion');

export const SLUGS = ['harfe', 'body-scan', 'freie-bahn'] as const;

function shimTable(): Map<string, string> {
  const table = new Map<string, string>();
  if (!fs.existsSync(SHIMS)) return table;
  for (const file of fs.readdirSync(SHIMS)) {
    const match = /^(.+)\.tsx?$/.exec(file);
    if (match === null) continue;
    table.set(match[1].split('__').join('/'), path.join(SHIMS, file));
  }
  return table;
}

function shims(): Plugin {
  return {
    name: 'reflexion-shims',
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

/** One HTML per link; the page reads its exercise from the path. */
function threeLinks(): Plugin {
  return {
    name: 'reflexion-three-links',
    apply: 'build',
    closeBundle() {
      const built = path.join(OUT, 'index.html');
      if (!fs.existsSync(built)) return;
      const html = fs.readFileSync(built, 'utf8');
      for (const slug of SLUGS) {
        fs.mkdirSync(path.join(OUT, slug), { recursive: true });
        fs.writeFileSync(path.join(OUT, slug, 'index.html'), html);
      }
      fs.rmSync(built);
    },
  };
}

export default defineConfig(({ command }) =>
  mergeConfig(appConfig, {
    root: HERE,
    envDir: APP_ROOT,
    /* Dev serves at the site root so /instruments, /assets and /fonts resolve
       exactly as on musie.org; the build lives under its own folder. */
    base: command === 'build' ? '/experiments/reflexion/' : '/',
    publicDir: command === 'build' ? false : path.join(APP_ROOT, 'public'),
    plugins: [shims(), threeLinks()],
    server: { port: 5180, strictPort: true },
    preview: { port: 5181 },
    build: {
      outDir: OUT,
      emptyOutDir: true,
    },
  }),
);
