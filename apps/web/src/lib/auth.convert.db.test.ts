/**
 * H.2 — CONVERT, NEVER CREATE. The fact the rest of phase H rests on.
 *
 * The claim under test, which `BUILD-PLAN.md` states as settled and which was
 * UNPROVEN IN THIS REPOSITORY until this file existed:
 *
 *   `updateUser({ email, password })` on an anonymous user converts that user
 *   IN PLACE and keeps the same `auth.users.id`.
 *
 * Everything in H.3 depends on it. `profiles.user_id`, `sessions.user_id` and
 * `reflections.session_id → sessions.user_id` all point at that id, so if
 * conversion minted a new user instead, somebody who did three sessions before
 * signing up would land in an empty diary and the old one would be stranded on
 * an id nobody can sign in as again. That failure is silent — every query
 * still succeeds, it just returns nothing — which is exactly why this is a
 * test and not a paragraph.
 *
 * ── IT ALSO PROVES THE THING H.0 GIVES UP ─────────────────────────────────
 * The last describe below converts a SECOND anonymous user onto an email that
 * is already taken. It fails with `email_exists`, and that refusal is the
 * reason H.0's handed-out accounts are a one-way street: an account created by
 * `auth.admin.createUser` can never be converted INTO, so a tester who does
 * three sessions anonymously and then signs in loses them. H.0 buys the second
 * device by giving up the first session, deliberately, and this is the test
 * that says so in code rather than in prose.
 *
 * ── WHY THE SECOND CLIENT IS THE WHOLE POINT ──────────────────────────────
 * Reading the rows back on the client that did the conversion proves very
 * little: it is still holding the same JWT it held as an anonymous user, so
 * `auth.uid()` would match whether or not anything was converted. The proof is
 * a FRESH client that has never seen that session, signing in with the email
 * and password, and finding the same id and the same rows. That is the second
 * device, and it is the only assertion here that could not pass by accident.
 *
 * ── CONFIRMATIONS ARE OFF, AND THAT IS LOAD-BEARING FOR THIS FILE ─────────
 * `config.toml` has `[auth.email] enable_confirmations = false`, so the new
 * address lands on `user.email` immediately and `new_email` stays empty. With
 * confirmations ON the same call would park the address in `new_email` and
 * leave `is_anonymous` true until a link was clicked — which needs mail, which
 * is H.1. So this file asserts `new_email` is empty as well as the id: if
 * somebody turns confirmations on, this test should say what changed rather
 * than simply going red somewhere else.
 *
 * Runs under `pnpm test:db`, never under `pnpm check` — CI has no Supabase.
 */
import { afterAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { anonClient, anonymousUser, serviceClient } from './db.support';

/**
 * Every user this file creates, torn down with the service role at the end.
 *
 * Necessary rather than tidy, and more so here than in the other db files: a
 * converted user OWNS AN EMAIL ADDRESS, and a leaked one would make the next
 * run of the conversion test fail with `email_exists` — the right error for
 * the wrong reason, which is the one thing this suite must not do. The
 * addresses are stamped with `Date.now()` as well, so a failed teardown costs
 * one stale user rather than a suite that cannot run again.
 *
 * Deleting the auth user takes the profiles row with it (`on delete cascade`
 * on `profiles.user_id`) and the sessions and reflections with that.
 */
const created: string[] = [];

afterAll(async () => {
  const service = serviceClient();
  for (const userId of created) {
    const { error } = await service.auth.admin.deleteUser(userId);
    /* Checked, not fire-and-forget: a cleanup that fails quietly is how a
       converted user survives to break the next run. */
    expect(error, `could not delete the test user ${userId}`).toBeNull();
  }
}, 30_000);

async function trackedAnonymousUser(): Promise<{ client: SupabaseClient; userId: string }> {
  const user = await anonymousUser();
  created.push(user.userId);
  return user;
}

/** A unique address per call, so no run can collide with a previous one. */
function testEmail(label: string): string {
  return `h2-${label}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@musie.test`;
}

/** Long enough for `minimum_password_length = 6` with room to spare. */
const PASSWORD = 'convert-me-please-1';

/** A complete, valid session — the same shape db.sessions.db.test.ts uses. */
function startedSession(userId: string) {
  return {
    user_id: userId,
    exercise_id: 'mindfulness-cards',
    card_id: 'mc-03',
    situation_id: 'feel-feelings',
    track_id: 'trk-03',
    status: 'started',
    step: 'intro',
  };
}

describe('H.2 · converting an anonymous user keeps its id, and its diary with it', () => {
  it('writes a diary anonymously, converts, and reads the same rows back on a SECOND client', async () => {
    const { client: anonymous, userId: before } = await trackedAnonymousUser();
    const email = testEmail('convert');

    /* ── The diary, written before there is any account ────────────────── */
    const session = await anonymous
      .from('sessions')
      .insert(startedSession(before))
      .select('id')
      .single();
    expect(session.error).toBeNull();
    const sessionId = session.data?.id as string;

    const reflection = await anonymous
      .from('reflections')
      .insert({ session_id: sessionId, mode: 'text', body: 'Written before there was an account.' })
      .select('id, body')
      .single();
    expect(reflection.error).toBeNull();

    /* The profiles row the trigger made for the anonymous user. Its
       primary key IS the auth id, so it is the third thing that would be
       orphaned by a conversion that minted a new user. */
    const profileBefore = await anonymous
      .from('profiles')
      .select('user_id, language')
      .eq('user_id', before)
      .single();
    expect(profileBefore.error).toBeNull();

    /* ── The conversion ─────────────────────────────────────────────────── */
    const converted = await anonymous.auth.updateUser({ email, password: PASSWORD });
    expect(converted.error, 'conversion itself was refused').toBeNull();

    /* DONE-WHEN #1, and the whole reason this file exists. */
    expect(converted.data.user?.id).toBe(before);

    /* The address is live, not pending. See the confirmations note above. */
    expect(converted.data.user?.email).toBe(email);
    expect(
      converted.data.user?.new_email ?? null,
      'the address is parked in new_email — has enable_confirmations been turned on?',
    ).toBeNull();

    /* No longer anonymous. Nothing in this repo reads `is_anonymous` (checked
       2026-09-22, and recorded in BUILD-PLAN.md), so this asserts the state of
       the auth row rather than any behaviour the app depends on today — it is
       what H.5's "delete stale anonymous users" will have to filter on. */
    expect(converted.data.user?.is_anonymous).toBe(false);

    /* ── THE SECOND DEVICE. A client that has never held this session ──── */
    const secondDevice = anonClient();
    const signedIn = await secondDevice.auth.signInWithPassword({ email, password: PASSWORD });
    expect(signedIn.error, 'the converted account could not sign in').toBeNull();
    expect(signedIn.data.user?.id, 'signing in landed on a DIFFERENT user').toBe(before);

    /* No `.eq('user_id', …)` filter on purpose: the policy is the filter, so
       an unfiltered select returns exactly this person's diary and nothing
       else. A filter here would pass even if RLS had stopped scoping. */
    const rows = await secondDevice.from('sessions').select('id, user_id');
    expect(rows.error).toBeNull();
    expect(rows.data).toEqual([{ id: sessionId, user_id: before }]);

    const spoken = await secondDevice.from('reflections').select('session_id, body');
    expect(spoken.error).toBeNull();
    expect(spoken.data).toEqual([
      { session_id: sessionId, body: 'Written before there was an account.' },
    ]);

    /* And the profile, which is what carries the locale and "here as" across
       to the second device rather than resetting them. */
    const profileAfter = await secondDevice.from('profiles').select('user_id').single();
    expect(profileAfter.error).toBeNull();
    expect(profileAfter.data?.user_id).toBe(before);

    await secondDevice.auth.signOut();
  }, 60_000);
});

describe('H.2 · the address is taken once, which is what H.0 trades away', () => {
  it('refuses to convert a second anonymous user onto an email that already exists', async () => {
    /* The first account is made the way H.0's script makes one — with the
       service role, `email_confirm: true`, no mail on any path — so this test
       is about the exact collision a beta tester can walk into. */
    const email = testEmail('taken');
    const service = serviceClient();
    const admin = await service.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    expect(admin.error, 'admin.createUser — H.0 is broken if this fails').toBeNull();
    const handedOut = admin.data.user?.id as string;
    created.push(handedOut);

    /* It arrives confirmed, so it can sign in with no mail involved. That is
       the entire mechanism H.0 rests on. */
    expect(admin.data.user?.email_confirmed_at).not.toBeNull();

    /* The trigger fired on the admin insert like any other, so `reveal-track`
       and everything else that expects a profiles row still finds one. */
    const profile = await service
      .from('profiles')
      .select('user_id')
      .eq('user_id', handedOut)
      .maybeSingle();
    expect(profile.error).toBeNull();
    expect(profile.data?.user_id, 'on_auth_user_created did not fire for an admin insert').toBe(
      handedOut,
    );

    /* Now the tester who did their sessions first and signed in second. */
    const { client: latecomer } = await trackedAnonymousUser();
    const clash = await latecomer.auth.updateUser({ email, password: PASSWORD });

    /* ERRORS, rather than silently succeeding or silently doing nothing —
       measured on this stack: 422, `email_exists`. Asserted by CODE and not by
       message, because the message is English prose that GoTrue is free to
       reword. */
    expect(clash.data.user, 'the collision was accepted').toBeNull();
    expect(clash.error?.code).toBe('email_exists');
    expect(clash.error?.status).toBe(422);
  }, 60_000);
});
