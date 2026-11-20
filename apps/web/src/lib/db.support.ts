/**
 * TEST-ONLY helpers for the `db` Vitest project. Nothing in the app imports
 * this, and nothing here belongs in a browser bundle.
 *
 * ── THE KEYS ARE READ FROM THE RUNNING STACK, NOT COMMITTED ────────────────
 * `supabase status -o json` is the default source. That has two consequences,
 * both wanted:
 *
 *   1. no key is written into the repository, not even the well-known local
 *      demo pair — a service-role key in a file is a habit, and habits travel;
 *   2. if the stack is not running, this throws with a message that says what
 *      to do, instead of every test failing with a connection error or,
 *      worse, being skipped. A safety net that quietly does not run is the
 *      failure this whole step exists to prevent.
 *
 * ── AND IT CAN BE POINTED AT ANOTHER LOCAL STACK — NEVER AT HOSTED ────────
 * Three environment variables override the default, and it is ALL THREE OR
 * NONE: a partial set means someone meant to point this somewhere and got it
 * half right, and silently testing the shared stack instead is exactly the
 * false green this file exists to prevent.
 *
 *   SUPABASE_TEST_URL
 *   SUPABASE_TEST_ANON_KEY
 *   SUPABASE_TEST_SERVICE_ROLE_KEY
 *
 * What they are for is a PRIVATE local stack — a copy of `supabase/` with its
 * own `project_id` and ports, so a branch can `supabase start` its migrations
 * from scratch without touching the one shared stack (CLAUDE.md rule 9;
 * `docs/plans/instruments-exercises.md` has the recipe).
 *
 * ── THE URL MUST BE LOOPBACK, AND THAT IS NEW — Ben, 2026-11-20 ───────────
 * Until this date `db-push.yml` aimed this suite at the HOSTED project after
 * every merge, and that is how it found the `service_role` grant hole (rule 2).
 * It is also how it deleted a real track. `maintenance.db.test.ts` creates
 * `trk-98` and hard-deletes it before and after every test, on the assumption
 * that nobody counts that high; Lucia's library passed 98 around 2026-10-20,
 * her „Reflection No. 2 for Solo Violin" WAS `trk-98`, and the next hosted run
 * overwrote it and deleted it. Nothing noticed, because the hosted run had
 * been red since 2026-10-13 for a second reason — two tests compared hosted
 * with the export snapshots, which an operator edit breaks by design.
 *
 * Ben's call: on hosted, the one thing worth checking is that every file an
 * exercise plays or shows is there. That is `pnpm assets:check`, read-only,
 * and it is what `db-push.yml` runs now. Everything this suite asserts —
 * policies, grants, triggers, the write path — is a property of the
 * MIGRATIONS, and the migrations are the same files on every stack.
 *
 * So a target that is not loopback is refused here, before a single row is
 * written, rather than trusted to every future test author to remember.
 * These tests create real users wherever they are aimed; they are swept at
 * the end of every file — see sweepCreatedUsers.
 */
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Stack {
  API_URL: string;
  ANON_KEY: string;
  SERVICE_ROLE_KEY: string;
}

let cached: Stack | null = null;

/** The only hosts this suite will write to. Exported for `db.globalSetup.ts`. */
export const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

/**
 * The override, or null when none of the three is set.
 *
 * Throws on a partial set rather than falling through to the local stack.
 */
function fromEnvironment(): Stack | null {
  const API_URL = process.env.SUPABASE_TEST_URL;
  const ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;

  if (!API_URL && !ANON_KEY && !SERVICE_ROLE_KEY) return null;

  const missing = [
    API_URL ? null : 'SUPABASE_TEST_URL',
    ANON_KEY ? null : 'SUPABASE_TEST_ANON_KEY',
    SERVICE_ROLE_KEY ? null : 'SUPABASE_TEST_SERVICE_ROLE_KEY',
  ].filter((name): name is string => name !== null);

  if (missing.length > 0) {
    throw new Error(
      `Pointing the db suite somewhere needs all three variables; missing: ${missing.join(', ')}. ` +
        'Set all three or none — a partial set would silently test the local stack instead.',
    );
  }

  if (!LOOPBACK.has(new URL(API_URL!).hostname)) {
    throw new Error(
      `The db suite writes, and ${API_URL} is not a local stack. It runs against loopback only `
        + '(Ben, 2026-11-20 — the hosted run deleted a real track). To check hosted, run '
        + '`pnpm assets:check`, which only reads.',
    );
  }

  return { API_URL: API_URL!, ANON_KEY: ANON_KEY!, SERVICE_ROLE_KEY: SERVICE_ROLE_KEY! };
}

