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
