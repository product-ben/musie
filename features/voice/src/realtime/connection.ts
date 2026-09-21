import {
  MODELS,
  PREFIX_PADDING_MS,
  REALTIME_URL,
  SAMPLE_RATE,
  SEMANTIC_EAGERNESS,
  SILENCE_DURATION_MS,
  VAD_THRESHOLD,
  type LanguageChoice,
  type SegmentationMode,
  type TranscriptionModel,
} from '../config';
import type { VoiceMessage } from '../messages';
import type { TranscriptEvent } from './types';

export type RealtimeConnection = {
  sendAudio: (base64Audio: string) => void;
  /** Ends the current turn. Only needed when the model has no server VAD. */
  commit: () => void;
  close: () => void;
};

/**
 * F.2 IS THE ONE EDIT THIS FILE IS WAITING FOR: `apiKey` becomes a short-lived
 * token minted by the `realtime-token` Edge Function (F.1), and the parameter
 * is the only thing that changes. It is still a key here because F.1 is blocked
 * on a payment method on the OpenAI account, and importing the file is not the
 * same as pointing it at something real — nothing in apps/web calls this yet.
 */
export function connectRealtime(
  apiKey: string,
  model: TranscriptionModel,
  language: LanguageChoice,
  segmentation: SegmentationMode,
  onEvent: (event: TranscriptEvent) => void,
): RealtimeConnection {
  // A browser WebSocket cannot set an Authorization header, so the credential
  // travels in the subprotocol list instead. Hence the name: anyone with the
  // page can read it. That is exactly why F.1 replaces the key with a token.
  const socket = new WebSocket(REALTIME_URL, [
    'realtime',
    `openai-insecure-api-key.${apiKey}`,
  ]);

  // Transcript deltas arrive per audio item; collect them until that item completes.
  const partials = new Map<string, string>();
  let opened = false;
  let closedByUs = false;

  socket.addEventListener('open', () => {
    opened = true;
  });

  socket.addEventListener('message', (message) => {
    const event = JSON.parse(message.data as string);

    switch (event.type) {
      case 'session.created':
        socket.send(JSON.stringify(buildSessionUpdate(model, language, segmentation)));
        break;

      case 'session.updated':
        onEvent({ type: 'ready' });
        break;

      // These drive the "hearing you" state: it is OpenAI's VAD talking,
      // not a guess made in the browser.
      case 'input_audio_buffer.speech_started':
        onEvent({ type: 'speech', active: true });
        break;

      case 'input_audio_buffer.speech_stopped':
        onEvent({ type: 'speech', active: false });
        break;

      case 'conversation.item.input_audio_transcription.delta': {
        const text = (partials.get(event.item_id) ?? '') + (event.delta ?? '');
        partials.set(event.item_id, text);
        onEvent({ type: 'interim', text });
        break;
      }

      case 'conversation.item.input_audio_transcription.completed': {
        partials.delete(event.item_id);
        const text: string = (event.transcript ?? '').trim();
        if (text) {
          // Some models report a detected language; most echo back what we asked for.
          const detected = event.language ?? event.languages?.[0]?.code;
          onEvent({ type: 'final', text, language: detected ?? language });
        }
        break;
      }

      case 'conversation.item.input_audio_transcription.failed': {
        partials.delete(event.item_id);
        const { fatal, message } = classifyError(event.error);
        onEvent({ type: fatal ? 'error' : 'warning', message });
        break;
      }

      case 'error': {
        // Committing an empty buffer is the ordinary outcome of pressing Stop
        // during a pause: there was nothing left to transcribe. Not a problem,
        // and a banner for it would be noise.
        if ((event.error?.code ?? '').startsWith('input_audio_buffer')) break;
        const { fatal, message } = classifyError(event.error);
        onEvent({ type: fatal ? 'error' : 'warning', message });
        break;
      }
    }
  });

  socket.addEventListener('error', () => {
    if (!closedByUs) {
      onEvent({ type: 'error', message: { code: 'connectionFailed' } });
    }
  });

  socket.addEventListener('close', () => {
    if (closedByUs) return;
    onEvent({
      type: 'error',
      message: {
        // The browser hides the HTTP status, so a rejected handshake is
        // indistinguishable from a close that never opened — which is the one
        // fact that separates a dropped session from a refused credential.
        code: opened ? 'connectionClosed' : 'connectionRejected',
      },
    });
  });

  return {
    sendAudio(base64Audio) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: base64Audio }));
      }
    },
    commit() {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
      }
    },
    close() {
      closedByUs = true;
      socket.close();
    },
  };
}

/**
 * Decides whether an error should end the session.
 *
 * Rate limits must not: every statement is a separate request, so on a low tier
 * the third statement of an ordinary session can be rejected, and that clears in
 * seconds. Everything that cannot clear on its own — no credits, a bad key, a
 * rejected session config — must stop the session loudly. A warning that leaves
 * recording running just looks like transcription silently producing nothing.
 *
 * `segmentation` is no longer a parameter: the POC interpolated the mode's name
 * into the sentence it built here, and there is no sentence here any more.
 */
function classifyError(
  error: { code?: string; message?: string; param?: string } | undefined,
): { fatal: boolean; message: VoiceMessage } {
  const code = error?.code ?? '';
  const param = error?.param ?? '';

  if (param.includes('turn_detection')) {
    return { fatal: true, message: { code: 'segmentationRejected', detail: error?.message } };
  }

  // Clears on its own within the minute — skip the statement, keep recording.
  if (code === 'rate_limit_exceeded') {
    return { fatal: false, message: { code: 'rateLimited', detail: error?.message } };
  }

  if (code === 'credit_balance_exhausted' || code === 'insufficient_quota') {
    return { fatal: true, message: { code: 'noCredits', detail: error?.message } };
  }

  return { fatal: true, message: { code: 'providerError', detail: error?.message } };
}

function buildSessionUpdate(
  model: TranscriptionModel,
  language: LanguageChoice,
  segmentation: SegmentationMode,
) {
  const spec = MODELS[model];

  // The models disagree on the language field: some take a `languages` array,
  // others a singular `language`. Sending both is rejected.
  const languageHint =
    language === 'auto'
      ? {}
      : spec.languageField === 'languages'
        ? { languages: [language] }
        : { language };

  return {
    type: 'session.update',
    session: {
      type: 'transcription',
      audio: {
        input: {
          format: { type: 'audio/pcm', rate: SAMPLE_RATE },
          transcription: { model, ...(spec.delay ? { delay: spec.delay } : {}), ...languageHint },
          // A model without server VAD rejects turn detection outright, so the
          // browser commits turns instead. See useTranscription.
          turn_detection: spec.serverVad ? buildTurnDetection(segmentation) : null,
        },
      },
    },
  };
}

/**
 * "silence" chunks on a pause of fixed length. "semantic" (and the
 * punctuation mode built on it) lets a classifier judge when the speaker has
 * actually finished a thought, so hesitation does not end a sentence.
 */
function buildTurnDetection(segmentation: SegmentationMode) {
  if (segmentation === 'silence') {
    return {
      type: 'server_vad',
      threshold: VAD_THRESHOLD,
      prefix_padding_ms: PREFIX_PADDING_MS,
      silence_duration_ms: SILENCE_DURATION_MS,
    };
  }
  return { type: 'semantic_vad', eagerness: SEMANTIC_EAGERNESS };
}
