import { describe, expect, it } from 'vitest';
import { numberWord } from './numbers';

describe('numberWord', () => {
  it('writes out the counts the product actually produces', () => {
    expect(numberWord(2, 'de')).toBe('Zwei');
    expect(numberWord(3, 'de')).toBe('Drei');
    expect(numberWord(2, 'en')).toBe('Two');
    expect(numberWord(3, 'en')).toBe('Three');
  });

  it('runs to twelve in both locales', () => {
    expect(numberWord(12, 'de')).toBe('Zwölf');
    expect(numberWord(12, 'en')).toBe('Twelve');
  });

  /* The convention is spell out through twelve, figures above — so thirteen
     is not a gap, it is the other half of the rule. */
  it('switches to digits above twelve', () => {
    expect(numberWord(13, 'de')).toBe('13');
    expect(numberWord(40, 'en')).toBe('40');
  });

  /* ZERO AND ONE ARE NOT IN THE TABLE, and must still come back as something
     interpolable rather than undefined. The headline never asks — it has
     `none` and `one` keys that inflect the noun too — but a function that can
     hand `undefined` to a template is one bad call from rendering the word
     "undefined" on a heading. */
  it('is total for the values the table does not hold', () => {
    expect(numberWord(0, 'de')).toBe('0');
    expect(numberWord(1, 'en')).toBe('1');
    expect(numberWord(-1, 'de')).toBe('-1');
    expect(numberWord(2.5, 'en')).toBe('2.5');
  });
});
