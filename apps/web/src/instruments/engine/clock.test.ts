/**
 * The play step's timer behaves like the harp's countdown (Ben, 2026-11-09).
 * Each case is one sentence of the decision.
 */
import { describe, expect, it } from 'vitest';
import {
  announcement,
  clockReducer,
  expiresAt,
  initialClock,
  playSeconds,
  remainingSeconds,
  showContinue,
} from './clock';
import type { ClockAction, ClockState } from './clock';

const run = (actions: ClockAction[], from: ClockState = initialClock(90)) => actions.reduce(clockReducer, from);

describe('the clock', () => {
  it('starts on the Play button', () => {
    const s = run([{ type: 'PLAY', at: 1000 }]);
    expect(s.phase).toBe('running');
    expect(remainingSeconds(s, 1000)).toBe(90);
    expect(remainingSeconds(s, 31_000)).toBe(60);
    expect(announcement(s)).toEqual({ key: 'started', count: 1 });
    expect(showContinue(s)).toBe(false);
  });

  it('starts on the first own note', () => {
    const s = run([{ type: 'OWN_NOTE', at: 1000 }]);
    expect(s.phase).toBe('running');
    expect(s.firstOwnAt).toBe(1000);
    expect(expiresAt(s)).toBe(91_000);
  });

  it('is not started by the demo — the demo never reaches it, and time alone does nothing', () => {
    const s = run([{ type: 'TICK', at: 5000 }, { type: 'TICK', at: 200_000 }]);
    expect(s.phase).toBe('unstarted');
    expect(remainingSeconds(s, 200_000)).toBe(90);
    expect(showContinue(s)).toBe(false);
    expect(playSeconds(s, 200_000)).toBe(0);
  });

  it('a pause shows „Weiter zum Reflektieren“', () => {
    const s = run([{ type: 'OWN_NOTE', at: 0 }, { type: 'PAUSE', at: 20_000 }]);
    expect(s.phase).toBe('paused');
    expect(showContinue(s)).toBe(true);
    expect(remainingSeconds(s, 999_999)).toBe(70);
    expect(announcement(s)?.key).toBe('paused');
  });

  it('an own note after a pause resumes the clock and hides the button again', () => {
    const s = run([
      { type: 'OWN_NOTE', at: 0 },
      { type: 'TOGGLE', at: 20_000 },
      { type: 'OWN_NOTE', at: 50_000 },
    ]);
    expect(s.phase).toBe('running');
    expect(showContinue(s)).toBe(false);
    expect(remainingSeconds(s, 50_000)).toBe(70);
    expect(announcement(s)?.key).toBe('resumed');
    expect(s.firstOwnAt).toBe(0);
  });

  it('the Play button resumes a pause too', () => {
    const s = run([{ type: 'PLAY', at: 0 }, { type: 'PAUSE', at: 10_000 }, { type: 'TOGGLE', at: 15_000 }]);
    expect(s.phase).toBe('running');
    expect(remainingSeconds(s, 15_000)).toBe(80);
  });

  it('at 0:00 it shows the button and stops counting', () => {
    const s = run([{ type: 'OWN_NOTE', at: 0 }, { type: 'TICK', at: 89_750 }, { type: 'TICK', at: 90_000 }]);
    expect(s.phase).toBe('expired');
    expect(showContinue(s)).toBe(true);
    expect(remainingSeconds(s, 120_000)).toBe(0);
    expect(announcement(s)?.key).toBe('expired');
  });

  it('expires on a late tick without going below 0:00', () => {
    const s = run([{ type: 'PLAY', at: 0 }, { type: 'TICK', at: 95_000 }]);
    expect(s.phase).toBe('expired');
    expect(s.leftMs).toBe(0);
  });

  it('playing on after 0:00 does not restart it', () => {
    const s = run([
      { type: 'OWN_NOTE', at: 0 },
      { type: 'TICK', at: 90_000 },
      { type: 'OWN_NOTE', at: 95_000 },
      { type: 'OWN_NOTE', at: 96_000 },
    ]);
    expect(s.phase).toBe('expired');
    expect(showContinue(s)).toBe(true);
    expect(remainingSeconds(s, 96_000)).toBe(0);
  });

  it('Play at 0:00 starts it again from the top', () => {
    const s = run([{ type: 'OWN_NOTE', at: 0 }, { type: 'TICK', at: 90_000 }, { type: 'TOGGLE', at: 100_000 }]);
    expect(s.phase).toBe('running');
    expect(showContinue(s)).toBe(false);
    expect(remainingSeconds(s, 100_000)).toBe(90);
    expect(announcement(s)?.key).toBe('restarted');
    expect(s.firstOwnAt).toBe(0); // the play time still began with the first note
  });

  it('a pause after the counting stopped changes nothing', () => {
    const before = run([{ type: 'PLAY', at: 0 }, { type: 'TICK', at: 90_000 }]);
    expect(clockReducer(before, { type: 'PAUSE', at: 91_000 })).toBe(before);
  });

  it('counts the play time from the first OWN note to Weiter, pauses included', () => {
    const s = run([
      { type: 'PLAY', at: 0 }, // the button does not start the play time
      { type: 'OWN_NOTE', at: 4_000 },
      { type: 'PAUSE', at: 30_000 },
      { type: 'OWN_NOTE', at: 60_000 }, // 30 s paused, still counted
      { type: 'CONTINUE', at: 75_400 },
    ]);
    expect(playSeconds(s, 75_400)).toBe(71);
    expect(playSeconds(s, 500_000)).toBe(71); // frozen at Weiter
    expect(s.phase).toBe('paused');
  });

  it('counts the play time past 0:00, and without any own note it is 0', () => {
    const played = run([{ type: 'OWN_NOTE', at: 10_000 }, { type: 'TICK', at: 100_000 }, { type: 'CONTINUE', at: 130_000 }]);
    expect(played.phase).toBe('expired');
    expect(playSeconds(played, 130_000)).toBe(120);
    const silent = run([{ type: 'PLAY', at: 0 }, { type: 'CONTINUE', at: 30_000 }]);
    expect(playSeconds(silent, 30_000)).toBe(0);
  });

  it('a note after Weiter (the person came back) counts on to the next Weiter', () => {
    const s = run([
      { type: 'OWN_NOTE', at: 0 },
      { type: 'CONTINUE', at: 20_000 },
      { type: 'OWN_NOTE', at: 40_000 },
    ]);
    expect(s.continuedAt).toBeNull();
    expect(playSeconds(s, 50_000)).toBe(50);
  });

  it('every announcement counts, so the same key twice is said twice', () => {
    const s = run([{ type: 'PLAY', at: 0 }, { type: 'PAUSE', at: 1000 }, { type: 'PLAY', at: 2000 }, { type: 'PAUSE', at: 3000 }]);
    expect(announcement(s)).toEqual({ key: 'paused', count: 4 });
  });
});
