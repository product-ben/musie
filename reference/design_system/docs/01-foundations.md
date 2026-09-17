# Foundations

Product: **Musy** — guided music-therapy methods. Mobile-first web app, German
primary, non-technical audience from kindergarten (assisted) to 50, used
one-handed, often alongside sound, sometimes in a group of 7–8 children.

Three constraints shaped almost every number below:

1. **German runs ~30% longer than English.** Nothing may depend on a string
   length; line-heights, measures and hyphenation are set from the German.
2. **Limited cognitive and physical ability is in scope.** Targets, body size
   and contrast are set above the WCAG floor, not at it.
3. **Dark mode is re-derived, not inverted.** Every pair is measured twice.

---

## 1. Naming convention · §4.11

    <category>-<role>-<variant>-<state>

Lowercase, hyphen-separated, no abbreviations except the `sp` spacing scale
(kept because the Figma collection already uses it).

| Part | Values |
|---|---|
| category | `surface` `on-surface` `border` `interactive` `accent` `feedback` `space` `target` `radius` `border-width` `elevation` `focus-ring` `motion` `z` `icon` `type` `bp` |
| role | `primary` `accent-placeholder1` `ghost` `info` `raised` `sunken` … |
| variant | `subtle` `inverse` `strong` `sm`/`md`/`lg` … |
| state | `hover` `active` `disabled` `on` `on-subtle` `on-disabled` |

**Figma mirror.** CSS `--interactive-primary-subtle-hover` is Figma
`interactive/primary-subtle-hover`. One rule converts either direction: the CSS
name is the Figma path with `/` replaced by `-`. Raw primitives are
`palette/<scale>/<step>` in Figma, `--<scale>-<step>` in CSS.

Two names are literal placeholders because you asked for them:
`interactive-accent-placeholder1` (currently ocher) and
`interactive-accent-placeholder2` (currently purple). They resolve today; rename
both sides when you decide what they are.

**No exceptions in the file.** `edge` and `press` are raw *steps*, not
categories, so they sit in the step position: `--terracotta-edge`.

---

## 2. Colour — raw palette · §4.1 `[SEED]`

Eight Radix-structured 12-step scales, one declaration per step carrying both
themes. Full values: [05-palette-reference.md](05-palette-reference.md).

| Scale | Origin |
|---|---|
| `sand` | The terracotta-toned neutral. All five Figma neutral variables land on real steps |
| `terracotta` | Figma `accent/terracotta` |
| `ocher` | Figma `accent/ocher` |
| `purple` | Figma `accent/purple` |
| `info` `success` `warning` `error` | **New** — requested in §4.1. No brand colour was invented; these are feedback-only and never used decoratively |

### How the steps are placed

Radix's five use-classes are the structure: backgrounds (1–2), interactive
component fills (3–5), borders (6–8), solids (9–10), accessible text (11–12).

- **1–8 curve-placed** in OKLCH — a fixed lightness ladder per theme with a
  chroma curve that peaks at the solid and falls away at both ends. This is what
  makes step 4 read as "the same colour, hovered" rather than a different colour.
- **9–10 brand-anchored.** Step 9 keeps the Figma lightness unless its intended
  foreground fails 4.5:1; then and only then does it move, minimally.
- **11, 12, edge, press contrast-solved.** A solver walks lightness until the
  ratio holds against *every surface the token can legally land on* — the
  neutral surfaces **and** all eight scales' steps 3/4/5. That last part matters:
  it is why muted text still holds 4.5:1 inside a tinted card, which is where
  most systems quietly fail.

### Two additions beyond Radix

| Step | Why it exists |
|---|---|
| `edge` | Radix's step 8 does *not* guarantee 3:1, so nothing in a stock Radix scale is legal on a control boundary under 1.4.11. `edge` is solved to 3:1 and is the only border token allowed there. |
| `press` | A pressed solid cannot simply be step 11 — for the light-solid scales (ocher, purple, warning) step 11 is dark, which would put dark text on a dark fill. `press` is solved so the step-9 foreground stays legal. |

### The five neutral variables, mapped

