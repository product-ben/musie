/**
 * The camera, while it is running — E.2's effectful half.
 *
 * `camera.ts` holds what the scanner decides and has the tests; this holds the
 * `MediaStream`, the `<video>`, the timer and the teardown, which is the part
 * no Node test can reach. Everything here that could have been a decision was
 * moved next door rather than hidden in an effect.
 *
 * ── IT DOES NOT START ITSELF, AND THAT IS THE MAIN DESIGN DECISION ────────
 * Arriving at the scan step does not open a camera. A permission prompt that
 * appears because you walked into a room is a demand, and the answer people
 * give a demand they did not expect is no — permanently, in Chrome, for the
 * origin. The camera is one of THREE ways to name a card and the least used
 * of them: the common path is the phone's own camera app following
 * `<origin>/s/MC-01`, and the typed field is always on screen. So the camera
 * opens when somebody asks for it, and the prompt arrives as the answer to a
 * button they pressed.
 *
 * ── A CODE IS HANDED UP, NOT ACTED ON ─────────────────────────────────────
 * When a card is read the camera stops and `onCode` is called with `MC-01`.
 * Nothing here writes anything: `SessionScan` puts the code in the field and
 * submits it, so the camera, the typed field and the deep link all arrive at
 * `scanCardInto` by the same door. That is also what makes the answer VISIBLE
 * — the code that was read is sitting in the field, which is where an
 * unknown-card error will appear under it.
 *
 * ── STOPPING IS NOT OPTIONAL ──────────────────────────────────────────────
 * A `MediaStream` whose tracks are never stopped keeps the camera light on
 * after the step has gone. Every exit stops them: the control, a successful
 * read, a step change that unmounts the component, and the effect's own
 * cleanup.
 */
import * as React from 'react';

import { cameraFailure, cameraSupport, readFrame } from './camera';
import type { CameraProblem } from './camera';
import { createQrDetector } from './qrDetector';

export type ScannerPhase =
  /** Nothing running. The frame shows what it is for, and a control. */
  | { kind: 'off' }
  /** Asked for; the prompt may be on screen. */
  | { kind: 'starting' }
  /** Live. `other` is a QR code in view that is not one of ours. */
  | { kind: 'live'; other: boolean }
  /** Not available, or not any more. The typed field carries on regardless. */
  | { kind: 'blocked'; problem: CameraProblem };

/**
 * How often a frame is decoded, in milliseconds.
 *
 * Not every frame. A camera delivers sixty a second and a person holding a
 * card up cannot present a meaningfully different one in 16ms — so the extra
 * fifty-six decodes are heat and battery. Four a second still reads a code the
 * moment it is steady, which is the only latency anybody can feel here.
 */
const LOOK_EVERY_MS = 250;

export interface CardScanner {
  phase: ScannerPhase;
  /** Attach to the `<video>` the frame renders while `phase.kind` is `live`. */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  start: () => void;
  stop: () => void;
}

