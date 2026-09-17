# 10 · Layout — Layer 3

    Layer 1  Foundations   tokens              01-foundations.md
    Layer 2  Components    what things are     07-components.md
    Layer 3  Layout        where things go     10-layout.md       ← this file

Layer 2 says what a Content Box is. It cannot say how far it sits from the next
one, which edge its actions hug, or what happens to it at 393px — and those
decisions are where two screens built from the same components stop looking like
one product.

Every rule below was forced by building a real screen against this system, and
every number is a Layer 1 token. Nothing here amends Layer 1 or Layer 2; where a
rule needed a component or a token to change, that change is logged in
[12 · Component gaps](12-component-gaps.md) and the rule assumes it landed.

**The rule that outranks the rest.** Do not recreate a component. If the system
has one, import it and pass props. A custom pattern is permitted only where the
system has none (L14), and then it is token-only.

---

## L0 · The two facts every rule below assumes

**Mobile first, and it is not a slogan.** Design at **393px** and let the layout
grow. Every measurement in this document was taken at 393px first and 1280px
second, in that order. A layout that was designed wide and then squeezed fails
in a way that is invisible on the machine it was designed on — L7 and
[12 · Component gaps](12-component-gaps.md) §3 are both that failure, caught only
because the phone column was measured.

**Thumb-first, and right-handed.** The product is used one-handed, and
right-handed users are the majority. That single fact decides L6 and L7: **the
action a user is most likely to want sits at the right edge**, because that is
where the thumb already is. Anything that contradicts it needs a reason written
down next to it.

Neither fact is a preference. They are the use context Layer 1 §1 already
states, made operational.

---

## L1 · Page skeleton

A screen's root element carries five things and nothing else:

```css
.page {
  isolation: isolate;                 /* base-ui portals clear local z-index */
  background-color: var(--surface);
  color: var(--on-surface);
  font-family: var(--font-text);
  padding: var(--space-inset-card);
  border-radius: var(--radius-panel);
}
```

Plus `data-theme` on that same element rather than on `<html>` when the screen is
one route inside a larger app. Layer 1 §12 declares every token on
`:root, [data-theme]` precisely so a nested subtree recomputes `light-dark()`;
scoping it there keeps `color-scheme: dark` off pages that are not ours. Use the
`musy-theme` storage key either way — one mechanism, narrower scope.

`body { position: relative }` and one `<MusyTooltipProvider>` near the root are
app-shell requirements the package already documents. They belong to the app, not
to the screen.

---

## L2 · The gap ladder

The rule the whole layer hangs on. Layer 1 §5 names a token for each
relationship; **use the name, never a number**, and never pick a gap by eye.

| Between | Token | px |
| --- | --- | --- |
| An icon and its own label | `--space-gap-inline` | 8 |
| Atoms that belong together — a label and its field, a title and its subtitle, two buttons that are alternatives | `--space-gap-related` | 12 |
| Controls inside one molecule, and the content they act on | `--space-gap-stack` | 16 |
| Molecules that do **not** belong together | `--space-gap-group` | 32 |
| Page-level sections | `--space-section` / `--space-section-lg` | 48 / 96 ≥ `--bp-lg` |

**The doubling check — a check, not a guideline.** Layer 1 §5: *"the gap between
two groups is always at least double the largest gap inside either group."*
After laying a screen out, read the gaps off the computed styles and verify it.
On the reference screen: three regions at 32px, each containing 16px — exactly
double. If it fails, the grouping is ambiguous, and the fix is a divider or a
shared surface, never a bigger gap.

Three primitives cover almost every arrangement. Use these names:

```css
.stack { display: flex; flex-direction: column; gap: var(--space-gap-stack); }
.group { display: flex; flex-direction: column; gap: var(--space-gap-group); }
.row   { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-gap-stack); }
```

`--space-section-lg` needs a media query and CSS cannot take a token there. Write
the literal and name the token in a comment, which is the convention
`musy-components.css` already uses:

```css
/* --space-section-lg above --bp-lg. */
@media (min-width: 1024px) { .page { gap: var(--space-section-lg); } }
```

