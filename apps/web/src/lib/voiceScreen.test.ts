/**
 * The voice editor's decisions, driven by fixture values rather than a
 * microphone — F.4.
 *
 * Every case here is one a real session reaches and that nobody in this
 * worktree can reach: there is no microphone, and `pnpm test:e2e` and the
 * local Supabase stack were both out of bounds for the session that wrote it.
 * So the states are constructed instead of recorded, and the assertions are
 * about which catalogue key comes out.
 *
 * The keys themselves are checked twice over without anything here saying so:
 * `MessageKey` is `keyof typeof en`, and `de.ts` is typed against `en.ts`.
 */
import { describe, expect, it } from 'vitest';

import { de } from '../i18n/de';
import { en } from '../i18n/en';
import {
  hasRecorded, recordLabelKey, recordPhase, stopNoticeKey,
} from './voiceScreen';
import type { RecordPhase } from './voiceScreen';

describe('recordPhase', () => {
  it('is connecting while the token is still in flight, before any socket', () => {
    /* The gap F.1 opened: `status` is still idle during the Edge Function
       round trip, and the button must not invite a second tap in it. */
    expect(recordPhase('idle', true)).toBe('connecting');
  });

  it('is connecting while the socket opens', () => {
    expect(recordPhase('connecting', false)).toBe('connecting');
  });

  it('is recording only once the session is live', () => {
    expect(recordPhase('recording', false)).toBe('recording');
  });

  it('is ready when nothing is happening', () => {
    expect(recordPhase('idle', false)).toBe('ready');
  });
});

describe('recordLabelKey', () => {
  it('invites the first recording', () => {
    expect(recordLabelKey('ready', false)).toBe('reflect.voice.record');
  });

  it('offers MORE once something has been captured, never a fresh start', () => {
    /* start() is called with keepExisting: true, so a second run appends.
       The label has to say so. */
    expect(recordLabelKey('ready', true)).toBe('voice.record.more');
  });

  it('says so while connecting, whether or not anything was captured', () => {
    expect(recordLabelKey('connecting', false)).toBe('voice.record.connecting');
    expect(recordLabelKey('connecting', true)).toBe('voice.record.connecting');
  });

  it('reuses the reflect step’s own recording word', () => {
    expect(recordLabelKey('recording', true)).toBe('reflect.voice.recording');
  });

  it('returns a key that exists in both catalogues, for every phase', () => {
    const phases: RecordPhase[] = ['ready', 'connecting', 'recording'];
    for (const phase of phases) {
      for (const recorded of [false, true]) {
        const key = recordLabelKey(phase, recorded);
        expect(en[key]).toBeTruthy();
        expect(de[key]).toBeTruthy();
      }
    }
  });
});

/* `hintKey` AND ITS THREE CASES ARE GONE (Ben, 2026-09-24). The standing
   sentence under the record button went with them; what still explains the two
   cut-offs is `stopNoticeKey`, when one of them fires. The cut-offs are
   therefore checked below rather than here — same assertion, moved to the
   sentence that now carries it. */
describe('stopNoticeKey', () => {
  it('says nothing when the reader pressed Stop', () => {
    expect(stopNoticeKey('manual')).toBeNull();
  });

  it('says nothing when nothing has run', () => {
    expect(stopNoticeKey(null)).toBeNull();
  });

  it('leaves an error to the error Message rather than doubling it', () => {
    expect(stopNoticeKey('error')).toBeNull();
  });

  it('explains the two cut-offs that act on their own', () => {
    expect(stopNoticeKey('timeout')).toBe('voice.stopped.timeout');
    expect(stopNoticeKey('silence')).toBe('voice.stopped.silence');
  });

  it('carries its cut-off number in both languages', () => {
    /* A recorder that stops on its own without saying WHICH limit it hit reads
       as broken, and these two sentences are now the only place either number
       appears. The number is interpolated, so it has to survive into the
       German string — parity.test.ts checks the slots match, this checks they
       are there at all. */
    expect(en['voice.stopped.timeout']).toContain('{seconds}');
    expect(de['voice.stopped.timeout']).toContain('{seconds}');
    expect(en['voice.stopped.silence']).toContain('{silence}');
    expect(de['voice.stopped.silence']).toContain('{silence}');
  });
});

describe('hasRecorded', () => {
  it('is false before anything has happened', () => {
    expect(hasRecorded(0, null)).toBe(false);
  });

  it('is true once a statement exists', () => {
    expect(hasRecorded(1, null)).toBe(true);
  });

  it('is true after a run that produced nothing at all', () => {
    /* A silent minute, or a refused microphone: the attempt happened, and the
       button should offer to add to it rather than pretend otherwise. */
    expect(hasRecorded(0, 'silence')).toBe(true);
    expect(hasRecorded(0, 'error')).toBe(true);
  });
});
