/**
 * Which engine reads the frames — E.2's `BarcodeDetector`, or E.3's wasm.
 *
 * ── ONE SEAM, AND IT IS THE ONLY PLACE THE TWO STEPS DIFFER ───────────────
 * E.2 and E.3 are not two scanners. `useCardScanner.ts` owns the camera, the
 * `<video>` and the loop for both; `camera.ts` decides what a frame meant for
 * both. The entire difference between them is which object this factory hands
 * back, which is why the fallback is a file and not a second feature.
 *
 * ── WHY THE PLATFORM'S DETECTOR IS STILL PREFERRED ────────────────────────
 * It costs the bundle nothing, it is hardware-accelerated where the hardware
 * has a decoder, and it does not need a megabyte of WebAssembly over a
 * connection that may be a phone on mobile data in a park. Where it exists it
 * is simply better. It exists on Android Chrome — which is half the phones
 * this deck will meet — and not on Safari, on any version, which is the other
 * half. Chrome on macOS does not have it either, so the Playwright walk takes
 * the wasm path as well; that is convenient rather than intended.
 *
 * `getSupportedFormats()` is asked rather than assumed. A browser can ship the
 * constructor and support a set of symbologies that does not include QR, and a
 * detector built for a format it cannot read reports nothing at all — a
 * scanner that looks alive and never sees a card. Asking costs one await, once.
 */

/**
 * The shape of the platform API, declared here because TypeScript's DOM
 * library does not have it.
 *
 * MINIMAL ON PURPOSE: the three members this file uses, and no attempt at the
 * whole Barcode Detection API. A fuller declaration would be a specification
 * this repository then has to keep in step with a browser, for no caller.
 */
interface DetectedBarcode {
  rawValue: string;
}

interface NativeDetector {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

interface NativeDetectorConstructor {
  new (options?: { formats?: string[] }): NativeDetector;
  getSupportedFormats(): Promise<string[]>;
}

/** Whichever engine is doing the reading, from the loop's point of view. */
export interface QrDetector {
  /** `native` or `wasm`. Nothing user-visible depends on it; the console does. */
  readonly engine: 'native' | 'wasm';
  /** Every QR payload in the frame currently showing in that element. */
  read(video: HTMLVideoElement): Promise<string[]>;
}

/**
 * The longest side of the image the wasm decoder is given, in pixels.
 *
 * A phone's back camera hands over 1920×1080 or more, and decoding that many
 * pixels several times a second in WebAssembly is work with nothing to show
 * for it: a QR code held up to fill a viewfinder is hundreds of pixels across
 * at this size, which is far more than the engine needs. It is a decode
 * budget, not a layout measurement, so it is a number here rather than a
 * token — nothing about it reaches CSS.
 */
const DECODE_SIDE = 640;

/**
 * The best QR reader this browser can give us.
 *
 * Asynchronous because both branches are: the platform is asked what it
 * supports, and the fallback is imported on demand. The import is what keeps
 * zxing out of everybody's first paint, so it must stay inside this function —
 * a static import at the top of the file would defeat the whole arrangement.
 *
 * It does not catch the dynamic import failing. A decoder that cannot be
 * loaded is a real problem with its own sentence on screen (`decoder`), and
 * swallowing it here would leave a camera running at a frame nothing reads.
 */
export async function createQrDetector(): Promise<QrDetector> {
  const Native = (window as unknown as { BarcodeDetector?: NativeDetectorConstructor })
    .BarcodeDetector;

  if (Native !== undefined) {
    try {
      const formats = await Native.getSupportedFormats();
      if (formats.includes('qr_code')) {
        const detector = new Native({ formats: ['qr_code'] });
        return {
          engine: 'native',
          read: async (video) => (await detector.detect(video)).map((code) => code.rawValue),
        };
      }
    } catch (thrown: unknown) {
      /* A constructor that exists and throws is a browser that half-shipped
         the API. The fallback below reads the same codes, so this is a note
         rather than a failure. */
      console.warn('[musie] BarcodeDetector is present but unusable:', thrown);
    }
  }

  const { decodeQr } = await import('./qrWasm');

  /* ONE canvas for the life of the detector. Allocating a new one per frame
     would hand the garbage collector a full-resolution bitmap several times a
     second, which on a phone is exactly where it shows. */
  const canvas = document.createElement('canvas');
  /* `willReadFrequently` is the whole reason this is not the default path
     silently costing more than it should: without it a browser may keep the
     canvas on the GPU, and every `getImageData` becomes a readback stall. */
  const context = canvas.getContext('2d', { willReadFrequently: true });

  return {
    engine: 'wasm',
    read: async (video) => {
      if (context === null) return [];

      const width = video.videoWidth;
      const height = video.videoHeight;
      /* Before the first frame arrives the element reports 0×0, and drawing
         that throws. It is an ordinary state, not an error: the loop is
         already running while the camera warms up. */
      if (width === 0 || height === 0) return [];

      const scale = Math.min(1, DECODE_SIDE / Math.max(width, height));
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      return decodeQr(context.getImageData(0, 0, canvas.width, canvas.height));
    },
  };
}
