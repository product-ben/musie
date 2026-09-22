/**
 * `hasAnswered` — is there something to WRITE?
 *
 * Worth testing because the consequence of getting it wrong is silent: a
 * `true` where it should be `false` lets a session finish claiming a
 * reflection that was never stored, which is the one thing a diary must never
 * do. *Skip reflection* does not consult this at all — it takes its own path
 * and writes no row.
 */
import { describe, expect, it } from 'vitest';
import { hasAnswered } from './reflect';

describe('hasAnswered', () => {
  it('is false on an empty typed answer', () => {
    expect(hasAnswered('text', '')).toBe(false);
  });

  it('is false on whitespace alone', () => {
    /* A space bar is not an answer, and `body` would be stored as one. */
    expect(hasAnswered('text', '   \n  ')).toBe(false);
  });

  it('is true once there are words', () => {
    expect(hasAnswered('text', 'A tightness behind the ribs.')).toBe(true);
  });

  it('is false for voice, because voice writes nothing yet', () => {
    /* PHOTO ONLY, SINCE F.6. Voice now produces words and `hasAnswered` takes
       them through `spokenWords` — see MOCKUPS.md 1. This still holds for
       photo, which produces nothing to store. The original note read:
       "The recorder is UI only — no MediaRecorder, no upload, no
       transcription — so a session finished from it would carry a reflection
       that does not exist. The day Phase F lands, a transcript is words and
       this expectation flips. */
    expect(hasAnswered('voice', '')).toBe(false);
  });

  it('is false for photo, and text in the box does not rescue it', () => {
    /* The mode is what decides, not leftover text from a mode the person
       switched away from. Reading a photo is blocked on which vision model
       does it (MOCKUPS.md 2), so nothing it captures can be stored. */
    expect(hasAnswered('photo', 'typed earlier, then switched')).toBe(false);
  });
});
