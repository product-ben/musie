/**
 * Content Box — Layer 2
 * No APG pattern (not a widget), and base-ui has no card primitive — a card has
 * no behaviour to own. Semantic HTML: <article> with a real heading, so the box
 * appears in the document outline as a unit rather than as an anonymous div
 * stack. Built on base-ui's `useRender` so it accepts the same `render`
 * composition prop as the rest of the set.
 *
 * Type steps are PROPS, not a hardcoded heading-sm / body-md pair — the same
 * box is a session card at heading-sm and an onboarding panel at heading-lg.
 * The heading LEVEL is also a prop, because the correct level depends on where
 * the box sits in the page, which the box cannot know (1.3.1).
 *
 * CLOSEABLE (onDismiss). Passing `onDismiss` draws an X **in the headline
 * row**, and does NOT make the card framed. Added 2026-09-26, and the name is
 * the point: Ben asked for a `dismissable` VARIANT, and this is deliberately
 * not one. It is a CAPABILITY — the same capability §7.10 Message and §7.23
 * Toast already spell `onDismiss` + `dismissLabel` — and a third spelling for
 * the third component doing one thing is how a set drifts. So: no variant, the
 * same two props, one more consumer.
 *
 * WHAT IT REPLACES. `apps/web` drew this X by passing a `header` holding an
 * Icon Button, which forced the card FRAMED: a tall header band with the
 * headline top-left, the X on its own line below it, and a hairline under the
 * pair — for a card that wanted none of those three. That is also why the
 * inline diary card and the lightbox one were structurally different objects.
 * The two props coexist: a framed card with an `onDismiss` puts the X in the
 * header row, beside whatever else the header holds.
 *
 * FRAMED (header slot). Passing `header` splits the card into two regions
 * divided by a full-bleed hairline. The line is full-bleed on purpose: an
 * inset line reads as a rule under the text above it, an edge-to-edge line
 * reads as the card being in two parts. The card then owns no padding at all
 * — the regions do — so the line needs no negative margin to reach the edges.
 *
 * PROVISIONAL: outline="dashed" consumes --border-style-dashed (token gap G2).
 */
import * as React from 'react';
import { useRender } from '@base-ui/react/use-render';
import { Button } from '@base-ui/react/button';
import { X } from 'lucide-react';
import { Icon } from './Icon';

export type TypeStep =
  | 'display-xl' | 'display-lg'
  | 'stage'
  | 'heading-lg' | 'heading-md' | 'heading-sm'
  | 'body-lg' | 'body-md' | 'body-sm'
  | 'label-lg' | 'label-md';

/** 'raised' was removed in review: an elevation-1 card and a solid-outlined
 *  card were doing the same job, and the shadow read as a second, competing
 *  boundary next to the outline. Depth stays with 'sunken'. */
export type BoxOutline = 'solid' | 'dashed' | 'sunken' | 'plain';
/**
 * 1 IS IN THE UNION, and it was not until D.1 needed it.
 *
 * The reference flow's own markup settles this: the onboarding greeting is
 * `<h1 class="musy-box__headline" data-type-step="display-lg">`, so the
 * documented anatomy has always had a box whose headline is the page's h1. A
 * screen whose MAIN CONTENT is one box has nowhere else to put it, and the two
 * alternatives are both worse — a visually hidden h1 above the box says the
 * same thing twice in the accessible tree, and a page with no h1 at all is a
 * real defect rather than a stylistic one.
 *
 * It does not relax the rule this prop exists for. The level is still never
 * guessed and never defaulted to 1: `headingLevel = 3` stays, and a box has to
 * be asked to be an h1.
 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface ContentBoxProps {
  headline: string;
  /** Hide the headline visually. It stays in the outline and in the accessible
   *  name — the documented reason this is an <article> at all. Mirrors Switch's
   *  `labelHidden`. Never remove the headline to hide it. */
  headlineHidden?: boolean;
  /** Heading level for the document outline. Never guessed. */
  headingLevel?: HeadingLevel;
  headlineStep?: TypeStep;
  /**
   * Ink for the headline. `muted` is for a box whose headline NAMES ITS
   * CONTEXT rather than announcing itself — the session's framed box, where
   * the exercise name sits above the step rail as a reminder of what you are
   * in and at full contrast competes with the step you are doing.
   *
   * It changes ink, never structure: the heading level is untouched, so
   * nothing moves in the document outline.
   */
  headlineTone?: 'default' | 'muted';
  /**
   * Let the headline use the whole row instead of capping at
   * `--measure-heading` (26ch).
   *
   * THE CAP IS RIGHT BY DEFAULT and stays the default: a heading that runs
   * the width of a wide card is a heading nobody tracks back from, which is
   * the entire reason Layer 1 names a measure for one.
   *
   * It is wrong for a headline that is a QUESTION with its own answers
   * directly beneath it — /exercises asks "Was möchtest du heute erreichen?"
   * above four radio rows, and 26ch broke 32 characters into two balanced
   * half-lines stranded in the corner of a 930px row. There is nothing to
   * track back from: the eye goes straight down into the options.
   *
   * Added 2026-10-08. Reach for it only where the headline is a label for
   * what follows rather than prose to be read.
   */
  headlineWide?: boolean;
  text?: string;
  textStep?: TypeStep;
  outline?: BoxOutline;
  /** Header region. Present ⇒ the card renders framed: header, hairline, body. */
  header?: React.ReactNode;
  /**
   * Present ⇒ the card draws a close control in its headline row. What
   * closing MEANS is the consumer's: this component only reports the press.
   */
  onDismiss?: () => void;
  /** The close control's whole accessible name. Required when `onDismiss` is
   *  — there is no catalogue default here, because a box does not know whether
   *  it is being closed, collapsed or put away. */
  dismissLabel?: string;
  /** Arbitrary content, below the text. */
  children?: React.ReactNode;
  className?: string;
  /** base-ui composition: swap <article> for another element or component. */
  render?: useRender.RenderProp;
}