---

## L3 · A list of things is a list

A run of repeated items is `<ol>` or `<ul>` with `list-style: none`, not a stack
of divs. The count and the position reach assistive tech instead of being drawn.
Items sit at `--space-gap-stack`.

---

## L4 · Card anatomy — the text leads, the controls float beside it

A card carrying content **and** its own controls puts the content first in the
DOM, floats a **spacer** the size of the control cluster, and positions the
controls into the gap it leaves.

```css
.card__row   { display: flow-root; position: relative; }

.card__row[data-size="primary"] {
  --tools-inline: calc(var(--target-primary) * 2 + var(--space-gap-stack));
  --tools-block:  var(--target-primary);
}
.card__row[data-size="min"] {           /* each min button owes --sp-2 a side */
  --tools-inline: calc((var(--target-min) + var(--sp-2) * 2) * 2);
  --tools-block:  calc(var(--target-min) + var(--sp-2) * 2);
}

.card__text::before {
  content: "";
  float: inline-end;
  inline-size: calc(var(--tools-inline) + var(--space-gap-stack));
  block-size: var(--tools-block);
}
.card__tools { position: absolute; inset-block-start: 0; inset-inline-end: 0;
               display: flex; align-items: flex-start; gap: var(--space-gap-stack); }
```

**Why a float rather than a column or a flex row** — a statement card at 393px,
measured three ways:

| Card | Controls stacked | Controls in a flex row | Controls floated |
| --- | --- | --- | --- |
| One or two lines | 154px | 104px | **97px** |
| Six lines | ~184px | 322px | **213px** |

Stacked, the control column sets the height and every card is the same height
whatever it says. A flex row fixes that but takes the same bite out of *every*
line, so long content is squeezed into a narrow column and grows tall again.
Floated, only the lines beside the controls are narrowed — measured line widths
for a six-line statement: `163 · 132 · 244 · 158 · 223 · 239px`.

**Why a spacer rather than floating the controls themselves.** A float only
operates from the front of the flow, so floating the controls puts both buttons
ahead of the content they act on for a screen reader, on every card in a list.
The spacer costs one more rule and keeps the picture and the reading order in
agreement.

**Two things that will bite.**

1. **The content must be a plain block.** A flex or grid container establishes
   its own formatting context and steps *around* the spacer instead of wrapping
   beside it. This is silent — the layout just reverts to the flex-row
   measurements — so if a float looks inert, look for a `display: flex` on the
   text's wrapper first.
2. **The spacer and the cluster must not drift.** Both read the same
   `--tools-*` custom properties, set once on the row from the same `data-size`
   the buttons use.

---

## L5 · Control size follows the pointer

`--target-min` (24px) is comfortable under a cursor and tight under a thumb. At
24px a control still clears WCAG 2.2 SC 2.5.8, so outside prose this is comfort,
not access.

**Pick the rung from the pointer, through the component's own `size` prop.**
Never override `--musy-icon-btn-size`.

```tsx
const size = useCoarsePointer() ? "primary" : "min";   // 44px : 24px
<IconButton glyph={GripVertical} label="…" variant="ghost" size={size} />
```

This needs Layer 1 §5.4 to permit a second case for `--target-min` — inline
controls in prose, **and card controls on a fine pointer**. Logged in
[12 · Component gaps](12-component-gaps.md) §1.

**Never add a gap to a row of `min` buttons.** `.musy-icon-btn--min` already
carries a margin of `--sp-2` on every side for 2.5.8, and two of those margins
meet at exactly `--space-gap-stack` on either axis:

```css
.card__tools[data-size="min"] { gap: 0; }
```

---

## L6 · The primary action is right-aligned to its parent

From L0: right-handed, one-handed, thumb at the right edge.

**A primary CTA is right-aligned to its parent. A Continue button always is.**
The only permitted exception: a control that is the *stage's* single action — an
onboarding step, a confirmation screen, a sheet with one way forward — may be
centred on the stage.

