/**
 * The beta sign-up, against the running database.
 *
 * `/beta` is the only page that writes to this database with no session at
 * all, which makes `beta_signups` the only table `anon` can write — so the
 * properties below are not about this repository's TypeScript. They are about
 * what Postgres does with a public key, and they are the reason the table is
 * shaped the way it is:
 *
 *   a stranger can join the list;
 *   a stranger cannot read it, change it or empty it;
 *   and the constraints hold even when the browser's validation is skipped,
 *   which anyone holding the anon key can do.
 *
 * Every "must fail" test has a POSITIVE CONTROL beside it. Without one, a
 * renamed table or a typo produces the same error the test is looking for and
 * the suite passes while protecting nothing.
 *
 * Runs under `pnpm test:db`, never under `pnpm check` — CI has no Supabase.
 */
import { afterAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { INSUFFICIENT_PRIVILEGE, anonClient, serviceClient } from './db.support';
import { BETA_REASONS } from './betaReasons';
import { submitBetaSignup } from './betaSignup';

const anon: SupabaseClient = anonClient();
const service: SupabaseClient = serviceClient();

/** Postgres "check constraint violated" and "unique violation". */
const CHECK_VIOLATION = '23514';
const UNIQUE_VIOLATION = '23505';

/**
 * A fresh address per use. The unique index on `lower(email)` outlives the
 * run, so a fixed address would pass once and then hit a duplicate for ever
 * — and the duplicate path reports SUCCESS, so the failure would be a test
 * that silently stops testing the insert.
 */
const written: string[] = [];
function freshEmail(label: string): string {
  const email = `beta-${label}-${crypto.randomUUID()}@example.com`;
  written.push(email);
  return email;
}

/**
 * A row on the list, written the way the page writes it, and its address.
 *
 * Each test that needs an existing row makes its own rather than reaching for
 * one an earlier test left behind: a suite where test four depends on test one
 * having run fails in a different place from the one that broke.
 */
async function joined(label: string): Promise<string> {
  const email = freshEmail(label);
  const result = await submitBetaSignup(
    { firstName: 'Mara', email, reasonCode: BETA_REASONS[0].code },
    anon,
  );
  expect(result).toEqual({ ok: true });
  return email;
}

/* Removed as `service_role`, which is the only role that can: `anon` holds
   INSERT on three columns and nothing else, as the tests below prove. */
afterAll(async () => {
  if (written.length === 0) return;
  const { error } = await service.from('beta_signups').delete().in('email', written);
  if (error !== null) throw error;
});

describe('beta_signups · a stranger can join the list', () => {
  it('accepts a signup from a client holding only the anon key', async () => {
    const email = freshEmail('joins');

    const result = await submitBetaSignup(
      { firstName: 'Mara', email, reasonCode: BETA_REASONS[0].code },
      anon,
    );

    expect(result).toEqual({ ok: true });
  });

  it('stores exactly what was sent, which only service_role can confirm', async () => {
    /* The positive control for the whole file: `ok: true` from an insert that
       asks for nothing back would look identical if the row never landed. */
    const email = freshEmail('stores');

    const result = await submitBetaSignup(
      { firstName: '  Mara  ', email: ` ${email} `, reasonCode: BETA_REASONS[1].code },
      anon,
    );
    expect(result).toEqual({ ok: true });

    const { data, error } = await service
      .from('beta_signups')
      .select('first_name, email, reason_code, created_at')
      .eq('email', email);

    expect(error).toBeNull();
    /* Trimmed on the way in — both fields — and the address is NOT lower-cased
       or otherwise rewritten. */
    expect(data).toEqual([
      {
        first_name: 'Mara',
        email,
        reason_code: BETA_REASONS[1].code,
        created_at: expect.any(String),
      },
    ]);
  });

  it('treats a second signup from the same address as success, and keeps one row', async () => {
    const email = freshEmail('twice');
    const first = await submitBetaSignup(
      { firstName: 'Mara', email, reasonCode: BETA_REASONS[0].code },
      anon,
    );
    const again = await submitBetaSignup(
      { firstName: 'Mara', email, reasonCode: BETA_REASONS[0].code },
      anon,
    );

    expect(first).toEqual({ ok: true });
    /* The reasoning is in betaSignup.ts: the person IS on the list, and
       "you are already on the list" is an answer to "is this address on the
       list?" from anyone holding the public key. */
    expect(again).toEqual({ ok: true });

    const { data } = await service.from('beta_signups').select('id').eq('email', email);
    expect(data).toHaveLength(1);
  });

  it('refuses the same address in different case, through the index', async () => {
    /* Case-insensitive uniqueness is the index, not the app — proven by
       inserting directly, since `submitBetaSignup` would report the refusal as
       success and hide the code. */
    const email = freshEmail('case');
    const inserted = await anon.from('beta_signups').insert({
      first_name: 'Mara', email, reason_code: BETA_REASONS[0].code,
    });
    expect(inserted.error).toBeNull();

    const shouted = await anon.from('beta_signups').insert({
      first_name: 'Mara', email: email.toUpperCase(), reason_code: BETA_REASONS[0].code,
    });
    expect(shouted.error?.code).toBe(UNIQUE_VIOLATION);
  });
});

describe('beta_signups · a stranger cannot read or change the list', () => {
  it('gives the anon role nothing to read', async () => {
    /* NOT an empty result. With no select grant at all, Postgres refuses
       before RLS is consulted — so the test asserts the privilege error, and
       an empty array here would mean a select grant had appeared with no
       policy to go with it. */
    const { data, error } = await anon.from('beta_signups').select('email');

    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    expect(data).toBeNull();
  });

  it('refuses a read even when the address is already known', async () => {
    const email = await joined('known');

    const { data, error } = await anon
      .from('beta_signups')
      .select('first_name')
      .eq('email', email);

    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    expect(data).toBeNull();
  });

  it('refuses an update', async () => {
    const email = await joined('update');

    const { error } = await anon
      .from('beta_signups')
      .update({ first_name: 'Someone else' })
      .eq('email', email);

    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);

    const { data } = await service.from('beta_signups').select('first_name').eq('email', email);
    expect(data).toEqual([{ first_name: 'Mara' }]);
  });

  it('refuses a delete', async () => {
    /* The one that would matter most: with `delete` granted, one public key
       could empty the waiting list. */
    const email = await joined('delete');

    const { error } = await anon.from('beta_signups').delete().eq('email', email);

    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);

    /* And prove it from the side that can see, rather than trusting the
       error: the row is still there. */
    const { data } = await service.from('beta_signups').select('id').eq('email', email);
    expect(data).toHaveLength(1);
  });
});

