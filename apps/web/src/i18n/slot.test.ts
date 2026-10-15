import { describe, expect, it } from 'vitest';
import { splitSlot } from './slot';
import { translate } from './index';

describe('splitSlot', () => {
  it('splits a sentence around the slot', () => {
    expect(splitSlot('3 Übungen zum {goal}', 'goal')).toEqual(['3 Übungen zum ', '']);
  });

  /* THE REASON THIS IS NOT THREE KEYS. A language that puts the control first
     has to be expressible, and with a prefix/suffix pair of keys it is not. */
  it('handles a slot at the very start', () => {
    expect(splitSlot('{goal}: 3 exercises', 'goal')).toEqual(['', ': 3 exercises']);
  });

  it('leaves other slots alone', () => {
    expect(splitSlot('{count} exercises to {goal}', 'goal'))
      .toEqual(['{count} exercises to ', '']);
  });

  it('reports null when the slot is not there', () => {
    expect(splitSlot('3 Übungen', 'goal')).toBeNull();
  });

  /* Splitting on the first keeps a second one visible on screen, which is the
     failure we want: two controls with one name is a 4.1.2 problem, and it
     should look wrong rather than render quietly. */
  it('splits on the first occurrence only', () => {
    expect(splitSlot('{goal} and {goal}', 'goal')).toEqual(['', ' and {goal}']);
  });
});

describe('splitSlot over a real message', () => {
  /* The contract this file depends on, asserted against `translate()` itself
     rather than against a hand-written string: an unmatched slot survives
     verbatim, which is what makes the split possible at all. */
  it('survives translate() filling only the other slot', () => {
    const rendered = translate('de', 'exercises.headline.other', { count: '3' });
    expect(rendered).toContain('{goal}');

    const parts = splitSlot(rendered, 'goal');
    expect(parts).not.toBeNull();
    expect(parts?.[0]).toContain('3');
    expect(parts?.[0]).not.toContain('{');
  });
});
