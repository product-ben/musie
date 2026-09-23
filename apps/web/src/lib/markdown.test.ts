/**
 * The Markdown subset, held to what it promises.
 *
 * Two kinds of test, and the second is the one that matters. The first walks
 * the shapes the content actually uses — a headline, prose, a numbered list, a
 * bulleted list — against the real copy from
 * `20260923120000_exercise_step_markdown.sql`, so a parser change that breaks
 * the live content fails here rather than on screen.
 *
 * The second holds the promise the module makes about everything it does NOT
 * implement: **a line is never dropped.** Nested lists, block quotes, code
 * fences and tables are not supported, and the right failure for content we
 * author ourselves is that the words still reach the reader as their own
 * literal text. A parser that silently swallowed an unsupported line would
 * lose copy in a way nothing on screen could reveal.
 */
import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown, plainText } from './markdown';

/** The live German intro copy, verbatim. */
const INTRO = `## So legen wir los

1. Leg die vier Karten mit dem Symbol [X] vor dich.
2. Lass die Bilder einen Moment auf dich wirken.`;

/** The live German reflect copy: headline, a lead sentence, two bullets. */
const REFLECT = `## Worüber hast du nachgedacht?

Wenn du magst, beantworte diese Fragen:

- Was für einen Namen würdest du der Szene geben, die aus der Verbindung von Musik und Bild vor deinem inneren Auge entstanden ist?
- Was ist dabei passiert?`;

describe('parseMarkdown', () => {
  it('reads a headline, a numbered list, and nothing else', () => {
    const blocks = parseMarkdown(INTRO);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({
      kind: 'heading',
      level: 2,
      spans: [{ text: 'So legen wir los' }],
    });
    expect(blocks[1]).toMatchObject({ kind: 'list', ordered: true });
    expect(blocks[1].kind === 'list' && blocks[1].items).toHaveLength(2);
  });

  it('keeps `[X]` as text — there is no link syntax in this subset', () => {
    expect(plainText(parseMarkdown(INTRO))).toContain('mit dem Symbol [X] vor dich');
  });

  it('reads a headline, a paragraph and a bulleted list', () => {
    const blocks = parseMarkdown(REFLECT);

    expect(blocks.map((block) => block.kind)).toEqual(['heading', 'paragraph', 'list']);
    expect(blocks[2]).toMatchObject({ kind: 'list', ordered: false });
  });

  /* The clamp, which is the one place a content string could have changed the
     document outline: the <h1> on a session screen is the exercise's name. */
  it('clamps a heading to h2 at the top, so content cannot emit a second h1', () => {
    expect(parseMarkdown('# Shouting')[0]).toMatchObject({ level: 2 });
    expect(parseMarkdown('### Quieter')[0]).toMatchObject({ level: 3 });
    expect(parseMarkdown('####### Seven')[0]).toMatchObject({ kind: 'paragraph' });
  });

  it('joins a wrapped paragraph with a space, because one newline is not a break', () => {
    expect(parseMarkdown('one\ntwo')).toEqual([
      { kind: 'paragraph', spans: [{ text: 'one two' }] },
    ]);
  });

  it('splits paragraphs on a blank line', () => {
    expect(parseMarkdown('one\n\ntwo').map((block) => block.kind))
      .toEqual(['paragraph', 'paragraph']);
  });

  it('continues a list item over a wrapped line rather than starting a paragraph', () => {
    const blocks = parseMarkdown('1. first line\n   and its continuation\n2. second');

    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind === 'list' && blocks[0].items.map((item) => item[0].text))
      .toEqual(['first line and its continuation', 'second']);
  });

  it('starts a new list when the marker changes, because ol and ul are different elements', () => {
    const blocks = parseMarkdown('- bullet\n1. number');

    expect(blocks.map((block) => block.kind === 'list' && block.ordered)).toEqual([false, true]);
  });

  it('drops a block with nothing in it rather than rendering an empty element', () => {
    expect(parseMarkdown('')).toEqual([]);
    expect(parseMarkdown('\n\n   \n')).toEqual([]);
  });

  /* THE PROMISE. Everything the subset does not implement still reaches the
     reader — as its own literal text, never as nothing. */
  it.each([
    ['a block quote', '> quoted'],
    ['a code fence', '```\nconst x = 1;\n```'],
    ['a table row', '| a | b |'],
    ['a nested list', '- outer\n  - inner'],
    ['a reference link', '[label]: https://example.test'],
  ])('never drops %s', (_name, input) => {
    const out = plainText(parseMarkdown(input));

    for (const line of input.split('\n').map((l) => l.trim()).filter((l) => l !== '')) {
      /* The marker itself may be consumed — a nested `- inner` is an item —
         but the WORDS are always somewhere in the output. */
      const words = line.replace(/^[>\-*|`]+\s*/, '');
      if (words !== '') expect(out).toContain(words.replace(/^-\s*/, ''));
    }
  });
});

describe('parseInline', () => {
  it('reads **strong** and *emphasis*, longest marker first', () => {
    expect(parseInline('a **b** c *d*')).toEqual([
      { text: 'a ' },
      { text: 'b', strong: true },
      { text: ' c ' },
      { text: 'd', em: true },
    ]);
  });

  it('leaves an unclosed marker on screen as the asterisk that was typed', () => {
    expect(parseInline('half *open')).toEqual([{ text: 'half *open' }]);
  });

  it('returns an empty run for an empty string, so the block is dropped', () => {
    expect(parseInline('')).toEqual([]);
  });
});

describe('plainText', () => {
  /* What the listen step's details view lists as a VALUE. `ContentList` takes
     a string, so the blocks have to flatten — and the separator matches what
     that component's other rows already use for a compound value. */
  it('flattens blocks to one line and separates list items with a middot', () => {
    expect(plainText(parseMarkdown(REFLECT)))
      .toContain('Wenn du magst, beantworte diese Fragen:');
    expect(plainText(parseMarkdown(REFLECT))).toContain(' · ');
  });
});
