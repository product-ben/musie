# TOKEN-DRIFT.md

**Generated — do not hand-edit.** `pnpm --filter @musie/design-system verify:tokens`
regenerates the comparison and fails if this file and the sources disagree.

## What this is

`tokens/musy-foundations.css` is the source of truth for the design system.
`tokens/musy-foundations.tokens.json` is the DTCG mirror that Figma consumes.
The JSON is **behind**. This file is every property the stylesheet declares that
the JSON has no way to express, plus the amendment tokens that live in neither.

Consequence: anything listed here exists in code and **not** in Figma. A designer
working from the Figma libraries cannot see these, and a token pipeline that
regenerates CSS from the JSON would silently delete them.

**35 properties in `musy-foundations.css` have no JSON expression.**
**4 more live only in `musy-foundations-amendments.css`.**
Total: **39**.

| Group | n |
|---|---|
| The `stage` type step | 5 |
| Semantic radius aliases | 5 |
| Focus ring | 4 |
| Motion travel | 3 |
| Named font weights | 3 |
| Typography rules and measures | 6 |
| Spacing roles | 2 |
| Elevation ring | 1 |
| Grid gap | 1 |
| The measured viewport | 5 |
| Amendment tokens | 4 |

## The `stage` type step

A whole type step. `musy-components.css:1383` ships a live `[data-type-step="stage"]` rule and the CSS defines all five properties, but the JSON's `typography` object has no `stage` key at all — so Figma has never seen this step. It was also missing from the `TypeStep` TypeScript union until this repo's move pass added it.

| Token | Declared in CSS |
|---|---|
| `--type-stage-family` | `var(--font-display)` |
| `--type-stage-line` | `1.28` |
| `--type-stage-size` | `clamp(26px, calc(22.997px + 0.7641vw), 34px)` |
| `--type-stage-tracking` | `-0.008em` |
| `--type-stage-weight` | `var(--font-weight-regular)` |

## Semantic radius aliases

The JSON carries the six raw steps (`radius-xs` … `radius-full`) but none of the five role aliases. These are the ones a component should actually reference, so the layer Figma mirrors is the layer nothing consumes.

| Token | Declared in CSS |
|---|---|
| `--radius-card` | `var(--radius-md)` |
| `--radius-control` | `var(--radius-full)` |
| `--radius-input` | `var(--radius-sm)` |
| `--radius-panel` | `var(--radius-lg)` |
| `--radius-sheet` | `var(--radius-xl)` |

## Focus ring

The JSON has `focus-ring-offset` and `focus-ring-clearance` only. The width, colour, style and the composed `--focus-ring` shorthand — the parts that decide what the indicator looks like — are CSS-only.

| Token | Declared in CSS |
|---|---|
| `--focus-ring` | `var(--focus-ring-width) var(--focus-ring-style) var(--focus-ring-color)` |
| `--focus-ring-color` | `var(--border-focus)` |
| `--focus-ring-style` | `solid` |
| `--focus-ring-width` | `var(--border-width-focus)` |

## Motion travel

The three travel distances. Their absence matters more than it looks: reduced motion works by setting these to `0px`, so a Figma consumer reading the JSON cannot see the mechanism that makes a slide become a cross-fade.

| Token | Declared in CSS |
|---|---|
| `--motion-travel-lg` | `32px` |
| `--motion-travel-md` | `16px` |
| `--motion-travel-sm` | `8px` |

## Named font weights

The JSON bakes weights into each typography composite as literals (`"fontWeight": 700`). The three named tokens have no JSON existence, so there is nothing to change if the scale ever re-weights.

| Token | Declared in CSS |
|---|---|
| `--font-weight-bold` | `700` |
| `--font-weight-medium` | `500` |
| `--font-weight-regular` | `400` |

## Typography rules and measures

`typography.rules` in the JSON holds the same ideas as `$type: "other"` values (`measureBody`, `wrapHeading`, `hyphens`, `bodyMinStep`) but under different names and not as tokens, so no automated mapping recovers them.

