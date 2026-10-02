import { describe, expect, it } from 'vitest';
import { discoveredFrom } from './discovered';
import type { DiscoveredRow } from './discovered';

/** A session row, with the two facts that decide everything overridable. */
function row(over: Partial<DiscoveredRow> & { trackId?: string; src?: string | null }): DiscoveredRow {
  const { trackId = 'trk-01', src = 'assets/audio/mc-01-joy.mp3', ...rest } = over;
  return {
    id: 'ses-1',
    listened_at: '2026-10-01T10:00:00.000Z',
    track_id: trackId,
    tracks: { id: trackId, src, duration_seconds: 196 },
    ...rest,
  };
}

describe('discoveredFrom', () => {
  it('keeps a session that played a track with a file', () => {
    expect(discoveredFrom([row({})])).toEqual([
      {
        trackId: 'trk-01',
        sessionId: 'ses-1',
        src: 'assets/audio/mc-01-joy.mp3',
        durationSeconds: 196,
        listenedAt: '2026-10-01T10:00:00.000Z',
      },
    ]);
  });

  /* BEN'S RULE, and the whole reason `listened_at` exists: reaching the listen
     step is not discovering music. */
  it('drops a session where play was never pressed', () => {
    expect(discoveredFrom([row({ listened_at: null })])).toEqual([]);
  });

  /* Five of the nine cards are silent, and a press on one of them runs the
     simulated clock — so the row is stamped like any other and must not
     become a player for a file that does not exist. */
  it('drops a played session whose track has no file', () => {
    expect(discoveredFrom([row({ src: null })])).toEqual([]);
    expect(discoveredFrom([row({ src: '   ' })])).toEqual([]);
  });

  it('drops a session with no track at all', () => {
    expect(discoveredFrom([row({ trackId: 'trk-01', tracks: null })])).toEqual([]);
  });

  /* PostgREST hands a to-one embed back as an object and supabase-js types it
     as an array. Both shapes have to work. */
  it('accepts the embed as an array', () => {
    const asArray: DiscoveredRow = {
      ...row({}),
      tracks: [{ id: 'trk-01', src: 'assets/audio/mc-01-joy.mp3', duration_seconds: 196 }],
    };
    expect(discoveredFrom([asArray])).toHaveLength(1);
  });

  describe('one row per recording', () => {
    const first = row({ id: 'ses-early', listened_at: '2026-09-01T09:00:00.000Z' });
    const again = row({ id: 'ses-late', listened_at: '2026-10-01T09:00:00.000Z' });

    it('collapses two plays of the same track to one row', () => {
      expect(discoveredFrom([first, again])).toHaveLength(1);
    });

    /* The session it carries is what gets exchanged for a title, and the
       discovery is the FIRST time it played. */
    it('keeps the earliest session, whichever order the rows arrive in', () => {
      expect(discoveredFrom([first, again])[0].sessionId).toBe('ses-early');
      expect(discoveredFrom([again, first])[0].sessionId).toBe('ses-early');
    });
  });

  it('lists the newest discovery first', () => {
    const joy = row({ id: 's1', trackId: 'trk-01', listened_at: '2026-09-01T09:00:00.000Z' });
    const calm = row({ id: 's2', trackId: 'trk-05', listened_at: '2026-10-01T09:00:00.000Z' });
    expect(discoveredFrom([joy, calm]).map((t) => t.trackId)).toEqual(['trk-05', 'trk-01']);
  });

  it('is empty for somebody who has never pressed play', () => {
    expect(discoveredFrom([])).toEqual([]);
  });
});
