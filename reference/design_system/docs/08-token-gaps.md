# 08 · Token gaps — what Layer 2 needed and Layer 1 does not have

Six gaps. None of them was invented locally: G1, G2, G4, G5 and G6 are declared
in
[`tokens/musy-foundations-amendments.css`](../tokens/musy-foundations-amendments.css),
a staging file that is **not** part of the signed-off foundations, so
`musy-foundations.css` stays byte-identical to Layer 1. G3 has no staged value —
it is reported and worked around, and the workaround is the only raw-primitive
reference in the whole pass.

G1–G3 came with the Layer 2 pass; G4–G6 were found later, by screens, and each
entry says which. Absorbing a staged gap is a copy-paste into Layer 1, at the
place its entry names. Until that happens, the components that consume them are
marked **PROVISIONAL** in [07-components.md](07-components.md), and every staged
token is listed in `TOKEN-DRIFT.md`, because the DTCG JSON Figma reads has none
of them.

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

**Needed by** Icon Button and Button, `secondary` variant, hover state.

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

---

## G4 · `--measure-figure: 416px`

**Requested by** no brief line. Found by the listen step, 2026-10-09; Ben's
number, from the screen.

**Needed by** no component. The app's figure caps: the listen step's
infographic (`apps/web/src/shell.css`) and the insight map's floor
(`apps/web/src/insight-map.css`).

**Why.** Every measure token Layer 1 has is a **reading** measure, in `ch`, and
`ch` belongs to the type: 62ch says how far an eye tracks before it loses the
line. That is the right unit for a column of sentences and the wrong one for a
picture, which has a size at which it reads and keeps it when the body font
changes. Held against `--measure-body` (704px at today's body font), an
infographic ran the full reading width and dominated a step whose subject is
the audio.

So this is the first measure token in `px`, on purpose — and **not** arithmetic
over `--measure-body`: the fraction that lands on 416px is 0.5909, which nobody
chose, and a `ch` base would resize the figure whenever the body font is
swapped.

**Proposed shape.** Beside `--measure-body` and `--measure-compact` in Layer 1
§Dimension:

```css
--measure-figure: 416px;  /* NEW — a figure's cap, not a reading measure */
```

**Figma side.** One number variable in the Dimension collection, single mode.

---

## G5 · the instruments family (`--instrument-*`)

**Requested by** no brief line. Found by the instruments exercises, 2026-11-09
— Kalimba, Marimba, Harfe, drawn on a canvas from these tokens and nothing else
(`docs/plans/instruments-prd.md`).

**Needed by** Instrument Cursor (§7.28) and the design system's
`instrumentShadowLayers()` and `instrumentTapAt()`; in the app, the three
instruments' canvas drawing (`apps/web/src/instruments/`).

**Why.** The instruments are drawn on a canvas from these tokens and nothing
else, and Layer 1 has nothing that describes an instrument. A canvas cannot take
a `box-shadow` either, so the shadow tokens are the shadow's parameters, read by
code, rather than a shadow. The decisions in the family are Ben's:

- **Colour by family** — a string instrument (the harp) rests at `sand-7`, a key
  instrument (marimba, kalimba) at `sand-5`, lighter than strings since
  2026-11-09. What the person played is terracotta and Musie's answer green,
  both at the harp's step 7. The surface is `--surface`: the instrument lies on
  the page and has no box of its own.
- **Shadow** — the harp's multi-layer string shadow, as unitless PARAMETERS
  (level, oomph, crispy, resolution, light, tint), not a shadow. Level 0 under
  `prefers-contrast: more`, as `--elevation-*` is.
- **Tap** — the soft dot your own note leaves (none for Musie's answer), as
  timing, size and curve parameters. The size is absolute px, so every
  instrument draws the kalimba experiment's dot.
- **Cursor** — the green dot that stands in for a mouse or pen pointer.

**Proposed shape.** Its own family in Layer 1, beside §Elevation. Twenty-six
properties; the amendments file declares them all and argues each block, so the
shape is that block moved, with its `prefers-contrast` override:

```css
--instrument-surface: var(--surface);
--instrument-string:  var(--sand-7);
--instrument-key:     var(--sand-5);
--instrument-detail:  var(--sand-8);
--instrument-played:  var(--terracotta-7);
--instrument-answer:  var(--green-7);
--instrument-shadow-*: …;   /* 7 numbers */
--instrument-tap-*: …;      /* 11 parameters */
--instrument-cursor-size:  calc(var(--sp-5) * 2);
--instrument-cursor-color: var(--interactive-primary);
```

**Figma side.** The six colours alias existing scale steps and can be colour
variables. The shadow and tap parameters are inputs to canvas code and have no
Figma meaning beyond plain numbers.

**Visible in Storybook** — *Foundations/Instrument tap* (which prints tuned
values to paste back) and *Components/InstrumentCursor*.

---

## G6 · `--target-sm: 40px`

**Requested by** Ben, 2026-11-11 — D7 of `docs/plans/exercises-ready-to-build.md`:
the size names stay, plus one new size, `sm` (40px), with its own token.

**Needed by** Icon Button (`size="sm"`) — the help button in the /exercises
toolbar. Nothing else: Button has no `sm` (A8), because its `min` already draws
about 40px tall.

**Why.** The /exercises toolbar is a row of 40px controls — Shuffle and *Ziel
ändern* are Button `min`, which their label and block padding draw at about
40px (measured 39px at 393, 40.4px at 1440) — and the help button is the one
icon-only control in it. The ladder had nothing for that: `--target-min` (24px)
is a speck beside its neighbours, `--target-primary` (44px) stands proud of all
of them.

40px clears 2.5.8 **outright**, which 24px does not: no spacing exception, no
baked-in margin, no pointer condition. It is not 2.5.5's 44px, so an action that
carries the person onward stays on `--target-primary`.

**Proposed shape.** In Layer 1 §Dimension's touch-target block, in ladder order:

```css
--target-min: 24px;       /* existing */
--target-sm: 40px;        /* NEW */
--target-primary: 44px;   /* existing */
```

**Figma side.** `target/sm` in the Dimension collection, beside `target/min`;
in the DTCG JSON, `target-sm` joins the `dimension` group.

**Visible in Storybook** — *Components/IconButton*, *Sizes*.
