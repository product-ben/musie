/**
 * Drill Down — Layer 2
 *
 * A tree narrowed one level at a time. The list on screen is replaced as you
 * descend; a back row above it carries the word you came from.
 *
 * Built for the reflect step's 128-word emotion wheel — 8 primary feelings,
 * 40 below them, 80 below those — where the whole problem is that reading
 * 128 words is not how anyone finds the one they mean.
 *
 * ── IT DRAWS NO ROWS. THAT IS THE DESIGN ──────────────────────────────────
 * Ben, 2026-10-16: *"It is built in storybook in a way (with a slot), that
 * later also other selection components could be used within."*
 *
 * So this file imports no selection component at all. It owns the stack, the
 * back row, the stop row, the announcement and the focus move; `children` is
 * a function handed the level to draw. The feelings sheet passes a
 * `RadioGroupText`; a later consumer could pass `RadioCards` without a line
 * changing here.
 *
 * There is NO DEFAULT slot. A default would mean importing one selection
 * component, which is the single thing the slot exists to avoid — and it
 * would make the generic case the unusual one.
 *
 * ── EACH LEVEL IS ITS OWN QUESTION ────────────────────────────────────────
 * This reverses a draft of the plan that made the rows plain buttons, on the
 * argument that a radio which moves you misreports itself. Ben's ruling: the
 * rows are radios with a trailing arrow. The argument is answered rather than
 * dropped — a level is its own group with its own legend, so within the
 * question on screen, choosing *Optimistisch* IS a choice. Its consequence is
 * that the next question is asked. `RadioGroupText`'s `drillDown` option
 * carries the arrow and the accessible suffix that tells the two kinds of row
 * apart without sight.
 *
 * ── THE STOP IS THE FIRST ROW, AND IT ARRIVES CHECKED ─────────────────────
 * From level 2 down the slot is handed an extra option first: *einfach nur
 * {parent}*. Somebody who has already found their word should not have to
 * read past six narrower ones to say so, and the top of the list is where
 * that costs nothing.
 *
 * IT IS PRE-CHECKED — Ben, 2026-10-16. Arriving at a level, the answer you
 * already have is the one offered: narrowing further is the opt-in, not the
 * default. That reverses an earlier note in this file which said nothing is
 * ever pre-checked, and the reversal is the point of the change.
 *
 * WHICH IS WHY THE SLOT NEEDS `onActivate` AND NOT ONLY `onChoose`. A
 * pre-checked row fires no `change` when it is clicked — it is a native
 * radio underneath — so the one row the level is built around would be the
 * one row that did nothing. `RadioGroupText.onOptionActivate` is the event
 * this component actually acts on; `onHighlight` is only the arrow keys
 * moving the selection, which must NOT navigate.
 *
 * ── ONE PICK PER VISIT TO A LEVEL ────────────────────────────────────────
 * Ben: *"only one option can be selected in one go. Before selecting another
 * one, the user needs to click Weiteres Gefühl festhalten."* So a pick locks
 * the level — every row goes disabled — and only a remount clears it.
 *
 * The consumer never sees the lock on a STOP pick, because a stop means "I
 * am done" and the sheet closes on it. It is the leaf case this is for: pick
 * *Kraftvoll* and the list stops accepting a second tap rather than letting
 * four feelings be collected in four fast taps nobody meant.
 *
 * ── THE CONSUMER OWNS WHAT HAPPENS AFTER ──────────────────────────────────
 * `onPick` reports the full path and nothing else. "Show two buttons once
 * something has been picked" is a fact about the reflect flow, not about
 * drill-downs — the same split Sheet makes with its index, for the same
 * reason.
 *
 * STOP OR LEAF IS READ OFF THE PATH, not signalled by a second argument: the
 * last node of a stop pick still HAS children (that is what was stopped
 * above), and a leaf has none. So a consumer that wants to close on one and
 * not the other already has what it needs, and this component keeps one
 * callback.
 *
 * ── ESCAPE IS NOT TAKEN ───────────────────────────────────────────────────
 * It belongs to whatever surface this is inside — Lightbox, in the one
 * consumer that exists. Going up a level must never race closing the sheet,
 * so the back row is the only way up and it is an ordinary button.
 */
import * as React from 'react';
import { ChevronLeft } from 'lucide-react';
import { CtaButton } from './CtaButton';

export interface DrillDownNode {
  /** Stable within its siblings. The React key, and what `value` carries. */
  id: string;
  label: string;
  /** Absent or empty means this is a leaf: choosing it picks. */
  children?: readonly DrillDownNode[];
}

/** One row offered to the slot. Mirrors `RadioOption`'s shape on purpose. */
export interface DrillDownOption {
  value: string;
  label: string;
  /** True for a row that descends — the slot draws the arrow. */
  drillDown: boolean;
  disabled?: boolean;
}

