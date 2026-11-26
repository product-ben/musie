/**
 * SAFETY NET. Replaces `src/lib/supabase.ts` for every module in the build,
 * including the real lib modules the other shims re-export from. Nothing on
 * this page may talk to Supabase (CLAUDE.md rule 10), so a call that reaches
 * here is a module that should have been shimmed: it fails loudly, in the
 * console, and sends nothing.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export function getSupabase(): SupabaseClient {
  throw new Error('[vollbild] Supabase is not available in this experiment — a module is missing its shim.');
}
