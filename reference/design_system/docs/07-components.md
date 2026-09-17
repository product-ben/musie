# 07 · Layer 2 — component specifications

Twelve components. Layer 1 is consumed, never amended: every value below is a
Layer 1 token, or arithmetic over Layer 1 tokens. Two components are marked
**PROVISIONAL** because they consume a token gap — see
[08-token-gaps.md](08-token-gaps.md).

Source: `components/*.tsx` (React + TypeScript, one file per component), built on
**base-ui** (`@base-ui/react` ^1.7) per brief §8.1. Dependencies in `package.json`.
Styles: `components/musy-components.css`.

**Which primitive each component uses**

| Component | base-ui |
|---|---|
| Icon | `useRender` (composition API only — an icon has no behaviour) |
| Icon Button | `Button` + `Tooltip` (Root/Trigger/Portal/Positioner/Popup) |
| CTA Button | `Button` |
| Switch | `Switch.Root` + `Switch.Thumb` |
| Radio Group (text) | `Fieldset` + `RadioGroup` + `Radio.Root`/`Indicator` |
| Radio Group (image+text) | same |
| Process Visualisation | `Separator` (divider only) |
| Content Box | `useRender` |
| Message | `Button` (dismiss only — base-ui's Toast is a different pattern) |
| Radio Cards | `RadioGroup` + `Radio` + `Fieldset` (same primitives as 7.7) |
| Lightbox | `Dialog` (Root/Trigger/Portal/Backdrop/Popup/Title/Description/Close) |
| Segmented Control | `RadioGroup` + `Radio` + `Fieldset` (**not** `Tabs` — see 7.25) |
| Toast | `Button` (dismiss only — base-ui's own Toast is queued and auto-dismissing) |
| Draggable List | *none of its own* — composes §7.9, §7.2, §7.4 and §7.23; the state machine is the component |
| Content List | `Separator` (row rules) |
| Logo | `useRender` |

**State model.** base-ui puts state on the part itself — `data-checked`,
`data-unchecked`, `data-disabled`, `data-pressed`, `data-invalid` — so the
stylesheet targets the element it styles. There are no hidden-input sibling
selectors anywhere; `Switch.Root` and `Radio.Root` render the focusable element
with the hidden `<input>` beside it, which is why `.musy-switch__track` and
`.musy-radio__body` *are* those roots.

**Setup the app owes base-ui.** `isolation: isolate` on the app root wrapper so
portaled popups clear any local `z-index`; `body { position: relative }` for
iOS 26+ Safari backdrops; one `<MusyTooltipProvider>` near the root so moving
between neighbouring icon buttons does not re-run the open delay.
Review surface: [`Musy Components Proof.dc.html`](../Musy%20Components%20Proof.dc.html).

**Integration requirement — `<html lang="de">`.** Layer 1's `--text-hyphens: auto`
is consumed on every wrapping text part (radio labels, card labels, body copy,
process bodies), and `hyphens: auto` does nothing without a language tag. Without
it, "Partnerschaft" in a 109px card column has no way to break and overflows.
Every affected part also carries `overflow-wrap: break-word` as the safety net
for a word with no legal hyphenation point in range — but the lang attribute is
what makes the *intended* behaviour work, and it is the app's to set.

## Blocking decisions as answered

| # | Answer taken | Effect on this pass |
|---|---|---|
| 1 | Static Lucide default; `lucide-animated` allowed as an explicit per-component opt-in, gated by a user setting **and** `prefers-reduced-motion` | `Icon` has an `animate` prop, off everywhere. Conflict A1 is resolved by policy, not by token |
| 2 | `--icon-stroke-sm: 1.5px` is a **token gap** — flagged, not invented locally | Gap G1. `Icon size="sm"` is PROVISIONAL |
| 3 | Literal placeholder names kept verbatim | Every accent prop is `'primary' \| 'accent-placeholder1' \| 'accent-placeholder2'`. Renaming later is a find-replace |
| 4 | Breakpoint + target-size system only; no separate shared-screen mode | `--target-guided` is a size variant on Icon Button, CTA Button, Switch and Radio Group. No new type set |
| 5 | `surface-inverse` kept | Icon Button's tooltip consumes it. Open question 9 is closed |

One correction to §2.4 as written: it names `--target-comfort` as the CTA default
while §5.4 names `--target-primary`. §5.4 is the more specific statement about
this component, so CTA Button defaults to `--target-primary` (44px) and offers
`comfort` and `guided` as variants. Logged as conflict B8.

---

## 7.1 Icon `[LOCKED]` · PROVISIONAL (G1)

**Purpose.** Render one static Lucide glyph at a system size, in the system stroke, in the colour of whatever contains it.

**APG pattern / semantic HTML.** No pattern (not interactive). `<svg>` with `aria-hidden="true"` when decorative, or `role="img"` + `aria-label` when the glyph is the only carrier of meaning.

**Anatomy.**
```
Icon
└── svg.musy-icon.musy-icon--<size>[.musy-icon--<tone>][.musy-icon--inline]
    └── Lucide path data (unrounded, 24px grid, as extracted)
```

**Props.**

| Prop | Type | Default | Note |
|---|---|---|---|
| `glyph` | `LucideIcon` | — | The component, not a name string: a name string pulls the whole set into the bundle |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | 16 / 20 / 24 / 32 |
| `tone` | `'inherit' \| 'muted' \| 'strong' \| 'primary' \| 'info' \| 'warning' \| 'success' \| 'error'` | `'inherit'` | Every non-inherit tone clears 3:1 |
| `label` | `string` | — | Omit for decorative. Presence flips the ARIA treatment |
| `inline` | `boolean` | `false` | Applies `--icon-optical-nudge` |
| `animate` | `boolean` | — | Opt-in only, and CSS still removes it under reduced motion |

**State matrix.** Not interactive — no states. It has no hover, active, focus, disabled, loading, error or empty state, and it must not acquire one: an icon that reacts to the pointer is an Icon Button.

**Responsive behaviour.** None of its own. Size is chosen by Layer 1's icon↔text pairing rule against the *adjacent text step*, which is itself fluid, so the pairing holds at every breakpoint without a query.

**Token usage.** `--icon-size-sm` `--icon-size-md` `--icon-size-lg` `--icon-size-xl` `--icon-stroke` `--icon-stroke-sm` *(G1)* `--icon-optical-nudge` `--on-surface` `--on-surface-muted` `--interactive-primary-on-subtle` `--feedback-info-icon` `--feedback-warning-icon` `--feedback-success-icon` `--feedback-error-icon` `--motion-emphasis`

**A11y notes.** The `label`/no-`label` fork is the whole accessibility surface, and it is deliberately not defaulted: an icon that is sometimes decorative and sometimes meaningful cannot have a safe default. `focusable="false"` is set explicitly — IE-era behaviour still surfaces in some AT. Size and stroke come from CSS custom properties, so the SVG's own `width`/`height`/`stroke-width` attributes are stripped rather than left to compete.

**What it is NOT.** Not a button, not a status indicator, and not a place to put an animation by default.

---

## 7.2 Icon Button `[SEED]`

**Purpose.** A single icon-only action, named once.

**APG pattern.** [Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/), via base-ui `Button`. The tooltip is base-ui `Tooltip` — it portals, so it cannot be clipped by a scroll container, and it collision-flips near a viewport edge. Both were real defects in the hand-rolled CSS version it replaces.

**Anatomy.**
```
IconButton
└── button.musy-icon-btn.musy-icon-btn--<variant>.musy-icon-btn--<size>  [aria-label]
    ├── Icon                         (hidden while loading)
    ├── span.musy-spinner            (revealed by [data-loading] only)
    ├── span.musy-sr-only[role=status]   (loading announcement)
    └── span.musy-icon-btn__tooltip  (aria-hidden; same string as aria-label)
```

**Props.**

| Prop | Type | Default |
|---|---|---|
| `glyph` | `LucideIcon` | — |
| `label` | `string` | — (required) |
| `variant` | `'primary' \| 'secondary' \| 'ghost'` | `'ghost'` |
| `size` | `'min' \| 'primary' \| 'comfort' \| 'guided'` | `'primary'` |
| `tooltip` | `boolean` | `true` |
| `loading` | `boolean` | `false` |
| `loadingLabel` | `string` | `'Wird geladen'` |

**State matrix.**

| State | Selector | What changes |
|---|---|---|
| default | — | `--interactive-primary` / `--surface-raised` / `--interactive-ghost` + matching `-border` and `-on` |
| hover | `:hover` inside `(hover: hover) and (pointer: fine)` | `-hover` fill; secondary also steps its border to `--sand-8` |
| active | `:active`, `[data-pressed]` | `--interactive-primary-active` (the solved press token) / `--interactive-ghost-active` |
| focus-visible | `:focus-visible` | `--focus-ring` at `--focus-ring-offset` |
| disabled | `:disabled`, `[data-disabled]` | `-disabled` fill, `-on-disabled` foreground, border to transparent, `cursor: not-allowed` |
| loading | `[data-loading]` | glyph hidden, spinner revealed, `aria-busy`, live-region text, button disabled |
| error | — | N/A. A button does not hold validation state; the field or the Message does |
| empty | — | N/A. An icon button always has its icon |

Hover is scoped to fine pointers on purpose: applied on touch it stays stuck after a tap, which on a one-handed app is the most common false affordance there is.

**Responsive behaviour.** No breakpoint changes. The tooltip is removed entirely at `(hover: none)` / `(pointer: coarse)` — a touch-triggered tooltip lands under the finger and the `aria-label` already names the control.

**Token usage.** `--target-min` `--target-primary` `--target-comfort` `--target-guided` `--radius-control` `--radius-xs` `--radius-full` `--border-width-regular` `--border-width-thick` `--border-style-solid` `--interactive-primary` `--interactive-primary-hover` `--interactive-primary-active` `--interactive-primary-disabled` `--interactive-primary-on` `--interactive-primary-on-disabled` `--interactive-primary-border` `--interactive-ghost` `--interactive-ghost-hover` `--interactive-ghost-active` `--interactive-ghost-disabled` `--interactive-ghost-on` `--interactive-ghost-on-disabled` `--surface-raised` `--surface-inverse` `--on-surface` `--on-surface-inverse` `--on-surface-disabled` `--border-strong` `--sand-8` `--focus-ring` `--focus-ring-offset` `--focus-ring-clearance` `--motion-toggle` `--motion-duration-slower` `--icon-size-md` `--z-tooltip` `--sp-1` `--sp-2` `--type-label-md-*`

`--sand-8` is the one raw primitive referenced anywhere in this pass. It is the *hover* step of the neutral border and Layer 1 exposes no `--border-strong-hover` semantic alias. Logged as gap G3.

**A11y notes.** `label` is required by the type — an icon-only control with no accessible name is a 4.1.2 failure and the API should make that unwritable. The tooltip popup is `aria-hidden`: it duplicates the trigger's accessible name, so announcing it would double it. base-ui opens a tooltip on **hover and focus** by default, which is what 1.4.13 requires — the hand-rolled version needed a second rule to achieve this and a media query to suppress it on touch. `size="min"` (24px) carries a mandatory `--sp-2` margin so 2.5.8's spacing exception applies; it is permitted inline in prose only. Loading is announced through a `role="status"` string, never by the spinner alone.

**What it is NOT.** Not a menu trigger, not a toggle (that is 7.3), and not a link — an icon that navigates is an `<a>`.

---

## 7.3 Icon Toggle Button — **REMOVED IN REVIEW**

Dropped from the set. Its only real case was the dark-mode control, and a
setting that takes effect immediately is a Switch by APG's own reading — the
toggle button existed to make that setting look like a button. The proof page's
live dark-mode control is now a Switch with a Sun / Moon glyph pair (7.5), which
also gave the Switch a reason to make its knob glyphs a prop.

`IconToggleButton.tsx`, the `.musy-toggle-btn*` rules and the export are gone.
Section numbers here and in the proof page are **unchanged**, so every existing
reference still resolves; 7.3 is a deliberate gap, not a renumbering.

Should a genuine toggle-button case appear (a formatting control in a toolbar,
where the pressed state is one of several in a row), it comes back as a
segmented control, not as this component.

---

## 7.4 CTA Button `[SEED]`

**Purpose.** The primary text action on a screen.

**APG pattern.** [Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/).

**Anatomy.**
```
CtaButton
└── button.musy-btn.musy-btn--<variant>[.musy-btn--comfort|--guided][.musy-btn--block][.musy-btn--wrap]
    ├── Icon (leading, optional, inline-nudged)
    ├── span.musy-btn__label
    ├── span.musy-spinner
    └── span.musy-sr-only[role=status]
```

**Props.**

| Prop | Type | Default |
|---|---|---|
| `children` | `ReactNode` | — |
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'accent-placeholder1' \| 'accent-placeholder2'` | `'primary'` |
| `size` | `'min' \| 'primary' \| 'comfort' \| 'guided'` | `'primary'` (44px, per §5.4) |
| `leadingIcon` | `LucideIcon` | — |
| `loading` | `boolean` | `false` |
| `block` | `boolean` | `false` |
| `wrap` | `boolean` | `false` |

**Accent variants.** `accent-placeholder1` (ocher) and `accent-placeholder2` (purple) carry the full six-state matrix from their own solved token families — not a hue swap on primary. Terracotta is a *dark* solid and takes light ink; both accents are *light* solids and take dark ink. `--interactive-accent-*-on` is declared theme-conditionally and resolves near-black in both themes, because `ocher-9` and `purple-9` barely move between themes while `terracotta-9` brightens. Recolouring the fill alone would have failed 1.4.3 on every accent button. Which of the three a screen should use is still undefined — conflict B12, open question 7.

**State matrix.** Identical in structure to Icon Button 7.2 — same six states, same tokens, now across five variants. Two additions: `loading` hides the label as well as the icon and holds the button's footprint, so a full-width mobile CTA does not collapse mid-request; `wrap` releases the label to two lines rather than overflowing.

**Responsive behaviour.** No breakpoint changes. `block` is offered because full-width-on-mobile is a *layout* decision — the button does not assume it. `--target-guided` also widens the inline padding to `--sp-6` so a 64px pill does not read as a circle.

**`size="min"` is the small rung, and it carries a condition.** 24px at `--target-min`, with a `label-md` label and **zero block padding** — that last part is what makes 24px reachable at all: `--musy-btn-target` drives `min-block-size`, which is a *floor*, so the base rule's `--space-inset-control` left the rung at 47px until the block padding went. With no block padding the 18.61px line box sits inside the 24px floor, which is exactly how 7.2's min rung gets there. The inline padding stays, because it is what keeps the label off the edge. Layer 1 §5.4 permits 24px for inline controls in prose and card controls on a fine pointer, and **never for a primary action**, which is what a CTA usually is. So this rung exists for the narrow case where a *labelled* button is the inline control — a "change" beside a value, a dismiss inside a line of text. The stylesheet bakes in the `--sp-2` margin that earns 2.5.8's spacing exception, exactly as 7.2's min rung does, so the target cannot be made illegal by where it is placed; two of those margins meet at `--space-gap-stack`, so a row of them needs no gap. The leading icon steps to `sm` with it. Named `min` rather than `small` so the ladder reads identically here and on Icon Button.

**Token usage.** Icon Button's list, plus `--space-inset-control` `--sp-3` `--sp-6` `--space-gap-inline` `--type-label-lg-*` `--type-label-md-*` `--text-wrap-body` and, for the accent variants, both families' `--interactive-accent-placeholder{1,2}` `-hover` `-active` `-disabled` `-on` `-on-disabled` `-border`.

**A11y notes.** The Figma geometry (10/20 padding → 37px) was below 2.5.8; Layer 1's `--space-inset-control` reaches 44px with no height override, so the target is a consequence of the padding rather than a hardcoded height. Loading sets `aria-busy` and disables the button — a spinner without `disabled` invites a double submit. Reduced motion drops the spin entirely rather than collapsing its duration: Layer 1's 1ms would spin the ring at ~1000rps, so the ring holds still and the live-region text carries the state.

**What it is NOT.** Not a link (a navigation affordance is an `<a>` styled with the same classes), not a toggle, not a split button.

---

## 7.4a Button Group `[SEED]`

**Purpose.** The two or three actions a screen or step ends with, as one part.

**Not a new button, and not a toolbar.** No roving focus, no segmented selection, no shared radius — the children are ordinary 7.4 CTA Buttons and keep their own target, focus ring and state matrix. The group owns exactly one thing: what the row does when it stops fitting.

**Anatomy.**
```
ButtonGroup
└── div.musy-btn-group[.musy-btn-group--center|--end]
    └── CtaButton ×2–3   (may include a TrackButton — it is a CTA Button)
```

**Props.** `children`, `align` (`'start' | 'center' | 'end'`, default `start`).

**Responsive behaviour.** The one rule worth the component. A row of `--target-guided` buttons is about 2×20ch; below `--bp-md` it either wraps into a ragged staircase or squeezes the labels. So below `--bp-md` the group stacks and every action goes full width, in DOM order — **which is priority order: the primary action comes first in the markup.** `align` is ignored once stacked.

**Token usage.** `--space-gap-inline` `--space-gap-related` `--bp-md`.

**What it is NOT.** Not a toolbar (no `role`, no arrow-key navigation), not a segmented control, not a split button, not a sticky action bar — pinning the group to the viewport edge is the screen's decision, not the group's.

---

## 7.5 Switch `[SEED]`

**Purpose.** Flip one setting that takes effect immediately.

**APG pattern.** [Switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/) — base-ui `Switch.Root` (the track, and the focusable element) + `Switch.Thumb` (the knob). base-ui renders the hidden `<input>` and owns form participation, so there is no input in this component and no sibling-selector styling.

base-ui's own guidance is an enclosing `<label>`, but this component uses the sibling pattern (`htmlFor`/`id`) because the label must sit on either side of the track for the settings row — so `Switch.Root` renders a native `<button>` and takes `nativeButton`, exactly the case base-ui documents for it.

**Anatomy.**
```
Switch
└── div.musy-switch[--reverse][--guided][--accent-placeholder1|2]
    ├── button.musy-switch__track   ← Switch.Root, the focusable element
    │   └── span.musy-switch__knob  ← Switch.Thumb
    │       ├── Icon onGlyph   [data-state=shown|hidden]
    │       └── Icon offGlyph  [data-state=shown|hidden]
    └── label.musy-switch__label  (or .musy-sr-only)
```

Geometry is **derived**, not invented: knob = `--icon-size-lg` (24), inset = `--sp-1` (4), so track = 32 high and 60 wide.

**Props.**

| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — (required) |
| `labelHidden` | `boolean` | `false` |
| `reverse` | `boolean` | `false` |
| `accent` | `'primary' \| 'accent-placeholder1' \| 'accent-placeholder2'` | `'primary'` |
| `guided` | `boolean` | `false` |
| `showStateIcons` | `boolean` | `true` |
| `onGlyph` / `offGlyph` | `LucideIcon` | `Check` / `X` |

**Knob glyphs are a prop.** Check / X is the generic on-off reading and stays the
default. A *domain* pair says what is switching rather than only that something
is — Sun / Moon for dark mode, Volume2 / VolumeX for the accompaniment sounds —
and the reference dark-mode control uses it. Both glyphs stay mounted and
crossfade, so the knob never resizes mid-toggle. The pair is decorative: it is a
redundant cue for a state `role="switch"` already announces, which is why it
carries no label and why `showStateIcons={false}` is a legitimate choice.

**State matrix.** Every state exists twice, once per checked value.

| State | Off | On |
|---|---|---|
| default | `--surface-sunken` track, `--border-strong` edge, knob at `--surface-raised` + `--elevation-1` | `--interactive-primary` (or the accent) + `-border`; knob translated by `knob + --sp-1` |
| hover | `--interactive-ghost-hover` | `--interactive-primary-hover` |
| active | `--interactive-ghost-active` | `--interactive-primary-active` |
| focus-visible | `--focus-ring` on the track, driven from `:focus-visible` on the input | same |
| disabled | `--interactive-primary-disabled` track, `--border-subtle` edge, no elevation, label to `--on-surface-disabled` | same |
| loading | — | N/A at component level. A switch bound to a request is the consuming app's state; it should disable the switch and render a Message |
| error | — | N/A. A switch cannot be invalid — either value is legal |

**Responsive behaviour.** No breakpoint changes. `guided` raises the *row* to `--target-guided`; the track never grows, because a 64px track would read as a slider.

**Token usage.** `--icon-size-lg` `--icon-size-sm` `--sp-1` `--space-gap-related` `--target-primary` `--target-guided` `--radius-full` `--border-width-regular` `--border-style-solid` `--border-strong` `--border-subtle` `--surface-sunken` `--surface-raised` `--elevation-1` `--on-surface` `--on-surface-muted` `--on-surface-disabled` `--interactive-primary` `--interactive-primary-hover` `--interactive-primary-active` `--interactive-primary-border` `--interactive-primary-disabled` `--interactive-primary-on-subtle` `--interactive-accent-placeholder1` `--interactive-accent-placeholder1-border` `--interactive-accent-placeholder1-on-subtle` `--interactive-accent-placeholder2` `--interactive-accent-placeholder2-border` `--interactive-accent-placeholder2-on-subtle` `--interactive-ghost-hover` `--interactive-ghost-active` `--focus-ring` `--motion-toggle` `--type-label-lg-*`

**A11y notes.** A **visible** label associated by `<label for>` is the default and the documented preference (2.5.3); `labelHidden` keeps the label in the accessible name rather than swapping to `aria-label`, so the visible-string / accessible-name match still holds wherever a label *is* shown. Three cues carry the state — fill, knob travel, and the embedded check/x — so removing the hue leaves it readable (1.4.1). The 44px target is the whole row, not the 32px track, which is what makes it usable one-handed. The knob glyph is `--icon-size-sm`; Layer 1's pairing rule is documented here as **knob-relative**, since `label-lg → icon-md` would overflow a 24px knob (logged as delta).

**What it is NOT.** Not a checkbox (no form-submit semantics implied, no indeterminate state), not a two-option radio group, not a button.

---

## 7.6 Radio Group — text only `[SEED]`

> **Boundaries were lightened in review.** The resting and selected edges now take the element's own background — present in the box model, invisible in the picture — and the width no longer steps on selection. The tinted fill and the check glyph still carry the state; the edge no longer does. `prefers-contrast: more` restores both. See **conflict B25** and open question 35.

**Purpose.** Pick exactly one option from a short list of text choices.

**APG pattern.** [Radio Group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) — base-ui `RadioGroup` + `Radio.Root`/`Radio.Indicator`, with `Fieldset.Root` rendering **as** the RadioGroup (base-ui's documented composition) so the group gets a real `<legend>` without a second wrapper.

`Radio.Root` **is** the row: it is the focusable element and it carries `[data-checked]`/`[data-unchecked]`/`[data-disabled]`, so the whole 56px row is the target with no hidden-input trickery. Roving arrow-key focus and the single-tab-stop behaviour come from `RadioGroup`.

**Anatomy.**
```
RadioGroupText
└── fieldset.musy-radio-group[--accent-*][--guided]  [data-invalid]
    ├── legend.musy-radio-group__legend
    ├── p.musy-radio-group__hint
    ├── div.musy-radio[--no-clamp]                ×n
    │   ├── input.musy-radio__input               ← the real control
    │   └── label.musy-radio__body
    │       ├── span.musy-radio__marker → Icon Check
    │       └── span.musy-radio__label
    └── div.musy-radio-group__error → Message variant="error" live="assertive"
```

**Props.**

| Prop | Type | Default |
|---|---|---|
| `name` | `string` | — |
| `legend` | `string` | — |
| `hint` | `string` | — |
| `options` | `RadioOption[]` | — |
| `value` / `onValueChange` | `string` / `(v: string) => void` | — |
| `accent` | `'primary' \| 'accent-placeholder1' \| 'accent-placeholder2'` | `'primary'` |
| `guided` | `boolean` | `false` |
| `error` | `string` | — |
| `emptyLabel` | `string` | `'Keine Optionen verfügbar'` |

**State matrix.**

| State | What changes |
|---|---|
| default | `--surface-raised`, `--border-strong` at `--border-width-regular`, empty marker |
| hover | `--interactive-ghost-hover` |
| active | `--interactive-ghost-active` |
| focus-visible | `--focus-ring` on `.musy-radio__body`, from `:focus-visible` on the input |
| **selected** | tinted fill + border steps to `--border-width-thick` + marker fills and reveals its check + label takes `-on-subtle` |
| disabled | `--interactive-primary-disabled`, `--border-subtle`, border returns to regular, label + marker to `--on-surface-disabled` |
| loading | N/A — selection is instant; a group awaiting a save disables itself and renders a Message |
| error | `[data-invalid]` puts `--feedback-error-border` on every row and renders an error Message below |
| empty | `emptyLabel` replaces the rows |

**Responsive behaviour.** Single column at every breakpoint — a two-column text radio group makes the reading order ambiguous. Rows are `--target-comfort` (56px) by default rather than 44px, because this is the most-tapped control in the onboarding flow; `guided` raises it to 64px.

**Token usage.** `--space-gap-stack` `--space-gap-related` `--space-inset-control` `--target-comfort` `--target-guided` `--radius-card` `--radius-full` `--icon-size-lg` `--border-width-regular` `--border-width-thick` `--border-style-solid` `--border-strong` `--border-subtle` `--surface-raised` `--on-surface` `--on-surface-muted` `--on-surface-disabled` `--interactive-ghost-hover` `--interactive-ghost-active` `--interactive-primary` `--interactive-primary-subtle` `--interactive-primary-border` `--interactive-primary-on` `--interactive-primary-on-subtle` `--interactive-primary-disabled` and the two accent families' `-subtle` / `-border` / `-on` / `-on-subtle` `--feedback-error-border` `--focus-ring` `--motion-toggle` `--type-heading-sm-*` `--type-body-md-*` `--measure-heading` `--measure-body` `--text-wrap-body` `--text-wrap-heading` `--text-hyphens`

**A11y notes.** Selection never rests on colour: **fill + border weight + check icon**, which is what lets `prefers-contrast: more` work with no special case (1.4.1). `fieldset` gets `min-inline-size: 0` — its `min-content` default silently breaks flex children.

**Truncation.** The label clamps at two lines, and the component then **measures** whether the clamp actually cut anything (`scrollHeight > clientHeight`); if it did, that option drops the clamp. There is no ellipsis-only path, because an ellipsis on a meaning-bearing option is a choice the user cannot read. The last option in the proof page is deliberately over-long so this is visible. This still leaves a real question — see open question 15.

**What it is NOT.** Not a select, not a multi-select (that is a checkbox group), and not the image variant (7.7), which is separate by design.

---

## 7.7 Radio Group — image and text `[SEED]`

> **Boundaries were lightened in review.** The resting and selected edges now take the element's own background — present in the box model, invisible in the picture — and the width no longer steps on selection. The tinted fill and the check glyph still carry the state; the edge no longer does. `prefers-contrast: more` restores both. See **conflict B25** and open question 35.

**Purpose.** Pick exactly one option where the image is how the option is recognised — the onboarding "Ich nutze Musy…" screen.

**APG pattern.** [Radio Group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/), same as 7.6.

**Why it is a separate component.** Three behaviours differ, and each one is a policy rather than a style: the grid binds to Layer 1's column table; `imageAlt` is **required per item** in the type; and the label is **never** clamped. Merging them behind an optional `image` prop would force one truncation policy to lose. Flagged as a deliberate non-deviation from §9's warning.

**Anatomy.**
```
RadioGroupImage
└── fieldset.musy-radio-group  [data-invalid]
    ├── legend / hint
    ├── div.musy-radio-card-group[--accent-*]
    │   └── div.musy-radio-card                   ×n
    │       ├── input.musy-radio-card__input
    │       └── label.musy-radio-card__body
    │           ├── span.musy-radio-card__media
    │           │   ├── img[alt=required]
    │           │   └── span.musy-radio-card__check → Icon Check
    │           └── span.musy-radio-card__label
    └── div.musy-radio-group__error → Message
```

**Props.** As 7.6, with `options: RadioCardOption[]` where each item adds `image: string` and `imageAlt: string` (both required). No `guided` prop: a card's target is its whole footprint, already far past 64px.

**State matrix.** As 7.6, with one change and one addition. The selected cue moves into a floating check over the media, so a short label does not shift when selected; disabled additionally drops the media to `opacity: 0.5` — the only opacity value in the pass, and it is on decorative media, not on text.

**Responsive behaviour.** Bound to Layer 1's breakpoint/column table, not to guessed widths:

| Breakpoint | Layer 1 columns | Card columns |
|---|---|---|
| base (<768) | 4 | **2** |
| `--bp-md` 768 | 8 | **3** |
| `--bp-lg` 1024 | 12 | **4** |
| `--bp-xl` 1280 | 12 | 4 (unchanged — a fifth column drops the card below a legible media size) |

Gap is `--grid-gap`, which steps with the breakpoint, so it is always ≥ `--focus-ring-clearance` — that is what lets the card body keep `overflow: hidden` without clipping focus (2.4.11).

**Image ratio.** 1:1, read off the Figma card (152px wide, 150px media) rather than snapped to a familiar ratio.

**Token usage.** 7.6's list, plus `--grid-gap` `--surface-sunken` `--sp-2` `--bp-md` `--bp-lg` (as mirrored media-query values).

**A11y notes.** `imageAlt` is required because these images carry meaning — they are how a pre-literate or low-literacy user tells the options apart — so `alt=""` must not be reachable through the API. The check is `aria-hidden`; the input's checked state is what is announced.

**What it is NOT.** Not a gallery, not a card grid with links, not a multi-select.

---

## 7.8 Process Visualisation `[OPEN]`

**Purpose.** Show the four stages of a Musy session, in order, without inviting a tap.

**Semantic HTML.** No APG pattern exists — it is not a widget, not navigation, not a progress indicator, so base-ui has no primitive for the whole. `<ol>` with one `<li>` per step, because the order *is* the content. The divider rule is base-ui `Separator`, the one part base-ui does own: it renders the correct role and orientation, which is easy to get wrong by hand. Each step's title is a real heading (`<h3>` by default) so the steps appear in the document outline.

**Anatomy.**
```
ProcessVisualisation
└── ol.musy-process  [aria-label]
    ├── li.musy-process__step                      ×4
    │   ├── span.musy-process__badge → Icon (lg)
    │   └── span.musy-process__text
    │       ├── span.musy-process__ordinal   "Schritt 1"
    │       ├── h3.musy-process__title
    │       └── p.musy-process__body
    └── li.musy-process__divider  [aria-hidden]    ×3, between steps
        ├── span.musy-process__divider-line
        └── Icon ArrowDown
```

**Props.**

| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — |
| `steps` | `ProcessStep[]` | — |
| `showOrdinals` | `boolean` | `true` |
| `ordinalPrefix` | `string` | `'Schritt'` |
| `titleStep` / `bodyStep` | `TypeStep` | `'heading-sm'` / `'body-md'` |

**State matrix.** **None, and this is deliberate.** The component is not interactive, so default is the only state: no hover, no active, no focus (nothing is focusable), no disabled, no loading, no error. It also has no "current step" state — that would make it a progress indicator, which is a different component with different semantics (`aria-current`).

**Responsive behaviour.** Vertical at every breakpoint. The brief specifies vertical stepping with arrow dividers and no carousel; a horizontal variant at `--bp-lg` would need a different divider and is not built. Titles take `--measure-heading`, bodies `--measure-body`, so the run length stays readable as the container widens.

**Token usage.** `--space-gap-stack` `--sp-1` `--sp-5` `--target-primary` `--radius-full` `--border-width-regular` `--border-width-thick` `--border-style-solid` `--interactive-primary-subtle` `--interactive-primary-border` `--interactive-primary-on-subtle` `--border-strong` `--on-surface` `--on-surface-muted` `--icon-size-lg` `--icon-size-md` `--type-label-md-*` `--type-heading-sm-*` `--type-body-md-*` `--measure-heading` `--measure-body` `--text-wrap-heading` `--text-wrap-body` `--text-hyphens`

**A11y notes.** The arrows are `aria-hidden` with `role="presentation"`: the `<ol>` already conveys sequence and position, so announcing an arrow between every step is pure noise. The visible ordinal ("Schritt 1") is kept on by default because in the group setting it is what someone points at while reading aloud — it is redundant for AT and load-bearing for humans.

**What it is NOT.** Not a stepper, not a wizard, not a progress bar, not a carousel. Nothing here tracks where the user currently is.

---

## 7.9 Content Box `[OPEN]` · PROVISIONAL (G2)

**Purpose.** A titled container for arbitrary content.

**Semantic HTML.** No APG pattern, and base-ui has no card primitive — a card has no behaviour to own. `<article>` with a real heading, so the box appears in the outline as a unit rather than as an anonymous div stack. Built on base-ui `useRender`, so it takes the same `render` composition prop as the rest of the set.

**Anatomy.**
```
ContentBox
└── article.musy-box[--dashed|--sunken|--plain]
    ├── h2–h6.musy-box__headline  [data-type-step]
    ├── p.musy-box__text          [data-type-step]
    └── div.musy-box__slot        (children)

ContentBox, framed  (header prop present)
└── article.musy-box.musy-box--framed
    ├── div.musy-box__header      headline + text + header content
    │                             ── full-bleed hairline ──
    └── div.musy-box__body
        └── div.musy-box__slot    (children)
```

**Props.**

| Prop | Type | Default |
|---|---|---|
| `headline` | `string` | — |
| `headlineHidden` | `boolean` | `false` |
| `headingLevel` | `2 \| 3 \| 4 \| 5 \| 6` | `3` |
| `headlineStep` | `TypeStep` | `'heading-sm'` |
| `text` / `textStep` | `string` / `TypeStep` | — / `'body-md'` |
| `outline` | `'solid' \| 'dashed' \| 'sunken' \| 'plain'` | `'solid'` |
| `header` | `ReactNode` | — (present ⇒ framed) |
| `children` | `ReactNode` | — |

**`headlineHidden` — hidden, never absent.** A card that shows its content alone still needs the heading: it is what puts the box in the document outline, which is the documented reason this is an `<article>`. `headlineHidden` moves it to `.musy-sr-only` and drops its type step; it stays in the outline and in the accessible name. Mirrors Switch's `labelHidden`. Added in the Layer 3 pass — without it the only route left was a screen copying `.musy-sr-only`'s declarations into its own CSS, which [L14](10-layout.md) forbids. See [12 · Component gaps](12-component-gaps.md) §2 and [L8](10-layout.md).

**Framed — the one decision worth recording.** Passing `header` splits the card into a header and a body divided by a hairline that **spans the full width**, while everything else stays inset. A line that stops at the padding reads as a rule belonging to the text above it; a line that meets both edges reads as the card being in two parts, which is the entire point of the variant. So the card gives up its own padding and the two regions take it — the same result as a negative-margin line, without a value that has to be kept in step with the inset. `overflow: clip` keeps the divider inside the card radius. In the reference flow this is the Method shell: the method name and the 7.17 stepper above the line, the live step below, and the step panel drops its own boundary because two outlines one inset apart read as a rendering error rather than depth.

Both type steps take **any** of Layer 1's ten steps (§4.3), applied through the `[data-type-step]` utilities in the stylesheet — the box does not hardcode a heading/body pair. The heading *level* is also a prop, because the correct level depends on where the box sits, which the box cannot know (1.3.1).

**Review changes.** Three, all from the same read of the specimens:

- The solid edge went from `--border-width-hairline` to `--border-width-regular`. A 1px edge on `surface-raised` was doing less work than the fill; 1.5px is the width Layer 1 already reserves for a boundary that has to be seen.
- `outline="raised"` (elevation-1) was **removed**. Beside an outlined box it read as a second, competing boundary, and it duplicated what the outline already said. Depth stays with `sunken`, which changes the surface rather than adding an edge.
- The dashed edge steps to `--border-width-thick` for an airier dash. The dash *gap* is not independently settable in CSS — every engine derives dash and gap from the border width — so a wider gap has to come from the width. A real dash-length / dash-gap pair would be a Layer 1 addition (logged as **G2b** beside G2), not a local invention.

**State matrix.** Not interactive — no states. If a box needs to be clickable, the *consumer* puts a link or button inside it; making the whole `<article>` a click target would swallow the nested action.

**Responsive behaviour.** No breakpoint changes of its own. `--space-inset-card` (24px) is constant; the measures cap the line length as the container grows.

**Token usage.** `--space-inset-card` `--space-gap-related` `--space-gap-stack` `--radius-card` `--border-width-regular` `--border-width-thick` `--border-style-solid` `--border-style-dashed` *(G2)* `--border-subtle` `--border-strong` `--surface-raised` `--surface-sunken` `--on-surface` `--on-surface-muted` `--measure-heading` `--measure-body` `--text-wrap-heading` `--text-wrap-body` `--text-hyphens` + any `--type-*` step passed as a prop

**A11y notes.** The dashed variant reads as "provisional / awaiting content" and is never permitted on an interactive boundary: dashing lowers the perceived stroke, so a dashed control edge would undercut the 3:1 the solid boundary was solved for (1.4.11).

**What it is NOT.** Not a Message (that is 7.10, tighter padding and a status role), not a clickable card, not a dialog.

---

## 7.10 Message `[SEED]`

**Purpose.** Tell the user one thing about the state of the system, inline.

**Semantic HTML.** No APG pattern for the container, and base-ui's `Toast` is a *different* pattern (portaled, queued, auto-dismissing) — so the container stays semantic HTML: a `<div>` carrying an ARIA live region when the message is injected, or no live region at all when it is present at load. The one interactive part, the dismiss control, is base-ui `Button`.

**Anatomy.**
```
Message
└── div.musy-msg.musy-msg--<variant>  [role?] [aria-live?] [data-entering?]
    ├── span.musy-msg__icon → Icon
    ├── div.musy-msg__main
    │   ├── h3.musy-msg__headline
    │   │   └── span.musy-sr-only  "Fehler: "        ← the status WORD
    │   ├── p.musy-msg__text
    │   └── div.musy-msg__action   (exactly one button)
    └── button.musy-msg__dismiss → Icon X    (optional)
```

**Props.**

| Prop | Type | Default |
|---|---|---|
| `variant` | `'info' \| 'warning' \| 'success' \| 'error'` | — |
| `headline` | `string` | — |
| `headlineStep` / `headingLevel` | `TypeStep` / `2–6` | `'heading-sm'` / `3` |
| `text` / `textStep` | `string` / `TypeStep` | — / `'body-md'` |
| `action` | `ReactNode` | — (exactly one; two actions means this is a dialog) |
| `onDismiss` | `() => void` | — (presence renders the dismiss button) |
| `live` | `'off' \| 'polite' \| 'assertive'` | `'off'` |
| `entering` | `boolean` | `false` |

**State matrix.**

| State | What changes |
|---|---|
| default | `--feedback-<variant>-surface` + `-border` + `-icon` + `-text` |
| hover / active | Only on the dismiss button and the action button — the message itself is not interactive |
| focus-visible | `--focus-ring` on dismiss and on the action |
| disabled | N/A. A message cannot be disabled; if its action can, that is the button's state |
| loading | N/A at container level; the action button carries it |
| error | `variant="error"` **is** the error state |
| empty | N/A. A message with no headline should not render |

**Responsive behaviour.** Three-column grid (icon / main / dismiss) at every breakpoint. The dismiss button sits in its own column so it never reflows the text. Padding is `--space-inset-control`, not `--space-inset-card` (brief §5.10) — it is embedded, so it reads as part of its host.

**Token usage.** `--space-inset-control` `--space-gap-related` `--sp-1` `--sp-2` `--radius-card` `--radius-full` `--border-width-regular` `--border-style-solid` all sixteen `--feedback-*` tokens `--interactive-ghost-hover` `--interactive-ghost-active` `--target-primary` `--focus-ring` `--motion-enter` `--motion-travel-sm` `--icon-size-md` `--measure-body` `--text-wrap-heading` `--text-wrap-body` `--text-hyphens` + type steps

**A11y notes.** Four cues per variant: surface, border, icon **and** a visually-hidden status word ("Fehler: ", "Warnung: "…) prefixed to the headline. The word is what makes the variant survive for a screen-reader user *and* for anyone who cannot separate the hues — Layer 1's conflict B7 notes error and warning are only 15° and 22° from the brand hues, so the word is not decoration.

`live` is **explicit and defaults to `'off'`**, deliberately against the brief's suggestion that error should default to `role="alert"`. The brief's own caveat is the reason: a statically rendered `role="alert"` announces on every page load, which trains users to ignore alerts. `RadioGroupText` and `RadioGroupImage` pass `live="assertive"` themselves, because *there* the message is provably dynamic. Whether any error renders statically in markup is open question 16.

The dismiss button is 44px with a negative margin, so it meets 2.5.8 without adding padding to the message.

**What it is NOT.** Not a toast (no auto-dismiss, no portal, no `--z-toast`), not a dialog, not a banner spanning the viewport, and not a container for two actions.

---

## 7.11 Content List `[SEED]`

**Purpose.** A run of label + content pairs — session details, method summaries.

**Semantic HTML.** No APG pattern, and base-ui has no description-list primitive. `<dl>`: each row is a de-emphasised term and its content, which is the definition of a description list. Not a `<ul>` (the pairing would be lost) and not a `<table>` (one value column, so nothing to cross-reference). Row rules are base-ui `Separator` rather than a CSS border, so the rule carries a real role instead of being invisible to AT by accident.

**Anatomy.**
```
ContentList
└── dl.musy-clist  [aria-label]
    └── div.musy-clist__row                    ×n
        ├── dt.musy-clist__term       (body-sm, on-surface-muted)
        └── dd.musy-clist__def        [data-type-step]
            ├── div.musy-clist__media  (optional: img or a node)
            ├── content
            └── ul.musy-clist__bullets | ol.musy-clist__numbers  (optional)
```

**Props.**

| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — |
| `items` | `ContentListItem[]` | — |
| `contentStep` | `TypeStep` | `'body-md'` |
| `emptyLabel` | `string` | `'Noch keine Einträge'` |

`media` is either `{ src, alt }` — `alt` required — or `{ node }` for an already-composed element.

`list: { ordered?, items }` renders the row's content as a real `<ul>` or
`<ol>`, after `content` — so a row can carry a lead-in line and then a list.
Ordered is for rows where the **sequence is the meaning** (the four session
sections); an unordered set of facts is a bullet list. The markers are drawn by
the list itself, which is why the items are `display: block` rather than a flex
or grid stack: a flex item is no longer `display: list-item` and silently loses
its marker.

**State matrix.** Not interactive — no states. `empty` is the one non-default state: `items: []` renders `emptyLabel` as a paragraph instead of an empty `<dl>`.

**Responsive behaviour.** Stacked below `--bp-lg`; from 1024px the term moves beside its content in a two-column grid, which is how a description list is meant to read when there is room. The switch used to happen at `--bp-md`, and was moved a breakpoint later in review: at 768px a German label plus a 12rem term column left the content squeezed beside a wrapped two-line term, so the stacked form — where the term reads as that row's headline — now holds for longer. Rows are separated by a `--border-subtle` hairline, dropped on the last row.

**Token usage.** `--space-gap-stack` `--space-gap-related` `--sp-1` `--radius-input` `--border-width-hairline` `--border-style-solid` `--border-subtle` `--surface-sunken` `--on-surface` `--on-surface-muted` `--type-body-sm-*` `--measure-body` `--text-wrap-body` `--text-hyphens` `--sp-5` `--bp-lg` (mirrored)

**A11y notes.** The `dt`/`dd` pairs are wrapped in a `<div>` — valid in HTML5 and the only way to grid each row without breaking the list semantics. Media `alt` is required for the same reason as 7.7: these images sit next to meaning-bearing labels. Per-item "animation" follows Decision 1 — static by default; an animated node must already be gated by the consuming app.

**What it is NOT.** Not a table, not a settings list (rows are not interactive), not a feed. A bullet or numbered row is still a description-list row: if there is no label, the consumer wants a plain list, not this component.

---

## 7.13 Radio Cards `[SEED]`

**Purpose.** Choose one of several things the user has to *read* to choose between — an exercise, a method, a session length with a caveat attached.

**APG pattern.** [Radio Group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) — base-ui `RadioGroup` + `Radio` + `Fieldset`, the same primitives and the same selection semantics as 7.7.

**Why a third radio component.** Not a variant of 7.7, and not an option on 7.6, because the content differs in kind and that inverts the column table. A 7.7 card carries a two-word label, which survives two-up at 393px, so it goes 2&#8202;/&#8202;3&#8202;/&#8202;4. A card carrying a headline, two lines of German body and a meta label does not survive two-up at 393px at any type size that is still readable — so this one is a **list** on mobile (media beside the text), two-up from `--bp-md`, three-up from `--bp-lg`. Merging them would force one of the two tables to lose. Anatomy comes from Content Box (7.9); selection comes from 7.7; neither is re-invented.

**Anatomy.**
```
RadioCards
└── Fieldset.Root.musy-radio-group  (render=RadioGroup)
    ├── Fieldset.Legend.musy-radio-group__legend
    ├── p.musy-radio-group__hint                        (optional)
    └── div.musy-rcard-group[--accent-placeholder1|2]
        └── Radio.Root.musy-rcard__body                 ×n   [data-checked|unchecked|disabled]
            ├── span.musy-rcard__media
            │   ├── img            (alt REQUIRED per item)
            │   └── span.musy-rcard__check → Radio.Indicator → Icon Check
            └── span.musy-rcard__text
                ├── h2–h6.musy-rcard__headline   [data-type-step]
                ├── p.musy-rcard__desc           [data-type-step]
                ├── span.musy-rcard__facts       (optional conditions)
                │   └── span.musy-rcard__fact.musy-tip  ×n
                │       ├── Icon sm  +  optional figure
                │       ├── span.musy-sr-only    the full sentence
                │       └── span.musy-tip__bubble        §7.24 Hint
                └── span.musy-rcard__label       (optional meta)

    dl.musy-rcard-legend                         (one per group, after it)
    └── div.musy-rcard-legend__item ×n  →  dt Icon · dd one word
```

**Props.**

| Prop | Type | Default |
|---|---|---|
| `name` / `legend` | `string` | — (both required) |
| `hint` | `string` | — |
| `options` | `RadioCardOptionRich[]` | — |
| `value` / `onValueChange` | `string` / `(v: string) => void` | — |
| `accent` | `'primary' \| 'accent-placeholder1' \| 'accent-placeholder2'` | `'primary'` |
| `headingLevel` | `2–6` | `3` |
| `headlineStep` / `descriptionStep` | `TypeStep` | `'heading-sm'` / `'body-md'` |
| `error` / `emptyLabel` | `string` | — / `'Keine Optionen verfügbar'` |

Each option is `{ value, headline, description, label?, image, imageAlt, disabled? }`. `description` is one or two lines — longer than that and this is a Content Box with its own screen, not an option in a chooser. `label` is the meta line: last in the DOM, last in the reading order, de-emphasised, because it *qualifies* the card rather than naming it.

**State matrix.**

| State | What changes |
|---|---|
| default | `--surface-raised`, `--border-strong` at `--border-width-regular`, empty check |
| hover | `--interactive-ghost-hover` (unselected only, `(hover: hover)` gated) |
| active | `--interactive-ghost-active` |
| focus-visible | `--focus-ring` on the card — the card *is* the control |
| selected | `--interactive-primary-subtle` fill **+** border to `--border-width-thick` **+** filled check **+** headline to `-on-subtle` |
| disabled | `--interactive-primary-disabled`, `--border-subtle`, all three text roles to `--on-surface-disabled`, media to 50% |
| error | `aria-invalid` per card, `data-invalid` on the fieldset, Message below |
| empty | `emptyLabel` spanning the grid |

**Facts, and where the card's weight sits.** Headline and description read from the **top**; the conditions — how long it takes, what it needs — sit at the **bottom** of the text column with the meta label, so a column of cards compares like with like along one horizontal line. The conditions render as glyphs (`--icon-size-sm`): a timer with the range from `timeframeMin`/`timeframeMax`, `gallery-horizontal-end` for a deck, `headphones` for sound. **[OPEN · G1b]** the deck fact wants a *fan* of cards and Lucide ships none; `gallery-horizontal-end` is the closest shipped glyph and is used as extracted, because inventing a glyph inline would break §7.1's [LOCKED] contract — if the set ever gains a fan, this is the one place to swap. Three glyphs are read in the time "ca. 20 Minuten · Kopfhörer" takes to parse. **No fact is ever carried by its glyph alone** — each one renders its full sentence as visually-hidden text and repeats it in a §7.24 Hint on hover, and a `dl.musy-rcard-legend` under the group names every glyph in one word for everyone else. The legend is a description list because that is the actual relationship: glyph is the term, meaning is the definition.

**Responsive behaviour — one anatomy at every width.** The card is a **list row** everywhere: media beside text. It used to stack into a full-bleed 16:9 image above the text from `--bp-md` worth of group width; that is gone, because what the user is comparing is the *text*, and a row lets the eye run down a column of names and descriptions instead of hopping over an image on every item. Width buys a bigger picture, not a different shape: below `--bp-md` the thumbnail is a `--target-guided` square (derived from the touch scale, so it steps with it rather than drifting); once the **card itself** is 480px wide the media column steps to `calc(--target-guided * 3)` and stretches full-bleed to the card's full height against the leading edge. Width is always the definite value and height follows the row — never the reverse: deriving the width from a stretched height is cyclic (the height comes from the text column the media just narrowed) and resolves by inflating the row. The grid follows from that: the column floor is the **row's** floor, `--musy-rcard-row-min` (480px), so a group goes one-up until it can hold two full-width rows and never three-up — a 259px card runs its description at ~15 characters a line and hyphenates mid-word, which is what the old 196px stacked-card floor allowed. The switch is a container query on the **group** — an element cannot be styled by its own container query, so the card cannot be its own ruler; with the 480px row floor the two agree anyway. The square comes from the row: the card takes a `min-block-size` equal to the media column's width, so a short description still yields a square rather than a letterbox, and a long one makes the media taller, never narrower.

**Token usage.** `--grid-gap` `--space-inset-card` `--space-gap-stack` `--space-gap-related` `--sp-1` `--sp-2` `--target-guided` `--radius-card` `--radius-input` `--radius-full` `--icon-size-lg` `--border-width-regular` `--border-width-thick` `--border-style-solid` `--border-strong` `--border-subtle` `--surface-raised` `--surface-sunken` `--interactive-primary` `-subtle` `-border` `-on` `-on-subtle` `-disabled` `--interactive-ghost-hover` `-active` both `--interactive-accent-placeholder{1,2}` families `--on-surface` `--on-surface-muted` `--on-surface-disabled` `--focus-ring` `--motion-toggle` `--type-label-md-*` `--text-wrap-heading` `--text-wrap-body` `--text-hyphens` `--bp-md` `--bp-lg` (mirrored)

**A11y notes.** Selection carries four cues — fill, border weight, check glyph, headline colour — so it survives `prefers-contrast: more` and greyscale with no special case (1.4.1). The headline is a real heading at a level the consumer passes, because the correct level depends on where the group sits (1.3.1). `imageAlt` is required per item for the same reason as 7.7. No nested interactive element: a radio containing a link is unreachable by keyboard in a predictable order and ambiguous to voice control.

**What it is NOT.** Not a link grid (that is a list of `<a>`s and needs no selection state), not a multi-select (that is a checkbox group), not Radio Group image (7.7 — short labels, denser columns).

---

## 7.14 Lightbox `[SEED]`

**Purpose.** Bring one thing forward, over the screen it came from.

**APG pattern.** [Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) — base-ui `Dialog`.

**What base-ui owns, and why that matters.** Focus is moved into the popup on open and **restored to the trigger** on close; the background is made inert; page scroll is locked; Escape closes; the popup is portaled, so no ancestor's `overflow` can clip it. Every one of those is invisible when it works and a hard failure when it does not (2.1.2, 2.4.3), and none of it is re-implemented here. This component owns the *frame*: scrim, position, motion, close control.

**Anatomy.**
```
Lightbox
├── Dialog.Trigger  (render = the consumer's own button)
└── Dialog.Portal
    ├── Dialog.Backdrop.musy-lightbox__backdrop        [data-closed]
    └── div.musy-lightbox__positioner
        └── Dialog.Popup.musy-lightbox__popup          [data-closed]
            ├── Dialog.Title.musy-lightbox__headline   (or .musy-sr-only)
            ├── Dialog.Description.musy-sr-only        (optional)
            ├── children            ← the framed content; a ContentBox is the reference case
            └── Dialog.Close.musy-lightbox__close → Icon X
```

**Props.**

| Prop | Type | Default |
|---|---|---|
| `trigger` | `ReactElement` | — (required) |
| `title` | `string` | — (required) |
| `titleHidden` | `boolean` | `false` |
| `description` | `string` | — |
| `children` | `ReactNode` | — |
| `open` / `onOpenChange` | `boolean` / `(open: boolean) => void` | — (uncontrolled by default) |
| `closeLabel` | `string` | `'Schließen'` |
| `mandatory` | `boolean` | `false` |

`title` is required by the type: a modal with no accessible name announces as "dialog" and leaves a screen-reader user with no idea what came forward (4.1.2). When the framed content already shows the title, pass the same string with `titleHidden` rather than dropping it.

**State matrix.** Two states, and they are base-ui's: open and closed. `[data-closed]` runs the enter animation in reverse at `--motion-exit`, so the exit is faster than the entrance without a second keyframe set. No hover, active or disabled — a container has none; its trigger and its contents have their own.

**Responsive behaviour.** Centred at every breakpoint, with `--sp-4` of inset — at 393px a centred popup with no inset touches both edges and the scrim stops reading as a scrim. `max-width: --measure-body`, and `max-height: 100dvh - inset` with internal scroll, so the close button can never be pushed off-screen. `dvh`, not `vh`: the mobile URL bar would otherwise crop it.

**Token usage.** `--alpha-scrim` `--z-overlay` `--z-sheet` `--space-inset-card` `--sp-2` `--sp-4` `--target-primary` `--radius-panel` `--radius-full` `--border-width-regular` `--border-style-solid` `--border-subtle` `--surface-overlay` `--elevation-3` `--on-surface` `--interactive-ghost-hover` `-active` `--measure-body` `--motion-enter` `--motion-exit` `--motion-toggle` `--motion-travel-md` `--focus-ring`

**A11y notes.** Travel comes from `--motion-travel-md`, so reduced motion flattens the entrance to a plain fade rather than the popup jumping. `mandatory` removes the close button *and* click-outside — it exists for a lightbox blocking on a decision the framed content itself resolves, and using it anywhere else builds a keyboard trap. The framed box drops its own border inside the popup: two nested outlines at the same radius read as a rendering error, not as depth.

**What it is NOT.** Not a confirm dialog (that needs a mandatory action row and a destructive-action rule — a separate component), not a Message (7.10 is inline and does not interrupt), not a bottom sheet, not a tooltip.

---

## 7.23 Toast `[SEED]`

**Purpose.** Confirm an action that has already happened and offer the one way to reverse it, without moving the content the user is looking at.

**base-ui.** `Button` for the dismiss only. base-ui's own `Toast` is a different pattern — portaled, queued, auto-dismissing — and that is deliberately not this.

| Use it when | Use 7.10 Message instead when |
| --- | --- |
| The action is done, the confirmation is transient, and the user's attention is elsewhere on the page | The message is about the thing next to it and should stay until it is resolved |

**Why it is not Message, and it is not a styling difference.** 7.10's own source says so. A Message is part of the flow and **pushes layout when it appears**, which is exactly wrong for a confirmation that arrives while the user is reading something else.

**Why it belongs in the system.** Layer 1 already ships `--z-toast`, ranked *above* `--z-sheet`, with the stated reason that "a session saved confirmation must be visible over an open sheet". That was a layer with no consumer in the released set. This is its first.

**Anatomy.**
```
Toast
└── div.musy-toast   [role=status] [aria-live=polite]
    ├── p.musy-toast__text          body-sm
    ├── CtaButton variant="ghost"   the single reversal
    └── Button.musy-toast__dismiss  base-ui Button + Icon X
```

**Props.**

| Prop | Type | Default | Note |
|---|---|---|---|
| `label` | `string \| null` | — | `null` renders nothing, so the consumer's own state is the visibility |
| `action` | `{ label: string; onAction: () => void }` | — | Exactly one. Two actions means this is a dialog |
| `onDismiss` | `() => void` | — | |
| `live` | `'polite' \| 'off'` | `'polite'` | |
| `dismissLabel` | `string` | `'Meldung schließen'` | |

**State matrix.** Two states: absent, and present. There is deliberately no enter/exit state to manage — `label` going null removes it.

**Placement and tokens.** `position: fixed`, `z-index: var(--z-toast)`, `inset-block-end: var(--space-gap-group)`, centred with `inset-inline: var(--space-gap-stack)` + `margin-inline: auto` + `width: fit-content` — centred without the component knowing its own width — capped at `--measure-heading`. `--space-inset-control` inside, `--space-gap-stack` between its three parts, `--radius-card`, `--surface-overlay` on `--elevation-3`, `--border-width-regular` of `--border-subtle`.

**Elevation 3, not 2.** It outranks a sheet, so it must not read as a lifted card sitting *under* one.

**`role="status"`, never `role="alert"`.** An undo offer is not urgent, and assertive cuts across whatever the screen reader is already saying.

**One at a time, and it replaces.** A second toast while one is up replaces it. No queue, no stacking, no collapsing into "2 items deleted". The undo model this serves is *undo the last thing*, which is exactly what a single toast says — and two stacked toasts on a 393px screen cover the control the user was aiming at. The consequence, stated so it is a choice rather than a surprise: an earlier action's undo offer leaves the screen while its own window is still open, and is recoverable only until that window lapses.

**Dismissal is the consumer's.** The component holds **no timer**. Whatever owns the undo window already has one, and a second timer can only disagree with it — the same split 7.19 and 7.22 make with the recorder.

**Entrance** from `--motion-duration-base` / `--motion-ease-entrance`, travelling `--motion-travel-sm`, so reduced motion flattens it with no query in the component.

**Responsive behaviour.** None of its own beyond the `--measure-heading` cap and the `--space-gap-stack` inline inset, which together keep it clear of both edges at 393px.

**Degradation order — the text gives, never the controls, and it wraps.** At the `--measure-heading` cap the three parts cannot sit side by side at all: the **rigid** ones alone — a ~150px ghost action, a 44px dismiss, two `--space-gap-stack` gaps and the `--space-inset-control` inset — sum to about 274px against a 262px cap, before the text gets any width. So the toast **wraps**: text on its own row, controls beneath it and right-aligned ([L6](10-layout.md)); with room for all three it stays one row, from the same rule, with no width hardcoded to decide which. The text is `flex: 1 1 calc(--measure-heading / 2)` with a matching `min-inline-size` — a 13ch floor, arithmetic over a token rather than a picked number — and the action and dismiss are `flex: 0 0 auto`, so the dismiss keeps its full `--target-primary`.

Two earlier builds of this section got it wrong in instructive ways, both worth keeping on the record. The first let the deficit land on the **dismiss**, which shrank to 20px — under the `--target-min` floor, so 2.5.8 failed — and drew outside the toast's own background, since there is no overflow clip here. The second gave the text `min-inline-size: 0`, which moved the failure onto the label: it collapsed to 1px and painted across the action. That second failure is also a **note for [L15](10-layout.md)**: `min-inline-size: 0` makes a squeeze invisible to the `scrollWidth` vs `clientWidth` check, which reported 259/259 "fits" on a visibly broken layout. The floor is what makes the overflow observable, by turning a collapse into a wrap.

**A11y notes.** Dismiss follows 7.10's precedent exactly — a bare base-ui `Button` dressed by `.musy-toast__dismiss`, not an Icon Button — so the two dismiss affordances in the system cannot drift apart, and no tooltip appears under a thumb. The action's label is its accessible name; do not add a second.

**What it is NOT.** Not a Message (that is in-flow), not a dialog (one action, never two), not a queue, and not a notification centre.

**Spec and reasoning.** [11 · Toast](11-toast.md). Placement is [L11](10-layout.md)'s feedback table.

---

## 7.24 Draggable List `[SEED]`

> **Boundaries were lightened in review.** The resting and selected edges now take the element's own background — present in the box model, invisible in the picture — and the width no longer steps on selection. The tinted fill and the check glyph still carry the state; the edge no longer does. `prefers-contrast: more` restores both. See **conflict B25** and open question 35.

**Purpose.** A list of short pieces of user content that the user rearranges, merges, corrects and removes. **The list *is* the editing surface**: no separate edit mode, no toolbar, and nothing opens in a dialog.

| Use it when | Use 7.12 Content List instead when |
| --- | --- |
| The order is the user's, and they change it by dragging | The order is fixed and the rows are read, not manipulated |
| Each row can be corrected, merged or deleted in place | Rows are label-and-value pairs |

**No new primitives.** Content Box, Icon Button, CTA Button, Toast and an `<ol>`, arranged per [10 · Layout](10-layout.md) L3, L4, L5, L6, L9 and L13. What makes it a component rather than a composition is the **state machine**: twelve states, three pairs of them mutually exclusive in a way that is easy to get wrong by hand.

**Where it came from.** The transcript workspace, where speech arrives as a sequence of statements and the user tidies them afterwards. Every state below is one that flow actually produces.

**Anatomy.**
```
DraggableList
├── ContentBox outline="dashed"           empty · waiting · hearing — ONE box, three states
└── ol.musy-dlist__list                                             L3 — a real list
    └── li                          per item
        ├── div.musy-dlist__drop    [before]                        L9 — absorbs the list gap
        ├── ContentBox              headlineHidden                  L8 — heading present, invisible
        │   ├── div.musy-dlist__row         flow-root, relative
        │   │   ├── p.musy-dlist__text      ::before floats the spacer   L4
        │   │   └── div.musy-dlist__tools   absolute, inline-end
        │   │       ├── IconButton  GripVertical · drag
        │   │       └── IconButton  ChevronDown  · aria-expanded, aria-controls
        │   └── div.musy-dlist__actions--end   [id = aria-controls]      L6
        │       ├── CtaButton ghost Trash2  Delete
        │       └── CtaButton ghost Pencil  Edit
        └── div.musy-dlist__drop    [after]
```

**Editing replaces the row's content, not the row.** The Content Box stays; its interior swaps for Field's parts and an action row.

**Props.**

| Prop | Type | Note |
|---|---|---|
| `items` | `{ id: string; text: string }[]` | `id` is **required**: reordering must survive re-render, and an index cannot |
| `editable` | `boolean` | False while the source is still producing items |
| `onEdit` | `(id, text) => void` | |
| `onCombine` | `(sourceId, targetId, order) => void` | `order` is `'sourceFirst' \| 'targetFirst'` |
| `onMove` | `(sourceId, targetId, position) => void` | `position` is `'before' \| 'after'` |
| `onDelete` | `(id) => void` | |
| `pending` | `boolean` | Shows the waiting box |
| `partial` | `string` | Shows the hearing box |
| `emptyHeadline` / `emptyText` | `string` | The empty state's copy; the headline is hidden but still in the outline |
| `listeningLabel` / `hearingLabel` | `string` | The waiting and hearing states' copy |
| `headingLevel` | `2–6` | Pass it — the box cannot know where it sits (1.3.1) |
| `itemNoun` / `label` | `string` | `'statement'` / `'Transcript'` |

### The state matrix

**List.**

| State | Trigger | Treatment |
|---|---|---|
| **Empty** | No items, nothing in flight | `ContentBox outline="dashed"` on `--surface-sunken`, headline **hidden**, one line of italic `body-sm` naming what will appear |
| **Waiting** | Capture heard something, no content back yet | The *same* box, three pulsing dots (L10) |
| **Hearing** | Partial content arriving | The same box, carrying the partial text |
| **Populated, read-only** | Capture is running | Items render with **no controls** — nothing is editable mid-capture |
| **Populated, editable** | Capture stopped | Controls appear on every item |

Empty, waiting and hearing are one box in three states **on purpose**: the page does not change shape when content starts arriving.

**The placeholder shell.** Dashed edge — the system's own reading of *provisional / awaiting content* (G2) — on `--surface-sunken`, which is Layer 1's reading of the same idea in a fill; the two agree, and sunken is right because this box is a hole waiting to be filled rather than a card. The headline is **hidden in all three states** via §7.9's `headlineHidden`: it is what puts the box in the outline, so it is hidden and never removed, and hiding it in all three is itself part of not changing shape between them. What is left is one line of italic `body-sm` — the box is describing its own emptiness, not announcing a section, and a heading-sized sentence made an absence look like a feature.

**Item.**

| State | Trigger | Treatment |
|---|---|---|
| **Rest** | editable, nothing open | Text, drag handle, chevron |
| **Actions open** | `menuOpen` | Chevron rotates 180°, Delete and Edit disclosed. **One item at a time** |
| **Editing, clean** | Edit pressed | Field's parts; Save `secondary` **and disabled** |
| **Editing, dirty** | Text differs from the original and is not blank | Save turns `primary`; Discard stays `secondary` |
| **Dragging** | Lifted | Stays in place at `opacity: 0.4` — the list must not reflow, or the rects measured at drag start go stale |
| **Merge target** | Another item over its middle half | Accent-2 `-subtle` fill, `-border` boundary |
| **Drop before / after** | Another item over its top or bottom quarter | `.musy-dlist__drop` above or below (L9) |

**Three pairs are mutually exclusive, and the component owns that.** An item cannot be editing *and* open, editing *and* draggable, or a merge target *and* a drop target. Controls disappear while editing; `dropMode` is one value, never two.

**Hit zones for the drag.** Outer quarters reorder, middle half merges. That ratio is the component's, not the consumer's.

**The hint under the finger carries both halves of the gesture** — *which* item is moving, and *what releasing would do* ("Merge into 2", "Insert before 3"). The second half is the one that is easy to leave out and the one that matters: a reorder and a merge are the same picture until the release, and the drop indicator sits at the **target** while the eye is at the **finger**. The action line takes the same accent as the indicator and the merge fill, so the hint and the target read as one answer. Wording comes from `dropHints`, and the same sentence feeds the live region, so the keyboard path announces what the pointer path shows.

**Responsive and content.**

| State | Trigger | Treatment |
|---|---|---|
| **Fine pointer** | `pointer: fine` | Controls at `--target-min` (L5) |
| **Coarse pointer** | `pointer: coarse` | Controls at `--target-primary`; the item needs a short hold before it drags, so the page can still scroll (L13) |
| **Any item, by default** | — | `body-sm`. One size for every item in the list, whatever its length |
| **Short item, `dense`** | ≤ 80 characters | `body-sm` (L8's exception as stated, opt-in) |
| **Long item, `dense`** | > 80 characters | `body-md`, and the text wraps around the controls then runs full width |

**Feedback.**

| State | Trigger | Treatment |
|---|---|---|
| **Undo offered** | After a merge or a delete | [Toast](11-toast.md) — one at a time, and it replaces |
| **Recoverable problem** | One item failed | `Message variant="warning"`, `live="polite"` |
| **Fatal problem** | The source stopped | `Message variant="error"`, `live="assertive"` |

**One type step by default, and it is `body-sm`.** L8 grants a dense-list exception — ≤ 80 characters may drop to `body-sm` — and §7.24's spec inherits it. Applied *per item*, as L8 states it, it has a cost the reference screen never hit: merging two short items crosses the threshold, so text the user has just combined **gets bigger**, and a size change on content that did not change reads as a defect. So `dense` defaults to `false`, and every item takes the exception's size **unconditionally**: one size, and a merge changes the text and nothing else.

That puts every item at 15px, below Layer 1 §4's 17px floor, which §4 permits only outside essential prose. **The justification is the one L8 already makes** — these are items in a scannable list, which is the case the exception exists for; what changes is that the size no longer tracks length. Logged as conflict B23, and it bears on open question 28.

**Combining is direction-aware, and direction comes from list position, not from the gesture.** Dragging an item down prepends its text; dragging up appends it. Either way the merged text reads in the order the items appear **on screen**, which is what the user is looking at. Deriving it from the gesture is the obvious implementation and is wrong on a slow drag that crosses back over itself.

**Undo is the consumer's.** The component reports the change; whoever owns the data owns the snapshot and the window. Same split as 7.19, 7.22 and 7.23.

**The editor composes on Field's parts, and that is now a choice.** `.musy-field__*` rather than the Field component — the system's own sanctioned pattern, which 7.19 also uses and says so. Worth noting that before [12 · Component gaps](12-component-gaps.md) §6 was fixed it was the only option, because Field could not show existing text at all.

**Two things that will bite.**

1. **The text must be a plain block.** A flex or grid container establishes its own formatting context and steps *around* the spacer instead of wrapping beside it. This fails **silently** — the layout reverts to the flex-row measurements — so if a float looks inert, look for a `display: flex` on the text's wrapper first.
2. **The spacer and the cluster must not drift.** Both read the same `--musy-dlist-tools-*` custom properties, set once on the row from the same `data-size` the buttons use.

**Token usage.** `--space-gap-inline` `--space-gap-related` `--space-gap-stack` `--space-inset-control` `--sp-1` `--sp-2` `--target-min` `--target-primary` `--radius-card` `--radius-full` `--border-width-thick` `--interactive-accent-placeholder2-border` `-subtle` `--on-surface` `--on-surface-muted` `--surface-overlay` `--elevation-2` `--measure-body` `--measure-heading` `--z-tooltip` `--motion-toggle` `--motion-duration-slower` `-fast` `-instant` `--motion-ease-standard` `--text-wrap-body` `--text-hyphens` `--type-body-sm-*`

**A11y notes.**

- The list is an `<ol>`, so the count and each position reach assistive tech instead of being drawn.
- Each item's Content Box keeps its heading, **hidden** (L8, via `headlineHidden`). It identifies the item in the outline and is announced before the controls.
- The chevron is a disclosure: `aria-expanded` on the trigger, `aria-controls` pointing at the region it opens, and a label that changes with the state.
- Every control names its item — "Drag statement 3", not "Drag".
- `user-select: none` on the item's text (L13): it is a drag surface, and a marquee starting under the finger beats the gesture to it.
- **Keyboard equivalents are specified and unverified.** Space lifts, arrows move, `M` merges into the item above, Escape cancels, and a live region announces each. Implemented here and in the reference; never tested with a screen reader — see [13 · Layout evidence](15-layout-evidence.md) and open question 30.

**What it is NOT.** Not a table, not a sortable data grid, not a tree, and not a file list. It assumes items are short prose the user wrote or spoke, and that reordering is **meaningful** rather than a display preference.

**Spec and reasoning.** [13 · Draggable List](13-draggable-list.md). Its use in the prototype's Reflect step is [14 · Reflect step](14-reflect-step.md).

---

## 7.25 Segmented Control `[SEED]`

> **Boundaries were lightened in review.** The resting and selected edges now take the element's own background — present in the box model, invisible in the picture — and the width no longer steps on selection. The tinted fill and the check glyph still carry the state; the edge no longer does. `prefers-contrast: more` restores both. See **conflict B25** and open question 35.

**Purpose.** Two to four mutually exclusive options, icon *and* text, all visible at once.

**APG pattern.** [Radio Group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) — base-ui `RadioGroup` + `Radio` + `Fieldset`.

**Why not Tabs.** A segmented control *looks* like a tablist and is not one. The choice here is an answer the surrounding form carries, not navigation between panels: `role="tablist"` would promise a tab/panel relationship that does not exist and would take the value out of the form. Roving arrow keys and the single tab stop come from `RadioGroup` either way, so the keyboard behaviour is identical and only the semantics differ — which makes Tabs a pure loss here.

**Anatomy.**
```
SegmentedControl
└── Fieldset.Root.musy-seg[--accent-placeholder1|2][--guided]   (render=RadioGroup)
    ├── Fieldset.Legend.musy-radio-group__legend  (or .musy-sr-only)
    └── div.musy-seg__track
        └── Radio.Root.musy-seg__option    ×2–4   [data-checked|unchecked|disabled]
            ├── Icon  (size md — REQUIRED)
            └── span.musy-seg__label       (one line, ellipsed)
```

**Props.**

| Prop | Type | Default |
|---|---|---|
| `name` / `legend` | `string` | — (both required) |
| `legendHidden` | `boolean` | `false` |
| `options` | `SegmentedOption[]` (2–4) | — |
| `value` / `onValueChange` | `string` / `(v: string) => void` | — |
| `accent` | `'primary' \| 'accent-placeholder1' \| 'accent-placeholder2'` | `'primary'` |
| `guided` | `boolean` | `false` |
| `disabled` | `boolean` | `false` |

Each option is `{ value, label, glyph, disabled? }`. **`glyph` is required, not optional** — see the truncation rule. Beyond four options a German label cannot survive the segment width; that case is 7.6 or a Select, and the component `console.warn`s in development rather than failing silently.

**Truncation.** Labels ellipse at one line. CSS truncation does not touch the accessibility tree, so the full label is still announced — only a sighted user loses the tail, and the icon is the cue that survives for them. That is the whole reason the glyph is mandatory. There is no measure-and-unclamp path here as in 7.6: a row can grow to two lines, a segment in a fixed-width track cannot.

**State matrix.**

| State | What changes |
|---|---|
| default | transparent on `--surface-sunken` track, `--on-surface-muted` |
| hover | `--interactive-ghost-hover` + ink to `--on-surface` (unselected only, `(hover: hover)` gated) |
| active | `--interactive-ghost-active` |
| focus-visible | `--focus-ring` on the segment |
| selected | lifted to `--surface-raised` **+** border to `--border-width-thick` **+** ink to `-on-subtle` |
| disabled | `--on-surface-disabled`; selected-and-disabled also drops to `--interactive-primary-disabled` |

**Responsive behaviour.** Equal segments from `grid-auto-columns: 1fr`, so 2, 3 and 4 options need no per-count rule. The control is a **container** (`container-type: inline-size`), not a media-query consumer: the same control is legal in a 320px sheet and a 720px panel on one screen, and a media query cannot tell those apart. Below `30rem` of container width the label stacks under the icon and takes the segment's full width — that recovers far more characters than shrinking the type would, and costs no legibility. Each segment is its own target at `--target-primary`, so the *track* ends up taller than 44px; the target rule applies to the hit area, not to the box around it.

**Token usage.** `--sp-1` `--sp-2` `--sp-3` `--target-primary` `--target-guided` `--radius-control` `--border-width-hairline` `--border-width-regular` `--border-width-thick` `--border-style-solid` `--border-subtle` `--surface-sunken` `--surface-raised` `--interactive-primary-border` `-on-subtle` `-disabled` `--interactive-ghost-hover` `-active` both `--interactive-accent-placeholder{1,2}` border + on-subtle `--on-surface` `--on-surface-muted` `--on-surface-disabled` `--focus-ring` `--motion-toggle` `--type-label-md-*`

**A11y notes.** Selection carries three cues — lifted fill, border weight, ink — so it reads with the hue removed (1.4.1). The legend is never dropped, only hidden: an unnamed radio group announces as a bare set of options (1.3.1, 4.1.2).

**What it is NOT.** Not Tabs (see above), not a toggle button group with multiple active (that is a checkbox set), not a filter bar, not 7.6 (more options, longer labels, vertical rows).

**In use.** The MVP's Reflect step: *Record audio · Write answer · Take photo*. "Not right now" deliberately sits **outside** the control as a ghost button — three ways to answer and one way to not answer are different kinds of choice, and a fourth segment reading "Not right now" would make refusal look like a method.

---

## 7.15 Logo `[LOCKED]`

**Purpose.** Place the Musy mark.

**Semantic HTML.** base-ui has no logo primitive. `<img>` with `alt` when it is the only naming of the product; `aria-hidden` + adjacent text when a wordmark is rendered beside it, so the name is not announced twice. Built on base-ui `useRender`, which is how the app turns it into a home link (`render={<Link href="/" />}`) without this component knowing about routing.

**Anatomy.**
```
Logo
└── span.musy-logo[--splash]
    ├── img.musy-logo__mark
    └── span.musy-logo__wordmark   (optional)
```

**Props.**

| Prop | Type | Default |
|---|---|---|
| `size` | `'nav' \| 'splash'` | `'nav'` |
| `showWordmark` | `boolean` | `false` |
| `alt` | `string` | `'Musy'` |
| `src` | `string` | `'/assets/musy-logo.png'` |

**State matrix.** Not interactive — no states.

**Responsive behaviour.** None: `nav` and `splash` are chosen by placement, not by viewport. Nav is `--icon-size-lg` (24px); splash is `--icon-size-xl * 3` (96px). Both numbers are the brief's, expressed through icon tokens so they stay on the icon grid.

**Token usage.** `--icon-size-lg` `--icon-size-xl` `--space-gap-inline` `--space-gap-stack` `--on-surface` `--type-heading-sm-*` `--type-display-lg-*`

**A11y notes.** One asset in both themes, as decided — the mark is a full-colour illustration, so Layer 1's surface tokens carry the contrast *around* it rather than through it. Verified against `--surface` in both themes on the proof page. The `alt`/`aria-hidden` fork prevents the double announcement that a mark-plus-wordmark lockup usually ships with.

**What it is NOT.** Not a home link — wrapping it in an `<a>` is the consuming app's job, and doing it here would put a link in every context that shows a logo.

---

## Anticipating Pass 3 (§6, not built)

Nothing here is implemented; these are the API affordances the out-of-scope work will need, confirmed present.

| Pass-3 need | Already supported by |
|---|---|
| Burger + profile as ghost icon buttons | `IconButton variant="ghost"`, tooltip suppressed on touch |
| 24×24 marker slots in the nav | `Icon size="lg"`, `IconButton size="min"` with its mandatory spacing |
| Sheet close button | `IconButton` with `tooltip={false}` |
| QR: closed → open → recognised | `CtaButton` (open), `Message variant="error" live="assertive"` (not recognised), `Message variant="success"` + one `action` (recognised) |
| "Open directly in Spotify" | `Switch`, `reverse` layout. Its on-state suppressing a Message + Button pair is **consuming-app state**, not Switch state — Switch exposes no such coupling, correctly |
| Focus management on sheet open/close | base-ui `Dialog` / `Drawer` own it. Every control here is reachable and `:focus-visible`-styled, and none traps focus |
| Right-side sheets with scrim | base-ui `Drawer` — already in the dependency, no new library at Pass 3 |


---

## 7.16 Field `[SEED]`

**Purpose.** Ask for one typed answer — a name, an email address, a written reflection.

**APG pattern / semantic HTML.** No pattern of its own: a field is a label / control / help / error assembly, and the pattern lives in the native control it wraps. base-ui `Field` owns exactly the parts that are easy to get wrong by hand — the label↔control association, `aria-describedby` wiring for **both** description and error, and the validity data-attributes the stylesheet targets.

**Anatomy.**
```
Field
└── div.musy-field                          ← Field.Root
    ├── label.musy-field__label             ← Field.Label
    │   └── span.musy-field__required       (decorative "*")
    ├── input|textarea.musy-field__control[--textarea]   ← Field.Control
    ├── div.musy-field__error[role=alert]   → Icon CircleX + sr-only status word
    ├── div.musy-field__valid               ← Field.Validity
    └── p.musy-field__description           ← Field.Description
```

**DOM order is load-bearing.** Error sits **above** Description, so a message that just appeared is next to the control that caused it rather than below a hint the user already read.

**Props.**

| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — (required) |
| `name` | `string` | — |
| `multiline` | `boolean` | `false` |
| `type` | `'text' \| 'email' \| 'tel' \| 'url' \| 'search' \| 'password'` | `'text'` |
| `value` / `defaultValue` / `onValueChange` | `string` / `string` / `(v: string) => void` | — |
| `placeholder` / `description` | `string` | — |
| `error` | `string` | — (presence **is** the invalid state) |
| `validMessage` | `string` | — |
| `required` / `disabled` / `readOnly` | `boolean` | `false` |
| `rows` | `number` | — |
| `errorWord` | `string` | `'Error'` |

`multiline` swaps `<input>` for `<textarea>` through the same Field.Control part — the same field at a different measure, not a second component. Guided textarea height is **two comfort rows** (`calc(--target-comfort * 2)`): derived, not picked.

**The value goes through `Field.Control`, not `Field.Root` — fixed defect.** This component passed `value`, `defaultValue` and `onValueChange` to base-ui's `Field.Root`, which accepts none of the three in `@base-ui/react` 1.7.0 — the version `package.json` declares. They landed on a `<div>` and were silently ignored, so **a pre-filled or controlled field rendered empty**. It type-errors under a strict `tsc`, which is how it surfaced. The value is now driven through `Field.Control`'s rendered element, with `onChange` adapting the native event to `onValueChange`. The public API is unchanged.

Downstream consequence worth stating: any screen that was composing on Field's *parts* (`.musy-field__*`) to edit existing text was doing so because it had to, not because it chose to. Composing on the parts remains sanctioned — §7.19 Voice Note does it and says so — but it is no longer forced. See [12 · Component gaps](12-component-gaps.md) §6.

**State matrix.**

| State | Selector | What changes |
|---|---|---|
| default | — | `--surface-raised`, `--border-strong` at `--border-width-regular` |
| hover | `:hover` inside `(hover: hover) and (pointer: fine)` | border steps toward the hover edge |
| focus-visible | `:focus-visible` | `--focus-ring` at `--focus-ring-offset` |
| filled | `[data-filled]` | `--surface-raised`. **Not a validity state** — it only says the control carries a value, so the treatment is deliberately quiet |
| invalid | `[data-invalid]`, `[aria-invalid="true"]` | `--feedback-error-border` + `--border-width-thick` + error surface |
| valid | `[data-valid][data-touched]` | `--feedback-success-border` + `--border-width-thick` |
| disabled | `[data-disabled]`, `:disabled` | `--border-subtle`, `--interactive-primary-disabled`, label + description to `--on-surface-disabled` |
| loading | — | N/A. A field awaiting a save is the consuming app's state: disable it and render a Message |

**Validity is never painted before it is earned.** The success border and success line are gated on `data-touched`, so an untouched empty field is neutral rather than green. The validity properties carry **no transition** — a fading border shows a stale state mid-flight.

**Responsive behaviour.** None of its own. `--measure-body` caps the description; the control is `width: 100%` and takes its measure from the container, because a field narrower than its container reads as broken rather than as considered.

**Token usage.** `--space-gap-related` `--space-gap-stack` `--space-inset-control` `--target-comfort` `--radius-input` `--border-width-regular` `--border-width-thick` `--border-style-solid` `--border-strong` `--border-subtle` `--surface-raised` `--surface-sunken` `--on-surface` `--on-surface-muted` `--on-surface-disabled` `--interactive-primary-disabled` `--feedback-error-border` `--feedback-error-icon` `--feedback-error-text` `--feedback-success-border` `--feedback-success-icon` `--feedback-success-text` `--focus-ring` `--focus-ring-offset` `--motion-toggle` `--icon-size-sm` `--measure-body` `--text-wrap-body` `--type-label-lg-*` `--type-body-sm-*` `--type-body-md-*`

**A11y notes.** A visible label is required by the type — a placeholder is not a label (3.3.2), and the placeholder disappears exactly when the user needs it. The required marker is decorative; the real signal is the control's own `required`, which base-ui reflects. The error carries the same visually-hidden status word as Message, so a field-level error and a page-level one teach the same thing.

**`FieldItem`** — a control that sits **beside** its label (Switch, checkbox, radio), description under both. The 44px target is the **row**, not the control. **`FieldGroup`** — a run of fields; the gap between two fields is the **stack** gap, never the related gap, so a label can never read as belonging to the field above it.

**What it is NOT.** Not a search bar, not a combobox, not a form. It holds one question.

---

## 7.17 Interactive Wizard `[SEED]`

**Purpose.** Move through the steps of a guided session, and show where you are.

**Semantic HTML.** No APG pattern and no base-ui primitive: a wizard is navigation, so it is a `<nav>` containing an ordered list of buttons. Roving focus is deliberately **not** applied — every step is a tab stop, which is what a user expects from a navigation region.

**Relationship to 7.8.** The interactive sibling of Process Visualisation: same step geometry, but each step is a real `<button>` and the step on screen carries `aria-current="step"`. 7.8 has no current-step state on purpose; keeping them apart is what stops a non-interactive explainer from growing a tap affordance.

**Anatomy.**
```
InteractiveWizard
└── nav.musy-wizard[--vertical][--compact]  [aria-label]
    └── ol.musy-wizard__list
        └── li.musy-wizard__step                    ×n
            ├── button.musy-wizard__trigger  [data-state] [aria-current]
            │   ├── span.musy-wizard__marker  [aria-hidden]
            │   │   ├── span.musy-wizard__num
            │   │   └── span.musy-wizard__check → Icon Check
            │   └── span.musy-wizard__label
            │       └── span.musy-wizard__hint      (state word)
            └── span.musy-wizard__connector  [data-complete] [aria-hidden]
```
`WizardPanel` renders `div.musy-wizard__panel` + `div.musy-wizard__actions` — Content Box geometry, because the wizard owns the header, not the body.

**Props.**

| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — (required) |
| `steps` | `WizardStep[]` (`{ id, label }`) | — |
| `current` | `string` | — |
| `completed` | `string[]` | `[]` |
| `onStepChange` | `(id: string) => void` | — |
| `vertical` / `compact` | `boolean` | `false` |
| `showStateWords` | `boolean` | `true` |
| `accent` | `'primary' \| 'accent-placeholder1' \| 'accent-placeholder2'` | `'primary'` |
| `stateWords` | `Partial<WizardStateWords>` | `locked / available / current / done` |

**Reachability is the component's rule, not the consumer's.** Every completed step stays reachable, so going back is always allowed; the only unreachable step is one whose predecessors are unfinished. That rule lives in the component so two screens cannot disagree about it.

**State matrix.** Four states, and they are a progression rather than a palette.

| State | What changes |
|---|---|
| disabled | **no fill**, no edge, label + hint to `--on-surface-disabled`, `cursor: not-allowed` |
| active | accent `-subtle` fill, accent `-on-subtle` numeral, ordinary label |
| selected | solid accent marker **+** label to `--font-weight-bold` and `-on-subtle` |
| completed | accent `-subtle` fill, number **replaced by a check** |
| hover / active | `--interactive-ghost-hover` / `-active` on the trigger, fine pointers only |
| focus-visible | `--focus-ring` on the trigger |

Selection changes the marker **fill** and the label **weight**; completion changes the **glyph**. The label weight follows `aria-current` rather than `data-state`, so a run whose selected step is also completed still shows where you are.

**No marker draws a border**, on any state — that is what makes the run light, and it was a review decision. `selected` loses nothing (a solid fill is the cue) and `completed` loses nothing (the check glyph is). `active` vs `disabled` is now **fill-presence plus ink**: the reachable marker carries the accent tint and the locked one carries none. One caveat, logged rather than buried: that tint measures ~1.2:1 against the panel, so reachable-vs-locked leans harder on the numeral colour than it did when every marker had an edge. `prefers-contrast: more` restores an edge on all four, using Layer 1's own promotion of `--border-subtle`. See **conflict B24** — if the distinction has to survive daylight on a phone, the fix is a shape cue on *disabled* rather than the ring coming back.

**Accent variants.** The markers, the current step's label and the completed connectors take a solved accent family, chosen with `accent`. Indirected through five `--musy-wizard-accent*` custom properties so the state rules are written once rather than three times — the device §7.21 Music Player uses. Whole families, **not a hue swap**: ocher and purple are *light* solids and take dark ink where terracotta is a dark solid and takes light ink, so `-on` travels with `-subtle` or the selected marker's number fails 1.4.3. Which of the three a screen should use is still undefined — conflict B12, open question 7.

**Connectors are hairline.** `--border-width-hairline` in `--border-subtle`, stepped down from regular in the same review: `--border-subtle` is already the softest border colour the system has, so the weight was the part still shouting, and hairline is what Layer 1 reserves for dividers. A completed connector takes the accent's `-border` step.

**Responsive behaviour.** The run is a **row at every width**. Narrow screens do not stack it — they **collapse** it: the step on screen keeps its label, every other step shrinks to its marker alone. Four stacked rows would spend on chrome exactly the height a phone needs for content. Hidden labels are moved out of sight, not removed, so a marker-only step still announces its name. `--compact` forces the same collapse inside a narrow container, which no media query can see. `--vertical` is the opt-in label-first variant for wide rails.

**Token usage.** `--space-gap-related` `--space-gap-stack` `--space-inset-card` `--sp-1` `--sp-2` `--sp-4` `--target-primary` `--radius-control` `--radius-card` `--radius-full` `--icon-size-sm` `--icon-size-lg` `--border-width-regular` `--border-width-thick` `--border-style-solid` `--border-subtle` `--border-strong` `--surface-raised` `--interactive-primary` `-subtle` `-border` `-on` `-on-subtle` `--interactive-ghost-hover` `-active` `--on-surface` `--on-surface-muted` `--on-surface-disabled` `--font-weight-bold` `--focus-ring` `--motion-toggle` `--type-label-md-*` `--type-body-sm-*` `--bp-md` (mirrored)

**A11y notes.** `aria-current="step"` is the only announcement of position; the connector is `aria-hidden`, because the `<ol>` already conveys sequence. A disabled step is `disabled`, not `aria-disabled` — it is genuinely not actionable, and leaving it focusable would offer a dead end.

**What it is NOT.** Not a progress bar, not a tab list (tabs show sibling views; steps have an order and a gate), not Process Visualisation.

---

## 7.18 Photo Upload `[SEED]` · PROVISIONAL (G2)

**Purpose.** Attach one image — in the reference flow, a photo of handwritten reflection notes.

**Semantic HTML.** No APG pattern (a file input is a native control with its own affordances) and no base-ui primitive. The native `<input type="file">` **is** the control: it is displaced with `.musy-sr-only` and triggered by a real CTA Button. That is the only accessible way to dress a file input — it is **displaced, never restyled**, so keyboard, focus and the platform picker behave exactly as the OS intends.

**Composed, not re-declared.** Label, description and error are §7.16's `.musy-field__*` parts. Only the drop zone and the selected-file row are new, because only those are new.

**Anatomy.**
```
PhotoUpload
└── div.musy-field.musy-upload
    ├── label.musy-field__label
    ├── input[type=file].musy-sr-only        ← the real control
    ├── div.musy-upload__zone   [data-dragover][data-invalid][data-disabled]   (empty)
    │   ├── span.musy-upload__zone-icon → Icon ImagePlus
    │   ├── p.musy-upload__zone-text
    │   └── CtaButton secondary              (opens the picker)
    ├── div.musy-upload__preview                                              (selected)
    │   ├── img.musy-upload__thumb  [alt REQUIRED]
    │   ├── div.musy-upload__meta → __name + __size
    │   └── div.musy-upload__preview-actions → CtaButton ghost + IconButton Trash2
    ├── div.musy-field__error
    └── p.musy-field__description
```

**Props.**

| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — (required) |
| `value` / `onValueChange` | `UploadedPhoto \| null` / `(v) => void` | `null` |
| `previewAlt` | `string` | — (**required**) |
| `accept` | `string` | `'image/*'` |
| `description` / `error` | `string` | — |
| `disabled` / `required` | `boolean` | `false` |
| `zoneText` / `chooseLabel` / `replaceLabel` / `removeLabel` / `errorWord` | `string` | English defaults |

**State matrix.**

| State | What changes |
|---|---|
| empty | dashed `--border-subtle` zone on `--surface-sunken` |
| drag-over | `[data-dragover]` → `--interactive-primary-border` + `--interactive-primary-subtle` |
| focus-within | `--focus-ring` on the zone — the focusable element is the displaced input, so the ring has to be drawn on what stands in for it |
| selected | the zone is replaced by the preview row |
| invalid | `[data-invalid]` → `--feedback-error-border`, error Message below |
| disabled | `--interactive-primary-disabled`, thumbnail to 50%, `cursor: not-allowed` |
| loading | N/A. An upload in flight is the consuming app's state |

**Drag-and-drop is an enhancement layered over the button.** Everything reachable by drop is reachable by click and by keyboard (2.1.1).

**Responsive behaviour.** No breakpoint changes. The zone is two guided targets tall and the thumbnail is one guided target square — both **derived** from the touch scale, so they step with it rather than drifting.

**Token usage.** `--space-inset-card` `--space-gap-related` `--space-gap-inline` `--sp-1` `--sp-2` `--target-guided` `--radius-card` `--radius-input` `--border-width-regular` `--border-width-thick` `--border-style-solid` `--border-style-dashed` *(G2)* `--border-subtle` `--border-strong` `--surface-raised` `--surface-sunken` `--interactive-primary-subtle` `--interactive-primary-border` `--interactive-primary-disabled` `--feedback-error-border` `--on-surface` `--on-surface-muted` `--on-surface-disabled` `--focus-ring` `--focus-ring-offset` `--motion-toggle` `--measure-body` `--text-hyphens` `--type-label-lg-*` `--type-body-sm-*` `--type-body-md-*`

**A11y notes.** `previewAlt` is required by the type for the same reason as 7.7 — the preview is how the user confirms they attached the right page. The filename is the **one** place in the set where a single-line ellipsis is legal: a filename is a machine string the user already recognises, not copy they must read to make a choice, and the full string stays in the DOM. The dashed edge is legal here because the zone's affordance is the **button inside it**, not the boundary (1.4.11).

**What it is NOT.** Not a multi-file uploader, not a gallery, not a camera, not a cropper.

---

## 7.19 Voice Note `[SEED]`

**Purpose.** Capture one spoken answer. In the reference flow this is the **default** reflection mode, which is why it is a first-class component and not a button that opens something else.

**Semantic HTML.** No APG pattern and no recorder primitive. The parts base-ui **does** own are used: `Button` for every control and `Progress` for the playback position, which renders the correct `role="progressbar"` and value attributes.

**Fully controlled, and no media access.** The component owns the state **machine** and its presentation; it never calls `getUserMedia`. Recording, encoding and permission handling belong to the consuming app — which is what lets the same component drive a real recorder and a simulated one with no prototype branch inside the design system.

**Anatomy.**
```
VoiceNote
└── div.musy-field.musy-voice
    ├── span.musy-field__label
    ├── div.musy-voice__control  [data-state=idle|recording|recorded][role=group]
    │   ├── idle       → IconButton Mic + p.musy-voice__text
    │   ├── recording  → IconButton Square + div.musy-voice__live
    │   │                 ├── span.musy-voice__dot     [aria-hidden]
    │   │                 └── span.musy-voice__status  [role=status]
    │   └── recorded   → IconButton Play/Pause
    │                    + div.musy-voice__playback
    │                    │   ├── Progress.Root.musy-voice__bar → __track → __fill
    │                    │   └── span.musy-voice__time
    │                    + IconButton Trash2
    ├── div.musy-field__error
    └── p.musy-field__description
```

**Props.**

| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — (required) |
| `state` | `'idle' \| 'recording' \| 'recorded'` | — (required) |
| `elapsed` / `duration` / `position` | `number` (seconds) | `0` |
| `playing` | `boolean` | `false` |
| `onRecordStart` / `onRecordStop` / `onTogglePlay` / `onDelete` | `() => void` | — |
| `description` / `error` | `string` | — |
| `disabled` | `boolean` | `false` |
| `idleText` / `recordLabel` / `stopLabel` / `playLabel` / `pauseLabel` / `deleteLabel` / `recordingWord` | `string` | English defaults |

**State matrix.** Three states, and they are a **cycle**: idle → recording → recorded → idle.

| State | What changes |
|---|---|
| idle | `--surface-raised`, `--border-strong`, primary IconButton with Mic |
| recording | border steps to `--border-width-thick` **and** `--feedback-error-border`; `--feedback-error-surface` fill; pulsing dot; live elapsed time |
| recorded | play/pause, a determinate Progress bar, m:ss / m:ss, delete |
| disabled | `--border-subtle`, `--interactive-primary-disabled`, fill and text to `--on-surface-disabled` |
| error | `.musy-field__error` below, same as 7.16 |

**The recording surface borrows the error family**, and that is deliberate rather than convenient reuse: red-while-live is the one colour convention this audience already holds, and it is the only non-brand family solved at 3:1. Two cues carry it — the border **steps to thick** as well as changing family — so it survives greyscale (1.4.1).

**Announcement, not animation.** The pulsing dot is decorative; the elapsed time sits in a `role="status"` region. Under reduced motion the pulse is **dropped entirely** rather than shortened — Layer 1 collapses every duration to 1ms, which on an `infinite alternate` would strobe. Same decision the button spinner takes.

**Responsive behaviour.** No breakpoint changes. Three columns (control / body / trailing action) at every width; the body is the only flexible column, so the buttons never reflow away from the thumb.

**Token usage.** `--space-gap-related` `--space-gap-inline` `--sp-1` `--sp-2` `--target-comfort` `--target-primary` `--radius-card` `--radius-full` `--icon-size-sm` `--icon-size-md` `--border-width-regular` `--border-width-thick` `--border-style-solid` `--border-strong` `--border-subtle` `--surface-raised` `--surface-sunken` `--interactive-primary` `--interactive-primary-disabled` `--feedback-error-surface` `--feedback-error-border` `--feedback-error-icon` `--feedback-error-text` `--on-surface-muted` `--on-surface-disabled` `--motion-duration-slower` `--motion-ease-standard` `--motion-toggle` `--measure-body` `--text-hyphens` `--type-label-lg-*` `--type-body-sm-*` `--type-body-md-*`

**A11y notes.** Every control is an IconButton with a required `aria-label`, and the play control's label **changes with state** so it never says "Play" while pausing. Tabular figures keep the timer from twitching the row once a second. The control surface is a `role="group"` named by the label, so the three buttons announce as one control rather than three loose ones.

**What it is NOT.** Not an audio player (no seek, no speed, no waveform editing), not a recorder implementation, not a permissions flow.

---

## 7.21 Music Player `[SEED]`

**Purpose.** Give a Method's track a control the listener can trust. Two variations of one job, and the choice between them is about whether the listener needs to move *inside* the track:

| Variation | Use it when |
| --- | --- |
| `TrackButton` (`.musy-mbtn`) | The track is offered inline — in prose, in a wizard panel — where a second row of chrome would outweigh what it controls. Glyph + action label + MM:SS countdown, one target. |
| `MusicPlayer` (`.musy-mplayer`) | The listener needs to scrub. A `--target-guided` (64px) transport plus a slider, elapsed and remaining. |

**Composition, not a new button.** `TrackButton` is §7.4 CTA Button with one extra part (`.musy-mbtn__time`), so it inherits the whole button state model — hover, active, focus, disabled, loading — rather than re-deriving it.

**Fully controlled, and no media.** Both own the transport UI and its state machine and never an `<audio>` element, no fetch and no timer: the consuming app holds the media and feeds `position` back. Same split as 7.19, and the same reason — one component drives a real player and a simulated one with no prototype branch inside the design system.

**Anatomy.**

    .musy-mplayer                      [data-state] [data-disabled]
    ├── IconButton --guided            play / pause / restart
    └── div.musy-mplayer__main
        ├── span.musy-mplayer__title
        ├── Slider.Root → Control.musy-mplayer__slider
        │     └── Track.musy-mplayer__control
        │         ├── span.musy-mplayer__track    the rail
        │         ├── Indicator.musy-mplayer__fill
        │         └── Thumb.musy-mplayer__thumb
        └── div.musy-mplayer__times    elapsed · −remaining

**Props.** `TrackButton`: `label` `duration` `position` `playing` `onTogglePlay` `onRestart` `variant` `size` `disabled` + copy overrides. `MusicPlayer`: `title` `duration` `position` `playing` `onTogglePlay` `onRestart` `onSeek` `accent` `disabled` + copy overrides.

**Three decisions worth arguing with.** The readout **counts down**, because the only question a first-time listener has is how long they are committing to — a count-up answers it only for someone already holding the duration. The button's **label names the action**, not the track — "Start Listening" → "Pause" → "Replay". A fixed label is the safer default and was the first answer here, but the flows this button exists for withhold the track name on purpose, so a fixed label had nothing true to say and the glyph carried the state alone; the track moves into the accessible name, where it still tells two players on one screen apart. And **ended is a state**: both variations swap to a restart glyph rather than quietly reverting to play, so "it finished" and "it never started" are never the same picture (1.4.1 — the glyph differs, not only the fill). Restarting plays from zero, because that is what the glyph promised.

**The scrubber is base-ui `Slider`.** It renders `role="slider"`, the value attributes, arrow keys and Home/End. Hand-rolled scrub handles get all four wrong, and get them wrong invisibly. The rail is `--sp-1` like 7.19's playback bar, but the grabbable area is `--target-primary` (44px): a 4px rail you can only catch at 4px is a rail nobody scrubs, and this is the only **drag** control in the system — the one place a small target costs most. `--target-min` is not an option here: Layer 1 permits that size only inline in prose and owes it `--sp-2` of clear space on every side, which a control stacked `--sp-1` from a title above and a time row below does not have. **[OPEN · G5]** that rail height is a borrowed literal in two components now and wants a Layer 1 token.

**State matrix.**

| State | Treatment |
| --- | --- |
| paused | Play glyph, fill at the current position |
| playing | Pause glyph, fill advances, only the fill transitions (`--motion-toggle`) — the thumb must not lag the finger holding it |
| ended | Restart glyph, fill full |
| disabled | `--border-subtle`, `--interactive-primary-disabled`, accent and text to `--on-surface-disabled`, thumb not focusable |

**Responsive behaviour.** No breakpoint changes. Two columns (transport / body) at every width; the body is the only flexible column and the title truncates rather than wrapping, so the row stays one line high and the transport never reflows away from the thumb.

**Token usage.** `--space-gap-related` `--sp-1` `--sp-2` `--sp-3` `--sp-4` `--target-primary` `--target-guided` `--radius-card` `--radius-full` `--icon-size-md` `--icon-size-lg` `--border-width-hairline` `--border-width-regular` `--border-style-solid` `--border-strong` `--border-subtle` `--surface-raised` `--surface-sunken` `--interactive-primary` `--interactive-primary-border` `--interactive-primary-disabled` `--interactive-accent-placeholder1` `--interactive-accent-placeholder2` `--on-surface` `--on-surface-muted` `--on-surface-disabled` `--elevation-1` `--focus-ring` `--focus-ring-offset` `--motion-toggle` `--type-label-lg-*` `--type-body-sm-*`

**A11y notes.** `TrackButton`'s visible label is the action; the *accessible* name appends the track ("Pause, Your track"), so one screen can hold two players without two identically named controls. `MusicPlayer`'s visible title is the track and its transport button's name carries the action, so the control never announces "Play" while pausing. Tabular figures on both readouts keep the row from twitching once a second. The remaining figure is prefixed with a minus so it cannot be misread as the end timestamp. Forced colours repaint the accent away, so fill and thumb take `Highlight`.

**What it is NOT.** Not a queue, a playlist or a waveform editor; no volume, speed or output-device control; no media implementation.

---

## 7.24 Hint `[SEED]`

**Purpose.** Explain one glyph, figure or abbreviation on hover, where there is no control to hang a tooltip on.

**Why not 7.2's tooltip.** That one belongs to an Icon Button and takes its string from the button's own `aria-label`, so the string is authored once. A Hint has no owner to borrow from, and it usually sits **inside** a control — a glyph in a 7.13 Radio Card — where a second focusable element would be illegal and a second tab stop unwelcome. It is not base-ui `Tooltip` either: that primitive assumes a focusable trigger and gives it `aria-describedby`; here there is nothing focusable to describe.

**Anatomy.**
```
Hint
└── span.musy-tip
    ├── (children — the glyph or figure)
    ├── span.musy-sr-only        the same text, for AT
    └── span.musy-tip__bubble    [aria-hidden]
```

**Props.** `text` (required), `children`, `className`.

**The decision that makes it legal.** The bubble is a **pointer shortcut, never the only copy**: the same string is always present as visually-hidden text inside the trigger. So nothing appears on hover that is not already in the accessible name, and 1.4.13's hover-content rules have nothing to bite on. Coarse pointers drop the bubble entirely — the call 7.2 makes, for the same reason: a touch-triggered bubble sits under the finger.

**Appearance.** Shares 7.2's tooltip block verbatim (`--surface-inverse`, `--radius-xs`, `--type-label-md-*`, `--z-tooltip`) — one bubble look in the system, authored once.

**What it is NOT.** Not a popover (no click, no focus, no interactive content inside), not a disclosure, not a way to hide something the user needs.

---

## 7.22 Record Button `[SEED]`

**Purpose.** Capture one spoken answer from **one control**. 7.19's capture step, collapsed into the screen's primary CTA: two states on one target — ready ⇄ recording — where every switch resets the clock, so there is no third "recorded" state to explain.

| Use it when | Use 7.19 instead when |
| --- | --- |
| Speaking *is* the action on the screen, and the recording is handed straight on (sent, transcribed, discarded) | The user must review, replay, or delete the note before moving on — that needs a playback state and a second control |

**Composition, not a new button.** 7.4 CTA Button with two extra parts (`.musy-rec__meter`, `.musy-rec__time`), so it inherits the whole button state model — hover, active, focus, disabled — and the full target ladder: `--target-primary` (44px), `--target-comfort` (56px), `--target-guided` (64px). The size raises the target and the glyph step, never the type step.

**Fully controlled, and no media.** The component draws `levels`; it never calls `getUserMedia`, never encodes, and **does not hold the 60-second timer**. The app that owns the recorder owns both and calls `onLimit` at `maxSeconds`. Same split as 7.19 and 7.21, and the same payoff: one component drives a real recorder and a simulated one with no prototype branch inside the design system.

**Anatomy.**

    button.musy-btn.musy-btn--primary.musy-rec   [data-state=ready|recording]
    ├── Icon                      Mic → Square
    ├── span.musy-btn__label      "Record Now" → "Recording"
    └── recording only
        ├── span.musy-rec__meter  [aria-hidden]  → span.musy-rec__bar × bars
        ├── span.musy-rec__time   0:12 · −0:48
        └── span.musy-sr-only     [role=status]

**Props.**

| Prop | Type | Default |
|---|---|---|
| `state` | `'ready' \| 'recording'` | — (required) |
| `elapsed` | `number` (seconds) | `0` |
| `maxSeconds` | `number` | `60` |
| `levels` | `number[]` (0…1, newest last) | `[]` |
| `bars` | `number` | `12` |
| `onToggle` | `() => void` | — |
| `variant` | `'primary' \| 'accent-placeholder1' \| 'accent-placeholder2'` | `'primary'` |
| `size` | `'primary' \| 'comfort' \| 'guided'` | `'primary'` |
| `disabled` / `block` | `boolean` | `false` |
| `readyLabel` / `recordingLabel` / `status` | copy | `'Record Now'` / `'Recording'` / English |

**Two Layer 3 changes, both measured** ([12 · Component gaps](12-component-gaps.md) §3–§4):

- **`recordingLabel` defaults to `'Recording'`, was `'Recording Running'`.** §7.22 is explicit that the meter is the elastic part and the readout must never be what gives — *"the readout is the only thing a screen-reader user gets."* In a **310px column** with the old default, the meter correctly collapsed to zero and then the readout overflowed the content box by 44px and clipped: `scrollWidth` 329 against `clientWidth` 308. This section reported measuring at 340px; a 393px viewport minus an app gutter and a card inset lands at 310px, which is an ordinary phone column, not an edge case. With the shorter default: 308 against 308, with 27px of meter still showing. **Known limit, accepted:** this moves the cliff rather than removing it — German runs ~30% longer, and if a localisation reaches it, the fix is a shrink allowance on the label that engages once the meter is at zero.
- **`hug` is now the behaviour, not a floor.** `min-inline-size: min(18ch, 100%)` is gone from `.musy-btn.musy-rec`. The width change on going live is legitimate feedback, not a jump to suppress: a control that hugs its label when ready (179×46 at 393px) and takes the column while recording (310×46) tells you which state it is in before you have read the label. `max-inline-size: 100%` stays — it is what lets the meter shrink once live. **Consequence:** consumers who relied on a steady ready width lose it, and per [L6](10-layout.md) a hugging record control is right-aligned to its parent, not left. No transition on that change: `fit-content` does not interpolate to a stretched width, so a width animation either does not run or snaps at the end.

**The state is not carried by hue.** The button stays **primary** while live. 7.19's red-while-live belongs to a bordered surface; on the screen's main action the same move paints a working control as a failure. Three cues change instead — the glyph (mic → stop), the label, and the meter, which exists *only* while recording — so the state survives greyscale and forced colours (1.4.1) without a colour swap.

**The meter is decorative; the counter is not.** Bars are `aria-hidden` and take `currentColor`, so they follow the button's ink in every variant, in the disabled state, and in forced colours with no rule of their own. What a screen-reader user gets is the readout — seconds in, seconds left, in a `role="status"` region. Exactly the split 7.19 made between its pulsing dot and its live time. The bar **count is fixed**: a meter that changes bar count with the signal reads as a layout bug rather than as a level, so a missing level is a floor, not a gap.

**Two decisions worth arguing with.** The readout shows **both** figures, where 7.21 shows only the countdown: a speaker needs to know they are being recorded *and* how much room is left, and the 60-second ceiling makes "48 left" actionable in a way a track's remaining time is not. And the **meter is the elastic part**: the label is a label step and must not wrap at a 44px target (7.4 reserves wrapping for `--wrap`), and the readout is the only thing a screen-reader user gets — so when the column is narrower than the live content, the bars clip from the leading edge, which is the oldest end of the signal.

**Reduced motion.** The meter is the only continuously moving element in the system, and Layer 1 collapses every duration to 1ms — which on live data would strobe rather than shorten. So it is **flattened to a still row** and the readout carries the state; the decision 7.19 took for its pulse.

**State matrix.**

| State | Treatment |
| --- | --- |
| ready | Primary solid, Mic glyph, "Record Now", no meter, no readout |
| recording | Primary solid, Square glyph, "Recording", live meter, `0:12 · −0:48` |
| limit reached | The app stops at `maxSeconds` and returns to ready; the clock resets |
| disabled | 7.4's disabled primary; meter and readout follow the ink via `currentColor` |

**Responsive behaviour.** No breakpoint changes, and the control is one target high at every width. The **ready** state takes its content width — it hugs its label, and the jump to a full column on going live is the state cue ([L7](10-layout.md)) — while `max-inline-size: 100%` caps the box against its column — without that cap an `inline-flex` button resolves to its own max-content and flex shrinking never runs at all. The **degradation order is deliberate**: the meter gives first (`flex: 1 100 auto` against the label's shrink of 1, so the deficit lands on the bars, which clip from the leading edge — the oldest end of the signal), and the label only ellipsizes once the meter is gone. At the comfort and guided targets the button also **holds 7.4's base inline padding** (`--sp-5`) rather than the wider `--sp-6` those rungs normally take: 32px a side pushed the label out of a 340px column, and going *below* the base made the ladder optically uneven — the glyph of a 64px button sat nearer the edge than the glyph of the 44px one above it. Measured in a 340px column all three targets keep the full label and readout, with about 2 bars of meter left at every rung (17px at primary, 13px at comfort and guided). The narrower case that this section originally missed is a **310px** column — 393px minus an app gutter and a card inset — where the old default label overflowed; see the two Layer 3 changes above. `block` fills the inline axis where the CTA does, and the extra room goes to the meter.

**Token usage.** `--space-gap-related` `--sp-1` `--sp-2` `--sp-4` `--icon-size-md` `--icon-size-lg` `--radius-full` `--target-primary` `--target-comfort` `--target-guided` `--motion-toggle` + everything 7.4 brings (`--interactive-primary*`, `--radius-control`, `--space-inset-control`, `--type-label-lg-*`)

**A11y notes.** One button, one accessible name, one target at every size. The label changes with the state here — unlike 7.21's, because this control's label *is* the state, not the subject. Tabular figures keep the readout from shifting the label once a second. `aria-hidden` on the meter means a screen reader never walks twelve empty spans.

**What it is NOT.** Not a player (no playback, no scrub, no delete — that is 7.19), not a recorder implementation, not a permissions flow, not a waveform editor.
