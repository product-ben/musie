/**
 * `src/lib/audio.ts` without the private bucket: the one piece this page plays
 * is a static file, fetched WHOLE and handed to the mixer as a `blob:` URL.
 *
 * Why whole, and not streamed: musie.org serves static files without `Range`
 * (200, never 206), and Safari on iOS plays nothing from such a host — the
 * mixer would hand the step to its simulated clock and the timer would run
 * over silence. Measured and written up in Reflexion's own `lib__audio.ts`,
 * 2026-11-19; this is the same fix, cut down to the one file.
 *
 * The download starts at module load, so it runs while the overview is being
 * read. The mixer's `resolving` holds the play button until the URL lands, so
 * a slow download is a button that waits, not a countdown over silence.
 * A download that fails falls back to the plain URL.
 */
import { AUDIO_SRC } from '../fixture';

/* The rest of the real module, so an import of something not overridden here
   still resolves — and, if it reaches the bucket, hits the Supabase shim. */
export * from '../../../../src/lib/audio';

const held = new Map<string, Promise<string>>();

function hold(url: string): Promise<string> {
  const known = held.get(url);
  if (known !== undefined) return known;
  const pending = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.blob();
    })
    /* Safari will not play a blob without a media type. */
    .then((blob) => URL.createObjectURL(blob.type === '' ? new Blob([blob], { type: 'audio/mpeg' }) : blob))
    .catch((error: unknown) => {
      console.warn(`[focus-sheet] could not download "${url}" — streaming it instead`, error);
      held.delete(url);
      return url;
    });
  held.set(url, pending);
  return pending;
}

if (typeof window !== 'undefined') void hold(AUDIO_SRC);

function staticUrl(src: string | null): string | null {
  if (src === null || src.trim() === '') return null;
  return src.startsWith('/') ? src : null;
}

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
