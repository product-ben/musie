/**
 * Step 3 · Listen — the track, the question to hold while it plays, and the
 * gate that decides when the reflection is worth starting.
 *
 * ── THE STAGE ONLY. THE REVEAL IS E.5 ──────────────────────────────────────
 * The prototype's listen step is three stacked viewports: this stage, a "do
 * not get influenced by the track name" interstitial, and a details view with
 * the full player and the track's identity — and reaching the third view IS the
 * reveal. That machinery belongs with the `reveal-track` Edge Function it
 * exists to gate, which is E.5, and MOCKUPS.md 5 already files it there.
 *
 * So this is the stage: the copy, the transport, the gate, and the way on.
 * Nothing here has to be undone when the other two views arrive — they are
 * scroll targets below this one.
 *
 * ── TrackButton, NOT MusicPlayer, AND THE COLUMN GRANT DECIDED IT ──────────
 * `MusicPlayer.title` is required and VISIBLE. This step cannot name the
 * track: `tracks.title` and `.artist` are not granted to the client at all, and
 * asking for either fails the request outright rather than returning null. So
 * the only things it could pass are a fabricated title or the action word
 * twice. `TrackButton` is built for exactly this — its `label` is announced and
 * never shown, and the visible label is the verb.
 *
 * `session.listen.track` — "Your track" — is what goes into the announced
 * name. It is not a title standing in for one; it is what the control IS,
 * which is the same thing the diary's *Listen again* does with the same grant.
 *
 * ── THERE IS NO AUDIO, SO THE CLOCK IS SIMULATED ───────────────────────────
 * `tracks.src` points at files that are not in the project, because the
 * licensing is not cleared (E.4) — a real-world blocker rather than an
 * engineering one. The element is still real and still tried first: when it
 * fails, the clock takes over at the track's own `duration_seconds`, which the
 * seed carries precisely so a countdown can render before anything has loaded.
 * That fallback is the only thing a real file deletes.
 *
 * ── THE GATE IS STICKY, AND IT HAS TO BE ───────────────────────────────────
 * Ninety seconds, or the whole track if it is shorter. Once met it stays met
 * for the rest of the session: leaving the step and coming back resets the
 * position but not the fact that you listened, and a position-only test would
 * re-lock a step somebody has already done.
 */
import * as React from 'react';
import { Message, TrackButton } from '@musie/design-system';
import { StepText } from './StepText';
import { useT } from '../i18n/localeContext';
import { trackUrl } from '../lib/diary';
import type { Exercise, Track } from '../lib/content';

/** The simulated clock's tick. Four a second, so the countdown does not stutter. */
const TICK_MS = 250;

function clock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

export interface SessionListenProps {
  exercise: Exercise;
  track: Track | null;
  /** The question, already resolved to the exercise's own or the fallback. */
  question: string;
  /** Sticky across the step, so it is held by the session rather than here. */
  listened: boolean;
  onListened: () => void;
}

/**
 * THE BODY ONLY — the action row is `WizardPanel`'s, filled by `Session.tsx`.
 *
 * WHICH IS WHY `listened` IS LIFTED AND `position` IS NOT. The CTA out there
 * has to know whether the gate is open, and the gate is a fact about the
 * session rather than about this render: leaving the step and coming back
 * resets the position but not that you listened. So the step reports the
 * threshold ONCE, upward, and keeps the position it counts down from.
 */
