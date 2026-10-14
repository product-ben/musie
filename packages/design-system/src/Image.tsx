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
 */
import * as React from 'react';

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
  className?: string;
}

export const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  function Image({ src, alt, width, height, maxWidth, minWidth, className, ...rest }, ref) {
    /* The two bounds travel as custom properties rather than as inline
       `max-width` / `min-width`, so the stylesheet keeps the cascade: a
       consumer's own class can still raise or lower them, which an inline
       declaration would outrank. */
    const vars: React.CSSProperties = {};
    if (maxWidth !== undefined) (vars as Record<string, string>)['--musy-image-max'] = maxWidth;
    if (minWidth !== undefined) (vars as Record<string, string>)['--musy-image-min'] = minWidth;

    return (
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
  },
);
