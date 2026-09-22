/**
 * Step 3 · Listen — the track, the question to hold while it plays, and the
 * gate that decides when the reflection is worth starting.
 *
 * ── THE STAGE ONLY. THE REVEAL IS E.5 ──────────────────────────────────────
 * The prototype's listen step is three stacked viewports: this stage, a "do
 * not get influenced by the track name" interstitial, and a details view with
 * the full player and the track's identity — and reaching the third view IS the
 * reveal. That machinery belongs with the `reveal-track` Edge Function it
 * exists to gate, which is E.5. MOCKUPS.md files it under *A track's title and
 * artist are withheld, deliberately* — named rather than numbered, because
 * that file's numbering shifts when an entry is deleted, and it has been
 * twice.
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
 * ── FOUR CARDS HAVE AUDIO AND FIVE DO NOT, SO BOTH PATHS ARE LIVE ─────────
 * E.4 landed the recordings. `tracks.src` now holds an object key in a
 * private bucket and `useTrackSource` signs it; the `<audio>` gets a real URL
 * and really plays. For the other five `src` is NULL — the schema saying there
 * is no recording, rather than pointing at a file that was never there — and
 * the clock takes over at the track's own `duration_seconds`, which the seed
 * carries precisely so a countdown can render before anything has loaded.
 *
 * SO THE CLOCK IS NO LONGER THE ONLY OUTCOME, and that is what makes
 * `resolving` load-bearing. Three states now reach this component where two
 * did before: a file, no file, and *not yet known*. The third looks exactly
 * like the second to anything that only asks whether a URL is present, and
 * mistaking it means a card with a real recording plays a silent countdown —
 * intermittently, on slow connections. `play()` refuses to start the clock
 * while a URL is in flight, for that reason and no other.
 *
 * ── THE GATE IS STICKY, AND IT HAS TO BE ───────────────────────────────────
 * Ninety seconds, or the whole track if it is shorter. Once met it stays met
 * for the rest of the session: leaving the step and coming back resets the
 * position but not the fact that you listened, and a position-only test would
 * re-lock a step somebody has already done.
 */
import * as React from 'react';
import { ContentList, CtaButton, Message, MusicPlayer, TrackButton } from '@musie/design-system';
import type { ContentListItem } from '@musie/design-system';
import { StepText } from './StepText';
import { useT } from '../i18n/localeContext';
import { useTrackSource } from '../lib/audio';
import { revealTrack } from '../lib/reveal';
import type { RevealOutcome } from '../lib/reveal';
import type { Card, Exercise, Track } from '../lib/content';

/** The simulated clock's tick. Four a second, so the countdown does not stutter. */
const TICK_MS = 250;

function clock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