/** What the slot is handed for the level currently on screen. */
export interface DrillDownLevel {
  /** The rows, the stop row already first when there is a parent. */
  options: readonly DrillDownOption[];
  /**
   * A row was ACTIVATED — clicked, or Enter/Space. This is what descends or
   * picks; see the header for why it is not the change event.
   */
  onChoose: (value: string) => void;
  /**
   * The arrow keys moved the checked row. Highlight only: it must never
   * navigate, or a keyboard user cannot read the list without being taken
   * somewhere by every row they pass.
   */
  onHighlight: (value: string) => void;
  /** Null at the first level. */
  parent: DrillDownNode | null;
  /** 0 at the first level. The slot needs it for a key and nothing else. */
  depth: number;
  /**
   * What is checked right now — pass it straight through as the slot's
   * `value`. The stop row at every level below the first, until the arrow
   * keys move it.
   *
   * NEVER `undefined`, AND THAT IS NOT A STYLE CHOICE. The first level has
   * no stop row and nothing checked, which is `''` here rather than the
   * `undefined` it reads as. base-ui's `useControlled` decides whether a
   * component is controlled ONCE, on its first render:
   *
   *     const { current: isControlled } = React.useRef(controlled !== undefined);
   *
   * So a slot handed `undefined` at level 1 mounts an UNCONTROLLED group,
   * and every value after it — including the pre-checked stop — is ignored
   * for the lifetime of that element. Measured in the browser: the stop row
   * rendered unchecked with the right value on both sides of the comparison.
   *
   * `''` matches no option, so nothing is checked and the group is
   * controlled from the first render.
   */
  value: string;
  /** A pick has happened here: every row is disabled until a remount. */
  locked: boolean;
}

export interface DrillDownProps {
  nodes: readonly DrillDownNode[];
  /** A leaf or a stop row was chosen. The whole path, root first. */
  onPick: (path: readonly DrillDownNode[]) => void;
  /** THE SLOT. See the header — there is deliberately no default. */
  children: (level: DrillDownLevel) => React.ReactNode;
  /** Rule 7 — the stop row's label, e.g. `(p) => `einfach nur ${p}``. */
  stopLabel: (parent: string) => string;
  /** Rule 7 — the back row's label, e.g. `(p) => `Zurück zu ${p}``. */
  backLabel: (parent: string) => string;
  /** Rule 7 — the live region, e.g. `(p, n) => `${p} — ${n} Gefühle``. */
  levelLabel: (parent: string, count: number) => string;
  /**
   * Nodes already held elsewhere. Passed to the slot as `disabled`, matched
   * on `id` — so the wheel can refuse a feeling somebody is already holding
   * without this component knowing what holding one means.
   */
  disabledIds?: readonly string[];
  className?: string;
}

/**
 * The value the stop row carries.
 *
 * NOT A CONTROL CHARACTER. It was `\u0000stop`, which is unforgeable and also
 * unusable: the value reaches a real `<input type="radio" value=…>`, and a
 * NUL does not survive the round trip through the DOM — the row rendered
 * with no value and could never read as checked. Measured in the browser,
 * which is the only place it shows.
 *
 * Collision-proof by SHAPE instead: a consumer's ids are its own, and this
 * one contains characters an id built by `nodeId()` cannot.
 */
const STOP = '::drilldown-stop::';

