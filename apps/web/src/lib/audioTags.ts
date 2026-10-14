/**
 * What a recording says about itself — ID3v2 for MP3, `ilst` atoms for MP4.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * `20260921160000` says the four real credits in `tracks` were "read from the
 * files' own ID3 tags". That was done by hand, once, by somebody looking at a
 * file. The maintenance UI uploads music, so it can do that reading itself and
 * hand the operator a form that is already filled in.
 *
 * ── OFFERED, NEVER FORCED ─────────────────────────────────────────────────
 * Nothing here decides anything. The caller uses a tag only where the
 * corresponding field is still empty, and the screen says which values came
 * out of the file — so a guess never looks like a decision. A studio's export
 * is as likely to say `Untitled (Master) v3` as it is to say the truth.
 *
 * ── IN THE BROWSER, NOT ON THE SERVER ─────────────────────────────────────
 * MAINTENANCE-UI.md §6.1 had the server read these. It reads better in the
 * browser: the tags are a form convenience, not a fact anyone has to trust,
 * so reading them where the form is avoids a third copy of binary parsing in
 * a Deno function and keeps the whole thing inside `pnpm check`. The DURATION
 * is a different matter and is measured by the platform decoder — see
 * `audioMeta.ts`.
 *
 * ── IT NEVER THROWS ───────────────────────────────────────────────────────
 * Every unreadable, truncated, unexpected or hostile file returns nulls. A
 * tag reader that throws turns "this mp3 has odd metadata" into "the upload
 * screen is broken", and the upload does not depend on it at all.
 *
 * Pure, and over a `Uint8Array` rather than a `File`, so the whole parser is
 * testable in the `unit` project with buffers built by hand.
 */

export interface AudioTags {
  title: string | null;
  artist: string | null;
  album: string | null;
  /** The release year, as a number. `2021-04-03` and `2021` both give 2021. */
  year: number | null;
  tempoBpm: number | null;
}

const NOTHING: AudioTags = {
  title: null,
  artist: null,
  album: null,
  year: null,
  tempoBpm: null,
};

/** How much of a file is worth looking at. Tags live at one end or the other. */
export const TAG_WINDOW_BYTES = 2 * 1024 * 1024;

export function readAudioTags(bytes: Uint8Array): AudioTags {
  try {
    if (hasAscii(bytes, 0, 'ID3')) return readId3(bytes);
    /* An MP4/M4A begins with a `ftyp` box: 4 bytes of length, then the name. */
    if (hasAscii(bytes, 4, 'ftyp')) return readMp4(bytes);
    return NOTHING;
  } catch {
    /* Documented above: a malformed file is not an error, it is a file with
       no tags we can read. */
    return NOTHING;
  }
}

/* ═══ SHARED ════════════════════════════════════════════════════════════════ */

