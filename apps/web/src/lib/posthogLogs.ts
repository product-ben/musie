import { analyticsReady, posthog } from './posthog';

/**
 * The only application logger exported to PostHog. Keep its records limited to
 * the explicit, non-PII lifecycle lines below rather than forwarding console
 * output or existing application logs.
 */
export const posthogLog = {
  onboardingCompleted() {
    if (analyticsReady()) posthog.logger.info('onboarding completed');
  },

  sessionStarted(exerciseKind: string) {
    if (analyticsReady()) {
      posthog.logger.info('session started', { exercise_kind: exerciseKind });
    }
  },

  sessionCompleted(exerciseKind: string) {
    if (analyticsReady()) {
      posthog.logger.info('session completed', { exercise_kind: exerciseKind });
    }
  },
};
