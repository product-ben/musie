/**
 * How wide the Einsteigen picture stands beside its copy on a tablet.
 *
 * Ben, 2026-11-17, an annotation on the *Bodyscan · Einsteigen · 834* frame:
 * „image = fill height of container, max width = 30% of parent frame", and
 * 12 between the copy and the picture. So the picture is as TALL as the copy
 * beside it and 16:9 at that height, but never wider than 30% of the row. On
 * a short description that is a small picture; on a long one it stops at 30%
 * and crops taller.
 *
 * ── WHY THIS IS A NUMBER AND NOT A STYLESHEET RULE ────────────────────────
 * The width depends on the copy's height, and the copy's height on the width
 * the picture leaves it. CSS Grid has a second column pass for exactly this
 * (`contain: size` on the picture, `block-size: 100%`, `aspect-ratio`), and
 * WebKit runs it through. Chromium re-sizes the columns but not the rows, so
 * whenever the narrower column gives the copy one more line, the copy spills
 * out of its row — measured at a 432px row: copy 150 tall, row 94. The hook
 * (`useIntroImageFit`) measures the copy and writes this answer as a custom
 * property; the stylesheet then lays out one definite column. Same split as
 * `edgeFade`: the rule here, the measuring in the hook, the geometry in
 * `shell.css`.
 *
 * It converges in a step or two. A wider picture can only narrow the copy, so
 * the copy can only grow taller, and the cap stops it.
 */

/** 16:9 — the picture's ratio everywhere else on the step. */
const RATIO = 16 / 9;
/** „max width = 30% of parent frame". */
const CAP = 0.3;

/**
 * The picture's width in px, rounded to the half pixel so a sub-pixel copy
 * height does not rewrite the property on every observation. `null` when there
 * is nothing to measure — a copy with no height (the phone layout, where the
 * copy is `display: contents`) or a row with no width.
 */
export function introImageWidth(copyHeight: number, rowWidth: number): number | null {
  if (!(copyHeight > 0) || !(rowWidth > 0)) return null;
  const width = Math.min(rowWidth * CAP, copyHeight * RATIO);
  return Math.round(width * 2) / 2;
}
