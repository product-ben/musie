/**
 * `handover` — the switch, and the one part of `mixer.ts` that is pure.
 *
 * ── WHY THIS FILE TESTS ONE FUNCTION AND NOT THE HOOK ─────────────────────
 * `useMix` is two `new Audio()` elements, five listeners each and a signed
 * URL. Testing it would mean a fake `HTMLAudioElement` with a fake media
 * clock, maintained forever, to prove that a hook calls two methods — and the
 * two things that could actually break on a device (does iOS keep audio going
 * with the screen locked, and does a swap sound like a cut) are exactly the
 * two a fake element would answer wrongly. Those were measured instead, on an
 * iPhone, through `/dev/two-streams`.
 *
 * What IS worth a test is the handover, because it is an ORDER — and an order
 * is invisible in a diff. Two of the three lines can be moved without breaking
 * anything visible in a unit test that only checked the end state: the
 * position would still be right, and the listener would hear the piece restart
 * from zero, or a gap.
 */
import { describe, expect, it, vi } from 'vitest';

import { handover } from './mixer';

/** The four members `handover` touches, plus a log of the calls in order. */
function element(currentTime: number, paused: boolean, log: string[], name: string) {
  const el = {
    currentTime,
    paused,
    play: vi.fn(() => { log.push(`${name}.play`); el.paused = false; return Promise.resolve(); }),
    pause: vi.fn(() => { log.push(`${name}.pause`); el.paused = true; }),
  };
  /* A setter rather than a plain field, so the ORDER of the position write is
     observable — which is the thing this file exists to pin down. */
  let at = currentTime;
  Object.defineProperty(el, 'currentTime', {
    get: () => at,
    set: (value: number) => { at = value; log.push(`${name}.currentTime=${value}`); },
  });
  return el as unknown as HTMLAudioElement & { play: ReturnType<typeof vi.fn> };
}

describe('handover · while playing', () => {
  it('carries the exact position across', () => {
    const log: string[] = [];
    const from = element(31.4, false, log, 'from');
    const to = element(0, true, log, 'to');

    handover(from, to);

    expect(to.currentTime).toBe(31.4);
  });

  /* THE ORDER IS THE WHOLE OF IT.

     `currentTime` before `play`, or the new file starts at zero and seeks
     afterwards — audible as the beginning of the piece. And `from.pause` LAST,
     because pausing first leaves a gap the length of whatever `play()` takes
     to produce sound. */
  it('sets the position, then plays, then pauses the old one', () => {
    const log: string[] = [];
    const from = element(31.4, false, log, 'from');
    const to = element(0, true, log, 'to');

    handover(from, to);

    expect(log).toEqual(['to.currentTime=31.4', 'to.play', 'from.pause']);
  });

  it('leaves the old element paused and the new one running', () => {
    const log: string[] = [];
    const from = element(10, false, log, 'from');
    const to = element(0, true, log, 'to');

    handover(from, to);

    expect(from.paused).toBe(true);
    expect(to.paused).toBe(false);
  });
});

describe('handover · while paused', () => {
  /* A switch that started playback would turn a label about music into a play
     button. Flipping it before pressing play moves the handover and nothing
     else. */
  it('moves the position but starts nothing', () => {
    const log: string[] = [];
    const from = element(12.5, true, log, 'from');
    const to = element(0, true, log, 'to');

    handover(from, to);

    expect(to.currentTime).toBe(12.5);
    expect(to.play).not.toHaveBeenCalled();
    expect(log).toEqual(['to.currentTime=12.5', 'from.pause']);
  });
});

describe('handover · the cases that must not throw', () => {
  it('survives a play() that rejects, because autoplay policy is a thing', async () => {
    const log: string[] = [];
    const from = element(5, false, log, 'from');
    const to = element(0, true, log, 'to');
    (to as unknown as { play: () => Promise<void> }).play = () => Promise.reject(new Error('no'));

    expect(() => handover(from, to)).not.toThrow();
    /* The rejection is swallowed here and reported by the element's own error
       handler; an unhandled rejection in a click handler is the failure this
       avoids. */
    await Promise.resolve();
  });

  it('survives a play() that returns undefined, as older WebKit does', () => {
    const log: string[] = [];
    const from = element(5, false, log, 'from');
    const to = element(0, true, log, 'to');
    (to as unknown as { play: () => undefined }).play = () => undefined;

    expect(() => handover(from, to)).not.toThrow();
  });

  it('is a no-op in effect when the two are already at the same place', () => {
    const log: string[] = [];
    const from = element(42, false, log, 'from');
    const to = element(42, true, log, 'to');

    handover(from, to);

    expect(to.currentTime).toBe(42);
    expect(log).toEqual(['to.currentTime=42', 'to.play', 'from.pause']);
  });
});
