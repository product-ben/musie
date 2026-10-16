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
 * ── THE STOP IS THE FIRST ROW, NOT THE LAST ───────────────────────────────
 * From level 2 down the slot is handed an extra option first: *einfach nur
 * {parent}*. Somebody who has already found their word should not have to
 * read past six narrower ones to say so, and the top of the list is where
 * that costs nothing.
 *
 * ── THE CONSUMER OWNS WHAT HAPPENS AFTER ──────────────────────────────────
 * `onPick` reports the full path and nothing else. "Show two buttons once
 * something has been picked" is a fact about the reflect flow, not about
 * drill-downs — the same split Sheet makes with its index, for the same
 * reason.
 *
 * ── ESCAPE IS NOT TAKEN ───────────────────────────────────────────────────
 * It belongs to whatever surface this is inside — Lightbox, in the one
 * consumer that exists. Going up a level must never race closing the sheet,
 * so the back row is the only way up and it is an ordinary button.
 */
import * as React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Icon } from './Icon';

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
  /** Call with a row's `value`. This component decides descend vs pick. */
  onChoose: (value: string) => void;
  /** Null at the first level. */
  parent: DrillDownNode | null;
  /** 0 at the first level. The slot needs it for a key and nothing else. */
  depth: number;
  /**
   * Nothing is ever pre-checked, and this says so out loud so a slot can pass
   * it straight through as `value`. A level returned to shows no selection:
   * what was picked there is no longer what is being asked.
   */
  value: undefined;
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

/** The value the stop row carries. Cannot collide: no wheel id contains a space. */
const STOP = '\u0000stop';

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
         to seven other words. */
      disabled: (node.children?.length ?? 0) === 0 && held.has(node.id),
    }));
    if (parent === null) return rows;
    return [
      {
        value: STOP,
        label: stopLabel(parent.label),
        drillDown: false,
        disabled: held.has(parent.id),
      },
      ...rows,
    ];
  }, [siblings, parent, held, stopLabel]);

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

  const choose = React.useCallback((value: string) => {
    if (value === STOP) {
      if (parent !== null) onPick(path);
      return;
    }
    const node = siblings.find((n) => n.id === value);
    if (node === undefined) return;
    if ((node.children?.length ?? 0) > 0) setPath([...path, node]);
    else onPick([...path, node]);
  }, [parent, path, siblings, onPick]);

  const up = React.useCallback(() => {
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

      {parent !== null && (
        <button
          type="button"
          className="musy-drilldown__back"
          onClick={up}
        >
          <Icon glyph={ChevronLeft} size="sm" />
          <span>{backLabel(parent.label)}</span>
        </button>
      )}

      <div ref={bodyRef} className="musy-drilldown__body">
        {children({
          options,
          onChoose: choose,
          parent,
          depth: path.length,
          value: undefined,
        })}
      </div>
    </div>
  );
}
