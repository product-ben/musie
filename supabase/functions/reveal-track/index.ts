/**
 * `reveal-track` — the only way a title and an artist reach a browser. E.5.
 *
 * ── WHY A FUNCTION AND NOT A POLICY ───────────────────────────────────────
 * `tracks.title` and `tracks.artist` are withheld by COLUMN GRANT: they are
 * not granted to `authenticated` at all, so `?select=title` fails outright
 * rather than returning null. That is deliberate and it is the strongest form
 * of the rule — no policy to get wrong, no filter to forget — but it is also
 * absolute. A column the client cannot read is a column the client cannot
 * read, ever, and the product does eventually have to say what you heard.
 *
 * So the reveal happens somewhere the grant does not apply: a server holding
 * the service role, which is exactly one place, with exactly one rule in it.
 *
 * ── THE CLIENT SENDS A SESSION, NEVER A TRACK ─────────────────────────────
 * This is the whole design. An endpoint taking a `trackId` would let anyone
 * signed in walk `trk-01`…`trk-09` and collect all nine titles without
 * listening to anything — the column grant undone by the thing built to
 * complement it.
 *
 * Taking a SESSION id instead means the question is not "what is trk-03
 * called" but "what was I given, in this run of mine". The track id is read
 * from the row on the server. You cannot ask about a recording you were never
 * handed, because there is nowhere to put the request.
 *
 * ── THREE CHECKS, AND EACH ONE REFUSES A DIFFERENT PERSON ─────────────────
 *   1. A valid JWT               — refuses the open internet.
 *   2. The session is YOURS      — refuses another signed-in user with a
 *                                  session id, which is a uuid but not a
 *                                  secret: it is in your own URL bar.
 *   3. You reached the listening — refuses your own session at `intro` or
 *                                  `scan`. Reading the name before the track
 *                                  has played is precisely what the whole
 *                                  mechanism exists to stop, and a session
 *                                  you own is not an exemption from it.
 *
 * The third is the weakest and is worth being honest about: `step` says which
 * screen the session reached, not that anyone listened. The gate on the
 * listen step is client state and is not stored, so the server cannot check
 * it. That is a real limit — somebody determined can reach `listen`, call
 * this, and learn the name without waiting. It still removes the cheap attack,
 * which is enumeration, and it is the strongest check available against what
 * the schema actually records. Storing "listened" to close it would be a
 * column and a write on a hot path, for a product whose premise is that people
 * want the exercise to work.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const STEPS_PAST_LISTENING = ['listen', 'reflect'];

/* The app is same-origin in production; in development it is a Vite server on
   another port, so the preflight has to be answered. */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  if (authorization === null) return json({ error: 'unauthenticated' }, 401);

  let sessionId: unknown;
  try {
    ({ sessionId } = await req.json());
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (typeof sessionId !== 'string' || sessionId === '') {
    return json({ error: 'bad_request' }, 400);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return json({ error: 'misconfigured' }, 500);

  /* WHO IS ASKING. The caller's own JWT, verified by asking Supabase rather
     than by decoding it here — a signature check written by hand is the
     classic place this goes wrong. */
  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: auth, error: whoError } = await asCaller.auth.getUser();
  if (whoError !== null || auth.user === null) return json({ error: 'unauthenticated' }, 401);

  /* THE ROW, AND THE TITLE, read with the service role because that is the
     only thing the column grant does not apply to. `user_id` is compared
     explicitly and NOT left to RLS: this client bypasses it. */
  const asServer = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: session, error: sessionError } = await asServer
    .from('sessions')
    .select('id, user_id, track_id, step')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError !== null) return json({ error: 'lookup_failed' }, 500);

  /* ONE ANSWER FOR "NOT YOURS" AND "NOT THERE". Distinguishing them would
     turn this into an oracle for which session ids exist. */
  if (session === null || session.user_id !== auth.user.id) {
    return json({ error: 'not_found' }, 404);
  }

  if (!STEPS_PAST_LISTENING.includes(session.step)) {
    return json({ error: 'too_early' }, 403);
  }

  /* A session with no track is ordinary — five of the nine cards are silent,
     and the two exercises that draw no card have no recording at all. There
     is nothing to reveal and that is not an error. */
  if (session.track_id === null) return json({ track: null }, 200);

  const { data: track, error: trackError } = await asServer
    .from('tracks')
    .select('id, src, title, artist, licence_ref')
    .eq('id', session.track_id)
    .maybeSingle();

  if (trackError !== null || track === null) return json({ error: 'lookup_failed' }, 500);

  /* ── A ROW WITH NO FILE NAMES NOTHING ───────────────────────────────────
     Five of the nine cards have `src` null, and their `title` and `artist`
     are the seed's INVENTED placeholders — `Schwere Luft` by `Kollektiv Rau`
     — kept only because both columns are `not null`.
   
     Revealing those would be the one thing this endpoint must never do: hand
     somebody a fact they cannot check, about a recording that did not play,
     in the one moment the product has promised to tell them the truth. They
     heard a simulated clock. The honest answer to "what was that" is that
     there was nothing.
   
     MEASURED: before this branch existed, a session on a silent card
     returned `Schwere Luft` with a 200. */
  if (track.src === null) return json({ track: null }, 200);

  const { src: _withheld, ...named } = track;
  return json({ track: named }, 200);
});
