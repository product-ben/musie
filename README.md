# Musie

## Run locally

Install [pnpm](https://pnpm.io/installation) and Node.js 22, then run:

```bash
pnpm install
pnpm --filter web dev
```

Open the local URL shown by Vite (usually `http://localhost:5173`).

## Run checks

Run the same checks required before a Netlify build:

```bash
pnpm check
```

Create a production build locally with:

```bash
pnpm check && pnpm --filter web build
```

### The two suites that are NOT in `pnpm check`

Both need the local Supabase stack running, and CI does not have one. A suite
that silently skips is worse than no suite, so neither is folded into `check`
— each fails loudly with a message telling you to start the stack.

```bash
supabase start

pnpm test:db     # database security + parity, against the local stack
pnpm test:e2e    # one Playwright walk of a whole session, run once per locale
```

`test:e2e` starts the dev server itself and reuses one already on :5173. The
first run needs browsers:

```bash
pnpm --filter web exec playwright install chromium
```

## Environment variables

Web-app environment variables live in `apps/web/.env.local` for local development.
Use `apps/web/.env.example` as the template. Vite exposes browser variables only
when their names start with `VITE_`. For Netlify builds, configure the same
variables in the site's **Project configuration > Environment variables**.

## Storybook

The design system's Storybook covers 26 components (258 stories), the
foundations token reference and the Layer 3 layout rules.

```bash
pnpm storybook          # dev server on :6006
pnpm build:storybook    # static build into packages/design-system/storybook-static
```

### Where it is deployed

**GitHub Pages**, at `https://product-ben.github.io/musie/`, published by
`.github/workflows/storybook.yml` on every push to `main` that touches
`packages/design-system/`.

Pages and Actions are free with no build-minute allowance on a public
repository, which is why the docs live here and not on Netlify. It also
decouples them: a broken app build no longer stops Storybook publishing, and
vice versa.

**One-time setup:** Settings → Pages → Build and deployment → Source:
**GitHub Actions**.

#### The base path matters

Pages serves a project site under `/<repo>/`, not at a domain root. The
workflow therefore builds with `STORYBOOK_BASE_PATH=/musie/`, which
`.storybook/main.ts` turns into Vite's `base`.

Anything in a story that points at a served file must go through `asset()` in
`stories/_decorators.tsx`, which prefixes `import.meta.env.BASE_URL`. Written as
`/assets/…` it resolves against the domain root and 404s on Pages. The one place
this cannot reach is `Logo`'s default `src`, which is root-absolute in the
component; the Logo stories pass a base-aware `src` instead. See that page's
Build notes.

To reproduce the published build locally:

```bash
cd packages/design-system
STORYBOOK_BASE_PATH=/musie/ npx storybook build
mkdir -p /tmp/pages/musie && cp -R storybook-static/. /tmp/pages/musie/
cd /tmp/pages && python3 -m http.server 8080   # then open /musie/
```

## Connect Netlify

After pushing this repository to GitHub:

1. Sign in to [Netlify](https://app.netlify.com/).
2. Select **Add new project**, then **Import an existing project**.
3. Choose **GitHub** and authorize Netlify if prompted.
4. Select the `product-ben/musie` repository.
5. On the setup screen, confirm the branch is `main`.
6. Confirm the build settings are read from `netlify.toml`:
   - Build command: `pnpm check && pnpm --filter web build`
   - Publish directory: `apps/web/dist`
   - Node version: `22`
7. Select **Deploy `product-ben/musie`**.

Netlify will deploy on every push to `main`. The first successful deployment
provides the Netlify URL, and the redirect in `netlify.toml` keeps future
single-page-app deep links working.
