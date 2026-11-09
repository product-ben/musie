/**
 * The person's motion switch on Einsteigen, remembered on this device per
 * instrument — Ben, 2026-11-09: off the first time, and once switched on it
 * stays on from then on. The browser's own permission is a separate thing,
 * kept by `instruments/engine/motion.ts`; this is only whether the person
 * wants the sensor used. Storage can be unavailable (a private window), and
 * then the switch is simply not remembered.
 */
const key = (instrumentId: string) => `musie-motion-wanted:${instrumentId}`;

export function readMotionWanted(instrumentId: string): boolean {
  try {
    return localStorage.getItem(key(instrumentId)) === 'on';
  } catch {
    return false;
  }
}

export function writeMotionWanted(instrumentId: string, on: boolean): void {
  try {
    localStorage.setItem(key(instrumentId), on ? 'on' : 'off');
  } catch {
    /* not remembered — see the header */
  }
}
