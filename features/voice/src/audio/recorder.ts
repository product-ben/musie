import { SAMPLE_RATE } from '../config';
import type { VoiceMessageCode } from '../messages';

export type Recorder = { stop: () => void };

/**
 * Thrown when the browser blocks the microphone, so the UI can explain why.
 *
 * It carries a CODE rather than the sentence the POC threw. `Error` still
 * needs a message, and the code is what goes in it: that string is for a
 * developer reading a stack trace, and the person holding the phone reads
 * whatever `apps/web/src/lib/voiceMessages.ts` maps the code to. See
 * messages.ts.
 */
export class MicrophoneError extends Error {
  readonly code: Extract<VoiceMessageCode, 'micDenied' | 'micNotFound' | 'micUnavailable'>;

  constructor(code: MicrophoneError['code']) {
    super(code);
    this.name = 'MicrophoneError';
    this.code = code;
  }
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // Chunked because String.fromCharCode(...) overflows the stack on big arrays.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Where the PCM worklet is served from.
 *
 * The POC read `import.meta.env.BASE_URL` and looked for the file in the
 * demo's `public/`, which cannot work from inside a package: this code no
 * longer knows what the app's public directory contains, and the worklet is
 * ours, not the app's. `new URL(…, import.meta.url)` keeps the file beside the
 * module that loads it and lets the bundler emit it — the same pattern Vite
 * documents for a worker.
 *
 * UNVERIFIED AT F.0, deliberately: nothing in apps/web imports this module
 * yet, so no bundle has been asked to emit the file. That is why the override
 * exists — if Vite's asset handling disappoints when F.4 wires the screen up,
 * the app can pass a URL of its own without this file changing. Logged in
 * apps/web/OPEN-QUESTIONS.md.
 */
const DEFAULT_WORKLET_URL = new URL('./pcm-worklet.js', import.meta.url);

/**
 * Opens the microphone and calls `onAudioChunk` every ~40 ms with base64 PCM16
 * and the loudness of that chunk (0–1), which the UI uses to animate the meter.
 */
export async function startRecorder(
  onAudioChunk: (base64Audio: string, level: number) => void,
  options?: { workletUrl?: string | URL },
): Promise<Recorder> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      throw new MicrophoneError('micDenied');
    }
    if (name === 'NotFoundError') {
      throw new MicrophoneError('micNotFound');
    }
    throw new MicrophoneError('micUnavailable');
  }

  // Asking for 24 kHz lets the browser resample for us — no manual resampling.
  const context = new AudioContext({ sampleRate: SAMPLE_RATE });

  await context.audioWorklet.addModule(String(options?.workletUrl ?? DEFAULT_WORKLET_URL));

  const source = context.createMediaStreamSource(stream);
  const recorder = new AudioWorkletNode(context, 'pcm-recorder');
  recorder.port.onmessage = (event: MessageEvent<{ pcm: ArrayBuffer; level: number }>) => {
    onAudioChunk(toBase64(event.data.pcm), event.data.level);
  };

  // A worklet only runs while connected to the graph, but routing the mic to the
  // speakers would echo — so pass through a silent gain node instead.
  const silence = context.createGain();
  silence.gain.value = 0;
  source.connect(recorder).connect(silence).connect(context.destination);

  return {
    stop() {
      recorder.port.onmessage = null;
      source.disconnect();
      recorder.disconnect();
      silence.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      void context.close();
    },
  };
}
