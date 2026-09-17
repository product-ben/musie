# 08 · Token gaps — what Layer 2 needed and Layer 1 does not have

Three gaps. None of them was invented locally: G1 and G2 are declared in
[`tokens/musy-foundations-amendments.css`](../tokens/musy-foundations-amendments.css),
a staging file that is **not** part of the signed-off foundations, so
`musy-foundations.css` stays byte-identical to Layer 1. G3 has no staged value —
it is reported and worked around, and the workaround is the only raw-primitive
reference in the whole pass.

Absorbing G1 and G2 is a copy-paste into Layer 1's Dimension layer. Until that
happens, the components that consume them are marked **PROVISIONAL** in
[07-components.md](07-components.md).

---

## G1 · `--icon-stroke-sm: 1.5px`

**Requested by** brief §2, Decision 2 — verbatim: "Add `--icon-stroke-sm: 1.5px`
as a Layer 1 token gap; flag it, don't invent it locally."

**Needed by** Icon (`size="sm"`), Icon Button (`size="min"`), Switch's embedded
knob glyphs, Message's small headline icon.

**Why.** Lucide's 2px stroke is drawn on a 24px grid. At `--icon-size-sm` (16px)
that is 3 grid units — heavier than the same glyph at 24px, and it closes small
counters, which is exactly where a *meaningful* icon stops being identifiable
(1.4.11). This is conflict A2 from Layer 1, now with a decision attached.

**Proposed shape.** A sibling of `--icon-stroke` in Layer 1 §Iconography:

```css
--icon-stroke: 2px;       /* existing — 20px and up */
--icon-stroke-sm: 1.5px;  /* NEW — pairs with --icon-size-sm */
```

The pairing rule extends cleanly: `--icon-size-sm` already pairs with
`body-sm` / `label-md`, so this is the stroke for metadata and compact-control
icons and nothing else. No other size changes.

**Figma side.** One new variable in the Ungrouped or a new Icon collection,
single mode (it is not themed).

**Visible on the proof page** — §01 shows the same 16px glyph at 2px and 1.5px
side by side, in both themes.

---

## G2 · `--border-style-dashed: dashed` (+ `--border-style-solid: solid`)

**Requested by** brief §5.9 — verbatim: "Outline should be dashed. Create a new
token for that."

**Needed by** Content Box (`outline="dashed"`).

**Why.** Layer 1 tokenised border **colour** and border **width** but never
border **style**; every boundary in the system was implicitly solid. The Figma
frames draw the screen container as `1px dashed rgb(221,210,189)` — so a dashed
outline is an existing pattern in the design, not a new idea. Tokenising the
*style* rather than adding a dashed-specific width means it composes with every
existing width token instead of duplicating the width scale.

`--border-style-solid` is added alongside it so the pair is symmetrical and no
component has to write the literal `solid` next to a tokenised `dashed`.

**Proposed shape.** Beside `--border-width-*` in Layer 1 §Border width:

```css
--border-style-solid: solid;
--border-style-dashed: dashed;
```

**Semantics to document with it.** Dashed reads as "provisional / awaiting
content / placeholder". Use with `--border-subtle`. **Never on an interactive
boundary** — dashing lowers the perceived stroke, so a dashed control edge would
undercut the 3:1 the solid boundary was solved for (1.4.11).

**Figma side.** Figma Variables have no border-style type, so this cannot
round-trip as a variable. It should live as a documented convention plus a
component-level property on the Card component, or the round-trip for this one
token stays one-directional. Flagged in open question 17.

**Visible on the proof page** — §09, second specimen.

---

## G3 · no `--border-strong-hover` (reported, not staged)

**Needed by** Icon Button and CTA Button, `secondary` variant, hover state.

**Why.** The secondary variant's only affordance is its boundary
(`--border-strong` = `--sand-edge`). On hover the fill changes, but the boundary
should step with it, or the control reads as if only its background reacted.
Layer 1 exposes `--interactive-primary-border` and `--interactive-ghost-border`,
but no hover step for either, and no semantic alias for the neutral border's
hover step.

**Current workaround.** The two hover rules reference `--sand-8` directly — the
neutral scale's documented "component border — hover" step. **This is the only
raw primitive referenced anywhere in Layer 2**, and under Layer 1's own rule
("Layer 2 is the API; do not consume Layer 1 directly") it is a defect. It is
here rather than hidden because the alternative was a local hex.

**Proposed shape.** Either a general border-hover alias:

```css
--border-strong-hover: var(--sand-8);
```

or, more consistent with the existing naming, extend the interactive families:

```css
--interactive-ghost-border-hover: var(--sand-8);
--interactive-primary-border-hover: var(--terracotta-edge);   /* unchanged today */
```

I lean to the second — it keeps every border token inside a family and leaves
room for the accent families to differ later. Needs your call; it is the one
gap with a real naming decision in it, which is why it is not staged.

**Contrast note.** `--sand-8` is a *border* step, not a text step: light
#C8B89C on `--surface` #F5EEE1 is ~1.8:1. That is legal only because the
boundary it decorates is already carried at 3:1 by `--border-strong` in the
default state and the hover state adds fill contrast on top. If this becomes a
real token, the audit needs a row for it — it must not be reachable as a
standalone control boundary.
