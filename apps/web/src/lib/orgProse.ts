/**
 * THE RATIONALE PROSE, PARSED — a heading, paragraphs, and links.
 *
 * ── WHY THIS IS NOT `lib/markdown.ts` ─────────────────────────────────────
 * That parser deliberately has no link branch. Its own header says why: it
 * renders copy that arrives from the DATABASE, so "what can a content string
 * do to this screen" has to stay a closed question, and the answer is a set of
 * elements chosen in the code rather than named by the content. Teaching it to
 * emit an `<a>` would reopen exactly the question it was written to close, for
 * every session step in the product, to serve one prototype.
 *
 * The prose here is the opposite case: it is written in this repository, in
 * `orgFixture.ts`, by us. It cites real research and a citation without its
 * source is a worse thing than no citation, so it needs links — and it can
 * have them, because nobody can put a string in front of this parser without
 * opening a pull request.
 *
 * So: two parsers, two trust levels, and the duplication is the point rather
 * than an oversight. This one is forty lines and understands three things.
 *
 * ── IT STILL BUILDS ELEMENTS AND NEVER SETS HTML ──────────────────────────
 * No `dangerouslySetInnerHTML`, same as the other one. A link's href is
 * carried as a string and the `<a>` is written in the component, so the worst
 * a malformed line can do is fail to match and stay on screen as the brackets
 * that were typed.
 */

/** A run of text, optionally a link. */
export interface ProseSpan {
  text: string;
  href?: string;
}

export type ProseBlock =
  | { kind: 'heading'; spans: ProseSpan[] }
  | { kind: 'paragraph'; spans: ProseSpan[] };

/**
 * `[label](https://…)`, and nothing else inline.
 *
 * ONLY http AND https. A link in this prose is a citation, and a citation
 * points at a document on the web — `javascript:` and `data:` are not that,
 * and a parser that quietly accepted them would be the one place this screen
 * could be made to do something. An href that does not match stays on screen
 * as the text that was typed, which is the failure this file prefers.
 */
const LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

export function parseProseInline(text: string): ProseSpan[] {
  const spans: ProseSpan[] = [];
  let last = 0;

  /* `exec` in a loop rather than `matchAll`, because the plain text BETWEEN
     the matches is half the output and only the index gives it. */
  LINK.lastIndex = 0;
  let match = LINK.exec(text);
  while (match !== null) {
    if (match.index > last) spans.push({ text: text.slice(last, match.index) });
    spans.push({ text: match[1], href: match[2] });
    last = match.index + match[0].length;
    match = LINK.exec(text);
  }
  if (last < text.length) spans.push({ text: text.slice(last) });
  return spans;
}

/**
 * `## heading` lines and paragraphs, split on blank lines.
 *
 * A LINE IS NEVER DROPPED — the one invariant worth holding, and the same one
 * `lib/markdown.ts` holds. Whatever the input, every non-blank line ends up in
 * some block.
 */
export function parseProse(md: string): ProseBlock[] {
  const blocks: ProseBlock[] = [];
  for (const chunk of md.trim().split(/\n{2,}/)) {
    const text = chunk.trim();
    if (text === '') continue;
    const heading = /^#{1,6}\s+(.*)$/.exec(text);
    if (heading !== null) {
      blocks.push({ kind: 'heading', spans: parseProseInline(heading[1].trim()) });
      continue;
    }
    /* A paragraph's own line breaks are soft: the source is wrapped for
       reading, not for rendering. */
    blocks.push({ kind: 'paragraph', spans: parseProseInline(text.replace(/\s*\n\s*/g, ' ')) });
  }
  return blocks;
}
