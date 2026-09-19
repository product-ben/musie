# @musie/design-system

Layer 1 foundations (tokens) + Layer 2 components for Musy.

```
tokens/         Layer 1 — the token system. CSS custom properties, the DTCG
                mirror for Figma, and the pre-paint theme script.
tokens/fonts/   Self-hosted woff2 files + their OFL licence texts.
src/            Layer 2 — one file per component, plus musy-components.css.
```

## Stylesheet load order

**The four stylesheets must be loaded in this exact order:**

```
1. tokens/musy-fonts.css
2. tokens/musy-foundations.css
3. tokens/musy-foundations-amendments.css
4. musy-components.css
```

Import them once, at the app root:

```ts
import '@musie/design-system/tokens/musy-fonts.css';
import '@musie/design-system/tokens/musy-foundations.css';
import '@musie/design-system/tokens/musy-foundations-amendments.css';
import '@musie/design-system/musy-components.css';
```

### Why the order is load-bearing

They are four separate files on purpose and are not merged.

**`musy-fonts.css`** holds the `@font-face` declarations for the two families
`--font-display` and `--font-text` resolve to. Without it the tokens still
resolve but every step renders in a system fallback. `@font-face` carries no
cascade weight, so its position is about discovery rather than resolution —
the declarations should be parsed before the first element that needs a face.

**`musy-foundations.css`** declares the whole token system: 8 raw colour scales
× 14 steps, 83 semantic aliases, and the dimension layer (spacing, targets,
radius, borders, elevation, focus, motion, z-index, iconography, typography,
breakpoints). It also carries the `prefers-reduced-motion`,
`prefers-contrast: more` and `forced-colors: active` overrides, which are
honoured at the *token* level so components need no branch of their own.
Layer 1 was `[LOCKED]` — byte-identical to the signed-off version — until
2026-09-19, when the two accent families were renamed at source: the
`--interactive-accent-placeholder1/2` tokens became `--interactive-accent-*`
and `--interactive-accent-alt-*`. Nothing else changed: no value, no alias, no
override. The lock is re-established from that version.

The rename was taken in Layer 1 rather than aliased in the amendments file
because "placeholder" was in the public API of nine components, and an alias
would have left both names live and both greppable. See
`stories/OPEN-QUESTIONS.md`, "Phase B.1 — the four decisions, answered".

**`musy-foundations-amendments.css`** declares the two token gaps Layer 2
needs and Layer 1 does not yet have — `--icon-stroke-sm` (gap G1) and
`--border-style-solid` / `--border-style-dashed` (gap G2). They live in a
separate file precisely so `musy-foundations.css` stays untouched; absorbing
them later is a copy-paste into Layer 1, not a rewrite. It declares no property
that `musy-foundations.css` declares, so it must come *after* it but overrides
nothing.

**`musy-components.css`** consumes both. It references `--icon-stroke-sm` and
`--border-style-dashed`, which only the amendments file defines — so loading it
before the amendments leaves those declarations unresolved. Every other
declaration in it resolves to a Layer 1 token or to arithmetic over one.

Merging them would lose that separation and, with it, the guarantee that
Layer 1 is unmodified.

## Fonts

Self-hosted, no third-party request. Nothing in this package ever calls
`fonts.googleapis.com` or `fonts.gstatic.com` — no `<link>`, no `@import`, no
`preconnect`. The woff2 files were fetched once from Google's CSS API and
committed to `tokens/fonts/`.

Both families are **SIL Open Font License 1.1**. The licence texts ship beside
the fonts as `tokens/fonts/SpaceGrotesk-OFL.txt` and `tokens/fonts/Inter-OFL.txt`,
which the licence requires.

### Preload snippet — copy this into the app shell

Put it in `<head>`, **before** the stylesheets, and fix up the two paths to
wherever your bundler emits the fonts:

```html
<!-- Musy webfonts. Self-hosted: no preconnect, no third-party origin.
     LATIN ONLY on purpose — <link rel="preload"> ignores unicode-range, so
     preloading the latin-ext files would fetch 173 KB that most sessions
     never render a glyph from. They load on demand via unicode-range. -->
<link rel="preload" as="font" type="font/woff2" crossorigin
      href="/fonts/space-grotesk-latin.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin
      href="/fonts/inter-latin.woff2">
```

`crossorigin` is required even for same-origin font preloads — fonts are always
fetched in anonymous CORS mode, and without it the browser fetches the file
twice.

Preload only these two. The italic and both `latin-ext` files are genuinely
conditional and should stay that way.

### Which weights are shipped, and why

