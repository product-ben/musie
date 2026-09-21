/**
 * A card's QR code, as a video file a headless Chromium will call a camera.
 *
 * ── E.2 IS TESTABLE WITHOUT A CAMERA, AND THIS IS THE WHOLE TRICK ─────────
 * Chromium takes `--use-fake-device-for-media-stream` together with
 * `--use-file-for-fake-video-capture=<file>.y4m`, and then `getUserMedia`
 * hands back a real `MediaStream` carrying the frames in that file, on a
 * machine with no camera and in a container with no hardware at all. So
 * everything the scan step does with a camera — the permission, the stream,
 * the `<video>`, the polling loop, the decoder, the write — runs for real.
 * The only fiction is where the photons came from.
 *
 * ── THE CODE IN THE CLIP IS THE PRODUCT'S OWN CODE ────────────────────────
 * `scanLink` here is `src/lib/scanCode.ts`'s, imported — the same function
 * `/dev/qr` calls to make the sheet somebody points a phone at, and the one
 * `scripts/qr-codes.mjs` carries a documented copy of for print day, pinned to
 * it by the round-trip assertions in `scanCode.test.ts`. The encoder is
 * `qrcode`, which is the encoder both of those use. So the test cannot quietly
 * agree with itself about what `MC-03` encodes to while disagreeing with what
 * gets printed on card stock.
 *
 * ── GENERATED, NEVER COMMITTED ────────────────────────────────────────────
 * One uncompressed 640×480 frame is 460,800 bytes, and this writes two. That
 * is not a thing to put in a repository — and a committed fixture is also a
 * fixture nobody can regenerate, which is the argument `scripts/qr-codes.mjs`
 * already makes about the printed codes. It goes to `test-results/`, which is
 * ignored, and Playwright's `globalSetup` writes it before any browser starts.
 *
 * ── Y4M, BY HAND, AND IT IS SHORTER THAN A DEPENDENCY ─────────────────────
 * The format is a text header, then `FRAME\n` and three uncompressed planes
 * per frame: luma, then the two chroma planes at half resolution. A QR code is
 * black and white, so the chroma planes are a constant and the luma plane is
 * the picture. `QRCode.create` hands back the module grid rather than an
 * image, so there is nothing to rasterise — the whole encoder is the nested
 * loop below.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

import { scanLink } from '../src/lib/scanCode';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The card the fake camera is pointed at.
 *
 * A THIRD card, deliberately: `session.spec.ts` types MC-08 and
 * `scanlink.spec.ts` deep-links MC-01. Between the three walks the pairing is
 * proved to be looked up per card rather than defaulted, which one card shared
 * by all of them could not tell apart from a hardcoded answer.
 */
export const SCANNED_CARD = { code: 'MC-03', id: 'mc-03', track: 'trk-03' } as const;

/**
 * The base URL the code in the clip points at.
 *
 * It does not have to match the server the walk runs against, and that is the
 * point rather than an oversight — E.0's decoder never compares a host, so a
 * code minted for a domain that does not exist resolves on localhost exactly
 * as a printed one will. A clip generated for the dev server would have proved
 * the weaker thing.
 */
const PRINTED_FOR = 'https://musie.example';

/** Where the clip lands. Ignored by git, and regenerated on every run. */
export const SCAN_VIDEO = join(HERE, '..', 'test-results', 'fake-camera.y4m');

/* A camera resolution Chromium is happy to pretend at, and the frame rate the
   header declares. Neither is a layout number and neither reaches the app. */
const WIDTH = 640;
const HEIGHT = 480;
const FPS = 30;

/** Two identical frames. Chromium loops the file, so one would do — the second
 *  exists so that a parser expecting to find a next frame finds one. */
const FRAMES = 2;

/** Modules of white around the code. A QR code with no quiet zone is one a
 *  reader refuses, on paper and on a sensor alike. */
const QUIET = 4;

/** How much of the 480-pixel side the code should fill. Held well inside the
 *  frame: a code touching the edges is one a hand-held camera clips. */
const TARGET_SIDE = 400;

/** The launch flags that turn this file into a camera. Exported so
 *  `playwright.config.ts` and this generator cannot disagree about the path. */
export const fakeCameraArgs = (): string[] => [
  '--use-fake-device-for-media-stream',
  `--use-file-for-fake-video-capture=${SCAN_VIDEO}`,
];

/** The exact string encoded into the clip. A walk can assert against it
 *  rather than against its own idea of what the code says. */
export const scannedUrl = (): string => scanLink(SCANNED_CARD.code, PRINTED_FOR);

/**
 * Write the clip.
 *
 * Playwright's `globalSetup`, which runs before any browser is launched — and
 * it has to, because the path is a launch flag. Returns nothing: a global
 * setup that returns a function is treated as having returned a teardown.
 */
export default async function generateFakeCamera(): Promise<void> {
  const url = scannedUrl();
  const symbol = QRCode.create(url, {});

  const modules = symbol.modules.size;
  const side = modules + QUIET * 2;
  /* Whole pixels per module. A fractional scale would put the module edges
     between sensor pixels, which is the one thing a decoder cannot forgive. */
  const scale = Math.max(1, Math.floor(TARGET_SIDE / side));
  const drawn = side * scale;
  const left = Math.floor((WIDTH - drawn) / 2);
  const top = Math.floor((HEIGHT - drawn) / 2);

  /* Full white. The quiet zone is therefore the rest of the frame, which is
     considerably more than the four modules the specification asks for. */
  const luma = Buffer.alloc(WIDTH * HEIGHT, 0xff);

  for (let row = 0; row < modules; row += 1) {
    for (let column = 0; column < modules; column += 1) {
      /* One byte per module, 1 where the module is dark. */
      if (symbol.modules.data[row * modules + column] !== 1) continue;
      for (let y = 0; y < scale; y += 1) {
        const line = (top + (QUIET + row) * scale + y) * WIDTH + left + (QUIET + column) * scale;
        luma.fill(0x00, line, line + scale);
      }
    }
  }

  /* 128 is "no colour" in both chroma planes, at half resolution in each
     direction — which is what C420 means. A grey card reads as a white one to
     a decoder that only ever looks at luma. */
  const chroma = Buffer.alloc((WIDTH / 2) * (HEIGHT / 2), 0x80);

  const header = Buffer.from(`YUV4MPEG2 W${WIDTH} H${HEIGHT} F${FPS}:1 Ip A1:1 C420mpeg2\n`, 'ascii');
  const frame = Buffer.from('FRAME\n', 'ascii');

  const parts: Buffer[] = [header];
  for (let i = 0; i < FRAMES; i += 1) parts.push(frame, luma, chroma, chroma);

  await mkdir(dirname(SCAN_VIDEO), { recursive: true });
  await writeFile(SCAN_VIDEO, Buffer.concat(parts));

  console.log(`[musie] fake camera: ${url} -> ${SCAN_VIDEO}`);
}