```css
.actions--end { justify-content: flex-end; }   /* in a row   */
.cta          { align-self: flex-end; }        /* in a stack */
```

This applies to a primary CTA that hugs its content as much as to one in a row:
the reference screen's record control hugs its label when ready, and hugs the
**right** edge.

**Action rows: likely action outermost.**

| Row | Visual order | Outermost |
| --- | --- | --- |
| Disclosed card actions | Delete · Edit | Edit |
| Editor | Discard · Save | Save |

Two buttons that are alternatives to each other sit at `--space-gap-inline` —
they read as one control pair, not two controls.

**DOM order follows visual order, not importance.** The other button leads in
the markup, so tab order matches the screen instead of contradicting it. That
puts a destructive action first in the tab order, and that is accepted: an undo
affordance (L11) makes it reversible, which is a better safety net than a
confirm dialog nobody reads.

**Weight carries state, not position.** Save is `secondary` and disabled until
there is a change to save, then `primary`. Discard is `secondary` throughout:
when there is nothing to save, the two buttons do the same thing and should look
alike.

---

## L7 · Width can be a state cue

A control whose state changes what it contains may change width with it. The
change is feedback, not a jump to be suppressed: the record control hugs its
label when ready (179×46 at 393px) and takes the column while recording
(310×46).

No transition on that change. `fit-content` does not interpolate to a stretched
width, so a width animation either does not run or snaps at the end — and when
the glyph, the label and the contents all change on the same click, an instant
change is the consistent one.

Record Button does this by default — see
[12 · Component gaps](12-component-gaps.md) §4. A screen should never reach into
a component's own geometry to get it.

---

## L8 · Type: the floor, and the one exception

Layer 1 §4 sets a hard floor — 17px at the 393px reference — and bars `body-sm`
and `label-md` from essential prose.

| Role | Step |
| --- | --- |
| The thing the screen is about | `body-md` — the floor |
| Captions, helper lines, counts, timestamps | `body-sm` |
| A card's own heading, when it is only an identifier | `label-md` |
| Screen title | `heading-lg` |

**The dense-list exception.** An item in a scannable list may drop to `body-sm`
**when it is 80 characters or shorter**. Longer items stay at the floor, so a
long item is never small, and the test is a character count rather than a
judgement:

```ts
const step = text.length <= 80 ? "body-sm" : "body-md";
```

Two items in one list can therefore be different sizes. That is the point: the
size tracks how much there is to read, not where the item sits.

> **Read-only lists.** This was measured on a list that is produced and then
> read. In a list the user **edits**, it misfires: merging two short items
> crosses the threshold, so text the user just combined renders one step larger,
> and a size change on unchanged content reads as a defect. §7.24 therefore
> ships with the exception **off** by default and offers it as `dense`. See
> conflict B23 and open question 28 — this rule needs its scope stated. §7.24
> keeps the exception's SIZE for every item and drops the length test, which is
> the part that misfired.

**A card heading may be invisible but must exist.** Content Box renders its
headline as the `<h3>` that puts the box in the document outline — the documented
reason it is an `<article>`. Hide it with `headlineHidden`
([12 · Component gaps](12-component-gaps.md) §2), never by removing it.

---

## L9 · Drag and drop

| Part | Treatment |
| --- | --- |
| Drop indicator, between two items | `--border-width-thick` tall, `--radius-full`, filled with an accent family's **`-border`** step |
| Merge target, on the item itself | that family's `-subtle` fill with its `-border` border |
| The dragged item | stays in place at `opacity: 0.4`, so the list never reflows and the positions measured at drag start stay valid |
| The thing under the finger | a copy at `--z-tooltip`, `--elevation-2`, `--surface-overlay`, capped at `--measure-heading` |
| Any drag surface | `user-select: none` — a marquee starting under the finger beats the gesture to it |
| A drag handle | `touch-action: none`, `cursor: grab` / `grabbing` |

