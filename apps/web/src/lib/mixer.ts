/**
 * The listening type's player: one recording, and the same recording without
 * its music.
 *
 * ── WHAT THE AUDIO ACTUALLY IS, AND WHY THIS IS NOT A MIXER ───────────────
 * Written on 2026-10-11 as a mixer — two stems at final mix level, summed at
 * unity, the switch silencing one of them. The delivery on 2026-10-12 is not
 * that:
 *
 *   BodyScan - mit Klang.mp3    3:03   the exercise AS MIXED
 *   BodyScan - ohne Klang.mp3   3:03   the same recording, bed REMOVED
 *
 * Those are a mix and a mix-minus-music. Summing them plays the guidance
 * TWICE, a few milliseconds apart — so they are ALTERNATIVES, and the switch
 * is a HANDOVER rather than a fade. The file name stays `mixer` because the
 * thing it owns is still "what the listen step is hearing", and renaming a
 * module to describe its implementation is how a file ends up called
 * `twoAudioElements`.
 *
 * ── TWO PLAIN `<audio>` ELEMENTS, AND ONLY EVER ONE PLAYING ───────────────
 * No `AudioContext`, and the reason survived the rewrite: an `AudioContext` is
 * suspended when iOS backgrounds the page, and suspending it stops the sound.
 * This is a twelve-to-fifteen-minute exercise people lie down for with the
 * screen locked.
 *
 * Measured on an iPhone before either version was written (`/dev/experiment-mixer`,
 * 2026-10-11): two elements play together and muting one works. The swap needs
 * strictly less than that — one element sounding, one paused and buffered —
 * so the measurement covers it with room to spare.
 *
 * ── THE HANDOVER IS EXACT BECAUSE THE FILES ARE THE SAME LENGTH ───────────
 * `music:upload` refuses a pair that differs by more than 250 ms, and the two
 * delivered pairs are identical to the sample. So the switch is: read the
 * playing element's `currentTime`, write it to the other one, play that, pause
 * this. At 00:31 you are still at 00:31 — exactly, not approximately.
 *
 * ── THE SCREEN KEEPS ITS OWN CLOCK ────────────────────────────────────────
 * This hook reports `onTime` and owns no `position` state. `SessionListen`
 * already holds that, along with the gate latch, the simulated clock for cards
 * with no recording, and the scrubber — three things that read a position and
 * do not care who moved it.
 */
import * as React from 'react';
import { forgetTrackUrl, signedTrackUrls } from './audio';
import { useAsync } from './useAsync';

export interface MixOptions {
  /** Object key for the recording that plays. The only required file. */
  mixedSrc: string | null;
  /** The same cut without its music — what the switch hands over to. */
  voiceSrc: string | null;
  /** The switch. True means *instructions only*. */
  musicMuted: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onTime?: (seconds: number) => void;
  onEnded?: () => void;
  /** A file failed to load. The caller falls back to its simulated clock. */
  onError?: () => void;
  /**
   * `play()` WAS REFUSED — and this is a different event from `onError`.
   *
   * A load error is "there is no playable file"; a refused `play()` is "the
   * browser would not start it", which is the autoplay policy, a codec it
   * declined, or a gesture it did not trust. Both end at the simulated clock,
   * but only this one means the person has ALREADY PRESSED PLAY — so the
   * caller has to start its clock as well as switch to it.
   *
   * Collapsing the two is the regression this prop exists to prevent: the
   * single-element version of this step did `play().catch(() => { simulate();
   * setPlaying(true); })`, the first rewrite kept only the first half, and
   * sixteen end-to-end walks found a transport that sat on `paused` forever.
   */
  onRefused?: () => void;
}

export interface Mix {
  /**
   * A URL is in flight. LOAD-BEARING, and the reason this is not just
   * `playable === false`: the listen step falls back to a simulated clock when
   * there is no file, and "the URL has not arrived yet" looks exactly like
   * "there is no file" to anything that only checks for a URL. Getting that
   * wrong plays a countdown over a recording that exists, on a slow
   * connection, intermittently.
   */
  resolving: boolean;
  /** There is something to play. */
  playable: boolean;
  /** A guidance-only cut exists, so the switch has somewhere to hand over to. */
  hasVoiceOnly: boolean;
  play: () => void;
  pause: () => void;
  restart: () => void;
  seek: (seconds: number) => void;
}

