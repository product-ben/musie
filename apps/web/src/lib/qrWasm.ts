/**
 * The QR decoder for browsers that have none — E.3, and Safari is why.
 *
 * ── THE GAP THIS FILLS ────────────────────────────────────────────────────
 * E.2 reads codes with `BarcodeDetector`, which the platform supplies and
 * which costs the bundle nothing. Safari does not have it, on any version, on
 * iPhone or on the desktop — and an iPhone is the device somebody holding a
 * paper deck is most likely to be holding. Chrome on macOS does not have it
 * either, which is why this path is also the one the Playwright walk takes.
 *
 * So there is a second decoder, and it is a real one: zxing-cpp compiled to
 * WebAssembly. One dependency, `zxing-wasm`, and no second camera library —
 * `useCardScanner.ts` owns the stream for both paths and hands each frame to
 * whichever decoder `qrDetector.ts` chose.
 *
 * ── LAZY, AND THAT IS NOT AN OPTIMISATION ─────────────────────────────────
 * This module is only ever reached through `await import('./qrWasm')`, from
 * `qrDetector.ts`, and only when the platform has no detector of its own. The
 * JS glue therefore lands in its own chunk and the `.wasm` in its own asset,
 * so a visitor who never presses *Use the camera* downloads neither. Keep it
 * that way: one static import of this file from anywhere in the app would put
 * a barcode engine in everybody's first paint.
 *
 * ── THE WASM IS OURS, NOT A CDN'S ─────────────────────────────────────────
 * `zxing-wasm` defaults to fetching its binary from jsDelivr at run time. That
 * would make the Safari scanner depend on a third-party host Musie has no
 * relationship with, and it would break entirely on a LAN dev server with no
 * route out. The `?url` import below makes Vite emit the binary as one of this
 * app's own assets and hands `locateFile` that address instead — same origin,
 * same cache, same deploy.
 */
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

/**
 * THE BINARY, WHEN THERE IS NOTHING TO FETCH A URL WITH.
 *
 * `zxing-wasm` is built for the web: given an address it fetches it, and in
 * Node both the async and the sync attempt fail — the engine aborts before it
 * has decoded anything. Which would mean the wasm decoder could only ever be
 * exercised by holding up a phone, and E.3's whole difficulty is that holding
 * up a phone is the part nobody can automate.
 *
 * So the bytes can be handed over instead of an address. `qrWasm.test.ts`
 * reads them out of `node_modules` and calls this before its first decode;
 * nothing in the app does, and the browser keeps the URL below. It is five
 * lines to make the engine that ships testable at all, which is a better
 * trade than an untested decoder.
 */
let binary: ArrayBuffer | null = null;

export function useWasmBinary(bytes: ArrayBuffer): void {
  binary = bytes;
  located = false;
}

/**
 * Told once, before the first read.
 *
 * `prepareZXingModule` records overrides for the module that has not been
 * instantiated yet; calling it twice with a different object makes the library
 * throw away an engine it has already built. A module-level flag rather than a
 * promise because the library does its own instantiation caching — this only
 * has to stop the OVERRIDES being set twice.
 */
let located = false;

function locate() {
  if (located) return;
  located = true;
  prepareZXingModule({
    overrides: binary !== null ? { wasmBinary: binary } : {
      /* Only the binary is redirected. Anything else emscripten asks for keeps
         the path it was built with, rather than being silently pointed at a
         WebAssembly file. */
      locateFile: (path: string, prefix: string) => (
        path.endsWith('.wasm') ? wasmUrl : `${prefix}${path}`
      ),
    },
  });
}

/**
 * Raw pixels, as `ImageData` has them and as the decoder wants them.
 *
 * STRUCTURAL RATHER THAN `ImageData`, and that is what makes this file
 * testable. `zxing-wasm` dispatches on `"width" in input && "height" in input
 * && "data" in input` — it never asks what the object's constructor was — so a
 * grid painted into a `Uint8ClampedArray` in Node is as good a frame as one
 * lifted off a canvas. A real `ImageData` satisfies this type unchanged.
 */
export interface RgbaImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** A frame, or the bytes of an image file. See `decodeQr`. */
export type QrSource = Blob | ArrayBuffer | Uint8Array | RgbaImage;

/**
 * Every QR payload in one image, as text.
 *
 * ── IT TAKES MORE THAN A FRAME, ON PURPOSE ────────────────────────────────
 * The browser hands it `ImageData` lifted off a canvas. A test hands it the
 * bytes of a PNG, because `zxing-wasm` decodes image files itself — which is
 * what lets the wasm decoder be exercised in Node, against a code this app
 * generated, with no camera and no browser anywhere in the run. Same function,
 * same options, same binary, so the thing the test proves is the thing the
 * phone will do.
 *
 * INVALID READS ARE DROPPED. zxing reports a symbol it found but could not
 * verify; a QR code's error correction is what makes "found it" and "read it"
 * different claims, and a payload that failed its own checksum is a payload
 * nobody printed. `readFrame` in `camera.ts` decides what the survivors mean.
 */
export async function decodeQr(input: QrSource): Promise<string[]> {
  locate();
  /* The cast is the structural type above meeting a signature written in
     terms of `ImageData`. The library's own dispatch is the duck-typing this
     relies on; nothing here reaches past its public entry point. */
  const results = await readBarcodes(input as Parameters<typeof readBarcodes>[0], {
    /* QR only. The deck is QR codes, and every other symbology enabled is
       work done on every frame to rule out something that is not there. */
    formats: ['QRCode'],
    /* Rotations and imperfect binarisation — a card held by hand in room
       light is the normal case here, not the hard one. */
    tryHarder: true,
    /* A card lying on a magazine is two codes in view. `readFrame` prefers
       ours; it can only do that if it is given both. */
    maxNumberOfSymbols: 4,
  });
  return results.filter((result) => result.isValid).map((result) => result.text);
}
