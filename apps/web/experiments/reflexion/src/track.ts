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
 * ── NO CONTENT ────────────────────────────────────────────────────────────
 * Never a name or a reflection text: `identify` gets the participant UUID,
 * events carry lengths, counts and times. `before_send` drops `name`,
 * `answer`, `answers` and `text` as a net under that. The survey answers are
 * the single exception (they are PostHog's own survey contract).
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

const NEVER_SEND = ['name', 'answer', 'answers', 'text'];

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
    for (const bag of ['$set', '$set_once']) {
      const set: unknown = properties[bag];
      if (set !== null && typeof set === 'object' && name in set) {
        delete (set as Record<string, unknown>)[name];
      }
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
      ph.identify(participant.id);
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

/** Thank-you state is on screen. */
export function completed(): void {
  if (!firstTime('completed')) return;
  track('exp_completed', { total_visible_ms: totalVisibleMs(), total_wall_ms: totalWallMs() });
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
  track('survey sent', properties);
}
