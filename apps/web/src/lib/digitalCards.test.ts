/**
 * The hand, and the one number the two digital shapes come out of.
 *
 * The property worth asserting is not "it shuffles" — it is that **the same
 * session is dealt the same hand forever**, because that is what stands in for
 * the column this feature deliberately does not have (`digitalCards.ts`
 * header). If this file goes red, the thing that broke is a reload changing
 * the cards under somebody.
 */
import { describe, expect, it } from 'vitest';

import { cardsDealt, dealsOnIntro, dealtCards, withDigitalCards } from './digitalCards';
import type { Card } from './content';

const DECK: Card[] = Array.from({ length: 9 }, (_, i) => ({
  id: `mc-0${i + 1}`,
  code: `MC-0${i + 1}`,
  imageUrl: `assets/web/cards/mc-0${i + 1}.webp`,
  sort: i + 1,
  feeling: `feeling ${i + 1}`,
  imageAlt: null,
}));

const SESSION = '8f1c6b2e-5a4d-4f3b-9c2a-1d0e7b6a5c43';
const OTHER = '2b9d4e1a-7c3f-4a5b-8e6d-0f1a2b3c4d5e';

describe('cardsDealt', () => {
  it('gives the two card exercises their counts and nothing else a count', () => {
    expect(cardsDealt('mindfulness-cards')).toBe(5);
    expect(cardsDealt('free-rein')).toBe(1);
    expect(cardsDealt('sound-journey')).toBeNull();
    expect(cardsDealt('body-scan-soundwalk')).toBeNull();
    expect(cardsDealt('breathing-score')).toBeNull();
  });
});

describe('dealsOnIntro', () => {
  /* The consistency tuning, as the one derivation it is: more than one card is
     something to look at BEFORE the step that asks you to choose. */
  it('deals on Einsteigen only where more than one card is laid out', () => {
    expect(dealsOnIntro('mindfulness-cards')).toBe(true);
    expect(dealsOnIntro('free-rein')).toBe(false);
    expect(dealsOnIntro('sound-journey')).toBe(false);
  });
});

describe('dealtCards', () => {
  it('deals the number asked for', () => {
    expect(dealtCards(SESSION, DECK, 5)).toHaveLength(5);
    expect(dealtCards(SESSION, DECK, 1)).toHaveLength(1);
  });

  it('deals the SAME hand for the same session, every time', () => {
    const first = dealtCards(SESSION, DECK, 5).map((card) => card.id);
    for (let i = 0; i < 20; i += 1) {
      expect(dealtCards(SESSION, DECK, 5).map((card) => card.id)).toEqual(first);
    }
  });

  it('deals a different hand to a different session', () => {
    const mine = dealtCards(SESSION, DECK, 5).map((card) => card.id);
    const theirs = dealtCards(OTHER, DECK, 5).map((card) => card.id);
    expect(mine).not.toEqual(theirs);
  });

  it('deals cards in deck order, whatever order they were drawn in', () => {
    const sorts = dealtCards(SESSION, DECK, 5).map((card) => card.sort);
    expect(sorts).toEqual([...sorts].sort((a, b) => a - b));
  });

  it('never deals the same card twice', () => {
    const ids = dealtCards(SESSION, DECK, 5).map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('deals real cards from the deck it was given', () => {
    for (const card of dealtCards(SESSION, DECK, 5)) {
      expect(DECK).toContain(card);
    }
  });

  /* A deck smaller than the hand is not an error — it is a deck being trimmed
     while the exercise still asks for five. Better a short hand than holes. */
  it('clamps to the deck when asked for more cards than exist', () => {
    expect(dealtCards(SESSION, DECK.slice(0, 3), 5)).toHaveLength(3);
    expect(dealtCards(SESSION, [], 5)).toEqual([]);
    expect(dealtCards(SESSION, DECK, 0)).toEqual([]);
  });

  /* Not a statistical test — a smoke test for a generator that always returns
     the same thing, which would deal `mc-01`…`mc-05` to everybody. */
  it('reaches more than one hand across sessions', () => {
    const hands = new Set(
      Array.from({ length: 40 }, (_, i) => dealtCards(`session-${i}`, DECK, 5)
        .map((card) => card.id)
        .join()),
    );
    expect(hands.size).toBeGreaterThan(5);
  });
});

describe('withDigitalCards', () => {
  it('writes the token without a value', () => {
    expect(withDigitalCards('', true)).toBe('?digitalcards');
  });

  it('keeps whatever else is in the query, and puts its own token last', () => {
    expect(withDigitalCards('?overview', true)).toBe('?overview=&digitalcards');
    expect(withDigitalCards('?focus', true)).toBe('?focus=&digitalcards');
  });

  it('takes the token off again, and leaves nothing behind when it was alone', () => {
    expect(withDigitalCards('?digitalcards', false)).toBe('');
    expect(withDigitalCards('?digitalcards&overview', false)).toBe('?overview=');
  });

  it('never writes the token twice', () => {
    expect(withDigitalCards('?digitalcards', true)).toBe('?digitalcards');
  });

  /* The whole point of the token's shape: `.has()` answers it with no parsing
     of our own, which is the same contract `SessionListen` relies on. */
  it('is readable by URLSearchParams.has', () => {
    expect(new URLSearchParams(withDigitalCards('?overview', true)).has('digitalcards')).toBe(true);
    expect(new URLSearchParams(withDigitalCards('?overview', false)).has('digitalcards')).toBe(false);
  });
});
