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
  ContentList, CtaButton, Lightbox, Message, MusicPlayer, TrackButton,
  useScrollSnap, useViewportFill,
} from '@musie/design-system';
import type { ContentListItem, LightboxOrigin } from '@musie/design-system';
import { ArrowDown } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { Markdown } from './Markdown';
import { useT } from '../i18n/localeContext';
import { useTrackSource } from '../lib/audio';
import { revealTrack } from '../lib/reveal';
import { markListened } from '../lib/session';
import type { Card, Exercise, Track } from '../lib/content';
import { bodyOnly, headingOnly, parseMarkdown, plainText } from '../lib/markdown';
import { usePinnedHeader } from '../lib/useHeaderReveal';

/** The simulated clock's tick. Four a second, so the countdown does not stutter. */
const TICK_MS = 250;

/**
 * The step's picture, as a bare path — the same shape and the same reason as
 * `BRAND_MARK_SRC`: the app serves `public/assets/**` at `/assets/**`, and a
 * document-relative URL would resolve against whatever route is showing.
 *
 * NOT A CONTENT COLUMN. The exercise images on `/exercises` come from
 * `exercises.image_url` because there is one per exercise and the row decides
 * which. This is one picture belonging to one STEP of the flow, the same for
 * every exercise, so it is the app's own asset and not the content's — no
 * column, no migration, no per-locale alt in the database.
 */
const INFOGRAPHIC_SRC = '/assets/web/infographics/infographic-listen-and-see.webp';

/**
 * M:SS inside a sentence — `clock` unpadded.
 *
 * The same split the design system makes in `MusicPlayer.tsx`: padding holds a
 * READOUT still as it crosses a minute, and prose has no column to hold. "1:30
 * Minuten" is how a minimum is said; "01:30 Minuten" is how a stopwatch says
 * it. Seconds stay padded, because 1:5 is not a time.
 */
