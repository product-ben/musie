/**
 * The conversation with switches: `createConversation` from
 * src/instruments/engine/answer.ts, with `compose2` and `pause2` in place of
 * today's two, and what the switches need remembered across answers.
 *
 * It reaches the app's REAL session (`engine/host.ts`) through the shim
 * `shims/instruments__engine__answer.ts` — the only module of the app this
 * experiment swaps. Everything else — the adapters, the sound, the drawing,
 * the stage — is the app's, unchanged.
 *
 * What is new beside the switches: it notes the person's first note after an
 * answer began (`Turn`) — the measure of whether Musie came in too early,
 * which `learn` acts on and PostHog records.
 *
 * And „Unter deinem Spiel“: the first note of a phrase may get a soft chord
 * under it, at once. It is not an answer — nothing waits for it and nothing
 * interrupts it; it rings out like a note of theirs.
 */
import type { AnswerNote, Conversation, ConversationDeps } from '../../../src/instruments/engine/answer';
import type { Stroke, Voice } from '../../../src/instruments/types';
import { compose2, motifOf, pause2 } from './answer2';
import type { Pause } from './answer2';
import { chordsAt, underneath } from './chords';
import { recordAnswer, recordTurn, resetRun, runState, updateRun } from './run';
import type { AnswerEntry, NowPlaying } from './run';
import { settings } from './settings';
import type { ChordKind } from './settings';

/** GUESSED. A note this soon after Musie's first counts as „came in too early“. */
export const COLLISION_MS = 450;
/** GUESSED. `learn`: ×up after a collision, ×down after a clean turn, within [min, max]. */
export const LEARN = { up: 1.3, down: 0.92, min: 0.5, max: 2 } as const;
/** `onLift`: how often a resting finger is re-checked. Today 400 ms. */
export const LIFT_RETRY_MS = 30;
/** How many motifs „Erinnerung“ can draw on. */
export const MEMORY_SIZE = 8;
/** How long the pill names a chord laid under their note. Display only. */
export const UNDER_PILL_MS = 1500;

