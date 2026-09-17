# Deltas — every deviation from the Figma file

Only `[SEED]` sections appear here; `[OPEN]` sections had nothing to deviate
from, and the one `[LOCKED]` section was reproduced (its conflicts are in
[03-conflict-report.md](03-conflict-report.md)).

Nothing in this table is presented as if it came from Figma. Every row has a
technical reason — a WCAG criterion, a broken scale ratio, a token gap, a
naming collision, or a dark-mode failure. None is taste.

## Colour

| Token | Figma value | New value | Reason | Tag |
|---|---|---|---|---|
| `terracotta-9` (light) · `interactive-primary` | `accent/terracotta` #C1613F | **#B55634** | The screens put `surface` #FBF8F2 on this fill: **3.92:1, fails 1.4.3.** Darkened the minimum needed to reach 4.56:1, which preserves the white-on-terracotta primary button the screens intend | `[SEED]` |
| `sand-11` (light) · `on-surface-muted` | `ink/muted` #8A7A63 | **#615A4D** | **3.55:1 on `bg/primary`, fails 1.4.3** for secondary text. Solved to 4.5:1 against every legal surface, tinted fills included | `[SEED]` |
| `sand-11` (dark) · `on-surface-muted` | `ink/muted` #93826A | **#A0998C** | **4.11:1 on the Figma dark `surface`, fails 1.4.3.** Dark mode had to be solved independently — it was not an inversion failure, it was its own failure | `[SEED]` |
| `sand-edge` (light) · `border-strong` | `border-strong` #C7B99C | **#83745A** | **1.83:1 vs `surface`, fails 1.4.11** for a control boundary. The Figma secondary button relies on this border as its only affordance | `[SEED]` |
| `sand-edge` (dark) · `border-strong` | `border-strong` #4A4238 | **#847A67** | **1.55:1 vs the Figma dark `surface`, fails 1.4.11** | `[SEED]` |
| `on-surface-muted` | `ink/secondary` #5C5148 / #C9BEA9 | *consolidated away* | Two muted greys with no distinguishable job. §5 says delete a token you cannot state a purpose for | `[SEED]` |
| `accent/pop` | swatch label in the Richtung-A frame | **`accent/purple`** | Naming collision: the variable collection defines `accent/purple`, the swatch row labels the third accent `accent/pop`. §2.4 precedence (variables > screen examples); you confirmed | `[SEED]` |
| `terracotta-9` (dark) | `accent/terracotta` dark #E37A52 | #DF7D5A | Regenerated on the OKLCH lightness ladder so hover/press/edge derive consistently. Perceptually identical; ink foreground holds 6.52:1 | `[SEED]` |
| `ocher-9` | `accent/ocher` #EAB96D | #E9B86C | Round-trip through OKLCH; one-unit shift, no visible change | `[SEED]` |
| `purple-9` | `accent/purple` #CCA7C8 | #CCA6C7 | Round-trip through OKLCH; one-unit shift | `[SEED]` |
| `sand-6` · `border-subtle` | `border` #DDD2BD | #DFD3BD | Curve placement (lightness held exactly). Re-scoped to decoration only — it is no longer permitted on a control boundary | `[SEED]` |
| `sand-3` (dark) | `bg/secondary` #241F1A | #26221A | Curve placement | `[SEED]` |
| `sand-4` (dark) · `surface-raised` | `surface` #2A2420 | #2D281F | Curve placement, **and re-roled**: the Figma dark `surface` becomes step 4, so the darker step 2 can be the page canvas and step 1 the sunken well. Preserves "card is lighter than page" in dark | `[SEED]` |
| `info-*` `success-*` `warning-*` `error-*` | *none* | 4 new 12-step scales | Requested addition (§4.1). Feedback-only; never used decoratively, so no brand colour was invented | `[SEED]` |
| `*-edge`, `*-press` | *none* | 2 new steps per scale | Token gaps: nothing in a stock Radix scale guarantees 3:1 for a boundary, and step 11 cannot serve as a pressed solid on the light-solid scales | `[SEED]` |

## Typography

