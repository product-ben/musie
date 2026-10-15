/**
 * The two things only a browser can tell you about a file it has just been
 * handed: how long the audio is, and what the image looks like smaller.
 *
 * ── WHY THE DURATION IS MEASURED HERE AND NOT ON THE SERVER ───────────────
 * MAINTENANCE-UI.md §6.1 had the server read it, on the principle that a
 * number the client sends is a number the client could get wrong. Two things
 * moved it:
 *
 *   1. The function never sees the bytes. The browser PUTs them straight to
 *      storage through a signed URL, which is what keeps a seven-megabyte
 *      master off an edge function's request limit.
 *   2. A hand-rolled MP3 frame walk is WORSE at this than the platform.
 *      `music-upload.mjs` has one — deliberately without ffprobe, because "a
 *      script cannot promise what is installed on a laptop" — and it gets
 *      variable bitrate right only because it reads the Xing header. The
 *      browser has a real decoder and no such caveat.
 *
 * What survives of the original principle is the part that mattered: THE
 * NUMBER IS NEVER TYPED. Nobody is offered a text box. The function clamps it
 * to a plausible range and writes it into the history, so a bad measurement
 * is visible in the log and one press from being reverted.
 *
 * ── MOSTLY NOT UNIT-TESTED, AND HONESTLY SO ───────────────────────────────
 * `measureDuration` and `resizeArtwork` are thin wrappers over browser APIs
 * that `vitest`'s node environment does not have. Testing them would mean
 * mocking `HTMLMediaElement` and `CanvasRenderingContext2D`, which asserts
 * that the mock behaves like the mock. They are verified by the walk in
 * MAINTENANCE-UI.md §17 instead: an mp3 whose duration appears without being
 * typed, and an image that comes back as a 768-pixel WebP.
 *
 * `asUploadableAudio` IS tested, because it is a pure function over a name
 * and a `Blob` and node has both — and because the bug it fixes was invisible
 * at every other layer: the type it chooses is checked by a server, so
 * nothing in this repository would have gone red when it was wrong.
 */

/* ═══ WHAT THE BUCKET WILL ACCEPT ═══════════════════════════════════════════ */

/**
 * The content type to upload a recording AS, by extension.
 *
 * ── WHY THE FILE'S OWN `type` IS NOT GOOD ENOUGH ──────────────────────────
 * The `tracks` bucket lists four `allowed_mime_types` — `audio/mpeg`,
 * `audio/mp4`, `audio/aac`, `audio/wav` (`20260921160000`) — and storage
 * checks the type the upload ARRIVES with. For a `.m4a` every browser on
 * macOS reports `audio/x-m4a`, which is not on that list, so the PUT came
 * back `mime type audio/x-m4a is not supported` — measured against the local
 * stack on 2026-10-14. `.m4a` is the format this repo's own MP3 parser tells
 * you to prefer ("that is a reason to ship `.m4a`", `music-upload.mjs`), and
 * it could not be uploaded through this screen at all.
 *
 * This is the same table `music-upload.mjs` has carried since September; the
 * CLI worked for `.m4a` precisely because it names the type instead of
 * trusting the file's.
 *
 * ── AND WHY IT IS A NEW BLOB RATHER THAN A `contentType` OPTION ───────────
 * Also measured, and the reason this is not a one-line fix:
 * `uploadToSignedUrl` IGNORES `options.contentType` for a `Blob` or `File`
 * body. It builds a `FormData` and appends the blob, so the multipart part
 * carries the blob's OWN type and the option is never read — only the
 * stream/buffer branch applies it. Passing `contentType` therefore looks
 * exactly like a fix and does nothing. Re-wrapping is what actually lands.
 */
const AUDIO_CONTENT_TYPES: Readonly<Record<string, string>> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
};

/** The extension, lowercased, with nothing else in it. `'' `if there is none. */
function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot <= 0) return '';
  return filename.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** What this screen can upload, for the file picker and the refusal below. */
export const AUDIO_EXTENSIONS = Object.keys(AUDIO_CONTENT_TYPES);

/**
 * The same bytes, labelled with a type the bucket accepts.
 *
 * Throws on an extension the bucket has no type for, rather than uploading
 * and letting storage refuse: the message here can name the formats, and
 * refusing before the row is written is what keeps a failure from leaving a
 * piece behind — see `uploadPieces`.
 */
