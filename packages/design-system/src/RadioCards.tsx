/**
 * Radio Cards — Layer 2
 * base-ui: RadioGroup + Radio + Fieldset — the same primitives and the same
 * selection semantics as 7.7, composed over Content Box's anatomy.
 *
 * A THIRD radio component, not a variant of RadioGroupImage, because the
 * content differs in kind: these cards carry a description, so they are read
 * rather than scanned, and that inverts the responsive rule. RadioGroupImage
 * goes 2 / 3 / 4 columns — a short label survives two-up at 393px. A card with
 * a headline, two lines of German body and a meta label does not, so this one
 * is a LIST while narrow (media beside the text), two-up then three-up as it
 * widens. Collapsing the two components would force one of those two
 * column tables to lose.
 *
 * The whole card is the control. There is no nested link or button: a radio
 * with an interactive child is a 4.1.2 failure waiting to happen, and the
 * "learn more" affordance belongs outside the group.
 *
 * CARD FLOOR — 196px (--musy-card-min, the same constant RadioGroupImage
 * uses), capped at three columns. Below 196px a Badge row wraps one-per-line
 * and the anatomy stops reading as a card, so the grid drops a column instead.
 * Token gap G4.
 *
 * CONTAINER, NOT VIEWPORT — the group is an inline-size container: the column
 * count is an auto-fit cap-plus-floor rule, and the card's own list-to-stacked
 * switch is an @container query at --bp-md of GROUP width. Both halves have to
 * agree, or a narrow panel gets a correct one-up grid holding cards laid out
 * for a desktop three-up. This component sits in the MVP's sidebar column,
 * where that is not hypothetical.
 */
