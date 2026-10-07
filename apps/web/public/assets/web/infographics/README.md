# Step infographics

One drawing per **step of the session flow** — the app's own artwork, not the
content's. That is the whole distinction from `../exercises/`: an exercise card
image is chosen by a row (`exercises.image_url`) because there is one per
exercise, and a step picture is the same for every exercise, so it is a
constant in the screen that draws it.

| file | step | drawn by |
|---|---|---|
| `infographic-listen-and-see.png` | Listen (D.5b) | `INFOGRAPHIC_SRC`, `apps/web/src/components/SessionListen.tsx` |

## Wiring one up

Three edits, and no migration:

1. the file here,
2. a `const …_SRC = '/assets/web/infographics/…'` in the component — **leading
   slash**, because `public/assets/**` is served at `/assets/**` and a
   document-relative URL resolves against whatever route is showing,
3. an `alt` key in **both** `apps/web/src/i18n/en.ts` and `de.ts`
   (`session.listen.infographicAlt` is the worked example). Nothing
   user-visible is written inline — CLAUDE.md 7 — and `de.ts` is typed against
   `en.ts`, so an English-only key fails `pnpm check`.

## The shipped file

`infographic-listen-and-see.png` is **1672 × 941, 2.9 MB**, the master as
delivered.

That is heavier than anything else under `public/`, and everything under
`public/` is copied into the build verbatim and served to every visitor. The
exercise set next door was re-encoded for exactly this reason — 17 MB of PNG
for one screen became 748 KB of WebP — and the one line that did it is in
`../exercises/README.md`:

```js
sharp(src).resize(1672, 941, { fit: 'inside' }).webp({ quality: 80, effort: 6 })
```

The listen step is phone-first and the picture is above the fold, so this is a
real cost on a real screen. It is kept as the delivered PNG for now because the
artwork is still moving; re-encode before anything ships.
