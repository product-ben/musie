#!/usr/bin/env bash
# Netlify build: the web app, with Storybook embedded at /storybook/.
#
# ONE SITE, TWO THINGS. The app is published from apps/web/dist as before;
# Storybook is built separately and copied in underneath it.
#
# WHY THE DESIGN-SYSTEM STATIC FILES ALSO LAND AT THE DOMAIN ROOT.
# Storybook's own bundles are referenced relatively (./assets/…), so they work
# fine under /storybook/. But two things inside the stories are referenced
# ROOT-absolutely and would 404 under a subpath:
#   · Logo's default src, '/assets/web/musy-logo.png' (src/Logo.tsx)
#   · the Typography page's iframes, '/foundations-tokens/musy-fonts.css'
# Rather than rewrite either — Logo's default is component API, not ours to
# change — the same files are placed where those paths actually point. There is
# no collision with the app: Vite emits hashed index-*.js/css directly into
# assets/, and these occupy assets/web/ and foundations-tokens/.
set -euo pipefail

APP_DIST="apps/web/dist"
SB_SRC="packages/design-system/storybook-static"

echo "→ checks"
pnpm check

echo "→ web app"
pnpm --filter web build

echo "→ storybook"
pnpm build:storybook

echo "→ embedding storybook at /storybook/"
rm -rf "${APP_DIST:?}/storybook"
mkdir -p "$APP_DIST/storybook"
cp -R "$SB_SRC/." "$APP_DIST/storybook/"

echo "→ design-system static files at the domain root"
mkdir -p "$APP_DIST/assets"
cp -R packages/design-system/assets/. "$APP_DIST/assets/"
rm -rf "${APP_DIST:?}/foundations-tokens"
cp -R packages/design-system/tokens "$APP_DIST/foundations-tokens"

echo "✓ published tree:"
echo "   /                    the web app"
echo "   /storybook/          $(find "$APP_DIST/storybook" -type f | wc -l | tr -d ' ') files"
echo "   /assets/web/         $(ls "$APP_DIST/assets/web" | wc -l | tr -d ' ') files"
echo "   /foundations-tokens/ $(find "$APP_DIST/foundations-tokens" -type f | wc -l | tr -d ' ') files"
