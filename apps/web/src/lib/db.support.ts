/**
 * TEST-ONLY helpers for the `db` Vitest project. Nothing in the app imports
 * this, and nothing here belongs in a browser bundle.
 *
 * ── THE KEYS ARE READ FROM THE RUNNING STACK, NOT COMMITTED ────────────────
 * `supabase status -o json` is the only source. That has two consequences,
 * both wanted:
 *
 *   1. no key is written into the repository, not even the well-known local
 *      demo pair — a service-role key in a file is a habit, and habits travel;
 *   2. if the stack is not running, this throws with a message that says what
 *      to do, instead of every test failing with a connection error or,
 *      worse, being skipped. A safety net that quietly does not run is the
 *      failure this whole step exists to prevent.
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

export function stack(): Stack {
  if (cached !== null) return cached;

  let raw: string;
  try {
    raw = execFileSync('supabase', ['status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    throw new Error(
      'The local Supabase stack is not reachable. Run `supabase start`, then ' +
        '`pnpm test:db` again. These tests are deliberately NOT in `pnpm check` ' +
        'and are never skipped.',
    );
  }

  const parsed = JSON.parse(raw) as Partial<Stack>;
  if (!parsed.API_URL || !parsed.ANON_KEY || !parsed.SERVICE_ROLE_KEY) {
    throw new Error('`supabase status -o json` returned no keys.');
  }

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
