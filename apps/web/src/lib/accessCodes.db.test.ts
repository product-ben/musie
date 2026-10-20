/**
 * `access_codes` — the door policy for the closed beta, against a real stack.
 *
 * ── WHAT IS WORTH TESTING HERE, AND WHAT IS NOT ───────────────────────────
 * Not "does an insert work". The three things this file exists for are the
 * three that a careful reading of the SQL cannot settle:
 *
 *   1. SINGLE USE SURVIVES CONCURRENCY. "Is this code free?" followed by
 *      "mark it used" is two statements with a gap, and two people inside that
 *      gap both get in. The claim is written as one atomic statement; this
 *      proves it by racing five requests at a three-use code and counting.
 *   2. A DOUBLE-TAP IS NOT A SECOND PERSON. The same tester pressing submit
 *      twice must not spend two uses, and must not be told their own code is
 *      used up one second after they used it.
 *   3. THE CLIENT CANNOT REACH ANY OF IT. Whoever holds the anon key — which
 *      is public the moment the bundle ships — must be able to walk through
 *      the door without being able to read the list of keys.
 *
 * ── AND ONE THING THE SQL CANNOT SAY AT ALL ───────────────────────────────
 * The claim and the account live in different systems — this table in
 * Postgres, the user in GoTrue — so they cannot be one transaction. The design
 * claims FIRST and releases if creation fails, because the other ordering
 * fails silently (a reusable code behind an account that exists). The release
 * is therefore load-bearing, and so is its guard: a claim that already carries
 * a user is a finished signup and must NOT be releasable.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { anonClient, registerCreatedUser, serviceClient } from './db.support';

/* Distinct per run, so two runs inside one stack cannot collide — and so a
   failed run leaves evidence rather than poisoning the next one.
   THE TWO CODES MUST DIFFER, and the first version of this file got that
   wrong: an arithmetic derivation collapsed to the same four digits, the room
   test ran against the single-use row with a use already spent, and it failed
   claiming the implementation was wrong when the fixture was. Drawn from a
   shuffled pair now, and asserted below, so it cannot come back. */
const RUN = Math.floor(Math.random() * 4000) + 1000;
const SINGLE = String(RUN);
const ROOM = String(RUN + 4000);

const service = serviceClient();
const email = (label: string) => `${label}-${RUN}@musie.test`;

async function seed(code: string, maxUses: number, note: string): Promise<void> {
  const { error } = await service
    .from('access_codes')
    .upsert({ code, max_uses: maxUses, note });
  expect(error, `could not seed ${code}`).toBeNull();
}

async function usesOf(code: string): Promise<number> {
  const { data, error } = await service
    .from('access_codes')
    .select('uses')
    .eq('code', code)
    .single();
  expect(error).toBeNull();
  return (data as { uses: number }).uses;
}

async function claim(code: string, who: string): Promise<string> {
  const { data, error } = await service.rpc('claim_access_code', {
    p_code: code,
    p_email: who,
  });
  expect(error).toBeNull();
  return data as unknown as string;
}

afterAll(async () => {
  await service.from('access_codes').delete().in('code', [SINGLE, ROOM]);
}, 30_000);

describe('the fixtures themselves', () => {
  it('uses two different codes', () => {
    /* Cheap, and it earned its place: when these collided, the race test
       failed in a way that read exactly like a broken atomic claim. */
    expect(SINGLE).not.toBe(ROOM);
  });
});

describe('a single-use code', () => {
  it('is claimed once, and the budget moves', async () => {
    await seed(SINGLE, 1, 'db test · single use');

    expect(await claim(SINGLE, email('first'))).toBe('claimed');
    expect(await usesOf(SINGLE)).toBe(1);
  });

  it('treats the same person pressing twice as the same claim', async () => {
    /* Upper-cased deliberately: the function lower-cases before it compares,
       so `Ben@…` and `ben@…` are one person. Without that the primary key
       would not catch the double-tap and the budget would be spent twice. */
    expect(await claim(SINGLE, email('first').toUpperCase())).toBe('already_claimed');
    expect(await usesOf(SINGLE), 'a double-tap must not charge twice').toBe(1);
  });

  it('refuses a different person', async () => {
    expect(await claim(SINGLE, email('second'))).toBe('exhausted');
    expect(await usesOf(SINGLE)).toBe(1);
  });
});

