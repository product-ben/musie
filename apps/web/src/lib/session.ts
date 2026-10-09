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
import { activeSteps } from './sessionMachine';
import type { SessionStatus } from './sessionMachine';

export interface ActiveSession {
  /** The `:id` segment of /session/:id/:step. */
  id: string;
  /** Which of the four steps the user stopped at — where to resume. */
  step: StepId;
  /**
   * WHICH exercise is running — the id, never the name.
   *
   * Added 2026-10-05, for the one thing every screen that mentions a running
   * session had to do without: naming it. /exercises offered to end "the
   * previous session" and the dialog that asked could not say what it was,
   * because this type carried a route and a step and nothing about the run.
   *
   * THE ID AND NOT THE NAME, because the name is CONTENT: it lives in
   * `exercise_i18n`, it is per locale, and every screen that needs it already
   * holds the catalogue it comes from (`useExercises()`). A name on this
   * interface would be a second copy of a row this module does not read.
   */
  exerciseId: string;
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
    .select('id, step, exercise_id')
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
    return { id: data.id, step: 'intro', exerciseId: data.exercise_id };
  }

  return { id: data.id, step: data.step, exerciseId: data.exercise_id };
}

/* ── The session's own row, and every write the flow makes to it ───────────
 *
 * ── WHY THE WRITES LIVE HERE AND NOT IN THE SCREEN ─────────────────────────
 * The reducer in `sessionMachine.ts` is pure and holds no database; the row is
 * what survives a closed tab. This module is the seam, and keeping it one
 * module means there is one place where a transition and its persistence are
 * written down together — a screen that advanced the reducer and forgot the
 * write would leave a session that resumes at the wrong step, which is the
 * failure nothing else would catch.
 *
 * ── `completed` IS DERIVED, NOT STORED ─────────────────────────────────────
 * `sessions` has `step` and no `completed` column, and that is deliberate
 * rather than an omission (D.4). The wizard's own rule is "every earlier step
 * is completed", so a row's `step` already says which steps are behind it —
 * and a stored list could contradict the column it was derived from. See
 * `completedBefore`.
 */

/** A session row, as the flow reads it back. Column spellings stop here. */
export interface SessionRow {
  id: string;
  exerciseId: string;
  cardId: string | null;
  trackId: string | null;
  status: SessionStatus;
  step: StepId;
  startedAt: string;
  endedAt: string | null;
}

/**
 * Which steps are behind this one — derived from `step` and the run's shape.
 *
 * THE ALTERNATIVE WAS A COLUMN, and it was rejected for the reason `skipped`
 * was: a second source of truth for something the first one already implies.
 * The reachability rule only ever lets you stand on a step whose predecessors
 * are all complete, so "everything before `step`, minus what is not in the
 * run" IS the completed set, and no row can disagree with itself.
 *
 * The one thing it cannot reconstruct is a step you completed and then jumped
 * back from — resume puts you at `step` with everything before it done, which
 * is exactly where a returning user expects to be rather than a replay of a
 * browsing history they no longer remember. `resumeSession` makes the same
 * call about the back stack, for the same reason.
 */
export function completedBefore(
  step: StepId,
  skipped: readonly StepId[] = [],
): StepId[] {
  const run = activeSteps(skipped);
  const index = run.indexOf(step);
  /* -1 GUARD, AND IT IS NOT DEFENSIVE. A step can genuinely be outside the
     run: `skipped` is derived from `exercises.needs_cards` on every read, so
     an exercise edited to draw no cards while somebody's session sits at
     `scan` produces exactly this call. Without the guard `slice(0, -1)`
     returns everything but the LAST step — so resuming would report `listen`
     as completed when it had not been. Caught by a test, not by review. */
  if (index < 0) return [];
  return run.slice(0, index) as StepId[];
}