| Figma | Step | Kept exactly? |
|---|---|---|
| `surface` #FBF8F2 | `sand-1` | yes |
| `bg/primary` #F3ECE0 | `sand-2` | lightness exact |
| `bg/secondary` #EAE1D0 | `sand-3` | lightness exact |
| `border` #DDD2BD | `sand-6` | lightness exact |
| `border-strong` #C7B99C | `sand-8` | lightness exact — but **not** used as `border-strong`; see deltas |
| `ink/primary` #1C1A17 | `sand-12` | **hex exact, both themes** |

### Consolidated (§7)

- `ink/secondary` + `ink/muted` → one `on-surface-muted`. Two greys, one job.
- Figma's ad-hoc 12/13/14/16/18/26/40px text sizes → 10 named type steps.
- `Corner/Small` + `Corner/Medium` + the 8/16/999px values used only on screens
  → a 6-step radius scale with 5 semantic roles.
- Feedback gets **no** `-solid`/`-on-solid` pair. Toasts and banners both use
  the soft treatment (`-surface` + `-border` + `-icon` + `-text`), so a solid
  variant would be a token with no stated purpose.
- Only **four** alpha values exist in the whole system (a scrim and two shadow
  colours). You chose solids-only; alpha appears only where a scrim or shadow
  genuinely cannot be a solid.

---

## 3. Colour — semantic layer · §4.2 `[OPEN]`

Raw hex appears **only** in Layer 1. Components reference Layer 2 exclusively.

### Surfaces — the paper-on-canvas model

The Figma screens put a *lighter* card on a *warmer, darker* page. That is the
model, and it is preserved in both themes — which means the two themes point at
different raw steps:

| Token | Light | Dark |
|---|---|---|
| `surface` | `sand-2` | `sand-2` |
| `surface-raised` | `sand-1` (lighter) | `sand-4` (lighter) |
| `surface-sunken` | `sand-3` (darker) | `sand-1` (darker) |
| `surface-overlay` | `sand-1` | `sand-4` |

Raised is always *lighter* than the page; sunken always *darker*. Inverting the
scale would have made raised go dark in dark mode, which reads as a hole rather
than a card.

### Text

`on-surface` (sand-12) · `on-surface-muted` (sand-11, still a full 4.5:1) ·
`on-surface-disabled` (sand-9, exempt but held near 3:1) · `on-surface-inverse`.

There is deliberately **no third text level**. A muted step that fails 4.5:1 is
not a design option for this audience.

### Borders

| Token | Rule |
|---|---|
| `border-subtle` | Dividers and decoration **only**. Barred from interactive boundaries |
| `border-strong` | The only neutral border permitted on a control boundary. Solved ≥3:1 |
| `border-focus` | See §8 |

When 1.4.11 needs a boundary: a control whose fill is already ≥3:1 against the
surface needs no border. A control whose only affordance is its outline —
secondary button, text input, unselected chip — **must** use `border-strong` or
its family's `-border`.

### Interactive families

Three families, identical shape, so a component can be written once and
re-skinned by swapping one prefix:

    --interactive-<family>              solid fill, at rest
    --interactive-<family>-hover        solid, hover
    --interactive-<family>-active       solid, pressed  (the solved press step)
    --interactive-<family>-disabled     neutral fill
    --interactive-<family>-on           foreground on the solid
    --interactive-<family>-on-disabled  foreground on the disabled fill
    --interactive-<family>-subtle       tinted fill, at rest
    --interactive-<family>-subtle-hover
    --interactive-<family>-subtle-active
    --interactive-<family>-on-subtle    foreground on any tinted state
    --interactive-<family>-border       boundary, ≥3:1

- `interactive-primary` → terracotta
- `interactive-accent-placeholder1` → ocher
- `interactive-accent-placeholder2` → purple
- `interactive-ghost` → neutral; no fill at rest, `-hover`/`-active` only

**The clearest non-inversion in the system:** `interactive-primary-on` is
near-white in light mode and near-black in dark mode. Dark mode brightens the
terracotta solid (that is the Figma dark value), so the label has to flip. Same
for all three accents.

`accent-1` / `accent-2` / `accent-3` re-expose the same three colours as a
rotation for category colours, chart series and avatars, each with `-subtle`,
`-border`, `-text` and `-on`.

