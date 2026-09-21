-- ═══════════════════════════════════════════════════════════════════════════
-- The recordings: a private bucket, and the four facts the seed invented.
--
-- E.4. Four recordings were cleared on 2026-09-21 (Epidemic Sound). Five of
-- the nine deck cards stay silent, and this migration makes that state
-- HONEST rather than accidental — see `src is null` below.
--
-- ── WHY A BUCKET AND NOT `apps/web/public/` ───────────────────────────────
-- Serving the files from the app's own assets would work today and cost
-- nothing to write. It was rejected for three reasons, in ascending order of
-- how expensive they are to undo:
--
--   1. The repository. A licensed master committed to git cannot be taken
--      back out of it; `git rm` leaves the object in every clone's history.
--   2. The bundle. Everything under `apps/web/public/` ships to Netlify at a
--      guessable public URL with no access control and no expiry.
--   3. The filename. `mc-01-joy.mp3` names the card AND the feeling, which is
--      the same leak the opaque `trk-NN` ids were chosen to prevent. Object
--      keys below are `trk-01.mp3`: the id, and nothing else.
--
-- ── WHAT THIS BUCKET DOES AND DOES NOT PROTECT ────────────────────────────
-- It is private, and the client reaches a file through a SIGNED URL it mints
-- for itself. That is a real boundary against the open internet and a
-- deliberate non-boundary against a signed-in listener: any authenticated
-- user may read any object here, because `tracks.src` is already granted to
-- the client and the audio is not the secret.
--
-- THE SECRET IS THE NAME. `tracks.title` and `tracks.artist` are withheld by
-- column grant, and E.5's `reveal-track` is what hands them over once the
-- listening is done. A bucket cannot protect a title, and this one does not
-- try; it protects the file from being hotlinked off a public URL forever.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── THE BUCKET ────────────────────────────────────────────────────────────
-- Created here rather than in `config.toml`, because config.toml configures
-- the LOCAL stack only and this has to exist on the hosted project too —
-- which `supabase db push` does by running this file, and would not do by
-- reading a local config. `on conflict do nothing` so a re-run is safe.
--
-- `public = false` is the whole point. A public bucket serves every object at
-- a permanent unauthenticated URL, which is the thing rejected above.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tracks',
  'tracks',
  false,
  52428800,                                    -- 50 MiB; the largest is 6.9 MB
  array['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav']
)
on conflict (id) do nothing;

-- ── ACCESS ────────────────────────────────────────────────────────────────
-- `storage.objects` is Supabase's table, not ours: it already has RLS enabled
-- and the grants `authenticated` needs. So CLAUDE.md rule 2's revoke-then-
-- grant does not apply here — there is no table of ours to revoke — and what
-- IS needed is the policy, without which a signed-in user reads nothing and
-- the listen step falls back to its clock on every card.
--
-- SELECT only, and only in this bucket. No insert, update or delete policy
-- anywhere: uploading is an operator act done with the service role, exactly
-- as content is seeded by migration rather than written by a client.
create policy tracks_objects_select
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'tracks');

-- ── `src` BECOMES AN OBJECT KEY, AND MAY NOW BE NULL ──────────────────────
-- It held a repo-relative path — `assets/audio/mc-01-joy.mp3` — pointing at
-- files that never existed. It now holds the object's key inside the bucket.
--
-- NULLABLE IS THE REAL CHANGE. Five cards have no recording, and until now
-- that was expressed as a path to a file that was not there: the browser
-- failed to load it, `play()` rejected, and the simulated clock took over.
-- That works, and it is indistinguishable from a recording that is MEANT to
-- be there and is broken. `null` says which one this is, so the day a signed
-- URL fails for a track that has a file, it can be treated as the fault it is
-- instead of being swallowed by a fallback built for absence.
alter table public.tracks alter column src drop not null;

comment on column public.tracks.src is
  'Object key in the private `tracks` bucket — `trk-01.mp3`, the id and '
  'nothing else. NULL means there is no recording for this row, which is '
  'ordinary: five of the nine cards are silent. A null is absence; a signed '
  'URL that fails for a non-null src is a fault.';

-- ── THE FOUR THAT EXIST ───────────────────────────────────────────────────
-- Title, artist and duration were INVENTED by the seed — `Morgenlicht` by
-- `Ida Sperber` and the rest are placeholder names written to the shape the
-- flow needed. These four are the real ones, read from the files' own ID3
-- tags; the durations are measured.
--
-- The card assignment is MOOD-MATCHED, from those same tags, and Ben chose it
-- over a random draw on 2026-09-21. The pairings themselves live in
-- `exercise_tracks` and do not move — only which recording a `trk-NN` row
-- describes.
--
-- `licence_ref` carries the Epidemic Sound track name, which is the only
-- stable identifier the download gives us. Worth knowing: ES is a
-- SUBSCRIPTION licence, not the per-track clearance BUILD-PLAN assumed
-- everywhere it says "cleared".
update public.tracks set
  src = 'trk-01.mp3', duration_seconds = 219,
  title = 'Little Yellow Petals', artist = 'Rachel Sandy',
  licence_ref = 'Epidemic Sound · Little Yellow Petals · Rachel Sandy'
where id = 'trk-01';                                      -- MC-01 Joy

update public.tracks set
  src = 'trk-02.mp3', duration_seconds = 102,
  title = 'Wait for It', artist = 'Jon Björk',
  licence_ref = 'Epidemic Sound · Wait for It · Jon Björk'
where id = 'trk-02';                                      -- MC-02 Sadness

update public.tracks set
  src = 'trk-04.mp3', duration_seconds = 168,
  title = 'Bats and Rats', artist = 'Ludvig Moulin',
  licence_ref = 'Epidemic Sound · Bats and Rats · Ludvig Moulin'
where id = 'trk-04';                                      -- MC-04 Fear

update public.tracks set
  src = 'trk-05.mp3', duration_seconds = 191,
  title = 'High Sierra Call', artist = 'Roy Edwin Williams',
  licence_ref = 'Epidemic Sound · High Sierra Call · Roy Edwin Williams'
where id = 'trk-05';                                      -- MC-05 Calm

-- ── THE FIVE THAT DO NOT ──────────────────────────────────────────────────
-- Anger, Longing, Gratitude, Loneliness and Hope. `src` goes null; the
-- invented title and artist stay, because the columns are `not null` and a
-- placeholder nobody can read is harmless — neither is granted to the client,
-- and E.5's reveal is reached only through a recording that played.
--
-- `duration_seconds` keeps its invented value ON PURPOSE. It is `not null`
-- and positive by constraint, and it is what the simulated clock counts down
-- from — so a made-up number here is the difference between a countdown and
-- a broken one. It stops being fiction the day a file arrives.
update public.tracks set src = null
where id in ('trk-03', 'trk-06', 'trk-07', 'trk-08', 'trk-09');
