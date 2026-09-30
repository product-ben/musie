/**
 * The capture graph under WEBKIT — the engine every browser on iOS runs,
 * Chrome included.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * `apps/web/OPEN-QUESTIONS.md` records that Playwright here is Chromium twice
 * over, *"where the bug is invisible"*. The bug in docs/VOICE-CAPTURE-FIX.md
 * was reported from an iPhone and every candidate cause turned on WebKit
 * behaviour nobody had measured, so two facts were measured by hand to settle
 * it — and a fact settled by hand rots. This is those measurements, kept.
 *
 * ── WHAT IT PROVES, AND WHAT IT CANNOT ────────────────────────────────────
 * It needs NO MICROPHONE, which is the whole trick and the reason it can run
 * on a runner at all: an `OscillatorNode` stands in for a voice. The question
 * is never "does the microphone work" — it is "does the worklet run, and do
 * chunks arrive" — and an oscillator answers that exactly as well as a lung.
 *
 * So it pins three things that were guesses before:
 *
 *   1 · WebKit ACCEPTS an AudioWorklet module from a `data:` URL. Vite inlines
 *       `pcm-worklet.js` under its 4 kB `assetsInlineLimit`, so the production
 *       bundle hands `addModule` a base64 `data:` URI and never a path. That
 *       was pre-registered at OPEN-QUESTIONS.md L2034 as the likely cause of
 *       exactly this bug, with the note that WebKit's behaviour here was
 *       untested. It is tested now, and it is fine.
 *
 *   2 · `process()` RUNS, and posts a chunk about every 40 ms whatever the
 *       loudness. That rate is the load-bearing fact behind the whole fix:
 *       capture/health.ts tells "the room is quiet" from "we heard nothing" by
 *       whether chunks arrive at all, and if the worklet were ever silent in a
 *       quiet room that distinction would collapse.
 *
 *   3 · A 24 kHz context DELIVERS USABLE LEVELS. `CLIENT_SILENCE_LEVEL` is
 *       0.02 and one candidate cause was that WebKit resamples to silence.
 *
 * What it CANNOT reach, stated so nobody mistakes a green run for the
 * checkpoint: `getUserMedia` (Playwright's WebKit has no fake audio device),
 * and everything AVAudioSession owns — the `interrupted` state, route changes,
 * Bluetooth, the hardware mute switch. Those need the phone, and
 * BUILD-PLAN.md's Phase F checkpoint is still owed.
 *
 * ── NOT IN `pnpm check` ───────────────────────────────────────────────────
 * Same reason as the `db` project and the rest of `test:e2e`: CI runs `check`
 * on a runner with no browser, and a suite that silently skips is worse than
 * no suite (`ci.yml`).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

/** The real worklet, read off disk — not a copy written for the test, which
 *  would pass while the shipped one was broken. */
const WORKLET = readFileSync(
  fileURLToPath(new URL('../../../features/voice/src/audio/pcm-worklet.js', import.meta.url)),
  'utf8',
);

/** Exactly what Vite emits for an asset under `assetsInlineLimit`. */
const DATA_URI = `data:text/javascript;base64,${Buffer.from(WORKLET, 'utf8').toString('base64')}`;

/** Matches `SAMPLE_RATE` and `CLIENT_SILENCE_LEVEL` in features/voice/src/config.ts. */
const SAMPLE_RATE = 24_000;
const CLIENT_SILENCE_LEVEL = 0.02;

