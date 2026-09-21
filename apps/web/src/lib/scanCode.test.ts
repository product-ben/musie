/**
 * The decoder — E.0's one testable decision.
 *
 * Three ways into the scan step converge on `decodeScan`, and the printed
 * artefact it reads cannot be changed once it exists. So the tests here are
 * not about coverage: they are the record of what the QR code on a paper card
 * is allowed to say, in a file somebody will read before changing it.
 *
 * NO NETWORK, NO DOM, NO DOMAIN. That last one is the design being asserted
 * rather than described: every URL below names a different host, and the
 * expected result is the same code every time. The day Musie has a domain,
 * nothing in this file changes — which is the whole reason E.0 could be built
 * before there was one.
 */
import { describe, expect, it } from 'vitest';

import { CARD_CODE, decodeScan, scanLink } from './scanCode';

describe('decodeScan', () => {
  /* ── PAYLOAD FORM 1: the URL a phone camera follows ───────────────────── */
  it('takes the code from a scanned URL, whatever the host', () => {
    expect(decodeScan('https://musie.app/s/MC-01')).toBe('MC-01');
    /* The LAN dev server, which is what the dev sheet actually produces and
       what a phone actually scans before there is a domain. */
    expect(decodeScan('http://192.168.0.24:5173/s/MC-07')).toBe('MC-07');
    expect(decodeScan('http://localhost:5173/s/MC-09')).toBe('MC-09');
    /* A host nobody ever intended. It still decodes, because the decoder
       validates a SHAPE and never an origin — see the module header for why
       that is deliberate rather than lax. */
    expect(decodeScan('https://example.com/s/MC-03')).toBe('MC-03');
  });

  it('survives what cameras and shorteners add to a URL', () => {
    expect(decodeScan('https://musie.app/s/MC-02/')).toBe('MC-02');
    expect(decodeScan('https://musie.app/s/MC-02?utm_source=deck')).toBe('MC-02');
    expect(decodeScan('https://musie.app/s/MC-02#scanned')).toBe('MC-02');
    /* The query is stripped BEFORE the path is split. A slash inside a
       parameter would otherwise become the last segment. */
    expect(decodeScan('https://musie.app/s/MC-02?next=/diary/1')).toBe('MC-02');
  });

  /* ── PAYLOAD FORM 2: the bare code, typed by hand ────────────────────── */
  it('takes a bare code as its own last segment', () => {
    expect(decodeScan('MC-01')).toBe('MC-01');
    expect(decodeScan('  MC-05  ')).toBe('MC-05');
    /* Typed, so it arrives in whatever case the keyboard was in. */
    expect(decodeScan('mc-05')).toBe('MC-05');
  });

  /* ── MALFORMED ───────────────────────────────────────────────────────── */
  it('refuses anything that is not a card code', () => {
    expect(decodeScan('')).toBeNull();
    expect(decodeScan('   ')).toBeNull();
    expect(decodeScan('hello')).toBeNull();
    /* A URL with no code at the end of it — someone scanned the wrong QR. */
    expect(decodeScan('https://musie.app/diary')).toBeNull();
    expect(decodeScan('https://musie.app/s/')).toBeNull();
    /* Neither of these is what is printed, and accepting them would teach a
       spelling the camera path could never produce. */
    expect(decodeScan('MC01')).toBeNull();
    expect(decodeScan('MC-1')).toBeNull();
    expect(decodeScan('MC-001')).toBeNull();
    /* A code-shaped thing from another deck entirely. */
    expect(decodeScan('XY-01')).toBeNull();
  });

  it('round-trips every link the generator makes', () => {
    for (const code of ['MC-01', 'MC-04', 'MC-09']) {
      expect(decodeScan(scanLink(code, 'https://musie.app'))).toBe(code);
      expect(decodeScan(scanLink(code, 'http://localhost:5173'))).toBe(code);
    }
  });
});

describe('scanLink', () => {
  it('builds a same-origin link from whatever base it is given', () => {
    expect(scanLink('MC-01', 'https://musie.app')).toBe('https://musie.app/s/MC-01');
    expect(scanLink('MC-01', 'http://localhost:5173')).toBe('http://localhost:5173/s/MC-01');
  });

  it('does not double the separator when the base ends in one', () => {
    expect(scanLink('MC-06', 'https://musie.app/')).toBe('https://musie.app/s/MC-06');
  });

  it('prints the canonical spelling of a code, whatever case it was passed', () => {
    expect(scanLink('mc-08', 'https://musie.app')).toBe('https://musie.app/s/MC-08');
  });

  /* THE ONE THROW IN THIS MODULE. A QR code goes onto a physical card, so the
     moment to refuse an undecodable one is before the ink rather than in front
     of somebody holding the deck. */
  it('refuses a code it could not decode again', () => {
    expect(() => scanLink('MC-1', 'https://musie.app')).toThrow(/not a card code/);
    expect(() => scanLink('', 'https://musie.app')).toThrow(/not a card code/);
  });
});

describe('CARD_CODE', () => {
  /* The seed's own nine, asserted here so the pattern and the deck cannot
     drift apart silently — `20260918150600_content_seed.sql` inserts MC-01 to
     MC-09 and the regex has to accept all of them. */
  it('accepts every code in the printed deck', () => {
    for (let n = 1; n <= 9; n += 1) {
      expect(CARD_CODE.test(`MC-0${n}`)).toBe(true);
    }
  });
});
