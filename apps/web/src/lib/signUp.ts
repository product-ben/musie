/**
 * Signing up, and asking for a sign-in code — the client half.
 *
 * Sign-up is TWO calls to one Edge Function (Ben, 2026-10-20): the access code
 * on its own, then the name, address and agreement. The code goes first so
 * that somebody without one is turned away having handed over no personal
 * data at all.
 *
 * ── WHY THE ACCOUNT IS NOT CREATED HERE ───────────────────────────────────
 * This file holds the anon key, which is public the moment the bundle ships.
 * Anything it could decide, a reader of the bundle can decide too — so the
 * code check, the account and the consent record all happen in
 * `supabase/functions/account-signup`, behind the service role.
 *
 * ── WHY EVERY FAILURE BECOMES A MessageKey ────────────────────────────────
 * The same rule `signIn.ts` already follows: GoTrue's messages, and anything
 * the function might echo, are English prose. English prose inside a German
 * form is exactly what rule 7 exists to prevent, and it would arrive through
 * the one path no catalogue covers. So nothing is ever shown as it came back —
 * every outcome resolves to a key the app owns in both languages.
 */
import type { MessageKey } from '../i18n';
import { PRIVACY_VERSION, TERMS_VERSION } from './legal';
import { getSupabase } from './supabase';

/**
 * Every way the function can answer, as the words it uses.
 *
 * Mirrors the `Outcome` union in `supabase/functions/account-signup/index.ts`.
 * The two are not shared at the type level — one is Deno, one is the bundle —
 * so `outcomeMessageKey` below is the single place they are reconciled, and an
 * outcome neither side knows falls to the generic sentence rather than to a
 * blank screen.
 */
export type SignUpOutcome =
  | 'code_ok'
  | 'created'
  | 'already_registered'
  | 'unknown_code'
  | 'revoked_code'
  | 'spent_code'
  | 'consent_required'
  | 'invalid_input'
  | 'failed';

export type SignUpResult =
  | { ok: true; outcome: 'code_ok' | 'created' | 'already_registered' }
  | { ok: false; messageKey: MessageKey };

/**
 * The refusals, mapped to copy we own.
 *
 * EXPORTED FOR ITS TEST, and it is the only part of this file a unit test can
 * reach: everything else needs a server. Same arrangement as
 * `signInMessageKey` — the pure part is tested directly, the round trip is
 * tested against the real stack.
 *
 * `revoked_code` and `spent_code` deliberately say DIFFERENT things. A revoked
 * code was withdrawn and will never work; a spent one was used by somebody
 * else and the answer is to ask for another. Telling a tester "that code is
 * used up" when it was actually cancelled sends them back to the person who
 * read it out, which is the right place — but telling them "ask for another"
 * when it was cancelled sends them there twice.
 */
export function outcomeMessageKey(outcome: SignUpOutcome): MessageKey {
  switch (outcome) {
    case 'unknown_code':
      return 'auth.error.codeUnknown';
    case 'revoked_code':
      return 'auth.error.codeRevoked';
    case 'spent_code':
      return 'auth.error.codeSpent';
    case 'consent_required':
      return 'auth.error.termsRequired';
    case 'invalid_input':
      return 'auth.error.details';
    default:
      return 'auth.error.unknown';
  }
}

async function callSignup(body: Record<string, unknown>): Promise<SignUpResult> {
  try {
    const { data, error } = await getSupabase().functions.invoke('account-signup', { body });

    /* `functions.invoke` treats any non-2xx as an error and puts the body out
       of easy reach, so the refusals — which are 400s and 403s — arrive HERE
       rather than in `data`. Reading the outcome off the response is what
       keeps "that code is used up" from being rendered as "something went
       wrong". */
    if (error !== null) {
      const body = await readOutcome(error);
      if (body !== null) return { ok: false, messageKey: outcomeMessageKey(body) };
      console.error('[musie] sign-up failed:', error.message);
      return { ok: false, messageKey: 'content.errorDetail' };
    }

    const outcome = (data as { outcome?: SignUpOutcome } | null)?.outcome;
    if (outcome === 'code_ok' || outcome === 'created' || outcome === 'already_registered') {
      return { ok: true, outcome };
    }
    return { ok: false, messageKey: outcomeMessageKey(outcome ?? 'failed') };
  } catch (thrown: unknown) {
    /* THROWN, not returned: the browser could not reach the function at all.
       `content.errorDetail` — 'Check your connection and try again.' — rather
       than an `auth.`-prefixed twin, because the app already owns exactly one
       way of saying this. Same decision `signIn.ts` made. */
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    console.error('[musie] sign-up could not reach the server:', message);
    return { ok: false, messageKey: 'content.errorDetail' };
  }
}

