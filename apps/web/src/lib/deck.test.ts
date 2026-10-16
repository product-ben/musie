/**
 * The deck file is valid, and the checker that says so actually checks.
 *
 * ── TWO HALVES, AND THE SECOND IS THE IMPORTANT ONE ───────────────────────
 * The first half asserts that `supabase/content/deck.json` passes. On its own
 * that is a test which goes green by the checker doing nothing — so the second
 * half breaks the deck one rule at a time and asserts each break is caught. A
 * validator nobody has seen fail is a validator nobody has seen.
 *
 * ── AND IT IS WHAT HOLDS `deck.d.mts` TRUE ────────────────────────────────
 * `scripts/deck.mjs` is plain ESM with a hand-written declaration beside it,
 * because `allowJs` is false and both deck scripts run under bare `node`. This
 * is the only TypeScript that imports the module, so it is the only thing that
 * would notice the declaration going stale. Every export is used here on
 * purpose, including the ones this file has little else to say about.
 */
import { describe, expect, it } from 'vitest';
import {
  DECK_PATH,
  LOCALES,
  assertDeck,
  checkDeck,
  ordered,
  readDeck,
  rows,
} from '../../scripts/deck.mjs';
import type { Deck } from '../../scripts/deck.mjs';

const deck = await readDeck();

/** A deep copy, so a mutation in one case cannot reach the next. */
const broken = (mutate: (deck: Deck) => void): Deck => {
  const copy = structuredClone(deck);
  mutate(copy);
  return copy;
};

describe('the committed deck', () => {
  it('is at the path both scripts read', () => {
    expect(DECK_PATH).toMatch(/supabase[/\\]content[/\\]deck\.json$/);
  });

  it('has cards to check, so this suite cannot pass vacuously', () => {
    expect(deck.cards.length).toBeGreaterThan(0);
  });

  it('passes every rule', () => {
    expect(checkDeck(deck)).toEqual({ problems: [], warnings: [] });
  });

  it('comes back in deck order however the file lists it', () => {
    const sorts = ordered(deck).map((card) => card.sort);
    expect(sorts).toEqual([...sorts].sort((a, b) => a - b));
  });

  it('flattens into the three tables it lands in', () => {
    const flat = rows(deck);
    expect(flat.cards).toHaveLength(deck.cards.length);
    /* BOTH LOCALES FOR EVERY CARD THAT CARRIES COPY, and no row at all for a
       card that carries none — which is what the database holds, so
       `cards.length * LOCALES.length` stopped being right on 2026-10-15.

       MC-10 WAS THE LIVE EXAMPLE OF THE SECOND HALF AND IS NOT ANY MORE.
       Added through `/maintenance`, which writes no `card_i18n` row, it sat
       in the deck with no copy in either locale — and `toCard` drops a card
       whose translation is missing, so it was in `cards`, on the grid, in
       this file, and had never once been shown. `20261016150000` gave it a
       `feeling` in both locales and the projection gave it its description,
       which is what makes it drawable.

       SO THE RULE KEEPS ITS TEETH AND LOSES ITS WITNESS. Every card carries
       copy today, so the `filter` below cannot currently be wrong — it is
       kept because the shape it describes is the database's, and the next
       card created through `/maintenance` arrives in exactly the state MC-10
       was in. The assertion under it is flipped rather than deleted: it now
       pins the repair, so a regression that dropped those rows again would
       be caught by name rather than by an arithmetic mismatch. */
    const carriesCopy = (card: Deck['cards'][number]): boolean =>
      LOCALES.some((locale) => card.feeling[locale] !== null || card.imageAlt[locale] !== null);
    expect(flat.card_i18n).toHaveLength(deck.cards.filter(carriesCopy).length * LOCALES.length);
    expect(
      flat.card_i18n.filter((row) => row.card_id === 'mc-10').map((row) => row.locale).sort(),
      'mc-10 can be drawn again, so it carries a row in both locales',
    ).toEqual([...LOCALES].sort());
    expect(flat.exercise_tracks).toHaveLength(
      deck.cards.reduce((total, card) => total + Object.keys(card.plays).length, 0),
    );
    /* The columns, spelled as the migration writes them. */
    expect(Object.keys(flat.cards[0]!)).toEqual(['id', 'code', 'image_url', 'sort']);
    expect(Object.keys(flat.card_i18n[0]!)).toEqual(['card_id', 'locale', 'feeling', 'image_alt']);
    expect(Object.keys(flat.exercise_tracks[0]!)).toEqual(['exercise_id', 'card_id', 'track_id']);
  });

  it('throws with every problem at once, rather than the first', () => {
    const wrecked = broken((copy) => {
      copy.cards[0]!.code = 'nope';
      copy.cards[1]!.feeling.de = '';
    });
    expect(() => assertDeck(wrecked)).toThrow(/2 problems/);
  });
});

