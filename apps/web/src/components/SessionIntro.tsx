/**
 * Step 1 · Intro — what to have to hand before anything starts.
 *
 * The thinnest of the four, and deliberately: its whole job is to let the
 * exercise say "lay the cards out, take a breath" before the run begins. Every
 * word of that belongs to the exercise — headline and description both, as
 * `intro_md` — so when the exercise has none this is one borrowed sentence and
 * a way forward.
 *
 * BACK LEAVES THE SESSION rather than moving a step, because there is no step
 * behind this one. It goes to the library, and the session stays running — the
 * drawer will offer it back as *Continue session*, and closing it properly is
 * the control in the context box. Leaving is not abandoning. That button lives
 * in `Session.tsx` with the rest of the action row.
 */
import { Markdown } from './Markdown';
import type { Exercise } from '../lib/content';

export interface SessionIntroProps {
  exercise: Exercise;
}

/**
 * THE BODY ONLY. The action row belongs to `WizardPanel`, which owns it through
 * its `actions` slot — so `Session.tsx` renders the buttons and this renders
 * what the step has to say. A step that drew its own row would be emitting
 * `.musy-wizard__actions` from `apps/web`, which is the app reaching into a
 * component's geometry (CLAUDE.md rule 1, and 10-layout.md L7).
 */
export function SessionIntro({ exercise }: SessionIntroProps) {
  return <Markdown md={exercise.introMd} fallbackKey="session.intro.fallback" />;
}