| Token | Figma value | New value | Reason | Tag |
|---|---|---|---|---|
| `--font-display` | Beth Ellen Regular, 40px | **Space Grotesk Bold** (`display-xl`) | Dropped at your direction. It is a thin, irregular handwriting face carrying the primary onboarding headline — a legibility risk for the low-vision, kindergarten and cognitive-difficulty users named in the brief, and the worst case for German compounds | `[SEED]` |
| `body-md` | Inter Regular 14px | **17px → 18px fluid** | 14px body fails the audience brief and leaves no headroom under 1.4.12's text-spacing override inside a 352px card | `[SEED]` |
| `body-sm` | Inter Regular 12px / 13px | **15px → 16px fluid** | Below the 17px body floor, and 12px was paired with `ink/muted` at 3.93:1. Two sizes one pixel apart were also a scale-ratio break | `[SEED]` |
| `heading-sm` | Inter Medium 18px | **19px → 21px, Space Grotesk** | Consolidated: the file used Inter Medium 18px for section labels and Space Grotesk for headings of similar weight. One family per role | `[SEED]` |
| `heading-lg` | Space Grotesk Bold 26px | 26px → 34px fluid | Kept at 26px on mobile; made fluid so it scales to desktop instead of staying phone-sized | `[SEED]` |
| all line-heights | `lineHeight: 100%` | **1.04–1.60 per step** | 100% clips descenders and leaves zero headroom for 1.4.12's 1.5× line-height override. Unusable for German at any width | `[SEED]` |
| *(text styles)* | none defined in the file | 10 named steps | The file has no text styles at all — only ad-hoc sizes on layers. The step set is therefore designed, with each Figma size mapped onto it | `[SEED]` |

## Geometry & spacing

| Token | Figma value | New value | Reason | Tag |
|---|---|---|---|---|
| `--space-inset-control` | 10px 20px (button) | **12px 24px** (`sp-3` `sp-5`) | Off-scale values, and 10/20 yields a **37px control — below the 44px primary target (2.5.8)**. 12/24 reaches 44px with no height override | `[SEED]` |
| `--space-inset-card` | 20px (card) | **24px** (`sp-5`) | Off-scale; 20 is not a step in the Figma Spacing collection it sits beside | `[SEED]` |
| `--radius-panel` | 8px on the 352px screen container | **16px** | Consolidation: the file used 8px for full-screen containers and 16px for the typography panel. Radius now grows with footprint, so a 352px panel takes 16px and 8px is reserved for inputs | `[SEED]` |
| `--radius-lg`, `--radius-xl`, `--radius-full` | used on screens, no variable | new tokens | 16px and 999px appear in the screens with no backing variable. Screens rank below variables (§2.4), so these are **additions**, not extractions | `[SEED]` |
| `--sp-9`, `--sp-10` | *none* | 96px, 128px | Token gap: the Figma scale stops at 64px, which is too tight for desktop section rhythm at a 1200px container | `[SEED]` |
| `--border-width-regular` | 1px (all borders) | **1.5px** for control boundaries | A 1px `sand-edge` boundary reads thin at 393px; 1.5px carries the 3:1 without looking heavy. 1px is retained as `hairline` for dividers | `[SEED]` |


---

# Layer 2 — component deltas

Same rules as above: every row has a technical reason, none is taste. Layer 1
itself now sits above the Figma screens in the precedence order (brief §3), so
where a screen shows a pre-Layer-1 pattern that is **not** a delta — it is
Layer 1's decision applying downstream, and it is not repeated here.

## Structure & behaviour

| Component | Figma screen | What Layer 2 does | Reason | Tag |
|---|---|---|---|---|
| Radio Group (image+text) | `Frame 3` — flat ocher card, 152×182, no selected state | Card with 1:1 media, floating check, unclamped label, and a full state matrix | The screen shows one resting card only. Selection, hover, focus, disabled and empty had to be designed; the ocher fill became `--interactive-primary-subtle` because a permanently-tinted card cannot show a selected state | `[SEED]` |
| Radio Group (text only) | `Frame 4` — 318×32 purple pill, centred 14px text | 56px row (`--target-comfort`), left-aligned label, marker + check | **32px fails 2.5.8** and centred text with a leading marker reads as decoration, not as a choice. The purple fill became `--interactive-primary-subtle`, same reason as above | `[SEED]` |
| Radio Group | both frames | Two components, not one with an `image` prop | Their truncation policies conflict: text options clamp at 2 lines with a measured escape, card labels never clamp. Merging would force one to lose. §9 asked for this to be flagged if done — it is done deliberately | `[SEED]` |
| Process Visualisation | `iPhone 17 - 2` — three bare `<span>`s, 16px Space Grotesk, no icons, no dividers | `<ol>` of 4 steps, icon badge + ordinal + heading + body, arrow divider between | The frame has no icons, no dividers, three steps not four, and no list semantics. Brief §5.8 specifies all four. Tagged `[OPEN]`, so the screen was read for intent only | `[OPEN]` |
| Content Box | `Card` symbol — 12px Inter Medium title, 13px body | Type steps as props, defaulting to `heading-sm` / `body-md` | 12px and 13px are below Layer 1's 17px body floor and were consolidated away in Layer 1. The *structure* (title over muted meta) is reproduced exactly | `[SEED]` |
| Content Box | screen containers, `1px dashed` | `outline="dashed"` variant on a new token | Token gap G2. The dashed treatment is in the file; the token was not | `[OPEN]` |
| Switch | not in the file | Track derived from `--icon-size-lg` + `--sp-1`; knob glyph at `--icon-size-sm` | Nothing to deviate from. The knob glyph breaks Layer 1's icon↔text pairing rule (`label-lg → icon-md` would overflow a 24px knob), so the pairing is documented as **knob-relative** for this component only | `[SEED]` |
| Icon Button / CTA Button | `Button/Primary`, `Button/Secondary` — 37px tall, 10/20 padding | 44px min-height from `--space-inset-control` | Already logged in Layer 1's spacing delta; restated because it is where the component actually changes shape. Pill radius and the white-on-terracotta intent are preserved | `[SEED]` |
| Logo | mascot bitmap at 38×40 (nav) and 157×167 (circle) | `nav` 24px, `splash` 96px | Brief §5.12 names both sizes. The Figma sizes are neither; they are layout placements of the same asset, not a size system. The asset itself is copied verbatim, not redrawn | `[LOCKED]` |
| CTA Button | — | Default target `--target-primary`, not `--target-comfort` | Brief §2.4 and §5.4 disagree; §5.4 is the more specific statement about this component. See conflict B8 | `[SEED]` |

