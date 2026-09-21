/**
 * Draggable List — Layer 2 · §7.24
 * No new primitives: Content Box, Icon Button, CTA Button, Toast and an <ol>,
 * arranged per Layer 3 L3, L4, L5, L6, L9 and L13.
 *
 * WHAT MAKES IT A COMPONENT RATHER THAN A COMPOSITION is the state machine.
 * Twelve states, and three pairs of them are mutually exclusive in a way that
 * is easy to get wrong by hand: an item cannot be editing AND open, editing AND
 * draggable, or a merge target AND a drop target. `dropMode` is ONE value,
 * never two, and the controls disappear while editing. That invariant is the
 * component's, not the consumer's.
 *
 * THE LIST IS THE EDITING SURFACE. No separate edit mode, no toolbar, nothing
 * opens in a dialog. Editing replaces the row's *content*, not the row: the
 * Content Box stays and its interior swaps for Field's parts and an action row.
 *
 * THE TEXT LEADS IN THE DOM AND FLOATS A SPACER (L4). The controls are
 * positioned into the gap it leaves. Floating the controls themselves is one
 * rule shorter and wrong: a float only operates from the front of the flow, so
 * it would put both buttons ahead of the sentence they act on for a screen
 * reader, on every item in the list.
 *
 * THE TEXT MUST STAY A PLAIN BLOCK. A flex or grid container establishes its
 * own formatting context and steps *around* the spacer instead of wrapping
 * beside it. This fails SILENTLY — the card just reverts to the flex-row
 * measurements — so if a float looks inert, look for a `display: flex` on the
 * text's wrapper first.
 *
 * COMBINING IS DIRECTION-AWARE, AND DIRECTION COMES FROM LIST POSITION, not
 * from the gesture. Dragging an item down prepends its text; dragging up
 * appends it. Either way the merged text reads in the order the items appear on
 * screen, which is what the user is looking at. Deriving it from the gesture is
 * the obvious implementation and is wrong on a slow drag that crosses back over
 * itself.
 *
 * UNDO IS THE CONSUMER'S. This reports the change; whoever owns the data owns
 * the snapshot and the window. Same split as §7.19, §7.22 and §7.23.
 *
 * EVERY WORD IT SPEAKS COMES FROM THE LOCALE CATALOGUE (src/locale.ts). Four of
 * them — Discard, Save, Delete, Edit — used to be hardcoded English in the JSX
 * with no prop, alongside the handle and chevron names and every keyboard
 * announcement, so a consumer who localised everything the props exposed still
 * shipped four English buttons. They are catalogue entries now; the props that
 * existed before still exist and still win.
 *
 * THE EDITOR COMPOSES ON FIELD'S PARTS, not on the Field component. That is the
 * system's own sanctioned pattern (§7.19 does it and says so). Note that it is
 * now a CHOICE rather than a necessity: before §7.16's controlled-value defect
 * was fixed, Field could not show existing text at all.
 */
