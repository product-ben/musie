/**
 * The play step's timer — a pure reducer, behaving 1:1 like the harp's
 * countdown (`public/experiments/harp/261109-0920`: `cdStart`, `cdPause`,
 * `cdTick`, `cdAutoStart`, and the resume inside `harpStat`).
 *
 *   unstarted ──PLAY / first OWN_NOTE──▶ running ──PAUSE──▶ paused
 *                                          ▲  │                │
 *                                          │  └─TICK to 0─▶ expired
 *                                          └──PLAY / OWN_NOTE─┘   │
 *                                          └──────── PLAY ────────┘ (restarts)
 *
 * Ben, 2026-11-09:
 * - it starts on the Play button or on the first OWN note — the demo note is
 *   not one, so it never reaches this reducer;
 * - a pause shows „Weiter zum Reflektieren“ (`showContinue`);
 * - after a pause the next own note resumes it and hides the button again;
 * - at 0:00 the button shows and playing goes on — no hard stop, and own
 *   notes no longer restart it; Play at 0:00 starts it again from the top;
 * - the play time stored with the session runs from the first own note to the
 *   moment Weiter is pressed (CONTINUE), pauses included.
 *
 * Time is passed in (`at`), never read: the same `performance.now()` that
 * stamps every `Stroke.at`. The reducer learns of 0:00 only from a TICK; the
 * host ticks four times a second while it runs, as the harp does.
 */

export type ClockPhase = 'unstarted' | 'running' | 'paused' | 'expired';

/**
 * What changed, for a polite live region — the React layer maps a key to its
 * catalogue string (rule 7). `saidCount` grows with every announcement, so
 * the same key twice is still two announcements.
 */
export type ClockAnnouncement = 'started' | 'paused' | 'resumed' | 'expired' | 'restarted';

export interface ClockState {
  readonly durationMs: number;
  readonly phase: ClockPhase;
  /** Remaining, as of `at`. */
  readonly leftMs: number;
  /** When `leftMs` was last brought up to date; a running clock counts from here. */
  readonly at: number;
  /** The first own note — where the play time begins. */
  readonly firstOwnAt: number | null;
  /** When Weiter was pressed — where the play time ends. Cleared by a later own note. */
  readonly continuedAt: number | null;
  readonly said: ClockAnnouncement | null;
  readonly saidCount: number;
}

export type ClockAction =
  /** The Play button. Resumes a pause; restarts at 0:00. */
  | { type: 'PLAY'; at: number }
  | { type: 'PAUSE'; at: number }
  /** The one transport button: pause while running, play otherwise (the harp's `cdBtn`). */
  | { type: 'TOGGLE'; at: number }
  /** The person played — never the demo, never an answer. */
  | { type: 'OWN_NOTE'; at: number }
  | { type: 'TICK'; at: number }
  /** „Weiter zum Reflektieren“ was pressed. */
  | { type: 'CONTINUE'; at: number };

export function initialClock(durationSeconds: number, at = 0): ClockState {
  const durationMs = Math.max(0, durationSeconds) * 1000;
  return { durationMs, phase: 'unstarted', leftMs: durationMs, at, firstOwnAt: null, continuedAt: null, said: null, saidCount: 0 };
}

const say = (s: ClockState, said: ClockAnnouncement): Pick<ClockState, 'said' | 'saidCount'> => ({ said, saidCount: s.saidCount + 1 });

/** Bring a running clock up to `at`; it expires on reaching 0. */
function advance(s: ClockState, at: number): ClockState {
  if (s.phase !== 'running') return s;
  const left = s.leftMs - Math.max(0, at - s.at);
  if (left <= 0) return { ...s, phase: 'expired', leftMs: 0, at, ...say(s, 'expired') };
  return { ...s, leftMs: left, at };
}

function play(s: ClockState, at: number): ClockState {
  switch (s.phase) {
    case 'running':
      return s;
    case 'expired':
      return { ...s, phase: 'running', leftMs: s.durationMs, at, ...say(s, 'restarted') };
    case 'unstarted':
      return { ...s, phase: 'running', at, ...say(s, 'started') };
    case 'paused':
      return { ...s, phase: 'running', at, ...say(s, 'resumed') };
  }
}

function pause(s: ClockState, at: number): ClockState {
  if (s.phase !== 'running') return s;
  const now = advance(s, at);
  return now.phase === 'expired' ? now : { ...now, phase: 'paused', ...say(now, 'paused') };
}

export function clockReducer(state: ClockState, action: ClockAction): ClockState {
  switch (action.type) {
    case 'PLAY':
      return play(state, action.at);
    case 'PAUSE':
      return pause(state, action.at);
    case 'TOGGLE':
      return state.phase === 'running' ? pause(state, action.at) : play(state, action.at);
    case 'TICK':
      return advance(state, action.at);
    case 'OWN_NOTE': {
      const noted =
        state.firstOwnAt === null || state.continuedAt !== null
          ? { ...state, firstOwnAt: state.firstOwnAt ?? action.at, continuedAt: null }
          : state;
      // Not started: the first note starts it. Paused: a note resumes it. Expired: it stays at 0:00.
      return noted.phase === 'unstarted' || noted.phase === 'paused' ? play(noted, action.at) : noted;
    }
    case 'CONTINUE': {
      const stopped = pause(state, action.at);
      return { ...stopped, continuedAt: action.at };
    }
  }
}

/** Remaining milliseconds at `now`. */
export function remainingMs(s: ClockState, now: number): number {
  return Math.max(0, s.phase === 'running' ? s.leftMs - Math.max(0, now - s.at) : s.leftMs);
}

/** The figure: whole seconds, rounded up, as the harp shows it. */
export function remainingSeconds(s: ClockState, now: number): number {
  return Math.ceil(remainingMs(s, now) / 1000);
}

/** When a running clock reaches 0:00; null when it is not running. */
export function expiresAt(s: ClockState): number | null {
  return s.phase === 'running' ? s.at + s.leftMs : null;
}

/** „Weiter zum Reflektieren“ is offered after a pause and at 0:00 — not before, not while it runs. */
export function showContinue(s: ClockState): boolean {
  return s.phase === 'paused' || s.phase === 'expired';
}

/** The latest announcement, with its count (see `ClockAnnouncement`). */
export function announcement(s: ClockState): { key: ClockAnnouncement; count: number } | null {
  return s.said === null ? null : { key: s.said, count: s.saidCount };
}

/**
 * The play time for the session, whole seconds: first own note → Weiter
 * (or → `now`, before Weiter), pauses included. 0 without an own note.
 */
export function playSeconds(s: ClockState, now: number): number {
  if (s.firstOwnAt === null) return 0;
  return Math.max(0, Math.round(((s.continuedAt ?? now) - s.firstOwnAt) / 1000));
}
