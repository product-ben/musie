/**
 * The steps each link's run has, without waiting for the exercise row — for
 * tracking (App.tsx) and as the reflect step's fallback (ReflectionStep.tsx).
 * Freie Bahn is always the digital run with one card dealt here.
 */
import { stepsForRun } from '../../../src/lib/exerciseKind';
import type { ExerciseKind } from '../../../src/lib/exerciseKind';
import type { StepId } from '../../../src/routeHandle';
import type { Slug } from './config';

export const RUN_SHAPE: Record<Slug, { kind: ExerciseKind; cardsDealt: number | null }> = {
  harfe: { kind: 'instruments', cardsDealt: null },
  'body-scan': { kind: 'listening_only', cardsDealt: null },
  'freie-bahn': { kind: 'card_based', cardsDealt: 1 },
};

export function runSteps(kind: ExerciseKind, cardsDealt: number | null): StepId[] {
  return [...stepsForRun(kind, { digital: kind === 'card_based', cardsDealt })];
}
