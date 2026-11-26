import { describe, expect, it } from 'vitest';

import {
  LENGTH_DEFAULT_SECONDS, LENGTH_MAX_SECONDS, LENGTH_MIN_SECONDS, LENGTH_STEP_SECONDS,
  clampLength, hasVariableLength, initialLength, lengthClock, spokenLength,
} from './exerciseLength';

describe('which kinds ask', () => {
  it('asks for card and instrument exercises, and only them', () => {
    expect(hasVariableLength('card_based')).toBe(true);
    expect(hasVariableLength('instruments')).toBe(true);
    expect(hasVariableLength('listening_only')).toBe(false);
    expect(hasVariableLength('digital_interactive')).toBe(false);
  });
});

describe('the bounds — Ben, 2026-11-26: 1:00 to 10:00 in half minutes', () => {
  it('is 60 to 600 seconds in steps of 30', () => {
    expect([LENGTH_MIN_SECONDS, LENGTH_MAX_SECONDS, LENGTH_STEP_SECONDS]).toEqual([60, 600, 30]);
  });

  it('holds a length inside the bounds', () => {
    expect(clampLength(30)).toBe(60);
    expect(clampLength(900)).toBe(600);
    expect(clampLength(Number.NaN)).toBe(60);
  });

  it('draws an off-step length on the nearest step', () => {
    expect(clampLength(70)).toBe(60);
    expect(clampLength(80)).toBe(90);
    expect(clampLength(599)).toBe(600);
  });
});

describe('where the slider starts — Ben: „default ist 2 min"', () => {
  it('starts at 2:00 for a run with no length yet', () => {
    expect(LENGTH_DEFAULT_SECONDS).toBe(120);
    expect(initialLength(null)).toBe(120);
  });

  it('keeps a resumed run its answer', () => {
    expect(initialLength(300)).toBe(300);
  });
});

describe('how a length is written and said', () => {
  it('writes M:SS with the minutes unpadded', () => {
    expect(lengthClock(90)).toBe('1:30');
    expect(lengthClock(600)).toBe('10:00');
  });

  it('says one minute in the singular, and every other count in the plural', () => {
    expect(spokenLength(90)).toEqual({ key: 'session.intro.length.oneMinuteSeconds', params: { minutes: '1', seconds: '30' } });
    expect(spokenLength(120).key).toBe('session.intro.length.minutes');
    expect(spokenLength(150).key).toBe('session.intro.length.minutesSeconds');
    expect(spokenLength(60)).toEqual({ key: 'session.intro.length.oneMinute', params: { minutes: '1', seconds: '0' } });
  });
});
