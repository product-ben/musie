/**
 * Read the REAL resolved value of a token out of the DOM, per theme.
 *
 * Ported from "Musy Foundations Proof.dc.html", whose approach is the reason
 * that page cannot drift: nothing is transcribed. Every themed token resolves
 * through light-dark(), and a var() chain can be three deep
 * (--interactive-primary → --terracotta-9 → light-dark(#B55634, #DF7D5A)), so
 * the only honest way to know what a token IS is to paint it and ask.
 *
 * Tokens are declared on `:root, [data-theme]`, which is what makes a nested
 * probe work: a subtree carrying data-theme="dark" re-declares the whole set
 * and light-dark() re-resolves against that element's color-scheme.
 */

export type Theme = 'light' | 'dark';
export const THEMES: Theme[] = ['light', 'dark'];

/**
 * The stylesheets may not have APPLIED yet when a page mounts. Probing early
 * yields several hundred swatches all reading "transparent". A load event on
 * the stylesheet is not enough on its own — it can fire before we mount. So
 * assert the outcome we actually depend on: a sentinel painted with
 * var(--sand-1) resolving to a real colour. Bounded, then probe anyway and let
 * the page show what it can rather than hanging on a blank screen.
 */
export function tokensReady(timeoutMs = 2000): Promise<void> {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('data-theme', 'light');
    el.style.cssText =
      'position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden;background:var(--sand-1)';
    document.body.appendChild(el);
    const deadline = performance.now() + timeoutMs;
    const tick = () => {
      const bg = getComputedStyle(el).backgroundColor;
      const settled = Boolean(bg) && bg !== 'transparent' && !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(bg);
      if (settled || performance.now() > deadline) {
        el.remove();
        resolve();
      } else {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  });
}

/** `rgb(245, 238, 225)` → `#F5EEE1`. null for a fully transparent value, which
 *  is a real answer for --elevation-ring in light mode. */
export function toHex(v: string | null | undefined): string | null {
  const n = (v ?? '').match(/[\d.]+/g);
  if (!n || n.length < 3) return null;
  if (n.length > 3 && parseFloat(n[3]) === 0) return null;
  const h = (x: string) => parseInt(x, 10).toString(16).padStart(2, '0').toUpperCase();
  return `#${h(n[0])}${h(n[1])}${h(n[2])}`;
}

/**
 * Paint one probe per (theme, token) in a single offscreen host, force one
 * layout, then read them all. One host and one flush rather than N — reading
 * getComputedStyle per element as it is created thrashes layout badly enough
 * to be visible on the Colour page's 196 swatches.
 */
export function probeColors(names: string[]): Record<Theme, Record<string, string | null>> {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden';
  const refs: Record<string, Record<string, HTMLElement>> = { light: {}, dark: {} };
  for (const theme of THEMES) {
    const wrap = document.createElement('div');
    wrap.setAttribute('data-theme', theme);
    for (const name of names) {
      const d = document.createElement('div');
      d.style.backgroundColor = `var(${name})`;
      wrap.appendChild(d);
      refs[theme][name] = d;
    }
    host.appendChild(wrap);
  }
  document.body.appendChild(host);
  const out = { light: {}, dark: {} } as Record<Theme, Record<string, string | null>>;
  for (const theme of THEMES) {
    for (const name of names) {
      out[theme][name] = toHex(getComputedStyle(refs[theme][name]).backgroundColor);
    }
  }
  host.remove();
  return out;
}

/** Resolved value of any non-colour token, as a string, per theme. */
export function probeValues(names: string[]): Record<Theme, Record<string, string>> {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden';
  const wraps: Record<string, HTMLElement> = {};
  for (const theme of THEMES) {
    const wrap = document.createElement('div');
    wrap.setAttribute('data-theme', theme);
    host.appendChild(wrap);
    wraps[theme] = wrap;
  }
  document.body.appendChild(host);
  const out = { light: {}, dark: {} } as Record<Theme, Record<string, string>>;
  for (const theme of THEMES) {
    const cs = getComputedStyle(wraps[theme]);
    for (const name of names) out[theme][name] = cs.getPropertyValue(name).trim();
  }
  host.remove();
  return out;
}

/** Used length of a token, in px, as the browser resolves it right now. The
 *  only way to see what a clamp() or a calc() actually lands on. */
export function probePx(name: string, property: 'font-size' | 'width' = 'width'): number {
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = `position:absolute;left:-99999px;top:0;${property}:var(${name})`;
  document.body.appendChild(el);
  const px = parseFloat(getComputedStyle(el)[property === 'font-size' ? 'fontSize' : 'width']);
  el.remove();
  return Number.isFinite(px) ? px : 0;
}
