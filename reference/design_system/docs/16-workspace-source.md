# 16 · The record · transcribe · edit screen — source notes

> The screen §7.24 was extracted from, as the handoff described it. Kept
> because its "three things that will look wrong until you know why" are the
> traps in L4, L8 and L13 — and the first of them fails silently. File paths
> below are the source repo's, not this package's.

The screen every rule in this handoff came from, as source. Two things live
here, and the difference matters:

| | |
| --- | --- |
| **A component to take into the system** | The draggable list — spec in [`../13-draggable-list.md`](../13-draggable-list.md) |
| **A screen that composes it** | Record Button on top, the list below, a toast over both |

---

## Files

| File | What it is |
| --- | --- |
| `src/MusieTranscriptWorkspace.tsx` | The list, plus the capture control and the feedback around it |
| `src/MusieStatementCard.tsx` | One item. The accordion, the editor, the float geometry |
| `src/MusieToast.tsx` | The undo toast — package-ready version in [`../toast/`](../toast) |
| `src/musie.css` | **Every rule in `10-layout.md`, working, with the reasoning in comments.** If the doc and this file disagree, this file is right |
| `src/useCoarsePointer.ts` | The pointer split behind L5 |
| `src/theme.ts` | `data-theme` scoped to the page rather than `<html>` (L1) |
| `src/MusiePage.tsx` | The page shell — skeleton, key field, theme switch |
| `src/sentence-types.ts` | The item shape |

Canonical copies are in `src/musie/` of the repo; these are a snapshot so this
folder stands alone.

---

## The seam

The screen is split so the design side has no opinion about speech, and the
speech side has no opinion about layout:

```
useTranscription()            ← microphone, socket, timers, the 60s cap
        │  session
        ▼
MusieTranscriptWorkspace      ← everything you can see
        │  items, callbacks
        ▼
MusieStatementCard × n
```

`session` is one object carrying `status`, `sentences`, `interim`, `pending`,
`error`, `warning`, `stopReason`, `levels`, `secondsLeft`, and the callbacks that
change them. **A design agent never needs to open the hooks** — every state they
produce is rendered at `#/states`, and listed in `13-draggable-list.md`.

The same split is what §7.19, §7.22 and Toast already do: the component owns the
state machine and its presentation, the app owns the media and the clock.

---

## Three things that will look wrong until you know why

1. **The controls are positioned, not floated.** The text floats a `::before`
   spacer the size of the control cluster and the controls sit in the gap. That
   is L4, and it exists so the text leads in the DOM — a float only operates from
   the front of the flow, and floating the controls themselves puts both buttons
   ahead of the sentence for a screen reader.
2. **The item's text must stay a plain block.** Wrap it in a flex or grid
   container and it establishes its own formatting context, steps *around* the
   spacer, and the card silently reverts to a narrow column. Nothing in the
   container-level measurements shows this — only the per-line widths do.
3. **Two items in one list can be different type steps.** ≤ 80 characters is
   `body-sm`, longer is `body-md`. That is L8's dense-list exception, and the
   size tracks how much there is to read rather than where the item sits.

---

## Running it

The screen needs an OpenAI key to capture, but **nothing about the layout does**.
`#/states` renders all twenty-two states with no key, no microphone and no
network.

```
#/musie    the working screen
#/states   every state of the list and its items
#/rules    each layout decision, as the side-by-side that settled it
```

Live at https://product-ben.github.io/musie-voice-to-text-demo/
