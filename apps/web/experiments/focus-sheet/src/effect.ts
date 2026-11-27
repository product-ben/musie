/**
 * WHICH WAY TO PLAY WITH THE PICTURE — one of four, at random, per tab (Ben,
 * 2026-11-27): „Bei jeder Session wird ein zufälliger Effekt auf das Bild
 * angewendet … Wenn der Tab geschlossen wird, wird der Effekt verworfen.
 * Nächstes Mal wieder ein zufälliger neu gewählt.“
 *
 * `sessionStorage` is exactly that lifetime: it survives a reload and the
 * view closing and opening again, and it is gone with the tab.
 *
 * `?effekt=wasser|morphen|verruehren|marmorieren` (or the ids) forces one and
 * stores it — for trying all four without closing tabs.
 *
 * The four are embedded copies of the „Mit dem Bild spielen“ experiment
 * (/experiments/digital-image-entertainment/261126-1028/), served from
 * `apps/web/public/experiments/focus-sheet/261127-1218/effects/` — beside
 * the built page, in the same version folder.
 */

/* `settleMs`: how long after the finger lifts the effect has healed by itself,
   so the reset button can go again — read off each effect's own constants,
   not tuned. Wasser: DAMP 0.986 per 1/60 s leaves ~3 % after 4 s. Morphen:
   RELAX_FREE 1.2 s leaves ~4 % after 4 s. Verrühren: RETURN_TAU 6 s, „nach
   3·TAU ist fast alles zurück“. Marmorieren never springs back. */
export const EFFECTS = [
  { id: 'water', name: 'Wasser', alias: 'wasser', settleMs: 4000 },
  { id: 'morph', name: 'Morphen', alias: 'morphen', settleMs: 4000 },
  { id: 'stir', name: 'Farbe verrühren', alias: 'verruehren', settleMs: 18000 },
  { id: 'marble', name: 'Marmorieren', alias: 'marmorieren', settleMs: null },
] as const;

export type Effect = (typeof EFFECTS)[number];

const KEY = 'focus-sheet-effect';

function find(value: string | null): Effect | null {
  if (value === null) return null;
  const wanted = value.trim().toLowerCase().replace('ü', 'ue');
  return EFFECTS.find((effect) => effect.id === wanted || effect.alias === wanted) ?? null;
}

function pick(): Effect {
  if (typeof window === 'undefined') return EFFECTS[0];
  const forced = find(new URLSearchParams(window.location.search).get('effekt'));
  let stored: Effect | null = null;
  try {
    stored = find(window.sessionStorage.getItem(KEY));
  } catch {
    /* no storage: a new pick per page load */
  }
  const chosen = forced ?? stored ?? EFFECTS[Math.floor(Math.random() * EFFECTS.length)];
  try {
    window.sessionStorage.setItem(KEY, chosen.id);
  } catch {
    /* the pick still holds for this page */
  }
  return chosen;
}

/** This tab's effect — decided once, when the page loads. */
export const SESSION_EFFECT: Effect = pick();

/** The embedded page for an effect, playing with `imageSrc`. */
export function effectUrl(effect: Effect, imageSrc: string): string {
  return `/experiments/focus-sheet/261127-1218/effects/${effect.id}.html?src=${encodeURIComponent(imageSrc)}`;
}
