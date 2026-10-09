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

`infographic-listen-and-see.webp` is **1672 × 941, 198 KB**, quality 80.

It shipped as the delivered PNG for two days — 2.9 MB, heavier than everything
else under `public/` put together — because the artwork was still moving and
there was no second step picture to set a format against. Re-encoded on
2026-10-09, before the first deploy that would have served it. The line is the
exercise set's, unchanged but for the dimensions:

```js
sharp(src).resize(1672, 941, { fit: 'inside' }).webp({ quality: 80, effort: 6 })
```

**93% off, and the loss is invisible where it is used.** Checked at 1:1 against
the master rather than assumed, which is what the paragraph this replaces asked
for: the engraving lines, the note glyphs and the card edges are intact, and
only the paper grain is softened — lossy compression doing its job on noise.
`.musie-listen__infographic` caps the display at `--measure-body`, 704px, so
the 1672px source renders downscaled 2.4× and the grain is below the rendered
resolution either way.

**The master lives outside the repo**, at
`~/Documents/musie-artwork/infographics/` on Ben's machine, beside the exercise
set's. Everything under `public/` is copied into the build verbatim, so a
master kept here ships to every visitor without ever being requested — which is
exactly what happened to this one.