import * as React from 'react';
import { ChevronDown, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { ContentBox } from './ContentBox';
import { CtaButton } from './CtaButton';
import { IconButton } from './IconButton';
import { useToolSize } from './useCoarsePointer';
import { useMusyText } from './locale';
import type { MusyTextCatalogue } from './locale';
import type { ToolSize } from './useCoarsePointer';

/** Where a dragged item will land relative to the item under the pointer. */
export type DropMode = 'before' | 'after' | 'combine';
export type CombineOrder = 'sourceFirst' | 'targetFirst';

export interface DropHints {
  combine: (position: number) => string;
  before: (position: number) => string;
  after: (position: number) => string;
  cancel: string;
}

export interface DraggableItem {
  /** REQUIRED. Reordering has to survive re-render, and an index cannot. */
  id: string;
  text: string;
}

export interface DraggableListProps {
  items: DraggableItem[];
  /** False while the source is still producing items — nothing is editable
   *  mid-capture, so no item renders a control. */
  editable?: boolean;
  onEdit?: (id: string, text: string) => void;
  onCombine?: (sourceId: string, targetId: string, order: CombineOrder) => void;
  onMove?: (sourceId: string, targetId: string, position: 'before' | 'after') => void;
  onDelete?: (id: string) => void;
  /** Shows the waiting box — heard something, no content back yet. */
  pending?: boolean;
  /** Shows the hearing box, carrying the partial text. */
  partial?: string;
  emptyHeadline?: string;
  emptyText?: string;
  /** The waiting and hearing states' copy. Same box, so same shell. */
  listeningLabel?: string;
  hearingLabel?: string;
  /**
   * The drag hint's wording, any subset of it. Each hint takes the target's
   * 1-based position, because "merge into 2" is the only thing that separates
   * a merge from a reorder while the finger is still down.
   *
   * Defaults come from the locale catalogue (src/locale.ts) — as do the four
   * row controls, the handle and chevron names and every keyboard
   * announcement, none of which had a prop at all before C.10.
   */
  dropHints?: Partial<DropHints>;
  /**
   * Opt into L8's dense-list exception *as L8 states it*: the step varies per
   * item, `body-sm` at 80 characters or fewer and `body-md` above.
   *
   * DEFAULT FALSE, which is a deliberate departure. Left on, the exception has
   * a cost the reference screen never hit: merging two short items crosses the
   * threshold, so text the user just combined gets bigger, and a size change on
   * unchanged content reads as a bug. Off, every item takes `body-sm` — one
   * size, and a merge changes the text and nothing else. Logged as conflict
   * B23.
   */
  dense?: boolean;
  /**
   * Heading level for each item's hidden headline. Pass it — the box cannot
   * know where it sits (1.3.1), and inside a wizard panel the question is the
   * heading, so this shifts down by one. See 14 · Reflect step.
   */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** What one item is called, for every control's accessible name. Defaults
   *  to the locale catalogue's noun. */
  itemNoun?: string;
  /** Accessible name for the list itself. Defaults to the catalogue's. */
  label?: string;
  className?: string;
}

/** The item's type step.
 *
 *  DEFAULT `body-sm`, ONE SIZE FOR EVERY ITEM. Layer 1 §4 sets a 17px floor and
 *  bars `body-sm` from essential prose, and L8 grants an exception for a
 *  scannable list item — but per item, by length, which is what made a merge
 *  re-size text the user had just combined. These are list items in a dense
 *  editing surface, so they take the exception's size UNCONDITIONALLY: one
 *  size, no jump on merge. `dense` restores L8's per-item behaviour.
 *  Conflict B23. */
const SCANNABLE_CHARS = 80;
export const itemTypeStep = (text: string, dense = false) =>
  dense ? (text.length <= SCANNABLE_CHARS ? 'body-sm' : 'body-md') : 'body-sm';

/** Outer quarters reorder, middle half merges. The ratio is the component's. */
function zoneFor(rect: DOMRect, y: number): DropMode {
  const offset = (y - rect.top) / rect.height;
  if (offset < 0.25) return 'before';
  if (offset > 0.75) return 'after';
  return 'combine';
}

export function DraggableList({
  items, editable = true, onEdit, onCombine, onMove, onDelete,
  pending = false, partial, headingLevel = 3,
  emptyHeadline, emptyText, listeningLabel, hearingLabel,
  itemNoun, label,
  dropHints, dense = false, className,
}: DraggableListProps) {
  const t = useMusyText();
  const noun = itemNoun ?? t.dragItemNoun;
  const listening = listeningLabel ?? t.dragListening;
  const hints: DropHints = {
    combine: dropHints?.combine ?? t.dropCombine,
    before: dropHints?.before ?? t.dropBefore,
    after: dropHints?.after ?? t.dropAfter,
    cancel: dropHints?.cancel ?? t.dropCancel,
  };
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dropTarget, setDropTarget] = React.useState<{ id: string; mode: DropMode } | null>(null);
  const [pointer, setPointer] = React.useState<{ x: number; y: number } | null>(null);
  /** One item's actions open at a time, so the list stays scannable. */
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [liveMessage, setLiveMessage] = React.useState('');
  const toolSize = useToolSize();

  const nodes = React.useRef(new Map<string, HTMLElement>());
  const registerItem = (id: string, el: HTMLElement | null) => {
    if (el) nodes.current.set(id, el);
    else nodes.current.delete(id);
  };

  /**
   * WHERE FOCUS GOES WHEN THE FOCUSED ROW STOPS EXISTING.
   *
   * Added from the app's side of the line, during F.5, because the fix
   * belongs to the component: a screen cannot reach a row's controls to
   * move focus between them without doing the thing rule 1 forbids.
   * Logged in apps/web/OPEN-QUESTIONS.md.
   *
   * Merging and deleting both END a row, and in both cases the control that
   * was operated is INSIDE it: M is pressed on the source item's handle, and
   * Delete is pressed in the source item's own menu. React unmounts that
   * button, the document loses its active element, and focus falls back to
   * <body>. From there a keyboard user is at the top of the page and has to
   * tab all the way back in — so the second merge costs what the first one
   * did not, and "reorder and merge without a mouse" is true exactly once.
   *
   * The id parked here is read after the commit that removed the row, and the
   * handle of the surviving item takes focus. It is a ref rather than state
   * because it must not cause a render of its own: it is read in the effect
   * that the render it describes has already scheduled.
   *
   * IT IS SET AT THE CALL SITES, NEVER INSIDE `combine`. A pointer drop also
   * ends a row, and nothing was focused during it — moving focus there would
   * scroll the page under somebody's finger for no reason.
   */
  const refocus = React.useRef<string | null>(null);
  React.useEffect(() => {
    const id = refocus.current;
    if (id === null) return;
    refocus.current = null;
    nodes.current.get(id)?.querySelector<HTMLElement>('.musy-dlist__handle')?.focus();
  });

  /** The row that should hold focus once `id` is gone: the one above it, or
   *  the one below when `id` was first. Undefined when it was the only one. */
  const neighbourOf = (id: string) => {
    const i = items.findIndex((item) => item.id === id);
    return (items[i - 1] ?? items[i + 1])?.id;
  };

  /** Delete, with the focus hand-off the plain callback cannot do. The guard
   *  matters: with no `onDelete` the row does not go anywhere, and moving
   *  focus off the button that was pressed would be a jump with no cause. */
  const removeItem = (id: string) => {
    if (!onDelete) return;
    refocus.current = neighbourOf(id) ?? null;
    setOpenMenuId(null);
    onDelete(id);
  };

  const indexOf = (id: string) => items.findIndex((i) => i.id === id);

  /** Direction from list position, never from the gesture — see the header. */
  const combine = (sourceId: string, targetId: string) => {
    const from = indexOf(sourceId);
    const to = indexOf(targetId);
    onCombine?.(sourceId, targetId, from < to ? 'sourceFirst' : 'targetFirst');
  };

  const endDrag = () => {
    setDraggingId(null);
    setDropTarget(null);
    setPointer(null);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!draggingId) return;
    setPointer({ x: event.clientX, y: event.clientY });
    let found: { id: string; mode: DropMode } | null = null;
    for (const [id, el] of nodes.current) {
      if (id === draggingId) continue;
      const rect = el.getBoundingClientRect();
      if (event.clientY >= rect.top && event.clientY <= rect.bottom) {
        found = { id, mode: zoneFor(rect, event.clientY) };
        break;
      }
    }
    setDropTarget(found);
  };

  const onPointerUp = () => {
    if (draggingId && dropTarget) {
      if (dropTarget.mode === 'combine') combine(draggingId, dropTarget.id);
      else onMove?.(draggingId, dropTarget.id, dropTarget.mode);
    }
    endDrag();
  };

  /**
   * THE KEYBOARD EQUIVALENT OF THE DRAG. Space or Enter lifts, arrows move, M
   * merges into the item above, Escape cancels, and each one is announced in
   * the live region at the foot of this component.
   *
   * ALL FIVE WERE ALREADY HERE before F.5 went looking for them, which is the
   * whole argument for the app consuming this rather than restyling a card:
   * the proof-of-concept's own statement card had none of them, and the app
   * gets them by passing `items`.
   *
   * WHAT F.5 ADDED IS WHERE FOCUS GOES AFTERWARDS — see `refocus` above. M
   * ends the row the key was pressed in, and without the hand-off the second
   * merge starts from <body>.
   *
   * STILL NOT VERIFIED WITH A SCREEN READER. See 13 · Layout evidence, "What
   * is not evidenced". The announcements are strings in a live region, which
   * is a construction, not a measurement.
   */
  const onHandleKeyDown = (id: string) => (event: React.KeyboardEvent) => {
    const i = indexOf(id);
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      const lifting = draggingId !== id;
      setDraggingId(lifting ? id : null);
      setLiveMessage(lifting ? t.dragLifted(noun, i + 1) : t.dragDropped(noun, i + 1));
      return;
    }
    if (event.key === 'Escape' && draggingId) {
      event.preventDefault();
      endDrag();
      setLiveMessage(t.dragCancelled);
      return;
    }
    if (draggingId !== id) return;
    if (event.key === 'ArrowUp' && i > 0) {
      event.preventDefault();
      onMove?.(id, items[i - 1].id, 'before');
      setLiveMessage(t.dragMoved(noun, i));
      return;
    }
    if (event.key === 'ArrowDown' && i < items.length - 1) {
      event.preventDefault();
      onMove?.(id, items[i + 1].id, 'after');
      setLiveMessage(t.dragMoved(noun, i + 2));
      return;
    }
    if ((event.key === 'm' || event.key === 'M') && i > 0) {
      event.preventDefault();
      /* This row is about to stop existing, and the key that ended it was
         pressed on a control inside it. Park the survivor. */
      refocus.current = items[i - 1].id;
      combine(id, items[i - 1].id);
      endDrag();
      setLiveMessage(t.dragMerged(noun, i));
    }
  };

  const waiting = (pending || Boolean(partial)) && !draggingId;
  const dragged = items.find((i) => i.id === draggingId);

  /**
   * The action half of the drag hint. Phrased as what a release WOULD do, not
   * as what is happening — the user is still deciding, and naming the target
   * position is the only thing that distinguishes a merge from a reorder
   * before they commit. The drop indicator is at the target; this is under the
   * finger, where the eye already is.
   */
  const dragHint = !draggingId ? ''
    : !dropTarget ? hints.cancel
    : dropTarget.mode === 'combine' ? hints.combine(indexOf(dropTarget.id) + 1)
    : dropTarget.mode === 'before' ? hints.before(indexOf(dropTarget.id) + 1)
    : hints.after(indexOf(dropTarget.id) + 1);

  return (
    <div
      className={['musy-dlist', className ?? ''].filter(Boolean).join(' ')}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={endDrag}
    >
      {/* Empty, waiting and hearing are ONE box in three states on purpose: the
          page must not change shape when content starts arriving (L10) — which
          is also why the headline is hidden in all three rather than appearing
          with the state. Sunken, not raised: this is a hole waiting to be
          filled, not a card. */}
      {items.length === 0 && !waiting ? (
        <ContentBox
          outline="dashed"
          className="musy-dlist__empty"
          headline={emptyHeadline ?? t.dragEmptyHeadline}
          headlineHidden
          headingLevel={headingLevel}
          text={emptyText ?? t.dragEmptyText}
          textStep="body-sm"
        />
      ) : (
        <ol className="musy-dlist__list" aria-label={label ?? t.dragListLabel}>
          {items.map((item, index) => {
            const mode = dropTarget?.id === item.id ? dropTarget.mode : null;
            return (
              <li key={item.id}>
                {mode === 'before' && <div className="musy-dlist__drop" aria-hidden="true" />}
                <DraggableListRow
                  item={item}
                  position={index + 1}
                  itemNoun={noun}
                  text={t}
                  headingLevel={headingLevel}
                  dense={dense}
                  editable={editable}
                  dragging={draggingId === item.id}
                  mergeTarget={mode === 'combine'}
                  menuOpen={openMenuId === item.id}
                  onToggleMenu={() =>
                    setOpenMenuId((current) => (current === item.id ? null : item.id))
                  }
                  toolSize={toolSize}
                  onSave={(text) => onEdit?.(item.id, text)}
                  onDelete={() => removeItem(item.id)}
                  onLift={() => setDraggingId(item.id)}
                  onHandleKeyDown={onHandleKeyDown(item.id)}
                  registerRef={(el) => registerItem(item.id, el)}
                />
                {mode === 'after' && <div className="musy-dlist__drop" aria-hidden="true" />}
              </li>
            );
          })}
        </ol>
      )}

      {waiting && (
        <ContentBox
          outline="dashed"
          className="musy-dlist__empty"
          headline={partial ? (hearingLabel ?? t.dragHearing) : listening}
          headlineHidden
          headingLevel={headingLevel}
          text={partial || listening}
          textStep="body-sm"
        >
          {!partial && (
            /* L10: three dots, and under reduced motion the pulse is DROPPED
               rather than shortened — Layer 1 collapses every duration to 1ms,
               which on a loop strobes. */
            <span className="musy-dlist__dots" aria-label={listening}>
              <span /><span /><span />
            </span>
          )}
        </ContentBox>
      )}

      {/* Follows the finger, and carries BOTH halves of the gesture: which item
          is moving, and what releasing would do. */}
      {dragged && pointer && (
        <div
          className="musy-dlist__preview"
          style={{ left: pointer.x, top: pointer.y }}
          aria-hidden="true"
        >
          <span className="musy-dlist__preview-item">
            {t.dragItemLabel(noun, indexOf(dragged.id) + 1)}
          </span>
          <span className="musy-dlist__preview-text">{dragged.text}</span>
          <span className="musy-dlist__preview-action">{dragHint}</span>
        </div>
      )}

      <span className="musy-sr-only" role="status" aria-live="polite">{liveMessage}</span>
    </div>
  );
}

