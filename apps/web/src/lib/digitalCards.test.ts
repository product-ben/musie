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

import { SHEET_OPEN, dealtCards, withSheetOpen } from './digitalCards';
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

/* `cardsDealt` and `dealsOnIntro` used to be tested here. Both are gone: the
   count is `exercises.cards_dealt` since `20261014113500`, read at the content
   boundary like every other column, and nothing deals on Einsteigen any more
   — `view` and `select` are steps, and a step does its own work. What decides
   which of the two a run has is `stepsForRun`, tested in
   `exerciseKind.test.ts` beside the rest of the step set. */

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

/* `withDigitalCards` was tested here. The mode is `sessions.digital_cards`
   since `20261014113500` — a token could not survive leaving the session, and
   the step list depends on the mode. `withToken` itself is still exercised
   below, through the one caller that remains. */

describe('withSheetOpen', () => {
  /* The same token the listen step uses, deliberately: it means "a sheet is
     up", and which sheet is the step's business. */
  it('writes and clears ?focus without touching the mode', () => {
    expect(withSheetOpen('?digitalcards', true)).toBe('?digitalcards&focus');
    expect(withSheetOpen('?digitalcards&focus', false)).toBe('?digitalcards');
  });

  it('survives a round trip', () => {
    const opened = withSheetOpen('?digitalcards', true);
    expect(new URLSearchParams(opened).has('focus')).toBe(true);
    expect(new URLSearchParams(opened).has('digitalcards')).toBe(true);
    const closed = withSheetOpen(opened, false);
    expect(new URLSearchParams(closed).has('focus')).toBe(false);
    expect(new URLSearchParams(closed).has('digitalcards')).toBe(true);
  });

  it('is the one token, not two', () => {
    expect(SHEET_OPEN).toBe('focus');
  });
});
