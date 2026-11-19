-- ═══════════════════════════════════════════════════════════════════════════
-- The experiments' media: a PUBLIC bucket, because musie.org cannot stream.
--
-- Ben, 2026-11-19. The body scan of experiment „Reflexion 01“ played silence
-- on an iPhone. Its audio sat in `apps/web/public/`, and musie.org serves that
-- folder as Cloudflare Workers static assets, which IGNORE `Range`:
-- `curl -r 0-1` gets `200` and the whole file, never `206`. Safari on iOS
-- will not play <audio> from a server that cannot answer a byte range. The
-- app never met it, because its recordings come from the `tracks` bucket, and
-- Supabase Storage answers ranges (`206`, measured on the local stack).
--
-- The experiments cannot use `tracks`: their visitors are not signed in, and
-- that bucket signs URLs only for `authenticated`. So they get a bucket of
-- their own, and it is public, because a page with no session has nothing to
-- sign with.
--
-- ── WHY PUBLIC IS NOT THE MISTAKE `20260921160000` WARNS ABOUT ────────────
-- That migration keeps `tracks` private so the licensed masters are not on
-- the open internet. Everything here is ALREADY on the open internet: it is
-- served from musie.org/experiments/ at the same kind of guessable URL. This
-- bucket changes how those files are served, not who can reach them. What
-- must never land here is a master that is private today. Uploading one is
-- an operator act (`pnpm experiments:media`), so that is where to look.
--
-- ── THE KEY IS THE PATH UNDER /experiments/ ───────────────────────────────
-- `apps/web/public/experiments/reflexion/media/aura.mp3` is the object
-- `reflexion/media/aura.mp3`. One rule, no table to keep in step, and any
-- later experiment's media follows it without a migration.
-- ═══════════════════════════════════════════════════════════════════════════

-- Audio and video only: the two kinds that need byte ranges. A page's images
-- and HTML stay in `apps/web/public/`, where Cloudflare serves them well.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'experiments',
  'experiments',
  true,
  52428800,                                     -- 50 MiB; the largest today is 5.9 MB
  array['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'video/mp4', 'video/webm']
)
on conflict (id) do nothing;

-- ── ACCESS ────────────────────────────────────────────────────────────────
-- No policy at all, on purpose. The public URL
-- (`/storage/v1/object/public/experiments/…`) bypasses RLS, so reading needs
-- none. With no insert, update or delete policy on `storage.objects` for
-- this bucket, `anon` and `authenticated` cannot write to it. Only the
-- service role can, which is what `supabase storage cp --linked` uses.
-- `experiments-media.db.test.ts` checks that a visitor's upload is refused.
