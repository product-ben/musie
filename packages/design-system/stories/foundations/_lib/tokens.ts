/**
 * The single source of truth for every foundations page.
 *
 * WHY THE CSS IS PARSED RATHER THAN THE JSON BEING TRUSTED.
 * musy-foundations.tokens.json is the Figma mirror, and it is BEHIND the CSS —
 * 30 properties the stylesheet declares have no JSON expression at all (the
 * whole `stage` type step, the semantic radius aliases, four of the six focus
 * tokens, motion travel, the named font weights, and more). See TOKEN-DRIFT.md.
 * So the CSS is the source of truth for WHICH tokens exist, and the JSON is
 * consulted only for what it is genuinely better at: the `$description` prose
 * and the raw step each semantic alias points at.
 *
 * NOTHING HERE IS A HAND-WRITTEN LIST. Every array below is derived by parsing
 * the stylesheet at build time via Vite's `?raw`. Delete a token from the CSS
 * and its row disappears from the page — and scripts/verify-tokens.mjs then
 * fails, because the page's coverage no longer matches the stylesheet.
 */
import foundationsCss from '../../../tokens/musy-foundations.css?raw';
import amendmentsCss from '../../../tokens/musy-foundations-amendments.css?raw';
import tokensJson from '../../../tokens/musy-foundations.tokens.json';
import paletteJson from '../../../tokens/_palette.json';
import manifestJson from '../../../tokens/proof-manifest.json';
import auditJson from '../../../tokens/_audit.json';

export const SCALES = manifestJson.scales as string[];
export const STEPS = manifestJson.steps.map(String) as string[];

/** Strip comments first: several token names appear in prose, and a regex over
 *  the raw file would invent properties that are only being talked about. */
function decomment(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

export interface Decl {
  /** Full custom property name, including the leading `--`. */
  name: string;
  /** The declared value, verbatim. Not resolved — resolution is the browser's
   *  job, and probe.ts asks it. */
  value: string;
}

function declarations(css: string): Decl[] {
  const seen = new Map<string, string>();
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(decomment(css))) !== null) {
    /* First declaration wins. A token re-declared inside a preference block
       (prefers-reduced-motion collapses every duration to 1ms) is the SAME
       token, not a second one. */
    if (!seen.has(m[1])) seen.set(m[1], m[2].trim());
  }
  return [...seen].map(([name, value]) => ({ name, value }));
}

export const FOUNDATION_DECLS = declarations(foundationsCss);
export const AMENDMENT_DECLS = declarations(amendmentsCss);

const byName = new Map(FOUNDATION_DECLS.map((d) => [d.name, d.value]));
export const declaredValue = (name: string): string | undefined => byName.get(name);

/** Every property the stylesheet declares. The coverage check partitions this. */
export const ALL_TOKENS: string[] = FOUNDATION_DECLS.map((d) => d.name).sort();

/* ── grouping ──────────────────────────────────────────────────────────────
   One predicate per page. These are the partition: verify-tokens.mjs asserts
   the groups are disjoint and together cover ALL_TOKENS exactly. Adding a
   token to the CSS that no predicate claims fails the check rather than
   silently going undocumented.                                             */

const isScaleStep = (n: string) => SCALES.some((s) => n.startsWith(`--${s}-`));

export const GROUPS = {
  'colour-raw': (n: string) => isScaleStep(n) || n === '--alpha-scrim',
  'colour-semantic': (n: string) =>
    /^--(surface|on-surface|interactive-|accent-|feedback-)/.test(n) ||
    ['--border-subtle', '--border-strong', '--border-focus'].includes(n),
  typography: (n: string) =>
    /^--(type-|font-|measure-|text-wrap|text-hyphens)/.test(n),
  spacing: (n: string) => /^--(sp-|space-|target-)/.test(n),
  radius: (n: string) => n.startsWith('--radius-'),
  'border-width': (n: string) => n.startsWith('--border-width-'),
  /* The two shadow alphas live here, not on Colour: nothing but the elevation
     ramp consumes them, and they are meaningless as swatches. */
  elevation: (n: string) => n.startsWith('--elevation-') || n.startsWith('--alpha-shadow'),
  focus: (n: string) => n.startsWith('--focus-ring'),
  motion: (n: string) => n.startsWith('--motion-'),
  icon: (n: string) => n.startsWith('--icon-'),
  'z-index': (n: string) => n.startsWith('--z-'),
  breakpoints: (n: string) =>
    n.startsWith('--bp-')
    || ['--container-max', '--gutter', '--columns', '--grid-gap'].includes(n)
    /* The viewport family belongs with the breakpoints rather than with
       spacing: `--chrome-block` is declared per breakpoint beside `--gutter`,
       and `--viewport-block` is the only token in the system whose value is
       written by script rather than declared. */
    || ['--viewport-block', '--chrome-block', '--view-block',
        '--sticky-block', '--view-block-scrolled'].includes(n),
} as const;

export type GroupName = keyof typeof GROUPS;

export function tokensIn(group: GroupName): string[] {
  return ALL_TOKENS.filter(GROUPS[group]);
}

/** Type steps, discovered from the CSS rather than listed. `stage` only exists
 *  here because it is only in the CSS — the JSON has no such step. */
