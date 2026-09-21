-- ═══════════════════════════════════════════════════════════════════════════
-- Take `tracks.licence_ref` back off the client. It was carrying the answer.
--
-- ── FOUND BY A TEST WATCHING THE NETWORK, NOT THE SCREEN ──────────────────
-- E.5's done-when is "the Network tab shows no title or artist until you
-- scroll to the reveal", so its walk records every response body the page
-- receives and asserts on what is IN them. Standing on the listen step, with
-- nothing named anywhere on screen, it found this:
--
--   GET /rest/v1/exercise_tracks?select=track_id,tracks(id,src,duration_seconds,licence_ref)
--   → {"tracks":{"licence_ref":"Epidemic Sound · Little Yellow Petals · Rachel Sandy"}}
--
-- The title AND the artist, in a response the listen step makes before the
-- track has played, through a column the grant explicitly allows.
--
-- ── IT WAS INTRODUCED BY THE FIX FOR SOMETHING ELSE ───────────────────────
-- `licence_ref` was null on every row until 20260921160000 (E.4) filled it in
-- with the only stable identifier an Epidemic Sound download offers — which
-- is the track name and the artist, because that is what ES names its files
-- with. So a column that was harmless while empty became the leak the moment
-- it was populated, and it was populated by the migration that made the
-- recordings real.
--
-- Nothing on screen changed. The column grant looked correct, the opaque ids
-- were still opaque, `title` and `artist` were still refused by name, and
-- every existing test still passed — including the four in
-- `db.security.db.test.ts` that exist specifically to prove this cannot
-- happen. They assert that `title` and `artist` are unreachable. They do not
-- assert that no OTHER column contains them.
--
-- ── WHY REVOKE RATHER THAN REWORD THE VALUE ───────────────────────────────
-- Writing an opaque licence id instead would fix today's leak and leave the
-- shape of it: a client-readable free-text column on the one table whose
-- whole point is withholding, refilled by hand whenever a licence changes,
-- with nothing checking what goes in. The column is an OPERATOR's record —
-- what was cleared, from whom, under what terms. A listener has no use for
-- it, and MEASURED: nothing in `apps/web` renders it. It was selected,
-- carried through two interfaces and displayed nowhere.
--
-- So it goes back to `service_role` and to the Edge Function, where naming
-- the track is the entire point and a licence beside the title costs nothing.
-- ═══════════════════════════════════════════════════════════════════════════

-- The revoke has to be column-explicit: the table-wide `revoke all` in
-- 20260918150500 was followed by `grant select (id, src, duration_seconds,
-- licence_ref)`, so this removes one column from that grant and leaves the
-- other three exactly as they were.
revoke select (licence_ref) on table public.tracks from authenticated;

comment on column public.tracks.licence_ref is
  'What was cleared, from whom, under what terms. NOT granted to the client: '
  'an Epidemic Sound reference contains the track name and the artist, so a '
  'readable licence_ref hands over precisely what the column grant on title '
  'and artist exists to withhold. service_role and reveal-track only.';
