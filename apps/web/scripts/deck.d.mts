/**
 * The types for `deck.mjs`, hand-written because that file is plain ESM.
 *
 * `allowJs` is false (tsconfig.json), so a `.mjs` import from TypeScript needs
 * a declaration or it is an error rather than an `any`. Hand-written
 * declarations rot; this one is held true by `src/lib/deck.test.ts`, which is
 * the only TypeScript that imports the module and exercises every export.
 */

export type Locale = 'de' | 'en';

export interface DeckCard {
  /** `cards.id` — `mc-01`. The lower case of `code`. */
  id: string;
  /** `cards.code` — `MC-01`, the code printed beside the QR. */
  code: string;
  /** `cards.sort` — 1…n, contiguous. */
  sort: number;
  /** `cards.image_url`, or null where there is no artwork. */
  image: string | null;
  /** `card_i18n.feeling`, both locales, both required. */
  feeling: Record<Locale, string>;
  /** `card_i18n.image_alt` — null in BOTH locales, or written in both. */
  imageAlt: Record<Locale, string | null>;
  /** `exercise_tracks` — exercise id → the track that exercise plays for this
   *  card. The same card plays a different file in a different exercise, which
   *  is what the tracks/exercise_tracks split exists for. */
  plays: Record<string, string>;
}

export interface Deck {
  /** The file's own pointer at the README. Not data. */
  $note?: string;
  cards: DeckCard[];
}

export interface DeckRows {
  cards: { id: string; code: string; image_url: string | null; sort: number }[];
  card_i18n: {
    card_id: string;
    locale: Locale;
    feeling: string;
    image_alt: string | null;
  }[];
  exercise_tracks: { exercise_id: string; card_id: string; track_id: string }[];
}

export declare const DECK_PATH: string;
export declare const LOCALES: Locale[];

export declare function readDeck(path?: string): Promise<Deck>;
export declare function ordered(deck: Deck): DeckCard[];
export declare function checkDeck(deck: unknown): { problems: string[]; warnings: string[] };
export declare function assertDeck(deck: unknown): Deck;
export declare function rows(deck: Deck): DeckRows;
