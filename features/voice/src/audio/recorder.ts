import { CAPTURE_PROOF_MS, SAMPLE_RATE } from '../config';
import type { VoiceMessageCode } from '../messages';

export type Recorder = {
  stop: () => void;
  /**
   * What the capture graph actually turned out to be. Facts, not copy —
   * nothing renders these; they go in a bug report.
   *
   * They exist because the reported bug took a day to find with NOTHING
   * recorded anywhere: `features/voice/src` held not one console statement,
   * so whether a chunk had ever arrived, what the real sample rate was and
   * whether the track was muted were all unknowable after the fact. Each of
   * these separates at least two of the candidate causes in
   * docs/VOICE-CAPTURE-FIX.md §3 from each other.
   */
  diagnostics: () => {
    /** What the browser gave us, which may not be SAMPLE_RATE. */
    sampleRate: number;
    contextState: AudioContextState;
    /** iOS mutes a track it has taken away rather than ending it. */
    trackMuted: boolean;
    trackState: MediaStreamTrackState;
  };
};

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
  readonly code: Extract<
    VoiceMessageCode,
    'micDenied' | 'micNotFound' | 'micUnavailable' | 'recorderFailed' | 'micInterrupted'
  >;

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
 *
 * ── IT DOES NOT RESOLVE UNTIL CAPTURE HAS PROVEN ITSELF — 2026-09-30 ───────
 * This used to resolve as soon as the graph was wired up, which is not the
 * same thing as audio arriving, and the difference is the bug in
 * docs/VOICE-CAPTURE-FIX.md: a microphone that opened and produced nothing was
 * indistinguishable from a quiet room, and the app told the person they had
 * gone quiet.
 *
 * So the promise now waits for the FIRST CHUNK. The worklet posts one every
 * ~40 ms whatever the loudness, so this costs a healthy start almost nothing
 * and turns a dead capture graph into a thrown `recorderFailed` — a code this
 * package has documented since F.0 and, until now, could not reach.
 */
export async function startRecorder(
  onAudioChunk: (base64Audio: string, level: number) => void,
  options?: {
    workletUrl?: string | URL;
    /**
     * Capture died after it had started — the track was muted or ended
     * underneath us. A call arriving, a Bluetooth route change, an iOS
     * audio-session interruption.
     *
     * Reported rather than thrown, because by the time this fires the promise
     * has long resolved and the session is running: there is nobody left to
     * catch it. `useTranscription` turns it into `micInterrupted`.
     */
    onInterrupted?: () => void;
  },
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

  /**
   * A TRACK CAN ARRIVE ALREADY DEAD, and `getUserMedia` calls that success.
   * Checked here because everything below would then build a perfectly valid
   * graph over nothing — which is exactly the failure that reads as silence.
   */
  const [track] = stream.getAudioTracks();
  if (track === undefined || track.readyState === 'ended') {
    stream.getTracks().forEach((each) => each.stop());
    throw new MicrophoneError('micUnavailable');
  }

  // Asking for 24 kHz lets the browser resample for us — no manual resampling.
  const context = new AudioContext({ sampleRate: SAMPLE_RATE });

  /**
   * ── ONE TEARDOWN, THREE CALLERS ───────────────────────────────────────────
   * The returned `stop()`, the liveness timeout, and the catch below all mean
   * the same thing by "release the microphone", so they call the same code.
   *
   * Before this existed, everything from the AudioContext down sat OUTSIDE the
   * try/catch above: a throw from `addModule`, `createMediaStreamSource` or
   * `new AudioWorkletNode` leaked the granted MediaStream AND the AudioContext,
   * because the only thing that released them was a `stop()` this function
   * never got to return. Logged as L2 in docs/VOICE-CAPTURE-FIX.md.
   */
  let node: AudioWorkletNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let silence: GainNode | null = null;
  let released = false;

  const release = () => {
    if (released) return;
    released = true;
    if (node !== null) node.port.onmessage = null;
    track.removeEventListener('mute', interrupted);
    track.removeEventListener('ended', interrupted);
    source?.disconnect();
    node?.disconnect();
    silence?.disconnect();
    stream.getTracks().forEach((each) => each.stop());
    void context.close();
  };

  /** Fired at most once: two events for one fact, and the fact is terminal. */
  let announced = false;
  function interrupted() {
    if (announced) return;
    announced = true;
    options?.onInterrupted?.();
  }

  try {
    await context.audioWorklet.addModule(String(options?.workletUrl ?? DEFAULT_WORKLET_URL));

    source = context.createMediaStreamSource(stream);
    node = new AudioWorkletNode(context, 'pcm-recorder');

    /**
     * THE FIRST CHUNK IS THE PROOF, and the handler is installed BEFORE the
     * graph is connected so a chunk that arrives during set-up still counts.
     */
    let proven = false;
    let prove: () => void = () => {};
    node.port.onmessage = (event: MessageEvent<{ pcm: ArrayBuffer; level: number }>) => {
      if (!proven) {
        proven = true;
        prove();
      }
      onAudioChunk(toBase64(event.data.pcm), event.data.level);
    };

    /* Capture dying after it has started is not throwable — see onInterrupted. */
    track.addEventListener('mute', interrupted);
    track.addEventListener('ended', interrupted);

    // A worklet only runs while connected to the graph, but routing the mic to
    // the speakers would echo — so pass through a silent gain node instead.
    silence = context.createGain();
    silence.gain.value = 0;
    source.connect(node).connect(silence).connect(context.destination);

    /**
     * ── RESUME, BUT DO NOT TRUST THE RESUME ─────────────────────────────────
     * WebKit constructs an AudioContext `suspended` where Chromium constructs
     * it `running`, and this repository never resumed one. Measured, that is
     * NOT the cause of the reported bug — a capturing document is exempt from
     * WebKit's autoplay gate, and `state` reads `suspended` immediately after
     * construction on every engine because rendering starts asynchronously.
     * The five cases are in docs/VOICE-CAPTURE-FIX.md §2.
     *
     * So this is belt and braces, and it deliberately does not throw: reading
     * `state` here proves nothing, and the liveness gate below is the only
     * honest test of whether audio is actually flowing.
     */
    if (context.state !== 'running') {
      await context.resume().catch(() => {
        /* The gate below is the real test. */
      });
    }

    await new Promise<void>((resolve, reject) => {
      if (proven) {
        resolve();
        return;
      }
      prove = resolve;
      setTimeout(() => {
        if (proven) resolve();
        else reject(new MicrophoneError('recorderFailed'));
      }, CAPTURE_PROOF_MS);
    });
  } catch (error) {
    release();
    /* A MicrophoneError already says the right thing; anything else is the
       capture graph failing to start, which is what `recorderFailed` means. */
    throw error instanceof MicrophoneError ? error : new MicrophoneError('recorderFailed');
  }

  return {
    stop: release,
    diagnostics: () => ({
      sampleRate: context.sampleRate,
      contextState: context.state,
      trackMuted: track.muted,
      trackState: track.readyState,
    }),
  };
}
