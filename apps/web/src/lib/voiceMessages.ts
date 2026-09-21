/**
 * The boundary between @musie/voice and the message catalogue.
 *
 * The voice feature is a package below the app, so it cannot hold a
 * user-visible string: it has no German, and `MessageKey` — `keyof typeof en`
 * — is not reachable from it. It therefore reports CODES, and this file is the
 * one place those codes become something a person can read. See the package's
 * `src/messages.ts` for the argument, and `src/i18n/en.ts` for the copy.
 *
 * WHY A `Record` AND NOT A FUNCTION WITH A SWITCH. The Record is exhaustive in
 * both directions at compile time: a code added to the package with no entry
 * here fails `pnpm check`, and an entry naming a key the catalogue does not
 * have fails it too — in English and German at once, because `de.ts` is typed
 * against `en.ts`. That is the same guarantee the rest of the i18n layer has,
 * extended across a package boundary, and it is the reason the codes were
 * worth introducing at all.
 *
 * NOTHING RENDERS THIS YET. F.0 imports the feature; F.4 builds the screen.
 * The map is written now because it is what makes the import satisfy CLAUDE.md
 * 6 and 7 — a code with nowhere to resolve to is a missing German string with
 * extra steps.
 */
import type { UndoReason, VoiceMessageCode } from '@musie/voice';
import type { MessageKey } from '../i18n';

/**
 * Every failure the feature can report, in the order messages.ts declares
 * them: the microphone, the recorder, the socket, then the provider.
 */
export const VOICE_MESSAGE_KEYS: Record<VoiceMessageCode, MessageKey> = {
  micDenied: 'voice.error.micDenied',
  micNotFound: 'voice.error.micNotFound',
  micUnavailable: 'voice.error.micUnavailable',
  recorderFailed: 'voice.error.recorderFailed',
  connectionFailed: 'voice.error.connectionFailed',
  connectionClosed: 'voice.error.connectionClosed',
  connectionRejected: 'voice.error.connectionRejected',
  segmentationRejected: 'voice.error.segmentationRejected',
  /* The only non-fatal one, which is why its key says `warning`: recording is
     still running and the person should carry on talking. */
  rateLimited: 'voice.warning.rateLimited',
  noCredits: 'voice.error.noCredits',
  providerError: 'voice.error.providerError',
};

/** What an undo offer is undoing. */
export const VOICE_UNDO_KEYS: Record<UndoReason, MessageKey> = {
  combined: 'voice.undo.combined',
  deleted: 'voice.undo.deleted',
};
