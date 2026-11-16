/**
 * The description a card face shows: at most 170 characters, the rest ending
 * in an ellipsis.
 *
 * ── WHY THERE IS A LIMIT (Ben, 2026-11-13) ────────────────────────────────
 * „Lass uns ein Character-Limit von 170 Zeichen machen. Alle Texte, die länger
 * sind, werden mit … ellipsed out. Dadurch sollten wir eine kompaktere
 * Kartenhöhe bekommen." The pile is exactly as tall as its TALLEST face
 * (`.musy-deck__pile` puts every card in one grid cell), so one long
 * description makes every card in the pile that tall. 170 is the Bodyscan
 * text in German (169), which Ben read and kept; on that day only Klangreise
 * in German (232) ran past it.
 *
 * ── CHARACTERS, NOT LINES ─────────────────────────────────────────────────
 * A `line-clamp` would follow the card's width and the font; a character
 * limit is a number an editor can hold a text to before it ever reaches a
 * card, which is what Ben asked for. The limit includes the ellipsis.
 *
 * ── AT A WORD, AND NOTHING DANGLING ───────────────────────────────────────
 * The cut falls at the last space that fits, so no word is broken, and any
 * comma, colon or dash left at the end goes before the ellipsis is added.
 * A text with no space to cut at is cut at the limit.
 *
 * Whitespace runs collapse to one space first, as the browser would render
 * them anyway: a description is stored with a line break between sentences,
 * and a line break counted as a character the reader never sees would make
 * the limit lie.
 *
 * PURE, so the rule is tested without a browser (`cardText.test.ts`).
 */

/** The most characters a card face's description shows, ellipsis included. */
export const CARD_TEXT_MAX = 170;

const ELLIPSIS = '…';

/** `text` as a card shows it, and whether anything was cut. */
export function cardText(text: string, max: number = CARD_TEXT_MAX): { shown: string; cut: boolean } {
  const flat = text.replace(/\s+/gu, ' ').trim();
  if (flat.length <= max) return { shown: flat, cut: false };

  const room = flat.slice(0, max - ELLIPSIS.length);
  const space = room.lastIndexOf(' ');
  const head = (space > 0 ? room.slice(0, space) : room).replace(/[\s,;:–—-]+$/u, '');
  return { shown: `${head}${ELLIPSIS}`, cut: true };
}
