/**
 * The parser, held to the two things a parser must never do: lose a line, and
 * emit a link somebody could not have written on purpose.
 */
import { describe, expect, it } from 'vitest';
import { parseProse, parseProseInline } from './orgProse';
import { METRIC_RATIONALE } from './orgFixture';

describe('inline links', () => {
  it('splits a citation out of its sentence and keeps both sides', () => {
    const spans = parseProseInline('Breaks help ([BAuA 2024](https://www.baua.de/x)) a lot.');
    expect(spans.map((s) => s.text)).toEqual(['Breaks help (', 'BAuA 2024', ') a lot.']);
    expect(spans[1].href).toBe('https://www.baua.de/x');
    expect(spans[0].href).toBeUndefined();
  });

  it('takes http and https and nothing else', () => {
    /* A link in this prose is a citation, and a citation points at a document.
       Anything else stays on screen as the brackets that were typed, which is
       the failure this parser prefers to a silent one. */
    for (const bad of [
      '[x](javascript:alert(1))',
      '[x](data:text/html,hi)',
      '[x](/relative)',
      '[x](mailto:a@b.c)',
    ]) {
      const spans = parseProseInline(bad);
      expect(spans, bad).toHaveLength(1);
      expect(spans[0].href, bad).toBeUndefined();
      expect(spans[0].text, bad).toBe(bad);
    }
  });

  it('leaves an unclosed marker on screen rather than swallowing the rest', () => {
    const spans = parseProseInline('An [unclosed link and more text');
    expect(spans).toHaveLength(1);
    expect(spans[0].text).toBe('An [unclosed link and more text');
  });

  it('handles several citations in one sentence', () => {
    const spans = parseProseInline('One [a](https://a.test) and two [b](https://b.test).');
    expect(spans.filter((s) => s.href !== undefined).map((s) => s.href))
      .toEqual(['https://a.test', 'https://b.test']);
  });
});

describe('blocks', () => {
  it('reads a heading and a paragraph', () => {
    const blocks = parseProse('## Why it matters\n\nBecause it does.');
    expect(blocks.map((b) => b.kind)).toEqual(['heading', 'paragraph']);
    expect(blocks[0].spans[0].text).toBe('Why it matters');
  });

  it('joins a wrapped paragraph into one line', () => {
    /* The source is wrapped for reading, not for rendering. */
    const blocks = parseProse('one\ntwo\nthree');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].spans[0].text).toBe('one two three');
  });

  it('never drops a non-blank line', () => {
    const md = '## A\n\nB\n\n\n\nC\n\nD';
    const text = parseProse(md).flatMap((b) => b.spans).map((s) => s.text).join(' ');
    for (const piece of ['A', 'B', 'C', 'D']) expect(text).toContain(piece);
  });
});

describe('the rationale this parser exists for', () => {
  it('parses every text in both languages with no markdown left over', () => {
    for (const [metric, pair] of Object.entries(METRIC_RATIONALE)) {
      for (const locale of ['de', 'en'] as const) {
        const blocks = parseProse(pair[locale]);
        expect(blocks[0].kind, `${metric}/${locale}`).toBe('heading');
        const text = blocks.flatMap((b) => b.spans).map((s) => s.text).join(' ');
        expect(text, `${metric}/${locale}`).not.toMatch(/\]\(http/);
        expect(text, `${metric}/${locale}`).not.toMatch(/^##/);
      }
    }
  });

  it('gives every citation a real source to follow', () => {
    /* A citation whose source cannot be followed is decoration, and this
       screen already has enough shapes that look like evidence. */
    for (const [metric, pair] of Object.entries(METRIC_RATIONALE)) {
      for (const locale of ['de', 'en'] as const) {
        const links = parseProse(pair[locale])
          .flatMap((b) => b.spans)
          .filter((s) => s.href !== undefined);
        expect(links.length, `${metric}/${locale}`).toBeGreaterThanOrEqual(3);
        for (const link of links) {
          expect(link.href, `${metric}/${locale}`).toMatch(/^https:\/\//);
          expect(link.text.trim(), `${metric}/${locale}`).not.toBe('');
        }
      }
    }
  });

  it('cites the same sources in both languages', () => {
    /* The prose is translated and the research is not. If the two drift, one
       language is reading a different study from the other. */
    for (const [metric, pair] of Object.entries(METRIC_RATIONALE)) {
      const hrefs = (locale: 'de' | 'en') => parseProse(pair[locale])
        .flatMap((b) => b.spans)
        .map((s) => s.href)
        .filter((href): href is string => href !== undefined)
        .sort();
      expect(hrefs('de'), metric).toEqual(hrefs('en'));
    }
  });
});
