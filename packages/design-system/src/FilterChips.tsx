/**
 * Filter Chips — Layer 2
 * base-ui: CheckboxGroup + Checkbox at level 2; a plain disclosure button at
 * level 1 (+ Fieldset when the set is labelled).
 * APG patterns: Disclosure (https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
 * for the level-1 chip, and a labelled group of checkboxes for level 2.
 *
 * TWO LEVELS, NOT TWO COMPONENTS. Level 1 is the DIMENSION — what is being
 * filtered on. Pressing it opens that dimension's level-2 row underneath, and
 * level 2 is the VALUES, several of which can be on at once. Only one dimension
 * is open at a time: the level-2 row is one strip below the whole level-1 row,
 * so two open dimensions would have to share it.
 *
 * NOT A SEGMENTED CONTROL, and the difference is the question each answers.
 * §15 asks "which one?" and takes an answer the surrounding form carries —
 * a RadioGroup, two to four options, every option visible at once, equal
 * widths. This asks "which of these, and how many?" — a CheckboxGroup, any
 * number of dimensions, scrolled rather than divided. The two share their
 * BUILD-UP (the rungs below, the accent families, the chip anatomy) and share
 * no semantics at all.
 *
 * ── WHAT IS CONTROLLED, AND WHAT IS NOT ────────────────────────────────────
 * The SELECTION is controlled, exactly as §15's is: it is the query the screen
 * runs, and only the screen can own it. Pass `value` and `onValueChange` or
 * nothing moves — in a story that is correct, and it is why every state below
 * is reachable from props alone.
 *
 * WHICH DIMENSION IS OPEN is presentation, and this component owns it unless
 * asked not to. `open` makes it controlled, `defaultOpen` seeds the internal
 * state, and `onOpenChange` reports either way. A screen has no business
 * storing which chip a thumb last expanded.
 *
 * ── THE LABELS ARE NEVER TRUNCATED ─────────────────────────────────────────
 * §15 ellipses its labels because its width is divided by the number of
 * options. A chip row SCROLLS, so width is the cheap axis here and every label
 * stays whole — which is also why the glyph is optional at level 2 and
 * required at level 1: a chip CAN be cut by the scroller's trailing edge, and
 * the glyph sits at the leading edge, so on the dimension — the thing that
 * stays on screen while its values come and go — it is the part that survives.
 */
