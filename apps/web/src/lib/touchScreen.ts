/**
 * Whether the primary pointer is a finger — a phone or a tablet, not a laptop
 * that happens to have a touch screen (Ben, 2026-11-09: the vibration and
 * motion switches, and the play step's how-to, depend on it). A media query,
 * never the user agent.
 */
export function isTouchScreen(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
}