test.describe('the capture graph on WebKit', () => {
  test('loads the inlined worklet, runs it, and delivers audible chunks', async ({ page }) => {
    /* Any page on the app's own origin: a secure context is what
       `audioWorklet` requires, and `about:blank` does not have one. Nothing on
       the page is used — the graph is built in the evaluate below. */
    await page.goto('/');

    const measured = await page.evaluate(
      async ({ dataUri, sampleRate }) => {
        const context = new AudioContext({ sampleRate });
        const stateAtConstruction = context.state;

        await context.audioWorklet.addModule(dataUri);
        const node = new AudioWorkletNode(context, 'pcm-recorder');

        let chunks = 0;
        let maxLevel = 0;
        let bytes = 0;
        node.port.onmessage = (event: MessageEvent<{ pcm: ArrayBuffer; level: number }>) => {
          chunks += 1;
          bytes = event.data.pcm.byteLength;
          if (event.data.level > maxLevel) maxLevel = event.data.level;
        };

        /* A loud tone stands in for a voice. Through a zero-gain node to the
           destination, which is the same shape recorder.ts builds and for the
           same reason: a worklet only runs while connected to the graph, and
           routing it to the speakers would echo. */
        const oscillator = new OscillatorNode(context, { frequency: 440 });
        const gain = new GainNode(context, { gain: 0.5 });
        const mute = new GainNode(context, { gain: 0 });
        oscillator.connect(gain).connect(node);
        node.connect(mute).connect(context.destination);
        oscillator.start();

        /* Belt and braces, exactly as recorder.ts does it, and for the same
           reason: reading `state` proves nothing, arriving chunks do. */
        if (context.state !== 'running') await context.resume().catch(() => {});

        await new Promise((resolve) => setTimeout(resolve, 1500));
        const stateAfterAudio = context.state;
        oscillator.stop();
        await context.close();

        return { stateAtConstruction, stateAfterAudio, chunks, maxLevel, bytes };
      },
      { dataUri: DATA_URI, sampleRate: SAMPLE_RATE },
    );

    /* 1 · the data: module was accepted — reaching here at all proves it, and
           the chunk count proves the processor was really registered. */

    /* 2 · chunks arrive at the rate the fix depends on. 960 samples at 24 kHz
           is 40 ms, so 1500 ms is ~37. The bound is deliberately loose at the
           top and strict at the bottom: a slow runner may deliver fewer, but
           NONE would mean the worklet never ran, which is the failure this
           file exists to catch. */
    expect(measured.chunks).toBeGreaterThan(15);
    expect(measured.bytes).toBe(960 * 2); // Int16, so two bytes a sample.

    /* 3 · and they are audible, well clear of the silence threshold. */
    expect(measured.maxLevel).toBeGreaterThan(CLIENT_SILENCE_LEVEL);

    /* The measurement that refuted the prime suspect, pinned. WebKit
       constructs a context `suspended` where Chromium constructs it `running`
       — and it starts rendering anyway. If a WebKit release ever makes this
       state stick, THIS is the assertion that should fail, and loudly, because
       the fix's `resume()` is belt and braces and the liveness gate would then
       be doing the real work. */
    expect(measured.stateAfterAudio).toBe('running');
  });

  test('accepts the worklet from a same-origin path too — the override still works', async ({ page }) => {
    /* `startRecorder` takes a `workletUrl` override, added at F.0 as the lever
       for exactly the failure that turned out not to happen. It is unused in
       the app, so nothing else would notice if it broke. */
    await page.goto('/');
    await page.route('**/pcm-worklet-test.js', (route) =>
      route.fulfill({ contentType: 'text/javascript', body: WORKLET }),
    );

    const chunks = await page.evaluate(async (sampleRate) => {
      const context = new AudioContext({ sampleRate });
      await context.audioWorklet.addModule('/pcm-worklet-test.js');
      const node = new AudioWorkletNode(context, 'pcm-recorder');
      let seen = 0;
      node.port.onmessage = () => { seen += 1; };
      const oscillator = new OscillatorNode(context, { frequency: 440 });
      const mute = new GainNode(context, { gain: 0 });
      oscillator.connect(node).connect(mute).connect(context.destination);
      oscillator.start();
      if (context.state !== 'running') await context.resume().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 800));
      oscillator.stop();
      await context.close();
      return seen;
    }, SAMPLE_RATE);

    expect(chunks).toBeGreaterThan(5);
  });
});
