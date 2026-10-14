/**
 * Image — Layer 2
 *
 * A picture that fills the box it is put in, and never leaves it.
 *
 * ── THE RULE, AND WHY IT IS A COMPONENT AND NOT A HABIT ───────────────────
 * Ben, 2026-10-14: *"when an image is placed inside a container, it must
 * always fill the width of the container, if no max width is defined."*
 *
 * A bare `<img>` does the opposite. It is `inline` and `width: auto`, so it
 * renders at its own INTRINSIC pixel size — which for this product's artwork
 * is 1200px — and a container narrower than that gets an image hanging out of
 * it. Nothing errors, nothing fails a test, and the overflow only shows at
 * some widths, which is how it survives a screenshot.
 *
 * That exact defect shipped twice in one week: `.musie-cardshow__art` lost its
 * two declarations when a neighbouring block was deleted, and the drawn card
 * on Freie Bahn's step went full-bleed past the panel. The fix both times was
 * the same two lines, which is the definition of something that should be a
 * component rather than a thing to remember.
 *
 * ── WHAT IT OWNS ─────────────────────────────────────────────────────────
 *   FILL    `inline-size: 100%`, so the container decides the width.
 *   SCALE   `block-size: auto`, so the ratio is the picture's own and nothing
 *           is squashed. There is no `object-fit` here on purpose: fitting is
 *           what you do to a picture in a box of a fixed shape, and this
 *           component's whole premise is that the box follows the picture.
 *   BOUNDS  `maxWidth` and `minWidth` as custom properties, so a caller can
 *           cap a picture at a reading measure or stop it collapsing in a
 *           narrow column — and the default cap is `100%`, which is what makes
 *           "fills the container" true rather than "is as wide as it likes".
 *
 * ── RATIO, AND WHY IT IS NOT OPTIONAL IN PRACTICE ────────────────────────
 * `width` and `height` are the INTRINSIC pixel dimensions, passed through to
 * the attributes rather than to CSS. They do not size anything — the two
 * declarations above decide that — but they give the browser the aspect ratio
 * before the bytes arrive, so the layout does not jump when it does. A screen
 * that omits them gets a correct picture and a reflow.
 *
 * ── `expand` — ONE CONTROL, INSIDE THE PICTURE ────────────────────────────
 * Off for every image, on request here. Given, a secondary icon button sits at
 * the top trailing corner INSIDE the frame, and the picture gains a wrapper to
 * position it against.
 *
 * Ben, 2026-10-14, from Freie Bahn's step: *"I like your idea with the Karte
 * ansehen button. Add this as a feature to the image component as a variant."*
 * The action there is a sheet that opens with the card full screen, and the
 * button it used to be was in the step's own action row — three buttons in a
 * row, one of which was about the picture above them rather than about the
 * step. On the picture it needs no label at all.
 *
 * ONE OBJECT RATHER THAN TWO PROPS, so the label cannot be half-passed: a
 * control with no accessible name is a 4.1.2 failure, and an `onExpand` that
 * silently defaulted its label is how that happens (rule 7's whole subject).
 *
 * THE HANDLER TAKES THE EVENT, which looks like a leak and is not: the one
 * consumer opens a `Sheet`, and an immersive sheet grows out of the RECT of
 * the control that opened it. Measured at the press, never on mount —
 * Lightbox's own note says why.
 */
import * as React from 'react';
import { Expand } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { IconButton } from './IconButton';

export interface ImageProps
  extends Omit<React.ComponentPropsWithoutRef<'img'>, 'className' | 'style' | 'width' | 'height'> {
  src: string;
  /**
   * Required, and `''` is a legal value with a meaning: the picture adds
   * nothing a neighbour has not already said. Anything else describes it.
   * Making it required is what stops it being forgotten; making `''` legal is
   * what stops it being filled with noise.
   */
  alt: string;
  /** Intrinsic pixel size. Not a layout instruction — see the header. */
  width?: number;
  height?: number;
  /**
   * The cap. Any length or token — `var(--measure-body)`, `32rem`, `480px`.
   * Defaults to `100%`, which is the rule: with no cap the picture is exactly
   * as wide as what it is in.
   */
  maxWidth?: string;
  /** The floor. Rarely wanted; a picture that cannot shrink will overflow. */
  minWidth?: string;
  /**
   * One control inside the picture, at the top trailing corner. Omitted —
   * which is every image — nothing is drawn and the DOM is a bare `<img>`.
   *
   * `label` is required because the control is icon-only; `glyph` defaults to
   * `Expand`, which reads as *make this bigger* rather than as *look at this*,
   * and is the action the one consumer actually performs.
   */
  expand?: {
    label: string;
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
    glyph?: LucideIcon;
  };
  className?: string;
}

export const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  function Image({
    src, alt, width, height, maxWidth, minWidth, expand, className, ...rest
  }, ref) {
    /* The two bounds travel as custom properties rather than as inline
       `max-width` / `min-width`, so the stylesheet keeps the cascade: a
       consumer's own class can still raise or lower them, which an inline
       declaration would outrank. */
    const vars: React.CSSProperties = {};
    if (maxWidth !== undefined) (vars as Record<string, string>)['--musy-image-max'] = maxWidth;
    if (minWidth !== undefined) (vars as Record<string, string>)['--musy-image-min'] = minWidth;

    const picture = (
      <img
        {...rest}
        ref={ref}
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={['musy-image', className ?? ''].filter(Boolean).join(' ')}
        style={Object.keys(vars).length > 0 ? vars : undefined}
      />
    );

    if (expand === undefined) return picture;

    /* THE WRAPPER EXISTS ONLY WHEN THE CONTROL DOES. Every image without
       `expand` keeps the DOM it had before this prop existed — one element —
       so nothing that was laid out against a bare `<img>` moves.

       The className goes to the IMAGE and the bounds with it; the frame is
       `display: contents`-adjacent in spirit but is a real box, because a
       `position: absolute` child needs something to be absolute against. */
    return (
      <span className="musy-image-frame">
        {picture}
        <IconButton
          variant="secondary"
          glyph={expand.glyph ?? Expand}
          label={expand.label}
          className="musy-image-frame__action"
          onClick={expand.onClick}
        />
      </span>
    );
  },
);
