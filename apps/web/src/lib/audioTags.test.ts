/**
 * The tag reader, against files built byte by byte.
 *
 * ── WHY SYNTHETIC BUFFERS AND NOT FIXTURES ────────────────────────────────
 * The real masters are licensed and live outside the repository on purpose
 * (`music-upload.mjs`: "a licensed file committed once cannot be taken back
 * out of any clone's history"). So there is nothing to commit as a fixture,
 * and a parser tested against one file is a parser tested against one
 * exporter. Building the bytes here tests the FORMAT instead — including the
 * three encodings and the two frame-size rules that an exporter chooses
 * between without telling anyone.
 *
 * Every builder below is the spec written as code, which is also why they are
 * worth reading: ID3v2.4 made frame sizes syncsafe and v2.3 did not, and that
 * one difference is the bug this file exists to have caught.
 */
import { describe, expect, it } from 'vitest';
import { readAudioTags } from './audioTags';

/* ═══ BUILDERS ══════════════════════════════════════════════════════════════ */

const ascii = (text: string): number[] => [...text].map((c) => c.charCodeAt(0));
const utf8 = (text: string): number[] => [...new TextEncoder().encode(text)];

/** Seven bits a byte, top bit clear — how ID3 writes a size. */
const syncsafe = (n: number): number[] =>
  [(n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f];

const uint32 = (n: number): number[] =>
  [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];

/** UTF-16 little-endian, with the byte-order mark that says so. */
const utf16le = (text: string): number[] => {
  const bytes = [0xff, 0xfe];
  for (const unit of text) {
    const code = unit.charCodeAt(0);
    bytes.push(code & 0xff, (code >> 8) & 0xff);
  }
  return bytes;
};

interface FrameOptions {
  /** 0 ISO-8859-1 · 1 UTF-16 with BOM · 2 UTF-16BE · 3 UTF-8 */
  encoding?: number;
  /** 3 or 4. Decides whether the frame size is syncsafe. */
  major?: number;
}

function frame(id: string, text: string, options: FrameOptions = {}): number[] {
  const encoding = options.encoding ?? 3;
  const major = options.major ?? 4;
  const body =
    encoding === 0 ? ascii(text)
    : encoding === 1 ? utf16le(text)
    : utf8(text);
  const payload = [encoding, ...body];
  const size = major === 4 ? syncsafe(payload.length) : uint32(payload.length);
  return [...ascii(id), ...size, 0, 0, ...payload];
}

function id3(frames: number[][], major = 4, extraFlags = 0): Uint8Array {
  const body = frames.flat();
  return new Uint8Array([
    ...ascii('ID3'), major, 0, extraFlags, ...syncsafe(body.length), ...body,
  ]);
}

function atom(name: string, payload: number[]): number[] {
  return [...uint32(8 + payload.length), ...ascii(name), ...payload];
}

/** An `ilst` entry's value: four bytes of type, four of an unused locale. */
function data(payload: number[], type = 1): number[] {
  return atom('data', [0, 0, 0, type, 0, 0, 0, 0, ...payload]);
}

function mp4(entries: number[][]): Uint8Array {
  const ilst = atom('ilst', entries.flat());
  /* `meta` carries four bytes of version and flags before its children, which
     is the one atom you cannot walk into naively. */
  const meta = atom('meta', [0, 0, 0, 0, ...ilst]);
  return new Uint8Array([
    ...atom('ftyp', ascii('M4A ')),
    ...atom('moov', atom('udta', meta)),
  ]);
}

/* ═══ ID3v2 ═════════════════════════════════════════════════════════════════ */

describe('an mp3 with ID3v2.4', () => {
  it('reads the five fields the form wants', () => {
    const file = id3([
      frame('TIT2', 'Little Yellow Petals'),
      frame('TPE1', 'Rachel Sandy'),
      frame('TALB', 'Petals & Dust'),
      frame('TDRC', '2021-04-03'),
      frame('TBPM', '74'),
    ]);

    expect(readAudioTags(file)).toEqual({
      title: 'Little Yellow Petals',
      artist: 'Rachel Sandy',
      album: 'Petals & Dust',
      year: 2021,
      tempoBpm: 74,
    });
  });

  /* TDRC is a whole timestamp in v2.4; only the year is wanted. */
  it('takes the year out of a full date', () => {
    expect(readAudioTags(id3([frame('TDRC', '1998-12-24T18:30')])).year).toBe(1998);
  });

  it('reads UTF-8, so German survives', () => {
    const file = id3([frame('TIT2', 'Schwere Luft über Köln')]);
    expect(readAudioTags(file).title).toBe('Schwere Luft über Köln');
  });

  it('reads UTF-16 with a byte-order mark', () => {
    const file = id3([frame('TIT2', 'Kalte Sonne', { encoding: 1 })]);
    expect(readAudioTags(file).title).toBe('Kalte Sonne');
  });

  it('reads ISO-8859-1, which is what old exporters write', () => {
    const file = id3([frame('TPE1', 'Bjork', { encoding: 0 })]);
    expect(readAudioTags(file).artist).toBe('Bjork');
  });

  it('trims the padding a fixed-width tag leaves behind', () => {
    const file = id3([frame('TIT2', 'Aufgehen\0\0\0')]);
    expect(readAudioTags(file).title).toBe('Aufgehen');
  });

  it('ignores a frame it does not want', () => {
    const file = id3([frame('TCON', 'Ambient'), frame('TIT2', 'Weiter Weg')]);
    expect(readAudioTags(file).title).toBe('Weiter Weg');
  });

  it('keeps the first of a repeated frame', () => {
    const file = id3([frame('TIT2', 'First'), frame('TIT2', 'Second')]);
    expect(readAudioTags(file).title).toBe('First');
  });

  it('stops at the padding rather than reading it as a frame', () => {
    const body = [...frame('TIT2', 'Ein Stuhl am Fenster'), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const file = new Uint8Array([
      ...ascii('ID3'), 4, 0, 0, ...syncsafe(body.length), ...body,
    ]);
    expect(readAudioTags(file).title).toBe('Ein Stuhl am Fenster');
  });
});

/**
 * ── THE ONE DIFFERENCE THAT MATTERS ───────────────────────────────────────
 * v2.3 writes a frame size as a plain integer and v2.4 writes it syncsafe.
 * Reading one as the other gives a size that is wrong by a factor that grows
 * with the field — small titles survive, long ones walk off the end of the
 * frame and the tag silently reads as empty.
 */
describe('an mp3 with ID3v2.3', () => {
  it('reads a plain frame size', () => {
    const file = id3([
      frame('TIT2', 'Wait for It', { major: 3 }),
      frame('TPE1', 'Jon Björk', { major: 3 }),
      frame('TYER', '2019', { major: 3 }),
    ], 3);

    const tags = readAudioTags(file);
    expect(tags.title).toBe('Wait for It');
    expect(tags.artist).toBe('Jon Björk');
    expect(tags.year).toBe(2019);
  });

  it('reads a title long enough that a misread size would lose it', () => {
    const long = 'A title with one hundred and twenty eight characters in it, which is '
      + 'long enough that the eighth bit of its length is set';
    const file = id3([frame('TIT2', long, { major: 3 })], 3);
    expect(readAudioTags(file).title).toBe(long);
  });
});

describe('an ID3 tag nothing can be read from', () => {
  /* v2.2 has three-character ids and three-byte sizes. Reading it as v2.3
     would mis-frame everything, so it is declined. */
  it('declines version 2.2 rather than guessing', () => {
    const file = id3([frame('TIT2', 'Freude')], 2);
    expect(readAudioTags(file).title).toBeNull();
  });

  it('returns nulls for a header with no frames', () => {
    expect(readAudioTags(id3([]))).toEqual({
      title: null, artist: null, album: null, year: null, tempoBpm: null,
    });
  });
});

/* ═══ MP4 ═══════════════════════════════════════════════════════════════════ */

describe('an m4a', () => {
  const sign = '©';

  it('reads the atoms the form wants', () => {
    const file = mp4([
      atom(`${sign}nam`, data(utf8('Bats and Rats'))),
      atom(`${sign}ART`, data(utf8('Ludvig Moulin'))),
      atom(`${sign}alb`, data(utf8('Night Work'))),
      atom(`${sign}day`, data(utf8('2020'))),
      /* An integer atom, two bytes big-endian. */
      atom('tmpo', data([0, 96], 21)),
    ]);

    expect(readAudioTags(file)).toEqual({
      title: 'Bats and Rats',
      artist: 'Ludvig Moulin',
      album: 'Night Work',
      year: 2020,
      tempoBpm: 96,
    });
  });

  it('reads a one-byte tempo', () => {
    const file = mp4([atom('tmpo', data([74], 21))]);
    expect(readAudioTags(file).tempoBpm).toBe(74);
  });

  it('returns nulls when there is no metadata at all', () => {
    const file = new Uint8Array([
      ...atom('ftyp', ascii('M4A ')),
      ...atom('moov', atom('trak', [])),
    ]);
    expect(readAudioTags(file).title).toBeNull();
  });
});

/* ═══ AND IT NEVER THROWS ═══════════════════════════════════════════════════ */

/**
 * The upload does not depend on any of this. A tag reader that throws turns
 * "this mp3 has odd metadata" into "the upload screen is broken", so every
 * one of these has to come back with nulls rather than an exception.
 */
describe('a file this cannot read', () => {
  const nothing = { title: null, artist: null, album: null, year: null, tempoBpm: null };

  it('is not a tagged format at all', () => {
    expect(readAudioTags(new Uint8Array([0xff, 0xfb, 0x90, 0x00]))).toEqual(nothing);
  });

  it('is empty', () => {
    expect(readAudioTags(new Uint8Array([]))).toEqual(nothing);
  });

  it('claims ID3 and stops', () => {
    expect(readAudioTags(new Uint8Array(ascii('ID3')))).toEqual(nothing);
  });

  it('claims a frame longer than the file', () => {
    const file = new Uint8Array([
      ...ascii('ID3'), 4, 0, 0, ...syncsafe(1000),
      ...ascii('TIT2'), ...syncsafe(900), 0, 0, 3, ...ascii('short'),
    ]);
    expect(readAudioTags(file).title).toBeNull();
  });

  it('claims an mp4 and holds a truncated atom', () => {
    const file = new Uint8Array([
      ...atom('ftyp', ascii('M4A ')),
      ...uint32(9999), ...ascii('moov'),
    ]);
    expect(readAudioTags(file)).toEqual(nothing);
  });

  it('is random bytes that happen to start like one', () => {
    const file = new Uint8Array(64);
    file.set(ascii('ID3'), 0);
    file[3] = 4;
    file.set([0xff, 0xff, 0xff, 0xff], 6);
    expect(() => readAudioTags(file)).not.toThrow();
  });
});
