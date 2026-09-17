/**
 * useCoarsePointer — Layer 2 helper
 *
 * True when the primary pointer is a finger rather than a cursor.
 *
 * Layer 3 L5 picks a control's target size from the pointer, and it does it
 * through the component's own `size` prop — never by overriding
 * `--musy-icon-btn-size`. This hook is the lever that makes that possible, and
 * it lives in the package rather than in each screen because every screen with
 * a card needs the same split: `--target-min` (24px) is comfortable under a
 * cursor and tight under a thumb, and 24px still clears WCAG 2.2 SC 2.5.8, so
 * the choice is comfort rather than access (Layer 1 §5.4, as amended).
 *
 * NOT a media query in CSS. The size has to reach React, because it also sizes
 * the float spacer in §7.24 — and a spacer that disagrees with the cluster it
 * reserves room for is the one failure in L4 that is invisible at the container
 * level.
 */
import * as React from 'react';

const QUERY = '(pointer: coarse)';

export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  );

  React.useEffect(() => {
    const query = window.matchMedia(QUERY);
    const update = () => setCoarse(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return coarse;
}

/** The two rungs L5 chooses between, in Icon Button's own vocabulary. */
export type ToolSize = 'min' | 'primary';

export function useToolSize(): ToolSize {
  return useCoarsePointer() ? 'primary' : 'min';
}
