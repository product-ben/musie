/**
 * E.3's decoder, decoding — the one part of the Safari fallback that can be
 * proved without a Safari.
 *
 * ── WHAT THIS DOES AND DOES NOT CLAIM ─────────────────────────────────────
 * It claims that the wasm engine this app ships reads a QR code generated the
 * way Musie generates them, and gives back exactly the string that went in.
 * That is the whole of the decode, and it is the part that would otherwise be
 * taken on trust until somebody held a phone up.
 *
 * It claims NOTHING about `getUserMedia`, about a `<video>`, about Safari's
 * autoplay rules, or about whether the binary loads from the address Vite
 * emitted it to. E.3's done-when is "it scans on iPhone Safari" and this test
 * cannot close it. It closes the half that does not need a device.
 *
 * ── THE CODE IS THE PRODUCT'S CODE ────────────────────────────────────────
 * The payload comes from `scanLink`, the app's own generator, encoded with
 * `qrcode`, the same encoder `/dev/qr` and `scripts/qr-codes.mjs` use — so the
 * test cannot quietly agree with itself about what `MC-01` encodes to while
 * disagreeing with what gets printed. It ends by reading the decoded text back
 * through `decodeScan`, which is the function the camera path actually calls,
 * so the assertion is the round trip and not a string comparison.
 *
 * A PNG RATHER THAN A FRAME, because Node has no canvas and `zxing-wasm`
 * decodes image files itself. `decodeQr` takes both, deliberately, and this is
 * the reason it does.
 */
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import QRCode from 'qrcode';
import type { QRCode as QrSymbol } from 'qrcode';
import { beforeAll, describe, expect, it } from 'vitest';

import { decodeQr, useWasmBinary } from './qrWasm';
import type { RgbaImage } from './qrWasm';
import { decodeScan, scanLink } from './scanCode';

/**
 * THE SAME BINARY THE BROWSER GETS, handed over rather than fetched.
 *
 * In a browser Vite emits the `.wasm` as an asset and the decoder fetches it;
 * in Node there is nothing to fetch it with, and the engine aborts. Resolved
 * through the package's own `exports` map, never a path into node_modules
 * spelled out by hand — so a pnpm layout change cannot silently point this at
 * a binary that is not the one the app ships.
 */
beforeAll(async () => {
  const resolve = createRequire(import.meta.url);
  const bytes = await readFile(resolve.resolve('zxing-wasm/reader/zxing_reader.wasm'));
  useWasmBinary(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
});

/** Generous: an encoder scale, not a layout number. A code rendered at one
 *  pixel per module is a code no camera would read either. */
const PNG = { type: 'png', margin: 2, scale: 8 } as const;

describe('the wasm decoder', () => {
  it('reads back a link this app generated', async () => {
    const link = scanLink('MC-01', 'http://localhost:5173');
    const png = await QRCode.toBuffer(link, PNG);

    const payloads = await decodeQr(png);

    expect(payloads).toEqual([link]);
    /* The round trip that matters: what the camera hands `scanCardInto`. */
    expect(decodeScan(payloads[0])).toBe('MC-01');
  });

  /* The printed deck will carry a real domain one day and a LAN address today,
     and the decoder is indifferent to both — as `scanCode.test.ts` asserts for
     the pure half. This is the same claim through the wasm. */
  it('is indifferent to the origin the code was generated for', async () => {
    for (const [base, code] of [
      ['https://musie.example', 'MC-04'],
      ['http://192.168.0.24:5173', 'MC-09'],
    ] as const) {
      const png = await QRCode.toBuffer(scanLink(code, base), PNG);
      const payloads = await decodeQr(png);
      expect(decodeScan(payloads[0] ?? '')).toBe(code);
    }
  });

  /* A frame with nothing in it is the commonest frame there is — the loop runs
     several times a second and almost every pass sees no code at all. It has
     to come back empty rather than throw, or the scanner stops on the first
     blank frame. */
  it('gives back nothing for an image with no code in it', async () => {
    /* A 1×1 white PNG. Small on purpose: this is the shape of the answer being
       asserted, not the engine's tolerance. */
    const blank = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64',
    );

    await expect(decodeQr(blank)).resolves.toEqual([]);
  });

  /* Two codes in one image is a card lying on a magazine. The decoder returns
     both and `readFrame` picks ours; it can only do that if both arrive. */
  it('returns every code it finds, so readFrame can choose', async () => {
    const mine = scanLink('MC-02', 'https://musie.example');
    const theirs = 'https://example.com/order/12345';

    /* Side by side in one image, composited as raw pixels rather than through
       a canvas — there isn't one in Node, and two QR codes is a two-line loop.
       zxing takes RGBA straight from an ImageData-shaped object. */
    const a = QRCode.create(mine, {});
    const b = QRCode.create(theirs, {});
    const composed = sideBySide(a, b);

    const payloads = await decodeQr(composed);

    expect(payloads).toHaveLength(2);
    expect(payloads).toContain(mine);
    expect(payloads).toContain(theirs);
  });
});

/**
 * Two QR symbols painted into one RGBA buffer, quiet zones included.
 *
 * `QRCode.create` hands back the module grid rather than an image, so scaling
 * it up is a nearest-neighbour multiply and nothing more. That is exactly what
 * the browser path does with a video frame, minus the camera: an
 * `ImageData`-shaped `{ data, width, height }` is what `decodeQr` is given
 * there too.
 */
function sideBySide(
  first: QrSymbol,
  second: QrSymbol,
): RgbaImage {
  const SCALE = 6;
  const QUIET = 4;

  const tiles = [first, second].map((symbol) => ({
    size: symbol.modules.size,
    /* `data` is one byte per module, 1 where the module is dark. */
    dark: symbol.modules.data,
  }));

  const tileSide = Math.max(...tiles.map((tile) => tile.size)) + QUIET * 2;
  const width = tileSide * SCALE * tiles.length;
  const height = tileSide * SCALE;

  /* White, opaque. */
  const data = new Uint8ClampedArray(width * height * 4).fill(255);

  tiles.forEach((tile, index) => {
    const offset = index * tileSide * SCALE;
    for (let row = 0; row < tile.size; row += 1) {
      for (let column = 0; column < tile.size; column += 1) {
        if (tile.dark[row * tile.size + column] !== 1) continue;
        for (let y = 0; y < SCALE; y += 1) {
          for (let x = 0; x < SCALE; x += 1) {
            const px = offset + (QUIET + column) * SCALE + x;
            const py = (QUIET + row) * SCALE + y;
            const at = (py * width + px) * 4;
            data[at] = 0;
            data[at + 1] = 0;
            data[at + 2] = 0;
          }
        }
      }
    }
  });

  return { data, width, height };
}
