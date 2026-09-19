/**
 * The active session — the one query the drawer was built around.
 *
 * ── WHAT CHANGED, AND WHY THIS FILE USED TO LIE ────────────────────────────
 * This module previously returned `null`, always, and said so loudly: there
 * was no `sessions` table, so "is a session running?" had no source of truth
 * and guessing would have been worse than admitting it. The table now exists
 * (supabase/migrations/20260919120000_sessions.sql), so the honest null is
 * replaced by the honest read.
 *
 * ── AT MOST ONE RUNNING SESSION IS A DATABASE FACT, NOT AN ASSUMPTION ──────
 * `maybeSingle()` below would be a hope in most schemas. Here it is a
 * guarantee:
 *
 *   create unique index sessions_one_running_per_user
 *     on public.sessions (user_id) where status = 'started';
 *
 * A second `started` row cannot exist, so "the" active session is a
 * well-defined thing to ask for. If that index is ever dropped, this call
 * starts erroring rather than silently picking one of two — which is the right
 * failure, and the reason it is `maybeSingle` rather than `limit(1)`.
 *
 * ── NO user_id FILTER, DELIBERATELY ────────────────────────────────────────
 * The query does not mention the current user. `sessions_select_own` does it:
 * `using (user_id = (select auth.uid()))`. Adding `.eq('user_id', …)` here
 * would read as the security boundary while being a convenience, and the day
 * the two disagreed the policy would win silently. RLS is the boundary; this
 * is a query.
 *
 * ── WHY THERE IS NO CACHE TO INVALIDATE ────────────────────────────────────
 * The drawer is a ROUTE (`/menu`), so it mounts when it opens and unmounts
 * when it closes. Every open therefore re-reads. That is the whole of
 * "creating a session hides Start session everywhere, and cancelling brings it
 * back" — no cache, no invalidation, no subscription, and nothing that can go
 * stale. It is also why `useAsync` is enough and a query library is not.
 */
import * as React from 'react';
import { getSupabase } from './supabase';
import { useAsync } from './useAsync';
import type { AsyncState } from './useAsync';
import { isStepId } from '../routeHandle';
import type { StepId } from '../routeHandle';

export interface ActiveSession {
  /** The `:id` segment of /session/:id/:step. */
  id: string;
  /** Which of the four steps the user stopped at — where to resume. */
  step: StepId;
}

/**
 * The running session, or null when there is none.
 *
 * Throws on a query failure rather than returning null for it. Null means "no
 * session is running", which is a fact the drawer acts on by offering *Start a
 * session*; a failed read is not that fact, and collapsing the two would offer
 * to start a second session whenever the network hiccupped — the one thing the
 * unique index exists to prevent.
 */
export async function readActiveSession(): Promise<ActiveSession | null> {
  const { data, error } = await getSupabase()
    .from('sessions')
    .select('id, step')
    .eq('status', 'started')
    .maybeSingle();

  if (error !== null) {
    throw new Error(`[musie] could not read the active session: ${error.message}`);
  }
  if (data === null) return null;

  /* NARROWING, NOT VALIDATION. `sessions.step` carries a check constraint
     restricting it to the four ids, so the else branch is unreachable through
     the database. It exists because the GENERATED type is `string`, and the
     alternative is an `as StepId` cast — which would assert the same thing
     while also hiding the day somebody widens the constraint. */
  if (!isStepId(data.step)) {
    console.error(
      `[musie] session ${data.id} carries an unknown step "${data.step}" — resuming at intro`,
    );
    return { id: data.id, step: 'intro' };
  }

  return { id: data.id, step: data.step };
}

/**
 * The hook the drawer uses.
 *
 * A fixed key, which looks wrong and is not: `useAsync` runs its effect on
 * mount as well as on a key change, and this hook's consumer is mounted by
 * navigation rather than kept alive. One browser holds one anonymous user, so
 * there is no second identity for the key to distinguish.
 */
export function useActiveSession(): AsyncState<ActiveSession | null> {
  const run = React.useCallback(() => readActiveSession(), []);

  return useAsync(run, 'active-session');
}
