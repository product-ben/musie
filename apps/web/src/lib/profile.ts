/**
 * Reading and writing the signed-in user's profiles row.
 *
 * One row, one place. Before this, LocaleProvider fetched `language` on its
 * own; adding `theme` and `user_type_id` would have meant three requests for
 * the same row and three copies of it that could drift after an update.
 *
 * The row is created by a database trigger on auth.users insert, never by the
 * client — see the profiles migration. So this module reads and updates, and
 * has no insert path at all.
 */
import { getSupabase } from './supabase';
import type { Database } from './database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfilePatch = Database['public']['Tables']['profiles']['Update'];

/**
 * How long to wait for the row before giving up.
 *
 * MEASURED in 2.4: with the network blocked, a fetch takes ~5s to reject.
 * Because the locale gate waits on this read, that made a dead network show a
 * blank main for ~5s and only then the content error — ten seconds before the
 * app admitted anything was wrong.
 *
 * This is a single-row lookup on an indexed primary key. If it has not
 * answered in 2.5s the connection is the problem, and the app is better off
 * rendering with its cached-or-detected locale while the content query fails
 * visibly.
 */
export const PROFILE_TIMEOUT_MS = 2500;

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .abortSignal(AbortSignal.timeout(PROFILE_TIMEOUT_MS))
    .single();

  if (error !== null) throw new Error(`[musie] could not read the profile: ${error.message}`);
  return data;
}

/**
 * Write part of the row.
 *
 * Deliberately NOT an upsert: the row already exists by trigger, and an upsert
 * would give the client an insert path it has no business having — the RLS
 * insert policy exists only so the trigger's owner-level insert is not the
 * single exception to the table's rules.
 */
export async function updateProfile(userId: string, patch: ProfilePatch): Promise<void> {
  const { error } = await getSupabase()
    .from('profiles')
    .update(patch)
    .eq('user_id', userId);

  if (error !== null) throw new Error(`[musie] could not save the profile: ${error.message}`);
}
