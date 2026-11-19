/**
 * `src/lib/audio.ts` without the private bucket: a "signed URL" is the static
 * file under /experiments/reflexion/media/ that stands in for the object key
 * (`store.MEDIA`), or the src itself where it is already a path.
 *
 * `useTrackSource` is re-implemented rather than re-exported: the real one
 * calls the real `signedTrackUrl` inside its own module, which an override
 * here would not reach.
 *
 * ── WHY THE FILE IS DOWNLOADED WHOLE AND PLAYED FROM MEMORY · 2026-11-19 ──
 * Ben: „beim Body Scan hört man den Audio-Track nicht“, on musie.org.
 *
 * MEASURED: musie.org serves these files as Cloudflare Workers static assets,
 * and that host IGNORES `Range`. `curl -r 0-1` on body-scan-de.mp3 comes back
 * `200` with all 5,855,525 bytes, never `206 Partial Content` — on musie.org
 * and on workers.dev alike.
 *
 * WHY THAT IS SILENCE: Safari on iOS plays <audio> through AVFoundation, which
 * asks for byte ranges and does not play from a server that cannot answer
 * them (Apple's own requirement for media on iOS). The element errors, the
 * mixer's `onError` hands the listen step to its simulated clock, and the
 * timer runs over nothing. Desktop Chrome streams a `200` without complaint,
 * and the Vite dev server does answer ranges, which is why neither a desktop
 * walk nor `experiment:reflexion:dev` ever showed it. The app proper never
 * met it: its tracks come from Supabase Storage, which answers ranges.
 *
 * So each file is fetched once, whole, and handed to the mixer as a `blob:`
 * URL, which a browser seeks inside without asking any server. The cost is
 * the whole file before the first press — 5.9 MB per body-scan stem, 4.6 MB
 * for Aura — which is why the download starts at module load, while the intro
 * is being read, rather than when the listen step mounts. The mixer's
 * `resolving` already holds the play button until the URL lands, so a slow
 * download is a play button that waits, not a countdown over silence.
 *
 * A download that fails falls back to the plain URL: what this page did
 * before, so the change cannot leave a browser worse off than it was.
 *
 * The alternatives stream instead of downloading — a Worker that answers
 * `Range`, or the files on a host that does (R2, a public Storage bucket) —
 * and each is a change to deployment rather than to this page, so they are
 * logged in apps/web/OPEN-QUESTIONS.md as Ben's call.
 */
import { useAsync } from '../../../../src/lib/useAsync';
import { FREIE_BAHN } from '../config';
import * as store from '../data/store';
import { RUN } from '../run';

export { SIGNED_URL_TTL } from '../../../../src/lib/audio';

function staticUrl(src: string | null): string | null {
  if (src === null || src.trim() === '') return null;
  if (src.startsWith('/')) return src;
  const found = store.MEDIA[src];
  if (found === undefined) {
    console.warn(`[reflexion] no static file for "${src}" — the clock will run instead`);
    return null;
  }
  return found;
}

/** Static path → the `blob:` URL it plays from, or the path itself if the download failed. */
const held = new Map<string, Promise<string>>();

function hold(url: string): Promise<string> {
  const known = held.get(url);
  if (known !== undefined) return known;
  const pending = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.blob();
    })
    /* Safari will not play a blob without a media type, and a host that drops
       the header should not get a second way to break playback. */
    .then((blob) => URL.createObjectURL(blob.type === '' ? new Blob([blob], { type: 'audio/mpeg' }) : blob))
    .catch((error: unknown) => {
      console.warn(`[reflexion] could not download "${url}" — streaming it instead`, error);
      /* Forgotten, so the next ask (the listen step mounting) tries again. */
      held.delete(url);
      return url;
    });
  held.set(url, pending);
  return pending;
}

/* The page knows its exercise before React renders (`run.ts`), so the files
   it will play start downloading now. Harfe plays none. */
const PAGE_FILES: Record<string, readonly string[]> = {
  'body-scan-soundwalk': Object.values(store.MEDIA),
  'free-rein': [FREIE_BAHN.trackSrc],
};
if (typeof window !== 'undefined') {
  for (const url of PAGE_FILES[RUN.exercise?.exerciseId ?? ''] ?? []) void hold(url);
}

/** The app pulls the first 128 KB here; this page pulls the whole file (above). */
export function warmTrackBytes(srcs: (string | null)[]): void {
  for (const src of srcs) {
    const url = staticUrl(src);
    if (url !== null) void hold(url);
  }
}

export function forgetTrackUrl(_src: string | null): void {}

/* Not revoked: an element still playing from one would go silent. */
export function clearTrackUrls(): void {
  held.clear();
}

export async function signedTrackUrls(srcs: (string | null)[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  await Promise.all(srcs.map(async (src) => {
    const url = staticUrl(src);
    if (src !== null && url !== null) found.set(src, await hold(url));
  }));
  return found;
}

export async function signedTrackUrl(src: string | null): Promise<string | null> {
  const url = staticUrl(src);
  return url === null ? null : hold(url);
}

export function useTrackSource(src: string | null): { url: string | null; resolving: boolean } {
  const { data, loading } = useAsync(() => signedTrackUrl(src), `track-src:${src ?? 'none'}`);
  if (src === null || src.trim() === '') return { url: null, resolving: false };
  return { url: data, resolving: loading };
}
