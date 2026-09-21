/**
 * Why a camera did not open, and what a frame gave back — E.2's pure half.
 *
 * `useCardScanner.ts` is the half that owns a `MediaStream`, a `<video>` and a
 * timer; none of that can run in a Node test. This is everything the scanner
 * decides that is a DECISION rather than an effect, which is why it lives
 * apart and is the file with the tests — the same split `scanCode.ts` and
 * `scan.ts` already make.
 *
 * ── THE CAMERA IS A FALLBACK, AND THE FAILURES ARE NOT FAILURES ───────────
 * The common way into the scan step is the phone's own camera app following
 * `<origin>/s/MC-01`; the in-app camera is the way in for somebody who opened
 * Musie first. So every branch below ends in the same place: the typed field,
 * which never stops working. There is nothing here that can leave the step
 * without a way on.
 *
 * `denied` is the one to read twice. A permission prompt answered with *no*
 * is a person declining, not an error — the app asked, they said no, and the
 * app's job is to stop asking and get out of the way. It is a `problem` in the
 * type because the camera cannot open, and it is written on screen as a fact
 * rather than as an apology (`session.scan.cameraDenied`).
 */
import { decodeScan } from './scanCode';

/**
 * The reasons the camera is not running, in the shape the screen needs.
 *
 * Deliberately SIX rather than the twenty-odd names `getUserMedia` can reject
 * with. The screen has one sentence per reason and each sentence has to tell
 * somebody something they can act on, so two errors that lead to the same
 * sentence are one reason here.
 */
export type CameraProblem =
  /** The permission prompt was answered with no, or the browser refuses to ask. */
  | 'denied'
  /** There is no camera on this device, or none that matches what was asked for. */
  | 'missing'
  /** There is one, and something else has it. */
  | 'busy'
  /** Not a secure context: `http://` on anything but localhost. */
  | 'insecure'
  /** No `mediaDevices` at all — an old browser, or an embedded webview. */
  | 'unsupported'
  /** The QR decoder itself could not be loaded (E.3's wasm, over the network). */
  | 'decoder'
  /** Something else. The console has it; the screen says what to do instead. */
  | 'failed';

/**
 * What the browser will let us try, BEFORE anything is asked of the person.
 *
 * Checked first because two of the three answers must never produce a
 * permission prompt: a page served over plain `http://` cannot open a camera
 * at all, and prompting anyway would be asking for something that cannot be
 * granted. The screen shows the reason where the button would have been.
 *
 * ── `insecure` IS NOT HYPOTHETICAL IN THIS REPO ───────────────────────────
 * `/dev/qr` exists to be opened on a laptop at `http://192.168.0.24:5173` and
 * scanned with a phone. Anybody who then opens Musie ITSELF on that phone, at
 * that same LAN address, is in exactly this state — the deep link works, the
 * typed field works, and the in-app camera cannot. `localhost` is a secure
 * context by definition, so the laptop's own dev server is unaffected.
 *
 * Takes its inputs rather than reading `window`, so the three answers can be
 * asserted without a browser.
 */
export function cameraSupport(
  context: { secure: boolean; hasMediaDevices: boolean },
): 'ready' | CameraProblem {
  if (!context.hasMediaDevices) return 'unsupported';
  if (!context.secure) return 'insecure';
  return 'ready';
}

/**
 * A rejected `getUserMedia`, as one of the reasons above.
 *
 * DUCK-TYPED ON `.name`, on purpose. The spec names these errors and every
 * engine agrees on the names, but they arrive as `DOMException` in a browser,
 * as a plain object from some webviews, and as neither in a test — so reading
 * the property is the portable version of an `instanceof` that would be wrong
 * somewhere. An unrecognised name is `failed` rather than a throw: the person
 * gets the same way out either way, and the console keeps the original.
 *
 * `SecurityError` sits with `denied` rather than with `insecure`: by the time
 * `getUserMedia` has been called, `cameraSupport` has already ruled the
 * context secure, so a security error here is a permissions policy refusing —
 * which is the browser saying no on the person's behalf.
 */
export function cameraFailure(thrown: unknown): CameraProblem {
  const name = typeof thrown === 'object' && thrown !== null && 'name' in thrown
    ? String((thrown as { name: unknown }).name)
    : '';

  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'missing';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'busy';
    default:
      return 'failed';
  }
}

/** What one decoded frame meant. */
export type FrameReading =
  /** Nothing in view, or nothing readable. Keep looking, say nothing. */
  | { kind: 'nothing' }
  /** A QR code that is not one of ours — a parcel label, a restaurant menu. */
  | { kind: 'other' }
  /** A card. Stop the camera; this is the answer. */
  | { kind: 'card'; code: string };

/**
 * The payloads one frame decoded, as the single thing the scanner should do.
 *
 * ── WHY `other` IS A STATE AND NOT SILENCE ────────────────────────────────
 * A scanner that only ever reacts to the right code is indistinguishable, to
 * the person holding the wrong one, from a scanner that is broken. They hold
 * the code steady, the frame does nothing, and there is no way to tell which
 * of the two is happening. One sentence — *that QR code is not one of
 * Musie's* — is the difference between a dead frame and an answer.
 *
 * It does not stop the camera. A wrong code in view is not a decision, it is
 * something to move past, so the loop keeps running and the note goes away on
 * its own when the right card arrives.
 *
 * A card wins over anything else in the same frame, whatever order they came
 * back in: two codes in view at once is a card lying on a magazine, and the
 * card is what the person is holding up.
 */
export function readFrame(payloads: readonly string[]): FrameReading {
  let sawSomething = false;
  for (const payload of payloads) {
    if (payload.trim() === '') continue;
    sawSomething = true;
    const code = decodeScan(payload);
    if (code !== null) return { kind: 'card', code };
  }
  return sawSomething ? { kind: 'other' } : { kind: 'nothing' };
}
