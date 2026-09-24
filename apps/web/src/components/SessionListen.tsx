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
import {
  ContentList, CtaButton, Message, MusicPlayer, TrackButton, useScrollSnap,
  useViewportFill,
} from '@musie/design-system';
import type { ContentListItem } from '@musie/design-system';
import { ArrowDown } from 'lucide-react';
import { Markdown } from './Markdown';
import { useT } from '../i18n/localeContext';
import { useTrackSource } from '../lib/audio';
import { revealTrack } from '../lib/reveal';
import type { Card, Exercise, Track } from '../lib/content';
import { parseMarkdown, plainText } from '../lib/markdown';
import { usePinnedHeader } from '../lib/useHeaderReveal';

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
  /**
   * Forward, out of the step.
   *
   * THE STEP OWNS ITS OWN ROW, which is a departure from every other step and
   * is why it is a prop rather than `WizardPanel`'s `actions`. `WizardPanel`
   * renders `actions` after its children, and this step's children are three
   * full-height views — so the row would land at the foot of the third one,
   * two screens below the step it belongs to.
   *
   * IT USED TO HOLD THE TRANSPORT AS WELL, on the argument that the transport,
   * the details link and *Start reflection* are three things you can do with
   * one recording. They are, but they are not three things of the same KIND:
   * two of them leave the step and one of them is the step. The transport sits
   * with the question now (`.musie-listen__lead`), and this row is the ways
   * out — Ben, 2026-09-23.
   */
  onAdvance: () => void;
  /**
   * The wizard's own Back control, rendered INSIDE this step's row.
   *
   * `WizardPanel` puts `actions` after its children, and this step's children
   * are three full-height views — so Back landed at the foot of the third one,
   * two screens below the step it leaves. Passing the node in keeps every
   * control on the stage where the person is, and keeps the decision about
   * what Back DOES in `Session.tsx`, which is the only place that knows.
   */
  back: React.ReactNode;
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
  exercise, track, sessionId, card, listened, onListened, onAdvance, back,
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
   * THE THREE VIEWPORTS, AND HOW YOU MOVE BETWEEN THEM.
   *
   * The prototype stacks three `100svh` sections. Buttons offer the jumps, and
   * since 2026-09-22 the scroll itself stops at each one.
   *
   * IT DID NOT USED TO, and the argument for that is worth keeping because it
   * was half right: snap can take the scroll away from the person — a thumb
   * that wanted the middle of the details view gets thrown to its edge — and
   * this step's posture, from the soft gate down, is that the person stays in
   * charge. What a phone showed is that free scrolling did not deliver that
   * either: a flick sailed straight through the Störer, which is the one view
   * whose whole job is to interrupt something you have left behind. Being
   * carried past a decision is not being in charge of it.
   *
   * So: `scroll-snap-stop: always` on each view, which caps a gesture at ONE
   * view and makes going on a second, deliberate one. The half of the old
   * argument that still holds is protected by the spec — a view taller than
   * the window relaxes its own snapping, so the details view can still be read
   * through rather than thrown to an edge.
   *
   * `useScrollSnap` rather than a rule in shell.css, because none of the
   * mechanism is specific to this step: `scroll-snap-type` belongs to the
   * scroll container, and for sections in document flow that container is the
   * document. The hook owns `<html>` for exactly as long as this step is
   * mounted, and `musy-snap-view` on each section below is the other half.
   * It is the sibling of `useViewportFill` and was promoted at the same time,
   * on Ben's call, rather than after a second copy existed.
   *
   * `block: 'start'` and smooth behaviour on the buttons, which respects
   * `prefers-reduced-motion` at the platform level in every current engine —
   * and which now lands on exactly the positions the snap uses.
   */
  const { withoutSnapping } = useScrollSnap();
  const stageRef = useViewportFill<HTMLElement>();

  /**
   * AND IT OPENS ON THE STAGE, WHICHEVER WAY YOU GOT HERE — Ben, 2026-09-24.
   *
   * Reported from a card scan: land on `listen` and the page is where the
   * previous step left it rather than at the top. The stage is this step's
   * first view — the question to hold and the button that starts the track —
   * so arriving below it is arriving past the only thing the step asks for.
   *
   * THE SHELL ALREADY SCROLLS TO THE TOP ON EVERY ARRIVAL, AND IT LOSES HERE.
   * `<html>` is a MANDATORY snap container for as long as this step is mounted
   * (`useScrollSnap`), and the engine pulls a plain `window.scrollTo` back to a
   * snap position. MEASURED, `e2e/listen.spec.ts` at 390 x 375: carrying 554px
   * in from the scan step, the shell scrolled to 0 and the page settled at
   * 195 — and with the shell's scroll taken out as well, at 607, which is the
   * engine choosing the nearest view rather than the first. It is not a race
   * the shell can win; the scroll it makes is the scroll snap undoes.
   *
   * TWO ARRIVALS HIDE IT, which is why it survived this long. A small offset
   * snaps to the first view anyway and looks like a reset that worked. And
   * naming a card re-reads the row (`onRescan`), so the page shrinks to the
   * loading note on the way past and the offset is clamped off the bottom.
   * Neither is a guarantee, and neither holds on a landscape phone.
   *
   * SO THE JUMP GOES THROUGH `withoutSnapping`, like every other scroll a
   * control causes on this step: snapping off, scroll, and back on once it has
   * settled. A LAYOUT EFFECT, like `Carousel`'s, so the reset lands before the
   * frame is painted rather than a frame after it. And nothing is suspended
   * when there is nothing to undo — arriving at the top is the common case,
   * and it leaves snapping alone.
   */
  React.useLayoutEffect(() => {
    if (window.scrollY === 0) return;
    withoutSnapping(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  }, [withoutSnapping]);

  /**
   * AND THE HEADER STAYS PUT WHILE IT IS.
   *
   * Everywhere else the shell's header slides away as the reader goes down
   * the page and comes back when they come up (`useHeaderReveal`). Not here,
   * and the reason is the geometry directly above: these three views are
   * sized `--view-block-scrolled` and land `--sticky-block` from the top of
   * the window, and both of those numbers ARE the header's height. Let it
   * leave and a view snaps into place with a header's worth of the previous
   * one showing above it, in a band the snap will not let the reader scroll
   * away.
   *
   * Declared rather than detected: `useScrollSnap` drops its attribute on
   * `<html>` for the length of a programmatic jump, so the one signal that
   * looks like it would do this is absent at precisely the moment a button
   * scrolls a whole view downwards. The hook's own header has the rest.
   */
  usePinnedHeader();
  const warnRef = React.useRef<HTMLElement>(null);
  const detailRef = React.useRef<HTMLElement>(null);

  /**
   * HOW MUCH IS ABOVE THE STAGE, MEASURED — and the measuring lives in the
   * design system now (`useViewportFill`), because none of it was specific to
   * this step. `--view-block` is the window less the APP SHELL; the stage also
   * sits under the exercise's name and the four-step rail, which grow when a
   * long German name wraps. A token cannot hold that number, so the element
   * reports its own offset and the stylesheet subtracts it.
   */
  const scrollTo = (target: React.RefObject<HTMLElement | null>) => {
    const element = target.current;
    if (element === null) return;
    /* THROUGH `withoutSnapping`, OR IT LANDS AND COMES STRAIGHT BACK.
       Ben's phone, 2026-09-24: *Details und Player zeigen* reached the details
       view and was then animated back to the Störer. The hook's header has the
       diagnosis; what matters here is that every scroll a BUTTON causes goes
       through this, and a scroll a thumb makes does not. */
    withoutSnapping(() => element.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  /**
   * BACK TO THE TOP OF THE PAGE, NOT TO THE TOP OF THE STAGE.
   *
   * `scrollIntoView` on the stage looked right and was not: the stage begins
   * ~266px down, under the exercise's name and the four-step rail, so aligning
   * ITS top with the viewport's put the wizard's own header off screen. You
   * landed in the middle of the panel with no idea which step you were on, and
   * how wrong it looked depended on the window height — which is why it read
   * as intermittent rather than as simply aimed at the wrong thing.
   *
   * There is nothing above the stage worth skipping, so the honest target is
   * zero. `window`, not the element, because the thing being returned to is
   * the whole step.
   */
  const scrollToTop = () => {
    withoutSnapping(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  /**
   * ── THE REVEAL, WHICH IS NOW A REQUEST AND NOT A SCREEN — E.5 ───────────
   * It used to be a block with a heading and a button. Both were removed:
   * the player states the name once the gate is open, so a second block
   * announcing it said it twice, and a button asking for something already on
   * screen asked for nothing.
   *
   * What survives is the part that was ever load-bearing — WHEN the request
   * goes out. Two locks, and they are different things:
   *
   *   · the observer is the SCROLL, and since 2026-09-23 it is the ONLY lock.
   *     The request fires when the details view enters the viewport, so a
   *     fetch on mount cannot put the title in the Network tab while the
   *     stage is still playing — which is E.5's done-when, and a claim about
   *     bytes rather than pixels.
   *   · `met`, the gate, USED TO BE THE SECOND ONE, and it is not any more
   *     (Ben, 2026-09-23). Somebody who has scrolled past the Störer — a full
   *     viewport whose only job is to say that the name will influence them —
   *     has chosen the name, and a details view that answers with "Your track"
   *     because a clock is eleven seconds short is withholding it from a
   *     person who already decided. The gate was always soft: it stops you
   *     stumbling into the answer, not choosing it, which is the same sentence
   *     that made the scrubber open it. The Störer is the boundary now, and it
   *     is a better one because it asks rather than counts.
   */
  const [revealed, setRevealed] = React.useState<{ title: string; artist: string } | null>(null);
  const askedRef = React.useRef(false);

  React.useEffect(() => {
    const element = detailRef.current;
    if (element === null || askedRef.current) return undefined;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      /* Disconnect BEFORE the request: the view can cross the viewport
         several times while one is in flight. */
      observer.disconnect();
      askedRef.current = true;
      void revealTrack(sessionId).then((outcome) => {
        if (outcome.kind === 'revealed') {
          setRevealed({ title: outcome.track.title, artist: outcome.track.artist });
        }
        /* `silent` and the failures leave `revealed` null, which is exactly
           right: the player keeps saying "Your track" and the facts below
           carry no artist row. Nothing claims a name that is not there. */
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [sessionId]);

  /**
   * THE RAIL SHOWS ONLY IN THE DETAILS VIEW (Ben, 2026-09-22).
   *
   * On the stage it would offer to scroll up from the top of the step, and on
   * the Störer it would compete with *Continue the exercise*, which is the
   * same journey said better. It is for the one view you can be deep inside
   * with the exercise out of sight.
   */
  const [inDetail, setInDetail] = React.useState(false);
  React.useEffect(() => {
    const element = detailRef.current;
    if (element === null) return undefined;
    const observer = new IntersectionObserver(
      (entries) => setInDetail(entries.some((e) => e.isIntersecting)),
      /* A third of the view is enough to count as being in it — the rail
         should arrive with the player rather than once it is centred. */
      { threshold: 0.33 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /**
   * The step's description, as ONE STRING and without its headline — for the
   * details view below, which lists it as a value rather than rendering it as
   * prose. Memoised because the parse is per-render work for a string that
   * changes only with the locale.
   */
  const instructions = React.useMemo(
    () => plainText(parseMarkdown(exercise.listenMd).filter((b) => b.kind !== 'heading')),
    [exercise.listenMd],
  );

  /**
   * THE DETAILS VIEW'S FACTS, and the order is the answer first.
   *
   * The track's own name is NOT here: the player above states it, and saying
   * it twice on one screen is how a reveal stops feeling like one. What is
   * here is everything the player cannot hold — the artist, the card that
   * drew it, and the exercise's listening words.
   */
  const facts: ContentListItem[] = [
    ...(revealed === null ? [] : [{
      label: t('session.listen.aboutArtist'),
      content: revealed.artist,
    }]),
    ...(card === null ? [] : [{
      label: t('session.scan.yourCard'),
      content: `${card.code} · ${card.feeling}`,
    }]),
    /* THE DESCRIPTION WITHOUT ITS HEADLINE. `ContentList` takes a label and a
       VALUE, and the step's headline is already the label's job — "Listen
       closely, and look at your card" under a heading that says what you were
       listening for is the same sentence twice, run together without
       punctuation between them. So the heading blocks are dropped and the
       prose is flattened; `plainText` is in `lib/markdown.ts` for exactly
       this, because the raw Markdown would show the reader `##`. */
    ...(instructions === '' ? [] : [{
      label: t('session.listen.aboutInstructions'),
      content: instructions,
    }]),
  ];

  return (
    <>
      <div className="musie-listen">
      {/* `musy-snap-view` beside the app's own class on all three, and the
          order matters to nothing but reading: the system class carries the
          snap, the `musie-` one the geometry. On THIS view the two hooks meet
          — `useViewportFill` writes the offset that decides where the snap
          puts it, which is the top of the page rather than the top of the
          stage, so the wizard's header is never scrolled off. */}
      <section ref={stageRef} className="musy-snap-view musie-listen__view musie-listen__view--stage">
      {/* ── ONE GROUP AT THE TOP OF THE VIEW — Ben, 2026-09-23 ─────────────
          The question, the line of small print under it, and the control that
          plays the track. They were three things at three heights: the
          question near the copy, the gate sentence adrift below it, and the
          transport down in the action row with Back and the two ways out of
          the step — so the one thing the stage is FOR sat among the things
          that leave it.

          Together they read as what they are: here is what to hold in mind,
          here is how much of it counts, here is the play button. The row at
          the foot of the view is then only the ways on, which is what an
          action row should be. */}
      <div className="musie-listen__lead">
      {/* THE STEP'S OWN WORDS — `listen_md`, headline and description, at the
          top of the group rather than above it.

          It used to be a `StepText` up here and a `question` <h2> down in the
          lead, on the rule that ONE `question` column was rendered on this
          step and again on the reflect step so the two could not drift apart.
          That rule is gone with the column (2026-09-23): each step now has its
          own headline, because this one asks what picture forms while the
          track plays and the reflection asks what the scene was called — which
          are deliberately not the same question. */}
      <Markdown md={exercise.listenMd} />

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

          {/* A plain <div> so the transport hugs its label instead of being
              stretched the width of the column: `.musy-btn` is inline-flex,
              and a block parent is all that takes. The same one line
              `CardScanner` and the code form already use. */}
          <div>
            <TrackButton
              label={t('session.listen.track')}
              duration={track.durationSeconds}
              position={position}
              playing={playing}
              variant={met ? 'secondary' : 'primary'}
              onTogglePlay={toggle}
              onRestart={toggle}
            />
          </div>
        </div>
      )}

      {/* ── THE WAY ON, DIRECTLY UNDER THE THING IT WAITS FOR — 2026-09-24 ──
          It used to sit in the action row at the foot of the view, beside
          *Back* and the detour. Ben moved it here: the reflection is what the
          listening is FOR, so the control that starts it belongs under the
          control that plays the track, not among the ways out of the step.

          THE BUTTON IS THE GATE NOW. There was a paragraph above the
          transport saying how much was left, and a CTA below saying *Start
          reflection* whatever the clock said — so the condition and the
          control it governed were in two different places, and the button
          named the one thing it could not yet do. One string, on the control
          itself, in both states. `aria-describedby` went with the paragraph:
          the accessible name carries the condition now, which is stronger
          than a description pointing at it.

          The STATE DYNAMICS are untouched. `met` is the same latch, still
          reading POSITION and still not asking who moved it, so the scrubber
          in the details view opens this button exactly as before.

          Wrapped in a plain <div> so it hugs its label rather than stretching
          the column — the same one line the transport above it uses. `wrap`
          because the locked label is a sentence, and German at 393px needs
          two lines for it. */}
      <div>
        <CtaButton
          variant={met ? 'primary' : 'secondary'}
          disabled={!met}
          wrap
          onClick={onAdvance}
        >
          {met
            ? t('session.listen.start')
            : t('session.listen.startLocked', {
                countdown: clock(Math.max(0, gate - Math.floor(position))),
              })}
        </CtaButton>
      </div>

      {/* ── THE DETOUR, UNDER THE WAY ON — 2026-09-24 ──────────────────────
          Third in a column of three, and the order is the argument: play the
          track, start the reflection, or — below both — go and read about it.
          It was at the foot of the view opposite *Back*, which made it look
          like a way OUT of the step. It is not. It is a sideways move within
          the step, and it belongs with the other things you can do to the
          recording.

          A GHOST WITH A DOWN ARROW, and the arrow is the honest part: the
          button does not open anything, it SCROLLS, to the Störer one viewport
          below. Ghost because it is the quietest of the three — a second
          outlined control under the CTA would read as an equal choice.

          `leadingIcon`, because CtaButton takes no trailing one: a trailing
          icon in this system means "this opens something else", which is
          exactly what this button does not do. */}
      <div>
        <CtaButton variant="ghost" leadingIcon={ArrowDown} onClick={() => scrollTo(warnRef)}>
          {t('session.listen.detailsAction')}
        </CtaButton>
      </div>
      </div>

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
      <section ref={warnRef} className="musy-snap-view musie-listen__view musie-listen__view--warn">
        <p className="musie-listen__warn">{t('session.listen.warnText')}</p>
        <div className="musie-listen__warn-actions">
          <CtaButton variant="primary" onClick={scrollToTop}>
            {t('session.listen.warnBack')}
          </CtaButton>
          <CtaButton variant="secondary" onClick={() => scrollTo(detailRef)}>
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
      <section ref={detailRef} className="musy-snap-view musie-listen__view musie-listen__view--detail">
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

        {/* ── WHAT IT WAS, AS FACTS UNDER THE PLAYER ──────────────────────
            No heading and no button, because neither had a job. The player
            above already carries the name once the gate is open — the title
            CHANGING is the reveal — so a second block announcing "what you
            just heard" said it twice, and a button to ask for something
            already on screen asked for nothing.

            The artist, the card and the listening words are the rest of it,
            in the same `ContentList` the detail lightbox uses for the same
            reason: these are label-and-value pairs and the system owns that
            shape. */}
        <ContentList
          label={t('session.listen.aboutHeading')}
          items={facts}
          emptyLabel={t('content.empty')}
        />

        {/* ── THE SIMULATED-PLAYBACK NOTICE, LAST ON THE PAGE — 2026-09-24 ──
            It used to sit between the step's words and the transport, in the
            lead of the stage — which put a sentence about the BUILD in the
            middle of the one thing the step is for, and a tester reading top
            to bottom met it before they met the play button.

            Here it is the last thing on the last view: still findable, still
            true, and no longer in the natural flow of the exercise. `warning`
            rather than a paragraph of small print because what it reports is
            that the player is not playing the real recording — the icon and
            the status word say so before the sentence does.

            `live="off"`: it is in the markup from the moment the file is
            refused, and an alert on arrival announces on a view nobody has
            scrolled to yet. */}
        {simulated && (
          <Message
            className="musie-listen__simulated"
            variant="warning"
            live="off"
            headingLevel={3}
            headline={t('session.listen.simulatedHeadline')}
            text={t('session.listen.simulated')}
          />
        )}
      </section>

      {/* THE SCROLL-UP RAIL, sticky and pinned where the viewports meet, so a
          person who has scrolled down is never further than one control from
          the exercise they left. `pointer-events` is off on the rail and on
          for the button: the rail spans the column and must not eat taps
          meant for the player under it. */}
      <div className="musie-listen__rail" data-visible={inDetail ? 'true' : 'false'}>
        <CtaButton variant="ghost" onClick={scrollToTop}>
          {t('session.listen.scrollUp')}
        </CtaButton>
      </div>

      {/* ── THE WAY BACK, AT THE FOOT OF THE WHOLE STEP — Ben, 2026-09-24 ───
          Not at the foot of the first view, which is where it was and which
          looked like the bottom of the page without being it: below it were
          two more viewports the reader had not been told about, so the one
          control that says "this is the end of the screen" was sitting two
          screens above the end of the screen.

          AFTER THE LAST VIEW, AND DELIBERATELY NOT INSIDE IT. The three
          sections are snap views sized to the window; a fourth thing inside
          one of them makes that view taller than the snapport, which is the
          state WebKit refuses to let a reader rest in. Out here it is ordinary
          document flow after the run, which is the only place a control can
          sit without joining the snapping.

          AND IT IS A SNAP VIEW, THOUGH IT IS ONLY A ROW. That is not
          decoration — without it the control is UNREACHABLE. Measured in
          WebKit at 393×660: `scroll-snap-type: y mandatory` insists the
          document rest on a snap position, and with the run ending at the
          details view the last one is 1198 while the document runs to 1594.
          Asked to scroll to the end, WebKit came back to 1198, the row never
          came on screen, and a click on it timed out. Marked as a member of
          the run, the same scroll rests at 1594 and the row is on screen.

          Short, where the other three are a window tall, and that is fine:
          `scroll-snap-align: start` puts its snap position past the document's
          maximum scroll, which the engine clamps to the end. The run's last
          stop becomes the end of the step, which is what this row is.

          RENDERED WHETHER OR NOT THERE IS A TRACK. It used to be inside
          `track !== null`, which meant an exercise with no recording drew no
          row at all — and `back` lives in here, so that screen had no way out
          of the step. */}
      <div className="musy-snap-view musie-listen__actions">{back}</div>
      </div>
    </>
  );
}
