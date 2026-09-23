/**
 * The Markdown subset the content tables are allowed to use.
 *
 * `exercise_i18n.{intro,scan,listen,reflect}_md` each hold one step's HEADLINE
 * and DESCRIPTION — Ben, 2026-09-23 — and the copy he wrote is a heading, some
 * prose, an ordered list and a bulleted list. This is the parser for exactly
 * that and nothing else.
 *
 * ── WHY A PARSER HERE AND NOT `react-markdown` ────────────────────────────
 * Three reasons, in the order they decided it:
 *
 *   1. THE OUTPUT HAS TO BE TYPESET, NOT JUST RENDERED. Every element on
 *      screen resolves to a Layer 1 token (L14.1), and a step's headline is a
 *      specific token pairing — the body-xl the question used to carry.
 *      Producing a BLOCK LIST rather than HTML is what lets `Markdown.tsx`
 *      decide the element AND the class, and what lets the heading level be
 *      clamped so content cannot emit a second <h1> under the panel's own.
 *   2. THE SUBSET IS THE POINT. A general renderer accepts raw HTML, images
 *      and links, so "what can a content string do to this screen" becomes a
 *      question about a dependency's configuration. Here it is a question
 *      about this file, and the answer is the type below: text, a heading
 *      level, a list, `strong` and `em`. There is no branch that produces an
 *      <img>, an <a> or an element from a string, so there is nothing to
 *      sanitise — the renderer builds React elements from a closed set.
 *   3. It is about a hundred lines against ~20 transitive packages in an app
 *      that pins ten dependencies.
 *
 * The cost, stated plainly: this is NOT CommonMark. Nested lists, block
 * quotes, code fences, tables, setext headings, hard line breaks and reference
 * links are not implemented, and a line that uses them renders as its own
 * literal text rather than failing. That is the right failure for content we
 * author ourselves in a migration — the words still reach the reader — and it
 * is why the migration that introduced these columns names this file as the
 * normative statement of what renders.
 *
 * ── A BULLET IS PARAGRAPH TEXT, AND THAT IS THE RENDERER'S DECISION ───────
 * Ben, 2026-09-23: "always render bullets as paragraph text". `- ` is still
 * RECOGNISED — the marker is stripped and each bullet line opens its own
 * paragraph, so the break the writer meant survives — but no <ul> is ever
 * produced, and the `list` block below is ordered by construction.
 *
 * THE CONTENT KEEPS ITS BULLETS. The migrations still write `- `, because
 * this is a decision about how a step is DRAWN rather than about what it
 * says; rewriting the copy to bare paragraphs would bury the rule where the
 * next person to change it cannot find it. An ORDERED list is untouched: its
 * numbers are the instruction's most useful part, and the count and position
 * still reach assistive tech (L3).
 *
 * A line is never dropped. Whatever the input, every non-blank line ends up in
 * some block, which is the one invariant the tests hold this to.
 */

/** A run of text, with the two emphases the subset allows. */
export interface Span {
  text: string;
  strong?: boolean;
  em?: boolean;
}

/**
 * `<h2>`–`<h6>`.
 *
 * NOT 1. The `<h1>` on a session screen is the exercise's name, which
 * `ContentBox` renders above the step rail, so a step heading is the level
 * below it. `#` in a content string is therefore clamped to 2 rather than
 * honoured — a content edit must not be able to put a second <h1> on the page,
 * and a clamp is the only place that can be guaranteed. The copy is written
 * with `##` anyway; this is the floor under it, not the convention.
 */
export type HeadingLevel = 2 | 3 | 4 | 5 | 6;

export type Block =
  | { kind: 'heading'; level: HeadingLevel; spans: Span[] }
  | { kind: 'paragraph'; spans: Span[] }
  /**
   * An ORDERED list, and the only kind there is — a bullet is paragraph text,
   * so nothing here can produce a <ul>. Each item is one line of spans.
   */
  | { kind: 'list'; items: Span[][] };

/* ── Inline ───────────────────────────────────────────────────────────────*/

/**
 * `**strong**` and `*emphasis*`, non-nested.
 *
 * ONE PASS, LONGEST MARKER FIRST, which is the whole of the precedence: `**`
 * is tried before `*`, so `**bold**` cannot be read as an empty emphasis
 * around `*bold*`. The inner group excludes `*`, so an unclosed marker simply
 * never matches and stays on screen as the asterisk that was typed — the
 * failure this file promises, rather than swallowing the rest of the
 * paragraph.
 */
const EMPHASIS = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;

export function parseInline(text: string): Span[] {
  const spans: Span[] = [];
  let last = 0;

  /* `exec` in a loop rather than `matchAll`, because the plain text BETWEEN
     the matches is half the output and only the index gives it. */
  EMPHASIS.lastIndex = 0;
  let match = EMPHASIS.exec(text);
  while (match !== null) {
    if (match.index > last) spans.push({ text: text.slice(last, match.index) });
    if (match[1] !== undefined) spans.push({ text: match[1], strong: true });
    else spans.push({ text: match[2], em: true });
    last = match.index + match[0].length;
    match = EMPHASIS.exec(text);
  }

  if (last < text.length) spans.push({ text: text.slice(last) });

  /* An empty input is an empty run, not a span holding nothing: a block with
     no spans renders as an empty element, and the caller drops it. */
  return spans;
}