export function ContentBox({
  headline, headlineHidden = false, headingLevel = 3, headlineStep = 'heading-sm',
  headlineTone = 'default', headlineWide = false,
  text, textStep = 'body-md', outline = 'solid', header, onDismiss, dismissLabel,
  children, className, render,
}: ContentBoxProps) {
  const H = `h${headingLevel}` as 'h1';

  /* BOTH, or neither. A close control with no accessible name is a button
     announced as "button", which is worse than no control — so the pair is
     tested together rather than `onDismiss` alone. Same guard the consuming
     screen used to apply for itself. */
  const closeable = onDismiss !== undefined && dismissLabel !== undefined;

  const heading = (
    /* Hidden means visually hidden, never absent: the headline IS what puts
       this box in the document outline. */
    <H className={[
      headlineHidden ? 'musy-sr-only' : 'musy-box__headline',
      /* Ignored while hidden: a visually-hidden heading has no measure to
         release, and `.musy-sr-only` would fight the modifier for the same
         properties. */
      !headlineHidden && headlineWide ? 'musy-box__headline--wide' : '',
    ].filter(Boolean).join(' ')}
       data-type-step={headlineHidden ? undefined : headlineStep}>{headline}</H>
  );

  const head = (
    <>
      {closeable ? (
        /* ONE ROW, and the headline is the part that gives. The control holds
           --target-primary and the heading shrinks and wraps beside it, which
           is what makes this work at 320px with a German compound in it — the
           degradation order §23 states for the toast, applied to a card. */
        <div className="musy-box__headrow">
          {heading}
          {/* A bare base-ui Button dressed by .musy-box__dismiss, NOT an Icon
              Button — §7.10's precedent, so the dismiss affordances in the set
              stay identical and no tooltip appears under a thumb. */}
          <Button className="musy-box__dismiss" onClick={onDismiss} aria-label={dismissLabel}>
            <Icon glyph={X} size="md" />
          </Button>
        </div>
      ) : heading}
      {text && <p className="musy-box__text" data-type-step={textStep}>{text}</p>}
    </>
  );
  const body = children && <div className="musy-box__slot">{children}</div>;
  return useRender({
    render: render ?? <article />,
    props: {
      className: [
        'musy-box',
        outline !== 'solid' ? `musy-box--${outline}` : '',
        headlineTone !== 'default' ? `musy-box--headline-${headlineTone}` : '',
        header ? 'musy-box--framed' : '',
        className ?? '',
      ].filter(Boolean).join(' '),
      children: header ? (
        <>
          {/* Headline sits in the header with whatever the caller put there —
              a stepper, a badge row — and the slot becomes the body. */}
          <div className="musy-box__header">{head}{header}</div>
          <div className="musy-box__body">{body}</div>
        </>
      ) : (
        <>
          {head}
          {body}
        </>
      ),
    },
  });
}
