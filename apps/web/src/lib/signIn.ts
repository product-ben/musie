/**
 * Signing in and signing out with an email and a password — H.0b, and only it.
 *
 * NO SIGN-UP, NO PASSWORD RESET, NO MAGIC LINK, NO OAUTH. All four need a
 * sending provider and a sending domain, the domain is undecided (decision 1
 * at the foot of BUILD-PLAN.md), and building them now would build them
 * against a provider nobody has chosen. They are H.1 and H.3. For the beta a
 * forgotten password is reset in the Supabase dashboard, which is fine at
 * twenty testers and is also the ceiling.
 *
 * ── WHY THE ERROR IS MAPPED TO A KEY AND NOT SHOWN ─────────────────────────
 * GoTrue's messages are English, ours and untranslated — 'Invalid login
 * credentials' rendered inside a German form is precisely the half-German UI
 * rule 7 exists to prevent, and it would arrive through the one path no
 * catalogue covers. So every failure resolves to a `MessageKey` here, and the
 * screen renders copy the app owns in both languages.
 *
 * THREE OUTCOMES, AND THE THIRD IS NOT AN ERROR ABOUT THE PASSWORD. A wrong
 * password and an unreachable server need different sentences: retyping fixes
 * the first and cannot touch the second, and telling somebody on a train that
 * their password is wrong is a support request that ends in "it was the wifi".
 * supabase-js signals the difference by THROWING for a transport failure and
 * RETURNING an error for a rejected credential, which is why both are handled
 * and they are not the same branch.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MessageKey } from '../i18n';
import { getSupabase } from './supabase';
import { resetSessionCache } from './auth';

export type SignInResult =
  | { ok: true }
  | { ok: false; messageKey: MessageKey };

/**
 * GoTrue's own codes, mapped to copy we own.
 *
 * Matched on `code` rather than on the message text: the text is English prose
 * that Supabase is free to reword in any release, and a match against prose
 * fails by showing the wrong sentence rather than by failing to compile. The
 * same reasoning as the `email_exists` assertion in `auth.convert.db.test.ts`.
 *
 * EXPORTED FOR ITS TEST, and it is the only part of this file a unit test can
 * reach: everything else needs a client. This repo does not mock the Supabase
 * client anywhere (`vi.mock` appears in no test), because a hand-built
 * `from().select()` chain is a fake to maintain forever — so the pure part is
 * tested directly here and the round trip is tested against the real stack in
 * `signIn.db.test.ts`. The codes THIS stack actually returns are asserted
 * there; the table below is asserted here.
 */
export function signInMessageKey(code: string | undefined): MessageKey {
  switch (code) {
    case 'invalid_credentials':
      return 'auth.error.credentials';
    /* Cannot happen while H.0's script passes `email_confirm: true` and
       `enable_confirmations` is false — and handled anyway, because the day it
       CAN happen there is no mail to fix it with and the sentence has to say
       something other than "wrong password". */
    case 'email_not_confirmed':
      return 'auth.error.notConfirmed';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'auth.error.rateLimit';
    default:
      return 'auth.error.unknown';
  }
}

/**
 * `client` IS FOR THE DB SUITE, AND IT IS NOT A MOCK.
 *
 * The app's own client is built from `VITE_SUPABASE_URL` in `.env.local`, which
 * is whatever the person at this checkout last pointed it at — and on
 * 2026-09-22 that was the HOSTED project, while `pnpm test:db` was aimed at the
 * local stack by `supabase status`. A db test that called `getSupabase()` would
 * therefore create its fixtures on one project and try to sign in on another:
 * the wrong-password assertions still pass, because a wrong password and an
 * absent account are the same refusal, so the suite goes GREEN while testing
 * nothing. That is the exact false green `db.support.ts` was written to prevent,
 * and it was found by this test failing for the right reason first.
 *
 * So the suite passes the client it built for its OWN target. Nothing in the app
 * passes this argument, and there is nothing faked either way — it is the real
 * supabase-js client, aimed somewhere the test chose on purpose.
 */
export async function signIn(
  email: string,
  password: string,
  client?: SupabaseClient,
): Promise<SignInResult> {
  const supabase = client ?? getSupabase();

  try {
    /* Trimmed, and only the email. A pasted address carries a trailing space
       more often than not, and an address cannot legally end in one — whereas
       a password's leading or trailing space is a CHARACTER OF THE PASSWORD,
       and trimming it would reject a correct one. H.0's generator never emits
       such a password; somebody's hand-set `--password` might. */
    const attempt = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (attempt.error !== null) {
      /* Deliberately not logged with the address: a console line pairing an
         email with a failed attempt is a credential in a screenshot. */
      console.warn(`[musie] sign-in refused: ${attempt.error.code ?? attempt.error.message}`);
      return { ok: false, messageKey: signInMessageKey(attempt.error.code) };
    }

    /* The session the rest of the app boots from is cached in lib/auth.ts, and
       right now it holds `{ kind: 'gate' }`. Without this, signing in succeeds
       and nothing on screen changes. */
    resetSessionCache();
    return { ok: true };
  } catch (thrown: unknown) {
    /* THROWN, not returned: supabase-js could not reach the server at all.

       `content.errorDetail` — 'Check your connection and try again.' — rather
       than an `auth.`-prefixed twin of it. The app already owns exactly one way
       of saying this, and a second spelling of one sentence is the drift the
       catalogue exists to stop. */
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    console.error('[musie] sign-in could not reach the server:', message);
    return { ok: false, messageKey: 'content.errorDetail' };
  }
}

/**
 * Sign out, then reload.
 *
 * ── THE RELOAD IS THE POINT, NOT A SHORTCUT ────────────────────────────────
 * A signed-in page holds the diary in component state, in the profile context
 * and in whatever each screen has already fetched. Clearing the token without
 * discarding that leaves the previous account's entries on screen under a gate
 * that says nobody is signed in — one tester's reflections visible to the next
 * person handed the same phone, which for a shared workshop device is exactly
 * the case H.0 was asked for.
 *
 * Tearing every provider down by hand would work and would have to stay
 * correct as screens are added. A reload cannot drift: the tab starts again,
 * `ensureSession()` finds no session, and the gate is the first paint.
 */
export async function signOut(client?: SupabaseClient): Promise<void> {
  const supabase = client ?? getSupabase();

  try {
    /* 'local', so only this browser is signed out. 'global' would revoke the
       refresh token on every device the account is signed in on — and the
       second device staying signed in is the whole of H.0's done-when. */
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error !== null) console.error('[musie] sign-out failed:', error.message);
  } catch (thrown: unknown) {
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    console.error('[musie] sign-out could not reach the server:', message);
  }

  /* Unconditional, and that is deliberate. A failed sign-out still cleared the
     stored token in every case that matters, and leaving somebody on a page
     that says they are signed out of an account they are still holding data
     from is worse than reloading into a gate they can sign in at again. */
  resetSessionCache();
  window.location.assign('/');
}
