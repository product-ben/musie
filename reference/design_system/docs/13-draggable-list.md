# 13 · Draggable List — §7.24 `[SEED]`

> **Landed.** Released as §7.24: `components/DraggableList.tsx`, §24 of
> `components/musy-components.css`, the exports in `components/index.ts`, and
> §7.24 of [`07-components.md`](07-components.md). `components/useCoarsePointer.ts`
> came with it — L5's pointer split had to reach React, because it also sizes the
> float spacer. This file is the spec it was built from.

**Purpose.** A list of short pieces of user content that the user rearranges,
merges, corrects and removes. The list *is* the editing surface: there is no
separate edit mode, no toolbar, and nothing opens in a dialog.

| Use it when | Use §7.12 Content List instead when |
| --- | --- |
| The order is the user's, and they change it by dragging | The order is fixed and the rows are read, not manipulated |
| Each row can be corrected, merged or deleted in place | Rows are label-and-value pairs |

**Where it came from.** The transcript workspace, where speech arrives as a
sequence of statements and the user tidies them afterwards. Every state below is
one that flow actually produces — see `#/states`, which is this component given
props.

**No new primitives.** It is Content Box, Icon Button, CTA Button, Toast and an
`<ol>`, arranged per [10 · Layout](10-layout.md) L3, L4, L5, L6 and L9. What
makes it a component rather than a composition is the **state machine** below:
twelve states, three of them mutually exclusive in a way that is easy to get
wrong by hand.

---

## Anatomy

```
ol.list                                            L3 — a real list
└── li                          per item
    ├── div.drop                [before]           L9 — absorbs the list gap
    ├── ContentBox              headlineHidden     L8 — heading present, invisible
    │   ├── div.row             flow-root, relative
    │   │   ├── p.text          ::before floats the spacer   L4
    │   │   └── div.tools       absolute, inline-end
    │   │       ├── IconButton  GripVertical · drag
    │   │       └── IconButton  ChevronDown  · aria-expanded, aria-controls
    │   └── div.actions--end    [id = aria-controls]         L6
    │       ├── CtaButton ghost Trash2  Delete
    │       └── CtaButton ghost Pencil  Edit
    └── div.drop                [after]
```

**Editing replaces the row's content, not the row.** The Content Box stays; its
interior swaps for Field's parts and an action row.

---

## The state matrix

### List

| State | Trigger | Treatment |
| --- | --- | --- |
| **Empty** | No items, nothing in flight | `ContentBox outline="dashed"` naming what will appear |
| **Waiting** | Capture heard something, no content back yet | The *same* dashed box, three pulsing dots (L10) |
| **Hearing** | Partial content arriving | The same dashed box, carrying the partial text |
| **Populated, read-only** | Capture is running | Items render with **no controls** — nothing is editable mid-capture |
| **Populated, editable** | Capture stopped | Controls appear on every item |

Empty, waiting and hearing are one box in three states on purpose: the page does
not change shape when content starts arriving.

### Item

| State | Trigger | Treatment |
| --- | --- | --- |
| **Rest** | editable, nothing open | Text, drag handle, chevron |
| **Actions open** | `menuOpen` | Chevron rotates 180°, Delete and Edit disclosed. **One item at a time** |
| **Editing, clean** | Edit pressed | Field's parts; Save `secondary` **and disabled** |
| **Editing, dirty** | Text differs from the original and is not blank | Save turns `primary`. Discard stays `secondary` |
| **Dragging** | Lifted | Stays in place at `opacity: 0.4` — the list must not reflow, or the positions measured at drag start go stale |
| **Merge target** | Another item over its middle half | Accent-2 `-subtle` fill, `-border` boundary |
| **Drop before / after** | Another item over its top or bottom quarter | `div.drop` above or below (L9) |

**Three are mutually exclusive and the component owns that.** An item cannot be
editing *and* open, editing *and* draggable, or a merge target *and* a drop
target. Controls disappear while editing; `dropMode` is one value, never two.

**Hit zones for the drag.** Outer quarters reorder, middle half merges. That
ratio is the component's, not the consumer's.

### Responsive and content

| State | Trigger | Treatment |
| --- | --- | --- |
| **Fine pointer** | `pointer: fine` | Controls at `--target-min` (L5) |
| **Coarse pointer** | `pointer: coarse` | Controls at `--target-primary`, and the whole item needs a short hold before it drags, so the page can still scroll (L13) |
| **Short item** | ≤ 80 characters | `body-sm` (L8's dense-list exception) |
| **Long item** | > 80 characters | `body-md`, and the text wraps around the controls then runs full width |

### Feedback

| State | Trigger | Treatment |
| --- | --- | --- |
| **Undo offered** | After a merge or a delete | [Toast](11-toast.md). One at a time, and it replaces |
| **Recoverable problem** | One item failed | `Message variant="warning"`, `live="polite"` |
| **Fatal problem** | The source stopped | `Message variant="error"`, `live="assertive"` |

---

## Props

| Prop | Type | Note |
|---|---|---|
| `items` | `{ id: string; text: string }[]` | `id` is required: reordering must survive re-render |
| `editable` | `boolean` | False while the source is still producing items |
| `onEdit` | `(id, text) => void` | |
| `onCombine` | `(sourceId, targetId, order) => void` | `order` is `'sourceFirst' \| 'targetFirst'` |
| `onMove` | `(sourceId, targetId, position) => void` | `position` is `'before' \| 'after'` |
| `onDelete` | `(id) => void` | |
| `pending` | `boolean` | Shows the waiting box |
| `partial` | `string` | Shows the hearing box |
| `emptyHeadline` / `emptyText` | `string` | The empty state's copy |

**Combining is direction-aware, and direction comes from list position, not from
the gesture.** Dragging an item down prepends its text; dragging up appends it.
Either way the merged text reads in the order the items appear on screen, which
is what the user is looking at. Deriving it from the gesture is the obvious
implementation and is wrong on a slow drag that crosses back over itself.

**Undo is the consumer's.** The component reports the change; whoever owns the
data owns the snapshot and the window. Same split as §7.19, §7.22 and Toast.

---

## A11y notes

- The list is `<ol>`, so the count and each position reach assistive tech
  instead of being drawn.
- Each item's Content Box keeps its heading, hidden (L8). It is what identifies
  the item in the outline, and it is announced before the controls.
- The chevron is a disclosure: `aria-expanded` on the trigger, `aria-controls`
  pointing at the region it opens, and a label that changes with the state.
- Every control names its item — "Drag statement 3", not "Drag".
- `user-select: none` on the item's text (L13). It is a drag surface, and a
  marquee starting under the finger beats the gesture to it.
- **Keyboard equivalents are specified and unverified.** Space lifts, arrows
  move, `M` merges into the item above, Escape cancels, and a live region
  announces each. Implemented in the reference, never tested — see
  `evidence.md`.

---

## What it is NOT

Not a table, not a sortable data grid, not a tree, and not a file list. It
assumes items are short prose the user wrote or spoke, and that reordering is
meaningful rather than a display preference.

---

## Reference implementation

`src/musie/` in the source repo — `MusieTranscriptWorkspace.tsx` is the list,
`MusieStatementCard.tsx` is the item, and `musie.css` carries every rule with
its reasoning in comments — it was the authority wherever it and the prose
differed. `#/states` renders all twenty-two states from that same component. The
seam between the layout and the speech behind it is in
[`16-workspace-source.md`](16-workspace-source.md).
