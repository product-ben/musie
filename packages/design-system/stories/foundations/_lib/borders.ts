/**
 * Border usage, derived from how the components and the prototype actually
 * draw borders — not from a rule someone wrote down and hoped was followed.
 *
 * musy-components.css is read as TEXT, at build time. That is not a component
 * import: nothing here renders a Layer 2 component, and the foundations pages
 * still need only the token stylesheets to display. What it buys is that the
 * rules below are evidence, and the evidence recounts itself when the CSS
 * changes — including when it stops agreeing with the rule.
 */
import componentsCss from '../../../src/musy-components.css?raw';

const SCALES = ['sand', 'terracotta', 'ocher', 'purple', 'info', 'success', 'warning', 'error'];

export interface BorderUse {
  selector: string;
  property: string;
  value: string;
  /** Tokens referenced in the value. */
  tokens: string[];
  /** The state this rule targets, read off the selector. */
  state: string;
  /** Enclosing at-rules, if any. */
  atRule: string;
  /** True when the selector is one of the system's focusable parts. */
  control: boolean;
}

const STATE_TESTS: Array<[string, RegExp]> = [
  ['disabled', /\[data-disabled\]|:disabled/],
  ['checked', /\[data-checked\]/],
  ['invalid', /\[data-invalid\]|\[aria-invalid/],
  ['valid', /\[data-valid\]/],
  ['recording', /\[data-state="recording"\]/],
  ['hover', /:hover|\[data-force~="hover"\]/],
  ['active', /:active|\[data-pressed\]/],
];

function stateOf(selector: string): string {
  for (const [name, re] of STATE_TESTS) if (re.test(selector)) return name;
  return 'rest';
}

/**
 * Which selectors are actually interactive boundaries.
 *
 * Derived from the ONE focus-ring rule at the top of musy-components.css,
 * which lists every focusable part in the system. That list is the system's own
 * definition of "a control", so the check cannot drift from it — and it settles
 * the ambiguity that `__track` creates: Switch's track IS the focusable element
 * (base-ui renders Switch.Root as the track), while Segmented Control's track
 * and Music Player's track are containers that merely hold one.
 */
function focusableSelectors(css: string): string[] {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const m = /([^{}]*:focus-visible[^{}]*)\{[^{}]*outline:[^{}]*\}/.exec(src);
  if (!m) return [];
  return m[1].split(',')
    .map((x) => x.trim().replace(/:focus-visible$/, '').trim())
    .filter((x) => x.startsWith('.'));
}

export const FOCUSABLE = focusableSelectors(componentsCss);

const isControl = (selector: string) =>
  FOCUSABLE.some((f) => selector.split(',').some((part) => part.trim().startsWith(f)));

function parse(css: string): BorderUse[] {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: BorderUse[] = [];
  /* Track at-rule context. A declaration inside @media (prefers-contrast: more)
     is answering a different question: Layer 1 has already promoted
     --border-subtle to --sand-edge there, so the same token is a ≥3:1 boundary
     rather than a hairline. Judging it by the same rule reports a violation
     that is actually the system's contrast escape working. */
  let i = 0;
  const stack: string[] = [];
  while (i < src.length) {
    const open = src.indexOf('{', i);
    if (open === -1) break;
    const head = src.slice(i, open).trim();
    if (head.startsWith('@')) {
      stack.push(head.replace(/\s+/g, ' '));
      i = open + 1;
      continue;
    }
    const close = src.indexOf('}', open);
    if (close === -1) break;
    const body = src.slice(open + 1, close);
    const selector = head.split('\n').map((x) => x.trim()).join(' ').trim();
    if (selector) {
      for (const [, prop, val] of body.matchAll(/(border[a-z-]*)\s*:\s*([^;]+);/g)) {
        if (['border-radius', 'border-collapse', 'border-spacing'].includes(prop)) continue;
        const value = val.replace(/\s+/g, ' ').trim();
        out.push({
          selector,
          property: prop,
          value,
          tokens: [...value.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((m) => m[1]),
          state: stateOf(selector),
          atRule: stack.join(' › '),
          control: isControl(selector),
        });
      }
    }
    i = close + 1;
    /* A closing brace may also close the enclosing at-rule. */
    while (stack.length && /^\s*\}/.test(src.slice(i))) {
      stack.pop();
      i = src.indexOf('}', i) + 1;
    }
  }
  return out;
}

export const USES = parse(componentsCss);

export const count = (token: string) => USES.filter((u) => u.tokens.includes(token)).length;

export function usesOf(token: string): BorderUse[] {
  return USES.filter((u) => u.tokens.includes(token));
}

/** Examples for a token, newest-of-kind first: one per distinct state. */
export function examplesOf(token: string, limit = 4): BorderUse[] {
  const seen = new Set<string>();
  const out: BorderUse[] = [];
  for (const u of usesOf(token)) {
    const k = u.state;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(u);
    if (out.length >= limit) break;
  }
  return out;
}

/** How often a token is used, split by the state its selector targets. */
export function byState(token: string): Array<[string, number]> {
  const m = new Map<string, number>();
  for (const u of usesOf(token)) m.set(u.state, (m.get(u.state) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
}

/** Every family `-border` token the components use, with counts. */
export function familyBorders(): Array<[string, number]> {
  const m = new Map<string, number>();
  for (const u of USES)
    for (const t of u.tokens)
      if (/-border$/.test(t) && !['--border-subtle', '--border-strong', '--border-focus'].includes(t))
        m.set(t, (m.get(t) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
}

/* ── the checks the rules imply ─────────────────────────────────────────────
   Each returns the offending uses. Empty is a pass. Rendered on the page so a
   violation is visible in the documentation rather than only in a test log. */

/** A raw palette step used directly as a border colour. Layer 1 says the raw
 *  scales are never consumed directly; Layer 2 is the API. */
export const rawPaletteBorders = (): BorderUse[] =>
  USES.filter((u) => u.tokens.some((t) => SCALES.some((s) => t.startsWith(`--${s}-`))));

/** Dashed on a control boundary. A control edge must be --border-strong at
 *  ≥3:1 (1.4.11), and dashing reduces the perceived stroke. */
export const dashedOnControl = (): BorderUse[] =>
  USES.filter((u) => u.tokens.includes('--border-style-dashed') && u.tokens.includes('--border-strong'));

/** The focus width used as a border. The focus indicator is an `outline`:
 *  a border participates in layout and would shift the page on focus. */
export const focusWidthAsBorder = (): BorderUse[] =>
  USES.filter((u) => u.tokens.includes('--border-width-focus'));

/** --border-subtle on a control's REST state. Subtle is documented as
 *  "dividers and decorative outlines ONLY, never on an interactive boundary" —
 *  the disabled state is the sanctioned exception. */
export const subtleOnRestingControl = (): BorderUse[] =>
  USES.filter((u) =>
    u.tokens.includes('--border-subtle') &&
    u.state === 'rest' &&
    u.control &&
    /* prefers-contrast: more promotes --border-subtle to --sand-edge in Layer 1,
       so the same token is a ≥3:1 boundary there. Not the same question. */
    !/prefers-contrast/.test(u.atRule));