describe('beta_signups · the column grant', () => {
  it('refuses a caller who tries to choose the id', async () => {
    const { error } = await anon.from('beta_signups').insert({
      id: crypto.randomUUID(),
      first_name: 'Mara',
      email: freshEmail('own-id'),
      reason_code: BETA_REASONS[0].code,
    });

    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it('refuses a caller who tries to backdate the row', async () => {
    const { error } = await anon.from('beta_signups').insert({
      first_name: 'Mara',
      email: freshEmail('backdated'),
      reason_code: BETA_REASONS[0].code,
      created_at: '2020-01-01T00:00:00Z',
    });

    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });
});

describe('beta_signups · the constraints hold without the app', () => {
  /* Every insert below skips `submitBetaSignup` on purpose. The anon key is in
     the bundle, so the browser's validation is advisory and these are the only
     checks a determined caller cannot step around. */

  it('refuses a name of nothing but spaces', async () => {
    const { error } = await anon.from('beta_signups').insert({
      first_name: '   ', email: freshEmail('blank-name'), reason_code: BETA_REASONS[0].code,
    });
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it('refuses a name longer than the cap', async () => {
    const { error } = await anon.from('beta_signups').insert({
      first_name: 'n'.repeat(81), email: freshEmail('long-name'), reason_code: BETA_REASONS[0].code,
    });
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it('refuses something that is not an address', async () => {
    for (const email of ['not-an-address', 'two@@at.example.com', 'spaced out@example.com']) {
      const { error } = await anon.from('beta_signups').insert({
        first_name: 'Mara', email, reason_code: BETA_REASONS[0].code,
      });
      expect(error?.code).toBe(CHECK_VIOLATION);
    }
  });

  it('refuses a reason code that is not a slug', async () => {
    /* The column promises a SHAPE and not a membership, which is what lets the
       list grow without a migration. These are the shapes it refuses. */
    for (const reason_code of ['Via Ben', 'BEN', '1st', 'n'.repeat(41), '']) {
      const { error } = await anon.from('beta_signups').insert({
        first_name: 'Mara', email: freshEmail('bad-reason'), reason_code,
      });
      expect(error?.code).toBe(CHECK_VIOLATION);
    }
  });

  it('accepts a reason code this build does not offer, as long as it is a slug', async () => {
    /* THE POINT OF THE SHAPE CHECK, and the positive control for the test
       above: adding the fifth reason is one line in `lib/betaReasons.ts` and
       two catalogue strings. If this ever fails, somebody has added an
       `in (…)` check or a foreign key and every new reason is a migration
       again. */
    const email = freshEmail('future-reason');
    const { error } = await anon.from('beta_signups').insert({
      first_name: 'Mara', email, reason_code: 'via-someone-we-have-not-met-yet',
    });
    expect(error).toBeNull();
  });
});