export function SessionListen({
  exercise, track, question, listened, onListened,
}: SessionListenProps) {
  const t = useT();
  const media = React.useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [position, setPosition] = React.useState(0);
  /**
   * True once the element has refused the file and the clock has taken over.
   *
   * MIRRORED ON A REF, and that is not belt-and-braces — it is the fix for a
   * real defect the end-to-end walk found. `play()` rejecting is what tells us
   * there is no file, but the element ALSO fires `pause` on its way down, and
   * that event arrives after we have already decided to simulate. A handler
   * closed over the state variable still reads `false`, calls
   * `setPlaying(false)`, and the transport flips to playing and instantly back
   * — so the interval never starts, the gate never opens, and the listen step
   * is a dead end. Which is the state the product is actually in until E.4
   * lands real audio, so it was not a hypothetical.
   */
  const [simulated, setSimulated] = React.useState(false);
  const simulatedRef = React.useRef(false);

  const goSimulated = React.useCallback(() => {
    simulatedRef.current = true;
    setSimulated(true);
  }, []);

  /**
   * THE GATE COMES FROM THE EXERCISE, and the cap comes from the track.
   *
   * `exercises.listen_gate_seconds` was a hardcoded 90 here until Ben settled
   * that it varies (2026-09-20) — a two-minute card draw and a twenty-minute
   * soundwalk plainly do not earn the same wait. The column is `not null`, so
   * there is nothing to coalesce.
   *
   * The CAP is still this component's, because the exercise cannot see the
   * recording: a gate longer than the track would never be reachable, so a
   * shorter piece is satisfied by finishing it.
   */
  const duration = track?.durationSeconds ?? 0;
  const gate = duration > 0
    ? Math.min(exercise.listenGateSeconds, duration)
    : exercise.listenGateSeconds;
  const met = listened || Math.floor(position) >= gate;

  /* Latch the gate upward, in an effect rather than in the handlers: three
     different things move the position — the element, the clock and the reset
     — and the rule is about the position, not about who moved it. */
  React.useEffect(() => {
    if (!listened && Math.floor(position) >= gate) onListened();
  }, [position, gate, listened, onListened]);

  /* THE SIMULATED CLOCK. Runs only once the element has failed, so a real file
     is never shadowed by it. Stops at the duration and clears `playing`, which
     is what puts TrackButton into its `ended` state. */
  React.useEffect(() => {
    if (!simulated || !playing) return undefined;
    const timer = setInterval(() => {
      setPosition((at) => {
        const next = Math.min(duration, at + TICK_MS / 1000);
        if (next >= duration) setPlaying(false);
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [simulated, playing, duration]);

  function play() {
    const element = media.current;
    if (element === null || simulated) {
      setPlaying(true);
      return;
    }
    element.play().catch(() => {
      /* No file, no codec, or a gesture the browser did not trust. The clock
         takes over rather than leaving a dead control — and it is logged, not
         swallowed, because "there is no audio" and "this browser refused" look
         identical from here. */
      console.info('[musie] no playable audio — running the simulated clock');
      goSimulated();
      setPlaying(true);
    });
  }

  function toggle() {
    const element = media.current;
    /* Ended restarts from zero: the glyph promised a restart, so resuming from
       the end would be a lie. */
    if (duration > 0 && position >= duration) {
      setPosition(0);
      if (element !== null && !simulated) element.currentTime = 0;
      play();
      return;
    }
    if (playing) {
      if (element !== null && !simulated) element.pause();
      setPlaying(false);
      return;
    }
    play();
  }

  return (
    <>
      <StepText lines={exercise.listenText} />

      {/* THE QUESTION, held in mind while the track plays. It is the SAME
          question the reflect step asks — one column, shown twice, which is
          the schema's own shape and deliberately so: the question you hold and
          the question you answer must not be able to drift apart. */}
      <h2 className="musie-question">{question}</h2>

      {track === null ? (
        <Message
          variant="info"
          live="off"
          headingLevel={3}
          headline={t('session.listen.noTrack')}
        />
      ) : (
        <div className="musie-stack">
          {/* UNMOUNTED ONCE WE ARE SIMULATING. The element has already refused
              the file, so it has nothing left to offer — and leaving it
              mounted leaves a second thing driving `playing` and `position`
              against the clock that has taken over. The ref guards inside the
              handlers cover the events already in flight; this stops any more
              being raised at all. */}
          {!simulated && (
            <audio
              ref={media}
              src={trackUrl(track.src)}
              preload="none"
              onPlay={() => { if (!simulatedRef.current) setPlaying(true); }}
              onPause={() => { if (!simulatedRef.current) setPlaying(false); }}
              onTimeUpdate={(event) => {
                if (!simulatedRef.current) setPosition(event.currentTarget.currentTime);
              }}
              /* Pinned to the full duration rather than left wherever the last
                 timeupdate landed: that is what puts the button into `ended`,
                 where the glyph becomes a replay arrow. */
              onEnded={() => setPosition(track.durationSeconds)}
              onError={goSimulated}
            />
          )}

          {/* A PLAIN BLOCK AROUND IT, so the button hugs its own label
              instead of filling the row. `.musie-stack` is a flex column and
              its children stretch by default, which took a control sized to
              "Start Listening 04:14" and stretched it edge to edge. The
              wrapper stretches instead; `.musy-btn` is inline-flex, so inside
              a block it sizes to its contents and sits at the leading edge.
              No CSS, and no reaching into the button's own geometry (L7). */}
          <div>
            <TrackButton
              label={t('session.listen.track')}
              duration={track.durationSeconds}
              position={position}
              playing={playing}
              /* ONE FILLED PRIMARY, AND IT MOVES WHEN THE GATE OPENS. Listening
                 is the only thing to do until the step is satisfied, so the
                 transport holds the filled treatment and the CTA is disabled
                 beside it; at the threshold they swap. L6 still holds — the
                 forward action is primary the moment it is a forward action at
                 all, and before that there is nothing to go forward to. */
              variant={met ? 'secondary' : 'primary'}
              size="guided"
              onTogglePlay={toggle}
              onRestart={toggle}
            />
          </div>

          {simulated && (
            <p className="musie-note">{t('session.listen.simulated')}</p>
          )}
        </div>
      )}

      {/* The gate's own copy, with the sentences it qualifies rather than with
          the buttons it unlocks: it is the small print under the instruction.
          `aria-describedby` on the CTA points here. */}
      <p id="listen-gate" className="musie-note">
        {met
          ? t('session.listen.gateMet')
          : t('session.listen.gateLocked', {
              gate: clock(gate),
              left: clock(Math.max(0, gate - Math.floor(position))),
            })}
      </p>

    </>
  );
}
