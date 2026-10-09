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