## Interaction additions (nothing in the file showed a state)

| Addition | Reason |
|---|---|
| Hover scoped to `(hover: hover) and (pointer: fine)` on every control | An unscoped `:hover` sticks after a tap on touch. On a one-handed mobile app that is the most common false affordance there is |
| `--interactive-*-active` used for pressed, never a step-11 swap | Layer 1 solved the press tokens so the same `-on` foreground still holds 4.5:1 |
| Loading state on both button components | Brief §4 requires it "where applicable". A spinner without `disabled` invites a double submit, so loading disables |
| `prefers-reduced-motion` **drops** the spinner animation instead of collapsing its duration | Layer 1's 1ms would spin the ring at ~1000rps. The one place where collapsing duration is the wrong answer; the live-region text carries the state instead |
| Visually-hidden status word in every Message | Layer 1 conflict B7: error and warning sit 15° and 22° from the brand hues. The word is what makes the variant survive both a screen reader and a colour-blind glance |
| `[data-force]` proof harness appended to the real state selectors | So a forced state and a lived state cannot drift. Never ships in product code |
| CTA Button gains `accent-placeholder1` / `accent-placeholder2` variants | Requested during review. Layer 1 already carries both families' full solved sets, so this is consumption, not a new token — and Decision 3 says any prop accepting an accent takes the three literal names, which the variant union now does |
| `overflow-wrap: break-word` on every part that consumes `--text-hyphens` | `hyphens: auto` is inert without `<html lang>`, and even with it a compound in a 109px column may have no legal break point in range. Layer 1 tokenised the hyphenation but not the fallback, so the fallback is stated per-part rather than as a token — it is a wrapping mechanic, not a design value |

## base-ui migration

All twelve components are built on base-ui (`@base-ui/react` ^1.7), per brief
§8.1. The first draft of this pass shipped on native elements with base-ui's
data attributes pre-wired in the CSS; that was a flagged deviation and is now
closed. What actually changed:

| Change | Reason |
|---|---|
| State moved from hidden-input sibling selectors to `[data-checked]` / `[data-unchecked]` / `[data-disabled]` on the styled part | base-ui puts state on the part itself. `Switch.Root` and `Radio.Root` render the focusable element with the hidden input beside it, so `.musy-switch__track` and `.musy-radio__body` **are** those roots. Selectors now target the element they style |
| `.musy-radio__body` is the radio, not a `<label>` wrapping a hidden input | `Radio.Root` with `nativeButton` — the whole 56px row is the focusable target, and roving arrow-key focus comes from `RadioGroup` instead of the platform's input grouping |
| Group legend via `Fieldset.Root render={<RadioGroup/>}` | base-ui's documented composition. One element carries both the group semantics and the legend, so there is no extra wrapper |
| Hand-rolled CSS tooltip → base-ui `Tooltip` | **This fixed a real defect.** The CSS tooltip was absolutely positioned inside the button, so it clipped inside any scroll container and could not flip near a viewport edge. base-ui portals it and handles collision. Layer 1's `--z-tooltip` was built for exactly this portal-based layering |
| Native `<button>` → base-ui `Button` on both button components and Message's dismiss | Keeps a disabled button reachable by keyboard, so a user can find out *why* it is unavailable — behaviour `<button disabled>` loses |
| Row rules and the process divider → base-ui `Separator` | A real `role="separator"` instead of a CSS border that assistive tech cannot see |
| Presentational components (Icon, Content Box, Logo) built on `useRender` | They have no behaviour for base-ui to own, but this gives them the same `render` composition prop as every other component, so the set is consistent to use — and it is how Logo becomes a home link without knowing about routing |
| `--target-min` hover/active rules unchanged | base-ui does not touch pointer states; the `(hover: hover) and (pointer: fine)` scoping still does that work |
| Proof page specimens rewritten to base-ui's **rendered DOM** | The proof page cannot run npm packages, so it reproduces the markup the primitives emit. If it drifted from that it would stop proving anything |

