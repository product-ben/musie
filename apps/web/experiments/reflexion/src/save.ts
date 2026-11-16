/**
 * STUB — owned by the "Speichern & PostHog" agent. Keep the signature.
 *
 * Inserts ONE row into `public.experiment_responses` with the anon key. No
 * Supabase auth of any kind, no `.select()` after the insert (anon has no
 * select grant). Throws on failure so the caller can keep the text and offer
 * a retry.
 */
import type { Locale } from '../../../src/i18n';
import type { Participant } from './context';
import type { Slug } from './config';

export interface ReflectionAnswer {
  question_key: string;
  question_text: string;
  answer: string;
}

export async function saveResponse(_input: {
  participant: Participant;
  exerciseKey: Slug;
  language: Locale;
  answers: ReflectionAnswer[];
}): Promise<void> {
  throw new Error('saveResponse: not implemented yet');
}
