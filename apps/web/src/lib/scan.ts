/**
 * A scanned code, turned into a session that carries the card — E.0/E.1.
 *
 * `scanCode.ts` next door is the pure half: it says what a code IS. This is
 * the half that talks to the database, and it exists so that a deck card
 * named on the scan step — read by the in-app camera or typed — and a deck
 * card scanned with the phone's camera (`/s/:code`, written on the intro's
 * „Weiter") perform exactly the same act. Two call sites writing their own version of "look it up, find its
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
import { getCardByCode } from './content';
import type { Card } from './content';
import { decodeScan } from './scanCode';
import { saveCard } from './session';
import type { MusicMode } from './session';
import type { Locale } from '../i18n';

export type ScanOutcome =
  /** Written. The caller re-reads the session and the card is on screen. */
  | { kind: 'applied'; card: Card; trackId: string | null; musicMode: MusicMode | null }
  /** Not a card code at all — a typo, or the wrong QR code entirely. */
  | { kind: 'malformed' }
  /** A well-formed code this deck does not have. */
  | { kind: 'unknown'; code: string };

/**
 * Decode, look up, and write — in that order, and stopping at the first thing
 * that says no.
 *
 * THE TRACK IS NOT LOOKED UP HERE — 2026-11-20. A card has two pieces, and
 * which one plays depends on the goal this session was started from, so the
 * database decides when the card is written (`saveCard`). A card with no piece
 * in this session's mode is ordinary while Lucia fills them in: null comes
 * back, and the listen step says „Kein Track zugeordnet" rather than failing
 * here.
 */
export async function scanCardInto(
  sessionId: string,
  scanned: string,
  locale: Locale,
): Promise<ScanOutcome> {
  const code = decodeScan(scanned);
  if (code === null) return { kind: 'malformed' };

  const card = await getCardByCode(code, locale);
  if (card === null) return { kind: 'unknown', code };

  const { trackId, musicMode } = await saveCard(sessionId, card.id);

  return { kind: 'applied', card, trackId, musicMode };
}
