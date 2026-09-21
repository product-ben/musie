/**
 * What you heard, asked for only once you have heard it — E.5.
 *
 * ── THE ONE DOOR ──────────────────────────────────────────────────────────
 * `tracks.title` and `tracks.artist` are not granted to this client at all.
 * Asking PostgREST for either fails the whole request rather than returning
 * null, so there is no way to obtain them from the browser except through the
 * `reveal-track` Edge Function, which holds the service role and applies the
 * one rule the grant cannot express: you may learn the name of a recording
 * that was given to YOU, in a session that reached the listening.
 *
 * ── A SESSION ID GOES UP, NEVER A TRACK ID ────────────────────────────────
 * The endpoint takes `sessionId` and reads the track from the row on the
 * server. That is the difference between a reveal and an index: an endpoint
 * accepting a track id would let anyone signed in walk trk-01…trk-09 and
 * collect all nine titles without listening to anything, which is the column
 * grant undone by the thing meant to complete it. So this module does not
 * accept a track id either — there is nowhere to put one.
 *
 * ── NULL IS AN ANSWER, NOT A FAILURE ──────────────────────────────────────
 * Five of the nine cards have no recording. Their rows still carry the seed's
 * invented title and artist, and the function refuses to hand those over:
 * naming a piece somebody did not hear, in the moment the product promises to
 * tell them what they heard, is the one thing this whole mechanism exists to
 * prevent. `track: null` comes back, and the screen says there was nothing.
 */
import { getSupabase } from './supabase';

/** A recording, named. Only ever built from the function's reply. */
export interface RevealedTrack {
  id: string;
  title: string;
  artist: string;
  licenceRef: string | null;
}

export type RevealOutcome =
  /** Named. */
  | { kind: 'revealed'; track: RevealedTrack }
  /** Nothing played, so there is nothing to name. Ordinary. */
  | { kind: 'silent' }
  /** The session has not reached the listening yet. */
  | { kind: 'tooEarly' }
  /** The request failed. Distinct from `silent`, deliberately. */
  | { kind: 'failed' };

interface RevealBody {
  track: { id: string; title: string; artist: string; licence_ref: string | null } | null;
}

/**
 * Ask what played.
 *
 * ERRORS ARE OUTCOMES HERE, not exceptions: this is called from a screen the
 * person is standing on at the end of an exercise, and a thrown error would
 * replace the whole step with a failure page over a piece of trivia. The
 * reveal is the last and least important thing on the screen — the listening
 * already happened — so it degrades to a line of text and nothing else moves.
 */
export async function revealTrack(sessionId: string): Promise<RevealOutcome> {
  const { data, error } = await getSupabase()
    .functions.invoke<RevealBody>('reveal-track', { body: { sessionId } });

  if (error !== null) {
    /* 403 is the function saying "not yet", which is a state and not a fault:
       the reveal can be scrolled to before the gate has been met. Anything
       else is a real failure and is logged, because a reveal that quietly
       says nothing is indistinguishable from a card that has no recording. */
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 403) return { kind: 'tooEarly' };
    console.warn('[musie] reveal-track failed:', error.message);
    return { kind: 'failed' };
  }

  if (data === null || data.track === null) return { kind: 'silent' };

  const { id, title, artist, licence_ref: licenceRef } = data.track;
  return { kind: 'revealed', track: { id, title, artist, licenceRef } };
}