export function useMix({
  mixedSrc, voiceSrc, musicMuted, onPlay, onPause, onTime, onEnded, onError, onRefused,
}: MixOptions): Mix {
  /* ONE BATCH, so the pair costs one round trip rather than two — and keyed on
     both object keys, so changing an answer on the Einsteigen step re-signs
     rather than re-using the previous cut's URLs. */
  const { data: urls, loading } = useAsync(
    () => signedTrackUrls([mixedSrc, voiceSrc]),
    `mix:${mixedSrc ?? 'none'}:${voiceSrc ?? 'none'}`,
  );

  const mixedUrl = mixedSrc === null ? null : urls?.get(mixedSrc) ?? null;
  const voiceUrl = voiceSrc === null ? null : urls?.get(voiceSrc) ?? null;

  const mixed = React.useRef<HTMLAudioElement | null>(null);
  const voice = React.useRef<HTMLAudioElement | null>(null);
  /** Which element the clock, the transport and the callbacks belong to. */
  const active = React.useRef<HTMLAudioElement | null>(null);
  /* One retry for an expired token, and one only — a loop against a dead
     object would be a request every few seconds for the rest of the session. */
  const retried = React.useRef(false);

  /* The callbacks live in a ref so the element effect does not re-run — and
     therefore does not tear down a playing element — every time the screen
     re-renders with a new closure. */
  const handlers = React.useRef({ onPlay, onPause, onTime, onEnded, onError, onRefused });
  handlers.current = { onPlay, onPause, onTime, onEnded, onError, onRefused };

  /* ── the elements ────────────────────────────────────────────────────── */
  React.useEffect(() => {
    if (mixedUrl === null) return undefined;

    const both: HTMLAudioElement[] = [];

    const make = (url: string) => {
      const element = new Audio(url);
      /* `metadata` rather than `none`: a few KB per file, and it is what makes
         `duration` and an accurate seek available before the first press. The
         first bytes are warmed on the Einsteigen step, so this is not where
         the wait is paid. */
      element.preload = 'metadata';
      both.push(element);
      return element;
    };

    const first = make(mixedUrl);
    mixed.current = first;
    voice.current = voiceUrl === null ? null : make(voiceUrl);
    /* The mix is what plays, so it is active until the switch says otherwise —
       including when the switch is already on at mount, which the effect below
       settles. */
    active.current = first;

    /* ONLY THE ACTIVE ELEMENT SPEAKS. Both are listened to, because either can
       become active, and every handler asks whether it is the one sounding —
       otherwise the paused element's own `pause` event would tell the screen
       the exercise had stopped, in the middle of a handover. */
    const listeners = both.map((element) => {
      const mine = () => active.current === element;
      const time = () => { if (mine()) handlers.current.onTime?.(element.currentTime); };
      const started = () => { if (mine()) handlers.current.onPlay?.(); };
      const stopped = () => { if (mine()) handlers.current.onPause?.(); };
      const ended = () => { if (mine()) handlers.current.onEnded?.(); };

      /* ── AN EXPIRED TOKEN IS NOT A MISSING FILE ──────────────────────
         `SIGNED_URL_TTL` is an hour; a fifteen-minute exercise paused for
         fifty minutes outlives its URL. Forgetting the cached URL and
         re-reading is the right answer for a file that exists; falling to the
         simulated clock is the right answer for one that does not, and this
         tells them apart. */
      const failed = () => {
        if (!retried.current) {
          retried.current = true;
          forgetTrackUrl(mixedSrc);
          forgetTrackUrl(voiceSrc);
          console.warn('[musie] a listening file failed to load — re-signing once');
        }
        if (mine()) handlers.current.onError?.();
      };

      element.addEventListener('timeupdate', time);
      element.addEventListener('play', started);
      element.addEventListener('pause', stopped);
      element.addEventListener('ended', ended);
      element.addEventListener('error', failed);
      return { element, time, started, stopped, ended, failed };
    });

    return () => {
      for (const l of listeners) {
        l.element.removeEventListener('timeupdate', l.time);
        l.element.removeEventListener('play', l.started);
        l.element.removeEventListener('pause', l.stopped);
        l.element.removeEventListener('ended', l.ended);
        l.element.removeEventListener('error', l.failed);
      }

      /* ── RELEASING THE iOS AUDIO SESSION, DELIBERATELY ───────────────
         Carried over verbatim from `SessionListen`, which did this on its own
         element and wrote down why: the NEXT step opens a microphone, and on
         iOS playback and capture share one audio session — a capture request
         renegotiates the route, which is the first domino in the Bluetooth
         branch of docs/VOICE-CAPTURE-FIX.md §3.2.

         `removeAttribute('src')` as well as `pause()`, because a paused
         element with a source can still hold the session; emptying it is what
         lets go. `load()` is what makes WebKit act on the change. Doing it
         here rather than there is the point of this hook owning the elements:
         it is now impossible to release one and forget the other. */
      for (const element of both) {
        element.pause();
        element.removeAttribute('src');
        element.load();
      }
      mixed.current = null;
      voice.current = null;
      active.current = null;
    };
    /* `musicMuted` IS NOT READ HERE, and that is the design rather than an
       oversight the linter happens to tolerate: this effect builds the
       elements, and the one below hands over between them. Reading the switch
       here would put it in these dependencies, and every flip would rebuild
       both elements — which is to say, stop the audio. */
  }, [mixedUrl, voiceUrl, mixedSrc, voiceSrc]);

  /* ── the switch ──────────────────────────────────────────────────────── */
  React.useEffect(() => {
    const to = musicMuted ? voice.current : mixed.current;
    const from = active.current;
    /* No guidance-only cut, or nothing built yet: there is nothing to hand
       over to and the switch is not offered in the first place. */
    if (to === null || from === null || to === from) return;

    active.current = to;
    handover(from, to);
  }, [musicMuted, mixedUrl, voiceUrl]);

  const play = React.useCallback(() => {
    const element = active.current;
    if (element === null) return;

    /* ── IN THE GESTURE, NOTHING AWAITED ──────────────────────────────
       iOS grants playback to the GESTURE, not to the component. An `await`
       between the press and this call spends it. One element rather than two,
       which is strictly easier than what the spike proved. */
    void element.play().catch((thrown: unknown) => {
      console.warn('[musie] the recording would not start:', thrown);
      handlers.current.onRefused?.();
    });
  }, []);

  const pause = React.useCallback(() => {
    /* BOTH, because the inactive one is paused already and asking twice is
       cheaper than asking which. */
    mixed.current?.pause();
    voice.current?.pause();
  }, []);

  const seek = React.useCallback((seconds: number) => {
    const at = Math.max(0, seconds);
    /* BOTH, so a handover after a seek lands where the listener is rather than
       where the other file was left. */
    if (mixed.current !== null) mixed.current.currentTime = at;
    if (voice.current !== null) voice.current.currentTime = at;
  }, []);

  const restart = React.useCallback(() => { seek(0); }, [seek]);

  return {
    resolving: mixedSrc !== null && (loading || urls === null),
    playable: mixedUrl !== null,
    hasVoiceOnly: voiceUrl !== null,
    play,
    pause,
    restart,
    seek,
  };
}

/**
 * THE HANDOVER: the same moment, the other file.
 *
 * Read the position off the element that is sounding, write it to the one
 * taking over, start that one if the first was running, and stop the first.
 *
 * ── THE ORDER IS THE WHOLE OF IT ──────────────────────────────────────────
 * `to.currentTime` BEFORE `to.play()`, or the new file starts at zero and
 * seeks afterwards — audible as the beginning of the piece. And `from.pause()`
 * LAST, because pausing first leaves a gap the length of whatever `play()`
 * takes to produce sound; overlapping them by a few milliseconds is
 * inaudible, and the two files are one recording.
 *
 * ── IT DOES NOT START ANYTHING THAT WAS NOT RUNNING ──────────────────────
 * Flipping the switch while paused moves the handover and nothing else. A
 * switch that started playback would make a label about music into a play
 * button.
 *
 * Exported for the test, which is the only honest way to assert an order.
 */
export function handover(from: HTMLAudioElement, to: HTMLAudioElement): void {
  const wasPlaying = !from.paused;

  to.currentTime = from.currentTime;
  if (wasPlaying) void to.play()?.catch?.(() => { /* logged by the caller's handler */ });
  from.pause();
}
