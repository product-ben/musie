# Card artwork

One image per **card of the Mindfulness deck**, named after the card's `id` —
which is the lower case of its printed `code` by deck rule, so the wiring is a
lookup rather than a decision. `cards.image_url` names the file and
`supabase/content/deck.json` is where that name is written; nothing here is
referenced from a component by hand.

| file | card | code on the back |
|---|---|---|
| `mc-01.webp` … `mc-09.webp` | the nine cards | `MC-01` … `MC-09` |

## The shipped file

**768 × 562 WebP, quality 80, ~870 KB for the set.**

The masters are the print exports — 1420 × 1040 JPEGs, 8.3 MB together — and
they live **outside this folder on purpose**: `apps/web/deck-print/` is
gitignored build output, and everything under `public/` is copied into the
build verbatim and served to every visitor. A master kept here would ship
whether or not anything asked for it, which is the mistake
`../exercises/README.md` and `../infographics/README.md` both record.

```js
sharp(src).resize(768).webp({ quality: 80, effort: 6 })
```

768 is Ben's call, 2026-10-09. `.musie-diary__card-art` caps the display at
`calc(var(--measure-body) * 0.6)` — about 420px — so the file is roughly 1.8×
the largest slot it is drawn in, which is the retina margin. **If the card is
ever shown larger than that cap, re-encode wider first**: at the full
`--measure-body` this file is barely 1× and will soften.

## Alt text

There is none, deliberately. `card_i18n.image_alt` is null for all nine and the
card is drawn with `alt=""` next to its own code in text — the same rule the
diary graph states: a picture whose neighbour already names it announces it
twice. The column stays for the day a card is shown without its code beside it.