**A standalone graphic takes the `-border` step, never the solid.** A drop
indicator is a meaningful graphic and 1.4.11 wants 3:1. Measured:
`--interactive-accent-placeholder2` (`purple-9`) gives **1.85:1 against the page
and 2.01:1 against a card**; the same family's `-border` (`purple-edge`) gives
**3.90:1 / 4.25:1**. Layer 1's step-9 comment is being corrected to match —
[12 · Component gaps](12-component-gaps.md) §5.

**An indicator between two items absorbs the list's gap on its outer side**, or
it reads as belonging to the item it is nested in:

```css
.drop { margin-block: var(--sp-1); }
.drop:first-child { margin-block-start: calc(var(--sp-1) - var(--space-gap-stack)); }
.drop:last-child  { margin-block-end:   calc(var(--sp-1) - var(--space-gap-stack)); }
```

---

## L10 · Waiting, provisional, empty

`ContentBox outline="dashed"` is the system's own reading of *provisional /
awaiting content* (token gap G2). Use it for the empty state **and** the
in-flight one — same box, so the screen does not change shape when content
starts arriving.

A box waiting for content shows three dots at `--on-surface-muted`, `--sp-2`
across, `--space-gap-inline` apart. Under `prefers-reduced-motion` the pulse is
**dropped entirely, not shortened**: Layer 1 collapses every duration to 1ms,
which on a loop strobes. §7.19 already makes that call for its recording dot, and
it generalises — *any continuous animation is removed under reduced motion rather
than sped up.*

---

## L11 · Feedback: where it goes

| Kind | Component | Live region |
| --- | --- | --- |
| A fatal problem, injected after load | `Message variant="error"`, inline where it happened | `live="assertive"` |
| A recoverable problem | `Message variant="warning"`, inline | `live="polite"` |
| Context present on load | `Message variant="info"`, inline | `live="off"` |
| A completed action that can be undone | [Toast](11-toast.md), `--z-toast`, bottom-centre | `role="status"` |
| Why something stopped | `Badge` beside the control it explains | — |

**Explain only what needs explaining.** A user-initiated stop needs no badge; a
timeout, a cut-off or an error does. Confirming what someone just did themselves
trains them to ignore the channel.

---

## L12 · Motion

Take duration and easing from tokens, never a literal, so
`prefers-reduced-motion` is handled by Layer 1 with no component query:

```css
animation: fade-in var(--motion-duration-base) var(--motion-ease-entrance);
/* travel from --motion-travel-sm, which Layer 1 collapses to 0 */
```

One exception, stated in L10: a **looping** animation is removed rather than
shortened.

---

## L13 · Selection and gestures

`user-select: none` on any surface that is also a drag target. A handle gets
`touch-action: none` and starts its drag immediately; the surface around it
requires a short hold on a coarse pointer, or the card swallows every attempt to
scroll the page — which on a phone is most of what people do.

---

## L14 · Custom patterns

Permitted only where the system has no component — a code block, a level meter, a
drop indicator. Then:

1. Every declaration resolves to a Layer 1 token or to arithmetic over one. The
   only bare numbers allowed are geometric identities (`0`, `50%`, `100%`) and
   unitless multipliers inside `calc()`.
2. Naming is `.<product>-<block>[__<part>][--<variant>]`, with a prefix that is
   **not** `musy-`, so a screen file can never be mistaken for a system file.
3. A pattern that recurs is a component request, not a second copy.

---

## L15 · Verify by measurement

Layout claims are checked against a rendered page at **393px and 1280px, in that
order**, not argued from source. The checks that have caught real defects here:

- computed `gap` on every container, against the L2 ladder;
- `scrollWidth` vs `clientWidth` on any control with three or more parts —
  **and the elastic part's own width alongside it**: a flex child with
  `min-inline-size: 0` cannot overflow its parent, so it collapses to ~1px while
  the container-level check reports "fits". §7.23 shipped that way once. Either
  assert the elastic part's width too, or give it a floor;
- contrast of any indicator against **every** surface it can land on;
- `getBoundingClientRect()` on touch targets, against `--target-*`;
- for a float, the width of each individual line — a float that is not working
  looks identical to one that is at the container level;
- DOM order against visual order, for anything positioned or floated.
