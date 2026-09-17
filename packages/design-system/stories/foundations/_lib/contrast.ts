/**
 * WCAG 2.x relative luminance and contrast ratio.
 *
 * Every number the Contrast page shows is computed here, at render time, from
 * a colour probed out of the DOM. The audited figures in docs/04-contrast-
 * audit.md and tokens/_audit.json are never printed as the answer — a
 * transcribed ratio is a claim about a palette that may since have moved.
 *
 * Definitions: WCAG 2.2 relative luminance, and (L1 + 0.05) / (L2 + 0.05).
 */

function channel(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function luminance(hex: string): number {
  const n = hex.replace('#', '');
  const r = channel(parseInt(n.slice(0, 2), 16) / 255);
  const g = channel(parseInt(n.slice(2, 4), 16) / 255);
  const b = channel(parseInt(n.slice(4, 6), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ratio(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** `req` of 0 means the pair is documented as exempt (disabled text is exempt
 *  from 1.4.3), so it is reported but never failed. The epsilon absorbs the
 *  float noise in a ratio that was solved to land exactly on 4.5. */
export function passes(r: number | null, req: number): boolean | null {
  if (r === null || req === 0) return null;
  return r >= req - 0.005;
}
