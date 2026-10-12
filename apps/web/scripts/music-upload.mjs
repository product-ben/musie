/**
 * The audio, into the private bucket — and the durations, back into the file.
 *
 * `fakeTracks.ts` does this for a runner with silence it generates;
 * `20260921160000_track_audio.sql` says plainly that uploading the real masters
 * is "an operator act". This is that act, with the three things an operator
 * should not have to do by hand.
 *
 * ── 1. THE MASTER NEVER ENTERS GIT ────────────────────────────────────────
 * Files are read from a folder OUTSIDE the repository (`--from`, default
 * `~/Documents/musie-audio/`), for the reason the artwork masters live outside
 * it: a licensed file committed once cannot be taken back out of any clone's
 * history, and `git rm` leaves the object behind.
 *
 * ── 2. THE DURATION IS MEASURED, NEVER TYPED ──────────────────────────────
 * Every duration in `tracks` was invented by a seed in September and corrected
 * by hand afterwards. A countdown that disagrees with its file is a bug nobody
 * sees until they wait for it — and the German and English cuts of one script
 * differ by enough to matter. So this reads the file: `mvhd` for MP4/AAC,
 * frame headers plus Xing for MP3, and it writes the number back into
 * `music.json` rather than asking for it.
 *
 * NO ffprobe. A script cannot promise what is installed on a laptop, and a
 * missing binary should not stand between Ben and a working exercise.
 *
 * ── 3. THE KEY CARRIES A CONTENT HASH, AND THE RESPONSE IS IMMUTABLE ──────
 * Supabase defaults to `cache-control: max-age=3600`, which is short enough
 * that resuming a session tomorrow re-downloads a twelve-minute file. This
 * uploads with a year and `immutable`, which is only safe because the key
 * carries eight characters of the file's own hash: a re-bounce is a NEW key, a
 * new row value and a new migration, so an immutable response can never go
 * stale behind a browser that cached it.
 *
 * The ID stays derived from the four answers. Only the KEY carries the hash,
 * and the key is data the generated migration states.
 *
 * ── AND IT REFUSES A PAIR THAT DOES NOT MATCH ─────────────────────────────
 * A cut's two stems are two bounces of one session and are the same
 * length. More than 250 ms apart is a bad bounce, and the symptom in the app
 * would be guidance sliding against its own music three minutes in — subtle,
 * intermittent, and nobody's first suspicion. Refused here instead.
 *
 * USAGE
 *   SUPABASE_SERVICE_ROLE_KEY=… pnpm music:upload
 *   SUPABASE_SERVICE_ROLE_KEY=… pnpm music:upload --from ~/Audio/musie
 *   pnpm music:upload --dry-run        # measure and report, upload nothing
 *
 * It prints its target on the first call, as `pnpm test:db` does, and it
 * REFUSES a non-loopback target unless `--i-mean-hosted` is passed: writing
 * half-finished audio into the bucket the real app reads is not a mistake
 * anybody should be able to make by forgetting an environment variable.
 *
 * AFTERWARDS, and this script does none of it for you:
 *   pnpm music:migration   → the migration that states the library
 *   supabase db reset      → applies it locally
 *   pnpm test:db           → proves the database matches the file
 */
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { extname, join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

/* `assertMusic` is deliberately NOT imported: minting the keys it insists on
   is this script's job. See the note at `readMusic` in `main`. */
import { MUSIC_IN_GIT, MUSIC_PATH, readMusic, cutId } from './music.mjs';

/** Matches the bucket in `20260921160000_track_audio.sql`. */
const BUCKET = 'tracks';

/** A year, and `immutable` — safe only because the key carries a hash. */
const CACHE_CONTROL = '31536000, immutable';

/** The mime types the bucket's `allowed_mime_types` permits. */
const CONTENT_TYPES = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.mp4': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
};

/** Two bounces of one session, in milliseconds of tolerable disagreement. */
const STEM_TOLERANCE_MS = 250;

/* ── args ─────────────────────────────────────────────────────────────── */

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const name = token.slice(2);
    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith('--')) {
      args[name] = next;
      index += 1;
    } else {
      args[name] = true;
    }
  }
  return args;
}

/* ── duration, from the bytes ─────────────────────────────────────────── */

/**
 * An MP4/M4A duration, from the `mvhd` atom.
 *
 * EXACT, which is the reason to prefer this container for new audio: `mvhd`
 * carries a timescale and a duration, so there is nothing to estimate — and
 * MP4's sample table makes a SEEK exact too, which matters when two streams
 * have to land on the same place.
 *
 * Walks the atom tree rather than scanning for the four bytes: `moov` can sit
 * after `mdat`, and `mdat` is eleven megabytes of audio that may well contain
 * those four bytes by accident.
 */
