/**
 * `src/lib/mixer.ts`: the REAL `useMix`, with two of its callbacks also
 * reported to PostHog — the first play, and the first time the track plays
 * to its end. Everything the listen step passes is still called, unchanged.
 *
 * Here and not on `document`: the mixer's elements are `new Audio()`, never
 * in the DOM, so a capturing listener on the page would hear nothing.
 */
import { useMix as realUseMix } from '../../../../src/lib/mixer';
import type { Mix, MixOptions } from '../../../../src/lib/mixer';
import { audioCompleted, audioStarted } from '../track';

export * from '../../../../src/lib/mixer';

export function useMix(options: MixOptions): Mix {
  return realUseMix({
    ...options,
    onPlay: () => {
      audioStarted();
      options.onPlay?.();
    },
    onEnded: () => {
      audioCompleted();
      options.onEnded?.();
    },
  });
}
