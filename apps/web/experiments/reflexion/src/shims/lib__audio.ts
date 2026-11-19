/**
 * `src/lib/audio.ts` without the private bucket: a "signed URL" is the static
 * file under /experiments/reflexion/media/ that stands in for the object key
 * (`store.MEDIA`), or the src itself where it is already a path. That path is
 * then turned into what actually plays (below).
 *
 * `useTrackSource` is re-implemented rather than re-exported: the real one
 * calls the real `signedTrackUrl` inside its own module, which an override
 * here would not reach.
 *
 * ── WHY NOT STRAIGHT FROM musie.org · 2026-11-19 ─────────────────────────
 * Ben: „beim Body Scan hört man den Audio-Track nicht“. musie.org serves
 * `public/` as Cloudflare Workers static assets, and those IGNORE `Range`:
 * `curl -r 0-1` gets `200` and the whole file, never `206`. Safari on iOS
 * plays <audio> through AVFoundation, which needs byte ranges, so the element
 * errored and the listen step ran its simulated clock over silence. Desktop
 * Chrome and the Vite dev server never showed it.
 *
 * ── STREAMED FROM THE `experiments` BUCKET ───────────────────────────────
 * Ben chose streaming over downloading. Supabase Storage answers ranges, so
 * the same file sits in the public `experiments` bucket, at the path below
 * /experiments/ (`pnpm experiments:media` puts it there;
 * `20261119170000_experiments_media_bucket.sql` says why public). Here, at
 * page load, the bucket is asked for two bytes of each file. `206` means the
 * mixer gets the bucket's URL and the browser streams.
 *
 * ── AND WHEN THE BUCKET CANNOT ───────────────────────────────────────────
 * Any other answer — the file not uploaded yet, no `VITE_SUPABASE_URL`, the
 * network — falls back to the first fix: the static file downloaded whole and
 * played from a `blob:` URL, which needs no ranges and so plays on iOS too.
 * Slower to start, never silent. So merging before uploading is safe, and a
 * later experiment that forgets the upload still plays. If even the download
 * fails, the plain path is used, which is what the page did originally.
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

/* ── where it plays from ──────────────────────────────────────────────── */

const SUPABASE_URL: string | undefined = import.meta.env.VITE_SUPABASE_URL;
const PREFIX = '/experiments/';

/** `/experiments/reflexion/media/aura.mp3` → the public object `reflexion/media/aura.mp3`. */
function bucketUrl(path: string): string | null {
  if (!SUPABASE_URL || !path.startsWith(PREFIX)) return null;
  const key = path.slice(PREFIX.length);
  return `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/experiments/${key}`;
}

/** Does this URL answer a byte range? Only `206` says yes. */
async function answersRanges(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { headers: { Range: 'bytes=0-1' } });
    void response.body?.cancel().catch(() => {});
    return response.status === 206;
  } catch {
    return false;
  }
}

/** Static path → the URL the mixer gets: the bucket's, a `blob:`, or the path itself. */
const playing = new Map<string, Promise<string>>();

function downloaded(path: string): Promise<string> {
  return fetch(path)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.blob();
    })
    /* Safari will not play a blob without a media type. */
    .then((blob) => URL.createObjectURL(blob.type === '' ? new Blob([blob], { type: 'audio/mpeg' }) : blob))
    .catch((error: unknown) => {
      console.warn(`[reflexion] could not download "${path}" — playing it straight`, error);
      /* Forgotten, so the next ask (the listen step mounting) tries again. */
      playing.delete(path);
      return path;
    });
}

function playable(path: string): Promise<string> {
  const known = playing.get(path);
  if (known !== undefined) return known;
  const remote = bucketUrl(path);
  const pending = (remote === null ? Promise.resolve(false) : answersRanges(remote))
    .then((streams) => {
      if (streams && remote !== null) return remote;
      console.warn(`[reflexion] "${path}" is not in the experiments bucket — downloading it whole instead`);
      return downloaded(path);
    });
  playing.set(path, pending);
  return pending;
}

/* The page knows its exercise before React renders (`run.ts`), so its files
   are looked up now, while the intro is read. Harfe plays none. */
const PAGE_FILES: Record<string, readonly string[]> = {
  'body-scan-soundwalk': Object.values(store.MEDIA),
  'free-rein': [FREIE_BAHN.trackSrc],
};
if (typeof window !== 'undefined') {
  for (const path of PAGE_FILES[RUN.exercise?.exerciseId ?? ''] ?? []) void playable(path);
}

/* ── the module's surface, as the app's `lib/audio.ts` has it ─────────── */

/** The app pulls the first 128 KB here; this page has already asked (above). */
export function warmTrackBytes(srcs: (string | null)[]): void {
  for (const src of srcs) {
    const path = staticUrl(src);
    if (path !== null) void playable(path);
  }
}

export function forgetTrackUrl(_src: string | null): void {}

/* Not revoked: an element still playing from a blob would go silent. */
export function clearTrackUrls(): void {
  playing.clear();
}

export async function signedTrackUrls(srcs: (string | null)[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  await Promise.all(srcs.map(async (src) => {
    const path = staticUrl(src);
    if (src !== null && path !== null) found.set(src, await playable(path));
  }));
  return found;
}

export async function signedTrackUrl(src: string | null): Promise<string | null> {
  const path = staticUrl(src);
  return path === null ? null : playable(path);
}

export function useTrackSource(src: string | null): { url: string | null; resolving: boolean } {
  const { data, loading } = useAsync(() => signedTrackUrl(src), `track-src:${src ?? 'none'}`);
  if (src === null || src.trim() === '') return { url: null, resolving: false };
  return { url: data, resolving: loading };
}