function mp4Duration(buffer) {
  const walk = (start, end) => {
    let offset = start;
    while (offset + 8 <= end) {
      let size = buffer.readUInt32BE(offset);
      const type = buffer.toString('ascii', offset + 4, offset + 8);
      let header = 8;
      if (size === 1) {
        /* A 64-bit size, which an eleven-megabyte file will not need but a
           reader that cannot skip one would walk off the end of. */
        if (offset + 16 > end) return null;
        size = Number(buffer.readBigUInt64BE(offset + 8));
        header = 16;
      }
      if (size === 0) size = end - offset;
      if (size < header) return null;

      if (type === 'mvhd') {
        const version = buffer.readUInt8(offset + header);
        const body = offset + header + 4;
        if (version === 1) {
          const timescale = buffer.readUInt32BE(body + 16);
          const duration = Number(buffer.readBigUInt64BE(body + 20));
          return timescale > 0 ? duration / timescale : null;
        }
        const timescale = buffer.readUInt32BE(body + 8);
        const duration = buffer.readUInt32BE(body + 12);
        return timescale > 0 ? duration / timescale : null;
      }

      /* Containers worth descending into. Anything else is skipped whole. */
      if (type === 'moov' || type === 'trak' || type === 'mdia') {
        const found = walk(offset + header, offset + size);
        if (found !== null) return found;
      }

      offset += size;
    }
    return null;
  };
  return walk(0, buffer.length);
}

const MP3_BITRATES = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
];
const MP3_RATES = { 0: 44100, 1: 48000, 2: 32000 };

/** Where the audio starts: past an ID3v2 tag, if there is one. */
function afterId3(buffer) {
  if (buffer.length < 10 || buffer.toString('ascii', 0, 3) !== 'ID3') return 0;
  const size = ((buffer[6] & 0x7f) << 21) | ((buffer[7] & 0x7f) << 14)
    | ((buffer[8] & 0x7f) << 7) | (buffer[9] & 0x7f);
  return 10 + size;
}

/**
 * An MP3 duration — Xing/Info frame count where there is one, bitrate and
 * length where there is not.
 *
 * The fallback is an ESTIMATE, and on a VBR file without a Xing header it is a
 * wrong one. That is a reason to ship `.m4a`, not a reason to guess quietly:
 * the caller prints which method answered.
 */
function mp3Duration(buffer) {
  const start = afterId3(buffer);
  for (let offset = start; offset + 4 < Math.min(buffer.length, start + 65536); offset += 1) {
    if (buffer[offset] !== 0xff || (buffer[offset + 1] & 0xe0) !== 0xe0) continue;

    const versionBits = (buffer[offset + 1] >> 3) & 0x03;
    const layer = (buffer[offset + 1] >> 1) & 0x03;
    if (versionBits === 1 || layer !== 1) continue;           // MPEG-1 Layer III only

    const bitrate = MP3_BITRATES[(buffer[offset + 2] >> 4) & 0x0f];
    const rate = MP3_RATES[(buffer[offset + 2] >> 2) & 0x03];
    if (bitrate === 0 || rate === undefined) continue;

    const mono = ((buffer[offset + 3] >> 6) & 0x03) === 3;
    const sideInfo = mono ? 17 : 32;
    const tagAt = offset + 4 + sideInfo;
    const tag = buffer.length > tagAt + 4 ? buffer.toString('ascii', tagAt, tagAt + 4) : '';

    if (tag === 'Xing' || tag === 'Info') {
      const flags = buffer.readUInt32BE(tagAt + 4);
      if ((flags & 0x01) === 1) {
        const frames = buffer.readUInt32BE(tagAt + 8);
        /* 1152 samples per MPEG-1 Layer III frame. */
        return { seconds: (frames * 1152) / rate, how: 'Xing frame count' };
      }
    }

    const padding = (buffer[offset + 2] >> 1) & 0x01;
    const frameLength = Math.floor((144000 * bitrate) / rate) + padding;
    if (frameLength <= 0) continue;
    const frames = (buffer.length - offset) / frameLength;
    return { seconds: (frames * 1152) / rate, how: 'bitrate estimate' };
  }
  return null;
}