export interface SessionListenProps {
  exercise: Exercise;
  track: Track | null;
  /** Whose run this is. The reveal asks about a SESSION, never a track. */
  sessionId: string;
  /** Drawn this session, for the details view. Null where none was. */
  card: Card | null;
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
  exercise, track, question, sessionId, card, listened, onListened,
}: SessionListenProps) {
  const t = useT();
  const media = React.useRef<HTMLAudioElement>(null);
  /**
   * THE SIGNED URL, AND WHY THE STEP WAITS FOR IT — E.4.
   *
   * A private bucket has no permanent address, so the file's URL is a request
   * rather than a string. `resolving` is the guard that matters: a URL that
   * has not arrived yet looks exactly like a card with no recording, and
   * concluding the second while the first is true would play a countdown over
   * a track that exists — intermittently, on slow connections, which is the
   * worst way for it to happen.
   */
  const { url, resolving } = useTrackSource(track?.src ?? null);

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
    /* THE URL HAS NOT LANDED YET — do nothing, and specifically do not start
       the clock. The clock is how this step says "there is no recording", and
       a request in flight is not that. Without this guard a card WITH a track
       plays a silent countdown whenever the storage round-trip loses a race
       with the first press, which is intermittent, connection-dependent, and
       looks exactly like correct behaviour. */
    if (resolving) return;

    /* NO FILE, AND WE KNOW IT UP FRONT — so the clock has to be started
       DELIBERATELY here.

       Before E.4 the `<audio>` was always mounted, pointed at a path that did
       not exist, and its refusal is what switched the clock on. Now absence is
       a null `src` and the element is never mounted at all, so there is no
       failure to react to: without this branch the transport flips to playing,
       nothing advances the position, the gate never opens and the listen step
       is a dead end for all five silent cards. The end-to-end walk caught
       exactly that, which is the second time it has caught this same step
       going nowhere. */
    if (url === null) {
      goSimulated();
      setPlaying(true);
      return;
    }

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

  /**
   * SCRUBBING, AND IT IS A PRODUCT DECISION RATHER THAN A CONTROL.
   *
   * Dragging the player's position past the gate OPENS the gate. Ben, 2026-09-22:
   * the ninety seconds is a soft boundary, not an enforced one — the person
   * keeps full control of their own exercise, and somebody who decides to skip
   * ahead has decided that deliberately rather than been prevented.
   *
   * This costs nothing to implement because the gate was already written the
   * right way: it latches on POSITION and never asks who moved it. The element,
   * the simulated clock and now the scrubber are three sources of one fact.
   */
  function seek(seconds: number) {
    const at = Math.max(0, Math.min(duration, seconds));
    const element = media.current;
    if (element !== null && !simulated) element.currentTime = at;
    setPosition(at);
  }

  /**
   * THE THREE VIEWPORTS, AND WHY SCROLLING IS DONE BY BUTTON.
   *
   * The prototype stacks three `100svh` sections and moves between them with
   * controls rather than with scroll-snap. That is the better behaviour and
   * not just the reproduced one: snap takes the scroll away from the person —
   * a thumb that wanted to read the middle of the details view gets thrown to
   * its edge — and this step's whole posture, from the soft gate down, is that
   * the person stays in charge. Free scrolling, with buttons that offer the
   * jumps.
   *
   * `block: 'start'` and smooth behaviour, which respects
   * `prefers-reduced-motion` at the platform level in every current engine.
   */
  const stageRef = React.useRef<HTMLElement>(null);
  const warnRef = React.useRef<HTMLElement>(null);
  const detailRef = React.useRef<HTMLElement>(null);

  const scrollTo = (target: React.RefObject<HTMLElement | null>) => {
    target.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /** Lifted out of the reveal so the player can put the real name in its
   *  title once it is known. Null until the reveal has happened. */
  const [revealed, setRevealed] = React.useState<{ title: string; artist: string } | null>(null);

  /* The card and the exercise's listening words, for the details view. */
  const facts: ContentListItem[] = [
    ...(card === null ? [] : [{
      label: t('session.scan.yourCard'),
      content: `${card.code} · ${card.feeling}`,
    }]),
    ...(exercise.listenText.length === 0 ? [] : [{
      label: t('session.listen.aboutInstructions'),
      content: exercise.listenText.join(' '),
    }]),
  ];

  return (
    <>
      <div className="musie-listen">
      <section ref={stageRef} className="musie-listen__view musie-listen__view--stage">
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
          {!simulated && url !== null && (
            <audio
              ref={media}
              src={url}
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

      {/* ── THE WAY DOWN ──────────────────────────────────────────────────
          The prototype's own wording, and the button that makes the two
          viewports below reachable at all. Secondary: the forward action out
          of this step is the reflection, and this is a detour off it. */}
      {track !== null && (
        <div className="musie-listen__more">
          <CtaButton
            variant="secondary"
            size="guided"
            onClick={() => scrollTo(warnRef)}
          >
            {t('session.listen.detailsAction')}
          </CtaButton>
        </div>
      )}
      </section>

      {/* ══ SCROLL 1 · THE STÖRER ══════════════════════════════════════════
          A full viewport that interrupts rather than a label that warns, and
          the button order is the whole argument: CONTINUE is primary and goes
          back UP to the exercise; seeing the details is the quiet secondary.
          The prototype puts the discouraged path second on purpose, and a
          notice with the same words and no viewport of its own would be a
          footnote people scroll past.

          26ch, centred, muted: the prototype's measure, and it is narrow so
          the sentence lands as one thought rather than as a paragraph. */}
      <section ref={warnRef} className="musie-listen__view musie-listen__view--warn">
        <p className="musie-listen__warn">{t('session.listen.warnText')}</p>
        <div className="musie-listen__warn-actions">
          <CtaButton variant="primary" size="guided" onClick={() => scrollTo(stageRef)}>
            {t('session.listen.warnBack')}
          </CtaButton>
          <CtaButton variant="secondary" size="guided" onClick={() => scrollTo(detailRef)}>
            {t('session.listen.warnOn')}
          </CtaButton>
        </div>
      </section>

      {/* ══ SCROLL 2 · THE DETAILS, WHICH ARE THE REVEAL ═══════════════════
          `MusicPlayer` rather than `TrackButton`, and that swap is the reason
          this view could not exist before E.5: the player's `title` is
          REQUIRED and VISIBLE, and until `reveal-track` there was nothing
          truthful to put in it. Before the gate opens it carries "Your track"
          — what the control IS, the same words the stage announces — and
          after, the recording's own name.

          The scrubber is live throughout, which is what makes the boundary
          soft: drag past ninety seconds and the gate opens, because the gate
          has always latched on position and never asked who moved it. */}
      <section ref={detailRef} className="musie-listen__view musie-listen__view--detail">
        {track !== null && (
          <MusicPlayer
            title={revealed?.title ?? t('session.listen.track')}
            duration={track.durationSeconds}
            position={position}
            playing={playing}
            onTogglePlay={toggle}
            onRestart={toggle}
            onSeek={seek}
            playLabel={t('session.listen.play')}
            pauseLabel={t('session.listen.pause')}
            restartLabel={t('session.listen.restart')}
            seekLabel={t('session.listen.seek')}
          />
        )}

        <TrackReveal sessionId={sessionId} met={met} onRevealed={setRevealed} />

        {/* The card and the exercise's own listening words, which the
            prototype lists here beside the identity. `ContentList` because
            these are label-and-value pairs and the system owns that shape. */}
        <ContentList
          label={t('session.listen.aboutHeading')}
          items={facts}
          emptyLabel={t('content.empty')}
        />
      </section>

      {/* THE SCROLL-UP RAIL, sticky and pinned where the viewports meet, so a
          person who has scrolled down is never further than one control from
          the exercise they left. `pointer-events` is off on the rail and on
          for the button: the rail spans the column and must not eat taps
          meant for the player under it. */}
      <div className="musie-listen__rail">
        <CtaButton variant="ghost" onClick={() => scrollTo(stageRef)}>
          {t('session.listen.scrollUp')}
        </CtaButton>
      </div>
      </div>
    </>
  );
}

/**
 * What you heard, told only once you have heard it — E.5.
 *
 * ── THE GATE IS SOFT, AND THIS IS WHERE THAT IS DECIDED ───────────────────
 * The request does not go out until `met`, and `met` is the same latch the
 * stage uses: ninety seconds of POSITION, however the position got there.
 * Somebody who drags the scrubber past the mark has opened the gate, and that
 * is allowed on purpose (Ben, 2026-09-22) — the boundary keeps people from
 * stumbling into the answer, not from choosing it. Full control of their own
 * exercise, and a decision made deliberately is not the failure the gate
 * exists to prevent.
 *
 * ── STILL SCROLLED TO, AND STILL ASKED FOR ────────────────────────────────
 * Two locks, and they are different. `met` is the gate. The observer is the
 * SCROLL: the request fires when this block enters the viewport, so a fetch on
 * mount cannot put the title in the Network tab while the stage is still
 * playing — which is E.5's done-when, and a claim about bytes. And it is still
 * a button, because arriving is not asking: a thumb on its way down the
 * details view passes through here.
 *
 * It reports the name UPWARD so `MusicPlayer` can stop calling the recording
 * "Your track" and start calling it what it is. That is the reveal — the
 * player's own title changing is more of the moment than a line of text.
 */
function TrackReveal({
  sessionId, met, onRevealed,
}: {
  sessionId: string;
  met: boolean;
  onRevealed: (track: { title: string; artist: string }) => void;
}) {
  const t = useT();
  const anchor = React.useRef<HTMLDivElement>(null);
  const [outcome, setOutcome] = React.useState<RevealOutcome | null>(null);
  const [asked, setAsked] = React.useState(false);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const element = anchor.current;
    /* NOT BEFORE THE GATE. Scrolling here early is ordinary — the details view
       is reachable throughout — so this simply waits rather than refusing. */
    if (element === null || asked || !met) return undefined;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      /* Disconnect BEFORE the request: the block can cross the viewport
         several times while one is in flight. */
      observer.disconnect();
      setAsked(true);
      void revealTrack(sessionId).then((result) => {
        setOutcome(result);
        if (result.kind === 'revealed') {
          onRevealed({ title: result.track.title, artist: result.track.artist });
        }
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [sessionId, asked, met, onRevealed]);

  return (
    <div ref={anchor} className="musie-reveal">
      <h3 className="musie-reveal__heading">{t('session.listen.revealHeading')}</h3>

      {!met ? (
        /* The honest state before the gate: not an error, not a tease. It says
           what opens it, and the scrubber beside it means that is a choice
           rather than a wait. */
        <p className="musie-note">{t('session.listen.revealTooEarly')}</p>
      ) : !shown ? (
        <>
          <p className="musie-note">{t('session.listen.revealHint')}</p>
          <div>
            <CtaButton
              variant="secondary"
              loading={asked && outcome === null}
              loadingLabel={t('session.listen.revealWorking')}
              onClick={() => setShown(true)}
            >
              {t('session.listen.revealAction')}
            </CtaButton>
          </div>
        </>
      ) : (
        <p className="musie-reveal__answer">
          {outcome === null ? t('session.listen.revealWorking')
            : outcome.kind === 'revealed'
              ? t('session.listen.revealBy', {
                  title: outcome.track.title,
                  artist: outcome.track.artist,
                })
            : outcome.kind === 'silent' ? t('session.listen.revealSilent')
            : outcome.kind === 'tooEarly' ? t('session.listen.revealTooEarly')
            : t('session.listen.revealFailed')}
        </p>
      )}
    </div>
  );
}
