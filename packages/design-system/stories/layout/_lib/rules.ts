/**
 * Layer 3 layout rules, parsed out of docs/10-layout.md at build time.
 *
 * The markdown file is the source of truth. Nothing here transcribes a rule —
 * edit 10-layout.md and this page changes with it, and a rule deleted there
 * disappears here rather than lingering as a stale copy.
 *
 * docs/10-layout.md is a byte-identical copy of
 * reference/design_system/docs/10-layout.md; scripts/verify-layout.mjs fails if
 * the two ever diverge.
 */
import layoutMd from '../../../docs/10-layout.md?raw';
import evidenceMd from '../../../docs/15-layout-evidence.md?raw';

export interface Rule {
  /** `L0` … `L15`. */
  id: string;
  /** The part after the `·`. */
  title: string;
  /** Everything under the heading, up to the next rule. Markdown. */
  body: string;
}

/** Text before the first `## L…` heading: the layer table and the rule that
 *  outranks the rest. Rendered as the page's preamble rather than dropped. */
export function preamble(src = layoutMd): string {
  const first = src.search(/^## L\d+ · /m);
  return src.slice(0, first === -1 ? src.length : first)
    .replace(/^# .*$/m, '')          // the H1 becomes the page title
    .trim();
}

export function parseRules(src = layoutMd): Rule[] {
  const out: Rule[] = [];
  const re = /^## (L\d+) · (.+)$/gm;
  const heads: Array<{ id: string; title: string; at: number; end: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    heads.push({ id: m[1], title: m[2].trim(), at: m.index, end: re.lastIndex });
  }
  heads.forEach((h, i) => {
    const body = src.slice(h.end, i + 1 < heads.length ? heads[i + 1].at : src.length);
    out.push({
      id: h.id,
      title: h.title,
      /* Trailing `---` is the separator BEFORE the next heading, not content. */
      body: body.replace(/\n---+\s*$/, '').trim(),
    });
  });
  return out;
}

export const RULES = parseRules();
export const PREAMBLE = preamble();
export const EVIDENCE = evidenceMd;
export const LAYOUT_SOURCE = layoutMd;

/** One line per rule, for the index at the top of the page. The first bold run
 *  in a rule's body is its thesis; failing that, its first sentence. */
export function summarise(rule: Rule): string {
  const bold = /\*\*(.+?)\*\*/s.exec(rule.body);
  const text = bold ? bold[1] : (rule.body.split('\n').find((l) => l.trim() && !l.startsWith('#')) ?? '');
  return text.replace(/\s+/g, ' ').replace(/[.*`]/g, '').trim();
}