/** Seconds, and how we know. Throws rather than guessing at an unknown type. */
function measure(name, buffer) {
  const extension = extname(name).toLowerCase();
  if (extension === '.m4a' || extension === '.mp4' || extension === '.aac') {
    const seconds = mp4Duration(buffer);
    if (seconds === null) throw new Error(`${name}: no mvhd atom — is it really MP4?`);
    return { seconds, how: 'mvhd' };
  }
  if (extension === '.mp3') {
    const found = mp3Duration(buffer);
    if (found === null) throw new Error(`${name}: found no MPEG frame header.`);
    return found;
  }
  if (extension === '.wav') {
    /* 44 bytes of header and a byte rate, which is what `fakeTracks.ts`
       writes. Exact, and only ever a fixture. */
    const byteRate = buffer.readUInt32LE(28);
    const data = buffer.readUInt32LE(40);
    if (byteRate <= 0) throw new Error(`${name}: byte rate of zero.`);
    return { seconds: data / byteRate, how: 'WAV header' };
  }
  throw new Error(`${name}: ${extension || 'no extension'} is not an audio type this uploads.`);
}

/* ── keys ─────────────────────────────────────────────────────────────── */

/** Eight characters of SHA-256 — enough that a re-bounce is a different key. */
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex').slice(0, 8);

/**
 * The object key for a file: a readable stem, the hash, the extension.
 *
 * `cut-sound-journey-de-lying-sleep-voice-7f3a9c21.m4a`. The key REACHES THE
 * CLIENT (`exercise_cuts` is granted to `authenticated`), and the premise
 * of the exercise is a listener who has not been primed by the title — so the
 * stem names the exercise and the answers, which the person chose themselves,
 * and never the piece.
 */
function objectKey(stem, buffer, name) {
  return `${stem}-${hash(buffer)}${extname(name).toLowerCase()}`;
}

/* ── main ─────────────────────────────────────────────────────────────── */

