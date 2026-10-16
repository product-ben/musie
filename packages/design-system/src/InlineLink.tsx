/**
 * Inline Link — Layer 2
 * base-ui: Button.
 *
 * A link INSIDE something else — a sentence, a heading, a label — rather than
 * a control standing on its own. Everything about it follows from that.
 *
 * ── IT INHERITS ITS TYPE, AND THAT IS THE WHOLE COMPONENT ─────────────────
 * Family, size, weight, line height and tracking all come from the parent, so
 * the same element is display type inside an `h1` and body type inside a `p`.
 * It sets three things of its own: the colour, the optional glyph, and the
 * states.
 *
 * That is why this is not `CtaButton size="min"`. A button declares its own
 * type step by design — it is a box with a label in it — and a box with a
 * label in it cannot sit inside a sentence without breaking the line it sits
 * in. The two components are opposites about the same question.
 *
 * ── IT IS A `<button>` BY DEFAULT, AND IT IS NAMED FOR HOW IT LOOKS ───────
 * Its first call site opens a sheet, which is a button; a link that navigates
 * is `render={<a href=… />}`, inherited from base-ui's `Button` exactly as
 * `CtaButton` inherits it. Naming a design-system entry after its APPEARANCE
 * is the honest choice here — the consumer picks the semantics, and the
 * component cannot know which it is.
 *
 * ── 1.4.1, AND WHY THE RULE IS IN HERE RATHER THAN IN THE CALLER ──────────
 * A link inside a block of text must not be told apart by COLOUR ALONE (1.4.1,
 * technique F73). Two ways to satisfy that, and this component takes both
 * depending on what it was given:
 *
 *   with `trailingIcon`   the glyph is the non-colour cue at rest, and the
 *                         underline appears on hover and focus.
 *   without one           `.musy-ilink--bare`, which underlines at rest.
 *
 * The modifier is set HERE, from the presence of the prop, so a call site
 * cannot drop the glyph and silently land on colour alone. A `underline`
 * prop would have made that one typo away.
 *
 * ── IT CAN CARRY ACTIONS, AND THEY CHANGE ITS SHAPE (2026-10-15) ─────────
 * `actions` puts up to two icon controls beside the link — on /exercises,
 * the chevrons that step to the next goal without opening the sheet. They
 * are SIBLINGS of the link's button, because a button inside a button is
 * invalid HTML and a 4.1.2 failure, so the component wraps both in a span
 * when they are present and renders the bare button when they are not.
 *
 * WHY THE COMPONENT DRAWS THEM rather than taking a node: an action here has
 * to look like it belongs to the word beside it, and the obvious thing for a
 * caller to reach for is `IconButton` — which brings its own box and padding
 * and breaks the line, for the same reason `CtaButton` cannot be this
 * component. Handing out a slot would be handing out that problem.
 *
 * ── TARGET SIZE IS NOT A PROBLEM AND IT IS WORTH WRITING DOWN ─────────────
 * 2.5.8's inline exception covers "a target in a sentence or block of text",
 * which is the only place this component belongs. Its first call site is in
 * an `h1` at `--type-heading-lg-size`, so it clears 24px on its own anyway —
 * but a future one in body copy will not, and it is still conformant.
 */
import * as React from 'react';
import { Button } from '@base-ui/react/button';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';

/**
 * One icon control beside the link — a step, a dismiss, a shortcut.
 *
 * A DECLARATIVE SHAPE RATHER THAN A `ReactNode` SLOT, and the reason is the
 * one the whole component is about: an action here has to be a sibling of
 * the link's button and has to look like it belongs to the same word. Handing
 * the caller a slot means handing them that styling problem, and the first
 * thing they would reach for is an `IconButton` — which brings its own box
 * and padding and breaks the line it sits in, exactly as `CtaButton` would.
 *
 * So the component draws them and the caller says what they do.
 */
