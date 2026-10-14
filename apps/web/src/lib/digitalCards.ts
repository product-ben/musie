/**
 * Digital cards — the mode, how many cards an exercise deals, and the hand.
 *
 * The whole of `DIGITAL-CARDS.md` §3.1 in one pure module, and pure is the
 * point: every decision below is a function of things that cannot change
 * underneath it, so none of it has to be stored and all of it can be asserted
 * in a test with no DOM, no network and no database.
 *
 * ── NOTHING IS PERSISTED, AND THAT IS A PRODUCT DECISION ──────────────────
 * Ben, 2026-10-13: *"this doesn't need to be persisted. By default it should be
 * on as we always want to push people to use the analogue deck. Keep it
 * simple!"* The deck is what Musie is; the digital hand is the way in for
 * somebody who cannot reach it. A remembered *off* would quietly turn a
 * fallback into a preference, so the switch is asked fresh every session and
 * there is no column, no profile field and no web storage behind it.
 *
 * ── AND THE MODE IS NOT HERE ANY MORE ────────────────────────────────────
 * It was `?digitalcards`, a query token, for one day. It became
 * `sessions.digital_cards` on 2026-10-14, because `view` and `select` are
 * steps now and the step LIST depends on the mode — a token cannot survive
 * leaving the session, and a run whose list is computed wrong refuses the step
 * its own row is sitting on.
 *
 * What is still derived, and the reason this file exists, is the HAND.
 *
 * ── WHAT MOVED OUT OF HERE ────────────────────────────────────────────────
 * `CARDS_DEALT` was a map in this file — exercise id to a number — with a
 * twenty-five line header explaining that it belonged in `exercises` and could
 * not be written there, because the commands that apply a migration are Ben's
 * under rule 9 and a column the generated types do not have is a compile error
 * in every screen that reads it.
 *
 * `20261014113500` applied it on 2026-10-14, so the map and its argument are
 * gone and `exercise.cardsDealt` is the number. `dealsOnIntro` went with them:
 * nothing deals on Einsteigen any more, because `view` and `select` are steps
 * and a step does its own work.
 */
import type { Card } from './content';



/* ── The hand ──────────────────────────────────────────────────────────────*/

/**
 * FNV-1a over the session id, 32-bit. Not a cryptographic hash and does not
 * need to be: all that is asked of it is that two different session ids
 * usually disagree and that one id always agrees with itself.
 */
function seedFrom(sessionId: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < sessionId.length; i += 1) {
    hash ^= sessionId.charCodeAt(i);
    /* The FNV prime, as the shifts-and-adds form, because `hash * 16777619`
       overflows a double's integer range and loses the low bits. */
    hash = (hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)) >>> 0;
  }
  return hash;
}

/** mulberry32 — a small, fast PRNG with a 32-bit state. Deterministic. */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The hand this session was dealt — DERIVED, NEVER STORED.
 *
 * ── WHY IT IS A FUNCTION OF THE SESSION ID ───────────────────────────────
 * "Nothing is persisted" and "the same five cards after a reload" sound like
 * opposites, and this is the line where they are not. The session id is the
 * one thing about a run that cannot change: it is minted once, it is in the
 * address bar, and every later step reads the same row by it. Deal from it and
 * the hand is stable through a reload, a Back out of Hören, a second opening
 * of the sheet, and the switch turned on and off again — without a column, a
 * migration, a cache or a byte written.
 *
 * Without this the simple version is not simple, it is wrong: a reload
 * re-deals, and the thumbnails change under somebody who has just spent a
 * minute looking at them.
 *
 * A different session deals a different hand because it is a different id.
 *
 * ── THE HAND COMES BACK IN DECK ORDER ────────────────────────────────────
 * The shuffle decides WHICH five; `sort` decides how they are laid out. The
 * draw order is the mechanism and nobody should be able to read it off the
 * screen — a grid whose first cell is "the one the shuffle happened to pick
 * first" invites a meaning that is not there.
 *
 * ── FEWER CARDS THAN ASKED FOR IS NOT AN ERROR ───────────────────────────
 * `count` is clamped to what the deck actually has. The deck is nine today and
 * the exercise asks for five; a deck trimmed to four would otherwise deal a
 * hand with holes in it.
 */
