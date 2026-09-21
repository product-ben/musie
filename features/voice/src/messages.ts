/**
 * What this package can say, as CODES rather than as sentences.
 *
 * ── WHY THIS FILE EXISTS, AND WHY IT IS THE BIGGEST CHANGE F.0 MADE ────────
 * The proof-of-concept wrote its user-visible text where the failure happened:
 * "Microphone access was denied. Allow it in your browser's site settings and
 * try again.", "Rate limit reached — this sentence was skipped.", "Statements
 * combined". English prose, in the core, handed straight to a banner.
 *
 * That cannot come across as it stands. CLAUDE.md 6 and 7 are explicit: every
 * user-visible string in the app comes from `apps/web/src/i18n`, in English AND
 * German, and `MessageKey` is `keyof typeof en` so a key that does not exist is
 * a typecheck error. A sentence baked into a package below the app can satisfy
 * neither half — it has no German, and it is not reachable from the catalogue.
 *
 * So the core reports WHAT HAPPENED and the app decides what to SAY. The
 * mapping is `apps/web/src/lib/voiceMessages.ts`, a
 * `Record<VoiceMessageCode, MessageKey>`, which makes the two halves
 * exhaustive against each other at compile time: a code added here with no
 * catalogue entry fails `pnpm check`, in both languages, which is exactly the
 * property the i18n layer already has and the POC's prose did not.
 *
 * The second reason is that the POC's strings were written for a demo audience
 * that knew what an API key was. "Add credits at
 * platform.openai.com/settings/organization/billing" is operator copy; the
 * person holding the phone has no OpenAI account and no way to act on it. What
 * they need to be told is that Musie cannot listen right now — which is a
 * product decision, made in the catalogue, next to every other thing the app
 * says.
 */

/**
 * Everything that can go wrong loudly enough to reach a person.
 *
 * Grouped by where it comes from, because the three groups fail differently:
 * the microphone ones are the browser's and are usually the user's to fix, the
 * connection ones are ours, and the provider ones are OpenAI's.
 */
export type VoiceMessageCode =
  /* The browser refused the microphone. */
  | 'micDenied'
  | 'micNotFound'
  | 'micUnavailable'
  /* getUserMedia worked and the capture graph still did not start. */
  | 'recorderFailed'
  /* The socket never opened, or dropped mid-session. */
  | 'connectionFailed'
  | 'connectionClosed'
  | 'connectionRejected'
  /* OpenAI answered, and what it said was a refusal. */
  | 'segmentationRejected'
  | 'rateLimited'
  | 'noCredits'
  | 'providerError';

/**
 * One thing that went wrong.
 *
 * `detail` is the provider's own words, untranslated and NOT for display: it
 * is what makes an unrecognised failure diagnosable in a log instead of
 * arriving as a shrug. Whether to surface it is the app's call, and the answer
 * for a mindfulness product is almost certainly no.
 */
export type VoiceMessage = {
  code: VoiceMessageCode;
  detail?: string;
};

/**
 * Why an undo is on offer.
 *
 * Combining and deleting destroy text, so both snapshot the list first.
 * Editing does not — it has an explicit Discard — so there is no code for it.
 */
export type UndoReason = 'combined' | 'deleted';
