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
 * abandoned session does not keep paying for silence.
 *
 * MEASURED FROM THE MOMENT CAPTURE IS PROVEN LIVE — which is what this comment
 * always claimed and, until 2026-09-30, was not true. The clock used to be
 * armed at the top of `start()`, so the WebSocket handshake, the session
 * round trip, `getUserMedia` and any permission dialog were all charged
 * against the person's silence: the six seconds were really four to five and a
 * half, and on a slow start they could run out before the microphone existed.
 * That is the bug docs/VOICE-CAPTURE-FIX.md was written about.
 *
 * Never while a statement is still being transcribed — cutting the socket then
 * would throw that statement away.
 */
export const IDLE_STOP_MS = 6000;

/**
 * How long capture has to prove itself before `startRecorder` gives up.
 *
 * The worklet posts a chunk every ~40 ms whatever the loudness, so ~37 of them
 * is a generous window and a microphone that has produced NOTHING in it is not
 * a quiet room — it is a capture graph that never started. That distinction is
 * the whole point: before this existed, both arrived as `stop('silence')` and
 * the app told the person they had gone quiet when it had never heard them.
 */
export const CAPTURE_PROOF_MS = 1500;

/**
 * How long a RUNNING session tolerates no chunks at all before it reports the
 * capture lost.
 *
 * Distinct from IDLE_STOP_MS, and the difference is the fix: IDLE_STOP_MS
 * measures the newest LOUD chunk and means *the room is quiet*. This measures
 * the newest chunk of ANY loudness and means *we stopped hearing*. One
 * mechanism covers the iOS page freeze, a Bluetooth route change, an
 * audio-session interruption and a context suspended after it had been
 * running.
 *
 * 1500 and not the 1000 that suggests itself: 37 consecutive missed chunks is
 * unambiguous, while a second is within reach of a long GC pause or a blocked
 * main thread — and a watchdog that cries wolf gets raised until it is
 * useless. UNMEASURED ON A PHONE; see the doc's §5.
 */
export const CAPTURE_LOST_MS = 1500;

/**
 * How long `connecting` may last — the socket coming up AND capture proving
 * itself — before the attempt is reported as a failure.
 *
 * It exists because arming IDLE_STOP_MS at capture leaves the connecting phase
 * with no ceiling at all, and `await getUserMedia` is an unbounded wait on a
 * finger: on Chrome for iOS a first use can need the OS-level microphone grant
 * AND a per-origin prompt.
 *
 * Eight seconds, not the fifteen first proposed: a healthy start is about one,
 * and fifteen seconds of a disabled *Connecting…* is a worse wait than the
 * wrong answer it replaces. Whichever half is late reports itself — the socket
 * as `connectionFailed`, the microphone as `recorderFailed` — so this is a
 * ceiling on the honest message, not a generic timeout.
 */
export const CONNECT_TIMEOUT_MS = 8000;

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
