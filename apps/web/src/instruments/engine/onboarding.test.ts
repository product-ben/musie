/**
 * The demo note: once, when the sound can be heard and the instrument is
 * ready (1.5 s at most), and never after an own touch.
 */
import { describe, expect, it, vi } from 'vitest';
import { createOnboarding } from './onboarding';
import { fakeTime } from './testing';

function setup(opts: { audible?: () => boolean; ready?: Promise<unknown> } = {}) {
  const time = fakeTime();
  const playDemo = vi.fn(() => ({ degree: 2 }));
  const onDemo = vi.fn();
  const onboarding = createOnboarding({
    audible: opts.audible ?? (() => true),
    ready: opts.ready ?? Promise.resolve(),
    playDemo,
    onDemo,
    now: time.now,
    timers: time.timers,
  });
  return { time, playDemo, onDemo, onboarding };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('the demo', () => {
  it('plays once, as soon as the sound is audible and the instrument ready', async () => {
    let audible = false;
    let resolveReady = () => {};
    const s = setup({ audible: () => audible, ready: new Promise<void>((r) => { resolveReady = r; }) });
    s.onboarding.start();
    s.time.advance(300);
    expect(s.playDemo).not.toHaveBeenCalled();
    audible = true;
    s.time.advance(300);
    expect(s.playDemo).not.toHaveBeenCalled(); // audible, but the samples are not decoded yet
    resolveReady();
    await settle();
    s.time.advance(50);
    expect(s.playDemo).toHaveBeenCalledTimes(1);
    expect(s.onDemo).toHaveBeenCalledWith({ degree: 2 });
    expect(s.onboarding.state()).toBe('played');
    s.onboarding.start();
    s.time.advance(5000);
    expect(s.playDemo).toHaveBeenCalledTimes(1);
  });

  it('waits 1500 ms at most, then shows the demo anyway', async () => {
    const s = setup({ audible: () => false });
    await settle();
    s.onboarding.start();
    s.time.advance(1499);
    expect(s.playDemo).not.toHaveBeenCalled();
    s.time.advance(1);
    expect(s.playDemo).toHaveBeenCalledTimes(1);
  });

  it('a failed sample load still lets the demo show', async () => {
    const s = setup({ ready: Promise.reject(new Error('404')) });
    await settle();
    s.onboarding.start();
    expect(s.playDemo).toHaveBeenCalledTimes(1);
  });

  it('an own touch cancels it at once — before it sounded, it never sounds', async () => {
    const s = setup({ audible: () => false });
    await settle();
    s.onboarding.start();
    s.time.advance(400);
    s.onboarding.cancel();
    s.time.advance(5000);
    expect(s.playDemo).not.toHaveBeenCalled();
    expect(s.onboarding.state()).toBe('cancelled');
    expect(s.time.pending()).toBe(0);
  });

  it('a touch before the sheet started the demo cancels it too', async () => {
    const s = setup();
    await settle();
    s.onboarding.cancel();
    s.onboarding.start();
    s.time.advance(5000);
    expect(s.playDemo).not.toHaveBeenCalled();
  });

  it('a touch after the demo played changes nothing', async () => {
    const s = setup();
    await settle();
    s.onboarding.start();
    s.onboarding.cancel();
    expect(s.onboarding.state()).toBe('played');
  });
});
