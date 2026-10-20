/**
 * `account-signup` — the door a trial user comes in through.
 *
 * One form, one call: a first name, an email address and the four-digit access
 * code Ben or Lucy read out. This checks the code, creates the account and
 * records who claimed what. The browser then asks GoTrue for a sign-in code in
 * the usual way, and the person types six digits.
 *
 * ── WHY THE ACCOUNT IS CREATED HERE AND NOT IN THE BROWSER ────────────────
 * The client holds the anon key, which is public the moment the bundle ships.
 * Anything the client could decide, a reader of the bundle can decide too — so
 * the code check, the account and the claim all happen on a server holding the
 * service role. Third door built on that argument, after `reveal-track` and
 * `content-admin`.
 *
 * ── IT IS A DOOR POLICY, NOT A WALL, AND THAT IS DECIDED ──────────────────
 * Ben, 2026-10-20: project-level sign-ups stay ENABLED, because disabling them
 * also kills anonymous sign-in — which breaks the db suite's sixteen
 * `anonymousUser()` calls that `db-push.yml` runs against HOSTED on every
 * merge, plus H.2's conversion proof. Measured that day; see the migration
 * header.
 *
 * So a person who reads the bundle can call GoTrue directly and get an account
 * without a code. What this buys is that nobody joins by ACCIDENT and that
 * every real signup is attributable.
 *
 * **AND THAT IS WHY THERE IS NO BRUTE-FORCE COUNTER HERE.** An earlier draft
 * of the plan wanted failed attempts counted. With sign-ups enabled it would
 * be theatre: guessing a four-digit code is strictly harder than the bypass
 * that is standing open beside it. A guard that protects nothing still has to
 * be maintained and still has to be understood by the next reader, so it is
 * deliberately absent rather than quietly dropped. The day sign-ups close, it
 * is worth having.
 *
 * ── CLAIM FIRST, CREATE SECOND, RELEASE IF THAT FAILS ─────────────────────
 * The claim lives in Postgres and the account lives in GoTrue, so they cannot
 * be one transaction. The two orderings fail very differently:
 *
 *   create then claim   a failure leaves the code REUSABLE behind an account
 *                       that exists — silent, and the thing the code is for
 *   claim then create   a failure leaves the code spent and no account — a
 *                       tester who calls you, and nothing unsafe
 *
 * So: claim, create, bind — and `release_access_code` on any failure in
 * between. Ben, 2026-10-20: the recoverable failure beats the silent one.
 *
 * ── DEPLOY ────────────────────────────────────────────────────────────────
 *   supabase functions deploy account-signup
 *
 * By hand, like `content-admin`, `reveal-track` and `realtime-token`. No
 * workflow covers it — `db-push.yml` pushes migrations only.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/* Same-origin in production; a Vite server on another port in development, so
   the preflight has to be answered. */
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

/**
 * Every way this can end, as a word the screen owns copy for.
 *
 * NAMED OUTCOMES RATHER THAN HTTP STATUS OR PROSE, for the reason `signIn.ts`
 * gives: GoTrue's messages are English prose it is free to reword, and English
 * prose inside a German form is exactly what rule 7 exists to prevent. The
 * screen maps each of these to a `MessageKey`.
 */
type Outcome =
  /** Step one: this code would work. Nothing has been claimed or created. */
  | 'code_ok'
  | 'created'
  /** The address already has an account. Not an error — they should sign in. */
  | 'already_registered'
  | 'unknown_code'
  | 'revoked_code'
  | 'spent_code'
  /** Both toggles have to be on. The screen will not let this through either. */
  | 'consent_required'
  | 'invalid_input'
  | 'failed';

const NAME_MAX = 80;

/**
 * Sign-up is TWO steps (Ben, 2026-10-20), and this is the first.
 *
 * The code alone, before a name or an address is asked for. That ordering is
 * the point: somebody without a code is turned away having handed over
 * nothing, and the personal data is only collected once there is a reason to
 * collect it.
 *
 * ── IT IS A PEEK, NOT A CLAIM, AND IT CANNOT BE ANYTHING ELSE ─────────────
 * A claim needs an email — the claims table keys on (code, email) and that
 * pair is what makes a double-tap idempotent — and at this step there is no
 * email yet. So nothing is reserved here. A code that passes step one can be
 * spent by somebody else before step two arrives, and step two says so. At
 * twenty testers with codes handed out one at a time, that race is theoretical;
 * the alternative is a reservation with a timeout, which is a sweeper and a
 * schedule for a problem nobody has.
 *
 * ── AND IT IS AN ORACLE, SAID OUT LOUD ────────────────────────────────────
 * This endpoint answers "is 4821 a real code?" without an email address, so it
 * makes guessing codes cheap in a way the one-step form did not. That is a
 * genuine weakening and it is accepted for the same reason the open sign-up
 * hole is (see the header): calling GoTrue directly is still EASIER than
 * guessing, so a guard here would protect nothing while looking like it did.
 * The day sign-ups close, this needs a per-IP limit and so does the claim.
 */
