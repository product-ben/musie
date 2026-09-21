/**
 * A scanned code, turned into a session that carries the card — E.0/E.1.
 *
 * `scanCode.ts` next door is the pure half: it says what a code IS. This is
 * the half that talks to the database, and it exists so that the deep link
 * (`/s/:code`) and the typed code (the scan step's field) perform exactly the
 * same act. Two call sites writing their own version of "look it up, find its
 * track, write both" is how one of them ends up writing a card with no
 * recording.
 *
 * ── THE WRITE IS THE ONE D.5a ALREADY MADE ────────────────────────────────
 * `card_id` and `track_id` together, through `saveCard`, because what you drew
 * and what it plays are decided by one act. Nothing about that changed when
 * the reader stopped being simulated — only the READ did.
 *
 * MOCKUPS.md used to carry an entry saying this would be the shape of it. That
 * entry is GONE, deleted on 2026-09-21 once E.2 and E.3 landed and the camera
 * was confirmed on a phone: the file's rule is that an entry describing
 * something that works is worse than none. The prediction was right, which is
 * why there is nothing left to link to.
 *
 * ── FOUR OUTCOMES, AND THREE OF THEM ARE NOT ERRORS ───────────────────────
 * A typo is not a failure of the app, and neither is a card from another deck.
 * They are answers, and the field says them in its own error slot. Only a
 * thrown error is an error — the query itself failing — and that is left to
 * throw so the caller can render the generic failure it renders everywhere
 * else.
 */
import { getCardByCode, getTrackFor } from './content';
import type { Card } from './content';
import { decodeScan } from './scanCode';
import { saveCard } from './session';
import type { Locale } from '../i18n';

export type ScanOutcome =
  /** Written. The caller re-reads the session and the card is on screen. */
  | { kind: 'applied'; card: Card; trackId: string | null }
  /** Not a card code at all — a typo, or the wrong QR code entirely. */
  | { kind: 'malformed' }
  /** A well-formed code this deck does not have. */
  | { kind: 'unknown'; code: string };

/**
 * Decode, look up, pair, and write — in that order, and stopping at the first
 * thing that says no.
 *
 * THE TRACK IS LOOKED UP FROM THE PAIR, not from the card. A card is what a
 * person draws; which recording it plays depends on the exercise it is drawn
 * in (`exercise_tracks`), and a pair with no recording is ordinary — it writes
 * null and the listen step says so rather than failing here.
 */
export async function scanCardInto(
  sessionId: string,
  exerciseId: string,
  scanned: string,
  locale: Locale,
): Promise<ScanOutcome> {
  const code = decodeScan(scanned);
  if (code === null) return { kind: 'malformed' };

  const card = await getCardByCode(code, locale);
  if (card === null) return { kind: 'unknown', code };

  const track = await getTrackFor(exerciseId, card.id);
  await saveCard(sessionId, card.id, track?.id ?? null);

  return { kind: 'applied', card, trackId: track?.id ?? null };
}

/**
 * ── A CODE SCANNED BEFORE THERE WAS ANYWHERE TO PUT IT ────────────────────
 *
 * The deep link's awkward case, and it is the FIRST thing a new person does:
 * they have the deck in their hands, so they point the camera at a card before
 * they have started anything. There is no session, so there is nothing to
 * write the card to.
 *
 * The code is held rather than dropped, and then PRE-FILLED into the scan
 * step's field — not written to the session behind the person's back. The
 * difference matters: arriving at the scan step to find a card already drawn,
 * minutes later and after choosing an exercise, would be the app having
 * decided something on your behalf. Arriving to find the code you scanned
 * already typed in is the app having remembered.
 *
 * `sessionStorage`, not `localStorage`: a held code belongs to the tab that
 * did the scanning and to this visit. A code still sitting there next week is
 * not a memory, it is a surprise. Every access is wrapped — private mode
 * throws on the accessor itself, and the whole feature is a convenience, so
 * losing it silently is correct.
 */
const HELD_CODE = 'musie-scanned-code';

export function holdCode(code: string): void {
  try {
    window.sessionStorage.setItem(HELD_CODE, code);
  } catch {
    /* Private mode, or storage disabled. The person types the code instead. */
  }
}

/** Read it once and forget it. Taking rather than peeking is what stops one
 *  scan pre-filling every session that follows it in this tab. */
export function takeHeldCode(): string | null {
  try {
    const held = window.sessionStorage.getItem(HELD_CODE);
    window.sessionStorage.removeItem(HELD_CODE);
    return held;
  } catch {
    return null;
  }
}