### Feedback

`feedback-{info,warning,success,error}-{surface,border,icon,text}`.

Colour never carries status alone (1.4.1): every feedback treatment renders a
Lucide icon **and** a text string, and the `-border` token gives a third,
non-chromatic signal for colour-blind users and greyscale printing.

---

## 4. Typography · §4.3 `[SEED]`

Two families. The file's third — Beth Ellen, a thin irregular handwriting face
used at 40px for the primary onboarding headline — was dropped at your
direction; `display-xl` now carries that role in Space Grotesk Bold.

| Family | Token | Use |
|---|---|---|
| Space Grotesk | `--font-display` | display + heading steps |
| Inter | `--font-text` | body, labels, UI |

Fluid between **393px (iPhone 16)** and **1440px (desktop)** via `clamp()`.

| Step | 393 | 834 | 1440 | LH | Tracking | Weight | Use |
|---|---|---|---|---|---|---|---|
| `display-xl` | 40 | 50.1 | 64 | 1.04 | -0.022em | 700 | Hero headline, ≤6 words |
| `display-lg` | 32 | 37.1 | 44 | 1.08 | -0.018em | 700 | Session titles, empty states |
| `heading-lg` | 26 | 29.4 | 34 | 1.18 | -0.012em | 700 | Primary screen headline (the Figma 26px) |
| `body-xl` | 26 | 29.4 | 34 | 1.18 | -0.012em | **500** | The largest **body** step, at display scale — an instruction the user reads and acts on. Not a heading: it earns no outline entry of its own. **500, not 600**: the display face ships 400/500/700, so a 600 would be synthesised. Inherits heading-lg's size, line and tracking **by reference**, so the two cannot drift. Pairs with `--on-surface-muted` |
| `heading-md` | 22 | 23.7 | 26 | 1.25 | -0.008em | 500 | Section headline |
| `heading-sm` | 19 | 19.8 | 21 | 1.30 | -0.004em | 500 | Card title, group label |
| `body-lg` | 19 | 19.4 | 20 | 1.60 | 0 | 400 | Guided-exercise prose |
| `body-md` | 17 | 17.4 | 18 | 1.60 | 0 | 400 | **Default body. The minimum.** |
| `body-sm` | 15 | 15.4 | 16 | 1.55 | 0.002em | 400 | Metadata, captions |
| `label-lg` | 17 | 17.4 | 18 | 1.20 | 0.002em | 500 | Primary buttons, tabs |
| `label-md` | 15 | 15.4 | 16 | 1.20 | 0.006em | 500 | Chips, compact controls |

### Minimum body size, and the rule

**17px at the 393px reference.** A step whose 393px value falls below 17px is
label or metadata only — that bars `body-sm` and `label-md` from essential
prose. Concretely: exercise instructions, consent copy, error explanations and
anything a 15-year-old or a supervising adult must read in order to act are
`body-md` or `body-lg`. Timestamps, participant counts and helper captions may
be `body-sm`.

Line-height 1.6 on body is not decorative: 1.4.12 lets a user force 1.5×
line-height, 0.12em letter-spacing and 0.16em word-spacing. At 1.6 the layout
already sits above that override, so nothing reflows into a clipped box.

### text-wrap

`--text-wrap-heading: balance` on display and heading steps.
`--text-wrap-body: pretty` on body steps and any label that can reach two lines.
`--text-hyphens: auto` — not optional for German: *Musiktherapiesitzung* does
not fit a 393px card without it.

Measures are set from the German string: `--measure-body: 62ch`,
`--measure-heading: 26ch` (tighter, so a compound cannot strand alone).

---

## 5. Spacing · §4.4

Base unit **4px**. `sp-1`…`sp-8` reproduce the Figma Spacing collection exactly
(4 · 8 · 12 · 16 · 24 · 32 · 48 · 64). `sp-9` (96) and `sp-10` (128) are
additions for desktop section rhythm.

### Which step at which level

