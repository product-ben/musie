/**
 * Converts microphone audio to the format the Realtime API wants:
 * mono 16-bit PCM. The AudioContext is created at 24 kHz, so the browser
 * has already resampled by the time audio reaches here.
 *
 * Plain JS on purpose: audio worklets run in a separate scope that loads
 * this file directly, so it is served as-is rather than bundled.
 */

// The browser hands us 128 samples at a time (~5 ms). Batching to ~40 ms
// keeps the number of WebSocket messages sensible without adding real latency.
const BATCH_SAMPLES = 960;

class PcmRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Int16Array(BATCH_SAMPLES);
    this.offset = 0;
    this.peak = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      // Float (-1..1) → signed 16-bit.
      const clamped = Math.max(-1, Math.min(1, channel[i]));
      this.buffer[this.offset++] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;

      const magnitude = Math.abs(clamped);
      if (magnitude > this.peak) this.peak = magnitude;

      if (this.offset === BATCH_SAMPLES) {
        // `level` drives the on-screen meter; the audio itself goes to OpenAI.
        this.port.postMessage({ pcm: this.buffer.buffer, level: this.peak }, [
          this.buffer.buffer,
        ]);
        this.buffer = new Int16Array(BATCH_SAMPLES);
        this.offset = 0;
        this.peak = 0;
      }
    }
    return true;
  }
}

registerProcessor("pcm-recorder", PcmRecorder);