export function useCardScanner(onCode: (code: string) => void): CardScanner {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  /* Whether this component is still on screen. `getUserMedia` resolves long
     after the prompt was answered, and a stream that arrives for a step
     somebody has already left keeps the camera light on. */
  const mounted = React.useRef(true);

  /* The callback through a ref, so the scanning loop is not torn down and
     rebuilt every time the screen around it re-renders. */
  const onCodeRef = React.useRef(onCode);
  React.useEffect(() => { onCodeRef.current = onCode; }, [onCode]);

  /**
   * ASKED ONCE, ON MOUNT, BEFORE ANYTHING IS ASKED OF THE PERSON.
   *
   * Two of the three answers must never produce a permission prompt — a page
   * on plain `http://` cannot open a camera whatever anybody clicks — so the
   * step starts out already knowing, and shows the reason where the control
   * would have been. A lazy initialiser because it reads `window`.
   */
  const [phase, setPhase] = React.useState<ScannerPhase>(() => {
    const support = cameraSupport({
      secure: window.isSecureContext,
      hasMediaDevices: typeof navigator.mediaDevices?.getUserMedia === 'function',
    });
    return support === 'ready' ? { kind: 'off' } : { kind: 'blocked', problem: support };
  });

  /** Tracks stopped, element released. Safe to call in any phase. */
  const release = React.useCallback(() => {
    const stream = streamRef.current;
    streamRef.current = null;
    if (stream !== null) for (const track of stream.getTracks()) track.stop();
    if (videoRef.current !== null) videoRef.current.srcObject = null;
  }, []);

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      release();
    };
  }, [release]);

  const stop = React.useCallback(() => {
    release();
    /* A blocked scanner stays blocked: the reason is still true, and replacing
       it with `off` would put a control back that cannot work. */
    setPhase((current) => (current.kind === 'blocked' ? current : { kind: 'off' }));
  }, [release]);

  const start = React.useCallback(() => {
    setPhase({ kind: 'starting' });
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          /* `ideal`, not `exact`. The back camera is what a card is held in
             front of, but a laptop has only one and an `exact` constraint
             would turn that into OverconstrainedError — a device with a
             perfectly good camera told it has none. */
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        /* Unmounted, or stopped, while the prompt was open. The stream still
           arrives, and a stream nobody holds keeps the camera light on. */
        if (!mounted.current) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        streamRef.current = stream;
        setPhase({ kind: 'live', other: false });
      } catch (thrown: unknown) {
        /* Not console.error: the commonest cause is somebody saying no, which
           is an answer rather than a fault. The sentence on screen is the
           part that matters and `cameraFailure` chooses it. */
        console.warn('[musie] the camera did not open:', thrown);
        if (mounted.current) setPhase({ kind: 'blocked', problem: cameraFailure(thrown) });
      }
    })();
  }, []);

  /**
   * THE LOOP, and it lives and dies with the `live` phase.
   *
   * Keyed on `phase.kind` alone: the `other` flag changes inside the loop, and
   * an effect that restarted on it would rebuild the decoder — a fresh
   * WebAssembly instance — every time a stray QR code crossed the frame.
   */
  React.useEffect(() => {
    if (phase.kind !== 'live') return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video === null || stream === null) return;

    let finished = false;
    let timer: number | undefined;

    video.srcObject = stream;
    /* Set as a PROPERTY as well as an attribute. React does not always reflect
       `muted` onto the element, and on iOS an unmuted preview simply does not
       play — which looks like a camera that opened and then froze. */
    video.muted = true;
    /* iOS refuses to play an unmuted video without a gesture it recognises,
       and the element is `muted` and `playsInline` in the markup for exactly
       that. A rejection here is not fatal — the frames still arrive — so it is
       a note rather than a state. */
    void video.play().catch((thrown: unknown) => {
      console.warn('[musie] the preview did not start playing:', thrown);
    });

    void (async () => {
      let detector;
      try {
        detector = await createQrDetector();
      } catch (thrown: unknown) {
        /* E.3's binary, over the network, on whatever connection this is. The
           camera is running and nothing can read it, which is its own reason
           with its own sentence — not a camera failure. */
        console.error('[musie] the QR decoder could not be loaded:', thrown);
        if (!finished) {
          release();
          setPhase({ kind: 'blocked', problem: 'decoder' });
        }
        return;
      }
      if (finished) return;

      const look = async () => {
        if (finished) return;
        try {
          const reading = readFrame(await detector.read(video));
          if (finished) return;

          if (reading.kind === 'card') {
            /* Stop FIRST. The card is decided, and a camera still running
               while the lookup goes out would read the same code again. */
            finished = true;
            release();
            setPhase({ kind: 'off' });
            onCodeRef.current(reading.code);
            return;
          }

          const other = reading.kind === 'other';
          setPhase((current) => (
            current.kind === 'live' && current.other !== other
              ? { kind: 'live', other }
              : current
          ));
        } catch (thrown: unknown) {
          /* One frame that would not decode. The next one probably will, and
             stopping the camera over it would be the scanner giving up on a
             blurred hand movement. */
          console.warn('[musie] a frame could not be read:', thrown);
        }
        timer = window.setTimeout(() => { void look(); }, LOOK_EVERY_MS);
      };

      void look();
    })();

    return () => {
      finished = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [phase.kind, release]);

  return { phase, videoRef, start, stop };
}