import * as React from 'react';
import { CheckboxGroup } from '@base-ui/react/checkbox-group';
import { Checkbox } from '@base-ui/react/checkbox';
import { Fieldset } from '@base-ui/react/fieldset';
import { Check, ChevronDown, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';
import { useMusyText } from './locale';
import type { RadioAccent } from './RadioGroupText';

/** A level-2 chip: one value inside one dimension. */
export interface FilterChipValue {
  value: string;
  /** Written whole — nothing truncates here. See the header. */
  label: string;
  /**
   * Optional, unlike the dimension's. A value chip is only ever read inside
   * its own dimension's row, with the dimension's name right above it, so the
   * label is never the only thing naming it.
   */
  glyph?: LucideIcon;
  disabled?: boolean;
}

/** A level-1 chip: one dimension, and the values it offers. */
export interface FilterChipDimension {
  /** The key this dimension's selection is stored under in `value`. */
  value: string;
  label: string;
  /** Required. See "THE LABELS ARE NEVER TRUNCATED" in the header. */
  glyph: LucideIcon;
  /** Level 2. Empty is legal and renders `emptyLabel` — see the warning. */
  values: FilterChipValue[];
  disabled?: boolean;
}

/**
 * The rung the chips stand on.
 *
 * `min` and `primary` are the system's own names for these two heights — the
 * words `CtaButton`, `IconButton` and `SegmentedControl` all use — so "the
 * small one" means the same thing on every component in the set.
 */
export type FilterChipsSize = 'min' | 'primary';

/**
 * Which values are on, per dimension, keyed by `FilterChipDimension.value`.
 *
 * INVARIANT: a dimension with nothing selected is ABSENT, never present with
 * an empty array. So `Object.keys(value)` is exactly the set of dimensions
 * currently filtering, and that is what the chips draw their active state and
 * their clear button from.
 */
export type FilterChipSelection = Record<string, string[]>;

export interface FilterChipsProps {
  /** Identifies the fields when a form is submitted: `${name}-${dimension}`. */
  name: string;
  /**
   * The set's accessible name. Rendered as a visible <legend> unless
   * `legendHidden` — never dropped: an unnamed set of filters announces as a
   * bare row of buttons (1.3.1, 4.1.2).
   */
  legend: string;
  legendHidden?: boolean;
  /**
   * Level 1. Any number — the row scrolls, so there is no ceiling of the kind
   * §15 has, and no floor either: one dimension is a legal filter bar.
   */
  dimensions: FilterChipDimension[];
  /** The selection, controlled. See `FilterChipSelection` for the invariant. */
  value?: FilterChipSelection;
  /** Fires with the WHOLE next selection, never with one dimension's slice. */
  onValueChange?: (value: FilterChipSelection) => void;
  /**
   * Which dimension is expanded, or `null` for none. Pass it to control the
   * disclosure; leave it out and the component owns it. See the header.
   */
  open?: string | null;
  /** Seeds the internal open state. Ignored when `open` is passed. */
  defaultOpen?: string | null;
  onOpenChange?: (open: string | null) => void;
  accent?: RadioAccent;
  /**
   * The chip height. `primary` (44px) by default; `min` is the 36px rung, for
   * a filter bar that sits in a row of page furniture rather than in a form.
   * L5 picks between them from the POINTER, not from the viewport — see
   * useCoarsePointer.
   */
  size?: FilterChipsSize;
  /**
   * What a dimension with no values says. Falls back to the catalogue's
   * `optionsEmpty`, which is the same words RadioGroupText and RadioCards use
   * for the same hole.
   */
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function FilterChips({
  name, legend, legendHidden = false, dimensions,
  value, onValueChange, open, defaultOpen = null, onOpenChange,
  accent = 'primary', size = 'primary', emptyLabel,
  disabled = false, className,
}: FilterChipsProps) {
  const t = useMusyText();
  const ids = React.useId();

  if (process.env.NODE_ENV !== 'production') {
    const seen = new Set<string>();
    for (const d of dimensions) {
      if (seen.has(d.value)) {
        console.warn(
          `FilterChips "${name}": two dimensions share the key "${d.value}". ` +
          'Their selections would be stored under one key and overwrite each other.'
        );
      }
      seen.add(d.value);
      if (d.values.length === 0) {
        console.warn(
          `FilterChips "${name}": dimension "${d.value}" has no values. Its chip ` +
          'opens an empty row — pass values, or leave the dimension out.'
        );
      }
    }
  }

  /* Uncontrolled unless `open` is passed — see "WHAT IS CONTROLLED" above. */
  const [selfOpen, setSelfOpen] = React.useState<string | null>(defaultOpen);
  const openKey = open !== undefined ? open : selfOpen;
  const setOpen = (next: string | null) => {
    if (open === undefined) setSelfOpen(next);
    onOpenChange?.(next);
  };

  const selection = value ?? {};

  /* The toggles, so Escape can put focus back on the chip whose row it closed.
     Without this the focus is inside a row that `hidden` has just taken out of
     the tree, and the browser drops it on <body> (2.4.3, 2.4.7). */
  const toggles = React.useRef(new Map<string, HTMLButtonElement | null>());

  /* The invariant in one place: an empty dimension is deleted, never stored. */
  const commit = (key: string, values: string[]) => {
    const next = { ...selection };
    if (values.length === 0) delete next[key];
    else next[key] = values;
    onValueChange?.(next);
  };

  return (
    <Fieldset.Root
      className={[
        'musy-filter',
        accent !== 'primary' ? `musy-filter--${accent}` : '',
        size !== 'primary' ? `musy-filter--${size}` : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || openKey === null) return;
        /* Handled here, so it does not also close a Lightbox this bar sits in. */
        event.stopPropagation();
        const chip = toggles.current.get(openKey);
        setOpen(null);
        chip?.focus();
      }}
    >
      <Fieldset.Legend className={legendHidden ? 'musy-sr-only' : 'musy-radio-group__legend'}>
        {legend}
      </Fieldset.Legend>

      {/* LEVEL 1. A row of disclosure buttons, each its own tab stop — the
          Disclosure pattern, not a toolbar: nothing here is a roving-focus set
          and inventing one would take the clear buttons out of the tab order. */}
      <div className="musy-filter__row">
        {dimensions.map((dimension, index) => {
          const on = selection[dimension.value] ?? [];
          const expanded = openKey === dimension.value;
          const off = disabled || dimension.disabled === true;
          const panelId = `${ids}-p${index}`;
          const labelId = `${ids}-l${index}`;

          return (
            <div
              key={dimension.value}
              className="musy-filter__dimension"
              data-open={expanded ? '' : undefined}
              data-active={on.length > 0 ? '' : undefined}
              data-disabled={off ? '' : undefined}
            >
              <button
                type="button"
                ref={(node) => { toggles.current.set(dimension.value, node); }}
                className="musy-filter__toggle"
                aria-expanded={expanded}
                aria-controls={panelId}
                disabled={off}
                onClick={() => setOpen(expanded ? null : dimension.value)}
              >
                <Icon glyph={dimension.glyph} size={size === 'min' ? 'sm' : 'md'} />
                <span className="musy-filter__label" id={labelId}>{dimension.label}</span>
                {/* How many are on is painted as the clear button and heard as
                    this. The chip's own name must not change with the count —
                    a button renamed under the finger is announced twice. */}
                {on.length > 0 && (
                  <span className="musy-sr-only">{t.filterSelected(on.length)}</span>
                )}
                {/* The disclosure cue, and it is a SHAPE: it rotates on open, so
                    the state survives with the hue removed (1.4.1). It stays
                    when the clear button arrives rather than making way for it —
                    otherwise an active dimension would have no open cue left
                    but its fill, which is the one thing 1.4.1 forbids. */}
                <Icon glyph={ChevronDown} size="sm" className="musy-filter__chevron" />
              </button>

              {/* The little x of the brief. A sibling, never nested: a button
                  inside a button is invalid, and these do two different things.
                  Not an IconButton — `.musy-icon-btn--min` bakes in the margin
                  that earns its 24px target the 2.5.8 spacing exception, and
                  inside a pill that margin is what would break the pill. Here
                  the 24px box stands in a 36px (or 44px) rung and needs no
                  exception at all. */}
              {on.length > 0 && (
                <button
                  type="button"
                  className="musy-filter__clear"
                  aria-label={t.filterClear(dimension.label)}
                  disabled={off}
                  onClick={() => commit(dimension.value, [])}
                >
                  <Icon glyph={X} size="sm" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* LEVEL 2. One row per dimension, all of them rendered, all but the open
          one `hidden`.

          ONE SHARED ROW WOULD HAVE BEEN WRONG. `aria-controls` names ONE
          element, so a single strip whose contents swap would have every chip
          pointing at the same id and `aria-expanded` describing a region that
          is somebody else's. A row each keeps that relationship 1:1, and
          `hidden` takes the closed ones out of the accessibility tree AND out
          of the tab order in one attribute.

          DOM ORDER IS VISUAL ORDER, which is what makes the tab order honest
          (2.4.3): the whole level-1 row, left to right, then the level-2 row
          sitting under it. */}
      {dimensions.map((dimension, index) => {
        const expanded = openKey === dimension.value;
        const off = disabled || dimension.disabled === true;

        return (
          <CheckboxGroup
            key={dimension.value}
            id={`${ids}-p${index}`}
            hidden={!expanded}
            aria-labelledby={`${ids}-l${index}`}
            className="musy-filter__values"
            value={selection[dimension.value] ?? []}
            onValueChange={(next) => commit(dimension.value, next)}
            disabled={off}
          >
            {dimension.values.length === 0 ? (
              <p className="musy-filter__empty">{emptyLabel ?? t.optionsEmpty}</p>
            ) : dimension.values.map((option) => (
              <Checkbox.Root
                key={option.value}
                name={`${name}-${dimension.value}`}
                value={option.value}
                disabled={option.disabled}
                nativeButton
                render={<button type="button" />}
                className="musy-filter__value"
              >
                {option.glyph && (
                  <Icon glyph={option.glyph} size={size === 'min' ? 'sm' : 'md'} />
                )}
                <span className="musy-filter__label">{option.label}</span>
                {/* The second cue, so selection never rests on the fill alone
                    (1.4.1) — the same bet RadioCards makes with its check.
                    ALWAYS IN THE BOX, hidden rather than absent: a chip that
                    grows by a glyph when ticked shifts every chip after it in
                    a scroller the finger is already in. */}
                <Icon glyph={Check} size="sm" className="musy-filter__check" />
              </Checkbox.Root>
            ))}
          </CheckboxGroup>
        );
      })}
    </Fieldset.Root>
  );
}
