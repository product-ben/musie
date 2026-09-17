# 12 · Component gaps — decided

> **Applied.** All six landed in this package on 2026-09-17. §6's Lightbox
> footnote is the one item held open — see
> [`06-open-questions.md`](06-open-questions.md) Q26.

Changes to Layer 1 and Layer 2 that [10 · Layout](10-layout.md) depends on.
Each was found by building a real screen, and each has been **decided** — the
decision is recorded here so the change can be made and the rule that assumes it
stops being a deviation.

Same shape as [08 · Token gaps](08-token-gaps.md): what, why, the exact edit, and
what it unblocks.

| # | Where | Change | Status |
|---|---|---|---|
| 1 | Layer 1 §5.4 | `--target-min` gains a second permitted case | decided |
| 2 | §7.9 Content Box | add `headlineHidden` | decided |
| 3 | §7.22 Record Button | shorter default `recordingLabel` | decided |
| 4 | §7.22 Record Button | `hug` becomes the default | decided |
| 5 | Layer 1 palette | re-word the step-9 comment | decided |
| 6 | §7.16 Field | controlled value never reaches base-ui | **defect** |

---

## 1 · Layer 1 §5.4 — `--target-min` gains a second case

**Today.** *"24px. 2.5.8 floor. Inline controls inside prose only."*

