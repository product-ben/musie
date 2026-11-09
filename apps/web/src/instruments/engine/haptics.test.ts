/**
 * Vibration: found by feature, Android at once, the iPhone on the next
 * touchend, nothing when the switch is off.
 */
import { describe, expect, it, vi } from 'vitest';
import { createVibrator, supportsVibration } from './haptics';
import type { VibrationEnv } from './haptics';
import { fakeTime } from './testing';

describe('supportsVibration', () => {
  it('is true with navigator.vibrate (Android)', () => {
    expect(supportsVibration({ vibrate: () => true }, {})).toBe(true);
  });

  it('is true with the iOS switch input', () => {
    expect(supportsVibration({}, { switch: false })).toBe(true);
  });

  it('is false with neither', () => {
    expect(supportsVibration({}, {})).toBe(false);
    expect(supportsVibration({ vibrate: 'yes' }, undefined)).toBe(false);
    expect(supportsVibration(undefined, undefined)).toBe(false);
  });

  it('reads the real globals by default — node has neither', () => {
    expect(supportsVibration()).toBe(false);
  });
});

function env(overrides: Partial<VibrationEnv> = {}) {
  const time = fakeTime();
  const tick = vi.fn();
  return { time, tick, env: { vibrate: null, hasSwitch: false, tick, timers: time.timers, ...overrides } };
}

describe('the vibrator', () => {
  it('Android vibrates at once, for the given duration', () => {
    const vibrate = vi.fn(() => true);
    const v = createVibrator(() => true, env({ vibrate }).env);
    v.vibrate(54.6, 2);
    expect(vibrate).toHaveBeenCalledWith(55);
  });

  it('the iPhone owes the tick to the next touchend', () => {
    const e = env({ hasSwitch: true });
    const v = createVibrator(() => true, e.env);
    v.vibrate(60);
    expect(e.tick).not.toHaveBeenCalled();
    v.touchEnd();
    expect(e.tick).toHaveBeenCalledTimes(1);
    v.touchEnd();
    expect(e.tick).toHaveBeenCalledTimes(1); // paid
  });

  it('ticks: 0 vibrates on Android only and owes the iPhone nothing', () => {
    const vibrate = vi.fn(() => true);
    const android = createVibrator(() => true, env({ vibrate }).env);
    android.vibrate(70, 0);
    expect(vibrate).toHaveBeenCalledWith(70);
    const e = env({ hasSwitch: true });
    const iphone = createVibrator(() => true, e.env);
    iphone.vibrate(70, 0);
    iphone.buzz(70, 0);
    iphone.touchEnd();
    expect(e.tick).not.toHaveBeenCalled();
  });

  it('extra ticks follow 55 ms apart, the first inside the touchend', () => {
    const e = env({ hasSwitch: true });
    const v = createVibrator(() => true, e.env);
    v.vibrate(60, 3);
    v.touchEnd();
    expect(e.tick).toHaveBeenCalledTimes(1);
    e.time.advance(110);
    expect(e.tick).toHaveBeenCalledTimes(3);
  });

  it('a blocked navigator.vibrate falls back to the switch', () => {
    const vibrate = vi.fn(() => false);
    const e = env({ vibrate, hasSwitch: true });
    const v = createVibrator(() => true, e.env);
    v.vibrate(40);
    v.vibrate(40);
    expect(vibrate).toHaveBeenCalledTimes(1); // blocked once, not asked again
    v.touchEnd();
    expect(e.tick).toHaveBeenCalledTimes(1);
  });

  it('does nothing while the switch is off — and forgets what was owed', () => {
    let on = false;
    const vibrate = vi.fn(() => true);
    const e = env({ vibrate, hasSwitch: true });
    const v = createVibrator(() => on, e.env);
    v.vibrate(40);
    v.buzz(80, 2);
    v.touchEnd();
    expect(vibrate).not.toHaveBeenCalled();
    expect(e.tick).not.toHaveBeenCalled();
    on = true;
    v.touchEnd();
    expect(e.tick).not.toHaveBeenCalled();
  });

  it('buzz ticks at once on the iPhone (from a click)', () => {
    const e = env({ hasSwitch: true });
    createVibrator(() => true, e.env).buzz(80, 2);
    expect(e.tick).toHaveBeenCalledTimes(1);
    e.time.advance(55);
    expect(e.tick).toHaveBeenCalledTimes(2);
  });
});
