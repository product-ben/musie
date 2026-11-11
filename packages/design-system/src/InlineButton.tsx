/**
 * Inline Button — Layer 2
 * base-ui: Button.
 *
 * A value INSIDE a sentence or a heading that opens a choice — the goal word
 * in /exercises' `h1` ("Lass uns zusammen [entspannen ⏷]"), which opens the
 * sheet that changes it. InlineLink's successor (Ben, 2026-11-11, D4): it
 * keeps that component's reasoning and changes its look.
 *
 * ── IT INHERITS ITS TYPE, AND THAT IS STILL THE WHOLE COMPONENT ───────────
 * Family, size, weight, line height and tracking come from the parent, so the
 * same element is display type inside an `h1` and body type inside a `p`.
 * That is why this is not `CtaButton size="min"`: a button declares its own
 * type step — it is a box with a label in it — and a box with a label in it
 * cannot sit inside a sentence without breaking the line it sits in.
 *
 * ── WHAT CHANGED FROM INLINELINK, AND WHY (Figma *Ready to build*) ────────
 *   colour      `--on-surface`, the heading's own ink — not the accent. Text
 *               in a heading should look like text in a heading.
 *   underline   persistent, under text AND glyph, `--border-width-thick` in
 *               `--border-strong` (3.63:1 light, 4.73:1 dark). With the text
 *               in the heading's colour, the bar is the non-colour cue 1.4.1
 *               asks for, at rest and in every state — so there is no glyph /
 *               bare branch any more, and nothing for a call site to get wrong.
 *   glyph       optional, trailing, a 16px glyph centred in a 24px box.
 *   inset       see the prop.
 *
 * ── ONE TARGET (D3) ───────────────────────────────────────────────────────
 * Text, glyph and underline are ONE `<button>`. There is no `actions` slot:
 * InlineLink's goal chevrons left the screen with goal stepping (D1), and a
 * second control beside the word would be the sibling-not-child problem that
 * slot existed to solve.
 *
 * ── IT IS A `<button>` BY DEFAULT ─────────────────────────────────────────
 * Its first call site opens a sheet, which is a button. A link that navigates
 * is `render={<a href=… />}` — with `nativeButton={false}`, which base-ui
 * otherwise warns about. Whether the component should infer that from
 * `render` is an open question in apps/web/OPEN-QUESTIONS.md; until it is
 * answered the caller says it.
 *
 * ── IT IS ATOMIC ON THE LINE ──────────────────────────────────────────────
 * An `inline-flex` box, so the value never breaks across two lines: one thing
 * to press is one thing on the line. The words wrap around it.
 *
 * ── TARGET SIZE ───────────────────────────────────────────────────────────
 * 2.5.8's inline exception covers "a target in a sentence or block of text",
 * which is the only place this belongs. Its first call site is an `h1` at
 * `--type-heading-lg-size`, so it clears 24px on its own anyway; one in body
 * copy will not, and it is still conformant.
 */
import * as React from 'react';
import { Button } from '@base-ui/react/button';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';

export interface InlineButtonProps
  extends Omit<React.ComponentPropsWithoutRef<typeof Button>, 'className'> {
  /** The value's text. Inherits every type property from where it sits. */
  children: React.ReactNode;
  /**
   * A trailing glyph — 16px, centred in a 24px box, `--sp-1` after the text.
   * `aria-hidden`: the text beside it already says what the control is.
   * Optional, because the underline is the 1.4.1 cue, not the glyph.
   */
  glyph?: LucideIcon;
  /**
   * `inline` (default): 4px of inline padding on both sides AND a −4px inline
   * margin, so the text lines up with the words around it and the underline
   * overhangs it by 4px on each side. `none`: neither — for a value with no
   * text to its left or right, whose underline should start where it does.
   *
   * The component cannot see its neighbours, so the call site says.
   */
  inset?: 'inline' | 'none';
  className?: string;
}

export function InlineButton({
  children, glyph, inset = 'inline', className, ...rest
}: InlineButtonProps) {
  return (
    <Button
      className={[
        'musy-ibtn',
        `musy-ibtn--inset-${inset}`,
        className ?? '',
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      <span className="musy-ibtn__text">{children}</span>
      {/* NO `label`, which is how `Icon` is told it is decorative: it sets
          `aria-hidden` itself. NO `inline` either: that prop's nudge corrects
          an icon set `vertical-align: middle` against text, and this one is
          centred by the flex row instead. */}
      {glyph !== undefined && (
        <span className="musy-ibtn__glyph">
          <Icon glyph={glyph} size="sm" />
        </span>
      )}
    </Button>
  );
}
