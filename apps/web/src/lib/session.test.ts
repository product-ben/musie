/**
 * `completedBefore` — the one piece of pure logic D.4 added, and the reason
 * `sessions` has no `completed` column.
 *
 * WHY THIS IS WORTH TESTING AT ALL. It is four lines. But it is the function
 * that decides what a RESUMED session may reach: get it wrong by one and a
 * returning user either finds the step they are on locked, or finds every step
 * open including ones they never did. Neither would throw, and neither would
 * show up in a typecheck.
 *
 * The rest of `session.ts` is Supabase calls and belongs to `pnpm test:db`.
 */
import { describe, expect, it } from 'vitest';
import { completedBefore } from './session';

describe('completedBefore', () => {
  it('is empty at the first step — nothing is behind intro', () => {
    expect(completedBefore('intro')).toEqual([]);
  });

  it('is every earlier step, in order', () => {
    expect(completedBefore('listen')).toEqual(['intro', 'scan']);
  });

  it('does not include the step you are on', () => {
    /* The step you are standing on is the one you have NOT finished. A session
       resumed at `reflect` has three steps done, not four — which is also what
       stops `FINISH` being available the instant you arrive. */
    expect(completedBefore('reflect')).toEqual(['intro', 'scan', 'listen']);
  });

  it('leaves out a skipped step, so a cardless run reads right', () => {
    /* Breathing Score and Body Scan Soundwalk draw no card. Resuming one of
       them at `listen` means intro is done and scan was never part of the run
       — reporting scan as completed would put a check mark on the rail for
       something nobody did. */
    expect(completedBefore('listen', ['scan'])).toEqual(['intro']);
  });

  it('is still empty at the first step of a run that skips one', () => {
    expect(completedBefore('intro', ['scan'])).toEqual([]);
  });

  it('is the whole run minus the last step, at the last step', () => {
    expect(completedBefore('reflect', ['scan'])).toEqual(['intro', 'listen']);
  });

  it('returns nothing for a step that is not in the run', () => {
    /* `indexOf` is -1, and `slice(0, -1)` would quietly return everything but
       the last element — the classic version of this bug. It must be empty:
       a step outside the run has no predecessors to report. */
    expect(completedBefore('scan', ['scan'])).toEqual([]);
  });
});