**Why it moves.** A card's drag handle and disclosure are its only affordances
and sit outside prose, so §5.4 bars `--target-min` there — yet 24px still clears
WCAG 2.2 SC 2.5.8, which makes the restriction a comfort rule rather than an
access one. On a fine pointer the comfort argument does not apply; on a coarse
one it very much does. Without this, [L5](10-layout.md#l5--control-size-follows-the-pointer)
is a documented deviation on every screen that has a card.

**The edit.**

```
--target-min   24px   2.5.8 floor. Inline controls inside prose,
                      and card controls on a fine pointer. Never on
                      a coarse pointer — see --target-primary.
```

**Unblocks.** L5. No code changes; the component ladder is unchanged.

---

## 2 · §7.9 Content Box — add `headlineHidden`

**The problem.** `headline` is required and renders the `<h3>` that puts the box
in the document outline — the documented reason Content Box is an `<article>`. A
card that shows its content alone needs that heading present and invisible, and
the component exposes neither a prop nor a className for the part. The only route
left is copying `.musy-sr-only`'s declarations into the screen's own CSS, which
is a literal copy of system CSS — the one thing
[L14](10-layout.md#l14--custom-patterns) forbids.

`Switch` already has exactly this API, spelled `labelHidden`.

**The edit.**

```ts
/** Hide the headline visually. It stays in the outline and in the
 *  accessible name. Mirrors Switch's `labelHidden`. */
headlineHidden?: boolean;
```

```tsx
<H className={headlineHidden ? 'musy-sr-only' : 'musy-box__headline'}
   data-type-step={headlineHidden ? undefined : headlineStep}>
```

**Unblocks.** [L8](10-layout.md#l8--type-the-floor-and-the-one-exception)'s
"invisible but present" heading, without a screen reproducing system CSS.

---

## 3 · §7.22 Record Button — shorter default `recordingLabel`

**The defect it fixes.** §7.22 is explicit that the meter is the elastic part and
the readout must never be what gives: *"the readout is the only thing a
screen-reader user gets."* Measured in a **310px column** with the default copy,
the meter correctly collapses to zero and then the readout **overflows the
content box by 44px and clips** — `scrollWidth` 329 against `clientWidth` 308.
`.musy-btn__label` is `flex: 0 0 auto` and the meter is already at zero, so the
deficit has nowhere to go.

§7.22 reports measuring at 340px. A 393px viewport minus an app gutter and a card
inset lands at 310px, which is an ordinary phone column rather than an edge case.

**The edit.**

```ts
recordingLabel = 'Recording',      // was 'Recording Running'
```

Measured with the shorter default in the same column: `scrollWidth` 308 against
`clientWidth` 308, with 27px of meter still showing.

**Known limit, accepted.** This moves the cliff rather than removing it. German
runs ~30% longer, and a localised string may reach it again — at which point the
readout clips rather than the label truncating. The alternative considered and
not taken was a shrink allowance on the label that engages once the meter is at
zero; if a localisation does hit the cliff, that is the fix.

---

## 4 · §7.22 Record Button — `hug` becomes the default

**Today.** `min-inline-size: min(18ch, 100%)` on the ready state, for the stated
reason that "the button does not jump wider the moment it goes live".

**Why it changes.** The jump is legitimate feedback, not a defect to suppress: a
control that hugs its label when ready and fills its column while recording tells
you which state it is in before you have read the label. The anti-jump floor
makes that impossible without a screen reaching into the component's geometry,
which is the one thing [L7](10-layout.md#l7--width-can-be-a-state-cue) is trying
to avoid.

**The edit.** Drop `min-inline-size` from `.musy-btn.musy-rec` and let the ready
state take its content width. `max-inline-size: 100%` stays — it is what lets the
meter shrink once live, and the comment explaining that should stay with it.

**Consequence, stated.** Consumers who relied on the steady width lose it. The
recording state is unchanged. Combined with
[L6](10-layout.md#l6--the-primary-action-is-right-aligned-to-its-parent), a
hugging record control is right-aligned to its parent, not left.

---

## 5 · Layer 1 palette — re-word the step-9 comment

**The contradiction.** Step 9's comment reads *"Solid fill — buttons, filled
chips, meaningful graphics"*. Measured as a standalone graphic, `purple-9`
(#CCA6C7) gives **1.85:1 against the page and 2.01:1 against a card** — under the
3:1 that 1.4.11 requires. The comment promises something the colour cannot keep.

**Decided: the comment is wrong, not the colour.** Step 9 is a fill that carries
its own `-on` foreground; it was never solved against the surfaces it would sit
*on*. Moving it would darken all four accent solids, change every filled button
and chip, and require the 94-pair audit to be re-run — for a case the `-edge`
step already covers at 3.90:1 / 4.25:1.

**The edit**, on every scale's step 9:

```
--<scale>-9   Solid fill — buttons, filled chips. A graphic that
              stands alone on a surface takes -edge, which is solved
              to 3:1 against every surface (1.4.11).
```

**Worth noting for 04 · Contrast audit.** The audit's "94 pairs, 0 failures"
appears to cover foreground-on-fill pairs, not solid-on-surface. Adding the
second family of pairs would have caught this.

**Unblocks.** [L9](10-layout.md#l9--drag-and-drop)'s "standalone graphic takes
the `-border` step" stops contradicting Layer 1.

---

## 6 · §7.16 Field — controlled value never reaches base-ui `[DEFECT]`

`Field` passes `value`, `defaultValue` and `onValueChange` to base-ui's
`Field.Root`, which accepts none of them — checked against `@base-ui/react`
1.7.0, the version `package.json` declares. They land on a `<div>` and are
ignored, so **a pre-filled or controlled field renders empty**. It type-errors
under a strict `tsc`, which is how it surfaced.

**Downstream.** Any screen editing existing text has to compose on Field's
*parts* (`.musy-field__*`) instead of using the component. That is a sanctioned
pattern — §7.19 Voice Note does it and says so — but here it is forced rather
than chosen, and every such screen is a copy of markup the component should own.

**The fix** is in `Field.tsx`: drive the value through `Field.Control`'s rendered
element rather than through `Field.Root`.

```tsx
<BaseField.Control
  render={multiline ? <textarea rows={rows} /> : <input type={type} />}
  value={value}
  defaultValue={defaultValue}
  onChange={(e) => onValueChange?.(e.target.value)}
  …
/>
```

**Also worth a look while in there.** `Lightbox` passes `dismissible` to
`Dialog.Root`, which does not accept it either. Same class of drift, unused by
any screen so far.