function spoken(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function clock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

/**
 * ── THE STEP'S TWO VIEWS, IN THE URL — Ben, 2026-10-07 ─────────────────────
 *
 * `/session/:id/listen?overview` is the stage and `?focus` is the full-screen
 * listening sheet. Valueless tokens, which is what Ben asked for and what they
 * are: this is a MODE, not a value, and `?view=focus` would invite a third
 * value that does not exist. `URLSearchParams` reads a bare token as a key
 * with an empty value, so `.has()` answers it without any parsing of our own.
 *
 * WHY IT IS IN THE URL AT ALL. Three things fall out of it and none of them
 * are free otherwise: the browser's own Back closes the sheet, a tester can be
 * sent straight to the thing being tested, and the sheet survives a reload
 * instead of dropping somebody back on the stage mid-exercise.
 *
 * `?overview` IS WRITTEN ON ARRIVAL, by replace rather than push — the step
 * has a view whether or not the URL says so, and the address should say which.
 * Replace, so Back from the stage still leaves the step rather than cycling
 * through a parameter the person never set.
 */
const FOCUS = 'focus';
const OVERVIEW = 'overview';

/**
 * The same search string with exactly one of the two view tokens on it.
 *
 * Both are dropped before one is added, so the two can never both be present —
 * a hand-typed `?focus&overview` resolves rather than rendering two states.
 * Anything else in the query is preserved and goes back in front, because this
 * step does not own the whole query string and a later campaign parameter
 * should survive a press on the transport.
 */
function withView(search: string, view: typeof FOCUS | typeof OVERVIEW): string {
  const rest = new URLSearchParams(search);
  rest.delete(FOCUS);
  rest.delete(OVERVIEW);
  const others = rest.toString();
  return others === '' ? `?${view}` : `?${others}&${view}`;
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
   * ── THE TRACK IS RELEASED ON THE WAY OUT — 2026-09-30 ────────────────────
   *
   * The next step opens a microphone. This one has just been playing audio
   * through an `<audio>` element, and on iOS those two facts share one audio
   * session: a capture request renegotiates the route from playback to
   * play-and-record, which is the first domino in the Bluetooth branch of
   * docs/VOICE-CAPTURE-FIX.md §3.2.
   *
   * THIS IS NOT A PROVEN BUG AND IS NOT WRITTEN UP AS ONE. React detaches the
   * element and nulls the ref on unmount, and detaching normally stops
   * playback on its own — the only `pause()` before this was the reader's, in
   * `toggle()`. What this buys is DETERMINISM instead of garbage collection:
   * three lines that release the iOS audio session at a moment this file
   * chooses, rather than whenever the element is collected. Cheap, and it
   * removes the question rather than answering it.
   *
   * `removeAttribute('src')` as well as `pause()`, because a paused element
   * with a source can still hold the session; emptying it is what actually
   * lets go. `load()` after it is what makes WebKit act on the change.
   */
  React.useEffect(() => () => {
    const element = media.current;
    if (element === null) return;
    element.pause();
    element.removeAttribute('src');
    element.load();
  }, []);
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
   * ── THE LISTENING VIEW — the LISTEN-EXPERIMENTS branch ───────────────────
   *
   * The press on the transport does not just start a track any more: the
   * control becomes a full-screen sheet, and the track plays in there with the
   * exercise's words, the minimum time counting down, and the way on.
   *
   * WHY A SHEET AND NOT A FOURTH SNAP VIEW. The three views below this one are
   * places you can BE in the step, reachable by a thumb, and what you left is
   * always one scroll above you. This is not that. It is the step's one task,
   * with everything else taken off the screen for the length of it — which is
   * a modal's job and not a scroll position's. It also has to be impossible to
   * flick past, and a snap view is exactly as flickable as its neighbours.
   *
   * `Lightbox surface="immersive"`, SO THE APP OWNS NONE OF THE HARD PART.
   * Focus moves in and comes back to this button, the three views behind it go
   * inert, the page scroll locks, Escape closes. The frame is the design
   * system's because a screen styling a panel popup into a full-screen one is
   * reaching into a component's geometry (rule 1, L7) — so the variant went
   * into the component, which is where `CtaButton.align` came from too.
   *
   * ── THE ORIGIN IS MEASURED AT THE PRESS ──────────────────────────────────
   * `origin` is the transport's rect and the sheet's clip opens out of it, so
   * the button becomes the screen rather than summoning one. A rect is
   * viewport-relative and this step is three viewports tall, so measuring on
   * mount would open the sheet out of a button that has since scrolled away.
   * Hence: in the handler, every time.
   *
   * NULL IS FINE and is not a failure path — the sheet opens from the centre
   * of the viewport, which is what the design system does when no control
   * claims to have opened it.
   */
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  /* DERIVED, NOT HELD. The sheet being open IS `?focus` being on the address,
     so there is no second boolean to disagree with it — and the browser's own
     Back closes the sheet for free, because it changes the one thing that
     decides. */
  const immersive = searchParams.has(FOCUS);

  /* THE ADDRESS SAYS WHICH VIEW, even when nobody chose one. Replace, not
     push: arriving is not a step the Back button should have to walk through.
     It leaves `?focus` alone, so a deep link opens the sheet.

     ── AND IT ONLY SPEAKS FOR ITS OWN STEP ───────────────────────────────
     MEASURED, and it shipped wrong for one run: pressing *Start reflecting*
     left the address at `/reflect?overview`. The step is URL-DRIVEN, so the
     path changes a render before this component unmounts — and in that frame
     the effect saw a location with no view token on it and dutifully wrote one
     onto the step it was leaving. A parameter this file owns had leaked onto a
     screen that has never heard of it.

     So the guard is the one thing that makes the question meaningful: these
     two views belong to `/listen`, and anywhere else the answer is that there
     is nothing to normalise. */
  React.useEffect(() => {
    if (!location.pathname.endsWith('/listen')) return;
    if (searchParams.has(FOCUS) || searchParams.has(OVERVIEW)) return;
    navigate({ search: withView(location.search, OVERVIEW) }, { replace: true });
  }, [searchParams, location.pathname, location.search, navigate]);

  const [origin, setOrigin] = React.useState<LightboxOrigin | null>(null);
  /**
   * The transport's own box, for that measurement.
   *
   * ON THE WRAPPER AND NOT ON THE BUTTON, because `TrackButton` forwards no
   * ref — and the wrapper is `inline-size: fit-content`, so the two rects are
   * the same one. That is also why the `<div>` that used to be there only to
   * make the button hug now carries a class: reaching through it with
   * `querySelector('button')` would be this screen asking about a component's
   * internals, and a wrapper that hugs is this screen's own box to measure.
   */
  const transportRef = React.useRef<HTMLDivElement>(null);

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
  /* WHAT THE LISTENING VIEW COUNTS DOWN. The same number the stage's locked CTA
     interpolates, hoisted because two controls now read it. `Math.floor` on the
     position rather than `Math.round`, so the figure only reaches 00:00 at the
     moment `met` flips — a rounded one shows 00:00 for half a second while the
     way on is still disabled, which reads as a stuck button. */
  const remaining = Math.max(0, gate - Math.floor(position));
  /* WHAT IS LEFT OF THE TRACK, which is a different number from the one above:
     the counter counts the EXERCISE's minimum down, and this is the recording.
     They are only the same when the gate is the whole piece. */
  const trackLeft = Math.max(0, duration - Math.floor(position));

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

    /* THE PRESS IS RECORDED — 2026-10-02, for *Discovered music*, which lists
       only the recordings somebody actually played.

       BELOW THE `resolving` GUARD, so a press that does nothing records
       nothing — this is "the track started", not "a finger landed here".

       ABOVE the simulated branch, so a press on a silent card is stamped too,
       and that is the right place to draw it: whether a recording EXISTS is
       `tracks.src`, which the listing already filters on, and asking this one
       call to also judge that would put the same rule in two places.

       NOT AWAITED. Playback must not wait on a round trip, and `markListened`
       does not throw — a failure is a warning and a missing row on one screen,
       never an interrupted exercise. First press wins, enforced in SQL. */
    void markListened(sessionId);

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

  /**
   * PAUSE AND RESTART, LIFTED OUT OF `toggle` — because three things pause now
   * and two restart, where one of each did before.
   *
   * Pausing: the transport inside the listening view, and LEAVING that view,
   * which is the new one — a sheet that closes while the track plays on leaves
   * music coming out of a screen that is not showing a player. Restarting: the
   * transport, and entering the view on a track that has already ended.
   *
   * Three copies of `if (element !== null && !simulated)` is three places to
   * forget the `simulated` half, and forgetting it is how the clock and the
   * element end up both driving `position`.
   */
  const pause = React.useCallback(() => {
    const element = media.current;
    /* THE REF, NOT THE STATE. This is held by an effect that fires on a URL
       change, so it can be called from a closure older than the last render —
       which is the same reason the element's own handlers read the ref. */
    if (element !== null && !simulatedRef.current) element.pause();
    setPlaying(false);
  }, []);

  /* Ended restarts from zero: the glyph promised a restart, so resuming from
     the end would be a lie. */
  function restart() {
    const element = media.current;
    setPosition(0);
    if (element !== null && !simulated) element.currentTime = 0;
    play();
  }

  function toggle() {
    if (duration > 0 && position >= duration) {
      restart();
      return;
    }
    if (playing) {
      pause();
      return;
    }
    play();
  }

  /**
   * ── INTO THE LISTENING VIEW, AND OUT OF IT ───────────────────────────────
   *
   * THE STAGE'S TRANSPORT NO LONGER TOGGLES ANYTHING. It opens the view, and
   * the view is where the track is played, paused and restarted. That is the
   * whole move: one control that means "start listening", and a screen that
   * means "you are listening".
   *
   * It follows that LEAVING PAUSES — the X, Escape, the scrim, all of them
   * through `onOpenChange`. Three reasons, in order:
   *
   *   · a sheet that closes over a track still playing leaves music coming out
   *     of a screen with no transport on it, and the only way back to a pause
   *     button is to re-open the sheet;
   *   · it makes the stage's button honest. With playback confined to the
   *     sheet, `playing` is always false behind it, so the glyph is the
   *     invitation it reads as rather than a Pause that opens a window;
   *   · and nothing is lost by it. `listened` is latched upward the moment the
   *     gate is met and is held by the SESSION, so coming back out and going
   *     back in resets neither the position nor the fact that you listened.
   *
   * ENTERING NEVER PAUSES, which is why this is not `toggle`: a press that is
   * meant to begin something must not stop it, and an ended track restarts
   * rather than opening a sheet with 00:00 and nothing happening.
   */
  function enterImmersive() {
    const rect = transportRef.current?.getBoundingClientRect() ?? null;
    setOrigin(rect === null ? null : {
      top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left,
    });
    /* PUSHED, so the browser's Back is one of the ways out of the sheet. */
    navigate({ search: withView(location.search, FOCUS) });

    if (duration > 0 && position >= duration) restart();
    else if (!playing) play();
  }

  /**
   * CLOSING IS A NAVIGATION AND NOTHING ELSE — the pause is the effect below.
   *
   * There are four ways out of the sheet: the X, Escape, the scrim, and the
   * browser's Back. Only the first three come through `onOpenChange`, so a
   * close that paused HERE would leave the track playing on the one route that
   * does not. One rule, hung on the thing all four change.
   *
   * `location.key === 'default'` is `useCloseOverlay`'s test, for the same
   * case: a cold deep link straight to `?focus` has nothing behind it, so
   * going back would leave the app. Then the view is replaced instead.
   */
  function leaveImmersive() {
    if (location.key === 'default') {
      navigate({ search: withView(location.search, OVERVIEW) }, { replace: true });
      return;
    }
    navigate(-1);
  }

  /**
   * THE TRACK IS RELEASED WHEN THE SHEET GOES, however it went.
   *
   * Playback lives in the sheet, so a sheet that closes over a running track
   * leaves music coming out of a screen with no transport on it — and the only
   * way back to a pause button would be to open the sheet again.
   *
   * It fires on the FALLING EDGE only. Hung on `immersive` alone it would also
   * run on mount, pausing a track nobody had started yet and clearing `playing`
   * under the stage's own transport.
   */
  const wasImmersive = React.useRef(false);
  React.useEffect(() => {
    if (wasImmersive.current && !immersive) pause();
    wasImmersive.current = immersive;
  }, [immersive, pause]);

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
   * ── WHAT THE SHEET SAYS ONCE THE MINIMUM IS DONE — Ben, 2026-10-07 ──────
   *
   * Two sentences: what was achieved, and the rest of the track offered back
   * rather than required. BOTH FIGURES ARE MM:SS, Ben's call — the gate is the
   * same number the counter above has just finished counting, so saying it
   * here in a different unit would read as a different number.
   *
   * `{gate}` IS INTERPOLATED AND NEVER WRITTEN OUT. It is
   * `exercises.listen_gate_seconds` and it varies: 90 for the two built
   * exercises, 60 and 180 for the three that are not. A hardcoded "90 Sekunden"
   * is correct today and silently wrong the first time somebody opens Sound
   * Journey.
   *
   * AND THE TRACK CAN ALREADY BE OVER. A recording shorter than the gate is
   * capped to its own length, and the scrubber in the details view can be
   * dragged to the end — so "carry on for another 00:00" is a real state and
   * not a hypothetical. The second sentence then says so and points at the
   * replay the transport is already offering.
   */
  /* THE ENDED SENTENCE NAMES THE WHOLE TRACK, not the minimum (Ben,
     2026-10-09). It used to congratulate you for `{gate}` however far you had
     actually gone — so somebody who heard a four-minute recording end was told
     they had stayed with it for ninety seconds. If the track is over, what was
     heard is the track, and `{total}` is that. */
  const doneText = trackLeft <= 0
    ? t('session.listen.immersiveDoneEnded', { total: spoken(duration > 0 ? duration : gate) })
    : t('session.listen.immersiveDone', { gate: spoken(gate), remaining: spoken(trackLeft) });

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
      {/* THE INSTRUCTION ALONE — `headingOnly`, since 2026-10-07.
          The question that used to sit under it has moved into the sheet,
          where it is the headline. It is withheld here on purpose: on the
          stage nothing has been listened to yet, so a question about what you
          are hearing has nothing to be asked about. */}
      <Markdown md={exercise.listenMd} arrange={headingOnly} />

      {/* ── THE PICTURE, BETWEEN THE WORDS AND THE CONTROLS — Ben, 2026-10-07 ─
          A card in one hand and the phone playing on the table: the whole
          step in one image, directly under the sentence that asks for it and
          directly above the button that starts it.

          ITS OWN SEPARATION, NOT THE GROUP'S. The lead is a column at
          `--space-gap-related` because its three parts are one thought; a
          picture at that distance touches the copy above and the transport
          below. `--space-inset-card` is the spacing Ben asked for, and the
          margin is the DIFFERENCE between the two — the flex gap is already
          there and the two would otherwise add up. §L14.1: arithmetic over
          Layer 1 tokens, never a literal.

          `alt` from the catalogue like every other string (CLAUDE.md 7), and
          described rather than silent: unlike the diary's marks, nothing
          beside it says what is in it — the step's own copy is about the
          sounds, not about the scene. */}
      <img
        className="musie-listen__infographic"
        src={INFOGRAPHIC_SRC}
        alt={t('session.listen.infographicAlt')}
        /* Width and height so the column does not reflow around it while it
           loads — the stage is a measured full view, and a picture that
           arrives late would shift the transport under a thumb already on its
           way to it. The CSS gives it the column's width; these two only fix
           the ratio it reserves. */
        width={1672}
        height={941}
        decoding="async"
      />

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

          {/* THE WRAPPER HUGS, AND NOW IT IS ALSO WHAT GETS MEASURED.
              It was a plain <div> so the transport hugged its label instead of
              being stretched the width of the column — `.musy-btn` is
              inline-flex, and a block parent is all that takes, the same one
              line `CardScanner` and the code form already use.

              It has a class now because the listening view opens OUT OF this
              control and needs its rect. `TrackButton` forwards no ref, and
              reaching through to the `<button>` with a `querySelector` would be
              this screen asking about a component's internals (L7). So the
              wrapper is `inline-size: fit-content` instead: it hugs exactly as
              before, its box and the button's are the same box, and the one
              being measured is this screen's own.

              `onTogglePlay` AND `onRestart` BOTH ENTER THE VIEW, and neither
              toggles. The press means "start listening" in all three transport
              states; what it does about the track — begin, resume, start over —
              is `enterImmersive`'s to decide. */}
          <div ref={transportRef} className="musie-listen__transport">
            {/* IT CARRIES THE MINIMUM NOW, AND THAT IS WHY THERE IS ONE
                CLOCK (2026-10-09). This button used to print duration-minus-
                position while the CTA under it printed gate-minus-position:
                02:48 beside 01:30, two countdowns disagreeing in one glance.
                Passing `gateSeconds` moves the number INTO the word and
                suppresses the trailing readout by construction — see the prop's
                own note. Every visible string is passed (rule 7): without the
                three transport words this fell through to the design system's
                GERMAN catalogue defaults on an English screen. */}
            <TrackButton
              label={t('session.listen.track')}
              duration={track.durationSeconds}
              position={position}
              playing={playing}
              gateSeconds={gate}
              variant={met ? 'secondary' : 'primary'}
              pauseLabel={t('session.listen.pause')}
              restartLabel={t('session.listen.restart')}
              unstartedLabel={t('session.listen.listenUnstarted')}
              belowMinimumLabel={t('session.listen.listenBelow')}
              pastMinimumLabel={t('session.listen.listenPast')}
              onTogglePlay={enterImmersive}
              onRestart={enterImmersive}
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
        {/* ── THE PRIMARY SWAPS ONCE THE MINIMUM IS MET (Ben, 2026-10-09) ──
            *Zurück zum Hören* is the right offer while there is still
            listening owed, and the wrong one after: the name used to say
            *Übung fortsetzen* and scroll you upward, which is the only place
            in the wizard where Continue does not advance a step. Renamed, and
            then replaced — past the gate the forward offer is the reflection,
            and the back-to-listening button is what it replaces.

            IT IS A SWAP, NOT A SECOND CONTROL, and that distinction is the
            whole licence for putting it here. The board forbids *Start
            reflection* standing BESIDE the back button — "a second forward
            control re-creates the exact split that was removed" — and there is
            never more than one primary in this row.

            `session.listen.start` is the stage's own forward word, said here
            rather than invented again: one offer, one sentence, two places. */}
        <div className="musie-listen__warn-actions">
          {met ? (
            <CtaButton variant="primary" onClick={onAdvance}>
              {t('session.listen.start')}
            </CtaButton>
          ) : (
            <CtaButton variant="primary" onClick={scrollToTop}>
              {t('session.listen.warnBack')}
            </CtaButton>
          )}
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

      {/* ══ THE LISTENING VIEW ═════════════════════════════════════════════
          A SIBLING OF THE THREE VIEWS, NOT A FOURTH ONE — and portaled out of
          here anyway, so where it sits in this tree is a statement about what
          it IS rather than about where it lands. The three above are places
          you can be in the step; this is the step's one task with everything
          else taken off the screen for the length of it.

          IT IS MOUNTED WITH `track !== null` AND NOT WITH `immersive`. base-ui
          renders nothing while `open` is false, so keeping it here costs a
          closed Dialog.Root and buys the sheet its enter animation — a node
          that appears in the same frame it is asked to animate has no first
          frame to animate FROM. With no recording there is no transport to
          open it and nothing to play, so then it is genuinely absent.

          `titleHidden`: the sheet's visible heading is the exercise's own, out
          of `listen_md`. The dialog still needs a NAME (4.1.2) and that name is
          chrome — a different string on purpose, because two headings with one
          accessible name read as a stutter and make `getByRole('heading')`
          ambiguous, which is what `SessionRunningLightbox` is written up for.

          NO `trigger` AND NO `finalFocus`, which is the same call
          `SessionRunningLightbox` makes: a press opened this, the control that
          took the press is still mounted behind the sheet, and base-ui returns
          focus to the element it came from. The Lightbox's own docblock calls
          that fallback "lucky" rather than guaranteed — it is guaranteed here
          precisely because the stage is still there, inert, under the sheet. */}
      {track !== null && (
        <Lightbox
          open={immersive}
          surface="immersive"
          origin={origin}
          title={t('session.listen.immersiveTitle')}
          titleHidden
          closeLabel={t('session.listen.immersiveClose')}
          onOpenChange={(next) => {
            if (!next) leaveImmersive();
          }}
        >
          {/* ONE ELEMENT, because the immersive surface gives its only child
              the full height to arrange and leaves the arranging to the
              caller. Three siblings here would get the ordinary stacking and
              the foot of the sheet would sit under the instruction. */}
          <div className="musie-immersive">
            {/* THE QUESTION ALONE — `bodyOnly`, the mirror of the stage's
                `headingOnly`, since 2026-10-07.

                Between them the two states split one `listen_md`: the stage
                shows the INSTRUCTION, because nothing has been listened to yet
                and a question about what you are hearing has nothing to be
                asked about; the sheet shows the QUESTION, because the track is
                playing and that is the thing to hold.

                IT USED TO SHOW BOTH, run together into one heading. The
                instruction has already been read on the stage, and saying it
                again here in display type made the question the smaller half
                of its own screen. */}
            <div className="musie-immersive__lead">
              <Markdown md={exercise.listenMd} arrange={bodyOnly} />
            </div>

            {/* ── THE MINIMUM, AS THE LARGEST THING ON THE SHEET ──────────
                `role="timer"` rather than a live region, and the two are
                opposites: a timer's implicit `aria-live` is OFF, so the figure
                is there to be read when somebody asks for it and is not
                announced four times a second over the track it is counting.

                THE CAPTION CARRIES THE MEANING, because the figure cannot. A
                number alone on a listening screen reads as how long is LEFT;
                what this is, is how much longer is the floor. So the caption
                says so, and says the other thing once the floor is reached —
                which is also the only announcement here, and it happens once.

                The figure stops at 00:00 and does not go on to count the rest
                of the track. It is one number with one meaning: a second
                meaning arriving when the gate opened would be a worse clock
                than no clock. */}
            {/* ── THE COUNTDOWN, AND THE TRANSPORT BESIDE IT ─────────────
                One row: the figure, then the control, to its right — Ben,
                2026-10-07. The transport used to stand at the foot of the
                sheet with the way on; it belongs with the thing it moves.

                THE FIGURE GOES QUIET AT 00:00. It has finished its job, and a
                figure still shouting 00:00 in display type keeps the eye on a
                number that has stopped meaning anything. Muted, not removed:
                the layout holds, and what it says is now a RESULT rather than
                a demand. `data-done` rather than a second class, because it is
                a state of this element and not a different element. */}
            <div className="musie-immersive__clock">
              <div className="musie-immersive__meter">
                <p
                  className="musie-immersive__time"
                  role="timer"
                  data-done={met ? 'true' : undefined}
                >
                  {clock(remaining)}
                </p>

                {/* THE `min` RUNG, so it stands exactly as high as a `min` CTA
                    — 36px by the same construction, not by a copied number.
                    Beside a 40–64px figure it is the quiet half of the row,
                    which is right: the figure is what is being read and this
                    is what interrupts it.

                    GHOST AND NO READOUT, as before. The sheet is already
                    counting, larger and for a different reason, and the
                    track's own remainder is said once the minimum is done, in
                    a sentence. */}
                <TrackButton
                  label={t('session.listen.track')}
                  duration={track.durationSeconds}
                  position={position}
                  playing={playing}
                  variant="ghost"
                  size="min"
                  hideTimer
                  onTogglePlay={toggle}
                  onRestart={toggle}
                  playLabel={t('session.listen.play')}
                  pauseLabel={t('session.listen.pause')}
                  restartLabel={t('session.listen.restart')}
                />
              </div>

              <p className="musie-immersive__caption">
                {met ? doneText : t('session.listen.immersiveCountdown')}
              </p>
            </div>

            {/* ── THE WAY ON, AT THE TRAILING EDGE — Ben, 2026-10-07 ──────
                Right-aligned, and alone in its row now that the transport has
                moved up beside the countdown. The alignment is the ROW's, not
                the button's: `CtaButton.align` moves the LABEL inside the
                control, which is a different thing and would leave the box
                where it was.

                Gated by the same latch as the stage's — `met`, which still
                reads POSITION and still does not ask who moved it, so the
                scrubber in the details view opens this button too.

                IT DOES NOT REPEAT THE COUNTDOWN. `startLocked` out on the
                stage interpolates the figure because the stage has nowhere
                else to say it; here the figure is the largest thing on the
                screen, and saying it twice is how a number stops being read.
                So the locked label says what to do instead.

                `onAdvance` NAVIGATES, and the step it navigates to has no view
                parameter — so the sheet closes because the address it was
                reading is gone. Closing it first as well would push a second
                history entry between the two. */}
            <div className="musie-immersive__actions">
              <CtaButton
                variant={met ? 'primary' : 'secondary'}
                disabled={!met}
                wrap
                onClick={onAdvance}
              >
                {met
                  ? t('session.listen.start')
                  : t('session.listen.immersiveLocked')}
              </CtaButton>
            </div>
          </div>
        </Lightbox>
      )}
    </>
  );
}
