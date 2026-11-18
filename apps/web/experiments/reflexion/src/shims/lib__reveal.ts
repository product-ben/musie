/**
 * `src/lib/reveal.ts` without the `reveal-track` Edge Function: the same gate
 * (step must be past listening) and the same answers, read from the in-memory
 * row and the configured track names.
 */
import type { RevealOutcome } from '../../../../src/lib/reveal';
import * as store from '../data/store';

export * from '../../../../src/lib/reveal';

const STEPS_PAST_LISTENING = ['listen', 'reflect'];

export async function revealTrack(sessionId: string): Promise<RevealOutcome> {
  const row = store.readRow(sessionId);
  if (row === null) return { kind: 'failed' };
  if (!STEPS_PAST_LISTENING.includes(row.step)) return { kind: 'tooEarly' };
  if (row.trackId === null) return { kind: 'silent' };
  const named = store.REVEALS[row.trackId];
  if (named === undefined) return { kind: 'silent' };
  return store.tick({ kind: 'revealed', track: { id: row.trackId, ...named } });
}
