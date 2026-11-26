/**
 * `src/lib/reveal.ts` without the `reveal-track` Edge Function: the piece's
 * name, as the function would answer it once the step is reached.
 */
import type { RevealOutcome } from '../../../../src/lib/reveal';
import { TRACK } from '../fixture';

export * from '../../../../src/lib/reveal';

export async function revealTrack(_sessionId: string): Promise<RevealOutcome> {
  return { kind: 'revealed', track: { ...TRACK } };
}