/** Dig the `outcome` out of a non-2xx response, or null if there is not one. */
async function readOutcome(error: unknown): Promise<SignUpOutcome | null> {
  const response = (error as { context?: Response }).context;
  if (!(response instanceof Response)) return null;
  try {
    const parsed = (await response.json()) as { outcome?: SignUpOutcome };
    return parsed.outcome ?? null;
  } catch {
    return null;
  }
}

/** Step one: is this code worth asking for a name and an address? */
export function checkAccessCode(accessCode: string): Promise<SignUpResult> {
  return callSignup({ action: 'check', accessCode });
}

/** Step two: make the account, record the agreement. */
export function createAccount(input: {
  accessCode: string;
  firstName: string;
  email: string;
  acceptedTerms: boolean;
}): Promise<SignUpResult> {
  return callSignup({
    ...input,
    email: input.email.trim(),
    firstName: input.firstName.trim(),
    /* Sent, not assumed server-side: what has to be provable is which wording
       was on the screen this person was looking at, and only the bundle they
       loaded knows that. See lib/legal.ts. */
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
  });
}

/**
 * Ask for a six-digit sign-in code.
 *
 * `shouldCreateUser: false` is the load-bearing argument. Without it this call
 * creates an account for any address typed into the sign-in form, and the
 * access code — the entire door policy — would be bypassed by the app's own
 * front door rather than by anything clever.
 */
export async function requestSignInCode(email: string): Promise<SignUpResult> {
  try {
    const { error } = await getSupabase().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });

    if (error !== null) {
      console.warn(`[musie] code request refused: ${error.code ?? error.message}`);
      /* Rate limiting is the one refusal worth its own sentence: it is
         temporary, and "try again in a minute" is actionable where "something
         went wrong" is not. Everything else is deliberately vague — see
         `auth.code.sent` in the catalogue for why an unknown address must not
         be distinguishable from a known one. */
      const limited = error.code === 'over_email_send_rate_limit'
        || error.code === 'over_request_rate_limit';
      return { ok: false, messageKey: limited ? 'auth.error.rateLimit' : 'auth.error.unknown' };
    }

    return { ok: true, outcome: 'created' };
  } catch (thrown: unknown) {
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    console.error('[musie] code request could not reach the server:', message);
    return { ok: false, messageKey: 'content.errorDetail' };
  }
}

/**
 * Hand the six digits back.
 *
 * `type: 'email'` is what tells GoTrue this is the one-time code rather than a
 * recovery or an invite token. On success supabase-js stores the session and
 * `AuthProvider`'s `onAuthStateChange` subscription publishes it — which is
 * why nothing here reloads the page.
 */
export async function verifySignInCode(email: string, code: string): Promise<SignUpResult> {
  try {
    const { error } = await getSupabase().auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: 'email',
    });

    if (error !== null) {
      console.warn(`[musie] code refused: ${error.code ?? error.message}`);
      /* An expired code and a wrong one need different sentences: one is
         fixable by typing more carefully, the other only by asking for a new
         code, and sending somebody back to the keyboard when the answer is a
         button is how a two-minute problem becomes a support message. */
      const expired = error.code === 'otp_expired';
      return { ok: false, messageKey: expired ? 'auth.error.codeExpired' : 'auth.error.codeWrong' };
    }

    return { ok: true, outcome: 'created' };
  } catch (thrown: unknown) {
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    console.error('[musie] code check could not reach the server:', message);
    return { ok: false, messageKey: 'content.errorDetail' };
  }
}