| Level | Token | Value |
|---|---|---|
| Inside a control | `--space-inset-control` | 12px / 24px |
| Inside a card | `--space-inset-card` | 24px |
| Inside a sheet | `--space-inset-sheet` | 32px |
| Icon ↔ its own label | `--space-gap-inline` | 8px |
| Between controls in a molecule | `--space-gap-stack` | 16px |
| Between sections | `--space-section` | 48px (96px ≥lg) |

### Content spacing guideline

The scale is not the guideline — the *ratio between adjacent levels* is.

**Atoms that belong together** get `--space-gap-related` (12px): a label and its
field, a title and its subtitle, an icon and its caption. At 12px against a 17px
body size the two read as one object.

**Atoms that don't** get `--space-gap-stack` (16px) minimum. 12 → 16 is a weak
signal on its own, which is why grouping is also carried by a shared surface or
border — never by spacing alone.

**Molecules that belong together** get `--space-gap-stack` (16px) and sit on a
shared `surface-raised`. **Molecules that don't** get `--space-gap-group`
(32px) — a full 2× jump from the internal gap. That 2× is the rule: *the gap
between two groups is always at least double the largest gap inside either
group.* If that ever fails, the grouping is ambiguous and you add a divider.

**Making it feel light.** Three habits, all enforceable in review: generous
inset (24px in a card, not 16); section gaps at 3× the internal stack, not 1.5×;
and only one elevation level visible at a time. Density comes from *fewer things
per screen*, never from tighter spacing — which is also what the one-handed,
sometimes-distracted use context needs.

### Touch targets

| Token | Value | Use |
|---|---|---|
| `--target-min` | 24px | 2.5.8 floor. Inline controls inside prose, **and card controls on a fine pointer**. Never on a coarse pointer — see `--target-primary` |
| `--target-primary` | 44px | Every primary action |
| `--target-comfort` | 56px | One-handed reach, noisy room, unsteady hands |
| `--target-guided` | 64px | Kindergarten / assisted use — session choice cards |

`--space-inset-control` (12px block) with `label-lg` (17px × 1.2 ≈ 20px)
produces a 44px control without a height override. That is why the padding is
12/24 and not the Figma 10/20, which yields 37px.

---

## 6. Breakpoints & grid · §4.5 `[OPEN]`

| Name | px | Columns | Gutter | Container |
|---|---|---|---|---|
| base | 0 | 4 | 16px | fluid |
| `sm` | 480 | 4 | 16px | fluid |
| `md` | 768 | 8 | 24px | fluid |
| `lg` | 1024 | 12 | 32px | fluid |
| `xl` | 1280 | 12 | 48px | 1200px max |

Max **content** width is separate from container width: `--measure-body: 62ch`
(≈700px at body-md) caps prose regardless of container. A 1200px container with
62ch text is intentional — the reading column stays readable while cards and
media use the full width.

768px is the group breakpoint: a shared tablet in front of 7–8 children lands
here, which is where `--target-guided` (64px) and `body-lg` should be the
defaults rather than the exception.

---

## 7. Radius, border width, elevation · §4.6 `[SEED]`

### Radius

| Token | px | Applies to |
|---|---|---|
| `--radius-xs` | 4 | checkbox, swatch, tag |
| `--radius-sm` | 8 | Figma `Corner/Small` — inputs, small media |
| `--radius-md` | 12 | Figma `Corner/Medium` — cards |
| `--radius-lg` | 16 | panels, large media |
| `--radius-xl` | 24 | sheets, bottom drawers |
| `--radius-full` | 999 | pills, circles |

Semantic tier: `--radius-control` (full — from the Figma button geometry),
`--radius-input` (sm), `--radius-card` (md), `--radius-panel` (lg),
`--radius-sheet` (xl). **Rule:** radius grows with the element's footprint, and
a nested element's radius is never larger than its parent's.

### Border width

1px hairline (dividers) · 1.5px regular (control boundaries — reads at 3:1
without looking heavy at 393px) · 2px thick (selected/current) · 3px focus.

### Elevation — and the dark-mode strategy

Shadow **geometry is identical in both themes**; only the colours are themed.

- **Light:** the shadow does the work. `--alpha-shadow-key` is warm-tinted
  (`rgb(60 46 30 / 0.10)`), not grey, so elevation reads as sunlight on paper
  and stays inside the palette's temperature. `--elevation-ring` is transparent.
