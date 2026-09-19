# Evidence — Layer 3

> Filed with [`10-layout.md`](10-layout.md) as §15 — 13 and 14 keep the numbers the handoff assigns them. Every measurement L1–L15 rests on,
> taken from a rendered page rather than from source. Read the closing
> "What is *not* evidenced" before relying on anything audio-related.

Every measurement the rules in `10-layout.md` rest on, so none of it has to be
taken on trust. All figures come from a **rendered page**, not from source.

**How they were taken.** Chrome driven over the DevTools Protocol at 390×900 and
1280×900, `deviceScaleFactor: 2`, touch emulation on for the narrow run. The app
was the production build served over HTTP, not the dev server. Where the page
needed a microphone, `getUserMedia` was replaced with a synthesised
`MediaStream` — a tone with a slow amplitude swell — through the app's real
`AudioContext`, worklet and PCM path.

---

## L4 · Why the card's controls float

Statement card, 390px viewport, three arrangements of the same content:

| Card | Controls stacked | Controls in a flex row | Controls floated |
| --- | --- | --- | --- |
| One or two lines | 154px | 104px | **97px** |
| Six lines | ~184px | 322px | **213px** |
| Desktop, one or two lines | 130px | 90px | **90px** |

Line widths of the six-line statement, measured per line with a `Range`:

```
floated    163 · 132 · 244 · 158 · 223 · 239 px      ← narrowed only beside the controls
flex row   140 · 140 · 140 · 140 · 140 · 140 · …     ← every line pays
```

**Why a spacer rather than floating the controls themselves.** With the controls
floated, DOM order inside the card row was `tools` then `text`. With the spacer
it is `text` then `tools`, and the picture is identical:

```
DOM order inside the row:  musie-card__text then musie-card__tools
on screen:  text starts x65, tools at x245 — to the right, same line
```

**The trap.** The first attempt kept a flex wrapper around the text. A flex
container establishes its own formatting context and steps *around* a float
instead of wrapping beside it — so the measurements came back identical to the
flex-row column and the float looked inert. Nothing in the container-level
numbers shows this; only the per-line widths do.

---

## L5 · Control size

```
fine pointer     24×24  (--target-min,     plus --sp-2 margins = 40px footprint)
coarse pointer   44×44  (--target-primary)
tool cluster gap  0 at min — the margins already sum to --space-gap-stack
```

---

## L6 · Action rows, and the primary CTA

```
editor row       DOM Discard → Save    justify-content: flex-end   Save rightmost, flush
accordion row    DOM Delete  → Edit    justify-content: flex-end   Edit rightmost, flush
record CTA 390   179px   align-self: flex-end   flush right, hugs
record CTA 1280  184px   align-self: flex-end   flush right, hugs
```

The two action rows are identical on screen and differ only in the DOM, which is
the comparison on `#/rules` Q2:

```
row 1 (ships)     DOM Delete,Edit   on screen Delete,Edit
row 2 (rejected)  DOM Edit,Delete   on screen Delete,Edit
```

---

## L7 · Width as a state cue

```
             ready        recording
390px       179×46   →     310×46
1280px      184×47   →     592×47
```

---

## L8 · The dense-list exception

Eight cards, one long. The rule is `text.length <= 80 ? body-sm : body-md`:

```
30ch=15px  36ch=15px  29ch=15px  31ch=15px
27ch=15px  29ch=15px  32ch=15px  146ch=17px
```

Desktop, same cards, fluid: `15.85px` × 7 and `17.85px` for the long one.

---

## L9 · Drop indicator contrast

Accent-2, measured against each surface it can land on:

| Token | Colour | vs page `sand-2` | vs card `sand-1` |
| --- | --- | --- | --- |
| `--interactive-accent-alt` (`purple-9`) | #CCA6C7 | **1.85:1** | **2.01:1** |
| `--interactive-accent-alt-border` (`purple-edge`) | #867084 | **3.90:1** | **4.25:1** |

1.4.11 requires 3:1 of a meaningful graphic. This is `12-component-gaps.md` §5.

---

## Component gaps §3 · Record Button overflow

310px column, default copy, recording:

```
button 310px   padding 24/24   content box 262px
  icon        x   1 →  21   w  20
  label       x  33 → 187   w 154
  meter       x 199 → 199   w   0      ← correctly collapsed first
  readout     x 211 → 306   w  95      ⚠ OVERFLOWS by 44px
scrollWidth 329 vs clientWidth 308     ⚠ content does not fit
```

Same column, `recordingLabel="Recording"`:

```
  label       x  33 → 116   w  83
  meter       x 128 → 154   w  27      ← survives
  readout     x 166 → 261   w  95
scrollWidth 308 vs clientWidth 308     fits
```

At 1280px (592px column) the default copy fits with 225px of meter.

---

## L2 · The gap ladder, as computed on the reference screen

```
page sections      48px   (96px ≥ --bp-lg)
title + subtitle   12px
field + message    16px
three regions      32px   ← exactly 2× the 16px inside each
list, card row     16px
inside a card      24px inset, 12px between parts
```

The doubling check: largest gap inside a region is 16px, gap between regions is
32px. Holds.

---

## What is *not* evidenced

Stated so nobody mistakes silence for proof:

- **None of this has been driven by real speech.** Every recording test used a
  stubbed WebSocket and a synthesised microphone. The layout is unaffected; the
  transcription behaviour around it is not proven end to end.
- **Chrome's `--use-file-for-fake-audio-capture` emits silence** in current
  builds regardless of the file. An earlier round of "speech" tests was in fact
  feeding silence. If you reproduce anything audio-related, synthesise the
  stream in-page instead.
- **The keyboard equivalents of the drag gesture** (Space to lift, arrows to
  move, M to merge, Escape to cancel) are implemented and have never been
  verified.
- **One screen.** Every rule here comes from a transcript workspace. A form, a
  media grid or a multi-step flow will find gaps, particularly in L2 and L6.