function target(args) {
  const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (key === undefined || key.trim() === '') {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Uploading is an operator act and needs the '
      + 'service role; pass it for this one run — it does not belong in a file.',
    );
  }
  const loopback = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/|$)/.test(url);
  if (!loopback && args['i-mean-hosted'] !== true) {
    throw new Error(
      `${url} is not the local stack. Writing audio into the bucket the real app reads is `
      + 'not something to do by forgetting an environment variable — pass --i-mean-hosted.',
    );
  }
  console.log(`[musie] uploading to ${url}${loopback ? '' : '  ← HOSTED'}`);
  return createClient(url, key, { auth: { persistSession: false } });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const from = String(args.from ?? join(homedir(), 'Documents', 'musie-audio'));
  /* `readMusic` AND NOT `assertMusic`, deliberately. The strict check demands
     an object key for every recording, and minting those keys is this script's
     entire job — so running it on a library that does not have them yet must
     be possible. `music:migration` is where the strict check belongs, and it
     refuses until this has run. */
  const music = await readMusic();

  let available;
  try {
    available = new Set(await readdir(from));
  } catch {
    throw new Error(`No folder at ${from}. Pass --from if the masters live elsewhere.`);
  }

  /* ── EVERY FILE THIS LIBRARY WANTS, AND WHERE TO READ IT FROM ──────────
     THE SOURCE AND THE KEY ARE DIFFERENT THINGS, and conflating them was the
     first version's mistake. A source is whatever the studio called the file —
     `BodyScan - mit Klang.mp3`, with spaces, capitals and an umlaut two files
     along. A key is ours: lower case, the stem, and a content hash. So the
     library names the source and this script mints the key.

     `*Source` is optional and falls back to the key the library already
     carries, so a second run finds the same file and does nothing. */
  const wanted = [];
  for (const piece of music.pieces) {
    const source = piece.fileSource ?? piece.file;
    if (source !== null && source !== undefined) {
      wanted.push({ of: piece, field: 'file', source, stem: piece.id });
    }
  }
  for (const cut of music.cuts) {
    const id = cutId(cut);
    const mixedSource = cut.mixedSource ?? cut.mixed;
    const voiceSource = cut.voiceSource ?? cut.voice;
    if (mixedSource !== null && mixedSource !== undefined) {
      wanted.push({ of: cut, field: 'mixed', source: mixedSource, stem: `${id}-mixed` });
    }
    if (voiceSource !== null && voiceSource !== undefined) {
      wanted.push({ of: cut, field: 'voice', source: voiceSource, stem: `${id}-voice` });
    }
  }

  const client = args['dry-run'] === true ? null : target(args);
  const measured = new Map();
  const uploaded = [];
  const skipped = [];

  for (const item of wanted) {
    const current = item.of[item.field];

    /* ── WHICH FILE IN THE FOLDER ───────────────────────────────────────
       The named source, exactly. Or, failing that, the stem with an audio
       extension — the convention for a folder somebody tidied.

       NAMED EXACTLY, never matched by prefix: an earlier version of this
       script guessed by prefix and would have paired one exercise's
       guidance-only cut with another exercise's mix on a folder holding
       both. */
    const name = available.has(item.source)
      ? item.source
      : [...available].find((candidate) => {
        const extension = extname(candidate).toLowerCase();
        return extension in CONTENT_TYPES
          && candidate.slice(0, -extension.length) === item.stem;
      });

    if (name === undefined) {
      skipped.push(`${item.stem}: no "${item.source}" and no ${item.stem}.{mp3,m4a,wav} in ${from}.`);
      continue;
    }

    const buffer = await readFile(join(from, name));
    const { seconds, how } = measure(name, buffer);
    const key = objectKey(item.stem, buffer, name);
    measured.set(item.stem, { key, seconds, how, name });

    if (client === null) continue;
    if (key === current) {
      skipped.push(`${key}: already the library's key — unchanged.`);
      continue;
    }

    const { error } = await client.storage.from(BUCKET).upload(key, buffer, {
      contentType: CONTENT_TYPES[extname(name).toLowerCase()],
      cacheControl: CACHE_CONTROL,
      upsert: false,
    });
    /* A key that exists is a file we already have, by definition: the hash is
       in the name. Not an error, and not a reason to overwrite. */
    if (error !== null && !/exists/i.test(error.message)) {
      throw new Error(`${key}: ${error.message}`);
    }
    uploaded.push(`${key}  ${Math.round(seconds)}s  (${how}, from ${name})`);
  }

  /* ── A CUT'S TWO FILES ARE ONE RECORDING, TWICE ───────────────────────
     The switch reads the position off the playing file and writes it to the
     other one, so a pair of different lengths hands over to the wrong moment —
     and the further in, the further wrong. Refused here rather than discovered
     three minutes into an exercise. */
  for (const cut of music.cuts) {
    const id = cutId(cut);
    const mix = measured.get(`${id}-mixed`);
    const voice = measured.get(`${id}-voice`);
    if (mix === undefined || voice === undefined) continue;
    const apart = Math.abs(mix.seconds - voice.seconds) * 1000;
    if (apart > STEM_TOLERANCE_MS) {
      throw new Error(
        `${id}: the two files are ${Math.round(apart)} ms apart (${mix.name} `
        + `${mix.seconds.toFixed(2)}s, ${voice.name} ${voice.seconds.toFixed(2)}s). They are two `
        + 'exports of one cut and must be the same length — the symptom in the app is a switch '
        + 'that hands over to the wrong moment.',
      );
    }
  }

  /* ── the keys and the durations, back into the file ───────────────────── */
  for (const piece of music.pieces) {
    const found = measured.get(piece.id);
    if (found === undefined) continue;
    piece.file = found.key;
    piece.durationSeconds = Math.round(found.seconds);
    delete piece.fileSource;
  }
  for (const cut of music.cuts) {
    const id = cutId(cut);
    const mix = measured.get(`${id}-mixed`);
    const voice = measured.get(`${id}-voice`);
    if (mix !== undefined) {
      cut.mixed = mix.key;
      /* THE MIX IS THE RECORDING, so its length is the cut's. The pair
         agrees within 250 ms by the check above. */
      cut.durationSeconds = Math.round(mix.seconds);
      delete cut.mixedSource;
    }
    if (voice !== undefined) {
      cut.voice = voice.key;
      delete cut.voiceSource;
    }
  }

  if (args['dry-run'] === true) {
    for (const [stem, found] of measured) {
      console.log(`  ${stem}  →  ${found.key}  ${Math.round(found.seconds)}s (${found.how})`);
    }
    for (const line of skipped) console.log(`  · ${line}`);
    console.log('\n--dry-run: nothing uploaded and nothing written.');
    return;
  }

  await writeFile(MUSIC_PATH, `${JSON.stringify(music, null, 2)}\n`, 'utf8');

  for (const line of uploaded) console.log(`  + ${line}`);
  for (const line of skipped) console.log(`  · ${line}`);
  console.log(
    `\n${MUSIC_IN_GIT} now carries the measured durations and the hashed keys.\n`
    + 'Next, and none of it happens on its own:\n'
    + '  pnpm music:migration   writes the migration that states the library\n'
    + '  supabase db reset      applies it locally\n'
    + '  pnpm test:db           proves the database matches the file',
  );
}

main().catch((thrown) => {
  console.error(`[musie] ${thrown instanceof Error ? thrown.message : String(thrown)}`);
  process.exitCode = 1;
});
