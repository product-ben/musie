/**
 * The one function in `mediaFile.ts` that node can hold — and the one whose
 * mistake nothing else would have caught.
 *
 * ── WHY THIS IS WORTH A TEST WHEN ITS NEIGHBOURS ARE NOT ──────────────────
 * `measureDuration` and `resizeArtwork` need a decoder and a canvas, so they
 * are walked by hand (MAINTENANCE-UI.md §17). This one is a name and a
 * `Blob`, which node has. More to the point, THE CONSEQUENCE OF GETTING IT
 * WRONG IS INVISIBLE LOCALLY: the content type it chooses is judged by
 * Supabase storage against the bucket's `allowed_mime_types`, so a wrong one
 * is a refusal at upload time and a green `pnpm check` — which is exactly how
 * `.m4a` came to be unuploadable through the maintenance screen while the
 * CLI, which has carried this same table since September, kept working.
 */
import { describe, expect, it } from 'vitest';
import { AUDIO_EXTENSIONS, asUploadableAudio } from './mediaFile';

/* `Uint8Array<ArrayBuffer>` rather than a bare `Uint8Array`: TypeScript 5.7
   made the backing buffer generic, and only the non-shared form is a
   `BlobPart`. */
const bytes = (): Uint8Array<ArrayBuffer> => new Uint8Array([0x49, 0x44, 0x33, 0x04]);

describe('the type a recording is uploaded as', () => {
  /**
   * The four the bucket permits — `20260921160000`. If this list and the
   * migration's ever disagree, the upload is the thing that breaks.
   */
  it.each([
    ['track.mp3', 'audio/mpeg'],
    ['track.m4a', 'audio/mp4'],
    ['track.mp4', 'audio/mp4'],
    ['track.aac', 'audio/aac'],
    ['track.wav', 'audio/wav'],
  ])('labels %s as %s', async (filename, expected) => {
    const blob = asUploadableAudio(new Blob([bytes()]), filename);
    expect(blob.type).toBe(expected);
  });

  /**
   * THE CASE THAT WAS BROKEN. Every browser on macOS calls a `.m4a`
   * `audio/x-m4a`, which the bucket does not list, and storage judges the
   * type the bytes arrive with — so the file's own type has to be replaced
   * rather than trusted.
   */
  it('replaces the type macOS gives a .m4a', () => {
    const picked = new File([bytes()], "Lion's Hoop.m4a", { type: 'audio/x-m4a' });
    expect(asUploadableAudio(picked, picked.name).type).toBe('audio/mp4');
  });

  it('is not fooled by the case of the extension', () => {
    expect(asUploadableAudio(new Blob([bytes()]), 'TRACK.MP3').type).toBe('audio/mpeg');
  });

  /* A studio's export is called `BodyScan - mit Hintergrund.mp3`. */
  it('reads the last dot, not the first', () => {
    const name = "ES_The Lion's Hoop - Jon Bjork.master.v2.mp3";
    expect(asUploadableAudio(new Blob([bytes()]), name).type).toBe('audio/mpeg');
  });

  it('keeps the bytes, and copies nothing it does not have to', async () => {
    const original = bytes();
    const blob = asUploadableAudio(new Blob([original]), 'track.m4a');
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(original);
    expect(blob.size).toBe(original.length);
  });

  /* Already right is left alone — a `.mp3` picked anywhere reports this. */
  it('hands back the same object when the type already agrees', () => {
    const file = new File([bytes()], 'track.mp3', { type: 'audio/mpeg' });
    expect(asUploadableAudio(file, file.name)).toBe(file);
  });
});

/**
 * ── IT REFUSES RATHER THAN LETTING STORAGE REFUSE ─────────────────────────
 * The message can name the formats here, and — the real reason — `uploadPieces`
 * calls this BEFORE it writes the row. A format that cannot be uploaded
 * therefore leaves no piece and no fingerprint behind, which is what keeps it
 * from blocking the next drop of the same file.
 */
describe('a format the bucket has no type for', () => {
  it.each(['track.flac', 'track.ogg', 'track.aiff', 'track.wma'])(
    'refuses %s, naming what it does take',
    (filename) => {
      expect(() => asUploadableAudio(new Blob([bytes()]), filename))
        .toThrow(/is not a format this uploads/);
    },
  );

  it('says so when there is no extension at all', () => {
    expect(() => asUploadableAudio(new Blob([bytes()]), 'master'))
      .toThrow(/a file with no extension/);
  });

  it('names every format it accepts, so the sentence stays true', () => {
    let message = '';
    try { asUploadableAudio(new Blob([bytes()]), 'track.flac'); }
    catch (thrown: unknown) { message = thrown instanceof Error ? thrown.message : ''; }
    for (const extension of AUDIO_EXTENSIONS) expect(message).toContain(`.${extension}`);
  });
});