function hasAscii(bytes: Uint8Array, at: number, text: string): boolean {
  if (at + text.length > bytes.length) return false;
  for (let i = 0; i < text.length; i += 1) {
    if (bytes[at + i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

function uint32(bytes: Uint8Array, at: number): number {
  return (
    (bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]
  ) >>> 0;
}

/**
 * A SYNCSAFE integer: seven bits per byte, the top bit always clear.
 *
 * ID3 uses it so that a size can never contain `0xFF 0xEx`, which an MP3
 * decoder would read as the start of a frame. The whole-tag size is syncsafe
 * in every version; a FRAME size is syncsafe only in v2.4, which is the
 * difference that makes `major` load-bearing below.
 */
function syncsafe(bytes: Uint8Array, at: number): number {
  return (
    ((bytes[at] & 0x7f) << 21) |
    ((bytes[at + 1] & 0x7f) << 14) |
    ((bytes[at + 2] & 0x7f) << 7) |
    (bytes[at + 3] & 0x7f)
  );
}

/** The leading digits of a date string. `2021-04-03` → 2021. */
function yearOf(value: string | null): number | null {
  if (value === null) return null;
  const match = /\d{4}/.exec(value);
  if (match === null) return null;
  const year = Number(match[0]);
  return Number.isInteger(year) ? year : null;
}

function numberOf(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function clean(value: string): string | null {
  /* Trailing NULs are normal in both formats, and a tag padded to a fixed
     width is a tag full of spaces. */
  const text = value.replace(/\0+$/, '').trim();
  return text === '' ? null : text;
}

/* ═══ ID3v2, FOR MP3 ════════════════════════════════════════════════════════ */

function decodeId3Text(payload: Uint8Array): string | null {
  if (payload.length < 1) return null;
  const encoding = payload[0];
  const body = payload.subarray(1);

  switch (encoding) {
    case 0:
      /* ISO-8859-1. `latin1` is not in the TextDecoder label list on every
         engine; `windows-1252` is, and agrees with it on every byte that
         appears in a title. */
      return clean(new TextDecoder('windows-1252').decode(body));
    case 1: {
      /* UTF-16 with a byte-order mark, which decides the endianness. */
      if (body.length >= 2 && body[0] === 0xff && body[1] === 0xfe) {
        return clean(new TextDecoder('utf-16le').decode(body.subarray(2)));
      }
      if (body.length >= 2 && body[0] === 0xfe && body[1] === 0xff) {
        return clean(new TextDecoder('utf-16be').decode(body.subarray(2)));
      }
      return clean(new TextDecoder('utf-16le').decode(body));
    }
    case 2:
      return clean(new TextDecoder('utf-16be').decode(body));
    case 3:
      return clean(new TextDecoder('utf-8').decode(body));
    default:
      return null;
  }
}

function readId3(bytes: Uint8Array): AudioTags {
  const major = bytes[3];
  /* v2.2 has three-character frame ids and three-byte sizes. It is twenty-five
     years old and no exporter writes it; reading it wrong would be worse than
     not reading it. */
  if (major !== 3 && major !== 4) return NOTHING;

  const flags = bytes[5];
  const size = syncsafe(bytes, 6);
  let at = 10;
  const end = Math.min(10 + size, bytes.length);

  /* An extended header sits between the header and the first frame. Its own
     size field is syncsafe in v2.4 and a plain integer in v2.3, and in v2.3 it
     excludes itself. */
  if ((flags & 0x40) !== 0) {
    at += major === 4 ? syncsafe(bytes, at) : uint32(bytes, at) + 4;
  }

  const found = new Map<string, string>();

  while (at + 10 <= end) {
    const id = String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);
    /* Padding. The rest of the tag is zeroes. */
    if (id === '\0\0\0\0') break;

    const frameSize = major === 4 ? syncsafe(bytes, at + 4) : uint32(bytes, at + 4);
    if (frameSize <= 0 || at + 10 + frameSize > end) break;

    if (!found.has(id)) {
      const text = decodeId3Text(bytes.subarray(at + 10, at + 10 + frameSize));
      if (text !== null) found.set(id, text);
    }

    at += 10 + frameSize;
  }

  return {
    title: found.get('TIT2') ?? null,
    artist: found.get('TPE1') ?? null,
    album: found.get('TALB') ?? null,
    /* TDRC is v2.4's recording time and carries a whole date; TYER is v2.3's
       four-digit year. Either way only the year is wanted. */
    year: yearOf(found.get('TDRC') ?? found.get('TYER') ?? null),
    tempoBpm: numberOf(found.get('TBPM') ?? null),
  };
}

/* ═══ MP4 / M4A ═════════════════════════════════════════════════════════════ */

/** The name of an atom at `at`, where `at` points at its 4-byte length. */
function atomName(bytes: Uint8Array, at: number): string {
  return String.fromCharCode(bytes[at + 4], bytes[at + 5], bytes[at + 6], bytes[at + 7]);
}

/**
 * The first child atom with this name, searched depth-first.
 *
 * Returns the range of its CONTENTS, not of the atom. `skip` is for the atoms
 * that carry fields of their own before their children — `meta` has four
 * bytes of version and flags, and walking into it without them finds nothing.
 */
function findAtom(
  bytes: Uint8Array,
  from: number,
  to: number,
  name: string,
  skip = 0,
): { at: number; end: number } | null {
  let at = from;
  while (at + 8 <= to) {
    const size = uint32(bytes, at);
    /* A size of 0 means "to the end of the file"; 1 means a 64-bit size
       follows, which no tag atom uses. Either way, stop walking. */
    if (size < 8 || at + size > to) {
      if (size === 0 && atomName(bytes, at) === name) {
        return { at: at + 8 + skip, end: to };
      }
      return null;
    }
    if (atomName(bytes, at) === name) {
      return { at: at + 8 + skip, end: at + size };
    }
    at += size;
  }
  return null;
}

/** The payload of an `ilst` entry's `data` atom. */
function dataOf(bytes: Uint8Array, from: number, to: number): Uint8Array | null {
  const data = findAtom(bytes, from, to, 'data');
  if (data === null) return null;
  /* Four bytes of version and flags, then four of a locale nobody sets. */
  const start = data.at + 8;
  return start <= data.end ? bytes.subarray(start, data.end) : null;
}

function readMp4(bytes: Uint8Array): AudioTags {
  const moov = findAtom(bytes, 0, bytes.length, 'moov');
  if (moov === null) return NOTHING;
  const udta = findAtom(bytes, moov.at, moov.end, 'udta');
  if (udta === null) return NOTHING;
  const meta = findAtom(bytes, udta.at, udta.end, 'meta', 4);
  if (meta === null) return NOTHING;
  const ilst = findAtom(bytes, meta.at, meta.end, 'ilst');
  if (ilst === null) return NOTHING;

  const text = new Map<string, string>();
  const numbers = new Map<string, number>();

  let at = ilst.at;
  while (at + 8 <= ilst.end) {
    const size = uint32(bytes, at);
    if (size < 8 || at + size > ilst.end) break;
    const name = atomName(bytes, at);
    const payload = dataOf(bytes, at + 8, at + size);

    if (payload !== null && payload.length > 0) {
      if (name === 'tmpo') {
        /* An integer atom, big-endian, one or two bytes wide. */
        numbers.set(
          name,
          payload.length === 1 ? payload[0] : (payload[0] << 8) | payload[1],
        );
      } else {
        const value = clean(new TextDecoder('utf-8').decode(payload));
        if (value !== null) text.set(name, value);
      }
    }

    at += size;
  }

  /* The copyright sign is 0xA9 in MacRoman, which is what these atom names
     use — `©nam`, not `©nam` in UTF-8. */
  const sign = '©';
  return {
    title: text.get(`${sign}nam`) ?? null,
    artist: text.get(`${sign}ART`) ?? null,
    album: text.get(`${sign}alb`) ?? null,
    year: yearOf(text.get(`${sign}day`) ?? null),
    tempoBpm: numbers.get('tmpo') ?? null,
  };
}
