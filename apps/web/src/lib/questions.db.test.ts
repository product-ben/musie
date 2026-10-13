/**
 * THE ONE THING THE TYPE CHECKER CANNOT CHECK ABOUT THE QUESTION CATALOGUE.
 *
 * `src/content/questions.ts` is a repo file, and that is the whole of D1: a
 * question missing a locale, or missing a field, is a compile error, so
 * `pnpm check` catches on the machine what `missing_translations` can only
 * answer when somebody remembers to ask it.
 *
 * `QUESTION_SETS` is the exception. It is keyed by `exercises.id`, which the
 * DATABASE owns, so a typo there is not a type error — it silently means "this
 * exercise has no questions", and the listen sheet quietly falls back to the
 * old copy with nothing anywhere saying why. That is exactly the failure
 * `deck.db.test.ts` exists to prevent for the deck, and this is the same test
 * for the same reason.
 *
 * The other half is the four columns the rotation writes. They are checked
 * here rather than assumed, because `pnpm check` never touches the database
 * (CLAUDE.md 8) and a migration that was written and never applied looks
 * identical from inside the app to one that was.
 *
 * The service role because this reads the SCHEMA to compare it, not to prove
 * who may see what — `db.security.db.test.ts` owns that question, and the
 * access block below is only about the view, which is service-role-only by
 * design.
 */
import { describe, expect, it } from 'vitest';
import { QUESTION_ORDER, QUESTION_SETS } from '../content/questions';
import { anonClient, anonymousUser, serviceClient, INSUFFICIENT_PRIVILEGE } from './db.support';

const service = serviceClient();

describe('QUESTION_SETS names exercises that exist', () => {
  it('maps every key to a real row in public.exercises', async () => {
    const { data, error } = await service.from('exercises').select('id');

    expect(error).toBeNull();

    const known = new Set((data ?? []).map((row) => row.id));
    for (const exerciseId of Object.keys(QUESTION_SETS)) {
      expect(known, `QUESTION_SETS names "${exerciseId}"`).toContain(exerciseId);
    }
  });

  it('names only exercises that are built (D2)', async () => {
    /* `implemented` is the column /exercises reads to decide what can be
       started. A question set on an exercise nobody can reach would be copy
       written for a screen that does not exist; a built exercise WITHOUT one
       is fine and is what the three unbuilt ones will be when they land.

       ── AND TWO OF THEM LANDED — 2026-10-13 ──────────────────────────────
       This was `toEqual(built)`, an EQUALITY, which also forbade the second
       half of its own comment: a built exercise with no set. `sound-journey`
       and `body-scan-soundwalk` became startable on `listening-features` the
       day after this was written, with copy and audio and no question set, so
       the equality failed on precisely the case the comment calls fine.

       The rule is one-directional and always was. Whether those two should
       now JOIN the rotation is a product question, logged in
       apps/web/OPEN-QUESTIONS.md; this test must not be what answers it. */
    const { data, error } = await service
      .from('exercises')
      .select('id, implemented')
      .eq('implemented', true);

    expect(error).toBeNull();

    const built = (data ?? []).map((row) => row.id).sort();
    for (const exerciseId of Object.keys(QUESTION_SETS)) {
      expect(built, `QUESTION_SETS names "${exerciseId}"`).toContain(exerciseId);
    }
  });

  it('draws only questions the catalogue has', async () => {
    /* Pure, but it belongs beside the check above: the two together are what
       make "this exercise asks lq-03" a statement that can be trusted. */
    for (const [exerciseId, ids] of Object.entries(QUESTION_SETS)) {
      for (const id of ids) {
        expect(QUESTION_ORDER, `${exerciseId} draws ${id}`).toContain(id);
      }
    }
  });
});

describe('the sessions row can hold a question', () => {
  it('has the four columns the rotation writes', async () => {
    /* A select that names them is the cheapest possible proof that the
       migration is applied HERE — against whichever database this suite was
       pointed at, which is the point of `SUPABASE_TEST_URL` (CLAUDE.md 4). */
    const { error } = await service
      .from('sessions')
      .select('listening_question_id, listening_question, rejected_question_ids, rejected_this_round')
      .limit(1);

    expect(error).toBeNull();
  });

  it('defaults both arrays to empty, and refuses an id with no snapshot', async () => {
    /* ONE SESSION FOR TWO RULES, deliberately: `config.toml` rate-limits
       anonymous sign-ins to 30 an hour per IP and this suite already spends
       two per run, so a test per assertion would make a tight rerun loop fail
       on the sign-in rather than on the schema. */
    const { client, userId } = await anonymousUser();

    const { data: started, error: startError } = await client
      .from('sessions')
      .insert({
        user_id: userId,
        exercise_id: 'mindfulness-cards',
        status: 'started',
        step: 'listen',
      })
      .select('id, rejected_question_ids, rejected_this_round')
      .single();

    expect(startError).toBeNull();

    /* `not null default '{}'` is what lets every caller in lib/questions.ts
       spread and map without a coalesce. A nullable array here would be a null
       check in four places. */
    expect(started?.rejected_question_ids).toEqual([]);
    expect(started?.rejected_this_round).toEqual([]);

    /* `sessions_listening_question_pairs`. An id with no snapshot gives a
       diary entry that cannot name its question; a snapshot with no id gives a
       question the rotation cannot count. 23514 is check_violation, and the
       message names the constraint. */
    const { error: halfWritten } = await client
      .from('sessions')
      .update({ listening_question_id: 'lq-01' })
      .eq('id', started?.id ?? '');

    expect(halfWritten?.code).toBe('23514');

    /* Both together are accepted, which is the other half of the same rule. */
    const { error: ok } = await client
      .from('sessions')
      .update({ listening_question_id: 'lq-01', listening_question: 'Was für ein Bild?' })
      .eq('id', started?.id ?? '');

    expect(ok).toBeNull();

    await service.from('sessions').delete().eq('user_id', userId);
  });
});

describe('question_rejections is service_role only', () => {
  it('is readable by the service role', async () => {
    const { error } = await service.from('question_rejections').select('*').limit(1);

    expect(error).toBeNull();
  });

  it('is refused to anon', async () => {
    /* No policy and no grant. `security_invoker = true` means this view
       respects the caller's RLS rather than the owner's — the thing the
       Security Advisor reports as `security_definer_view` — and the grant was
       never given, so the privilege check refuses it first. */
    const { error } = await anonClient().from('question_rejections').select('*').limit(1);

    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it('is refused to a signed-in listener', async () => {
    /* The one that matters: a rejection log is not a diary, and the person who
       produced it has no screen that needs it. */
    const { client } = await anonymousUser();
    const { error } = await client.from('question_rejections').select('*').limit(1);

    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });
});