| Token | Declared in CSS |
|---|---|
| `--measure-body` | `62ch` |
| `--measure-heading` | `26ch` |
| `--text-hyphens` | `auto` |
| `--text-wrap-body` | `pretty` |
| `--text-wrap-heading` | `balance` |
| `--type-body-min-size` | `var(--type-body-md-size)` |

## Spacing roles

The JSON has `space-inset-control` but not the card or sheet insets.

| Token | Declared in CSS |
|---|---|
| `--space-inset-card` | `var(--sp-5)` |
| `--space-inset-sheet` | `var(--sp-6)` |

## Elevation ring

The JSON records `elevation.darkStrategy` as prose instead. The ring is the actual mechanism dark-mode elevation depends on, and it is themed (transparent in light, `sand-7` in dark).

| Token | Declared in CSS |
|---|---|
| `--elevation-ring` | `light-dark(transparent, var(--sand-7))` |

## Grid gap

`layout` has `gutter`, `columns` and `container-max` but not `grid-gap`, which steps independently at the 1280 breakpoint.

| Token | Declared in CSS |
|---|---|
| `--grid-gap` | `var(--sp-4)` |

## The measured viewport

The one group here that the JSON could not express **even in principle**, which
is why it is worth reading rather than counting.

`--viewport-block` has no static value. It is declared `100svh` as a floor and
then **overwritten at runtime** by `theme-init.js` with
`visualViewport.height`, because on a phone none of the three CSS units is the
number you want: `vh` is the large viewport and hides a view's own buttons
under Safari's toolbar, `dvh` resizes under the reader as that toolbar slides
away, and `svh` is stable but is the smallest the window ever gets. A design
token whose value is a measurement is not a thing Figma has a slot for.

`--chrome-block` is what the app shell takes before any view starts — the
sticky header plus `<main>`'s insets — and it is **declared per breakpoint**,
in the same media queries the gutter steps in, even though all four values are
currently identical. That
is deliberate: the day the header's control grows, it has to be changeable
here rather than in a `calc` inside a screen.

`--view-block` is the subtraction, and it is the only one a screen should use.

| Token | Declared in CSS |
|---|---|
| `--viewport-block` | `100svh`, then a measured `px` value at runtime |
| `--chrome-block` | `calc(var(--target-primary) + (var(--sp-3) * 2) + var(--border-width-hairline) + var(--sp-5) + var(--sp-7))` |
| `--view-block` | `calc(var(--viewport-block) - var(--chrome-block))` |
| `--sticky-block` | `calc(var(--target-primary) + (var(--sp-3) * 2) + var(--border-width-hairline))` |
| `--view-block-scrolled` | `calc(var(--viewport-block) - var(--sticky-block))` |

There are two subtractions because there are two situations. A view you LAND
on has the sticky header and `<main>`'s insets above it; a view you SCROLL TO
has only the sticky header over it by the time you are there. Sizing the
second kind with the first leaves it short of the window by the insets, and a
band of the next view shows under it.

## Amendment tokens

These are in neither `musy-foundations.css` nor the JSON. They live in
`musy-foundations-amendments.css` **by design** — Layer 1 is `[LOCKED]` and
byte-identical to sign-off, so the token gaps Layer 2 needed were staged beside
it rather than edited into it. They are listed here because the effect is the
same for anyone reading the JSON: the tokens are invisible.

| Token | Declared | Gap |
|---|---|---|
| `--border-style-dashed` | `dashed` | G2 |
| `--border-style-solid` | `solid` | G2 |
| `--icon-stroke-sm` | `1.5px` | G1 |
| `--on-scrim` | `light-dark(var(--sand-1), var(--sand-12))` | G3 |

## What is NOT drift

Two differences are structural rather than missing data, and are not listed above:

- **Themes are split.** The CSS collapses both themes into one declaration via
  `light-dark()`; the JSON splits them into parallel `light` / `dark` trees,
  because Figma modes need them separate. Same data, different shape.
- **Typography is composite.** The CSS has five flat properties per step; the
  JSON has one `$type: "typography"` object per step with a `fontSizeMax` field
  capturing the top of the `clamp()`. Same data, different shape.
