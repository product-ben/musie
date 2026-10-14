/**
 * Radio Image — Layer 2
 * base-ui: RadioGroup + Radio + Fieldset — the same primitives and the same
 * selection semantics as §7.7 and §7.9.
 *
 * **A grid of pictures you choose one of, and nothing else is on the card.**
 * No label, no description, no meta row: the picture IS the option, so adding
 * a word under it would be answering the question for the person looking.
 *
 * ── A FOURTH RADIO COMPONENT, AND WHY IT IS NOT `RadioGroupImage` ─────────
 * That one is the near miss, and the differences are not stylistic:
 *
 *   LABEL   `RadioGroupImage` requires one per item and never clamps it. Here
 *           there is nothing to say. The reference case is the Mindfulness
 *           deck — *wähle das Bild, das dich anspricht* — and a feeling
 *           printed under each card would make it a word test.
 *   RATIO   it crops to `1 / 1`, from the Figma card. The deck's artwork is
 *           4:3 landscape, and a square crop loses a third of a composition
 *           whose whole job is to be looked at. This one keeps the picture's
 *           own ratio and lets the row height follow.
 *   COLUMNS it goes 2 / 3 / 4 by auto-fit. Four pictures abreast is a contact
 *           sheet. This stops at three.
 *
 * Collapsing the two would force one of those three to lose, which is the
 * argument §7.9 itself makes against collapsing into §7.7.
 *
 * ── TWO COLUMNS, THEN THREE, AND THE GROUP DECIDES ───────────────────────
 * Two while narrow, three from `--bp-md` of the GROUP's own width — Ben,
 * 2026-10-14. A container query and not a media query, for the reason
 * §7.10 already wrote down: the count has to be right inside a panel or a
 * sidebar, where a viewport query would resolve the desktop grid and overflow.
 *
 * It never reaches four. A hand of five at three-up reads as a hand; at
 * four-up it reads as a catalogue, and the fifth card wraps alone either way.
 *
 * ── THE WHOLE CELL IS THE CONTROL ────────────────────────────────────────
 * A `Radio.Root` rendering a real `<button>`, so the target is the picture and
 * there is no separate hit area to miss (2.5.8 by a wide margin). No nested
 * link or button inside: a radio with an interactive child is a 4.1.2 failure
 * waiting to happen.
 *
 * ── `imageAlt` IS REQUIRED, AND `alt=""` IS NOT REACHABLE ────────────────
 * §7.9's rule, and it binds harder here because there is no label beside the
 * picture to carry the meaning instead. A grid of unnamed images is a grid of
 * identical options for anyone not looking at it.
 */
import * as React from 'react';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Radio } from '@base-ui/react/radio';
import { Fieldset } from '@base-ui/react/fieldset';
import { Check } from 'lucide-react';
import { Icon } from './Icon';
import { Message } from './Message';
import { useMusyText } from './locale';
import type { RadioAccent } from './RadioGroupText';

export interface RadioImageOption {
  value: string;
  /** Source for the picture. */
  image: string;
  /**
   * Alt text, authored PER ITEM and required. The picture carries the whole
   * meaning of the option — there is no label beside it — so `alt=""` is not
   * reachable through this API.
   */
  imageAlt: string;
  disabled?: boolean;
}

export interface RadioImageProps {
  name: string;
  /** The question. Required (4.1.2) — a grid of pictures with no group name
   *  announces as a list of buttons that do not say what they are for. */
  legend: string;
  /** Hide the legend visually. It stays the group's accessible name, which is
   *  the case where the screen's own headline already asks the question. */
  legendHidden?: boolean;
  hint?: string;
  options: readonly RadioImageOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  /**
   * ── THE DELIBERATE PRESS, AS OPPOSED TO THE BROWSE ──────────────────────
   *
   * Fires on a CLICK — a pointer press, or Enter/Space on the focused cell.
   * It does NOT fire when the arrow keys move through the group.
   *
   * That distinction is the whole reason this prop exists, and it is an
   * accessibility one rather than a convenience. Arrow keys in a radio group
   * move focus AND selection together — that is the pattern, and it is how a
   * keyboard user READS the options. A consumer that treats every
   * `onValueChange` as a decision therefore commits on the first arrow press
   * and carries somebody off the screen while they are still looking.
   *
   * So: `onValueChange` is "the selection is now this", for a group whose
   * answer is read later. `onCommit` is "this one, now", for a group where
   * choosing IS the act — which is the card grid's case, where picking a
   * picture writes it and moves the step on.
   */
  onCommit?: (value: string) => void;
  accent?: RadioAccent;
  disabled?: boolean;
  /** Announced with the group, and drawn under it. */
  error?: string;
  /** Empty state. Defaults to the locale catalogue's wording. */
  emptyLabel?: string;
  className?: string;
}

export function RadioImage({
  name, legend, legendHidden = false, hint, options, value, onValueChange,
  onCommit, accent = 'primary', disabled = false, error, emptyLabel, className,
}: RadioImageProps) {
  const t = useMusyText();
  const hintId = React.useId();
  const errorId = React.useId();

  return (
    <Fieldset.Root
      render={
        <RadioGroup
          name={name}
          value={value}
          onValueChange={(v) => onValueChange?.(String(v))}
          disabled={disabled}
          aria-describedby={[hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined}
        />
      }
      className="musy-radio-group"
      data-invalid={error ? '' : undefined}
    >
      <Fieldset.Legend
        className={legendHidden ? 'musy-sr-only' : 'musy-radio-group__legend'}
      >
        {legend}
      </Fieldset.Legend>
      {hint && <p id={hintId} className="musy-radio-group__hint">{hint}</p>}

      {/* TWO ELEMENTS, AND THE OUTER ONE EXISTS ONLY TO BE THE CONTAINER.
          A container query cannot match the element that declares the
          container — `@container` styles DESCENDANTS — so a grid that asked
          about its own width would simply never fire, which is what the first
          build did. The outer div carries `container-type`, the inner one is
          the grid that answers it. */}
      <div className={[
        'musy-rimage',
        accent !== 'primary' ? `musy-rimage--${accent}` : '',
        className ?? '',
      ].filter(Boolean).join(' ')}>
        <div className="musy-rimage__grid">
        {options.length === 0 ? (
          <p className="musy-rimage__empty musy-radio-group__hint">{emptyLabel ?? t.optionsEmpty}</p>
        ) : options.map((opt) => (
          <Radio.Root
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
            nativeButton
            render={<button type="button" />}
            className="musy-rimage__cell"
            aria-invalid={error ? true : undefined}
            onClick={() => onCommit?.(opt.value)}
          >
            <img className="musy-rimage__art" src={opt.image} alt={opt.imageAlt} />
            {/* The tick is the SECOND cue, not the only one: the cell also
                takes a border and an inset ring, so selection never rests on
                one small glyph (1.4.1). `keepMounted` so the cell does not
                resize as it is chosen. */}
            <span className="musy-rimage__check" aria-hidden="true">
              <Radio.Indicator keepMounted render={<span />}>
                <Icon glyph={Check} size="sm" />
              </Radio.Indicator>
            </span>
          </Radio.Root>
        ))}
        </div>
      </div>

      {error && (
        <div className="musy-radio-group__error">
          <Message id={errorId} variant="error" headline={error} live="assertive" />
        </div>
      )}
    </Fieldset.Root>
  );
}