- **Dark: both surface-lightening *and* a border — stated explicitly.** A shadow
  on a #1D1A14 canvas is invisible, so two other mechanisms carry it:
  `--surface-raised` steps up from `sand-2` to `sand-4`, **and**
  `--elevation-ring` becomes `sand-7`, painting a 1px inset boundary inside
  every `--elevation-*` value. Neither alone is enough — lightening without a
  ring loses the edge on a busy background; a ring without lightening reads as
  an outline, not a lift.

Three levels only: `1` card at rest, `2` popover / lifted card, `3` sheet or
modal. Under `prefers-contrast: more` the ring turns on in *both* themes so
elevation never depends on shadow alone.

---

## 8. Focus · §4.8 `[OPEN]`

**One indicator, defined once.**

```css
:focus-visible {
  outline: var(--focus-ring);               /* 3px solid var(--border-focus) */
  outline-offset: var(--focus-ring-offset); /* 2px */
}
```

| Property | Value | Why |
|---|---|---|
| Colour | `--border-focus` → `terracotta-11` light / `terracotta-10` dark | Different steps per theme; both measured ≥3:1 against every surface token |
| Width | 3px | 2px is legible, but 3px survives the 393px viewport and unsteady vision |
| Offset | 2px | **This is what makes 3:1 provable.** The 2px gap renders in the parent surface, so the ring is only ever adjacent to a surface token — never to the terracotta button it surrounds |
| Radius | element radius + offset | Browsers do this automatically for `outline`. If you ever fake a ring with `box-shadow`, add the offset manually |

**Policy: `:focus-visible` only, never `:focus`.** A tap on a session card must
not leave a ring behind — for this audience a persistent ring after touch reads
as an error state.

**2.4.11, focus not obscured.** `--focus-ring-clearance` (5px = width + offset)
is the padding any focusable element's ancestor must keep. Concretely: no
`overflow: hidden` on a scroll container with focusable children unless it has
5px of inset, and a sticky session bar must not overlap the focused element —
use `scroll-padding-block` equal to the bar height plus clearance.

---

## 9. Motion · §4.7 `[OPEN]`

| Duration | ms | Use |
|---|---|---|
| `instant` | 80 | state flip with no travel |
| `fast` | 140 | toggle, hover, exit |
| `base` | 220 | default enter |
| `slow` | 340 | sheet slide |
| `slower` | 520 | emphasis |

| Easing | Curve |
|---|---|
| `standard` | `cubic-bezier(0.2, 0, 0.2, 1)` |
| `entrance` | `cubic-bezier(0, 0, 0.2, 1)` — decelerate in |
| `exit` | `cubic-bezier(0.4, 0, 1, 1)` — accelerate out |
| `emphasis` | `cubic-bezier(0.2, 0.9, 0.1, 1)` — slight overshoot |

Named semantic motions are ready-made transition tails:

| Token | = | Use |
|---|---|---|
| `--motion-enter` | base + entrance | anything appearing |
| `--motion-exit` | fast + exit | anything leaving — always faster than entering |
| `--motion-toggle` | fast + standard | switch, checkbox, tab |
| `--motion-sheet-slide` | slow + emphasis | bottom sheet, drawer |
| `--motion-emphasis` | slower + emphasis | session complete, streak |

`--motion-travel-sm/md/lg` (8/16/32px) hold the *distance*, so travel is
tokenised too — which is what lets reduced motion be a token change.

### Under `prefers-reduced-motion: reduce`

Every duration → **1ms**; every travel → **0px**; `ease-emphasis` → `linear`
(no overshoot). Because durations and distances are both tokens, a component
built on them becomes still with **no component-level media query**. 1ms rather
than 0 so `transitionend` still fires and state machines don't stall.

**2.3.1** is satisfied structurally: no token loops, repeats or flashes. Nothing
in the foundation can produce a flash, because no token expresses one.

---

## 10. Iconography · §4.9 `[LOCKED]`

Set: **Lucide** (`lucide-animated.com`). Reproduced, not optimised — 24px grid,
2px stroke, unrounded.

