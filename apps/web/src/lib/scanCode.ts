/**
 * What a QR code on a paper card SAYS, and how to read it back — E.0.
 *
 * Three ways into the scan step — the phone's own camera app following a deep
 * link, the in-app camera (E.2/E.3), and a typed code (E.1) — and all three
 * arrive here first. Whatever was scanned or typed goes through `decodeScan`,
 * comes out as a canonical `MC-01`, and is then looked up with
 * `getCardByCode()`. One decoder, so the three ways in cannot disagree about
 * what a code is.
 *
 * ── THERE IS NO DOMAIN, AND THIS FILE IS WHY THAT COSTS NOTHING ────────────
 * The payload is a URL — `https://<wherever>/s/MC-01` — because a URL is what
 * a phone camera can act on without the app being open, and that is the common
 * way in for somebody holding a printed card. The alternative, a bare code,
 * can never do that. But a URL payload does NOT mean this app needs to know
 * its own address:
 *
 *   · THE DECODER NEVER COMPARES A HOST. It takes the last path segment and
 *     validates its SHAPE. `https://musie.app/s/MC-01`, `http://192.168.0.4:
 *     5173/s/MC-01` and a bare `MC-01` all yield `MC-01`. Nothing here knows
 *     or cares where the code was printed to point.
 *   · THE ROUTE IS SAME-ORIGIN. `/s/:code` resolves on localhost, on a Netlify
 *     preview and on the real domain, unchanged.
 *   · ONLY THE PRINTED CODE NEEDS AN ORIGIN, which is why `scanLink` takes one
 *     as an argument rather than holding one. The dev sheet passes
 *     `window.location.origin` and is therefore self-hosting; print day passes
 *     `--base-url` to `scripts/qr-codes.mjs`. Neither needs a config entry.
 *
 * A host check would buy nothing and cost something real: it would reject the
 * LAN address the phone actually scans during development, and it would reject
 * every code already printed on the day the domain changes. The card is paper.
 * It cannot be reprinted.
 *
 * ── PURE, AND THAT IS THE POINT OF THE SPLIT ───────────────────────────────
 * No DOM, no network, no Supabase, no `window`. `scan.ts` next door is the
 * half that talks to the database. This half is the half with the tests.
 */

/**
 * The shape of a code printed on a Mindfulness Card.
 *
 * `cards.code` is `MC-01` … `MC-09` (`20260918150600_content_seed.sql`), and
 * the schema calls it "the code printed on the paper card, beside its QR code".
 * Two digits rather than one or more: the deck is nine cards, the printed form
 * is zero-padded, and a pattern that also accepted `MC-1` would make two
 * spellings of one card — one of which matches no row.
 *
 * VALIDATION IS SHAPE ONLY. Whether a card with this code EXISTS is a question
 * for the database, and the two failures read differently on screen: a
 * malformed code is a typo, an unknown one is a card this deck does not have.
 */
export const CARD_CODE = /^MC-\d{2}$/;

/** The one path segment `/s/:code` is mounted at. Shared so the route table
 *  and the generator cannot drift into two spellings of one link. */
export const SCAN_PATH = 's';

/**
 * The code inside whatever was scanned or typed, or null.
 *
 * ONE RULE FOR BOTH PAYLOAD FORMS: take the last non-empty path segment. A
 * bare `MC-01` has no separators, so it IS its own last segment — which is why
 * there is no branch here on "does this look like a URL". A branch would need
 * a definition of "looks like a URL", and every definition of that is wrong
 * about something somebody's camera app produces.
 *
 * Tolerant about the things a human or a scanner adds and nothing else:
 * surrounding whitespace, a trailing slash, a query string or a fragment
 * (`?utm_source=…` from a link shortener, `#` from a camera app), and case.
 * `mc-01` typed into the field is the same card as `MC-01` printed on it.
 *
 * Deliberately NOT tolerant of a missing hyphen or a missing zero. `MC01` and
 * `MC-1` are not what is printed, and quietly accepting them would mean the
 * field taught a spelling the QR code does not use — and E.2's camera, which
 * reads the printed form, would then be the strict one.
 */
export function decodeScan(scanned: string): string | null {
  const trimmed = scanned.trim();
  if (trimmed === '') return null;

  /* Query and fragment first: they can contain slashes, so stripping them
     after the split would hand back a segment of somebody's tracking
     parameter. */
  const path = trimmed.split('#')[0].split('?')[0];
  const segment = path.split('/').filter((part) => part !== '').pop() ?? '';

  const code = segment.toUpperCase();
  return CARD_CODE.test(code) ? code : null;
}

/**
 * The URL a card's QR code carries, for a given origin.
 *
 * `baseUrl` is an ARGUMENT, always, and this module never reaches for
 * `window.location.origin` itself — a pure function that reads a global is not
 * pure, and this one is called from a Node script where there is no window.
 * Callers in the browser pass the origin they were loaded from; the print
 * script passes the one being printed for.
 *
 * Throws on a code it would not be able to decode again. A QR code is printed
 * onto a physical card and cannot be recalled, so the one moment to refuse a
 * bad one is before the ink.
 */
export function scanLink(code: string, baseUrl: string): string {
  const upper = code.trim().toUpperCase();
  if (!CARD_CODE.test(upper)) {
    throw new Error(`[musie] "${code}" is not a card code, so it cannot be printed as one`);
  }
  /* A base that already ends in a slash is the common mistake, and it would
     produce `//s/MC-01` — which works, and looks broken on a printed page. */
  const base = baseUrl.trim().replace(/\/+$/, '');
  return `${base}/${SCAN_PATH}/${upper}`;
}
