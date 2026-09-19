/**
 * The one Supabase client.
 *
 * A singleton because supabase-js holds the auth session and its refresh
 * timer: a second client on the same storage key means two things racing to
 * refresh one session.
 *
 * Session persistence is left at supabase-js's defaults — persistSession with
 * localStorage — which is what makes the same anonymous user survive a
 * reload. It is not configured here so there is nothing to get wrong.
 */
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Refuse to start on a secret key.
 *
 * Everything in this directory is compiled into a bundle that is served to
 * the browser, so a key placed here is public the moment it ships. The anon
 * key is designed for that; a service role key bypasses RLS entirely, and
 * publishing one hands every row of every table to anyone who opens the
 * network tab.
 *
 * Both key formats are checked: a legacy key is a JWT whose payload carries
 * `role`, and a current one is prefixed — `sb_publishable_` is safe here,
 * `sb_secret_` is not.
 *
 * This is deliberately a hard failure rather than a warning. A warning in a
 * console nobody is reading is how the key ends up in production.
 */
function assertNotASecretKey(candidate: string): void {
  if (candidate.startsWith('sb_secret_')) {
    throw new Error(
      'VITE_SUPABASE_ANON_KEY is a SECRET key (sb_secret_…). It must never reach ' +
      'the browser. Use the publishable key (sb_publishable_…) instead.',
    );
  }

  const segments = candidate.split('.');
  if (segments.length !== 3) return; // Not a JWT; nothing more to check.

  try {
    /* Base64URL → base64 before decoding. */
    const payload: unknown = JSON.parse(
      atob(segments[1].replace(/-/g, '+').replace(/_/g, '/')),
    );
    const role = (payload as { role?: unknown }).role;
    if (role === 'service_role') {
      throw new Error(
        'VITE_SUPABASE_ANON_KEY is a SERVICE ROLE key. It bypasses row level ' +
        'security and must never reach the browser. Use the anon key.',
      );
    }
  } catch (error) {
    /* Re-throw our own refusal; ignore an undecodable payload, which only
       means this is not a key we can inspect. */
    if (error instanceof Error && error.message.includes('SERVICE ROLE')) throw error;
  }
}

/**
 * Not thrown at module load. An import-time throw takes the whole app down to
 * a blank page, which hides the reason; the auth gate surfaces it instead and
 * the shell still renders.
 */
function missingConfig(): string | null {
  if (!url) return 'VITE_SUPABASE_URL is not set.';
  if (!key) return 'VITE_SUPABASE_ANON_KEY is not set.';
  return null;
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  const problem = missingConfig();
  if (problem !== null) {
    throw new Error(
      `${problem} Copy apps/web/.env.example to apps/web/.env.local and fill it in. ` +
      'For the local stack, `supabase start` prints both values.',
    );
  }

  if (client === null) {
    assertNotASecretKey(key);
    client = createClient(url, key);
  }

  return client;
}
