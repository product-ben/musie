# Musie

## Run locally

Install [pnpm](https://pnpm.io/installation) and Node.js 22, then run:

```bash
pnpm install
pnpm --filter web dev
```

Open the local URL shown by Vite (usually `http://localhost:5173`).

## Run checks

Run the same checks the Cloudflare Workers build runs before it deploys:

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
when their names start with `VITE_`. For the hosted build, configure the same
variables per build trigger under **Workers & Pages > musie > Settings > Build >
Variables and secrets**. They are read at BUILD time and compiled into the
bundle, so changing one means rebuilding — see `docs/MUSIE-SETUP.md` section 3,
which lists the exact three and why none of them is a secret.

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
repository, which is why the docs live here rather than on the app's host. It
also decouples them: a broken app build no longer stops Storybook publishing,
and vice versa.

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

## Where the app is deployed

**Cloudflare Workers**, as an assets-only Worker named `musie` serving
`apps/web/dist`. Workers Builds is connected to the GitHub repository, so a
push to `main` builds and deploys on its own — there is no deploy step to run
and no GitHub Actions workflow for it.

```
build:  pnpm check && pnpm --filter web build
deploy: npx wrangler deploy
root:   /
```

The build command is the full gate, so a red test stops a deploy.

`wrangler.jsonc` at the repo root is the whole configuration, and two things in
it are load-bearing:

- `not_found_handling: "single-page-application"` — the `/*` to `/index.html`
  rewrite. `router.tsx` is a `createBrowserRouter`, so `/diary` and
  `/session/:id/:step` are real paths with no file behind them. Cloudflare does
  not infer this from the presence of `index.html`; omit it and only deep links
  and refreshes break.
- `workers_dev` and `preview_urls` — production at
  `musie.lipinskib.workers.dev`, plus a public URL per non-production branch
  build. A dashboard toggle does not hold; the next deploy restores whatever
  this file says.

Cloudflare Access sits in front of the preview URLs only. Production is closed
by the app's own sign-in gate instead.

**`docs/MUSIE-SETUP.md` is the full account** — the accounts, the ids, the
environment variables, the gate and the tester script.