describe('the checker refuses', () => {
  const cases: [name: string, mutate: (deck: Deck) => void, matching: RegExp][] = [
    ['an id that is not a card id', (d) => { d.cards[0]!.id = 'card-one'; }, /id must look like/],
    ['a code that is not a printed code', (d) => { d.cards[0]!.code = 'MC-1'; }, /code must look like/],
    ['an id and a code that are different strings', (d) => { d.cards[0]!.id = 'mc-99'; }, /same string in two cases/],
    ['two cards with one id', (d) => { d.cards[1]!.id = d.cards[0]!.id; }, /is already/],
    ['two cards with one code', (d) => { d.cards[1]!.code = d.cards[0]!.code; }, /is already/],
    ['a gap in the order', (d) => { d.cards.at(-1)!.sort += 1; }, /with no gaps/],
    ['a sort that is not a number', (d) => { (d.cards[0] as unknown as { sort: string }).sort = '1'; }, /whole number/],
    /* EMPTY IS NOT MISSING, and since 2026-10-15 the checker says so in two
       different sentences. `cards[0]` has artwork, so it owes no word at all —
       but a word it DOES carry still has to be text. */
    ['a German feeling that is blank', (d) => { d.cards[0]!.feeling.de = ''; }, /feeling\.de must be text/],
    ['an English feeling that is only a space', (d) => { d.cards[0]!.feeling.en = ' '; }, /feeling\.en must be text/],
    /* And the two states the rule change created. A card with a picture owes
       no word; one without owes both, because `deck-pdf.mjs` sets the word in
       type for exactly that card and would otherwise print a blank. */
    ['a feeling dropped in one locale only', (d) => { d.cards[0]!.feeling.en = null; }, /written in one locale and null in the other/],
    ['no feeling on a card with no artwork', (d) => { d.cards[0]!.image = null; d.cards[0]!.feeling.de = null; d.cards[0]!.feeling.en = null; }, /has no artwork/],
    ['a feeling padded with a space', (d) => { d.cards[0]!.feeling.de = ' Freude'; }, /whitespace at an end/],
    ['the old placeholder prefix', (d) => { d.cards[0]!.feeling.de = '[DE] Joy'; }, /\[DE\] placeholder/],
    /* BOTH SIDES ARE SET EXPLICITLY, and that is the repair of 2026-10-14: the
       case used to write German alone and rely on the real deck carrying no
       alt text at all, so it stopped proving anything the day the nine
       descriptions landed (`DIGITAL-CARDS.md` section 11). Naming the null
       makes the fixture's own state irrelevant, which is what a rule about
       half-translated alt text should be. */
    ['alt text in one locale only', (d) => {
      d.cards[0]!.imageAlt.de = 'Eine Karte';
      d.cards[0]!.imageAlt.en = null;
    }, /dropped translation/],
    ['a track id that is not one', (d) => { d.cards[0]!.plays['mindfulness-cards'] = 'joy.mp3'; }, /track id like/],
    ['an exercise id that is not one', (d) => { d.cards[0]!.plays['Mindfulness Cards'] = 'trk-01'; }, /is not an exercise id/],
    ['an image that is neither a path nor null', (d) => { (d.cards[0] as unknown as { image: number }).image = 1; }, /must be a path/],
  ];

  it.each(cases)('%s', (_name, mutate, matching) => {
    const { problems } = checkDeck(broken(mutate));
    expect(problems.join('\n')).toMatch(matching);
  });

  it('an empty deck', () => {
    expect(checkDeck({ cards: [] }).problems).toEqual(['`cards` must be a non-empty array.']);
  });
});

describe('the checker warns, without refusing', () => {
  it('about a card no exercise can draw', () => {
    const orphan = broken((d) => { d.cards[0]!.plays = {}; });
    const { problems, warnings } = checkDeck(orphan);
    /* Not a problem: a card whose recording has not been chosen yet is a
       legitimate half-finished deck, and refusing it would mean the only way
       to add a card is to have its track ready first. */
    expect(problems).toEqual([]);
    expect(warnings).toEqual([expect.stringContaining('paired with no exercise')]);
  });
});
