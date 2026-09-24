/**
 * THE DECK, READ AND CHECKED — the one module both deck scripts and both deck
 * tests agree with.
 *
 * ── WHY ONE MODULE AND NOT THREE COPIES ───────────────────────────────────
 * `supabase/content/deck.json` is edited by hand and then turned into two
 * things that cannot be taken back: a migration that runs against a hosted
 * database, and a PDF that goes onto card stock. Three readers of that file —
 * the generator, the print script and the unit test — each with its own idea
 * of what a valid deck is, would mean a deck the test accepts and the printer
 * mangles. So the rules live here once, and everything else asks.
 *
 * ── PLAIN ESM, AND THAT IS THE SAME DECISION `qr-codes.mjs` MADE ──────────
 * `node scripts/…` with no build step, no loader, no second toolchain. The
 * TypeScript side imports it through `deck.d.mts` next door, which is a hand-
 * written declaration of exactly this surface — small enough to keep true, and
 * `deck.test.ts` fails the moment it is not.
 *
 * ── WHAT IS NOT IN HERE ───────────────────────────────────────────────────
 * Whether a `trk-NN` exists. This module never opens a database and never
 * parses SQL, so it cannot know. The foreign key knows: a pairing naming a
 * track that is not there fails the migration on `supabase db reset`, locally,
 * loudly, before anything is pushed. That is a better check than one this file
 * could fake, and `supabase/content/README.md` says so in the same words.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** `supabase/content/deck.json`, from anywhere this module is imported. */
export const DECK_PATH = join(HERE, '..', '..', '..', 'supabase', 'content', 'deck.json');

/**
 * The two locales `card_i18n.locale` allows (`20260918150500_content_schema.sql`).
 * Adding a third is a migration AND a line here, in that order.
 */
export const LOCALES = ['de', 'en'];

/** `cards.id` — lower case of the printed code. See `sameCase` below. */
const CARD_ID = /^mc-\d{2}$/;

/** `cards.code`. The same shape `src/lib/scanCode.ts` decodes, on purpose. */
const CARD_CODE = /^MC-\d{2}$/;

/** `tracks.id` — opaque by design, so the shape is all that can be checked. */
const TRACK_ID = /^trk-\d{2}$/;

/** `exercises.id` — a slug, because every id in this schema is one. */
const EXERCISE_ID = /^[a-z][a-z0-9-]*$/;

/** Reads and parses the deck. Throws with the path on malformed JSON. */
export async function readDeck(path = DECK_PATH) {
  let raw;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    throw new Error(`No deck at ${path}.`);
  }
  try {
    return JSON.parse(raw);
  } catch (thrown) {
    throw new Error(
      `${path} is not valid JSON: ${thrown instanceof Error ? thrown.message : String(thrown)}`,
    );
  }
}

