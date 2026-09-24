/**
 * Reaching a recording — E.4.
 *
 * ── THE FILES MOVED, AND THE OLD RESOLVER PREDICTED IT ────────────────────
 * `tracks.src` used to hold a repo-relative path and `trackUrl` in diary.ts
 * turned it into `/assets/audio/…`. Its docblock said the day the audio moved
 * to a bucket it would not have to be found again, and that day is this one —
 * it was found, and it is gone. `src` now holds an OBJECT KEY in the private
 * `tracks` bucket: `trk-01.mp3`, the id and nothing else, because
 * `mc-01-joy.mp3` names the card and the feeling.
 *
 * ── SIGNED, WHICH MAKES IT ASYNCHRONOUS, WHICH IS THE WHOLE COST ──────────
 * A private bucket has no permanent URL. The client asks for a signed one and
 * gets back something that expires, so what used to be a pure string function
 * called inline in JSX is now a request — and the two `<audio>` elements that
 * consumed it (the listen step and the diary card) have to wait for it.
 *
 * That is why `useTrackSource` exists rather than each caller doing this: they
 * would each invent their own loading state, and the one in the listen step is
 * load-bearing — starting the simulated clock because a URL had not arrived
 * yet would be indistinguishable from starting it because there is no file.
 *
 * ── AN HOUR, BECAUSE THE LONGEST EXERCISE IS A QUARTER OF ONE ─────────────
 * Long enough that no session outlives its own URL — Sound Journey runs 12–15
 * minutes and somebody may pause in the middle of it — and short enough
 * that a URL pasted out of a network tab stops working the same afternoon.
 * The URL is minted per mount, so a returning listener gets a fresh one.
 */
import { getSupabase } from './supabase';
import { useAsync } from './useAsync';

/** The bucket the migration creates. Private; every read is signed. */
const BUCKET = 'tracks';

/** Seconds a signed URL stays good for. See the docblock. */
export const SIGNED_URL_TTL = 60 * 60;

/**
 * A playable URL for an object key, or null.
 *
 * NULL HAS TWO CAUSES AND THEY ARE NOT THE SAME, which is why this logs one
 * and not the other:
 *
 *   · `src` is null — there is no recording, which is ORDINARY. Five of the
 *     nine cards are silent and the schema says so with a null rather than
 *     with a path to a file that was never there. Nothing is logged; nothing
 *     is wrong.
 *   · the request failed — a missing object, an expired token, a policy that
 *     stopped matching. That IS wrong, and it is logged, because the listen
 *     step's fallback swallows it otherwise: the clock runs, the gate opens,
 *     and a session completes having played silence while looking perfect.
 *
 * It resolves rather than throwing, because a failure here must not take the
 * step down — the clock is a real fallback and the person is mid-session.
 */
export async function signedTrackUrl(src: string | null): Promise<string | null> {
  if (src === null || src.trim() === '') return null;

  const { data, error } = await getSupabase()
    .storage.from(BUCKET)
    .createSignedUrl(src, SIGNED_URL_TTL);

  if (error !== null || data === null) {
    console.warn(
      `[musie] no signed URL for "${src}" — the clock will run instead:`,
      error?.message ?? 'no data',
    );
    return null;
  }
  return data.signedUrl;
}

/**
 * What an `<audio>` should point at, and whether we know yet.
 *
 * ── `resolving` IS NOT A SPINNER, IT IS A GUARD ───────────────────────────
 * The listen step falls back to a simulated clock when there is no playable
 * file, and that fallback is correct and permanent for five of the nine
 * cards. But "the URL has not arrived yet" looks exactly like "there is no
 * file" to anything that only checks whether a URL is present — and getting
 * that wrong means a card WITH a recording silently plays a countdown
 * instead, on a slow connection, intermittently. So callers wait for
 * `resolving` to be false before concluding anything.
 *
 * `src` is the key rather than the object, so the request re-fires when the
 * track changes and not when its row is re-read.
 */
export function useTrackSource(src: string | null): {
  url: string | null;
  resolving: boolean;
} {
  const { data, loading } = useAsync(() => signedTrackUrl(src), `track-src:${src ?? 'none'}`);

  /* A null `src` is answered without a request, so it must not report itself
     as still resolving — the step would wait forever for a file that the
     schema has already said does not exist. */
  if (src === null || src.trim() === '') return { url: null, resolving: false };

  return { url: data, resolving: loading };
}
