/**
 * The Markdown subset, held to what it promises.
 *
 * Two kinds of test, and the second is the one that matters. The first walks
 * the shapes the content actually uses — a headline, prose, a numbered list, a
 * run of bullets — against the real copy from
 * `20260923150000_exercise_library_freie_bahn.sql`, so a parser change that
 * breaks the live content fails here rather than on screen.
 *
 * The second holds the promise the module makes about everything it does NOT
 * implement: **a line is never dropped.** Nested lists, block quotes, code
 * fences and tables are not supported, and the right failure for content we
 * author ourselves is that the words still reach the reader as their own
 * literal text. A parser that silently swallowed an unsupported line would
 * lose copy in a way nothing on screen could reveal.
 */
import { describe, expect, it } from 'vitest';
import { bodyOnly, headingOnly, parseInline, parseMarkdown, plainText } from './markdown';

/** The live German intro copy for Achtsame Pause, verbatim. */
const INTRO = `## So legen wir los

1. Ziehe fünf zufällige Karten aus dem Deck.
2. Lass die Bilder einen Moment auf dich wirken.`;

/** The live German scan copy for Freie Bahn: headline, two bullets. */
const SCAN = `## Wähle eine Karte aus

- Ziehe eine zufällige Karte vom Stapel. Alles ist in Ordnung.
- Wenn du soweit bist, scanne den QR-Code.`;

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
    expect(blocks[1]).toMatchObject({ kind: 'list' });
    expect(blocks[1].kind === 'list' && blocks[1].items).toHaveLength(2);
  });

  /* NO LONGER QUOTED FROM THE COPY. `[X]` was in the live intro until
     `20260923150000`, which replaced it with the random draw it stood in for.
     The promise it tested outlives the string: there is no link syntax here,
     so a square bracket is a square bracket. */
  it('keeps square brackets as text — there is no link syntax in this subset', () => {
    const out = plainText(parseMarkdown('Leg die Karte mit dem Symbol [X] vor dich.'));

    expect(out).toContain('mit dem Symbol [X] vor dich');
  });

  /* THE RULE BEN ASKED FOR, 2026-09-23, against live copy: a bullet is
     paragraph text. Two bullets are two paragraphs — the break survives, the
     marker does not, and no <ul> reaches the screen. */
  it('reads a run of bullets as one paragraph each, with the marker dropped', () => {
    const blocks = parseMarkdown(SCAN);

    expect(blocks.map((block) => block.kind)).toEqual(['heading', 'paragraph', 'paragraph']);
    expect(blocks[1]).toMatchObject({
      kind: 'paragraph',
      spans: [{ text: 'Ziehe eine zufällige Karte vom Stapel. Alles ist in Ordnung.' }],
    });
    expect(blocks[2]).toMatchObject({
      kind: 'paragraph',
      spans: [{ text: 'Wenn du soweit bist, scanne den QR-Code.' }],
    });
  });

  it('reads a headline, a lead paragraph and its bullets as four paragraphs', () => {
    const blocks = parseMarkdown(REFLECT);

    expect(blocks.map((block) => block.kind))
      .toEqual(['heading', 'paragraph', 'paragraph', 'paragraph']);
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

  it('ends an open numbered list when a bullet follows it', () => {
    /* The bullet is no longer part of the sequence, and it is not an item of
       any kind: the list closes and a paragraph opens. */
    const blocks = parseMarkdown('1. number\n- bullet');

    expect(blocks.map((block) => block.kind)).toEqual(['list', 'paragraph']);
    expect(blocks[1]).toMatchObject({ kind: 'paragraph', spans: [{ text: 'bullet' }] });
  });

  it('continues a wrapped bullet, because it is a paragraph and that is how one continues', () => {
    const blocks = parseMarkdown('- first line\n  and its continuation\n- second');

    expect(blocks).toEqual([
      { kind: 'paragraph', spans: [{ text: 'first line and its continuation' }] },
      { kind: 'paragraph', spans: [{ text: 'second' }] },
    ]);
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
    expect(plainText(parseMarkdown(INTRO)))
      .toBe('So legen wir los Ziehe fünf zufällige Karten aus dem Deck. · Lass die Bilder einen Moment auf dich wirken.');
  });

  /* A BULLET IS A PARAGRAPH HERE TOO, so it joins with a space rather than the
     middot. The separator says "these are items of one list", and after
     2026-09-23 a bulleted run is not one. */
  it('joins what used to be bullets with a space, not a middot', () => {
    const out = plainText(parseMarkdown(REFLECT));

    expect(out).toContain('Wenn du magst, beantworte diese Fragen:');
    expect(out).not.toContain(' · ');
  });
});

