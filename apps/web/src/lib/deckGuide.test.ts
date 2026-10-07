/**
 * One rule, two ways of getting it wrong: showing the legend to somebody who
 * has already read it, and withholding it from somebody who has not.
 */
import { describe, expect, it } from 'vitest';
import { DECK_GUIDE_KEY, noteDeckGuideSeen, shouldShowDeckGuide } from './deckGuide';
import type { GuideStore } from './deckGuide';

function store(): GuideStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); } };
}

describe('shouldShowDeckGuide', () => {
  it('shows it the first time and not the second', () => {
    const s = store();

    expect(shouldShowDeckGuide(s)).toBe(true);
    noteDeckGuideSeen(s);
    expect(shouldShowDeckGuide(s)).toBe(false);
  });

  it('records it under a namespaced key', () => {
    const s = store();
    noteDeckGuideSeen(s);

    expect(s.map.get(DECK_GUIDE_KEY)).toBeDefined();
  });

  /* Nowhere to remember means every visit is a first visit. Irritating and
     recoverable; the other answer withholds the explanation from exactly the
     people most likely to be new. */
  it('shows it when there is nowhere to remember', () => {
    expect(shouldShowDeckGuide(null)).toBe(true);
  });

  it('shows it when the store throws on read', () => {
    const hostile: GuideStore = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => {},
    };

    expect(shouldShowDeckGuide(hostile)).toBe(true);
  });

  it('survives a store that refuses to be written to', () => {
    const readOnly: GuideStore = {
      getItem: () => null,
      setItem: () => { throw new DOMException('quota', 'QuotaExceededError'); },
    };

    expect(() => { noteDeckGuideSeen(readOnly); }).not.toThrow();
    expect(shouldShowDeckGuide(readOnly)).toBe(true);
  });
});
