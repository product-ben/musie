/**
 * PostHog, and the four things that make it allowed to run here.
 *
 * ── 1 · IT STARTS AFTER THE ANSWER, NEVER BEFORE ──────────────────────────
 * `init` happens inside `initAnalytics`, which is called by
 * components/AnalyticsProvider.tsx once the profile has been read and the
 * consent is known. Nothing before that: no key, no pageview, no exception.
 *
 * It replaces an `init` at module scope, imported from the top of `main.tsx`
 * — which ran above the public-path branch, so it also started on /beta, on
 * the sign-in gate and on the two legal pages, before anybody had been asked
 * anything. `analyticsReady()` is the guard every call site reads, and it is
 * false until this module has actually initialised.
 *
 * ── 2 · REFUSING IS AN ANSWER, AND IT IS COOKIELESS ───────────────────────
 * 'refused' still starts PostHog, in `cookieless_mode: 'always'`: nothing is
 * written to the device, identity is a rotating hash computed on PostHog's
 * servers, and there is no session replay, no `identify()`, no surveys and no
 * persistent feature flags. Counts still land, which is the whole reason it is
 * not simply switched off. Ben's call, 2026-10-20 — LEGAL-PAGES.md §4.4.
 *
 * The mode is decided AT INIT rather than reconfigured afterwards, because the
 * consent is already known by the time this runs. One init, one shape, nothing
 * to get wrong in a transition.
 *
 * ── 3 · NO EVENT CARRIES CONTENT ──────────────────────────────────────────
 * The rule is `before_send` below, in one place, rather than a review of every
 * call site forever. The screens here are somebody's diary: a transcript, a
 * reflection, a feeling word and an email address are all things PostHog must
 * never be told, and a wizard that instruments an app cannot know which of its
 * strings those are. One did exactly that on 2026-10-20 — see §4.5.1.
 *
 * ── 4 · THE REPLAY IS MASKED BEFORE IT IS RECORDED ────────────────────────
 * `maskAllInputs` and `maskTextSelector: '*'` mask every input and every text
 * node, and network capture is dropped entirely — a Supabase response body is
 * a diary row, and a diary row in a body is a diary entry in the replay. What
 * is left is shapes, timings and taps, which is what "where did they get
 * stuck" needs and all that is defensible here.
 *
 * ── THE HOST DEFAULTS TO THE EU ───────────────────────────────────────────
 * Frankfurt, the same region as the Supabase project. The US cloud is a
 * third-country transfer this app has no reason to make, and a default that
 * has to be overridden to get it wrong is better than a variable somebody
 * fills in from a dashboard's first copy button.
 */
import posthog from 'posthog-js';
import type { Consent } from './consents';

const EU_CLOUD = 'https://eu.i.posthog.com';

const key = import.meta.env.VITE_POSTHOG_KEY;
const host = import.meta.env.VITE_POSTHOG_HOST ?? EU_CLOUD;

/**
 * Property names that may never leave this app, whatever sets them.
 *
 * `$ai_*` are PostHog's LLM-observability properties: the generated
 * integration sent `$ai_output_choices` with the transcription's text in it.
 * `email` is here because `identify` traits and `$set` both travel as
 * properties, and the user id is the only identifier PostHog needs.
 *
 * A DENYLIST IS THE WRONG SHAPE IN GENERAL and the right one here: the events
 * this app sends are hand-written and few, so the realistic failure is not an
 * unknown property we forgot to allow — it is a known property that an
 * integration, an upgrade or a wizard adds back without anybody reading the
 * diff. This is the net under that.
 */
const NEVER_SEND = [
  '$ai_input',
  '$ai_input_state',
  '$ai_output',
  '$ai_output_choices',
  '$ai_output_state',
  'email',
  'transcript',
];

let started = false;

/**
 * Is PostHog initialised — that is, has somebody answered the card?
 *
 * Every capture site reads this. It is a FUNCTION rather than the constant it
 * replaced, because the answer changes within a page load: it is false while
 * the card is up and true the moment it is answered, and a constant captured
 * at module scope could only ever mean "the environment variables are set".
 */
export function analyticsReady(): boolean {
  return started;
}

/** Are the variables even there? Dev without them is a normal state. */
export function analyticsConfigured(): boolean {
  return typeof key === 'string' && key !== '';
}

/**
 * Start PostHog for a person who has answered.
 *
 * Idempotent: React mounts twice in StrictMode, and `init` twice on one key
 * leaves two instances racing over the same storage.
 *
 * NOT A THROW when the variables are missing, and that is deliberate. The
 * generated version threw at module import in dev, which is the exact failure
 * lib/supabase.ts refuses by design — "an import-time throw takes the whole
 * app down to a blank page, which hides the reason". An app with no analytics
 * is a working app; an app that will not paint is not.
 */
export function initAnalytics(consent: Consent, userId: string): void {
  if (started) return;
  if (!analyticsConfigured()) {
    if (import.meta.env.DEV) {
      console.info(
        '[musie] VITE_POSTHOG_KEY is not set, so no analytics in this session. '
        + 'That is a normal local setup; apps/web/.env.example says where the key goes.',
      );
    }
    return;
  }

  const granted = consent === 'granted';

  posthog.init(key as string, {
    api_host: host,

    /* EVERY FLAG IS NAMED, and `defaults: '<date>'` is deliberately not used.
       A dated bundle is a promise about behaviour that changes the day
       somebody bumps the date — which is rule 7's objection to a default,
       applied to a third party. */
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: true,
    /* An identified person only when there is an identity to attach, which is
       never in cookieless mode. */
    person_profiles: granted ? 'identified_only' : 'never',

    /* THE SWITCH. 'always' writes nothing to the device. */
    cookieless_mode: granted ? undefined : 'always',

    /* Replay is the thing consent was asked for, so it is the thing a refusal
       takes away. Stated here as well as implied by cookieless mode, because
       one flag saying it is a flag somebody can change. */
    disable_session_recording: !granted,
    session_recording: {
      maskAllInputs: true,
      /* Every text node, not a selector list somebody has to maintain as
         screens arrive. The replay is shapes and timings. */
      maskTextSelector: '*',
      /* Nothing at all from the network. A response body here is a diary. */
      maskCapturedNetworkRequestFn: () => null,
    },

    capture_exceptions: {
      capture_unhandled_errors: granted,
      capture_unhandled_rejections: granted,
      /* Our own console.error lines carry failure reasons; an exception's
         message can carry anything that was in scope. */
      capture_console_errors: false,
    },

    before_send: (event) => {
      if (event === null) return null;
      const properties = event.properties;
      if (properties !== undefined) {
        for (const name of NEVER_SEND) {
          if (name in properties) delete properties[name];
          const set: unknown = properties.$set;
          if (set !== null && typeof set === 'object' && name in set) {
            delete (set as Record<string, unknown>)[name];
          }
        }
      }
      return event;
    },
  });

  /* IDENTIFY ONLY WHEN GRANTED, and with the id alone.
     In cookieless mode a persistent distinct id is exactly what is being
     avoided, so identifying there would undo the mode. And even with consent
     PostHog is told WHICH account, never WHOSE: `userId` is already stable
     across devices and refreshes, and the email address adds nothing it needs.
     The generated version passed `{ email }` — LEGAL-PAGES.md §4.5.1. */
  if (granted) posthog.identify(userId);

  started = true;
}

export { posthog };