/**
 * ── THE TWO ORDERS THE LISTEN STEP READS ONE BLOB IN ─────────────────────
 * The live German listen copy for Achtsame Pause, as the 2026-10-07 migration
 * leaves it. The stage draws the instruction alone; the sheet leads with the
 * question and puts the instruction under it.
 */
const LISTEN = `## Höre bewusst zu, und schau dir dabei die Karte intensiv an

Welches Bild entsteht vor deinem inneren Auge?`;

describe('headingOnly', () => {
  it('keeps the instruction and drops the question', () => {
    const out = headingOnly(parseMarkdown(LISTEN));

    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('heading');
    expect(plainText(out)).toBe('Höre bewusst zu, und schau dir dabei die Karte intensiv an');
  });

  /* Content is provisional and a spreadsheet will overwrite it, so the shapes
     it might arrive in are the test rather than the happy path alone. */
  it('returns nothing when the copy has no heading, rather than inventing one', () => {
    expect(headingOnly(parseMarkdown('Just a line of prose.'))).toEqual([]);
  });
});

describe('bodyOnly', () => {
  it('keeps the question and drops the instruction', () => {
    const out = bodyOnly(parseMarkdown(LISTEN));

    expect(out.map((block) => block.kind)).toEqual(['heading']);
    expect(plainText(out)).toBe('Welches Bild entsteht vor deinem inneren Auge?');
  });

  /* THE OUTLINE DOES NOT CHANGE DEPTH between the stage and the sheet — the
     promoted block takes the level the heading it replaced was drawn at. */
  it('gives the promoted block the heading’s own level', () => {
    const out = bodyOnly(parseMarkdown('### Deeper\n\nThe body.'));

    expect(out[0]).toMatchObject({ kind: 'heading', level: 3 });
  });

  it('carries emphasis across rather than flattening it', () => {
    const out = bodyOnly(parseMarkdown('## Head\n\nA **bold** word.'));

    expect(out[0].kind === 'heading' && out[0].spans.some((s) => s.strong === true)).toBe(true);
  });

  /* Content is provisional and a spreadsheet will overwrite it, so the shapes
     it might arrive in are the test rather than the happy path alone. */
  it('gives back nothing when there is no body to show', () => {
    expect(bodyOnly(parseMarkdown('## Only a heading'))).toEqual([]);
    expect(bodyOnly(parseMarkdown(''))).toEqual([]);
  });

  it('promotes prose that has no heading above it', () => {
    expect(plainText(bodyOnly(parseMarkdown('Only prose.')))).toBe('Only prose.');
  });

  /* An <ol> is not a heading. Body that is only a list keeps the list and
     loses the heading, which is what "the body alone" means. */
  it('never promotes a list', () => {
    const out = bodyOnly(parseMarkdown('## Steps\n\n1. First\n2. Second'));

    expect(out.map((block) => block.kind)).toEqual(['list']);
  });

  /* Anything after the promoted paragraph follows it as prose, in order. */
  it('keeps the rest of the body behind the promoted block', () => {
    const out = bodyOnly(parseMarkdown('## Head\n\nOne.\n\nTwo.'));

    expect(out.map((block) => plainText([block]))).toEqual(['One.', 'Two.']);
  });
});
