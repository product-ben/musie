# 11 · Toast — §7.23 `[SEED]`

> **Landed.** Released as §7.23: `components/Toast.tsx`, §23 of
> `components/musy-components.css`, two exports in `components/index.ts`, and
> §7.23 of [`07-components.md`](07-components.md). This file is the spec it was
> built from and the record of the reasoning.

**Purpose.** Confirm an action that has already happened and offer the one way to
reverse it, without moving the content the user is looking at.

| Use it when | Use §7.11 Message instead when |
| --- | --- |
| The action is done, the confirmation is transient, and the user's attention is elsewhere on the page | The message is about the thing next to it and should stay until it is resolved |

**Why it is not Message.** §7.11's own source says so: *"base-ui's Toast is a
different pattern (portaled, queued, auto-dismissing)"*. The difference is not
styling — a Message is part of the flow and pushes layout when it appears, which
is wrong for a confirmation arriving while the user is reading something else.

**Why it belongs in the system.** Layer 1 already ships `--z-toast`, ranked
*above* `--z-sheet`, with the stated reason that "a session saved confirmation
must be visible over an open sheet". That is a layer with no consumer in the
released set.

**Anatomy.**

```
div.musy-toast   [role=status] [aria-live=polite]
├── p.musy-toast__text                 body-sm
├── CtaButton variant="ghost"          the single reversal
└── button.musy-toast__dismiss         base-ui Button + Icon
```

**Props.**

| Prop | Type | Default | Note |
|---|---|---|---|
| `label` | `string \| null` | — | `null` renders nothing, so the consumer's own state is the visibility |
| `action` | `{ label: string; onAction: () => void }` | — | Exactly one. Two actions means this is a dialog |
| `onDismiss` | `() => void` | — | |
| `live` | `'polite' \| 'off'` | `'polite'` | |

**State matrix.** Two states: absent, and present. There is deliberately no
enter/exit state to manage — `label` going null removes it.

**Placement and tokens.** `position: fixed`, `z-index: var(--z-toast)`,
`inset-block-end: var(--space-gap-group)`, centred with
`inset-inline: var(--space-gap-stack); margin-inline: auto; width: fit-content`,
capped at `--measure-heading`. `--space-inset-control` inside,
`--space-gap-stack` between its three parts, `--radius-card`,
`--surface-overlay` on `--elevation-3`, `--border-width-regular` of
`--border-subtle`.

**Elevation 3, not 2.** It outranks a sheet, so it must not read as a lifted card
sitting under one.

**`role="status"`, never `role="alert"`.** An undo offer is not urgent, and
assertive cuts across whatever the screen reader is already saying.

**One at a time, and it replaces.** A second toast while one is up replaces it.
No queue, no stacking, no collapsing into "2 items deleted". The undo model this
serves is *undo the last thing*, which is exactly what a single toast says — and
two stacked toasts on a 393px screen cover the control the user was aiming at.
The consequence, stated so it is a choice rather than a surprise: an earlier
action's undo offer leaves the screen while its own window is still open, and is
recoverable only until that window lapses.

**Dismissal is the consumer's.** The component holds no timer. Whatever owns the
undo window already has one, and a second timer can only disagree with it — the
same split §7.19 and §7.22 make with the recorder.

**Entrance** from `--motion-duration-base` / `--motion-ease-entrance`, travelling
`--motion-travel-sm`, so reduced motion flattens it with no query in the
component.

**Responsive behaviour.** None of its own beyond the `--measure-heading` cap and
the `--space-gap-stack` inline inset, which together keep it clear of both edges
at 393px.

**Degradation order, added when this landed.** The cap is right, but three parts
cannot sit side by side inside it: the **rigid** ones alone — a ~150px ghost
action, a 44px dismiss, two gaps and the inset — sum to ~274px against 262px,
before the text gets any width. So the toast **wraps** — text on its own row,
controls beneath and right-aligned — and stays one row when all three fit. The
text carries a `calc(--measure-heading / 2)` floor, which is what turns the
overflow into a wrap rather than a collapse; the action and dismiss hold their
size, so the dismiss keeps `--target-primary`. That is §7.22's rule applied: the
thing a thumb or a screen reader depends on is never what gives.

**Also a note for L15.** `min-inline-size: 0` on the text made the squeeze
invisible to the `scrollWidth` vs `clientWidth` check — 259/259 "fits" on a
layout where the label had collapsed to 1px and was painting across the action.
A flex part given a zero floor cannot overflow its parent, so the container-level
check cannot see it. The check needs a companion assertion on the elastic part's
own width, or the part needs a floor.

**A11y notes.** Dismiss follows §7.10's precedent exactly — a bare base-ui
`Button` dressed by `.musy-toast__dismiss`, not an Icon Button — so the two
dismiss affordances in the system cannot drift apart, and no tooltip appears
under a thumb. The action's label is its accessible name; do not add a second.

**What it is NOT.** Not a Message (that is in-flow), not a dialog (one action,
never two), not a queue, and not a notification centre.

**Reference implementation.** `components/Toast.tsx` and §23 of `components/musy-components.css` are where
this landed. `src/musie/MusieToast.tsx`
in the transcript workspace is the same pattern wired to a real undo window.
