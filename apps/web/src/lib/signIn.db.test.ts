/**
 * Signing in for real — H.0b, against the local stack.
 *
 * ── WHAT THIS EXISTS TO CATCH, AND IT IS ONE THING ─────────────────────────
 * `lib/signIn.ts` maps GoTrue's `error.code` onto copy the app owns, and it
 * matches on the CODE rather than the message so that Supabase rewording its
 * English prose cannot change which sentence a tester reads. The risk that
 * swap introduces is the opposite one: a code that is spelled wrong, or that
 * this version of GoTrue does not send at all. Every such miss lands on
 * `auth.error.unknown` — 'Something went wrong signing you in' — which is
 * plausible enough on screen that nobody reports it, in place of 'that email
 * address and password do not match an account', which is the one sentence
 * that tells somebody what to do.
 *
 * A unit test cannot see that, because it would be asserting the table against
 * itself. So this drives the real endpoint with a real wrong password.
 *
 * ── IT ALSO EXERCISES H.0's ACCOUNT THROUGH THE APP'S OWN CODE PATH ────────
 * The account is created exactly as `scripts/create-tester.mjs` creates one —
 * service role, `email_confirm: true`, no mail anywhere — and then signed into
 * through `signIn()`, the same function the gate calls. H.2 proved the account
 * can sign in with a client the test built itself; this proves the app's error
 * handling does it too.
 *
 * ── THE CLIENT IS PASSED IN, AND THE FIRST VERSION OF THIS FILE DID NOT ────
 * `signIn()` defaults to the app's client, which is built from
 * `VITE_SUPABASE_URL` in `.env.local` — and that file was pointed at the HOSTED
 * project while this suite was aimed at the local stack. So the first run
 * created its accounts locally and tried to sign in on a different project.
 *
 * The instructive part is how it failed: the two WRONG-password tests passed,
 * because an absent account and a wrong password are the same refusal by
 * design. Only the right-password test went red. A suite shaped slightly
 * differently would have been green and testing nothing — the false green
 * `db.support.ts` exists to prevent, arriving through a door it does not watch.
 * Hence `anonClient()`, which is aimed at whatever THIS suite is aimed at.
 *
 * ── WHAT IT DELIBERATELY DOES NOT TOUCH ────────────────────────────────────
 * `signOut()`, which ends in `window.location.assign('/')`. There is no window
 * in a node test and faking one would be testing the fake. It is listed as
 * unexercised rather than quietly skipped.
 *
 * Runs under `pnpm test:db`, never under `pnpm check` — CI has no Supabase.
 */
import { afterAll, describe, expect, it } from 'vitest';

import type { SupabaseClient } from '@supabase/supabase-js';

import { anonClient, serviceClient } from './db.support';
import { signIn } from './signIn';

/** Every user this file creates, torn down with the service role at the end. */
const created: string[] = [];

/**
 * One client for the whole file, aimed at the suite's target.
 *
 * A FRESH ONE PER TEST WOULD HIDE SOMETHING: `signIn()` leaves a session on the
 * client it used, and the first test reads that session back to prove the gate
 * will find it on the next boot. That only means anything if it is the same
 * client the sign-in happened on.
 */
const app: SupabaseClient = anonClient();

afterAll(async () => {
  await app.auth.signOut({ scope: 'local' });

  const service = serviceClient();
  for (const userId of created) {
    const { error } = await service.auth.admin.deleteUser(userId);
    expect(error, `could not delete the test user ${userId}`).toBeNull();
  }
}, 30_000);

/** A unique address per run, so no run collides with a previous one. */
function testEmail(label: string): string {
  return `h0b-${label}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@musie.test`;
}

const PASSWORD = 'handed-out-by-hand-1';

/** An account made the way H.0's script makes one. */
async function handOutAccount(label: string): Promise<{ email: string; userId: string }> {
  const email = testEmail(label);
  const admin = await serviceClient().auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  expect(admin.error, 'admin.createUser — H.0 is broken if this fails').toBeNull();
  const userId = admin.data.user?.id as string;
  created.push(userId);
  return { email, userId };
}

describe('H.0b · a handed-out account signs in through the app’s own path', () => {
  it('accepts the right password and lands on the same user the script created', async () => {
    const { email, userId } = await handOutAccount('ok');

    const result = await signIn(email, PASSWORD, app);
    expect(result.ok, 'the account the script created could not sign in').toBe(true);

    /* The session is left on the client, which is what the gate depends on:
       `ensureSession()` reads it back through `getSession()` on the next boot. */
    const session = await app.auth.getSession();
    expect(session.data.session?.user.id).toBe(userId);
    expect(session.data.session?.user.email).toBe(email);
  }, 60_000);

  it('trims the address, because a pasted one carries a trailing space', async () => {
    const { email } = await handOutAccount('trim');

    /* Not a hypothetical: an address handed over in a message and pasted into a
       phone keyboard arrives with a space more often than not, and GoTrue does
       not trim it for you. The password is deliberately NOT trimmed, and that
       asymmetry is the point — see the comment in lib/signIn.ts. */
    const result = await signIn(`  ${email} `, PASSWORD, app);
    expect(result.ok, 'a pasted address with a trailing space was refused').toBe(true);
  }, 60_000);
});

describe('H.0b · the failure a tester will actually hit', () => {
  it('maps a wrong password to the retype-both sentence, not to the generic one', async () => {
    const { email } = await handOutAccount('wrong');

    const result = await signIn(email, 'definitely-not-the-password', app);

    expect(result.ok).toBe(false);
    /* THE ASSERTION THIS FILE EXISTS FOR. If GoTrue's code for a rejected
       credential is ever anything other than `invalid_credentials`, this is
       what goes red — rather than every tester silently reading 'something went
       wrong' when the truth is 'you typed it wrong'. */
    expect(result.ok === false && result.messageKey).toBe('auth.error.credentials');
  }, 60_000);

  it('maps an address with no account to the same sentence, and not to a different one', async () => {
    /* Deliberately checked: GoTrue answers an unknown address and a wrong
       password IDENTICALLY, on purpose, so that the form cannot be used to
       find out which addresses have accounts. The app must not undo that by
       having two different sentences for them. */
    const result = await signIn(testEmail('nobody'), PASSWORD, app);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.messageKey).toBe('auth.error.credentials');
  }, 60_000);
});

describe('H.0b · the anonymous path is still there behind the flag', () => {
  it('still creates an anonymous session when asked directly', async () => {
    /* `VITE_REQUIRE_ACCOUNT` is not set in a test run, so this asserts the
       thing the flag turns OFF is intact: H.2 converts one of these and H.3
       builds sign-up on it, so a change that broke anonymous sign-in while
       leaving the gate working would be invisible to every other test here. */
    const anonymous = anonClient();
    const created = await anonymous.auth.signInAnonymously();
    expect(created.error).toBeNull();
    expect(created.data.session).not.toBeNull();
    expect(created.data.user?.is_anonymous).toBe(true);

    if (created.data.user !== null && created.data.user !== undefined) {
      await serviceClient().auth.admin.deleteUser(created.data.user.id);
    }
  }, 60_000);
});
