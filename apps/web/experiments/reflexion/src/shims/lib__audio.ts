/**
 * `src/lib/audio.ts` without the private bucket: a "signed URL" is the static
 * file under /experiments/reflexion/media/ that stands in for the object key
 * (`store.MEDIA`), or the src itself where it is already a path.
 *
 * `useTrackSource` is re-implemented rather than re-exported: the real one
 * calls the real `signedTrackUrl` inside its own module, which an override
 * here would not reach.
 */
import { useAsync } from '../../../../src/lib/useAsync';
import * as store from '../data/store';

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

const WARM_BYTES = 128 * 1024;
const warmed = new Set<string>();

export function warmTrackBytes(srcs: (string | null)[]): void {
  for (const src of srcs) {
    const url = staticUrl(src);
    if (url === null || warmed.has(url)) continue;
    warmed.add(url);
    void fetch(url, { headers: { Range: `bytes=0-${WARM_BYTES - 1}` } }).catch(() => {});
  }
}

export function forgetTrackUrl(_src: string | null): void {}

export function clearTrackUrls(): void {
  warmed.clear();
}

export async function signedTrackUrls(srcs: (string | null)[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  for (const src of srcs) {
    const url = staticUrl(src);
    if (src !== null && url !== null) found.set(src, url);
  }
  return found;
}

export async function signedTrackUrl(src: string | null): Promise<string | null> {
  return staticUrl(src);
}

export function useTrackSource(src: string | null): { url: string | null; resolving: boolean } {
  const { data, loading } = useAsync(() => signedTrackUrl(src), `track-src:${src ?? 'none'}`);
  if (src === null || src.trim() === '') return { url: null, resolving: false };
  return { url: data, resolving: loading };
}