Both families ship as **variable fonts clamped to `wght 400–700`**, which is
exactly the range the system consumes.

This is not a stylistic preference. Google's API returns the *same file* for
`wght@400;500;700` as for `wght@400..700` — asking for statics yields three
`@font-face` blocks all pointing at one variable file. Shipping statics would
mean committing identical bytes three times: 120.8 KB instead of 40.3 KB for
Space Grotesk, 453.1 KB instead of 270.7 KB for Inter. Dropping Inter's `opsz`
axis took that family from 423.0 KB to 270.7 KB.

**Space Grotesk** — `var(--font-display)`

| Weight | Consumed by |
|---|---|
| 400 | `stage` |
| 500 | `heading-md`, `heading-sm`, `body-xl` |
| 700 | `display-xl`, `display-lg`, `heading-lg` |

Space Grotesk ships no italic, and nothing in the system asks for one.

**Inter** — `var(--font-text)`

| Weight | Consumed by |
|---|---|
| 400 | `body-lg`, `body-md`, `body-sm` |
| 500 | `label-lg`, `label-md` |
| 700 | **Not in the type scale.** `musy-components.css` only — the wizard's selected / `aria-current="step"` label |
| 400 *italic* | **Not in the type scale.** `musy-components.css` only — one rule, the DraggableList empty-state text |

Those last two are single rules and easy to lose in a future cleanup. Drop
Inter 700 and the current wizard step degrades to a synthesised fake-bold; drop
the italic and the browser shears upright Inter into a fake oblique.

Nothing consumes 100–300 or 800–900, which is why the axis is clamped.

### Files

| File | Subset | Axis | Size |
|---|---|---|---|
| `space-grotesk-latin.woff2` | latin | `wght 400–700` | 21.8 KB |
| `space-grotesk-latin-ext.woff2` | latin-ext | `wght 400–700` | 18.5 KB |
| `inter-latin.woff2` | latin | `wght 400–700` | 47.3 KB |
| `inter-latin-ext.woff2` | latin-ext | `wght 400–700` | 83.3 KB |
| `inter-italic-latin.woff2` | latin | `wght 400–700` italic | 50.4 KB |

**221.3 KB total, of which 69.1 KB is the German critical path.**

Each `@font-face` carries Google's own `unicode-range`. German umlauts
(`ä ö ü Ä Ö Ü ß`, U+00C4–U+00FC) live entirely in **latin**, so ordinary German
costs only the two latin files. The `latin-ext` files are fetched only when a
Central or Eastern European character actually appears on screen.

Inter's italic ships **latin only**: it serves exactly one CSS rule, and the
latin-ext italic would have added 89.7 KB — 45% of the payload — for it.

### Layout shift

Every face is `font-display: swap`. With the preload above and a warm HTTP
cache there is no shift on reload: the font is already in memory when first
paint happens.

A first-ever cold load still shows a brief fallback flash before the swap. If
that ever needs solving, the fix is metric-matched fallback `@font-face` blocks
using `size-adjust` / `ascent-override` / `descent-override`, not a change to
`font-display`. That is deliberately not shipped — it adds a block of tuned
numbers that has to be re-measured whenever either font updates.

## Setup the app owes base-ui

These are the consuming app's responsibility, not the package's:

- **`<html lang="de">`** — Layer 1 sets `--text-hyphens: auto` and every
  wrapping text part consumes it. `hyphens: auto` does nothing without a
  language tag, and German compounds overflow narrow columns without it.
- **`isolation: isolate`** on the app root wrapper, so portaled popups
  (Tooltip, Lightbox) always land above page content.
- **`body { position: relative }`** for iOS 26+ Safari backdrops.
- **One `<MusyTooltipProvider>`** near the root, so moving between neighbouring
  icon buttons does not re-run the tooltip open delay.

## Theming

Manual toggle only — the system preference is deliberately not consulted.
`tokens/theme-init.js` sets `data-theme` on `<html>` before first paint and
exposes `window.musyTheme.get() / .set() / .toggle()`. Load it synchronously in
`<head>`, before any stylesheet:

```html
<script src="/path/to/theme-init.js"></script>
```

Every token is declared on `:root, [data-theme]`, so putting `data-theme="dark"`
on any element re-declares the whole set for that subtree and `light-dark()`
re-resolves against it.

## Peer dependencies

`react` (>=19), `@base-ui/react` (^1.7.0) and `lucide-react` (^0.470.0) are
peers — the consuming app supplies them.

## Consuming components

```ts
import { CtaButton, ContentBox, Icon } from '@musie/design-system';
```

The package ships TypeScript source, not a build. The consumer's bundler
compiles it.