export function createConversation(deps: ConversationDeps): Conversation {
  const { config, timers } = deps;
  resetRun();
  let phrase: Stroke[] = [];
  let pauseTimer: number | null = null;
  let answering = false;
  let answerTimers: number[] = [];
  let voices: Voice[] = [];
  let lastLength = 0;
  let pause: Pause = { ms: 0, ending: 'neutral' };
  /** When the latest answer began, until the person's next note. */
  let answerStartedAt: number | null = null;
  /** The chord laid under this phrase's first note, if one was. */
  let under: ChordKind | null = null;
  let underTimers: number[] = [];

  /** The pill: what Musie sounds now. An answer's name stays up while it rings. */
  let pillTimer: number | null = null;
  function show(playing: NowPlaying | null, forMs?: number) {
    if (pillTimer !== null) timers.clearTimeout(pillTimer);
    pillTimer = null;
    updateRun({ playing });
    if (playing !== null && forMs !== undefined) {
      pillTimer = timers.setTimeout(() => {
        pillTimer = null;
        if (runState().playing === playing) updateRun({ playing: null });
      }, forMs);
    }
  }

  function playUnder(stroke: Stroke) {
    const chord = underneath(stroke, config, deps.degrees(), deps.random, settings());
    if (chord === null) return;
    under = chord.kind;
    show({ kind: 'under', chord: chord.kind }, UNDER_PILL_MS);
    for (const nt of chord.notes) {
      const sound = () => deps.play({ degree: nt.degree, velocity: nt.velocity, roll: false, at: deps.now() });
      if (nt.t === 0) sound();
      else underTimers.push(timers.setTimeout(sound, nt.t));
    }
  }

  const clearPause = () => {
    if (pauseTimer !== null) timers.clearTimeout(pauseTimer);
    pauseTimer = null;
  };

  function interrupt() {
    if (!answering) return;
    answerTimers.forEach((h) => timers.clearTimeout(h));
    answerTimers = [];
    answering = false;
    voices.forEach((v) => v.fade(config.interruptFadeTau));
    voices = [];
    if (runState().playing?.kind === 'answer') show(null);
  }

  function sound(degree: number, velocity: number, roll: boolean) {
    const voice = deps.play({ degree, velocity, roll, at: deps.now() });
    if (voice) voices.push(voice);
  }

  function playAnswer(notes: AnswerNote[]) {
    answering = true;
    voices = [];
    const R = config.roll;
    for (const nt of notes) {
      answerTimers.push(timers.setTimeout(() => sound(nt.degree, nt.velocity, false), nt.t));
      if (nt.roll && R !== null) {
        for (let k = 1; k <= R.strokes; k += 1) {
          answerTimers.push(timers.setTimeout(() => sound(nt.degree, R.velocity - k * R.step, true), nt.t + k * R.everyMs));
        }
      }
    }
    /* Today: the last note's time plus its tail. A Zweiklang partner can now
       be the last in the list while the rolled note is its twin, so the latest
       end of any note. Without ornaments this is today's number. */
    const end = Math.max(...notes.map((nt) => nt.t + (nt.roll && R !== null ? R.tailMs : config.endMs)));
    answerTimers.push(
      timers.setTimeout(() => {
        answering = false;
        answerTimers = [];
        voices = [];
        if (runState().playing?.kind === 'answer') show(null);
      }, end),
    );
  }

  function maybeAnswer() {
    pauseTimer = null;
    if (!deps.enabled() || !phrase.length) return;
    if (deps.isHolding()) {
      pauseTimer = timers.setTimeout(maybeAnswer, settings().onLift ? LIFT_RETRY_MS : config.pause.heldRetryMs);
      return;
    }
    const heard = phrase;
    phrase = [];
    const run = runState();
    const composed = compose2(heard, config, deps.degrees(), deps.random, settings(), {
      previousLength: lastLength,
      round: run.round,
      memory: run.memory,
    });
    if (!composed.notes.length) return;
    lastLength = composed.length;
    const round = run.round + 1;
    const motif = motifOf(heard, round);
    updateRun({ round, memory: motif === null ? run.memory : [...run.memory, motif].slice(-MEMORY_SIZE) });
    deps.onAnswered?.({ heard: heard.length, notes: composed.notes.length });
    const entry: AnswerEntry = {
      round,
      figure: composed.figure,
      ornaments: composed.ornaments,
      fromRound: composed.fromRound,
      heard: heard.length,
      notes: composed.length,
      cap: composed.cap,
      waitMs: Math.round(deps.now() - heard[heard.length - 1].at),
      ending: pause.ending,
      learn: settings().learn ? run.learn : 1,
      chords: composed.chords,
      under,
    };
    recordAnswer(entry);
    under = null;
    show({ kind: 'answer', entry });
    playAnswer(composed.notes);
    answerStartedAt = deps.now();
  }

  function noteTurn() {
    if (answerStartedAt === null) return;
    const afterMs = deps.now() - answerStartedAt;
    /* `answering` may already be false: a touch-down interrupts before the
       note is reported, so the collision is read from the time alone. */
    const collision = afterMs < COLLISION_MS;
    if (settings().learn) {
      const { learn } = runState();
      updateRun({ learn: collision ? Math.min(LEARN.max, learn * LEARN.up) : Math.max(LEARN.min, learn * LEARN.down) });
    }
    recordTurn({ afterMs: Math.round(afterMs), collision, interrupted: answering || collision });
    answerStartedAt = null;
  }

  return {
    heard(stroke) {
      noteTurn();
      interrupt();
      if (!deps.enabled()) {
        clearPause();
        phrase = [];
        return;
      }
      const last = phrase[phrase.length - 1];
      const prev = phrase[phrase.length - 2];
      if (config.roll !== null && stroke.roll === true && last && (last.degree === stroke.degree || prev?.degree === stroke.degree)) {
        last.roll = true; // a roll is one note, not a phrase
      } else {
        if (phrase.length === 0) {
          under = null;
          if (chordsAt(settings(), 'begleitung')) playUnder(stroke);
        }
        phrase.push({ degree: stroke.degree, velocity: stroke.velocity, at: stroke.at });
      }
      if (phrase.length > config.phraseMemory) phrase.shift();
      clearPause();
      pause = pause2(phrase, config, settings(), runState().learn);
      pauseTimer = timers.setTimeout(maybeAnswer, pause.ms);
    },
    interrupt,
    stop() {
      interrupt();
      clearPause();
      underTimers.forEach((h) => timers.clearTimeout(h));
      underTimers = [];
      under = null;
      show(null);
      phrase = [];
      answerStartedAt = null;
    },
    answering: () => answering,
    phraseLength: () => phrase.length,
  };
}
