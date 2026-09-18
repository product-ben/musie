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

Storybook ships **with the web app, at `/storybook/`** — one Netlify site, one
deploy. `scripts/netlify-build.sh` builds the app, builds Storybook, and copies
Storybook into `apps/web/dist/storybook/`.

It also copies the design system's `assets/` and `tokens/` to the **domain
root**, as `/assets/web/` and `/foundations-tokens/`. That is not tidiness:
Logo's default `src` is the root-absolute `/assets/web/musy-logo.png`, and the
Typography page's iframes load `/foundations-tokens/musy-fonts.css`. Both would
404 under a subpath, so the files are placed where those paths point. There is
no collision with the app — Vite emits hashed `index-*.js` / `*.css` directly
into `assets/`.

`netlify.toml` carries a `/storybook/*` redirect **before** the app's catch-all.
Netlify evaluates redirects in order, so without it every Storybook deep link
would be served the app's `index.html`.

To run the exact published build locally:

```bash
./scripts/netlify-build.sh
cd apps/web/dist && python3 -m http.server 8080   # / is the app, /storybook/ is Storybook
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