export function DrillDown({
  nodes, onPick, children,
  stopLabel, backLabel, levelLabel,
  disabledIds, className,
}: DrillDownProps) {
  /**
   * THE PATH TAKEN SO FAR, root first — the one piece of state here.
   * Empty means the first level. Everything else is derived from it, so there
   * is no second fact that could disagree about where we are.
   */
  const [path, setPath] = React.useState<readonly DrillDownNode[]>([]);

  /**
   * WHICH ROW IS CHECKED. Not derived from `path` — the arrow keys move it,
   * and a controlled value that ignored them would snap the selection back
   * under the user's hands on every keypress.
   *
   * `null` is "this level has not been touched", which resolves to the stop
   * row below. A real `undefined` after that would be indistinguishable from
   * it, which is why this is null and not undefined.
   */
  const [highlight, setHighlight] = React.useState<string | null>(null);

  /** A pick has happened at this level. Cleared only by a remount. */
  const [locked, setLocked] = React.useState(false);

  const parent = path.length > 0 ? path[path.length - 1] : null;
  /* MEMOISED, because `parent.children ?? []` mints a new empty array on
     every render for a leaf — which would make the options below, and the
     callback that reads them, change identity on every render for exactly
     the case where nothing is happening. */
  const siblings = React.useMemo(
    () => (parent === null ? nodes : (parent.children ?? [])),
    [parent, nodes],
  );

  const held = React.useMemo(() => new Set(disabledIds ?? []), [disabledIds]);

  const options = React.useMemo<DrillDownOption[]>(() => {
    const rows: DrillDownOption[] = siblings.map((node) => ({
      value: node.id,
      label: node.label,
      drillDown: (node.children?.length ?? 0) > 0,
      /* A LEAF CAN BE DISABLED, A BRANCH NEVER IS. Holding "Kraftvoll"
         already must not shut the door on "Optimistisch", which is the route
         to seven other words. And a LOCKED level disables everything — one
         pick per visit. */
      disabled: locked || ((node.children?.length ?? 0) === 0 && held.has(node.id)),
    }));
    if (parent === null) return rows;
    return [
      {
        value: STOP,
        label: stopLabel(parent.label),
        drillDown: false,
        disabled: locked || held.has(parent.id),
      },
      ...rows,
    ];
  }, [siblings, parent, held, stopLabel, locked]);

  /**
   * THE STOP IS CHECKED ON ARRIVAL, below the first level — Ben, 2026-10-16.
   * The answer you already have is the one offered; narrowing further is the
   * opt-in. `highlight` wins once the arrow keys have moved it.
   *
   * ── THE HIGHLIGHT IS VALIDATED AGAINST THIS LEVEL, NOT TRUSTED ─────────
   * A click fires BOTH events — the change that sets the highlight and the
   * activation that descends — and nothing guarantees which React runs
   * first. If the change lands last, `highlight` holds a row id belonging to
   * the level we just LEFT, and the new level renders with nothing checked.
   *
   * Measured: that is exactly what happened. Clearing the highlight inside
   * `choose` is not enough, because the clear can be overwritten by the very
   * event it is trying to cancel. Checking membership cannot lose that race:
   * a value that is not on screen is not a selection, whenever it arrived.
   */
  const value = React.useMemo(() => {
    if (highlight !== null && options.some((o) => o.value === highlight)) return highlight;
    /* `''` and not `undefined` at the first level — see `DrillDownLevel.value`
       for why that distinction is load-bearing rather than cosmetic. */
    return parent === null ? '' : STOP;
  }, [highlight, options, parent]);

  /**
   * ── FOCUS GOES TO THE NEW LEVEL, AND IT IS MEASURED FROM THE DOM ────────
   * Not a ref handed to the slot: the slot renders whatever it likes, so this
   * component cannot know which element is the first row. It asks the
   * container for the first focusable thing inside it instead.
   *
   * Skipped on the FIRST render — arriving at level 1 should leave focus
   * wherever the surface put it, which for a sheet is the sheet. Only a level
   * CHANGE moves it.
   */
  const bodyRef = React.useRef<HTMLDivElement | null>(null);
  const firstRender = React.useRef(true);
  React.useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const first = bodyRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), [role="radio"]:not([aria-disabled="true"])'
    );
    first?.focus();
  }, [path]);

  const choose = React.useCallback((chosen: string) => {
    if (locked) return;
    if (chosen === STOP) {
      if (parent === null) return;
      setLocked(true);
      onPick(path);
      return;
    }
    const node = siblings.find((n) => n.id === chosen);
    if (node === undefined) return;
    if ((node.children?.length ?? 0) > 0) {
      /* DESCENDING RESETS THE HIGHLIGHT, so the new level arrives on its own
         stop rather than inheriting the row that was checked to get here. */
      setHighlight(null);
      setPath([...path, node]);
      return;
    }
    setLocked(true);
    onPick([...path, node]);
  }, [locked, parent, path, siblings, onPick]);

  const up = React.useCallback(() => {
    setHighlight(null);
    setPath((current) => current.slice(0, -1));
  }, []);

  /**
   * RESET, FOR THE CONSUMER THAT ASKS FOR ANOTHER ONE. Exposed by remounting
   * rather than by a method: the feelings sheet changes this component's
   * `key` after *Weiteres Gefühl festhalten*, which is the React way to say
   * "the same component, a fresh start", and it needs no imperative handle.
   */

  return (
    <div className={['musy-drilldown', className ?? ''].filter(Boolean).join(' ')}>
      {/* THE ANNOUNCEMENT. Polite and off-screen: a sighted reader sees the
          list change, and nobody else would know it had. Keyed by depth so
          the same text at two depths still re-announces. */}
      <p className="musy-sr-only" role="status" aria-live="polite">
        {parent === null ? '' : levelLabel(parent.label, options.length)}
      </p>

      {/* ── THE WAY UP, AS A SMALL GHOST CTA — Ben, 2026-10-16 ──────────
          It was a bespoke `.musy-drilldown__back` button with its own ink,
          padding and hover, which is this component re-deriving a control
          the system already ships. `size="min"` and `variant="ghost"` are
          that control, and they come with the focus ring, the pressed state
          and the disabled handling for free.

          It carries the word you came from, which is the thing that says
          where "up" goes, and `leadingIcon` is the system's own slot for the
          chevron — not an Icon dropped inside a button. */}
      {parent !== null && (
        <CtaButton
          className="musy-drilldown__back"
          variant="ghost"
          size="min"
          leadingIcon={ChevronLeft}
          onClick={up}
        >
          {backLabel(parent.label)}
        </CtaButton>
      )}

      <div ref={bodyRef} className="musy-drilldown__body">
        {children({
          options,
          onChoose: choose,
          onHighlight: setHighlight,
          parent,
          depth: path.length,
          value,
          locked,
        })}
      </div>
    </div>
  );
}
