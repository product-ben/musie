/**
 * @musie/voice — speech to text, as a package rather than a screen.
 *
 * ── WHAT THIS IS ───────────────────────────────────────────────────────────
 * Phase F.0: the proof-of-concept from `product-ben/musie-voice-to-text-demo`,
 * brought into the monorepo. The POC was a standalone Vite app with its own
 * router, its own pages, its own components and its own copy of five design
 * system files; what crossed the line is the part that is the FEATURE — the
 * microphone, the socket, the segmentation, the cleaning, and the state that
 * holds the statements between them.
 *
 * ── WHAT WAS DELIBERATELY LEFT BEHIND ──────────────────────────────────────
 * Everything that only existed to demonstrate the thing:
 *
 *   src/pages/, src/App.tsx, useHashRoute   a router for three demo pages
 *   src/components/ (17 files)              Nav, Stepper, Tabs, MicCheck,
 *                                           RecorderPanel, SegmentedToggle,
 *                                           SentenceCard ×2, Toast, UndoBar,
 *                                           HowItWorks, PrivacyNote…
 *   src/musie/MusieToast.tsx                the system HAS a Toast (§7.21)
 *   src/musie/MusieRules.tsx, MusieStates   documentation-as-a-page
 *   src/musie/musie.css (531 lines)         a stylesheet for the above
 *   src/musie/theme.ts, useCoarsePointer    the system exports the hook
 *   src/hooks/useDragList.ts (281 lines)    Draggable List §7.24 IS this
 *   src/hooks/useAutoGrow, useMicCheck      demo-panel helpers
 *   the API-key field and the settings wizard
 *
 * MusieTranscriptWorkspace and MusieStatementCard did not come across either,
 * and that is F.4's step rather than an omission — the plan puts them "on the
 * real Toast and DraggableList", which is a rewrite of both files against
 * components this package does not need to have imported to be finished.
 * Logged in apps/web/OPEN-QUESTIONS.md.
 *
 * ── THE ONE RULE THIS PACKAGE ADDS FOR ITSELF ──────────────────────────────
 * NOTHING HERE SPEAKS. Not an error, not a label, not a toast. Every string a
 * person could read is a code out of messages.ts, resolved to German or
 * English by apps/web/src/i18n through apps/web/src/lib/voiceMessages.ts. A
 * package below the app cannot satisfy CLAUDE.md 6 and 7 any other way.
 */

export { segment, splitOnPunctuation } from './segmentation';
export { stripFillers } from './transcript/fillers';
export type { Sentence } from './transcript/types';

export type { VoiceMessage, VoiceMessageCode, UndoReason } from './messages';

export { onSentenceFinal, setSentenceFinalHandler } from './onSentenceFinal';
export type { SentenceFinalHandler } from './onSentenceFinal';

export { useSentences } from './useSentences';
export { useTranscription } from './useTranscription';
export type { Status, StopReason } from './useTranscription';

export { connectRealtime } from './realtime/connection';
export type { RealtimeConnection } from './realtime/connection';
export type { TranscriptEvent } from './realtime/types';

export { MicrophoneError, startRecorder } from './audio/recorder';
export type { Recorder } from './audio/recorder';

export {
  DEFAULT_MODEL, MODELS, SESSION_SECONDS, IDLE_STOP_MS, SAMPLE_RATE,
} from './config';
export type {
  LanguageChoice, ModelSpec, SegmentationMode, TranscriptionModel,
} from './config';
