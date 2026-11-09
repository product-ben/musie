/**
 * The play step's focus sheet lives on the address, as Hören's does: `?focus`
 * open, absent closed — so the browser's Back closes it and a reload keeps it.
 *
 * Two callers press the button that opens it (the wizard's action row in
 * `Session.tsx`) and read it (`SessionPlay`), hence its own module.
 */
import type { NavigateFunction } from 'react-router';
import { unlockNow } from '../instruments/engine/audio';

export const PLAY_FOCUS = 'focus';

export function withFocus(search: string, on: boolean): string {
  const params = new URLSearchParams(search);
  if (on) params.set(PLAY_FOCUS, '');
  else params.delete(PLAY_FOCUS);
  return params.toString().replace(`${PLAY_FOCUS}=`, PLAY_FOCUS);
}

/**
 * The primary button's press. iOS only lets a page make sound from inside a
 * gesture, so audio is unlocked HERE, in the click, before the sheet opens.
 */
export function openPlaySheet(navigate: NavigateFunction, search: string): void {
  unlockNow();
  navigate({ search: withFocus(search, true) });
}