/** Narrow the two constrained columns, exactly as `readActiveSession` does. */
function toRow(row: {
  id: string; exercise_id: string; card_id: string | null; track_id: string | null;
  status: string; step: string; started_at: string; ended_at: string | null;
}): SessionRow | null {
  if (row.status !== 'started' && row.status !== 'finished' && row.status !== 'abandoned') {
    console.error(`[musie] session ${row.id} has status "${row.status}" — dropped`);
    return null;
  }
  if (!isStepId(row.step)) {
    console.error(`[musie] session ${row.id} has step "${row.step}" — dropped`);
    return null;
  }
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    cardId: row.card_id,
    trackId: row.track_id,
    status: row.status,
    step: row.step,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

const SESSION_COLUMNS = 'id, exercise_id, card_id, track_id, status, step, started_at, ended_at';

/**
 * One session by id. Null when there is no such row — which, under RLS, is
 * indistinguishable from "it is not yours", on purpose.
 */
export async function readSession(id: string): Promise<SessionRow | null> {
  const { data, error } = await getSupabase()
    .from('sessions')
    .select(SESSION_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error !== null) {
    throw new Error(`[musie] could not read session ${id}: ${error.message}`);
  }
  if (data === null) return null;
  return toRow(data);
}

/** Postgres unique violation — what the one-running-session index raises. */
const UNIQUE_VIOLATION = '23505';

/**
 * Starting a session, and the one refusal that is not an error.
 *
 * `sessions_one_running_per_user` is a partial unique index, so a second
 * `started` row cannot be created. That is not a failure to report as one: the
 * session it collides with is this person's own and is one tap away, so the
 * result says which, and the screen offers to continue it.
 *
 * Reading the collision back rather than guessing at it: the index tells us
 * one exists, not where it is.
 */
export type StartResult =
  | { kind: 'started'; session: ActiveSession }
  | { kind: 'already-running'; session: ActiveSession | null };

export async function createSession(
  userId: string,
  exerciseId: string,
  /**
   * The goal chosen on /exercises, or null.
   *
   * NULL IS A REAL ANSWER, not a missing one: "Musie entdecken" is a choice
   * the picker offers and it means this run had no goal. The column is
   * nullable for exactly that, and the diary must not later read a null as
   * "we forgot to ask".
   *
   * REQUIRED rather than defaulted. A default would let a future caller start
   * a session that silently records no goal, which is the one mistake this
   * argument exists to make impossible — the caller has the answer and has to
   * say it.
   */
  goalId: string | null,
): Promise<StartResult> {
  const { data, error } = await getSupabase()
    .from('sessions')
    .insert({
      user_id: userId,
      exercise_id: exerciseId,
      goal_id: goalId,
      /* The first step of every run. `intro` is never skipped — a cardless
         exercise skips `scan` — so this needs no knowledge of the exercise. */
      status: 'started',
      step: 'intro',
    })
    .select('id, step')
    .single();

  if (error !== null) {
    if (error.code === UNIQUE_VIOLATION) {
      return { kind: 'already-running', session: await readActiveSession() };
    }
    throw new Error(`[musie] could not start a session: ${error.message}`);
  }

  /* `exerciseId` from the ARGUMENT, not from the row: it is what was just
     inserted, and selecting it back would be a round trip to be told something
     this function already knows. */
  return { kind: 'started', session: { id: data.id, step: 'intro', exerciseId } };
}

/**
 * Move the row to a step.
 *
 * `status` is untouched: advancing is not ending, and the
 * `sessions_ended_at_matches_status` check would refuse a step write that
 * tried to carry one.
 */
export async function saveStep(id: string, step: StepId): Promise<void> {
  const { error } = await getSupabase().from('sessions').update({ step }).eq('id', id);
  if (error !== null) {
    throw new Error(`[musie] could not save the step: ${error.message}`);
  }
}

/**
 * What was drawn, and what it plays.
 *
 * ONE WRITE, TWO FACTS, deliberately. `card_id` and `track_id` are different
 * things — what you drew and what you heard — but they are decided by one act,
 * and writing them separately would allow a row that has a card and no
 * recording because the second request failed.
 *
 * BOTH NULLABLE, because clearing is the same act in reverse: *Scan a
 * different card* puts the step back to its reader, and a session that kept
 * the old track while losing the card would be claiming a recording it no
 * longer has a reason to play.
 */
export async function saveCard(
  id: string,
  cardId: string | null,
  trackId: string | null,
): Promise<void> {
  const { error } = await getSupabase()
    .from('sessions')
    .update({ card_id: cardId, track_id: trackId })
    .eq('id', id);
  if (error !== null) {
    throw new Error(`[musie] could not save the card: ${error.message}`);
  }
}

/**
 * STAMP THE SESSION AS HAVING PLAYED SOMETHING — 2026-10-02.
 *
 * ── WHY THE ROW HAS TO SAY THIS AT ALL ─────────────────────────────────────
 * `step` records which screen a run reached, never that anybody listened —
 * `reveal-track` has said so in its own header since E.5, and the listen
 * step's `playing`/`position` are React state that is thrown away. *Discovered
 * music* lists the recordings a person has actually met, and Ben's rule for it
 * is that only sessions where play was pressed count. Nothing in the schema
 * could express that, so this writes it.
 *
 * ── FIRST PRESS ONLY, ENFORCED IN SQL ──────────────────────────────────────
 * `.is('listened_at', null)` is the whole of the "once" — not a flag in the
 * component, which would be reset by leaving the step and coming back, and not
 * a read-then-write, which races with itself on a double tap. A second press
 * matches no row and writes nothing. The timestamp therefore means *when this
 * session first played*, which is the only reading of it that stays true.
 *
 * ── IT NEVER THROWS, AND THAT IS DELIBERATE ────────────────────────────────
 * Every other writer here throws, because every other one is saving something
 * the person is waiting on. This one is called from a play button. A rejected
 * promise would mean a thrown error inside a click handler, mid-exercise, over
 * a fact that exists so a listing screen can be tidy. The honest failure is a
 * missing row on one page, logged — not an interrupted exercise.
 */
export async function markListened(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('sessions')
    .update({ listened_at: new Date().toISOString() })
    .eq('id', id)
    .is('listened_at', null);
  if (error !== null) {
    console.warn(`[musie] could not record that the track played: ${error.message}`);
  }
}

/**
 * End a session, either way.
 *
 * `endedAt` is an INPUT rather than `now()`, for the same reason the reducer
 * takes one: the two have to agree, and a row whose timestamp came from the
 * database while the state machine used the clock is a duration nobody can
 * reproduce.
 */
export async function endSession(
  id: string,
  status: Exclude<SessionStatus, 'started'>,
  endedAt: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from('sessions')
    .update({ status, ended_at: endedAt })
    .eq('id', id);
  if (error !== null) {
    throw new Error(`[musie] could not end the session: ${error.message}`);
  }
}

/**
 * Delete one session, and its reflection with it.
 *
 * ── THE CASCADE DOES THE SECOND HALF ───────────────────────────────────────
 * `reflections.session_id` is `on delete cascade`, so this is one statement
 * and there is no orphan to clean up afterwards. Deleting the reflection
 * separately first would be two round trips with a window between them where
 * a session exists with its answer already gone.
 *
 * ── RLS IS THE BOUNDARY, AGAIN ─────────────────────────────────────────────
 * No `user_id` filter. `sessions_delete_own` is
 * `using (user_id = (select auth.uid()))`, so a row that is not yours simply
 * is not there to delete — and a client-side filter would read as the security
 * model while being a convenience.
 *
 * ── IT IS IRREVERSIBLE, AND NOTHING HERE SOFTENS THAT ──────────────────────
 * No soft delete, no `deleted_at`. A diary the user asked to forget something
 * from should forget it; a hidden row that still exists is the opposite of
 * what the privacy copy promises. The CONFIRMATION lives in the screen, which
 * is where a person can still change their mind.
 */
export async function deleteSession(id: string): Promise<void> {
  const { error } = await getSupabase().from('sessions').delete().eq('id', id);
  if (error !== null) {
    throw new Error(`[musie] could not delete the session: ${error.message}`);
  }
}

/**
 * Delete EVERY session this user has, and every reflection with them — G.2.
 *
 * ── WHY THERE IS A FILTER ON A DELETE THAT MEANS "ALL OF THEM" ─────────────
 * `.not('id', 'is', null)` is not a narrowing and is not meant to be: `id` is
 * the primary key, so it is never null and the predicate is true of every row
 * the caller can see. It is written out rather than left off for two reasons.
 *
 * A bare `.delete()` is the one call in supabase-js whose blast radius is
 * invisible at the call site — it looks like an unfinished line — and
 * supabase-js's own guidance is that a delete always carries a filter. The
 * always-true predicate is the difference between "all of them, deliberately"
 * and "somebody forgot the `.eq`".
 *
 * (Whether PostgREST would also REFUSE the unfiltered request is not claimed
 * here. Nothing in this branch has run against a database — see the report
 * and OPEN-QUESTIONS.md — and a comment asserting a refusal nobody watched
 * happen is the kind of fact that outlives its truth.)
 *
 * ── RLS IS STILL THE BOUNDARY, AND IT IS DOING MORE HERE THAN ANYWHERE ─────
 * No `user_id` filter, the same as `deleteSession` above — `sessions_delete_own`
 * is `using (user_id = (select auth.uid()))`. On a delete that names no row,
 * that policy is the ONLY thing standing between this statement and every
 * session in the table. It is worth being explicit that this is load bearing:
 * anything that weakens `sessions_delete_own` turns this function into a
 * different function, and rule 3 — never disable RLS to make something work —
 * is at its sharpest right here.
 *
 * ── IT TAKES A RUNNING SESSION TOO ─────────────────────────────────────────
 * No `status` filter, so a session that is still in progress goes with the
 * rest. That is the done-when as written — no `sessions` rows and no
 * `reflections` rows — and it is also the only answer that matches the copy:
 * "your whole diary" cannot quietly mean "all of it except the one you are in
 * the middle of". The caller is responsible for not leaving the person on
 * /session/:id/:step afterwards; its one caller — `DeleteEverything` on /diary
 * — navigates to /diary, which both re-reads the list and leaves nothing
 * pointing at a step whose row is gone.
 *
 * ── THE CASCADE DOES THE SECOND HALF ───────────────────────────────────────
 * `reflections.session_id` is `on delete cascade`, so this is one statement
 * and there are no orphans to sweep up. There is no storage half to this: D1
 * settled that nothing is ever uploaded, so there are no files to orphan.
 */
export async function deleteAllSessions(): Promise<void> {
  const { error } = await getSupabase()
    .from('sessions')
    .delete()
    .not('id', 'is', null);
  if (error !== null) {
    throw new Error(`[musie] could not delete the diary: ${error.message}`);
  }
}

/**
 * The answer.
 *
 * `mode` says HOW THE TEXT WAS PRODUCED — typed, transcribed, or read off a
 * photograph — because no file is ever attached. `body` is not null by
 * constraint, so a reflection with nothing in it is refused by the database
 * rather than stored and puzzled over later.
 *
 * `upsert` on `session_id`: the reflect step can be returned to from a later
 * step, and the second save must update the answer rather than hit
 * `reflections_one_per_session` with a duplicate. That constraint is exactly
 * what makes the upsert safe to key on.
 */
export async function saveReflection(
  sessionId: string,
  mode: 'text' | 'voice' | 'photo',
  body: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from('reflections')
    .upsert({ session_id: sessionId, mode, body }, { onConflict: 'session_id' });
  if (error !== null) {
    throw new Error(`[musie] could not save the reflection: ${error.message}`);
  }
}

/** The three the scale can produce. Mirrors `sessions_feeling_change_known`. */
export type FeelingChange = 'worse' | 'same' | 'better';

/**
 * How the session left the person, relative to how they arrived.
 *
 * A CHANGE, NOT A MOOD, which is why the values are comparisons: somebody who
 * came in low and left slightly less low answers `better`, and so does somebody
 * who came in fine. The column's own comment carries the same warning for
 * whoever queries it first.
 *
 * WRITTEN AT FINISH, NOT ON SELECTION. The scale is answered on a step that can
 * be walked back out of, and an answer saved on every press would record a mind
 * being changed as three sessions' worth of edits. It goes with the reflection,
 * in the same act.
 *
 * NULL IS NEVER WRITTEN HERE. The question is optional, and `finish()` simply
 * does not call this when nothing was chosen — a write of null would be
 * indistinguishable from the column's own default and would cost a round trip
 * to say nothing.
 */
export async function saveFeelingChange(
  sessionId: string,
  feelingChange: FeelingChange,
): Promise<void> {
  const { error } = await getSupabase()
    .from('sessions')
    .update({ feeling_change: feelingChange })
    .eq('id', sessionId);
  if (error !== null) {
    throw new Error(`[musie] could not save how the session left you: ${error.message}`);
  }
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
