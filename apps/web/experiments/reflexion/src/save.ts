/**
 * Inserts ONE row into `public.experiment_responses` with the anon key
 * (supabase/migrations/20261116100000_experiment_responses.sql — the rule-10
 * exception Ben granted in the brief, 2026-11-16).
 *
 * No Supabase auth of any kind: a session-less anon client (below). The
 * policy also admits `authenticated`, but this client never sends a session.
 *
 * NO `.select()` AFTER THE INSERT. anon holds an insert grant and nothing
 * else, so asking for the row back turns a 201 into a 401 — see
 * lib/betaSignup.ts, same table shape, same trap.
 *
 * Throws on failure so the caller can keep the text and offer a retry.
 */
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Locale } from '../../../src/i18n';
import type { Participant } from './context';
import { EXPERIMENT_ID, QUESTION_SET_VERSION, type Slug } from './config';

/* Its OWN client, not the app's `getSupabase()`: in this build that module is
   shimmed to throw (src/shims/lib__supabase.ts), so nothing in the mounted
   stepper can reach the database by accident. This client is anon and
   session-less on purpose — it never reads or stores an auth session, so the
   insert always goes as `anon`, even for someone signed in on musie.org. */
let client: SupabaseClient | null = null;
function anonClient(): SupabaseClient {
  if (client !== null) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (typeof url !== 'string' || typeof anonKey !== 'string' || url === '' || anonKey === '') {
    throw new Error('saveResponse: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing');
  }
  client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

export interface ReflectionAnswer {
  question_key: string;
  question_text: string;
  answer: string;
}

export async function saveResponse(input: {
  participant: Participant;
  exerciseKey: Slug;
  language: Locale;
  answers: ReflectionAnswer[];
}): Promise<void> {
  const { error } = await anonClient()
    .from('experiment_responses')
    .insert({
      experiment_id: EXPERIMENT_ID,
      participant_id: input.participant.id,
      name: input.participant.name.trim(),
      exercise_key: input.exerciseKey,
      language: input.language,
      question_set_version: QUESTION_SET_VERSION,
      answers: input.answers.map(({ question_key, question_text, answer }) => ({
        question_key,
        question_text,
        answer,
      })),
    });
  if (error !== null) {
    throw new Error(`saveResponse: ${error.code ?? ''} ${error.message}`.trim());
  }
}