/** The cards, in deck order, whatever order the file happens to list them in. */
export function ordered(deck) {
  return [...(deck?.cards ?? [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Everything wrong with a deck, split in two.
 *
 * `problems` stop a migration and stop a print run: each one would either fail
 * against the schema or put a wrong thing on paper. `warnings` are decks that
 * are legal and probably not meant — a card nothing can draw is the live
 * example, and it is a legitimate half-finished state while a recording is
 * being chosen, so it prints a line rather than refusing.
 */
export function checkDeck(deck) {
  const problems = [];
  const warnings = [];
  const cards = deck?.cards;

  if (!Array.isArray(cards) || cards.length === 0) {
    return { problems: ['`cards` must be a non-empty array.'], warnings };
  }

  const seen = { id: new Map(), code: new Map(), sort: new Map() };

  for (const [index, card] of cards.entries()) {
    /* The id if it is usable, so every later message says WHICH card. */
    const where = isText(card?.id) ? card.id : `cards[${index}]`;

    if (!CARD_ID.test(card?.id ?? '')) {
      problems.push(`${where}: id must look like \`mc-01\`.`);
    }
    if (!CARD_CODE.test(card?.code ?? '')) {
      problems.push(`${where}: code must look like \`MC-01\` — it is what is printed on the card.`);
    }
    /* The id is the code in lower case, and that is worth enforcing: the app
       stores `sessions.card_id` and looks up by `cards.code`, so a diary row
       read months later should name the paper card without a join.

       Only when both are WELL FORMED. `id: 'mc-01', code: 'nope'` is one
       mistake, and reporting it twice — once as a shape and once as a mismatch
       that suggests `nope` wants the id `nope` — is worse than reporting it
       once. */
    if (CARD_ID.test(card?.id ?? '') && CARD_CODE.test(card?.code ?? '') && card.id !== card.code.toLowerCase()) {
      problems.push(`${where}: id and code are the same string in two cases; \`${card.code}\` wants id \`${card.code.toLowerCase()}\`.`);
    }

    if (!Number.isInteger(card?.sort) || card.sort < 1) {
      problems.push(`${where}: sort must be a whole number from 1 up.`);
    }

    for (const [field, map] of Object.entries(seen)) {
      const value = card?.[field];
      if (value === undefined) continue;
      const first = map.get(value);
      if (first !== undefined) problems.push(`${where}: ${field} \`${value}\` is already ${first}'s.`);
      else map.set(value, where);
    }

    if (card?.image !== null && !isText(card?.image)) {
      problems.push(`${where}: image must be a path, or null where there is none.`);
    }

    for (const locale of LOCALES) {
      const feeling = card?.feeling?.[locale];
      if (!isText(feeling)) {
        problems.push(`${where}: feeling.${locale} is missing. A feeling in one locale and not the other is a dropped translation — CLAUDE.md rule 6.`);
      } else if (feeling !== feeling.trim()) {
        problems.push(`${where}: feeling.${locale} has whitespace at an end; it is set centred on a card and the space will show.`);
      } else if (feeling.startsWith('[DE] ')) {
        problems.push(`${where}: feeling.${locale} carries the old [DE] placeholder prefix. Write the German — CLAUDE.md rule 6.`);
      }
    }

    /* image_alt is nullable, and the seed's own rule is that NULL IN BOTH is
       data — "the source has no alt text" — while null in one is a translation
       someone dropped. So the two locales have to agree about existing. */
    const alts = LOCALES.map((locale) => card?.imageAlt?.[locale] ?? null);
    if (alts.some((alt) => alt !== null) && alts.some((alt) => alt === null)) {
      problems.push(`${where}: imageAlt is written in one locale and null in the other. Null in both is data; null in one is a dropped translation.`);
    }
    for (const [at, alt] of alts.entries()) {
      if (alt !== null && !isText(alt)) {
        problems.push(`${where}: imageAlt.${LOCALES[at]} must be text, or null.`);
      }
    }

    const plays = card?.plays ?? {};
    if (typeof plays !== 'object' || Array.isArray(plays)) {
      problems.push(`${where}: plays must be an object of exercise id → track id.`);
    } else {
      for (const [exercise, track] of Object.entries(plays)) {
        if (!EXERCISE_ID.test(exercise)) problems.push(`${where}: \`${exercise}\` is not an exercise id.`);
        if (!TRACK_ID.test(track ?? '')) problems.push(`${where}: plays.${exercise} must be a track id like \`trk-01\`.`);
      }
      if (Object.keys(plays).length === 0) {
        warnings.push(`${where} is paired with no exercise, so no exercise can draw it.`);
      }
    }
  }

  /* Contiguous from 1. The schema only asks for unique, but a deck is an
     ordered thing people count through, and a gap at 7 is a card someone
     deleted from the file and forgot. Cheap to satisfy, loud when wrong. */
  const sorts = cards.map((card) => card?.sort).filter(Number.isInteger).sort((a, b) => a - b);
  const expected = cards.map((_, index) => index + 1);
  if (sorts.length === cards.length && sorts.join() !== expected.join()) {
    problems.push(`sort runs ${sorts.join(', ')}; a deck of ${cards.length} wants 1 to ${cards.length} with no gaps.`);
  }

  return { problems, warnings };
}

/** `checkDeck`, as a throw. Every problem at once — a list is faster to fix. */
export function assertDeck(deck) {
  const { problems, warnings } = checkDeck(deck);
  for (const warning of warnings) console.warn(`[musie] warning: ${warning}`);
  if (problems.length > 0) {
    throw new Error(
      `The deck has ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n  · ${problems.join('\n  · ')}`,
    );
  }
  return deck;
}

/** The deck as the three tables see it — the shape both the generator and the
 *  database test compare against, so neither can invent a fourth reading. */
export function rows(deck) {
  const cards = ordered(deck);
  return {
    cards: cards.map((card) => ({
      id: card.id,
      code: card.code,
      image_url: card.image,
      sort: card.sort,
    })),
    card_i18n: cards.flatMap((card) =>
      LOCALES.map((locale) => ({
        card_id: card.id,
        locale,
        feeling: card.feeling[locale],
        image_alt: card.imageAlt?.[locale] ?? null,
      })),
    ),
    exercise_tracks: cards.flatMap((card) =>
      Object.entries(card.plays ?? {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([exercise_id, track_id]) => ({ exercise_id, card_id: card.id, track_id })),
    ),
  };
}
