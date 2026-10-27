/**
 * What a step says when the config says nothing — the words built into the app.
 *
 * ── WHY THE BUILDER HAS TO SHOW THESE ─────────────────────────────────────
 * Ben, 2026-10-27, looking at the digital variant: *"I think you didn't
 * expose all the text for the 'no physical cards available' variant (incl.
 * button labels)."* He was right, and twice over:
 *
 *   1. `select` and `view` have NO content columns. Every word they show is a
 *      `MessageKey`, so the builder drew two empty fields and an explanation.
 *      Empty fields do not tell a therapist what the screen currently says.
 *   2. NO step's button label was editable anywhere. `StepCopy.continueLabel`
 *      has been in the schema since the first commit and the editor never
 *      drew a field for it — so every forward action in the app was invisible
 *      to the person whose job is the wording.
 *
 * ── SHOWN AS A PLACEHOLDER, NOT AS A VALUE ────────────────────────────────
 * Seeding the config with these strings would make every exercise override
 * the chrome with the identical text, and `continueLabel`'s whole meaning is
 * *absent falls back to the app's own word*. A placeholder keeps that: she
 * sees what it says now, an empty field still means "leave it alone", and
 * typing is a proposal to move that string out of chrome.
 *
 * ── A MAP, SO A NEW STEP IS A COMPILE ERROR ───────────────────────────────
 * `Record<StepId, …>`, like `STEPS` and `STEP_FEATURES`. A seventh step has
 * to answer here, where the answer is known.
 *
 * Pure: returns KEYS, never resolved text, so this module needs no locale and
 * no `useT`. The caller translates.
 */
import type { MessageKey } from '../i18n/en';
import type { StepId } from '../routeHandle';
import type { RunMode } from './exerciseConfig';

export interface ChromeDefault {
  key: MessageKey;
  /** For a key with a slot — `session.intro.deal` quotes the card count. */
  slots?: Record<string, string>;
}

export interface ChromeCopy {
  headline?: ChromeDefault;
  bodyMd?: ChromeDefault;
  /** The forward action. Every step has one. */
  continueLabel?: ChromeDefault;
  /** The other button, where the step has two. */
  secondaryLabel?: ChromeDefault;
}

export interface ChromeShape {
  mode: RunMode;
  /** `exercises.cards_dealt` — it decides the intro's forward label. */
  cardsDealt: number | null;
}

const CHROME: Record<StepId, (shape: ChromeShape) => ChromeCopy> = {
  /* The intro's forward action is the one that changes with the mode: on
     paper it is just a way on, on screen it deals the hand. */
  intro: ({ mode, cardsDealt }) => ({
    continueLabel: mode === 'analogue'
      ? { key: 'common.continue' }
      : (cardsDealt === 1
        ? { key: 'session.intro.drawRandom' }
        : { key: 'session.intro.deal', slots: { count: String(cardsDealt ?? 0) } }),
  }),

  scan: () => ({
    continueLabel: { key: 'common.continue' },
    secondaryLabel: { key: 'session.scan.again' },
  }),

  /* THE TWO WITH NO CONTENT COLUMNS AT ALL. `session.view.headline` is *Was
     siehst du in dem Bild?* and `session.select.headline` is *Wähle eine
     Karte aus* — which is also the `## ` heading of `scan_md`, the same
     sentence in two systems. */
  view: () => ({
    headline: { key: 'session.view.headline' },
    bodyMd: { key: 'session.view.lead' },
    continueLabel: { key: 'common.continue' },
    secondaryLabel: { key: 'session.view.expand' },
  }),

  select: () => ({
    headline: { key: 'session.select.headline' },
    bodyMd: { key: 'session.select.lead' },
    continueLabel: { key: 'common.continue' },
    secondaryLabel: { key: 'session.select.lookAgain' },
  }),

  /* The listen step's forward action is two words depending on the gate, and
     the locked one is what somebody arriving sees first. */
  listen: () => ({
    continueLabel: { key: 'session.listen.start' },
    secondaryLabel: { key: 'session.listen.startLocked' },
  }),

  reflect: () => ({
    continueLabel: { key: 'reflect.save' },
  }),
};

export function chromeCopyFor(step: StepId, shape: ChromeShape): ChromeCopy {
  return CHROME[step](shape);
}