export function stack(): Stack {
  if (cached !== null) return cached;

  const override = fromEnvironment();
  if (override !== null) {
    console.info(`[db suite] target: ${override.API_URL} (from the environment)`);
    cached = override;
    return cached;
  }

  let raw: string;
  try {
    raw = execFileSync('supabase', ['status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    throw new Error(
      'The local Supabase stack is not reachable. Run `supabase start`, then ' +
        '`pnpm test:db` again — or set SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY ' +
        'and SUPABASE_TEST_SERVICE_ROLE_KEY to run against another LOCAL stack. ' +
        'These tests are deliberately NOT in `pnpm check` and are never skipped.',
    );
  }

  const parsed = JSON.parse(raw) as Partial<Stack>;
  if (!parsed.API_URL || !parsed.ANON_KEY || !parsed.SERVICE_ROLE_KEY) {
    throw new Error('`supabase status -o json` returned no keys.');
  }

  console.info(`[db suite] target: ${parsed.API_URL} (local stack)`);
  cached = parsed as Stack;
  return cached;
}

/** An unauthenticated client: the `anon` role, holding no JWT. */
export function anonClient(): SupabaseClient {
  const { API_URL, ANON_KEY } = stack();
  return createClient(API_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * A fresh USER — a real auth.users row, a real profiles row from the trigger,
 * and the `authenticated` role. Each call is a different person, which is the
 * whole point of the isolation tests.
 *
 * ── IT USED TO BE AN ANONYMOUS SIGN-IN, AND THAT BROKE ON HOSTED ──────────
 * `signInAnonymously()` until 2026-10-20. The isolation tests never needed
 * the users to be ANONYMOUS — they need two people who are not each other —
 * so the anonymity was incidental and the dependency was invisible until it
 * cost something.
 *
 * It cost this: `enable_anonymous_sign_ins` is false on the hosted project,
 * and `db-push.yml` ran this suite against hosted on every merge until
 * 2026-11-20. Every one
 * of those runs failed with `anonymous_provider_disabled` — on 16 October and
 * again on the 20th — while the local suite stayed green, because the local
 * stack has the provider on.
 *
 * AND IT WAS NOT A SECRET. `apps/docs/architecture/auth.md` states that the
 * hosted project has anonymous sign-ins disabled and that
 * `POST /auth/v1/signup` answers `anonymous_provider_disabled` there. The fact
 * was written down; what nobody joined it to was this helper, and therefore
 * the suite, and therefore a workflow that had been red for days. The gap was
 * never knowledge — it was that no check compared the two environments.
 *
 * So the user is created with the service role instead. It works identically
 * on both targets, and it is the only version of this helper that can be true
 * now that anonymous accounts are gone from the product entirely.
 */
export async function testUser(): Promise<{
  client: SupabaseClient;
  userId: string;
}> {
  /* Distinct per call AND per run: these tests prove that one person cannot
     read another's rows, so two users from the same run must never collide,
     and a rerun must not meet its own leftovers. */
  const email = `db-suite-${Date.now()}-${randomUUID().slice(0, 8)}@musie.test`;
  const password = randomUUID();

  const admin = serviceClient();
  const created = await admin.auth.admin.createUser({
    email,
    password,
    /* Confirmed on arrival, so the sign-in below needs no mail on any path.
       `create-tester.mjs` uses the same trick for the same reason. */
    email_confirm: true,
  });
  if (created.error !== null) throw created.error;

  const userId = created.data.user?.id;
  if (userId === undefined) throw new Error('admin.createUser returned no user.');
  registerCreatedUser(userId);

  /* A CLIENT ACTING AS THAT PERSON, which is the whole point — an admin
     client would bypass RLS and every test here would pass against a database
     with no policies at all. `admin.createUser` hands back a user but not a
     session, so the password exists only to turn one into the other and is
     thrown away with the function scope. */
  const client = anonClient();
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error !== null) throw signedIn.error;

  return { client, userId };
}

/**
 * ── EVERY USER THIS SUITE CREATES, SO THE RUN CAN TAKE THEM BACK ──────────
 *
 * `db-push.yml` ran this suite against the HOSTED project on every merge to
 * `main` until 2026-11-20, and each run left its users behind permanently. They are
 * real `auth.users` rows: they count toward monthly active users, and they
 * crowd out the real testers in exactly the table somebody is about to start
 * reading daily. The pile grew with merges rather than with use, which is why
 * nobody connected it to the tests.
 *
 * The two files that create EMAIL accounts — `signIn.db.test.ts` and
 * `auth.convert.db.test.ts` — already delete theirs in an `afterAll`. This is
 * the same discipline for the anonymous ones, applied once in the helper that
 * mints them rather than copied into the seven files that call it.
 *
 * NOT A HEURISTIC, and that is the point. The sweep deletes exactly the ids
 * this process minted — no age cutoff, no "anonymous users older than", no
 * query that could match a real person's row. A test user cannot be confused
 * with a tester because the suite never has to guess which is which.
 *
 * The registry is module-scoped, so it is per worker process. `db.setup.ts`
 * registers the `afterAll` that drains it, which Vitest runs once per test
 * FILE — the tests in a file are done with their users by then, and holding
 * them to the end of the whole run would need a channel between workers that
 * does not exist.
 */
const createdUsers = new Set<string>();

/**
 * Hand a user id to the sweep.
 *
 * `testUser()` calls this for you. It is exported for the places that create a
 * user without it — `signIn.db.test.ts` builds its own accounts to prove the
 * sign-in round trip, and those need sweeping too.
 */
export function registerCreatedUser(userId: string): void {
  createdUsers.add(userId);
}

/**
 * Delete every user this process registered, then forget them.
 *
 * ── IT NEVER FAILS THE RUN ────────────────────────────────────────────────
 * A leftover row is noise; a red build over a cleanup is worse than the thing
 * it cleans, and it would land on whoever merged next rather than on whoever
 * broke it. So a failed delete is reported and swallowed — loudly enough to
 * notice, quietly enough not to block a merge.
 *
 * Deleting a user cascades to `profiles` and everything hanging off it, which
 * is why this is the only sweep needed rather than one per table.
 */
export async function sweepCreatedUsers(): Promise<void> {
  if (createdUsers.size === 0) return;

  const service = serviceClient();
  const ids = [...createdUsers];
  createdUsers.clear();

  const failures: string[] = [];
  for (const userId of ids) {
    try {
      const { error } = await service.auth.admin.deleteUser(userId);
      /* ALREADY GONE IS NOT A FAILURE. `auth.convert.db.test.ts` and
         `signIn.db.test.ts` keep their own `created` lists and delete in their
         own `afterAll`, which Vitest runs before this one — so for those files
         every id here is a second attempt at a row that is correctly absent.
         Warning about it would print on every green run, and a warning that is
         always there is one nobody reads on the day it means something. */
      if (error !== null && error.status !== 404) {
        failures.push(`${userId}: ${error.message}`);
      }
    } catch (thrown: unknown) {
      failures.push(`${userId}: ${thrown instanceof Error ? thrown.message : String(thrown)}`);
    }
  }

  if (failures.length > 0) {
    console.warn(
      `[db suite] ${failures.length} of ${ids.length} test users could not be deleted. `
      + 'They are now orphaned rows — delete them by hand.\n  '
      + failures.join('\n  '),
    );
  }
}

/**
 * The service role bypasses RLS and every column grant. Used ONLY to read what
 * the client is not allowed to see, so a test can prove the client cannot see
 * it — never to set up state a client should be creating itself.
 */
export function serviceClient(): SupabaseClient {
  const { API_URL, SERVICE_ROLE_KEY } = stack();
  return createClient(API_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Postgres "insufficient privilege" — what a refused grant looks like. */
export const INSUFFICIENT_PRIVILEGE = '42501';
