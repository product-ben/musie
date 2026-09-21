/**
 * The camera's three decisions — E.2.
 *
 * Everything the in-app scanner DECIDES is in `camera.ts`; everything it does
 * is in a hook that owns a `MediaStream`. These are the decisions, and they
 * are the part that has to be right when there is no camera to try it on:
 * the failure map is exercised by a person declining a permission prompt, on a
 * device this repository does not have, and a wrong branch there shows up as a
 * screen telling somebody the wrong thing to do next.
 *
 * NO DOM, NO CAMERA. The failures are duck-typed on `.name` precisely so they
 * can be written down here as the objects a browser actually rejects with.
 */
import { describe, expect, it } from 'vitest';

import { cameraFailure, cameraSupport, readFrame } from './camera';

describe('cameraSupport', () => {
  it('lets a secure page with mediaDevices through', () => {
    expect(cameraSupport({ secure: true, hasMediaDevices: true })).toBe('ready');
  });

  /* The LAN dev address, which is a real state in this repo: /dev/qr is meant
     to be opened on a laptop and scanned from a phone, and a phone that then
     opens Musie at that same http:// address lands here. */
  it('refuses an insecure context before anything is asked of the person', () => {
    expect(cameraSupport({ secure: false, hasMediaDevices: true })).toBe('insecure');
  });

  /* Order matters: a browser with no mediaDevices at all cannot be fixed by
     serving it over https, so that is the reason it should be told. */
  it('reports a missing API ahead of an insecure context', () => {
    expect(cameraSupport({ secure: false, hasMediaDevices: false })).toBe('unsupported');
    expect(cameraSupport({ secure: true, hasMediaDevices: false })).toBe('unsupported');
  });
});

describe('cameraFailure', () => {
  it('reads a declined permission prompt as declined', () => {
    expect(cameraFailure({ name: 'NotAllowedError' })).toBe('denied');
    /* Safari and older Chrome, respectively. Both mean the same sentence. */
    expect(cameraFailure({ name: 'PermissionDeniedError' })).toBe('denied');
    /* A permissions policy refusing on the person's behalf. The context was
       already ruled secure before getUserMedia was called. */
    expect(cameraFailure({ name: 'SecurityError' })).toBe('denied');
  });

  it('separates no camera from a camera somebody else has', () => {
    expect(cameraFailure({ name: 'NotFoundError' })).toBe('missing');
    expect(cameraFailure({ name: 'OverconstrainedError' })).toBe('missing');
    expect(cameraFailure({ name: 'NotReadableError' })).toBe('busy');
    expect(cameraFailure({ name: 'TrackStartError' })).toBe('busy');
  });

  /* An unrecognised name must not throw: the console keeps the original, and
     the screen still has to offer the typed field. */
  it('falls back rather than throwing on anything it does not know', () => {
    expect(cameraFailure({ name: 'SomethingNewInChrome142' })).toBe('failed');
    expect(cameraFailure(new Error('no name of interest'))).toBe('failed');
    expect(cameraFailure('a string')).toBe('failed');
    expect(cameraFailure(null)).toBe('failed');
    expect(cameraFailure(undefined)).toBe('failed');
  });

  /* A real DOMException, where one exists, rather than only the object shape
     the other cases use — the duck-typing has to cover the genuine article. */
  it('reads a real DOMException', () => {
    expect(cameraFailure(new DOMException('denied', 'NotAllowedError'))).toBe('denied');
  });
});

describe('readFrame', () => {
  it('finds a card in either payload form', () => {
    expect(readFrame(['https://musie.app/s/MC-01'])).toEqual({ kind: 'card', code: 'MC-01' });
    /* The LAN address the dev sheet actually generates. */
    expect(readFrame(['http://192.168.0.24:5173/s/MC-07'])).toEqual({ kind: 'card', code: 'MC-07' });
    expect(readFrame(['MC-09'])).toEqual({ kind: 'card', code: 'MC-09' });
  });

  it('says nothing when there is nothing to read', () => {
    expect(readFrame([])).toEqual({ kind: 'nothing' });
    /* A decoder that returned an empty payload has not read a code. */
    expect(readFrame(['', '   '])).toEqual({ kind: 'nothing' });
  });

  /* The difference between a scanner that is wrong and a scanner that is
     broken. Somebody holding a parcel label steady needs to be told which. */
  it('distinguishes a QR code that is not ours from an empty frame', () => {
    expect(readFrame(['https://example.com/order/12345'])).toEqual({ kind: 'other' });
    expect(readFrame(['WIFI:S:Cafe;T:WPA;P:hunter2;;'])).toEqual({ kind: 'other' });
  });

  /* A card lying on a magazine. The card is what is being held up, whichever
     order the decoder returned them in. */
  it('prefers a card over anything else in the same frame', () => {
    expect(readFrame(['https://example.com/ad', 'MC-04'])).toEqual({ kind: 'card', code: 'MC-04' });
    expect(readFrame(['MC-04', 'https://example.com/ad'])).toEqual({ kind: 'card', code: 'MC-04' });
  });
});