export function asUploadableAudio(file: Blob, filename: string): Blob {
  const extension = extensionOf(filename);
  const contentType = AUDIO_CONTENT_TYPES[extension];
  if (contentType === undefined) {
    throw new Error(
      `${extension === '' ? 'a file with no extension' : `.${extension}`} is not a format `
      + `this uploads — it takes ${AUDIO_EXTENSIONS.map((e) => `.${e}`).join(', ')}`,
    );
  }
  /* A new Blob over the same bytes: nothing is copied or re-encoded, only the
     label changes. `File` extends `Blob`, so this accepts either. */
  return file.type === contentType ? file : new Blob([file], { type: contentType });
}

/** Two hours. The function refuses anything longer, so this agrees with it. */
const LONGEST_SECONDS = 7200;

/**
 * How long a recording is, from the platform's own decoder.
 *
 * Rejects rather than returning zero: zero is what a decoder reports when it
 * could not read the file, and `validateTrack` has a sentence for a broken
 * upload that is quite different from the one for a missing field. Collapsing
 * the two would hide which has happened.
 */
export function measureDuration(file: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');

    const done = (outcome: () => void): void => {
      URL.revokeObjectURL(url);
      audio.removeAttribute('src');
      outcome();
    };

    audio.addEventListener('loadedmetadata', () => {
      const seconds = audio.duration;
      if (!Number.isFinite(seconds) || seconds <= 0 || seconds > LONGEST_SECONDS) {
        done(() => reject(new Error(
          `the decoder read a duration of ${String(seconds)} seconds, which is not one`,
        )));
        return;
      }
      done(() => resolve(seconds));
    });

    audio.addEventListener('error', () => {
      done(() => reject(new Error('the browser could not decode this file as audio')));
    });

    audio.preload = 'metadata';
    audio.src = url;
  });
}

/** The first two megabytes, which is where a tag lives. */
export const TAG_SLICE_BYTES = 2 * 1024 * 1024;

/** The head of a file, for `readAudioTags`. */
export async function readHead(file: Blob): Promise<Uint8Array> {
  const slice = file.slice(0, Math.min(file.size, TAG_SLICE_BYTES));
  return new Uint8Array(await slice.arrayBuffer());
}

/**
 * 768 × 768 WebP at quality 80, and the number is not a guess.
 *
 * `20260924140000` worked it out: `.musy-rcard__media` is
 * `calc(--target-guided * 3)` — 192px — above the group's container
 * breakpoint, so 768 is 4× the largest slot a card ever gives an image, past
 * any display anyone is holding with the retina margin intact. It took the
 * exercise set from 17 MB of source PNGs to 748 KB.
 *
 * `cover`, centred, which is what `musy-components.css` §7.8 does with these
 * images anyway — so cropping here rather than in the browser later means the
 * stored file and the rendered one agree.
 */
export const ARTWORK_EDGE = 768;
export const ARTWORK_QUALITY = 0.8;

export async function resizeArtwork(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  /* The square crop: the largest centred square the source contains. */
  const edge = Math.min(bitmap.width, bitmap.height);
  const left = Math.round((bitmap.width - edge) / 2);
  const top = Math.round((bitmap.height - edge) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = ARTWORK_EDGE;
  canvas.height = ARTWORK_EDGE;

  const context = canvas.getContext('2d');
  if (context === null) throw new Error('this browser has no 2d canvas');

  context.drawImage(bitmap, left, top, edge, edge, 0, 0, ARTWORK_EDGE, ARTWORK_EDGE);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/webp', ARTWORK_QUALITY);
  });

  /* Safari encoded WebP from a canvas only from 14 on. A browser that cannot
     is better refused than silently handed a PNG under a `.webp` key, which
     would be served with the wrong content type forever. */
  if (blob === null) throw new Error('this browser could not encode a WebP');
  return blob;
}

/**
 * SHA-256 of a file's bytes, hex — what makes "the same file" answerable.
 *
 * ── WHY THE BROWSER, AND WHY NOT THE KEY ──────────────────────────────────
 * `music-upload.mjs` puts eight characters of the hash INTO the object key,
 * so its uploads deduplicate by construction. This screen cannot: the bytes
 * go straight from the browser to storage through a signed URL and the server
 * never holds them, which is what keeps a seven-megabyte master off an edge
 * function's request limit. So the hash is computed here — the one place that
 * has the bytes — and stored in a column with a unique index behind it.
 *
 * ── THE SOURCE, NOT THE RESIZE ────────────────────────────────────────────
 * Artwork is hashed BEFORE `resizeArtwork`. Hashing the WebP would make "the
 * same picture" mean "encoded identically", and two drops of one photograph
 * are the duplicate worth refusing. It also means the answer does not change
 * if the resize ever does.
 *
 * `crypto.subtle` needs a secure context. localhost is one, and so is every
 * address this app is ever served from.
 */
export async function hashFile(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
