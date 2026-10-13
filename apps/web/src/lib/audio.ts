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
 *
 * ── A SIGNED URL IS A CACHE KEY, SO IT IS MINTED ONCE PER PAGE ────────────
 * This said "minted per mount, so a returning listener gets a fresh one" until
 * 2026-10-11, and that was the single worst loading decision in the app.
 *
 * A Supabase signed URL carries a token whose `iat` and `exp` differ on every
 * call, so TWO MINTS OF ONE OBJECT ARE TWO DIFFERENT URLs — and therefore two
 * different entries in the browser's HTTP cache. Leaving the listen step and
 * coming back re-downloaded the whole file: 3.5 MB for a card track, and about
 * 11 MB for a twelve-minute listening bed, on mobile data, on a step whose
 * three-viewport design invites exactly that movement.
 *
 * So the minted URL is held in a module-level cache for the life of the page
 * and re-minted only when it is close to expiring. The second mount is then a
 * cache hit with no request at all, and the bytes behind it are reused.
 *
 * `forgetTrackUrl` is the other half: a token that expired mid-session (paused
 * for fifty minutes, which outlives the hour) is dropped so the next read
 * mints a fresh one — rather than the step falling to its simulated clock,
 * which is the right answer for a file that does not exist and the wrong one
 * for a URL that got old.
 */
import { getSupabase } from './supabase';
import { useAsync } from './useAsync';

/** The bucket the migration creates. Private; every read is signed. */
const BUCKET = 'tracks';

/** Seconds a signed URL stays good for. See the docblock. */
export const SIGNED_URL_TTL = 60 * 60;

/**
 * Re-mint this many seconds before the token actually expires.
 *
 * A URL handed out at 59 minutes 59 seconds is valid and useless: the request
 * it is used for may not have started yet. Five minutes is longer than any
 * buffering this app does and shorter than the shortest exercise.
 */
const TTL_MARGIN = 5 * 60;

/** Minted URLs, by object key. Module-level, so it survives every unmount. */
const minted = new Map<string, { url: string; at: number }>();

function fresh(src: string): string | null {
  const found = minted.get(src);
  if (found === undefined) return null;
  if ((Date.now() - found.at) / 1000 > SIGNED_URL_TTL - TTL_MARGIN) {
    minted.delete(src);
    return null;
  }
  return found.url;
}

/** Enough to start instantly: about eight seconds of music, twenty of speech. */
const WARM_BYTES = 128 * 1024;

/** Warmed once per key per page — a second warm would be a second download. */
const warmed = new Set<string>();

/**
 * Pull the first bytes of each file into the browser's HTTP cache.
 *
 * ── WHY, AND WHERE THE TIME COMES FROM ────────────────────────────────────
 * The Einsteigen step is ten to thirty seconds of reading two sentences and
 * looking at two answers that are already chosen. The cut is therefore
 * knowable before anybody touches anything, and those seconds are free — so
 * the first press of play costs a decode rather than a connection.
 *
 * ── IT IS ONLY SAFE BECAUSE THE URL IS STABLE ─────────────────────────────
 * A warmed range is reused by the `<audio>` element only if it asks for the
 * same URL, and a signed URL is a fresh token on every mint. `signedTrackUrls`
 * caches per page, and `music:upload` writes `immutable` with a content-hashed
 * key, so the two halves of that are in place. Without either, this would
 * download 256 KB and throw it away.
 *
 * 128 KB each, and that is the whole wager if the person leaves the step: a
 * quarter of a megabyte against a twelve-minute file they were about to play.
 *
 * Never awaited and never fatal. A failed warm is a slower first press, which
 * is what the code did before this existed.
 */
export function warmTrackBytes(srcs: (string | null)[]): void {
  for (const src of srcs) {
    if (src === null || src.trim() === '') continue;
    if (warmed.has(src)) continue;

    const url = fresh(src);
    /* No URL yet means the caller is early: the next call warms it. Minting
       one here would make a prefetch into a round trip the caller did not
       ask for. */
    if (url === null) continue;

    warmed.add(src);
    void fetch(url, { headers: { Range: `bytes=0-${WARM_BYTES - 1}` } })
      .catch(() => { /* a slower first press, and nothing else */ });
  }
}

/**
 * Drop a cached URL, so the next read mints a new one.
 *
 * For the one case the cache makes possible: an `<audio>` that errors on a
 * non-null `src` after a long pause, where the token has expired and the file
 * is perfectly fine. The caller re-reads, gets a new URL and restores its
 * position.
 */
export function forgetTrackUrl(src: string | null): void {
  if (src !== null) minted.delete(src);
}

/** Exported for the test, which must be able to start from nothing. */
export function clearTrackUrls(): void {
  minted.clear();
  warmed.clear();
}

/**
 * Signed URLs for several object keys, in ONE round trip.
 *
 * `createSignedUrls` rather than a `Promise.all` of `createSignedUrl`: the
 * listening step plays two stems, and two serial — or even two parallel —
 * round trips before any audio can start is latency spent for nothing. Returns
 * a map from the keys it was given, missing whatever could not be signed.
 *
 * Nulls and blanks are dropped before the request: "there is no recording" is
 * ordinary and must not be asked about.
 */
export async function signedTrackUrls(srcs: (string | null)[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  const wanted: string[] = [];

  for (const src of srcs) {
    if (src === null || src.trim() === '') continue;
    const cached = fresh(src);
    if (cached !== null) found.set(src, cached);
    else if (!wanted.includes(src)) wanted.push(src);
  }

  if (wanted.length === 0) return found;

  const { data, error } = await getSupabase()
    .storage.from(BUCKET)
    .createSignedUrls(wanted, SIGNED_URL_TTL);

  if (error !== null || data === null) {
    console.warn(
      `[musie] no signed URLs for ${wanted.join(', ')} — the clock will run instead:`,
      error?.message ?? 'no data',
    );
    return found;
  }

  const at = Date.now();
  for (const row of data) {
    /* The API answers per path, so one bad key does not fail the others. */
    if (row.error !== null || row.path === null || row.signedUrl === null) {
      console.warn(
        `[musie] no signed URL for "${row.path ?? 'unknown'}" — the clock will run instead:`,
        row.error ?? 'no url',
      );
      continue;
    }
    minted.set(row.path, { url: row.signedUrl, at });
    found.set(row.path, row.signedUrl);
  }

  return found;
}

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
  /* ONE PATH THROUGH THE CACHE. The single-key case is the batch with one key,
     rather than a second implementation that could cache differently. */
  return (await signedTrackUrls([src])).get(src) ?? null;
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
