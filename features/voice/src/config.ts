/**
 * Every tunable value lives here. Change these, not the code below.
 *
 * ── WHAT WAS LEFT BEHIND IN THE PROOF-OF-CONCEPT ───────────────────────────
 * The demo's copy of this file also held the wizard's option lists —
 * MODEL_OPTIONS, SEGMENTATION_OPTIONS, LANGUAGE_OPTIONS — and a `label` and
 * `note` on every model, all of them English sentences written to be rendered
 * in a settings panel. None of them came across. They are user-visible strings,
 * and a user-visible string in this package could never satisfy the app's rule
 * that every one of them comes from `apps/web/src/i18n` in both languages
 * (CLAUDE.md 6 and 7). The facts the code actually reads — whether a model has
 * server-side turn detection, which language field it accepts — are not copy,
 * and those stayed.
 */

/** Transcription sessions use the `intent=transcription` endpoint. */
export const REALTIME_URL = 'wss://api.openai.com/v1/realtime?intent=transcription';

/**
 * The transcription models differ in *when* text arrives, not just in quality,
 * so each one carries the facts the rest of the code needs rather than being
 * compared against a string literal in four places.
 *
 * Measured against the live API on 15 Sep 2026 with the same 10 s of German.
 */
export type TranscriptionModel = 'gpt-live-transcribe' | 'gpt-4o-transcribe';

export type ModelSpec = {
  /** Whether OpenAI's own VAD may end a turn. If not, the browser commits. */
  serverVad: boolean;
  /** GA is inconsistent: newer models take `languages: []`, older `language: ""`. */
  languageField: 'language' | 'languages';
  /** Latency/accuracy trade-off. Streaming models only. */
  delay?: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
  /** Retirement date, when OpenAI has announced one. */
  retires?: string;
  /** Per minute of audio, in US dollars. A fact, not copy: nothing renders it. */
  usdPerMinute: number;
};

export const MODELS: Record<TranscriptionModel, ModelSpec> = {
  /* Words appear about a second behind your voice, while you are still
     speaking. No server-side pause detection, so the browser decides where
     sentences end. */
  'gpt-live-transcribe': {
    serverVad: false,
    languageField: 'languages',
    delay: 'low',
    usdPerMinute: 0.017,
  },
  /* Nothing appears while you talk. OpenAI's VAD closes the turn on your
     pause, then the whole sentence lands at once, about 0.3 s later. */
  'gpt-4o-transcribe': {
    serverVad: true,
    languageField: 'language',
    retires: '26 February 2027',
    usdPerMinute: 0.006,
  },
};

/**
 * Streaming by default. The post-turn model shows nothing at all until you stop
 * talking, which reads as the feature being broken rather than as a design
 * choice.
 */
export const DEFAULT_MODEL: TranscriptionModel = 'gpt-live-transcribe';

/**
 * gpt-live-transcribe has no server VAD, so the browser decides where a
 * sentence ends: this much silence after speech commits the turn.
 */
export const CLIENT_SILENCE_MS = 800;

/** Chunk loudness below which the browser counts audio as silence. */
export const CLIENT_SILENCE_LEVEL = 0.02;

/**
 * ── THE DIAL YOU WILL ACTUALLY TURN ──
 * How much silence (ms) ends a sentence. Lower = sentences commit sooner but
 * split mid-thought; higher = fewer, longer sentences. 500 is a good start.
 */
export const SILENCE_DURATION_MS = 500;

/** How loud audio must be to count as speech (0–1). Raise it in a noisy room. */
export const VAD_THRESHOLD = 0.5;

/** Audio (ms) kept from just before speech was detected, so words aren't clipped. */
export const PREFIX_PADDING_MS = 300;

/** Recording auto-stops after this many seconds. */
export const SESSION_SECONDS = 60;

/**
 * Recording also stops once nobody has said anything for this long, so an
 * abandoned session does not keep paying for silence. Measured from the start
 * of recording, and never while a statement is still being transcribed —
 * cutting the socket then would throw that statement away.
 */
export const IDLE_STOP_MS = 6000;

/**
 * How long Stop waits for the sentence you were part-way through.
 *
 * Pressing Stop mid-word used to close the socket at once, which threw that
 * sentence away — OpenAI never got the commit, so the transcript never came
 * back. Now the buffer is committed and the socket is held open this long for
 * the answer. If it does not arrive, whatever was already on screen is saved
 * instead, so nothing captured is ever silently dropped.
 */
export const STOP_GRACE_MS = 2500;

/** The Realtime API expects mono 16-bit PCM at this rate. */
export const SAMPLE_RATE = 24000;

export type LanguageChoice = 'de' | 'en' | 'auto';

/**
 * How the transcript is cut into the units passed to onSentenceFinal.
 *
 *  silence     — server VAD: a pause of SILENCE_DURATION_MS ends a sentence.
 *  semantic    — semantic VAD: the model decides you have finished a thought.
 *  punctuation — semantic VAD for the audio, then the text is split on . ? !
 *                so one long turn can still yield several sentences. Free:
 *                splitting text costs no extra API requests.
 */
export type SegmentationMode = 'silence' | 'semantic' | 'punctuation';

/**
 * How long semantic VAD waits before deciding you are done. "low" lets people
 * take their time — hesitant speech ("mir geht es... ja, ganz okay") stays in
 * one piece instead of being chopped at the pause.
 */
export const SEMANTIC_EAGERNESS = 'low';
