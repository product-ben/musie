/**
 * PostHog for the experiment „Reflexion 01“ — and only for it.
 *
 * Its own `posthog.init`, never the app's `initAnalytics` (lib/posthog.ts):
 * the app's module stays un-started here, so every `analyticsReady()`-guarded
 * capture inside the mounted stepper stays silent and the app's events never
 * mix into the experiment's. Same key and host variables as the app.
 *
 * ── CONSENT ───────────────────────────────────────────────────────────────
 * Nothing reaches PostHog before the visitor presses start in the name modal
 * (`participantStarted`) — that is the init. What happens before it (the
 * landing, a language switch) is QUEUED in memory and sent on consent with its
 * original `timestamp`. A visitor who never presses start therefore sends
 * nothing at all, which also means a true bounce is not measurable.
 *
 * ── NO REFLECTION TEXT; THE NAME ON THE PERSON (Ben, 2026-11-18) ──────────
 * `identify` gets the participant UUID and `$set: { name }`, so the dashboard
 * can say WHO took part and who finished. That is the one change to the
 * brief's "never a name"; the consent line in the modal says so. A name is
 * never an EVENT property: `before_send` drops `name`, `answer`, `answers`
 * and `text` from every event, and `answer`/`answers`/`text` from `$set` too.
 * A reflection text never reaches PostHog. The survey answers are the single
 * exception (they are PostHog's own survey contract).
 */
import posthog from 'posthog-js';
import type { Participant } from './context';
import {
  EXPERIMENT_ID,
  QUESTION_SET_VERSION,
  SURVEY,
  type RecommendChoice,
} from './config';
import { RUN } from './run';

const EU_CLOUD = 'https://eu.i.posthog.com';
const key = import.meta.env.VITE_POSTHOG_KEY;
const host = import.meta.env.VITE_POSTHOG_HOST ?? EU_CLOUD;

/** Never an event property. */
const NEVER_SEND = ['name', 'answer', 'answers', 'text'];
/** Never a person property. The name is allowed there, on purpose. */
const NEVER_SET = ['answer', 'answers', 'text'];

/** PostHog's `current_iteration` of the survey: null, it is a draft never iterated. */
const SURVEY_ITERATION = null;

let started = false;
let language: string | null = null;

interface Pending {
  event: string;
  properties?: Record<string, unknown>;
  timestamp: Date;
}
const pending: Pending[] = [];
const MAX_PENDING = 20;

const once = new Set<string>();
function firstTime(name: string): boolean {
  if (once.has(name)) return false;
  once.add(name);
  return true;
}

function currentLanguage(): string {
  if (language !== null) return language;
  if (typeof document !== 'undefined' && document.documentElement.lang) {
    return document.documentElement.lang;
  }
  return 'de';
}

// ── Visible time ──────────────────────────────────────────────────────────
// From RUN.loadedAt, paused while the tab is hidden.
let visibleMs = 0;
let visibleSince: number | null =
  typeof document === 'undefined' || document.visibilityState === 'visible' ? RUN.loadedAt : null;

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    const now = performance.now();
    if (document.visibilityState === 'hidden') {
      if (visibleSince !== null) visibleMs += now - visibleSince;
      visibleSince = null;
    } else if (visibleSince === null) {
      visibleSince = now;
    }
  });
}

function totalVisibleMs(): number {
  const running = visibleSince === null ? 0 : performance.now() - visibleSince;
  return Math.round(visibleMs + running);
}

function totalWallMs(): number {
  return Math.round(performance.now() - RUN.loadedAt);
}

// ── Init ──────────────────────────────────────────────────────────────────

function stripContent(properties: Record<string, unknown> | undefined): void {
  if (properties === undefined) return;
  for (const name of NEVER_SEND) {
    if (name in properties) delete properties[name];
  }
  for (const bag of ['$set', '$set_once']) {
    const set: unknown = properties[bag];
    if (set === null || typeof set !== 'object') continue;
    for (const name of NEVER_SET) {
      if (name in set) delete (set as Record<string, unknown>)[name];
    }
  }
}

function start(participant: Participant): boolean {
  if (started) return true;
  if (typeof key !== 'string' || key === '') {
    if (import.meta.env.DEV) {
      console.info('[reflexion] VITE_POSTHOG_KEY is not set, so no analytics in this run.');
    }
    return false;
  }

  posthog.init(key, {
    api_host: host,
    person_profiles: 'identified_only',
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: false,
    /* We render our own survey and send its events by hand. */
    disable_surveys: true,
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true,
      /* The Supabase insert's body is the reflection itself. */
      maskCapturedNetworkRequestFn: () => null,
    },
    before_send: (event) => {
      if (event === null) return null;
      stripContent(event.properties as Record<string, unknown> | undefined);
      return event;
    },
    /* Runs before the initial $pageview, so the pageview is already the
       identified participant and carries the super properties. */
    loaded: (ph) => {
      ph.identify(participant.id, { name: participant.name });
      ph.register({
        experiment_id: EXPERIMENT_ID,
        exercise_key: RUN.exercise?.exercise_key ?? null,
        language: currentLanguage(),
        question_set_version: QUESTION_SET_VERSION,
        is_internal: RUN.internal,
      });
    },
  });

  started = true;
  for (const item of pending.splice(0)) {
    posthog.capture(item.event, item.properties, { timestamp: item.timestamp });
  }
  return true;
}

