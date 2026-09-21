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

  /**
   * ── A TUNNEL, BECAUSE THE CAMERA NEEDS HTTPS AND A LAN ADDRESS IS NOT ────
   * E.2's camera and E.3's Safari fallback can only be tested on a real phone,
   * and `getUserMedia` requires a secure context. `http://192.168.x.x:5173` is
   * NOT one — Safari refuses the camera there, the step correctly renders
   * `cameraInsecure`, and the tester reads right behaviour as a bug. So the
   * device test goes through an HTTPS tunnel:
   *
   *     cloudflared tunnel --url http://localhost:5173
   *
   * Vite then blocks the request, and rightly: `allowedHosts` is DNS-rebinding
   * protection, which stops a page you visit from resolving its own name to
   * 127.0.0.1 and reading your dev server through your browser. The default is
   * localhost only.
   *
   * `.trycloudflare.com` — the leading dot means the domain and its
   * subdomains — rather than `true`, and rather than pasting each tunnel's
   * name in turn. A quick tunnel gets a fresh random hostname every run, so
   * naming them one at a time means editing this file before every device
   * test, which is how it ends up as `true` permanently. This narrows the
   * opening to one provider used deliberately for this, and it is a DEV
   * SERVER setting: nothing here reaches a build.
   *
   * Add another provider's domain beside it if you tunnel a different way.
   */
  server: {
    allowedHosts: ['.trycloudflare.com'],
  },

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
