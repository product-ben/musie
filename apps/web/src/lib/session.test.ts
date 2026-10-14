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
  /* ── EVERY CASE NAMES ITS RUN NOW ───────────────────────────────────────
     `skipped` defaulted to `[]` and most of these passed nothing, which was
     harmless while every step was in every run. It stopped being harmless on
     2026-10-14: `STEP_IDS` holds six names and a card run uses four of them,
     so a call that names no skips is asking about a run that does not exist
     and gets `view` and `select` reported as completed.

     The real caller always knows its run — `Session.tsx` hands over
     `skippedForRun` — so the tests do too. These four constants are the three
     card runs and the listening one, spelled as that function would. */
  const PAPER = ['view', 'select'] as const;
  const FIVE = ['scan', 'view'] as const;
  const ONE = ['scan', 'select'] as const;
  const CARDLESS = ['scan', 'view', 'select'] as const;

  it('is empty at the first step — nothing is behind intro', () => {
    expect(completedBefore('intro', PAPER)).toEqual([]);
  });

  it('is every earlier step, in order', () => {
    expect(completedBefore('listen', PAPER)).toEqual(['intro', 'scan']);
  });

  it('does not include the step you are on', () => {
    /* The step you are standing on is the one you have NOT finished. A session
       resumed at `reflect` has three steps done, not four — which is also what
       stops `FINISH` being available the instant you arrive. */
    expect(completedBefore('reflect', PAPER)).toEqual(['intro', 'scan', 'listen']);
  });

  it('counts the digital second step, and only that one', () => {
    /* The substitution, seen from the other side: a run that took `select`
       reports it as completed at `listen`, and never mentions the two it did
       not take. */
    expect(completedBefore('listen', FIVE)).toEqual(['intro', 'select']);
    expect(completedBefore('listen', ONE)).toEqual(['intro', 'view']);
  });

  it('leaves out a skipped step, so a cardless run reads right', () => {
    /* Mindful Breathing, Sound Journey and Body Scan draw no card. Resuming
       one at `listen` means intro is done and the second step was never part
       of the run — reporting it as completed would put a check mark on the
       rail for something nobody did. */
    expect(completedBefore('listen', CARDLESS)).toEqual(['intro']);
  });

  it('is still empty at the first step of a run that skips one', () => {
    expect(completedBefore('intro', CARDLESS)).toEqual([]);
  });

  it('is the whole run minus the last step, at the last step', () => {
    expect(completedBefore('reflect', CARDLESS)).toEqual(['intro', 'listen']);
  });

  it('returns nothing for a step that is not in the run', () => {
    /* `indexOf` is -1, and `slice(0, -1)` would quietly return everything but
       the last element — the classic version of this bug. It must be empty:
       a step outside the run has no predecessors to report. */
    expect(completedBefore('scan', CARDLESS)).toEqual([]);
    expect(completedBefore('view', PAPER)).toEqual([]);
  });
});
