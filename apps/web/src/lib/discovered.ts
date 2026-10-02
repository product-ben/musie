/**
 * *Discovered music* — the recordings this person has actually played.
 *
 * ── WHAT "DISCOVERED" MEANS, AND WHY IT IS NOT A PROPERTY OF A TRACK ───────
 * There is no table of tracks somebody has met, and there must not be a query
 * that reads one. `tracks.title` and `tracks.artist` are withheld by COLUMN
 * GRANT — naming either fails the whole request with 42501 rather than
 * returning null — so a browser cannot list recordings by name under any
 * circumstances. That is deliberate and absolute; see `lib/reveal.ts`.
 *
 * So this reads SESSIONS, which are the person's own by RLS
 * (`sessions_select_own`), and derives the music from them. "Discovered" is
 * then exactly what Ben asked it to be: a recording that was playing, in a run
 * of yours.
 *
 * ── TWO CONDITIONS, AND BOTH ARE THE POINT ─────────────────────────────────
 *   `listened_at is not null` — somebody PRESSED PLAY. Not `step`, which only
 *   says which screen was reached: a session parked on `listen` having touched
 *   nothing would otherwise be indistinguishable from one that played a track
 *   to the end. The column exists for this and for nothing else
 *   (`20261002100000_sessions_listened_at.sql`).
 *
 *   `tracks.src is not null` — there is a FILE. Five of the nine cards are
 *   silent, and the listen step answers a press on one of them with a
 *   simulated clock, so such a session is stamped like any other. A row with
 *   no recording would be a player for nothing.
 *
 * ── ONE ROW PER TRACK, AND THE SESSION IT CARRIES IS THE EARLIEST ──────────
 * The same recording can be met more than once — Free Rein draws the same nine
 * cards as Mindful Break. The listing is of MUSIC, so it collapses to one row
 * per recording, and the session it keeps is the FIRST one that played it:
 * that is the discovery, and the later runs are re-listens of something
 * already found.
 *
 * The session id is not decoration. It is the only thing that can be exchanged
 * for a title: `reveal-track` takes a session and never a track id, precisely
 * so nobody can walk `trk-01`…`trk-09` and collect nine names without
 * listening to anything. The screen asks it once per row.
 */
import { getSupabase } from './supabase';

/** A recording somebody has played, and the run in which they first did. */
export interface DiscoveredTrack {
  trackId: string;
  /** The EARLIEST session of this person's that played it. What the reveal is
   *  asked about, and the reason this type carries a session at all. */
  sessionId: string;
  /** Object key in the private `tracks` bucket. Never null here — a row
   *  without a file is not discovered music and is dropped below. */
  src: string;
  durationSeconds: number;
  /** When it was first played. The listing's order, newest first. */
  listenedAt: string;
}

/* PostgREST returns an OBJECT for a to-one embed and an ARRAY for a to-many
   one, and supabase-js infers the latter from the generated relationship. The
   same trap `diary.ts` documents at `Embedded<T>`, collapsed the same way. */
type Embedded<T> = T | T[] | null;

function one<T>(embed: Embedded<T> | undefined): T | null {
  if (embed === null || embed === undefined) return null;
  return Array.isArray(embed) ? embed[0] ?? null : embed;
}

export interface DiscoveredRow {
  id: string;
  listened_at: string | null;
  track_id: string | null;
  tracks: Embedded<{ id: string; src: string | null; duration_seconds: number }>;
}

/**
 * Rows → the listing. PURE, and exported for the test: every rule that decides
 * what appears on the screen is in here, and none of them is visible in the
 * query's own shape.
 *
 * Takes the rows in ANY order and does not trust the query's. The dedupe keeps
 * the earliest `listened_at` per track by comparing, not by relying on an
 * `order` clause that a later edit could drop — ISO-8601 in UTC, which
 * `toISOString()` guarantees, compares correctly as a string.
 */
export function discoveredFrom(rows: DiscoveredRow[]): DiscoveredTrack[] {
  const byTrack = new Map<string, DiscoveredTrack>();

  for (const row of rows) {
    /* Belt and braces against the query: the filters below say both of these
       are non-null, and a listing that silently rendered a player for a track
       with no file would be the failure nobody notices. */
    if (row.listened_at === null) continue;
    const track = one(row.tracks);
    if (track === null || track.src === null || track.src.trim() === '') continue;

    const found = byTrack.get(track.id);
    if (found !== undefined && found.listenedAt <= row.listened_at) continue;

    byTrack.set(track.id, {
      trackId: track.id,
      sessionId: row.id,
      src: track.src,
      durationSeconds: track.duration_seconds,
      listenedAt: row.listened_at,
    });
  }

  /* Newest discovery first: the last thing you found is the thing you are
     most likely to be looking for. */
  return [...byTrack.values()].sort((a, b) => b.listenedAt.localeCompare(a.listenedAt));
}

/** ONE STRING LITERAL — supabase-js parses this select at the TYPE level, and
 *  TypeScript does not fold a concatenation into a literal type. */
// prettier-ignore
const DISCOVERED_SELECT = 'id, listened_at, track_id, tracks(id, src, duration_seconds)';

/**
 * The person's own discovered music.
 *
 * No `user_id` filter: `sessions_select_own` is the filter, and writing a
 * second one here would make the policy look optional.
 *
 * THROWS. Unlike `markListened`, this one is the content of a screen rather
 * than a note taken beside an exercise — there is nothing to show if it fails,
 * and the screen draws the failure the way every other content screen does.
 */
export async function getDiscovered(): Promise<DiscoveredTrack[]> {
  const { data, error } = await getSupabase()
    .from('sessions')
    .select(DISCOVERED_SELECT)
    .not('listened_at', 'is', null)
    .not('track_id', 'is', null)
    .order('listened_at', { ascending: false });

  if (error !== null) {
    throw new Error(`[musie] could not load discovered music: ${error.message}`);
  }

  return discoveredFrom((data ?? []) as DiscoveredRow[]);
}
