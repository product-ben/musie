/**
 * One run of the duet: what the conversation remembers across answers (the
 * round, the learned wait, the motifs for „Erinnerung“) and the last answers,
 * for the panel's log and for PostHog.
 *
 * A module store, because there is one conversation at a time — a new one
 * (another instrument) starts a new run. No PostHog here: track.ts listens
 * with `onRunEvent`, so the conversation stays testable in node.
 */
import type { Ending, Motif } from './answer2';
import type { ChordKind, FigureId, ShapeId } from './settings';

export interface Turn {
  /** From Musie's first note to the person's next one. */
  afterMs: number;
  /** Played into Musie's first moment (conversation.ts, COLLISION_MS). */
  collision: boolean;
  /** Musie was still playing. */
  interrupted: boolean;
}

export interface AnswerEntry {
  round: number;
  figure: ShapeId | 'heute' | 'akkord';
  ornaments: FigureId[];
  /** One per chord in the answer. */
  chords: ChordKind[];
  /** The chord „Unter deinem Spiel“ laid under the phrase's first note, if one was. */
  under: ChordKind | null;
  fromRound?: number;
  /** Notes in the person's phrase. */
  heard: number;
  /** Notes in the answer, ornaments not counted. */
  notes: number;
  /** What the length switches allowed. */
  cap: number;
  /** The silence before the answer, as it happened (a resting finger adds). */
  waitMs: number;
  ending: Ending;
  /** The learned factor the wait was multiplied by (1 when `learn` is off). */
  learn: number;
  turn?: Turn;
}

/** What Musie is sounding right now, for the pill under the instrument. */
export type NowPlaying =
  | { kind: 'answer'; entry: AnswerEntry }
  | { kind: 'under'; chord: ChordKind };

export interface RunState {
  round: number;
  learn: number;
  memory: readonly Motif[];
  entries: readonly AnswerEntry[];
  playing: NowPlaying | null;
}

export type RunEvent =
  | { type: 'answer'; entry: AnswerEntry }
  | { type: 'turn'; entry: AnswerEntry; turn: Turn };

const KEEP = 12;
const fresh = (): RunState => ({ round: 0, learn: 1, memory: [], entries: [], playing: null });

let state: RunState = fresh();
const listeners = new Set<() => void>();
const events = new Set<(e: RunEvent) => void>();

const notify = () => listeners.forEach((fn) => fn());

export function runState(): RunState {
  return state;
}

export function updateRun(patch: Partial<Pick<RunState, 'round' | 'learn' | 'memory' | 'playing'>>): void {
  state = { ...state, ...patch };
  notify();
}

export function recordAnswer(entry: AnswerEntry): void {
  state = { ...state, entries: [entry, ...state.entries].slice(0, KEEP) };
  notify();
  events.forEach((fn) => fn({ type: 'answer', entry }));
}

/** The person's first note after the latest answer began. */
export function recordTurn(turn: Turn): void {
  const [latest, ...rest] = state.entries;
  if (latest === undefined || latest.turn !== undefined) return;
  const entry = { ...latest, turn };
  state = { ...state, entries: [entry, ...rest] };
  notify();
  events.forEach((fn) => fn({ type: 'turn', entry, turn }));
}

export function resetRun(): void {
  state = fresh();
  notify();
}

export function subscribeRun(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function onRunEvent(fn: (e: RunEvent) => void): () => void {
  events.add(fn);
  return () => events.delete(fn);
}