import * as React from 'react';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Radio } from '@base-ui/react/radio';
import { Fieldset } from '@base-ui/react/fieldset';
import { Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';
import { Hint } from './Hint';
import { Message } from './Message';
import { useMusyText } from './locale';
import type { TypeStep } from './ContentBox';
import type { RadioAccent } from './RadioGroupText';

/**
 * One condition the card states as a glyph — how long, what you need, whether
 * it makes a sound.
 *
 * THE SENTENCE IS NEVER ONLY IN THE BUBBLE. `Hint` renders `text` as
 * visually-hidden content inside the trigger as well as in the hover bubble,
 * which is what keeps this clear of 1.4.13: nothing appears on hover that is
 * not already in the accessible name. Coarse pointers get no bubble at all and
 * lose nothing.
 *
 * `shortText` is the only part drawn beside the glyph, and it is optional
 * because most conditions have no short form worth reading — "2–12 min" does,
 * "needs your Mindfulness Cards deck" does not, and a card that spelled all
 * three out would be a paragraph pretending to be a row of chips.
 */
export interface RadioCardFact {
  /** Stable identity. The React key. */
  id: string;
  /** The glyph. Required — it is the whole of what a fact shows at a glance. */
  glyph: LucideIcon;
  /** The full sentence. Announced, and shown in the hover bubble. */
  text: string;
  /** A short visible form beside the glyph. Omit when there is none. */
  shortText?: string;
}

/** One row of the glyph key. */
export interface RadioCardLegendItem {
  id: string;
  glyph: LucideIcon;
  /** The shortest true word for what the glyph means — "Time", "Sound". */
  label: string;
}

export interface RadioCardLegendProps {
  items: RadioCardLegendItem[];
  className?: string;
}

/**
 * The key to the cards' fact glyphs.
 *
 * ── ITS OWN COMPONENT, NOT A PROP ON THE GROUP ─────────────────────────────
 * It began as `RadioCards.glyphLegend`, which put it inside the fieldset and
 * fixed it directly above the cards. That is the right DEFAULT place — a key
 * is only useful before the thing it explains — but it is not the only one:
 * /exercises wants it on one row with the "let Musie pick" escape hatch, which
 * a prop rendering inside the group cannot express and which a screen cannot
 * build for itself without emitting `.musy-rcard-legend` from `apps/web`.
 *
 * Separate, both arrangements are the consumer's to compose and neither needs
 * a second copy of the markup.
 *
 * A `<dl>` because that IS the relation — each glyph is a term and its word
 * the definition — and because it gives the icons one authored explanation
 * instead of repeating a sentence on every card that carries them. The glyph
 * is aria-hidden and the word beside it is the definition, so each pair
 * announces as the word alone, which is the whole content of a key.
 */
export function RadioCardLegend({ items, className }: RadioCardLegendProps) {
  if (items.length === 0) return null;
  return (
    <dl className={['musy-rcard-legend', className ?? ''].filter(Boolean).join(' ')}>
      {items.map((item) => (
        <div key={item.id} className="musy-rcard-legend__item">
          <dt><Icon glyph={item.glyph} size="sm" /></dt>
          <dd>{item.label}</dd>
        </div>
      ))}
    </dl>
  );
}

export interface RadioCardOptionRich {
  value: string;
  /** The card's name. Rendered as a real heading, so the group reads as a list
   *  of titled things rather than a wall of prose. */
  headline: string;
  /** One or two lines. Longer than that and this is a Content Box with its own
   *  screen, not an option in a chooser. */
  description: string;
  /**
   * What the card COSTS and NEEDS, as glyphs. Pinned to the foot of the text
   * column, so a run of cards compares like with like on one horizontal line.
   *
   * Three of them read in the time it takes to read "about 20 minutes ·
   * headphones", which is the whole reason they are glyphs. Render a
   * `RadioCardLegend` alongside the group: an unexplained glyph is a rebus.
   */
  facts?: RadioCardFact[];
  /**
   * The meta label — duration, level, count. Last in the reading order and
   * de-emphasised: it QUALIFIES the card, it does not name it. Optional,
   * because a card with nothing to qualify should not carry an empty line.
   */
  label?: string;
  image: string;
  /**
   * Alt text, authored PER ITEM — same rule as 7.7. These images are how a
   * pre-literate or low-literacy user tells the options apart, so `alt=""` is
   * not reachable through this API.
   */
  imageAlt: string;
  disabled?: boolean;
}

export interface RadioCardsProps {
  name: string;
  legend: string;
  /**
   * Hide the legend visually. It stays in the accessible tree — an unnamed
   * radio group announces as a bare set of options (1.3.1, 4.1.2), so this
   * never removes it.
   *
   * For the case where the SCREEN has already asked the question: /exercises
   * has "What would you like to start with now?" as its `h1`, and a visible
   * "Choose an exercise" underneath it is the same question twice. Mirrors
   * SegmentedControl's prop of the same name.
   */
  legendHidden?: boolean;
  hint?: string;
  options: RadioCardOptionRich[];
  value?: string;
  onValueChange?: (value: string) => void;
  accent?: RadioAccent;
  /** Heading level for the card headlines — never guessed (1.3.1). */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  headlineStep?: TypeStep;
  descriptionStep?: TypeStep;
  disabled?: boolean;
  error?: string;
  /** Empty state. Defaults to the locale catalogue's wording. */
  emptyLabel?: string;
  className?: string;
}

export function RadioCards({
  name, legend, legendHidden = false, hint, options, value, onValueChange, accent = 'primary',
  headingLevel = 3, headlineStep = 'heading-sm', descriptionStep = 'body-md',
  disabled = false, error, emptyLabel, className,
}: RadioCardsProps) {
  const t = useMusyText();
  const hintId = React.useId();
  const errorId = React.useId();
  const H = `h${headingLevel}` as 'h3';

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

      <div className={[
        'musy-rcard-group',
        accent !== 'primary' ? `musy-rcard-group--${accent}` : '',
        className ?? '',
      ].filter(Boolean).join(' ')}>
        {options.length === 0 ? (
          <p className="musy-rcard-group__empty musy-radio-group__hint">{emptyLabel ?? t.optionsEmpty}</p>
        ) : options.map((opt) => (
          <Radio.Root
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
            nativeButton
            render={<button type="button" />}
            className="musy-rcard__body"
            aria-invalid={error ? true : undefined}
          >
            <span className="musy-rcard__media">
              <img src={opt.image} alt={opt.imageAlt} />
              <span className="musy-rcard__check" aria-hidden="true">
                <Radio.Indicator keepMounted render={<span />}>
                  <Icon glyph={Check} size="sm" />
                </Radio.Indicator>
              </span>
            </span>
            <span className="musy-rcard__text">
              <H className="musy-rcard__headline" data-type-step={headlineStep}>{opt.headline}</H>
              <p className="musy-rcard__desc" data-type-step={descriptionStep}>{opt.description}</p>
              {/* FACTS BEFORE THE META LABEL, and the stylesheet depends on the
                  order: `.musy-rcard__facts` claims the auto margin that pins
                  the pair to the foot of the column, and
                  `.musy-rcard__facts + .musy-rcard__label` is what stops the
                  label claiming it a second time. */}
              {opt.facts && opt.facts.length > 0 && (
                <span className="musy-rcard__facts">
                  {opt.facts.map((fact) => (
                    <Hint key={fact.id} text={fact.text} className="musy-rcard__fact">
                      <Icon glyph={fact.glyph} size="sm" />
                      {/* aria-hidden: `Hint` already renders the full sentence
                          for AT, and announcing "2–12 min" in front of it would
                          say the same fact twice in two registers. */}
                      {fact.shortText !== undefined && (
                        <span aria-hidden="true">{fact.shortText}</span>
                      )}
                    </Hint>
                  ))}
                </span>
              )}
              {opt.label && <span className="musy-rcard__label">{opt.label}</span>}
            </span>
          </Radio.Root>
        ))}
      </div>

      {error && (
        <div className="musy-radio-group__error">
          <Message id={errorId} variant="error" headline={error} live="assertive" />
        </div>
      )}
    </Fieldset.Root>
  );
}