export interface InlineLinkAction {
  /** Stable identity. The React key. */
  id: string;
  glyph: LucideIcon;
  /** Accessible name. Rule 7: required, because an icon-only control IS its
   *  label and there is no sensible default. */
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface InlineLinkProps
  extends Omit<React.ComponentPropsWithoutRef<typeof Button>, 'className'> {
  /** The link's text. Inherits every type property from where it sits. */
  children: React.ReactNode;
  /**
   * Up to two icon controls to the inline-end of the link.
   *
   * ── THEY ARE SIBLINGS OF THE BUTTON, NEVER CHILDREN ────────────────────
   * That is not a layout preference. A `<button>` inside a `<button>` is
   * invalid HTML and a 4.1.2 failure — the same rule `RadioCards` states in
   * its own header about a radio with an interactive child. So passing
   * `actions` changes the rendered shape: the component wraps the link and
   * its actions in a `musy-ilink-group` span instead of rendering the button
   * alone.
   *
   * WITHOUT `actions` THERE IS NO WRAPPER, so the plain case renders exactly
   * the element it always did and nothing downstream of it moves.
   *
   * `className` AND `render` STILL ADDRESS THE BUTTON either way — the
   * wrapper is the component's own furniture and is not reachable from
   * outside. A caller styling the group would be styling a box it did not
   * ask for.
   *
   * Two at most. The slot is sized for a pair and a third would push the
   * line past the word it belongs to; the component does not police it,
   * because a runtime throw for a layout opinion is worse than the layout.
   */
  actions?: readonly InlineLinkAction[];
  /**
   * The glyph after the text.
   *
   * NOT DECORATION — its presence is what lets the underline wait for hover,
   * because it is the non-colour cue 1.4.1 asks for. `aria-hidden`, because
   * the text beside it already says what the control does.
   */
  trailingIcon?: LucideIcon;
  className?: string;
}

export function InlineLink({
  children, trailingIcon, actions, className, ...rest
}: InlineLinkProps) {
  const link = (
    <Button
      className={[
        'musy-ilink',
        /* The 1.4.1 branch, decided by the component and not by the caller —
           see the header. */
        trailingIcon === undefined ? 'musy-ilink--bare' : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {/* THE TEXT IN ITS OWN SPAN, so the underline is drawn under the WORDS
          and not under the glyph. A `text-decoration` on the flex container
          would run the rule through the icon's box, which at a display step
          is a visibly long tail after the last letter. */}
      <span className="musy-ilink__text">{children}</span>
      {/* NO `label`, which is how `Icon` is told it is decorative: it sets
          `aria-hidden` itself when none is passed.

          AND NO `inline`, which it carried until 2026-10-15. That prop's
          whole job is `translateY(--icon-optical-nudge)` — a -0.055em lift
          that corrects an icon set `vertical-align: middle` against text.
          The glyph is baseline-aligned now (see `.musy-ilink__icon`), so the
          nudge corrects a problem that no longer exists and would push it
          ~2px off the line it was just put on.

          `lg` (24px) — Ben, 2026-10-15, after two passes. `sm` read as a
          speck beside display type; `xl` competed with the word it belongs
          to. It is also the thing satisfying 1.4.1 here, and a cue nobody
          notices is not a cue — 24 is where it is noticed without becoming a
          second headline. */}
      {trailingIcon !== undefined && (
        <Icon glyph={trailingIcon} size="lg" className="musy-ilink__icon" />
      )}
    </Button>
  );

  if (actions === undefined || actions.length === 0) return link;

  return (
    <span className="musy-ilink-group">
      {link}
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className="musy-ilink-action"
          /* THE NAME IS THE LABEL, not a tooltip. An icon-only control has no
             text node, so without this it announces as "button" — and these
             two differ only by which way the chevron points, which is exactly
             the difference a screen reader cannot see. */
          aria-label={action.label}
          disabled={action.disabled}
          onClick={action.onClick}
        >
          <Icon glyph={action.glyph} size="lg" />
        </button>
      ))}
    </span>
  );
}