export const TYPE_STEPS: string[] = [
  ...new Set(
    ALL_TOKENS.map((n) => n.match(/^--type-(.+)-size$/)?.[1]).filter(
      (s): s is string => Boolean(s) && s !== 'body-min',
    ),
  ),
];

/* ── JSON, used only for prose and for the raw step an alias resolves to ─── */

type JsonLeaf = { $value?: unknown; $description?: string };
/* The JSON's own root carries a $description string beside the token groups,
   so it does not fit a uniform index signature. Widen through unknown rather
   than model a shape we only read two fields from. */
const semanticLight =
  ((tokensJson as unknown as { semantic?: { light?: Record<string, JsonLeaf> } }).semantic
    ?.light) ?? {};

export function semanticDescription(name: string): string {
  return semanticLight[name.replace(/^--/, '')]?.$description ?? '';
}

/** `{palette.light.sand.2}` → `--sand-2`. Empty when the JSON has no entry,
 *  which is itself information: the alias exists only in the CSS. */
export function semanticResolvesTo(name: string): string {
  const raw = semanticLight[name.replace(/^--/, '')]?.$value;
  const m = typeof raw === 'string' ? raw.match(/\{palette\.[a-z]+\.([a-z]+)\.([a-z0-9]+)\}/) : null;
  return m ? `--${m[1]}-${m[2]}` : '';
}

export const PALETTE = paletteJson as Record<string, Record<'light' | 'dark', Record<string, string>>>;

export const STEP_PURPOSE = manifestJson.stepPurpose as Record<string, string>;

/**
 * The semantic layer, grouped the way "Musy Foundations Proof.dc.html" groups
 * it. A flat alphabetical list of 83 tokens is technically complete and
 * practically unusable: the four text colours end up buried between forty
 * --interactive-* rows and the surfaces.
 *
 * Predicates, not name lists — a token added to the CSS lands in a group
 * automatically, and `semanticGroupOf` returns 'other' for anything no
 * predicate claims, which the page renders as a visible catch-all rather than
 * dropping silently.
 */
export const SEMANTIC_GROUPS: Array<{
  id: string;
  title: string;
  match: (n: string) => boolean;
  /** Rendered under the group heading on the Colour page. When a group needs a
   *  rule rather than a caption — which of two families to reach for, and why
   *  — it goes here rather than being repeated on every row's description. */
  usage?: string;
}> = [
  { id: 'surface', title: 'Surfaces', match: (n) => n.startsWith('--surface') },
  { id: 'text', title: 'Text', match: (n) => n.startsWith('--on-surface') },
  { id: 'border', title: 'Borders', match: (n) => n.startsWith('--border-') },
  {
    id: 'primary',
    title: 'Interactive — primary (green)',
    match: (n) => n.startsWith('--interactive-primary'),
    usage: 'THE DEFAULT, and the whole of the answer for almost every screen '
      + '(Ben, 2026-10-10). Every component that takes an `accent` prop '
      + 'already defaults to `primary`, and the app passes nothing — so a '
      + 'button, a chip, a selected card, a switch, a focus ring and a link '
      + 'are all this green unless somebody deliberately says otherwise. If '
      + 'you are choosing a colour for an interactive element, you are '
      + 'choosing this one.',
  },
  {
    id: 'accent',
    title: 'Interactive — accent (terracotta)',
    match: (n) => n.startsWith('--interactive-accent'),
    usage: 'OPT-IN ONLY. Nothing reaches for this by default and no screen in '
      + 'the app passes it today; it is here for the case Ben decides wants '
      + 'it. W2 calls the colour "nur Fläche" — a FILL that carries ink, never '
      + 'ink itself — so use `--interactive-accent` as a surface and let '
      + '`--interactive-accent-on` put the ink on it. The purple `accent-alt` '
      + 'family that used to sit here was dropped on 2026-10-10: it had zero '
      + 'call sites on any component.',
  },
  { id: 'ghost', title: 'Interactive — ghost', match: (n) => n.startsWith('--interactive-ghost') },
  {
    id: 'accent-rotation',
    title: 'Accent rotation',
    match: (n) => /^--accent-\d/.test(n),
    usage: 'Category colours, chart series, avatars — a rotation, not a '
      + 'hierarchy. TWO, not three: Layer 1 carries two chromatic scales, so '
      + '`accent-1` is the brand green and `accent-2` is terracotta. '
      + '`accent-3` went with the purple scale.',
  },
  { id: 'feedback', title: 'Feedback', match: (n) => n.startsWith('--feedback-') },
];

export function semanticGroupOf(name: string): string {
  return SEMANTIC_GROUPS.find((g) => g.match(name))?.id ?? 'other';
}

export interface AuditPair { fg: string; bg: string; req: number; why: string }
export const AUDIT_PAIRS = manifestJson.audit as AuditPair[];

/** The ratios recorded when the audit was generated. Never printed as the
 *  answer — the pages compute their own. Used only to detect that the palette
 *  has moved underneath the documentation. */
export const AUDITED = auditJson as Array<
  AuditPair & { light: { r: number }; dark: { r: number } }
>;