async function checkCode(server: SupabaseClient, code: string): Promise<Outcome> {
  const { data, error } = await server
    .from('access_codes')
    .select('uses, max_uses, revoked_at')
    .eq('code', code)
    .maybeSingle();

  if (error !== null) {
    console.error(`[account-signup] could not read ${code}: ${error.message}`);
    return 'failed';
  }
  if (data === null) return 'unknown_code';

  const row = data as { uses: number; max_uses: number; revoked_at: string | null };
  if (row.revoked_at !== null) return 'revoked_code';
  if (row.uses >= row.max_uses) return 'spent_code';
  return 'code_ok';
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/** Release a claim we took but could not finish, so the code works again. */
async function release(server: SupabaseClient, code: string, email: string): Promise<void> {
  const { error } = await server.rpc('release_access_code', {
    p_code: code,
    p_email: email,
  });
  /* Logged, never thrown: the caller is already handling a failure, and losing
     the original reason behind a cleanup error helps nobody. A code stuck in
     the claimed state shows up in `access-codes.mjs list` as "claimed, no
     account", which is why that line exists. */
  if (error !== null) {
    console.error(`[account-signup] could not release ${code} for ${email}: ${error.message}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ outcome: 'failed' satisfies Outcome }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (url === undefined || key === undefined) {
    console.error('[account-signup] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
    return json({ outcome: 'failed' satisfies Outcome }, 500);
  }
  const server = createClient(url, key, { auth: { persistSession: false } });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ outcome: 'invalid_input' satisfies Outcome }, 400);
  }

  const body = payload as Record<string, unknown>;
  /* Digits only: a code read down a phone and typed back arrives with spaces
     and hyphens more often than not. The SQL normalises too — this is so the
     shape check below means what it says. */
  const code = clean(body.accessCode, 32).replace(/\D/g, '');
  if (!/^[0-9]{4}$/.test(code)) {
    return json({ outcome: 'invalid_input' satisfies Outcome }, 400);
  }

  /* STEP ONE. Absent `action` means step two, so a caller written against the
     one-step version still works rather than silently checking and creating
     nothing. */
  if (body.action === 'check') {
    const outcome = await checkCode(server, code);
    return json({ outcome }, outcome === 'code_ok' ? 200 : 403);
  }

  const firstName = clean(body.firstName, NAME_MAX);
  const email = clean(body.email, 254).toLowerCase();

  if (firstName === '' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ outcome: 'invalid_input' satisfies Outcome }, 400);
  }

  /* ── THE ONE AGREEMENT, AND THE ONE NOTICE ─────────────────────────────
     ONLY the terms are consented to. The privacy policy is shown beside them
     and linked, not toggled — Ben, 2026-10-20: a privacy policy is information
     provided under Art. 13, and a required box agreeing to it is bundled
     consent, which is worth less than nothing. See the migration header.

     `privacyVersion` is still required, because what has to be provable is
     WHICH notice was on screen when they signed up — and that is exactly the
     fact nobody can reconstruct afterwards.

     Checked here and not only in the screen, for the reason every other
     server-side check in this repo exists: the screen is a convenience and the
     anon key is public, so a consent record written because a client said so
     is worth nothing. */
  const acceptedTerms = body.acceptedTerms === true;
  const termsVersion = clean(body.termsVersion, 10);
  const privacyVersion = clean(body.privacyVersion, 10);
  const DATED = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

  if (!acceptedTerms) {
    return json({ outcome: 'consent_required' satisfies Outcome }, 400);
  }
  if (!DATED.test(termsVersion) || !DATED.test(privacyVersion)) {
    return json({ outcome: 'invalid_input' satisfies Outcome }, 400);
  }

  /* ── 1 · THE CODE, CLAIMED ATOMICALLY ──────────────────────────────────── */
  const claimed = await server.rpc('claim_access_code', { p_code: code, p_email: email });
  if (claimed.error !== null) {
    console.error(`[account-signup] claim failed: ${claimed.error.message}`);
    return json({ outcome: 'failed' satisfies Outcome }, 500);
  }

  const claim = claimed.data as unknown as string;
  if (claim === 'unknown') return json({ outcome: 'unknown_code' satisfies Outcome }, 403);
  if (claim === 'revoked') return json({ outcome: 'revoked_code' satisfies Outcome }, 403);
  if (claim === 'exhausted') return json({ outcome: 'spent_code' satisfies Outcome }, 403);
  if (claim === 'invalid_email') return json({ outcome: 'invalid_input' satisfies Outcome }, 400);
  /* 'claimed' or 'already_claimed' — the second is a double-tap, and it is a
     success: the budget was not charged twice and this request may go on to
     finish what the first one started. */

  /* ── 2 · THE ACCOUNT ───────────────────────────────────────────────────── */
  const created = await server.auth.admin.createUser({
    email,
    /* Confirmed on arrival. The address is proved by the sign-in code the
       person is about to receive, so a separate confirmation mail would be a
       second round trip to prove the same thing — and it would route this
       through the "Confirm signup" template instead of the one with the code
       in it. */
    email_confirm: true,
    user_metadata: { first_name: firstName },
  });

  if (created.error !== null) {
    /* ALREADY REGISTERED is not a failure of this request, and it is the
       commonest non-happy path: a tester who signed up, closed the tab, and
       came back to the form instead of the sign-in screen. Their claim stands
       — releasing it would spend their code for nothing — and the screen sends
       them to sign in. */
    const taken = created.error.code === 'email_exists'
      || created.error.message.toLowerCase().includes('already been registered');
    if (taken) {
      return json({ outcome: 'already_registered' satisfies Outcome }, 200);
    }

    console.error(`[account-signup] createUser failed: ${created.error.message}`);
    await release(server, code, email);
    return json({ outcome: 'failed' satisfies Outcome }, 500);
  }

  const userId = created.data.user?.id;
  if (userId === undefined) {
    console.error('[account-signup] createUser returned no user.');
    await release(server, code, email);
    return json({ outcome: 'failed' satisfies Outcome }, 500);
  }

  /* ── 3 · THE NAME ──────────────────────────────────────────────────────── */
  /* `profiles` is created by a trigger on the insert above, so this updates a
     row that already exists. A failure here is NOT worth undoing the account
     for — the person has a working login and a blank greeting, which is a
     cosmetic problem and not a locked door. Logged, and carried on from. */
  /* `user_id`, not `id` — `profiles` keys on the auth user id under that name
     (`20260918142704_profiles.sql`). The first version of this file said `id`,
     which is not a column: the update errored, was logged, and signup carried
     on to produce a working account with a blank name. That is the branch
     below behaving exactly as intended, and it is also why the mistake needed
     a test to find rather than a failure to announce it. */
  const named = await server
    .from('profiles')
    .update({ display_name: firstName })
    .eq('user_id', userId);
  if (named.error !== null) {
    console.error(`[account-signup] could not set display_name for ${userId}: ${named.error.message}`);
  }

  /* ── 4 · WHAT THEY AGREED TO, AND WHAT THEY WERE SHOWN ─────────────────── */
  /* Two rows that do NOT mean the same thing: `terms` is the box they ticked,
     `privacy` is the version of the notice that was on screen. The migration
     header says why that distinction matters and why only one of them is
     consent.

     One row per document and version, so the day the wording changes the old
     answer stays true and a new one is a new row. Written AFTER the account
     because it keys on the user id, and before the bind so that a record
     always exists for an account that reached the end of this function.

     A failure here is logged and NOT undone, deliberately — the same call as
     the display name above. Rolling the account back would leave the person
     unable to sign in over a row only an auditor reads, and they would have no
     idea why. It is visible instead: an account with no acceptance rows is a
     thing a query can find, and `access-codes.mjs list` is where you would go
     looking. */
  const accepted = await server.from('legal_acceptances').insert([
    { user_id: userId, document: 'terms', version: termsVersion },
    { user_id: userId, document: 'privacy', version: privacyVersion },
  ]);
  if (accepted.error !== null) {
    console.error(
      `[account-signup] could not record consent for ${userId}: ${accepted.error.message}`,
    );
  }

  /* ── 5 · THE CLAIM, BOUND TO THE ACCOUNT ───────────────────────────────── */
  /* This is what makes the claim un-releasable from here on, and what gives
     `access-codes.mjs list` the line saying which tester used which code. */
  const bound = await server.rpc('bind_access_code_claim', {
    p_code: code,
    p_email: email,
    p_user_id: userId,
  });
  if (bound.error !== null) {
    console.error(`[account-signup] could not bind ${code} to ${userId}: ${bound.error.message}`);
  }

  return json({ outcome: 'created' satisfies Outcome }, 200);
});