export function dealtCards(
  sessionId: string,
  cards: readonly Card[],
  count: number,
): Card[] {
  const wanted = Math.max(0, Math.min(count, cards.length));
  if (wanted === 0) return [];

  /* Fisher-Yates over a copy, with the seeded generator. Partial: it only has
     to settle the first `wanted` places. */
  const pool = [...cards];
  const next = random(seedFrom(sessionId));
  for (let i = 0; i < wanted; i += 1) {
    const j = i + Math.floor(next() * (pool.length - i));
    /* `next()` is in [0, 1), so `j` cannot reach `pool.length` — clamped
       anyway, because an injected generator in a test is not bound by that. */
    const pick = Math.min(j, pool.length - 1);
    [pool[i], pool[pick]] = [pool[pick], pool[i]];
  }

  return pool.slice(0, wanted).sort((a, b) => a.sort - b.sort);
}

/**
 * The same search string with the mode token on it, or off it.
 *
 * ── WHY A STRING AND NOT `URLSearchParams.set` ───────────────────────────
 * The token is VALUELESS, and `set(key, '')` writes `?digitalcards=` — a
 * trailing `=` that `.has()` still answers but that reads, correctly, as an
 * empty value rather than as a flag. `SessionListen`'s `withView` solves the
 * same problem the same way for `?overview` / `?focus`, and this is
 * deliberately its twin rather than a second idea: both preserve anything else
 * in the query and put their own token last.
 *
 * It is also why the two cannot collide. The listen step rewrites the search
 * on arrival and on every transport press; it does that by rebuilding from
 * `location.search`, so a mode token already on the URL survives it.
 */
export function withToken(search: string, token: string, on: boolean): string {
  const rest = new URLSearchParams(search);
  rest.delete(token);

  /* ── EVERY VALUELESS TOKEN STAYS VALUELESS, NOT JUST THIS ONE ───────────
     `URLSearchParams.toString()` writes a bare `?focus` back as `focus=`, so
     an earlier version — which kept only its OWN token bare and let the
     serialiser handle the rest — turned `?digitalcards` into `?digitalcards=`
     the moment a second helper ran over it. Composing two of these is exactly
     what the switch and the sheet do.

     The trailing `=` is not cosmetic: `.has()` answers both, so nothing
     breaks, and an address that says `?digitalcards=` invites the reading
     that there is a VALUE missing. A flag has no value to be missing.

     So the pairs are rebuilt by hand and an empty value is emitted as the key
     alone. The key is not re-encoded: it came out of `URLSearchParams`, which
     has already decoded it, and encoding a token like `focus` is a no-op that
     would only matter for a key nobody writes. */
  const parts = [...rest.entries()].map(
    ([key, value]) => (value === '' ? key : `${key}=${encodeURIComponent(value)}`),
  );
  if (on) parts.push(token);
  return parts.length === 0 ? '' : `?${parts.join('&')}`;
}


/**
 * ── AN OPEN SHEET IS IN THE ADDRESS — Ben, 2026-10-14 ─────────────────────
 *
 * *"When the sheet is pulled up, always expose it in the url (with ?focus)."*
 *
 * The SAME TOKEN the listen step already uses for its own full-screen view,
 * deliberately rather than a second one: it means one thing — *a sheet is up*
 * — and which sheet is decided by the step you are on, exactly as the step
 * decides what `?overview` shows. A second token would be a second name for
 * the same state, and the first person to hand-type one would get a screen
 * with two sheets arguing about it.
 *
 * Three things fall out of it, and none is free otherwise: the browser's own
 * Back closes the sheet, a reload keeps it open instead of dropping somebody
 * back on the step behind it, and a tester can be sent straight to the thing
 * being tested.
 */
export const SHEET_OPEN = 'focus';

export function withSheetOpen(search: string, on: boolean): string {
  return withToken(search, SHEET_OPEN, on);
}
