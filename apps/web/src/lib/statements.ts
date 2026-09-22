/**
 * A spoken reflection, written as it is spoken — F.6.
 *
 * ── WHY ANYTHING IS WRITTEN BEFORE THE PERSON FINISHES ────────────────────
 * Not the editing. A statement is finalised the moment somebody stops
 * speaking, and a reflection can run for minutes — so a tab closed, a socket
 * dropped or a phone that rang loses everything if the answer is only
 * assembled at the end. Rows written as they arrive lose the last sentence at
 * worst.
 *
 * ── ONE CALL MAKES THE WHOLE LIST TRUE ────────────────────────────────────
 * `@musie/voice` hands over the entire list after any change rather than the
 * one statement that moved, so this upserts every row and deletes what is no
 * longer in it. That is idempotent by construction rather than by care, which
 * is F.6's "it fires on four paths, so it must be idempotent" — and it is also
 * the only shape that can express a MERGE, which ends one statement, and a
 * MOVE, which changes no text at all and would otherwise never be written.
 *
 * ── AND `reflections.body` STAYS THE ANSWER ───────────────────────────────
 * `body` is `not null` and is what the diary, the end-to-end walks and D1's
 * own check all read. It is assembled here from the statements on every write,
 * so it is never stale and nothing downstream has to learn about a second
 * table. The rows are the editing surface; the body is the answer.
 *
 * D1 HOLDS. This is text, exactly as a typed reflection is text. No audio is
 * stored, here or anywhere.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Sentence } from '@musie/voice';
import { getSupabase } from './supabase';
import type { Database } from './database.types';

/** The answer, as one piece of prose. */
export function joinStatements(statements: { text: string }[]): string {
  return statements.map((s) => s.text.trim()).filter(Boolean).join(' ');
}

/**
 * Make the database agree with this list.
 *
 * Returns the reflection's id, which the caller does not need and a test does.
 * Throws on failure: this runs behind the screen while somebody is speaking,
 * and a write that quietly does nothing is the failure that gets discovered a
 * week later when a diary entry is empty.
 */
export async function saveStatements(
  sessionId: string,
  statements: Sentence[],
  /**
   * THE CLIENT IS AN ARGUMENT, AND THAT IS NOT DECORATION.
   *
   * The app passes nothing and gets the module singleton, as everything else
   * here does. `pnpm test:db` passes a client signed in as a specific
   * anonymous user — which is the only way this function can be tested
   * against the policies that actually guard it. Without it the suite would
   * exercise the SQL and not the security, which for a table reached through
   * two joins is most of the risk.
   */
  db: SupabaseClient<Database> = getSupabase(),
): Promise<string | null> {
  const body = joinStatements(statements);

  /* NOTHING SPOKEN YET, so there is nothing to write and — more importantly —
     no reflection to create. `body` is `not null`, so an empty answer cannot
     be a row, which is D1's check doing its job rather than an obstacle. */
  if (body === '') return null;

  /* THE REFLECTION FIRST, because a statement needs one to point at. Upserted
     on `session_id`, which is the unique this table already carries, so a
     second call is an update rather than a duplicate. */
  const { data: reflection, error: reflectionError } = await db
    .from('reflections')
    .upsert({ session_id: sessionId, mode: 'voice', body }, { onConflict: 'session_id' })
    .select('id')
    .single();

  if (reflectionError !== null || reflection === null) {
    throw new Error(
      `[musie] could not save the spoken reflection: ${reflectionError?.message ?? 'no row'}`,
    );
  }

  /* THE ROWS, UNDER THE IDS THE BROWSER ALREADY GAVE THEM. That is what makes
     this idempotent: the primary key is the statement's own id, so writing the
     same statement twice is one row updated rather than two rows stored. */
  const rows = statements
    .filter((s) => s.text.trim() !== '')
    .map((s, index) => ({
      id: s.id,
      reflection_id: reflection.id,
      text: s.text.trim(),
      position: index,
      language: s.language,
    }));

  if (rows.length > 0) {
    const { error } = await db.from('reflection_statements').upsert(rows, { onConflict: 'id' });
    if (error !== null) {
      throw new Error(`[musie] could not save the statements: ${error.message}`);
    }
  }

  /* AND WHAT IS NO LONGER IN THE LIST IS GONE. Merging ends a statement and
     deleting removes one; without this they would survive in the database and
     reappear the next time anything read the rows rather than the body.
     Scoped to this reflection, and RLS is the boundary underneath that. */
  const keep = rows.map((r) => r.id);
  const stale = db.from('reflection_statements').delete().eq('reflection_id', reflection.id);
  const { error: deleteError } = keep.length > 0
    ? await stale.not('id', 'in', `(${keep.map((id) => `"${id}"`).join(',')})`)
    : await stale;

  if (deleteError !== null) {
    throw new Error(`[musie] could not clear removed statements: ${deleteError.message}`);
  }

  return reflection.id;
}
