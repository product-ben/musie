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

export interface InlineLinkProps
  extends Omit<React.ComponentPropsWithoutRef<typeof Button>, 'className'> {
  /** The link's text. Inherits every type property from where it sits. */
  children: React.ReactNode;
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
  children, trailingIcon, className, ...rest
}: InlineLinkProps) {
  return (
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
          `aria-hidden` itself when none is passed. `inline` applies
          --icon-optical-nudge, which is the prop's whole purpose — an icon
          beside text. */}
      {trailingIcon !== undefined && (
        <Icon glyph={trailingIcon} size="sm" inline className="musy-ilink__icon" />
      )}
    </Button>
  );
}
