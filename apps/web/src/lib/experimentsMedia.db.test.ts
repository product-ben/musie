/**
 * The `experiments` bucket: public to read, closed to write.
 *
 * `20261119170000_experiments_media_bucket.sql` makes it public so a page
 * under /experiments, which has no session, can stream from it (musie.org's
 * own static files cannot answer `Range`, and Safari on iOS needs that).
 * Public to READ is the point. Public to WRITE would make musie's Supabase
 * project a free file host with a trusted domain, and no screen would show
 * it. Nothing in the migration grants a write, so the refusal is asserted
 * here, where removing it is a diff somebody reviews.
 */
import { describe, expect, it } from 'vitest';

import { anonClient, serviceClient, testUser } from './db.support';

const BUCKET = 'experiments';
/* Two bytes are enough to be refused. An MP3 type, so a refusal cannot be the
   bucket's type list doing the job the missing policy should. */
const PROBE = new Blob([new Uint8Array([0xff, 0xfb])], { type: 'audio/mpeg' });

describe('the experiments bucket', () => {
  it('exists and is public', async () => {
    const { data, error } = await serviceClient().storage.getBucket(BUCKET);

    expect(error, 'the experiments bucket does not exist').toBeNull();
    expect(data?.public, 'the experiments bucket is private — no /experiments page can stream from it').toBe(true);
  }, 30_000);

  it('takes audio and video only', async () => {
    const { data } = await serviceClient().storage.getBucket(BUCKET);

    expect(data?.allowed_mime_types).toEqual([
      'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'video/mp4', 'video/webm',
    ]);
  }, 30_000);

  it('refuses an upload from a visitor', async () => {
    const key = `db-suite/anon-${Date.now()}.mp3`;
    const { error } = await anonClient().storage.from(BUCKET).upload(key, PROBE);

    expect(error, 'a visitor with no session uploaded to the public bucket').not.toBeNull();
  }, 30_000);

  it('refuses an upload from a signed-in user', async () => {
    const { client } = await testUser();
    const key = `db-suite/user-${Date.now()}.mp3`;
    const { error } = await client.storage.from(BUCKET).upload(key, PROBE);

    expect(error, 'a signed-in user uploaded to the public bucket').not.toBeNull();
  }, 30_000);
});