// ── The contract other files call ─────────────────────────────────────────

/** Link opened, modal visible. Queued until consent (see header). */
export function landingViewed(): void {
  if (!firstTime('landing')) return;
  track('exp_landing_viewed');
}

/** Name submitted = consent given. Init PostHog, identify, register super properties. */
export function participantStarted(participant: Participant, returning: boolean): void {
  if (!firstTime('participant_started')) return;
  if (!start(participant)) return;
  track('exp_participant_started', { returning_participant: returning });
}

export function languageChanged(from: string, to: string, stepKey: string): void {
  language = to;
  if (started) posthog.register({ language: to });
  track('exp_language_changed', { from, to, step_key: stepKey });
}

/** Generic event through the experiment's single entry point. Queued before consent. */
export function track(event: string, properties?: Record<string, unknown>): void {
  if (started) {
    posthog.capture(event, properties);
    return;
  }
  if (pending.length < MAX_PENDING) {
    pending.push({ event, properties, timestamp: new Date() });
  }
}

/**
 * A step of the run is on screen (the memory router's location, App.tsx).
 * `reflect` reached is what the dashboard calls FINISHED (Ben, 2026-11-18).
 * Once per step and run: a trip back and forth again is not a second view.
 */
export function stepViewed(stepKey: string, stepIndex: number, stepCount: number): void {
  if (!firstTime(`step:${stepKey}`)) return;
  track('exp_step_viewed', { step_key: stepKey, step_index: stepIndex, step_count: stepCount });
}

/** The listen step's audio started playing — first time in this run only. */
export function audioStarted(): void {
  if (!firstTime('audio_started')) return;
  track('exp_audio_started', { visible_ms: totalVisibleMs() });
}

/** The listen step's audio played to its end — first time in this run only. */
export function audioCompleted(): void {
  if (!firstTime('audio_completed')) return;
  track('exp_audio_completed', { visible_ms: totalVisibleMs() });
}

/** Harfe: the play step was left forward, with how long the harp was played.
    The harp has no track; this is its "played to the end". */
export function playFinished(playSeconds: number, playMode: string): void {
  if (!firstTime('play_finished')) return;
  track('exp_play_finished', { play_seconds: Math.round(playSeconds), play_mode: playMode });
}

/** Thank-you state is on screen. */
export function completed(): void {
  if (!firstTime('completed')) return;
  const properties = { total_visible_ms: totalVisibleMs(), total_wall_ms: totalWallMs() };
  /* Instantly too: completion is the number the experiment is judged by. */
  if (started) {
    posthog.capture('exp_completed', properties, { send_instantly: true });
    return;
  }
  track('exp_completed', properties);
}

/** Something failed that the visitor saw (or should have). Never the payload. */
export function error(context: string, message: string): void {
  track('exp_error', { context, message: message.slice(0, 300) });
}

export function surveyShown(): void {
  if (!firstTime('survey_shown')) return;
  track('survey shown', {
    $survey_id: SURVEY.id,
    $survey_iteration: SURVEY_ITERATION,
  });
}

export function surveySent(
  answers: { recommend?: RecommendChoice; comment?: string },
  submissionId: string,
): void {
  if (!firstTime(`survey_sent:${submissionId}`)) return;
  const properties: Record<string, unknown> = {
    $survey_id: SURVEY.id,
    $survey_iteration: SURVEY_ITERATION,
    $survey_submission_id: submissionId,
    $survey_completed: true,
    $survey_questions: [
      { id: SURVEY.recommend.id, question: SURVEY.recommend.question },
      { id: SURVEY.comment.id, question: SURVEY.comment.question },
    ],
  };
  if (answers.recommend !== undefined) {
    properties[`$survey_response_${SURVEY.recommend.id}`] = answers.recommend;
  }
  const comment = answers.comment?.trim();
  if (comment) {
    properties[`$survey_response_${SURVEY.comment.id}`] = comment;
  }
  /* Sent at once, not with the next batch: the person may close the tab right
     after pressing send, and a batch still waiting would go with it. (Seen in
     a test run on 2026-11-16: `survey shown` arrived, `survey sent` did not.) */
  if (started) {
    posthog.capture('survey sent', properties, { send_instantly: true });
    return;
  }
  track('survey sent', properties);
}
