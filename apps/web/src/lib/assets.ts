/**
 * Content image paths, made root-relative.
 *
 * ── WHY THIS IS A FILE AND NOT A LINE ─────────────────────────────────────
 * It lived in `routes/Exercises.tsx` until 2026-10-09, which was right while
 * one screen drew a content image. The diary entry draws one now, and a second
 * copy of a correctness rule is how the two drift — the one that matters here
 * is subtle enough that an inline `/${url}` looks finished and is not.
 *
 * ── WHAT THE RULE IS ──────────────────────────────────────────────────────
 * THE ROW STORES IT RELATIVE — `assets/web/exercises/body-scan.webp`, with no
 * leading slash — so the browser resolves it against the CURRENT PATH. On
 * `/exercises` that happens to be right: one segment, so it lands on
 * `/assets/web/…`. On `/dev/deck` it is two segments and the same string
 * resolves to `/dev/assets/web/…`, which is a 404 and an empty band where the
 * picture should be. `/diary/:id` is two segments as well, so the diary entry
 * is the first screen where the luck runs out rather than holds.
 *
 * Logged in OPEN-QUESTIONS.md. Absolute URLs and paths that already lead with
 * a slash are returned untouched, so this is safe to apply to anything the
 * content tables hand over.
 */
export function fromRoot(url: string): string {
  if (/^(https?:)?\/\//.test(url) || url.startsWith('/')) return url;
  return `/${url}`;
}

/**
 * Content images, wherever they now live.
 *
 * ── WHY `fromRoot` ALONE STOPPED BEING ENOUGH ─────────────────────────────
 * Every `image_url` in the content tables has been a BUNDLE PATH —
 * `assets/web/cards/mc-01.webp`, a file committed under `apps/web/public/`.
 * Artwork is a row and a bucket object from 2026-10-14, so the column now
 * holds one of two shapes and a screen cannot know which.
 *
 * ── AND WHY THE COLUMN DOES NOT SIMPLY HOLD A URL ─────────────────────────
 * A full URL would bake the project ref into a content row:
 * `127.0.0.1:54321` locally and `xliwtiiopwyfunxkdmxh.supabase.co` on hosted,
 * so the same row could not be valid in both. `pnpm content:pull` exists to
 * make the local stack match hosted exactly, and a row that has to be
 * rewritten in transit is a row that will one day arrive unrewritten. So the
 * column keeps a KEY and this function builds the address.
 *
 * `exercises.image_url` and `user_types.image_url` still hold bundle paths and
 * are not moving, which is why both shapes have to survive rather than one
 * replacing the other.
 */
export function contentImageUrl(url: string, storageBase?: string): string {
  /* Already absolute, or already root-relative: `fromRoot`'s own rule. */
  if (/^(https?:)?\/\//.test(url) || url.startsWith('/')) return url;

  /* An artwork object key — `art-07-a3f91b2c.webp`. The bucket is public, so
     this is a plain URL and no signing is involved: the nine card pictures
     are already public, committed under `apps/web/public/` in a public
     repository, and a private bucket would force an asynchronous signed URL
     into every screen that draws a card. */
  if (/^art-[0-9]{2,}-/.test(url)) {
    const base = storageBase ?? import.meta.env.VITE_SUPABASE_URL;
    if (typeof base !== 'string' || base === '') {
      /* Nothing to build an address out of. Returning the bare key gives a
         404 at a path that names the key, which is a readable failure; a
         thrown error here would take a whole screen down over one picture. */
      return url;
    }
    return `${base.replace(/\/+$/, '')}/storage/v1/object/public/artworks/${url}`;
  }

  return fromRoot(url);
}