| Token | px |
|---|---|
| `--icon-size-sm` | 16 |
| `--icon-size-md` | 20 |
| `--icon-size-lg` | 24 (Lucide native) |
| `--icon-size-xl` | 32 |
| `--icon-stroke` | 2 |

**Icon ↔ text pairing.** Icon size follows the *adjacent text step*, never the
container:

| Adjacent text | Icon |
|---|---|
| `body-sm` / `label-md` | `sm` (16) |
| `body-md` / `label-lg` | `md` (20) |
| `heading-sm` / `heading-md` | `lg` (24) |
| `heading-lg` and up | `xl` (32) |

**Optical centring.** Align to **cap height, not bounding box** — Lucide glyphs
are drawn to a 24px box with roughly 2px of internal padding, so a box-centred
icon sits visually low next to text. `--icon-optical-nudge: -0.055em` is the
vertical correction for a text-adjacent icon. A standalone icon in a button
centres on the box normally.

**Colour.** A *meaningful* icon is a graphic under 1.4.11 and must take a
step-11 token (`on-surface-muted`, `feedback-*-icon`, `accent-*-text`) — all
≥3:1 verified. A decorative icon beside a label that already says the same thing
may take any token.

Two [LOCKED] conflicts arising from this section are in the
[conflict report](03-conflict-report.md) — unresolved, for you.

---

## 11. Z-index · §4.10 `[OPEN]`

| Token | Value | Layer |
|---|---|---|
| `--z-base` | 0 | page content |
| `--z-raised` | 10 | lifted card, inline popover |
| `--z-sticky` | 100 | sticky nav / session bar |
| `--z-overlay` | 200 | scrim |
| `--z-sheet` | 300 | modal, bottom sheet |
| `--z-tooltip` | 400 | tooltip |
| `--z-toast` | 500 | toast — above everything, including a sheet |

Gaps of 10 and 100 leave room to insert a layer without renumbering. **No
component may use a raw z-index.** Toast outranks sheet deliberately: a "session
saved" confirmation must be visible over an open sheet.

---

## 12. Theming mechanism · §4.12 `[OPEN]`

**Manual toggle only, persisted. The system preference is deliberately not
consulted** — your choice on the brief.

### Technical mechanism

`data-theme` on `<html>` sets `color-scheme`; every themed token resolves
through `light-dark()`:

```css
:root                { color-scheme: light; }
[data-theme="dark"]  { color-scheme: dark;  }

:root, [data-theme] {
  --sand-2: light-dark(#F5EEE1, #1D1A14);
  --surface: var(--sand-2);
  --surface-raised: light-dark(var(--sand-1), var(--sand-4));
}
```

One declaration per token carries both themes, so a value can never be updated
in light and forgotten in dark. This requires the iOS Safari 18+ baseline you
chose.

### FOUC prevention

`tokens/theme-init.js` is a synchronous `<script>` in `<head>`, **before** the
stylesheet. It reads `localStorage` and sets the attribute before first paint.
Not async, not deferred, not a module — any of those paint light first.

### Nested theme override

Tokens are declared on **`:root, [data-theme]`**, not on `:root` alone. That
selector is the whole trick: `light-dark()` resolves at computed-value time
against the element's own `color-scheme`, so a token declared only on `:root`
would already have collapsed to the light value and merely inherited down.
Re-declaring the full set on any `[data-theme]` element makes the subtree
recompute:

```html
<body data-theme="light">
  <aside data-theme="dark">  <!-- fully dark, correctly, at any depth -->
```

This also means a third theme (a low-stimulus session mode, say) is a new
attribute value and one more block — not a new mechanism.

### base-ui compatibility

Nothing here fights base-ui. Tokens are plain custom properties with no runtime,
so base-ui's unstyled parts can be styled from them directly. Three choices help
specifically: the semantic layer covers every state base-ui exposes as a data
attribute (`data-disabled`, `data-highlighted`, `data-pressed`), so styling is a
token lookup; the `:focus-visible` policy matches base-ui's default focus
handling; and `--z-*` matches its portal-based layering, which needs a stable
global order. No runtime CSS-in-JS anywhere.
