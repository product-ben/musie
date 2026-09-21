/**
 * The clip Chromium will be told is a camera, decoded here first.
 *
 * ── WHY THIS IS A UNIT TEST AND NOT PART OF THE WALK ──────────────────────
 * `e2e/fakeCamera.ts` writes a QR code into a y4m file by hand: module grid,
 * integer scale, centred offsets, a luma plane and two constant chroma planes.
 * Every one of those is arithmetic that can be wrong, and if it is, the
 * end-to-end walk fails with *the card never arrived* — which is what a broken
 * scanner looks like too. An hour would then go into E.2 for a fault in the
 * fixture.
 *
 * So the fixture is proved separately, against the real decoder, with no
 * browser and no Supabase: generate the file, pull the first frame's luma
 * plane out of it, and read the code back. If this passes and the walk fails,
 * the walk found something real.
 *
 * It also pins the FILE LAYOUT — header, two frames, three planes each — which
 * is the part Chromium parses and which no assertion inside the browser could
 * reach.
 *
 * The subject lives under `e2e/` because it must never be reachable from the
 * bundle; the test lives here because `src/**\/*.test.ts` is what the unit
 * project runs, and a `.test.ts` inside `e2e/` would be collected by
 * Playwright as well.
 */
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';

import generateFakeCamera, { SCAN_VIDEO, scannedUrl } from '../../e2e/fakeCamera';
import { decodeQr, useWasmBinary } from './qrWasm';

/** 640×480, as the generator declares in the header it writes. */
const WIDTH = 640;
const HEIGHT = 480;
const FRAME = Buffer.from('FRAME\n', 'ascii');

beforeAll(async () => {
  const resolve = createRequire(import.meta.url);
  const bytes = await readFile(resolve.resolve('zxing-wasm/reader/zxing_reader.wasm'));
  useWasmBinary(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
});

describe('the fake camera clip', () => {
  it('is a y4m Chromium can parse, and holds a code the decoder can read', async () => {
    await generateFakeCamera();
    const file = await readFile(SCAN_VIDEO);

    /* THE HEADER, exactly. Chromium's file capture device parses this line and
       refuses anything it does not recognise — silently, as a camera that
       produces no frames, which is indistinguishable from a broken scanner. */
    const headerEnd = file.indexOf(0x0a) + 1;
    expect(file.subarray(0, headerEnd).toString('ascii'))
      .toBe(`YUV4MPEG2 W${WIDTH} H${HEIGHT} F30:1 Ip A1:1 C420mpeg2\n`);

    /* THE SIZE, to the byte: two frames, each a tag plus a full luma plane and
       two chroma planes at half resolution in both directions. A plane written
       at the wrong size is a file that parses and then drifts. */
    const chroma = (WIDTH / 2) * (HEIGHT / 2);
    expect(file.length).toBe(headerEnd + 2 * (FRAME.length + WIDTH * HEIGHT + 2 * chroma));

    /* ── AND THE PICTURE IS THE RIGHT PICTURE ─────────────────────────────
       The first frame's luma plane, widened to RGBA because that is the shape
       the decoder takes, read by the same wasm the app ships. The expected
       value is `scanLink`'s output — so this asserts the round trip the camera
       will perform, minus the camera. */
    const start = file.indexOf(FRAME, headerEnd) + FRAME.length;
    const luma = file.subarray(start, start + WIDTH * HEIGHT);

    const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
    for (let i = 0; i < WIDTH * HEIGHT; i += 1) {
      data[i * 4] = luma[i];
      data[i * 4 + 1] = luma[i];
      data[i * 4 + 2] = luma[i];
      data[i * 4 + 3] = 255;
    }

    await expect(decodeQr({ data, width: WIDTH, height: HEIGHT })).resolves
      .toEqual([scannedUrl()]);
  });
});
