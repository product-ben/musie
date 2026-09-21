/**
 * `realtime-token` — the OpenAI key's one hiding place. F.1.
 *
 * ── WHY THIS EXISTS, IN ONE LINE FROM THE CODE IT REPLACES ────────────────
 * `features/voice/src/realtime/connection.ts` says it plainly:
 *
 *     A browser WebSocket cannot set an Authorization header, so the
 *     credential travels in the subprotocol list instead. Hence the name:
 *     anyone with the page can read it.
 *
 * `openai-insecure-api-key.<key>` is not a warning about a bad practice, it is
 * the protocol's own name for handing your API key to everyone who loads the
 * page. The proof-of-concept did that with a key typed into a field, which was
 * correct for a demo and is unshippable.
 *
 * So the key becomes a Supabase secret, read here and nowhere else, and what
 * reaches the browser is an EPHEMERAL token minted per session. It still
 * travels in the subprotocol — that part cannot change — but a token that
 * expires in a minute and can only open a transcription session is a very
 * different thing to leak than the key to the account.
 *
 * ── IT IS STILL YOUR KEY BEING SPENT, SO THE CALLER IS CHECKED ────────────
 * Every mint costs money against the project's own billing, and an endpoint
 * that hands tokens to anyone who asks is an open tap on somebody else's bill.
 * The JWT check is the meter: a token goes only to a signed-in Musie user.
 *
 * That is a weak boundary on purpose and worth saying out loud — anonymous
 * sign-in is one unauthenticated request away, so this stops the internet at
 * large and does not stop somebody determined. The real defences are the
 * project spend limit and the per-model rate limit, which are OpenAI-side and
 * are where a runaway actually gets stopped. Phase H's accounts are what would
 * make this boundary mean more.
 *
 * ── QUOTA AND RATE LIMITS COME BACK AS THEMSELVES ─────────────────────────
 * A spend cap is reached, or a rate limit is hit, and OpenAI says so with a
 * 429 or a 402. Those must NOT become a generic failure: `@musie/voice`
 * already has `rateLimited` and `noCredits` codes with written copy in both
 * languages, and the whole point of them is that "you have run out of budget"
 * and "the connection dropped" look identical from inside a browser and are
 * completely different problems. Ben's project has a $50 cap that fails
 * requests hard when it is reached, so this is not hypothetical.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

/** Mirrors `TranscriptionModel` in `features/voice/src/config.ts`. */
const MODELS = ['gpt-live-transcribe', 'gpt-4o-transcribe'];
const DEFAULT_MODEL = 'gpt-live-transcribe';

/**
 * MEASURED, NOT ASSUMED — and the first guess was wrong.
 *
 * `POST /v1/realtime/transcription_sessions` is what the proof-of-concept era
 * documentation describes, and it answers today with
 * `404 Invalid URL (POST /v1/realtime/transcription_sessions)`. So does
 * `/v1/realtime/sessions`. The live endpoint is `/v1/realtime/client_secrets`,
 * and the session's shape is nested differently from the old one: the model
 * goes at `session.audio.input.transcription.model`, and the ephemeral key
 * comes back at the TOP level as `value` rather than at `client_secret.value`.
 *
 * All three were probed against the real API before this was written, because
 * a wrong endpoint here fails exactly like a bad key.
 */
const OPENAI_CLIENT_SECRETS = 'https://api.openai.com/v1/realtime/client_secrets';

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

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const openaiKey = Deno.env.get('OPENAI_API_KEY');

  if (!url || !anonKey) return json({ error: 'misconfigured' }, 500);
  /* A DISTINCT CODE, because this is the one failure whose cause is a person
     forgetting a step rather than anything going wrong: the secret was never
     set. `misconfigured` in the logs next to a working database is a confusing
     half-hour; this says which. */
  if (!openaiKey) return json({ error: 'no_provider_key' }, 500);

  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: auth, error: whoError } = await asCaller.auth.getUser();
  if (whoError !== null || auth.user === null) return json({ error: 'unauthenticated' }, 401);

  /* The model is the caller's to choose from a FIXED LIST. Passing it through
     unchecked would let the browser name any model on the account, which is
     the same open tap in a different shape. */
  let model = DEFAULT_MODEL;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.model === 'string' && MODELS.includes(body.model)) model = body.model;
  } catch {
    /* No body, or not JSON. The default is fine. */
  }

  let minted: Response;
  try {
    minted = await fetch(OPENAI_CLIENT_SECRETS, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'transcription',
          audio: { input: { transcription: { model } } },
        },
      }),
    });
  } catch (thrown) {
    console.error('[musie] realtime-token: OpenAI unreachable:', thrown);
    return json({ error: 'provider_unreachable' }, 502);
  }

  if (!minted.ok) {
    const detail = await minted.text().catch(() => '');
    /* THE TWO THAT ARE NOT FAULTS, mapped to the codes @musie/voice already
       has copy for. Everything else is a genuine provider error. */
    if (minted.status === 429) {
      console.warn('[musie] realtime-token: rate limited by OpenAI');
      return json({ error: 'rate_limited' }, 429);
    }
    if (minted.status === 402 || detail.includes('insufficient_quota')) {
      console.warn('[musie] realtime-token: out of quota or over the spend cap');
      return json({ error: 'no_credits' }, 402);
    }
    /* Logged with its body because a 400 from OpenAI names the parameter it
       did not like, and that is the whole debugging story. The KEY is never
       in that body. */
    console.error(`[musie] realtime-token: OpenAI ${minted.status}: ${detail.slice(0, 500)}`);
    return json({ error: 'provider_error' }, 502);
  }

  const session = await minted.json();
  /* Top level, not `client_secret.value` — see the endpoint note above. */
  const token = session?.value;
  const expiresAt = session?.expires_at ?? null;

  if (typeof token !== 'string' || token === '') {
    console.error('[musie] realtime-token: OpenAI returned no client secret');
    return json({ error: 'provider_error' }, 502);
  }

  /* ONLY THE EPHEMERAL TOKEN LEAVES. Not the session object, which carries
     configuration echoes that are noise to the client and one more thing to
     keep in step. */
  return json({ token, expiresAt, model }, 200);
});