/* ── Block ────────────────────────────────────────────────────────────────*/

/** `## Heading`, one to six hashes, at least one space after them. */
const HEADING = /^(#{1,6})\s+(.*)$/;
/**
 * `- item` or `* item` — matched so the MARKER CAN BE DROPPED, not so a list
 * can be built: the line becomes a paragraph. A `*` bullet needs the space,
 * so `*em*` is not one.
 */
const BULLET = /^[-*]\s+(.+)$/;
/** `1. item` or `1) item`. The number itself is not kept — `<ol>` counts. */
const NUMBER = /^\d+[.)]\s+(.+)$/;

/**
 * Markdown in, blocks out.
 *
 * A LINE-AT-A-TIME WALK with one open block, which is all this subset needs:
 * there is no nesting, so nothing has to be pushed on a stack. A blank line
 * closes whatever is open; a numbered line continues the open list or starts
 * one; a bullet opens a paragraph; anything else is paragraph text.
 *
 * ── LAZY CONTINUATION, AND ONLY ONE KIND ──────────────────────────────────
 * A plain line directly under a numbered item joins THAT ITEM rather than
 * starting a paragraph inside the list. It is what a writer means by wrapping
 * a long step over two lines in a migration, and it is the only wrapping rule
 * here: a paragraph's own continuation lines join with a SPACE, never a line
 * break, because a single newline in Markdown is not one. A wrapped BULLET
 * gets the same treatment for free — it is a paragraph, and that is how a
 * paragraph continues.
 */
export function parseMarkdown(md: string): Block[] {
  const blocks: Block[] = [];

  /* The block being built, as raw text: spans are parsed on close, once,
     rather than re-parsed on every continuation line. */
  let openList: { items: string[] } | null = null;
  let openParagraph: string[] = [];

  function closeParagraph(): void {
    if (openParagraph.length === 0) return;
    blocks.push({ kind: 'paragraph', spans: parseInline(openParagraph.join(' ')) });
    openParagraph = [];
  }

  function closeList(): void {
    if (openList === null) return;
    blocks.push({ kind: 'list', items: openList.items.map(parseInline) });
    openList = null;
  }

  function closeAll(): void {
    closeParagraph();
    closeList();
  }

  for (const raw of md.split('\n')) {
    /* Trailing \r for a file written on Windows, and leading indentation,
       which this subset has no meaning for — there are no nested lists. */
    const line = raw.trim();

    if (line === '') {
      closeAll();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading !== null) {
      closeAll();
      const level = Math.min(6, Math.max(2, heading[1].length)) as HeadingLevel;
      blocks.push({ kind: 'heading', level, spans: parseInline(heading[2].trim()) });
      continue;
    }

    /* A BULLET OPENS A PARAGRAPH. The marker is dropped, so a run of bullets
       is a run of paragraphs — one per line, which is the break the writer
       meant. `closeAll` rather than `closeParagraph`: a bullet under a
       numbered run ends that run, because it is no longer part of it. */
    const bullet = BULLET.exec(line);
    if (bullet !== null) {
      closeAll();
      openParagraph.push(bullet[1].trim());
      continue;
    }

    const numbered = NUMBER.exec(line);
    if (numbered !== null) {
      closeParagraph();
      if (openList === null) openList = { items: [] };
      openList.items.push(numbered[1].trim());
      continue;
    }

    /* Lazy continuation: under an open item, this belongs to it. */
    if (openList !== null) {
      const items = openList.items;
      items[items.length - 1] = `${items[items.length - 1]} ${line}`;
      continue;
    }

    openParagraph.push(line);
  }

  closeAll();

  /* A block with nothing in it renders as an empty element that still takes
     its gap. `## ` alone is the way to get one. */
  return blocks.filter((block) => (block.kind === 'list'
    ? block.items.length > 0
    : block.spans.length > 0));
}

/**
 * The same words with the formatting thrown away, as one string.
 *
 * For the places that need a step's copy as a VALUE rather than as a block of
 * prose — the listen step's details view lists it in a `ContentList`, whose
 * `content` is a string. Rendering blocks there would put a heading inside a
 * definition list; rendering the raw Markdown would show the reader `##`.
 *
 * Blocks are joined with a space and an ordered list's items with " · ", the
 * separator `ContentList` callers already use for a compound value ("MC-01 ·
 * Anger") in this same component.
 */
export function plainText(blocks: Block[]): string {
  return blocks
    .map((block) => (block.kind === 'list'
      ? block.items.map(spansToText).join(' · ')
      : spansToText(block.spans)))
    .join(' ');
}

function spansToText(spans: Span[]): string {
  return spans.map((span) => span.text).join('');
}
