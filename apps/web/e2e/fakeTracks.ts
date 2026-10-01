/**
 * THE RECORDINGS, WITHOUT THE RECORDINGS — the audio half of E.4, for a runner.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * `reveal.spec.ts` cannot start without a playable track: it presses play,
 * waits for `duration` to become finite, seeks past the listen gate and only
 * then can the reveal happen. On a fresh local stack there is nothing to play.
 * The four masters are an operator upload — `20260921160000_track_audio.sql`
 * says so, and that migration grants the client nothing but `select` — they are
 * licensed from Epidemic Sound, and they are not in this repository. So after a
 * `supabase start` on a new machine the walk times out waiting for an `<audio>`
 * that can never mount, which reads as an app defect and is not one.
 *
 * This is the same trick `fakeCamera.ts` plays for the camera, for the same
 * reason and with the same honesty about it: everything is real except the
 * photons. Here everything is real except the music. The storage API, the
 * signed URL, the private bucket, the RLS policy, the `<audio>` element, the
 * decode, the position and the gate are all genuinely exercised — against a
 * file this module generated.
 *
 * ── WHAT IT DOES NOT PROVE, SAID PLAINLY ──────────────────────────────────
 * That the real masters are uploaded, that they are the right length, or that
 * they sound like anything. A green walk here says the PLUMBING works. BUILD-
 * PLAN's "five recordings still owed" is untouched by it.
 *
 * ── IT NEVER OVERWRITES ───────────────────────────────────────────────────
 * Every upload is `upsert: false` and skipped outright when an object is
 * already at the key, so a stack that HAS the real masters keeps them and this
 * module does nothing. That is the whole reason it is safe to leave in
 * `globalSetup` rather than behind a flag.
 *
 * ── AND IT REFUSES ANYTHING THAT IS NOT LOCAL ─────────────────────────────
 * Writing fixture audio into the hosted project would put silent files in the
 * bucket the real app reads, behind keys the diary plays. `stack()` already
 * refuses to let the walks address a database the browser is not using; this
 * adds the other half — the target must be loopback, whatever the keys say.
 */
import { createClient } from '@supabase/supabase-js';

import { stack } from './support';

/** Matches the bucket in `20260921160000_track_audio.sql`. */
const BUCKET = 'tracks';

/**
 * 8 kHz, 8-bit, mono — the smallest shape every browser decodes.
 *
 * A track is up to 219 seconds (`tracks.duration_seconds`), which at CD rates
 * would be 38 MB of silence per file. At these rates it is 1.75 MB, and
 * nothing in any walk listens to it: `reveal.spec.ts` asks the element for a
 * finite `duration` and then seeks, and neither cares how good it sounds.
 */
const SAMPLE_RATE = 8_000;

/**
 * WAV, not MP3, and the file extension is NOT the reason.
 *
 * `tracks.src` holds keys like `trk-04.mp3` — the app's own data, which a test
 * fixture has no business rewriting. What a browser actually obeys is the
 * Content-Type on the response, and Supabase serves back whatever was stored
 * with the object. So the key keeps its name and the bytes are announced as
 * `audio/wav`, which the bucket's `allowed_mime_types` permits alongside
 * `audio/mpeg`.
 *
 * The alternative was generating a valid MP3 bitstream by hand, which needs a
 * frame-accurate encoder to get a seekable duration out of. A PCM WAV header
 * is forty-four exact bytes.
 */
const CONTENT_TYPE = 'audio/wav';

/**
 * A silent PCM WAV of exactly `seconds` seconds.
 *
 * 8-bit PCM is UNSIGNED, so silence is 128 and not 0 — a buffer of zeroes here
 * is a buffer of full-scale negative, which is a click, then DC. It decodes
 * either way and nothing listens, but a fixture that is wrong on purpose is
 * one somebody has to re-derive later.
 */
function silentWav(seconds: number): Buffer {
  const samples = Math.max(1, Math.round(seconds * SAMPLE_RATE));
  const header = Buffer.alloc(44);

  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + samples, 4); // everything after this field
  header.write('WAVE', 8, 'ascii');

  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16); // PCM fmt chunk length
  header.writeUInt16LE(1, 20); // 1 = PCM, uncompressed
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE, 28); // byte rate = rate × channels × bytes
  header.writeUInt16LE(1, 32); // block align
  header.writeUInt16LE(8, 34); // bits per sample

  header.write('data', 36, 'ascii');
  header.writeUInt32LE(samples, 40);

  return Buffer.concat([header, Buffer.alloc(samples, 0x80)]);
}

/**
 * Give every track that claims a recording something to play.
 *
 * Reads `tracks` rather than taking a list, so a fifth recording arriving in a
 * migration is covered without this file being edited — and the five with a
 * NULL `src` stay NULL, because those are the schema saying there is no
 * recording and the simulated clock is the behaviour under test.
 */
export default async function seedTrackAudio(): Promise<void> {
  const { API_URL, SERVICE_ROLE_KEY } = stack();

  /* LOOPBACK ONLY. See the header: silent files in the hosted bucket would be
     played back to real people from the real diary. */
  const host = new URL(API_URL).hostname;
  if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1') {
    throw new Error(
      `refusing to seed fixture audio into ${API_URL}.\n` +
      'This writes silent files into the `tracks` bucket and is only ever ' +
      'correct against a local stack. Point the walks at `supabase start`, or ' +
      'upload the real masters to that project by hand.',
    );
  }

  const db = createClient(API_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: tracks, error } = await db
    .from('tracks')
    .select('id, src, duration_seconds')
    .not('src', 'is', null);
  if (error !== null) {
    throw new Error(`[musie] fake tracks: could not read tracks: ${error.message}`);
  }

  let written = 0;
  let kept = 0;
  for (const track of tracks ?? []) {
    const key = track.src as string;
    const seconds = (track.duration_seconds as number | null) ?? 120;

    /* ALREADY THERE IS THE COMMON CASE and the one worth being quiet about:
       a stack with the real masters, or a second run in the same session. */
    const { data: found } = await db.storage
      .from(BUCKET)
      .list('', { search: key, limit: 1 });
    if ((found ?? []).some((object) => object.name === key)) {
      kept += 1;
      continue;
    }

    const { error: failed } = await db.storage
      .from(BUCKET)
      .upload(key, silentWav(seconds), { contentType: CONTENT_TYPE, upsert: false });

    /* A RACE IS NOT A FAILURE. Two projects start within a second of each
       other on a cold stack, both find the key missing and both upload; the
       loser gets 409 and the object it wanted exists, which is the outcome it
       was asking for. */
    if (failed !== null && !/exists|duplicate|409/i.test(failed.message)) {
      throw new Error(`[musie] fake tracks: could not upload ${key}: ${failed.message}`);
    }
    written += 1;
  }

  /* Said out loud, because a walk that plays silence should never be a thing
     somebody discovers while debugging a reveal that "works locally". */
  if (written > 0) {
    console.info(
      `[musie] fake tracks: wrote ${written} SILENT placeholder${written === 1 ? '' : 's'} ` +
      `into the \`${BUCKET}\` bucket (${kept} already present). ` +
      'The real masters are an operator upload and are not in this repository.',
    );
  }
}
