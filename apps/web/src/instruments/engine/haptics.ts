/**
 * Vibration — the marimba's `iosTick`, `buzz`, `strikeBuzz` and `tickOwed`
 * (`public/experiments/marimba/261108-1740`), which came from the kalimba and
 * the harp.
 *
 * TWO MECHANISMS, FOUND BY FEATURE, NEVER BY USER AGENT (Ben, 2026-11-09):
 * - `navigator.vibrate` — Android. Duration only, not strength. A browser that
 *   blocks it answers `false`; from then on the switch below is used instead.
 * - the iOS 18 `<input type="checkbox" switch>`: toggling one fires a haptic
 *   tick, but only while a touch is in progress. Measured on an iPhone 13
 *   (2026-11-08, four fields): only `touchend` vibrates — `pointerdown` and
 *   `touchstart` do not. So an own note OWES the iPhone a tick, paid when the
 *   finger lifts: `vibrate` owes, `touchEnd` pays.
 *
 * `buzz` is the experiments' immediate form, for a gesture that is itself a
 * click (the vibration switch confirming it is on). The extra `ticks` are
 * spaced 55 ms apart as in the harp and the kalimba — the iPhone measurement
 * suggests only the first one inside the gesture is felt.
 *
 * `ticks: 0` means "only where no touch is needed" — Android's
 * `navigator.vibrate` — and the iPhone is owed NOTHING: the kalimba vibrates
 * with the swing on Android only, as its experiment did. `undefined` is 1;
 * 0 is never rounded up to 1.
 */
import type { Timers } from './time';

/** Is there any way to vibrate here? Feature detection only. */
export function supportsVibration(
  nav: { vibrate?: unknown } | undefined = typeof navigator === 'undefined' ? undefined : navigator,
  inputPrototype: object | undefined = typeof HTMLInputElement === 'undefined' ? undefined : HTMLInputElement.prototype,
): boolean {
  return typeof nav?.vibrate === 'function' || (inputPrototype !== undefined && 'switch' in inputPrototype);
}

export interface VibrationEnv {
  /** `navigator.vibrate`, bound; null where it does not exist. */
  vibrate: ((ms: number) => boolean) | null;
  /** `'switch' in HTMLInputElement.prototype`. */
  hasSwitch: boolean;
  /** One iOS haptic tick (the hidden switch, clicked). */
  tick: () => void;
  timers: Timers;
}

/** The iOS tick: a hidden `<label><input type=checkbox switch></label>`, clicked and removed. */
function iosTick() {
  const label = document.createElement('label');
  const input = document.createElement('input');
  label.setAttribute('aria-hidden', 'true');
  label.style.display = 'none';
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  label.appendChild(input);
  document.head.appendChild(label);
  label.click();
  label.remove();
}

export function browserVibrationEnv(timers: Timers): VibrationEnv {
  const vibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
    ? (ms: number) => navigator.vibrate(ms)
    : null;
  return {
    vibrate,
    hasSwitch: typeof HTMLInputElement !== 'undefined' && 'switch' in HTMLInputElement.prototype,
    tick: iosTick,
    timers,
  };
}

export interface Vibrator {
  /** An own note: Android now; on the iPhone, `ticks` owed to the next `touchEnd` (0: none). */
  vibrate(ms: number, ticks?: number): void;
  /** Now, on both — only from inside a gesture that is not a touch's start (`ticks` 0: Android only). */
  buzz(ms: number, ticks?: number): void;
  /** A finger lifted: pay the owed tick. */
  touchEnd(): void;
}

/** The spacing of extra ticks, the harp's and the kalimba's. */
const TICK_SPACING_MS = 55;

export function createVibrator(enabled: () => boolean, env: VibrationEnv): Vibrator {
  let blocked = false;
  let owed = 0;

  /** True when Android took it. */
  const android = (ms: number) => {
    if (env.vibrate === null || blocked) return false;
    let ok = false;
    try {
      ok = env.vibrate(Math.max(0, Math.round(ms)));
    } catch {
      ok = false;
    }
    if (!ok) blocked = true;
    return ok;
  };

  const ticks = (count: number) => {
    env.tick();
    for (let k = 1; k < count; k += 1) env.timers.setTimeout(env.tick, k * TICK_SPACING_MS);
  };

  return {
    vibrate(ms, count = 1) {
      if (!enabled() || android(ms)) return;
      if (env.hasSwitch && count > 0) owed = Math.max(owed, Math.max(1, Math.round(count)));
    },
    buzz(ms, count = 1) {
      if (!enabled() || android(ms)) return;
      if (env.hasSwitch && count > 0) ticks(Math.max(1, Math.round(count)));
    },
    touchEnd() {
      if (owed === 0) return;
      const count = owed;
      owed = 0;
      if (enabled()) ticks(count);
    },
  };
}