interface RowProps {
  item: DraggableItem;
  position: number;
  itemNoun: string;
  /** Passed down rather than re-read: one lookup per list, not per row. */
  text: MusyTextCatalogue;
  headingLevel: 2 | 3 | 4 | 5 | 6;
  dense: boolean;
  editable: boolean;
  dragging: boolean;
  mergeTarget: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  toolSize: ToolSize;
  onSave: (text: string) => void;
  onDelete: () => void;
  onLift: () => void;
  onHandleKeyDown: (event: React.KeyboardEvent) => void;
  registerRef: (el: HTMLElement | null) => void;
}

function DraggableListRow({
  item, position, itemNoun, text: t, headingLevel, dense, editable, dragging, mergeTarget,
  menuOpen, onToggleMenu, toolSize, onSave, onDelete, onLift, onHandleKeyDown,
  registerRef,
}: RowProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(item.text);
  const reactId = React.useId();
  const menuId = `musy-dlist-menu-${reactId}`;
  const fieldId = `musy-dlist-field-${reactId}`;

  /** Seeded on OPEN rather than synced: a merge can rewrite the item while the
   *  editor is closed, and the draft must not be stale when it reopens. */
  const startEditing = () => { setDraft(item.text); setEditing(true); };
  const save = () => { onSave(draft); setEditing(false); };
  const discard = () => { setDraft(item.text); setEditing(false); };

  /** Primary only once there is something to save. Until then Save and Discard
   *  do the same thing, so they should look alike (L6). */
  const dirty = draft.trim() !== item.text && draft.trim() !== '';
  const controls = editable && !editing;

  return (
    <ContentBox
      headline={t.dragItemLabel(itemNoun, position)}
      headlineHidden
      headingLevel={headingLevel}
      className={[
        'musy-dlist__item',
        dragging ? 'musy-dlist__item--dragging' : '',
        mergeTarget ? 'musy-dlist__item--merge-target' : '',
      ].filter(Boolean).join(' ')}
      /* base-ui composition: the measurement ref goes onto the element the
         system already renders, not a wrapper around it. The rect measured at
         drag start has to be the card's own. */
      render={<article ref={registerRef as never} />}
    >
      <div className="musy-dlist__row" data-size={toolSize}>
        {editing ? (
          <div className="musy-dlist__editor">
            <div className="musy-field">
              <label className="musy-field__label" htmlFor={fieldId}>
                {t.dragItemLabel(itemNoun, position)}
              </label>
              <textarea
                id={fieldId}
                className="musy-field__control musy-field__control--textarea"
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                data-filled={draft ? '' : undefined}
              />
            </div>
            {/* L6: right-aligned, Save outermost, Discard leading in the DOM so
                tab order matches the screen. */}
            <div className="musy-dlist__actions musy-dlist__actions--end">
              <CtaButton variant="secondary" onClick={discard}>{t.dragDiscard}</CtaButton>
              <CtaButton variant={dirty ? 'primary' : 'secondary'} disabled={!dirty} onClick={save}>
                {t.dragSave}
              </CtaButton>
            </div>
          </div>
        ) : (
          /* A PLAIN BLOCK, deliberately — see the header. */
          <p className="musy-dlist__text" data-type-step={itemTypeStep(item.text, dense)}>
            {item.text}
          </p>
        )}

        {controls && (
          <div className="musy-dlist__tools" data-size={toolSize}>
            <IconButton
              glyph={GripVertical}
              label={t.dragHandleLabel(itemNoun, position)}
              variant="ghost"
              size={toolSize}
              className="musy-dlist__handle"
              onPointerDown={onLift}
              onKeyDown={onHandleKeyDown}
            />
            <IconButton
              glyph={ChevronDown}
              label={menuOpen ? t.dragHideActions(itemNoun, position)
                              : t.dragShowActions(itemNoun, position)}
              variant="ghost"
              size={toolSize}
              className="musy-dlist__chevron"
              aria-expanded={menuOpen}
              aria-controls={menuOpen ? menuId : undefined}
              onClick={onToggleMenu}
            />
          </div>
        )}
      </div>

      {controls && menuOpen && (
        /* L6 again: Edit outermost, Delete leading in the DOM. That puts a
           destructive action first in the tab order, which is accepted —
           Toast's undo (L11) is a better safety net than a confirm dialog
           nobody reads. */
        <div className="musy-dlist__actions musy-dlist__actions--end" id={menuId}>
          <CtaButton variant="ghost" leadingIcon={Trash2} onClick={onDelete}>{t.dragDelete}</CtaButton>
          <CtaButton variant="ghost" leadingIcon={Pencil} onClick={startEditing}>{t.dragEdit}</CtaButton>
        </div>
      )}
    </ContentBox>
  );
}
