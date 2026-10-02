/**
 * The test that would have caught the bug.
 *
 * The defect docs/VOICE-CAPTURE-FIX.md describes was one predicate answering
 * two questions, and the fix is telling them apart — so the cases that matter
 * are the pairs that used to be indistinguishable. Each one below is a
 * sentence the app says to a person, and the wrong one was a lie.
 */
import { describe, expect, it } from 'vitest';
import { captureVerdict, type CaptureState } from './health';
import { CAPTURE_LOST_MS, CONNECT_TIMEOUT_MS, IDLE_STOP_MS } from '../config';

const NOW = 1_000_000;

/** Live, capturing, mid-sentence: every clock fresh. The tests move one at a
 *  time off this, so a failure names the clock that broke. */
const healthy = (over: Partial<CaptureState> = {}): CaptureState => ({
  captureLiveAt: NOW - 3000,
  connectingSince: NOW - 3500,
  lastChunkAt: NOW,
  lastSoundAt: NOW,
  awaitingStatement: false,
  heardAnySound: true,
  ...over,
});

describe('captureVerdict · the two silences are not the same silence', () => {
  it('calls a quiet room a quiet room: chunks arriving, none of them loud', () => {
    expect(captureVerdict(NOW, healthy({
      lastChunkAt: NOW,                 // the worklet is posting
      lastSoundAt: NOW - IDLE_STOP_MS,  // and none of it is above the threshold
    }))).toBe('quiet-room');
  });

  it('calls a lost capture lost: no chunks at all', () => {
    expect(captureVerdict(NOW, healthy({
      lastChunkAt: NOW - CAPTURE_LOST_MS,
      lastSoundAt: NOW - CAPTURE_LOST_MS,
    }))).toBe('capture-lost');
  });

  /* THE REGRESSION TEST FOR THE ACTUAL BUG. Both clocks are stale, which is
     what a dead microphone looks like — and it must NOT be reported as the
     person having gone quiet. Before the fix this state produced
     stop('silence') and the sentence "it went quiet for 6 seconds". */
  it('prefers capture-lost when BOTH clocks are stale — the reported bug', () => {
    expect(captureVerdict(NOW, healthy({
      lastChunkAt: NOW - 60_000,
      lastSoundAt: NOW - 60_000,
    }))).toBe('capture-lost');
  });
});

describe('captureVerdict · connecting has its own ceiling', () => {
  it('is live while connecting, however silent — there is nothing to be silent about yet', () => {
    expect(captureVerdict(NOW, {
      captureLiveAt: null,
      connectingSince: NOW - 6500,   // past IDLE_STOP_MS, and irrelevant
      lastChunkAt: NOW - 6500,
      lastSoundAt: NOW - 6500,
      awaitingStatement: false,
      heardAnySound: false,
    })).toBe('live');
  });

  it('reports never-started once connecting outlasts CONNECT_TIMEOUT_MS', () => {
    expect(captureVerdict(NOW, {
      captureLiveAt: null,
      connectingSince: NOW - CONNECT_TIMEOUT_MS,
      lastChunkAt: NOW - CONNECT_TIMEOUT_MS,
      lastSoundAt: NOW - CONNECT_TIMEOUT_MS,
      awaitingStatement: false,
      heardAnySound: false,
    })).toBe('never-started');
  });

  /* The whole point of the timing half of the fix: a slow start is no longer
     charged against the person's six seconds of silence. */
  it('does not spend the silence budget on the handshake', () => {
    const justLive = healthy({
      captureLiveAt: NOW,
      connectingSince: NOW - 5900,  // the start took nearly six seconds
      lastChunkAt: NOW,
      lastSoundAt: NOW,
      heardAnySound: false,
    });
    expect(captureVerdict(NOW, justLive)).toBe('live');
  });
});

describe('captureVerdict · a statement in flight holds the session open', () => {
  it('overrides the quiet room', () => {
    expect(captureVerdict(NOW, healthy({
      lastSoundAt: NOW - IDLE_STOP_MS * 2,
      awaitingStatement: true,
    }))).toBe('live');
  });

  it('overrides a lost capture too — the statement is worth more than the tidy stop', () => {
    expect(captureVerdict(NOW, healthy({
      lastChunkAt: NOW - CAPTURE_LOST_MS * 2,
      awaitingStatement: true,
    }))).toBe('live');
  });

  it('does NOT override never-started: nothing can be in flight before capture', () => {
    expect(captureVerdict(NOW, {
      captureLiveAt: null,
      connectingSince: NOW - CONNECT_TIMEOUT_MS,
      lastChunkAt: NOW,
      lastSoundAt: NOW,
      awaitingStatement: true,
      heardAnySound: false,
    })).toBe('never-started');
  });
});

describe('captureVerdict · the idle cut-off arms on the first sound', () => {
  /* Ben's call. Six seconds of deciding how you feel is not abandonment, and
     the recorder should wait for you to begin rather than counting from the
     moment it started listening. */
  it('never reports a quiet room before a single loud chunk has been heard', () => {
    expect(captureVerdict(NOW, healthy({
      lastChunkAt: NOW,                    // capture is healthy…
      lastSoundAt: NOW - IDLE_STOP_MS * 5, // …and nobody has spoken yet
      heardAnySound: false,
    }))).toBe('live');
  });

  it('reports it once they have spoken and then stopped', () => {
    expect(captureVerdict(NOW, healthy({
      lastChunkAt: NOW,
      lastSoundAt: NOW - IDLE_STOP_MS,
      heardAnySound: true,
    }))).toBe('quiet-room');
  });

  it('still reports a lost capture before the first sound — that is a failure, not patience', () => {
    expect(captureVerdict(NOW, healthy({
      lastChunkAt: NOW - CAPTURE_LOST_MS,
      heardAnySound: false,
    }))).toBe('capture-lost');
  });
});

describe('captureVerdict · the boundaries are inclusive, as the code reads', () => {
  it('holds one millisecond under each threshold', () => {
    expect(captureVerdict(NOW, healthy({ lastChunkAt: NOW - (CAPTURE_LOST_MS - 1) }))).toBe('live');
    expect(captureVerdict(NOW, healthy({ lastSoundAt: NOW - (IDLE_STOP_MS - 1) }))).toBe('live');
    expect(captureVerdict(NOW, {
      ...healthy(),
      captureLiveAt: null,
      connectingSince: NOW - (CONNECT_TIMEOUT_MS - 1),
    })).toBe('live');
  });
});