## Token references

| Reference | Note |
|---|---|
| `--sand-8` in two hover rules | The only raw primitive consumed in Layer 2, and a defect under Layer 1's own API rule. Token gap G3 — reported rather than hidden behind a local hex |

## Layer 3 — layout deltas

Changes made to Layers 1 and 2 by the Layer 3 pass. Each was forced by building
a real screen against the released set, each was decided with the designer
before it was made, and each is recorded in full in
[12 · Component gaps](12-component-gaps.md).

| # | Where | Change | Reason | Tag |
|---|---|---|---|---|
| 1 | Layer 1 §5.4 + `--target-min` comment | "Inline controls inside prose only" gains "**and card controls on a fine pointer**" | A card's handle and disclosure are its only affordances and sit outside prose, so §5.4 barred 24px there — yet 24px clears 2.5.8, which makes the restriction comfort, not access. Documentation only; the component ladder is unchanged | `[OPEN]` |
| 2 | §7.9 Content Box | New prop `headlineHidden` | `headline` is required and renders the `<h3>` that puts the box in the outline. A card showing content alone needs that heading present and invisible, and the component exposed neither prop nor className — leaving a screen to copy `.musy-sr-only` into its own CSS, which L14 forbids. Mirrors Switch's `labelHidden` | `[SEED]` |
| 3 | §7.22 Record Button | `recordingLabel` default `'Recording Running'` → `'Recording'` | Measured in a 310px column the old default overflowed the content box by 44px and clipped the readout — `scrollWidth` 329 vs `clientWidth` 308 — against §7.22's own rule that the readout must never be what gives. 310px is 393 minus an app gutter and a card inset | `[SEED]` |
| 4 | §7.22 Record Button | `min-inline-size: min(18ch, 100%)` removed | The width change on going live is legitimate feedback (L7), not a jump to suppress. The floor made it unreachable without a screen overriding the component's geometry. `max-inline-size: 100%` stays — it is what lets the meter shrink | `[SEED]` |
| 5 | Layer 1 palette, every scale's step 9 | Comment "Solid fill — buttons, filled chips, **meaningful graphics**" → "buttons, filled chips. A graphic that stands alone on a surface takes `-edge`…" | The comment promised something the colour cannot keep: `purple-9` is 1.85:1 against the page. **The comment was wrong, not the colour** — moving step 9 would darken all four accent solids and invalidate the 94-pair audit, for a case `-edge` already covers | `[SEED]` |
| 6 | §7.16 Field | `value` / `defaultValue` / `onValueChange` moved from `Field.Root` to `Field.Control` | **Defect.** base-ui 1.7.0's `Field.Root` accepts none of the three; they landed on a `<div>` and were ignored, so a controlled or pre-filled field rendered empty. Type-errors under a strict `tsc`. Public API unchanged | `[SEED]` |
| — | §7.23 Toast | New component | Layer 1 had shipped `--z-toast` above `--z-sheet` with a stated rationale since Pass 1, with no consumer in the released set. L11 needs a non-in-flow channel for a completed, reversible action | `[SEED]` |
| — | §7.24 Draggable List | New component | The component Layer 3 was built around. No new primitive — §7.9, §7.2, §7.4, §7.23 and an `<ol>`; the state machine is what makes it a component, twelve states with three mutually exclusive pairs | `[SEED]` |
| — | `components/useCoarsePointer.ts` | New helper | L5 picks a control's target from the pointer, through the component's own `size` prop. The choice has to reach React because it also sizes §7.24's float spacer — a spacer that disagrees with its cluster is L4's one failure that is invisible at the container level | `[SEED]` |
| — | §7.25 Segmented Control | Renumbered from §7.16, then from §7.24 | §7.16 was already Field's — a collision introduced in the previous pass. §7.24 then turned out to be upstream's for Draggable List, decided before Segmented Control existed here, so the local addition moved again. **Rule going forward: upstream's assigned numbers win; local additions renumber** | — |

### What Layer 3 did NOT change

Stated because the restraint was deliberate: no token value moved, no
component API broke, and the palette was not re-solved. Five of the six items
above are a comment, a prop, a default string, a removed floor and a corrected
prop target. The sixth is a defect fix. Layer 3 itself amends nothing — it
consumes Layer 1 tokens and Layer 2 components as released.
