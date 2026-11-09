/**
 * Degrees and tines. The engine counts in PITCH ORDER (degree 0 = lowest);
 * the kalimba's tines run left to right with the lowest in the middle, then
 * alternately right and left. `answer.pitchOrder` in kalimba.json is the tine
 * index per degree — `[4, 5, 3, 6, 2, 7, 1, 8, 0]` — and `sources.test.ts`
 * holds it to the tines sorted by frequency. The engine never sees a tine.
 */

/** Tine indexes sorted by frequency, lowest first. */
export function pitchOrderFromHz(hz: readonly number[]): number[] {
  return hz.map((f, i) => [f, i] as const).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
}

/** True when `order` names every tine exactly once. */
export function isPitchOrder(order: readonly number[] | undefined, tines: number): order is number[] {
  if (!order || order.length !== tines) return false;
  const seen = new Set(order);
  return seen.size === tines && order.every((i) => Number.isInteger(i) && i >= 0 && i < tines);
}

/**
 * The pitch order to play by: the configured one when it is a permutation of
 * the tines, otherwise the one the frequencies give (the same, today).
 */
export function pitchOrderOf(hz: readonly number[], configured: readonly number[] | undefined): number[] {
  return isPitchOrder(configured, hz.length) ? [...configured] : pitchOrderFromHz(hz);
}

/** The degree of a tine, or -1. */
export const degreeOfTine = (order: readonly number[], tine: number): number => order.indexOf(tine);

/** The tine of a degree, or undefined when the engine asks for one there is not. */
export function tineOfDegree(order: readonly number[], degree: number): number | undefined {
  return Number.isInteger(degree) && degree >= 0 && degree < order.length ? order[degree] : undefined;
}
