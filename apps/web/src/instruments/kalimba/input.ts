/**
 * The experiment's keyboard: A S D F G H J K L play the tines left to right
 * (tine index, not degree), Shift strikes near the bridge, V held swings.
 */

export const KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'] as const;

/** „mit Shift: weit oben angeschlagen“ — near the bridge; without, at the tip. */
export const KEY_POSITION = { shift: 0.15, plain: 1 } as const;

/** Held, the V key swings the kalimba fully, as a phone being swung would. */
export const SWING_KEY = 'v';

/** The tine a key plays, or -1. */
export const tineOfKey = (key: string): number => (KEYS as readonly string[]).indexOf(key.toLowerCase());
