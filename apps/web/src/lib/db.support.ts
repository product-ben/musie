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
 * ── AND IT CAN BE POINTED SOMEWHERE ELSE ───────────────────────────────────
 * `supabase status` only ever describes the LOCAL stack, which pinned this
 * suite to localhost — and a security net that can only be run against the
 * permissive environment is the wrong way round. The local stack ships
 * `alter default privileges … grant all on tables`, so a table with a missing
 * grant passes here and 403s on a hosted project. The suite has to be able to
 * run where that is true.
 *
 * So three environment variables override the default, and it is ALL THREE OR
 * NONE: a partial set means someone meant to point this somewhere and got it
 * half right, and silently testing localhost instead is exactly the false
 * green this file exists to prevent.
 *
 *   SUPABASE_TEST_URL
 *   SUPABASE_TEST_ANON_KEY
 *   SUPABASE_TEST_SERVICE_ROLE_KEY
 *
 * Pass them on the command line for one run. The service-role key bypasses RLS
 * and every column grant; it does not belong in a file, and least of all in
 * one a hosted project's key could reach.
 *
 * The target is PRINTED on first use. These tests create real anonymous users
 * wherever they are aimed, and "why is my production project full of users"
 * is a question that should never have to be asked.
 */
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Stack {
  API_URL: string;
  ANON_KEY: string;
  SERVICE_ROLE_KEY: string;
}

let cached: Stack | null = null;

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

  return { API_URL: API_URL!, ANON_KEY: ANON_KEY!, SERVICE_ROLE_KEY: SERVICE_ROLE_KEY! };
}

export function stack(): Stack {
  if (cached !== null) return cached;

  const override = fromEnvironment();
  if (override !== null) {
    /* Loud, because a remote run creates real users on a real project. */
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
        'and SUPABASE_TEST_SERVICE_ROLE_KEY to run against a hosted project. ' +
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
 * A fresh anonymous USER — a real auth.users row, a real profiles row from the
 * trigger, and the `authenticated` role. Each call is a different person,
 * which is the whole point of the isolation tests.
 *
 * config.toml rate-limits anonymous sign-ins to 30 per hour per IP. This suite
 * creates two per run, so a tight loop of reruns is the only way to hit it.
 */
export async function anonymousUser(): Promise<{
  client: SupabaseClient;
  userId: string;
}> {
  const client = anonClient();
  const { data, error } = await client.auth.signInAnonymously();
  if (error !== null) throw error;
  if (data.user === null) throw new Error('Anonymous sign-in returned no user.');
  return { client, userId: data.user.id };
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