describe('releasing a claim, when the account could not be created', () => {
  it('puts the use back and lets somebody else have it', async () => {
    const { data, error } = await service.rpc('release_access_code', {
      p_code: SINGLE,
      p_email: email('first'),
    });
    expect(error).toBeNull();
    expect(data).toBe(true);
    expect(await usesOf(SINGLE)).toBe(0);

    expect(await claim(SINGLE, email('second'))).toBe('claimed');
  });

  it('REFUSES once the claim carries an account', async () => {
    /* The guard that matters. A claim with a user_id is a finished signup;
       releasing one would hand a spent code back while leaving the account
       standing — a code that works twice, which is the whole thing this table
       is for. */
    const created = await service.auth.admin.createUser({
      email: email('bound'),
      email_confirm: true,
    });
    expect(created.error).toBeNull();
    const userId = created.data.user?.id;
    expect(userId).toBeDefined();
    if (userId !== undefined) registerCreatedUser(userId);

    const bound = await service.rpc('bind_access_code_claim', {
      p_code: SINGLE,
      p_email: email('second'),
      p_user_id: userId,
    });
    expect(bound.error).toBeNull();
    expect(bound.data).toBe(true);

    const released = await service.rpc('release_access_code', {
      p_code: SINGLE,
      p_email: email('second'),
    });
    expect(released.error).toBeNull();
    expect(released.data, 'a bound claim must not be releasable').toBe(false);
    expect(await usesOf(SINGLE)).toBe(1);
  });
});

describe('a code for a room', () => {
  it('hands out exactly its budget, however many ask at once', async () => {
    await seed(ROOM, 3, 'db test · a room of three');

    /* THE RACE, and it is the reason this file is a db test rather than a unit
       test. Five requests in flight together against a three-use code: the
       winner increments, the losers re-evaluate `uses < max_uses` against the
       committed value and match nothing. A read-then-write implementation
       passes every other test in this file and fails this one. */
    const outcomes = await Promise.all(
      ['a', 'b', 'c', 'd', 'e'].map((who) => claim(ROOM, email(`race-${who}`))),
    );

    expect(outcomes.filter((o) => o === 'claimed')).toHaveLength(3);
    expect(outcomes.filter((o) => o === 'exhausted')).toHaveLength(2);
    expect(await usesOf(ROOM)).toBe(3);
  });
});

describe('what it refuses', () => {
  it('names each refusal distinctly, so the screen can say the right thing', async () => {
    expect(await claim('0000', email('nobody'))).toBe('unknown');
    expect(await claim(ROOM, 'not-an-address')).toBe('invalid_email');

    const { error } = await service
      .from('access_codes')
      .update({ revoked_at: new Date().toISOString() })
      .eq('code', ROOM);
    expect(error).toBeNull();

    expect(await claim(ROOM, email('late'))).toBe('revoked');
  });
});

describe('the browser holds the anon key, and it is public', () => {
  it('cannot read the list of codes', async () => {
    const { data, error } = await anonClient().from('access_codes').select('code');

    /* Refused by the PRIVILEGE check, before RLS is consulted — which is what
       the revoke in the migration buys. Without it this table would arrive
       fully granted to anon by the stack's default privileges, and only the
       absence of a policy would be standing between a public key and the
       codes. Rule 2's trap, asserted rather than assumed. */
    expect(error, 'anon must not be able to select from access_codes').not.toBeNull();
    expect(data).toBeNull();
  });

  it('cannot call the claim function either', async () => {
    const { error } = await anonClient().rpc('claim_access_code', {
      p_code: SINGLE,
      p_email: email('evil'),
    });

    /* Postgres grants EXECUTE to PUBLIC on a new function by default, so this
       is the revoke in the migration being asserted. Without it, anyone with
       the bundle could spend every code in the table from a loop. */
    expect(error, 'anon must not be able to execute claim_access_code').not.toBeNull();
  });
});
