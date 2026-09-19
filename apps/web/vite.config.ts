import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

const requireFrom = createRequire(import.meta.url);

/**
 * tokens/fonts inside @musie/design-system, wherever pnpm linked it.
 * Resolved through the package's own `exports` map ("./package.json"), never a
 * relative path into packages/.
 */
const FONTS_DIR = path.join(
  path.dirname(requireFrom.resolve('@musie/design-system/package.json')),
  'tokens',
  'fonts',
);

const FONT_REQUEST = /^\/fonts\/([A-Za-z0-9-]+\.woff2)$/;

/**
 * Serve /fonts/*.woff2 in DEVELOPMENT from the design system package.
 *
 * WHY THIS EXISTS. musy-fonts.css references ./fonts/*.woff2, so in production
 * Vite emits those files itself and `assetFileNames` below pins them to
 * /fonts/<name>.woff2 — which is what makes the static preload in index.html
 * match the request the stylesheet actually makes. In dev, Vite serves the
 * same files from their node_modules path instead, so without this middleware
 * the two preload hints would 404 on every page load.
 *
 * The alternative — copying the woff2 files into public/ — was rejected: the
 * stylesheet would still emit its own hashed copies in production, so every
 * font would be fetched twice and the preload would warm the wrong URL. The
 * logo IS copied into public/, because no stylesheet references it and there
 * is nothing to collide with.
 */
function devFonts(): Plugin {
  return {
    name: 'musie-dev-fonts',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const match = FONT_REQUEST.exec((req.url ?? '').split('?')[0]);
        if (match === null) {
          next();
          return;
        }
        const file = path.join(FONTS_DIR, match[1]);
        if (!fs.existsSync(file)) {
          next();
          return;
        }
        res.setHeader('Content-Type', 'font/woff2');
        res.setHeader('Cache-Control', 'no-cache');
        fs.createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devFonts()],
  build: {
    rollupOptions: {
      output: {
        /**
         * Fonts keep their names; everything else keeps Vite's default hash.
         * A hashed font filename cannot be preloaded from static HTML, and an
         * unmatched preload is worse than none — it fetches the file twice.
         * Cache-busting is not lost: these two files are immutable and
         * versioned with the design system.
         */
        assetFileNames(asset) {
          const name = asset.names?.[0] ?? asset.name ?? '';
          return name.endsWith('.woff2')
            ? 'fonts/[name][extname]'
            : 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
});
