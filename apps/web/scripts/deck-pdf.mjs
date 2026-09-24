/**
 * `supabase/content/deck.json` → a print-ready PDF of the paper deck.
 *
 * ── WHAT IT MAKES ─────────────────────────────────────────────────────────
 * Two faces per card. The FRONT is the feeling, set large — the card's whole
 * job is to be the one you are drawn to, and the deck has no artwork yet
 * (`cards.image_url` is still the shared `method-card.png` placeholder, which
 * is a picture of a card and not a picture for one). The BACK is the QR code
 * and, beside it, the printed code the schema has always said belongs there.
 *
 * ── WHY CHROMIUM AND NOT A PDF LIBRARY ────────────────────────────────────
 * Because the card should look like Musie, and Musie's look is three CSS files
 * in `packages/design-system/tokens/`. This builds an HTML page that loads
 * those files from disk — the real webfonts, the real semantic aliases — and
 * prints it through the Chromium that `@playwright/test` already installs for
 * the end-to-end walk. No new dependency, and the printed card cannot drift
 * from the system, because it is made out of it.
 *
 * Semantic aliases only, and every class is `musie-` prefixed: CLAUDE.md
 * rule 1 holds here exactly as it does in a screen. The type SIZES are set in
 * millimetres rather than taken from `--type-*`, and that is the one deliberate
 * departure: the type scale is fluid on a viewport, and a 63 mm page is not a
 * viewport — every `clamp()` in it would collapse to its minimum. A printed
 * size is a physical measurement, so it is written as one.
 *
 * ── THE PDF IS NOT COMMITTED, AND THE DECK IS NOT PRINTABLE YET ───────────
 * Same rule as `qr-codes.mjs`: the generator is committed and its output is
 * not, because the thing that gets printed must be reproducible. And the QR
 * carries an ABSOLUTE url, so the deck cannot go to a printer until the domain
 * is decided (BUILD-PLAN.md's blocker table). Until then `--base-url` defaults
 * to the dev server and the PDF is a real proof you can cut out and scan on
 * your own laptop; print day is the same command with the real address.
 *
 * USAGE
 *   node scripts/deck-pdf.mjs                                  # or: pnpm deck:pdf
 *   node scripts/deck-pdf.mjs --base-url https://musie.example
 *   node scripts/deck-pdf.mjs --layout sheet                   # 9-up on A4, for the office printer
 *   node scripts/deck-pdf.mjs --locale de                      # German only
 *   node scripts/deck-pdf.mjs --card 88x63 --bleed 3           # the defaults, spelled out
 *   node scripts/deck-pdf.mjs --card 63x88                     # portrait instead
 *   node scripts/deck-pdf.mjs --codes MC-03,MC-07              # reprint two cards
 *
 * It writes `deck.pdf` and the `deck.html` it was printed from — open the HTML
 * in a browser to iterate on the design without waiting for a PDF.
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import QRCode from 'qrcode';
import { LOCALES, assertDeck, ordered, readDeck } from './deck.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TOKENS = join(HERE, '..', '..', '..', 'packages', 'design-system', 'tokens');

/** Where `cards.image_url` is relative to. The app serves `public/assets/**`
 *  at `/assets/**`, so the column's `assets/cards/mc-01.webp` is this plus
 *  that. */
const PUBLIC = join(HERE, '..', 'public');

/**
 * The PRINT MASTERS, deliberately outside `public/`.
 *
 * Everything under `public/` is copied into the web build verbatim, and a
 * print master is the one file that must not be: it is portrait, it is 300dpi
 * at 69 × 94 mm, and it is several megabytes that no browser should ever be
 * offered. The screen wants a small `.webp`; the press wants the master. Two
 * files, one card.
 *
 * So this looks for `<card id>.<ext>` here FIRST and falls back to whatever
 * `cards.image_url` points at — which means the printed deck is right from the
 * moment the masters land, with no column to update and no migration to run,
 * while the column stays what it has always been: a web path.
 */
const MASTERS = join(HERE, '..', '..', '..', 'artwork', 'cards');

/** Print-master extensions, best first. */
const MASTER_EXT = ['.png', '.webp', '.jpg', '.jpeg', '.tif', '.tiff'];

/**
 * THE FRONT'S CORNER QR — size and placement, in one place because two of them
 * need it: the stylesheet draws it and `main` checks it is still scannable.
 *
 * Keyed to the SHORT edge, like every other size in this file, so a landscape
 * card and a portrait one print the same physical square.
 */
const FRONT_QR_FRACTION = 0.26;

/**
 * How far the square sits inside the TRIM line, in millimetres.
 *
 * `artwork/cards/README.md` puts the floor at 3 mm — "anything that must
 * survive belongs at least 3 mm inside the trim line" — and this is a machine's
 * target rather than a human's, so it takes the floor plus a millimetre. A
 * drifting cut that clips a word costs a word; one that clips a QR's quiet zone
 * costs the card its only job.
 */
const FRONT_QR_INSET = 4;

/**
 * Below this, a printed module is too fine for a phone to resolve at the
 * distance somebody actually holds a card. 0.4 mm is the commonly cited floor
 * and this warns rather than throws, because the number depends on the printer
 * and the person, and refusing to write a PDF over it would be a guess with
 * more authority than it has earned.
 */
const MIN_MODULE_MM = 0.4;

function frontQrSize(card) {
  return Math.min(card.width, card.height) * FRONT_QR_FRACTION;
}

/** The dev server, so the default output is scannable with no argument — the
 *  same default, for the same reason, as `qr-codes.mjs`. */
const DEFAULT_BASE_URL = 'http://localhost:5173';

/**
 * A4, in millimetres, TURNED TO MATCH THE CARD.
 *
 * Not a cosmetic choice — it is the difference between nine cards on a sheet
 * and eight. Portrait 63 × 88 gives 3 × 3 on upright A4. The same arithmetic on
 * a landscape 88 × 63 card gives 2 × 4, so the ninth card starts a second sheet
 * and the whole deck needs four pages instead of two. Turned sideways, 88 × 63
 * gives 3 × 3 again.
 */
const sheetFor = (card) =>
  card.width > card.height ? { width: 297, height: 210 } : { width: 210, height: 297 };

/**
 * PRINT COPY. Not app chrome, so not in `src/i18n` — nothing renders this on a
 * screen — but held to docs/GERMAN-UI-WRITING.md all the same: imperative
 * singular, du, verb first, no 'Bitte'.
 */
const CAPTION = { de: 'Scanne und hör zu', en: 'Scan and listen' };

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) args[arg.slice(2)] = true;
    else { args[arg.slice(2)] = next; i += 1; }
  }
  return args;
}

/** `63x88` → `{ width: 63, height: 88 }`, in millimetres. */
function parseSize(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const match = /^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)$/.exec(value.trim());
  if (match === null) throw new Error(`--card wants a size like 63x88, not "${value}".`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

/** HTML-escaping for the only two places a deck string reaches markup. */
const escape = (value) =>
  String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));

/** The url a card's QR carries. A copy of `src/lib/scanCode.ts`'s `scanLink`,
 *  for the reason `qr-codes.mjs` sets out at length: this is plain ESM run by
 *  node, that is TypeScript, and `scanCode.test.ts` asserts the exact strings
 *  both produce. */
function scanLink(code, baseUrl) {
  return `${baseUrl.trim().replace(/\/+$/, '')}/s/${code.trim().toUpperCase()}`;
}

/* ── the two faces ────────────────────────────────────────────────────── */

/**
 * The front: the ARTWORK where there is any, and the feeling set in type where
 * there is not.
 *
 * Not a fallback so much as two honest states. Ben's answer for a card that
 * has its picture is artwork alone — no word set over it, because the picture
 * is the card and a word on top would be the designer arguing with the
 * illustrator. A card whose picture has not been drawn yet still has to print,
 * and the one thing it reliably has is its feeling.
 *
 * So a half-drawn deck prints correctly: five pictures and four words, rather
 * than five pictures and four blanks.
 */
function front(card, locales, artwork, qr) {
  /* THE SAME CODE AS THE BACK, small and in the corner.
     Ben, 2026-09-24. A card face down on a table is the common case and
     turning it over to scan it is the one move that gives away which card it
     is before the reveal. The back keeps the large code, the printed pair of
     characters and the caption that says what the square is for; this is the
     square alone, at the size where it is still a machine's target and not yet
     a graphic element.

     ON BOTH FRONTS, drawn and undrawn. A deck where five cards scan from the
     front and four do not is a deck nobody can give an instruction about. */
  const scan = `<div class="musie-front-qr">${qr}</div>`;

  if (artwork !== null) {
    /* alt from `card_i18n.image_alt` where it exists. A PDF carries alt text
       and a screen reader reads it, so this is not decoration. */
    const alt = card.imageAlt?.[locales[0]] ?? '';
    return `<div class="musie-card musie-card--art">
  <img class="musie-art" src="${artwork}" alt="${escape(alt)}" />
  ${scan}
</div>`;
  }

  const [primary, ...rest] = locales;
  return `<div class="musie-card musie-card--front">
  <p class="musie-feeling">${escape(card.feeling[primary])}</p>
  ${rest.map((locale) => `<p class="musie-feeling-alt">${escape(card.feeling[locale])}</p>`).join('\n  ')}
  ${scan}
</div>`;
}

function back(card, locales, qr) {
  /* TWO groups, not four things spread down a column. The code and the caption
     both belong TO the QR — one is the same fact for a pair of eyes, the other
     says what the square is for — so they travel with it, and the only thing
     the card's foot holds is the name. */
  return `<div class="musie-card musie-card--back">
  <div class="musie-scan">
    <div class="musie-qr">${qr}</div>
    <p class="musie-code">${escape(card.code)}</p>
    <p class="musie-caption">${locales.map((locale) => escape(CAPTION[locale])).join(' · ')}</p>
  </div>
  <p class="musie-wordmark">Musie</p>
</div>`;
}

/* ── the two layouts ──────────────────────────────────────────────────── */

/**
 * One card per page, at trim + bleed.
 *
 * Front then back, card by card, which is what a duplex printer wants and what
 * a print shop accepts. There are no crop marks: the page IS trim plus bleed,
 * so the cut line is the bleed inset from every edge, and a mark drawn inside
 * the bleed would be cut through rather than cut to.
 */
function singlePages(faces, card, bleed) {
  const page = { width: card.width + bleed * 2, height: card.height + bleed * 2 };
  /* THE PAGE CARRIES THE CARD'S OWN BACKGROUND, and that is the whole point of
     bleed: the ink runs past the trim line so a cut that drifts half a
     millimetre takes card, not white paper. The padding is then the safe area
     rather than a border — nothing inside it can be cut off. */
  const css = `@page { size: ${page.width}mm ${page.height}mm; margin: 0; }
    .musie-page { width: ${page.width}mm; height: ${page.height}mm; padding: ${bleed}mm;
      background: var(--surface-raised); position: relative; }
    /* ARTWORK IGNORES THE SAFE AREA AND FILLS THE SHEET. The padding above is a
       safe area for TYPE — it keeps a word off the cut line. A picture wants
       the opposite: it has to run past the trim on every side, or the bleed it
       was drawn with stops at a white border.

       POSITIONED, not pulled out with a negative margin. The margin version
       overflowed the page box by a rounding error, and an overflowing image
       paints in a later phase than a following sibling's BACKGROUND — so a
       hairline of each card's artwork landed along the top of the back behind
       it. Pinning inset:0 to a positioned page is the same rectangle by
       construction, with nothing to clip and nothing to round. */
    .musie-page .musie-card--art { position: absolute; inset: 0; width: auto; height: auto;
      /* THE ONE FACE WHOSE OWN EDGE IS NOT THE TRIM LINE. Everything else on
         this page sits inside the safe area above, so its edge and the cut line
         are the same rectangle. The art front is pinned to the whole sheet —
         trim PLUS ${bleed} mm of bleed on every side — so an inset measured from
         ITS edge starts that much further out. Adding the bleed back is what
         keeps the square the same distance inside the cut as it is on a word
         front, rather than sitting ${bleed} mm nearer the blade. */
      --musie-front-qr-inset: ${(bleed + FRONT_QR_INSET).toFixed(2)}mm; }`;

  return { css, html: faces.map((face) => `<section class="musie-page">${face}</section>`).join('\n') };
}

/**
 * Nine-up on A4, cards butted so one cut serves two of them.
 *
 * FRONTS FIRST, THEN BACKS, and each back sheet has its columns reversed —
 * flip a duplex sheet on the long edge and the left column becomes the right
 * one. Print ONE sheet of each and hold them to the light before running the
 * deck: this is the part of the file a printer driver's own duplex setting can
 * silently disagree with.
 */
function sheetPages(cards, renderFront, renderBack, card) {
  const SHEET = sheetFor(card);
  const columns = Math.max(1, Math.floor(SHEET.width / card.width));
  const rowsPerSheet = Math.max(1, Math.floor(SHEET.height / card.height));
  const perSheet = columns * rowsPerSheet;

  const css = `@page { size: ${SHEET.width}mm ${SHEET.height}mm; margin: 0; }
    .musie-page { width: ${SHEET.width}mm; height: ${SHEET.height}mm;
      display: grid; align-content: center; justify-content: center;
      grid-template-columns: repeat(${columns}, ${card.width}mm);
      grid-auto-rows: ${card.height}mm; }
    .musie-page .musie-card { outline: 0.2mm dashed var(--border-subtle); outline-offset: -0.1mm; }`;

  const sheets = [];
  for (let start = 0; start < cards.length; start += perSheet) {
    const batch = cards.slice(start, start + perSheet);
    sheets.push({ batch, faces: batch.map(renderFront), mirrored: false });
  }
  for (let start = 0; start < cards.length; start += perSheet) {
    const batch = cards.slice(start, start + perSheet);
    /* Reverse within each printed row, not across the batch: the last row of a
       part-full sheet has fewer cards and must still line up with the fronts
       above it. */
    const faces = [];
    for (let row = 0; row < batch.length; row += columns) {
      faces.push(...batch.slice(row, row + columns).map(renderBack).reverse());
    }
    sheets.push({ batch, faces, mirrored: true });
  }

  return {
    css,
    html: sheets
      .map(({ faces }) => `<section class="musie-page">\n${faces.join('\n')}\n</section>`)
      .join('\n'),
  };
}

/* ── the document ─────────────────────────────────────────────────────── */

function document_(body, layoutCss, card, meta) {
  const stylesheet = (name) => pathToFileURL(join(TOKENS, name)).href;

  /**
   * EVERY TYPE SIZE IS A FRACTION OF THE CARD'S SHORT EDGE, not its width.
   *
   * Width was the same thing while every card was portrait. Turn the card and
   * it stops being: a fraction of 88 mm sets the feeling half again as large on
   * a card that is now 25 mm SHORTER, which is the one direction that ran out
   * of room. The short edge is what actually constrains a centred word, and
   * keying to it means a landscape card and a portrait card print the feeling
   * at the same physical size — and that portrait output is unchanged, because
   * there the short edge IS the width.
   */
  const unit = Math.min(card.width, card.height);

  /* The QR is bounded BOTH ways: 62% of the width, as it always was, and never
     more than half the height — which binds only in landscape, where the stack
     of code, caption and wordmark underneath has 63 mm to live in rather than
     88 mm. */
  const qr = Math.min(card.width * 0.62, card.height * 0.5);

  /* The front's corner square, from the same helper `main` checks against, so
     the drawn size and the checked size cannot drift apart. */
  const frontQr = frontQrSize(card);

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <title>Musie · ${escape(meta.title)}</title>
    <!-- The design system itself, in the README's order. The @font-face urls
         inside musy-fonts.css are relative to that file, so loading it from
         its own directory is what makes the real typefaces print. -->
    <link rel="stylesheet" href="${stylesheet('musy-fonts.css')}" />
    <link rel="stylesheet" href="${stylesheet('musy-foundations.css')}" />
    <link rel="stylesheet" href="${stylesheet('musy-foundations-amendments.css')}" />
    <style>
      /* Paper has one theme. Without this, light-dark() follows whatever the
         printing machine's OS prefers and a dark deck goes to the press. */
      :root { color-scheme: light; }

      ${layoutCss}

      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #fff; }
      .musie-page { break-after: page; overflow: hidden; }
      .musie-page:last-child { break-after: auto; }

      /* ── the card ──────────────────────────────────────────────────────
         A custom pattern, permitted because the design system has no printed
         card (10-layout.md L14) and prefixed musie- so it can never be taken
         for a system class (L14.2). Every colour is a semantic alias. */
      .musie-card {
        width: 100%; height: 100%;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 2mm; padding: 6mm; text-align: center;
        background: var(--surface-raised);
        color: var(--on-surface);
        /* The containing block for the front's corner QR, which is positioned
           against the CARD rather than laid out in the flow — it has to ignore
           this padding, because that padding is type's safe area and the QR
           carries its own, smaller one. */
        position: relative;
        /* Measured from the card's own edge, which on every face but one IS
           the trim line. The exception overrides this; see singlePages. */
        --musie-front-qr-inset: ${FRONT_QR_INSET}mm;
      }
      /* A grid, not space-between: the scan group should be optically centred
         in the space it has, and the name should sit on the foot of the card.
         space-between does neither — it hangs the group from the top edge and
         opens a hole under it. */
      .musie-card--back {
        display: grid; grid-template-rows: 1fr auto;
        justify-items: center; align-items: center;
        padding: 5mm;
      }

      .musie-card--art { padding: 0; gap: 0; overflow: hidden; }
      .musie-art { display: block; width: 100%; height: 100%; object-fit: cover; }

      /* ── the front's corner QR ─────────────────────────────────────────
         ON AN OPAQUE PANEL, and that is the one way it differs from the back's.

         The back's quiet zone is transparent so the card colour runs through it
         (see .musie-qr), which works because the back is flat sand and the
         contrast against the code's near-black is far past what a reader needs.
         A front is a photograph. Transparent light modules over an illustration
         is not a low-contrast QR, it is an unreadable one — and it would fail
         on exactly the card whose artwork happens to be dark, which is a thing
         nobody discovers until the deck is printed.

         So the panel puts a known light field behind a known dark code. The
         encoder's own two-module quiet zone is already inside the SVG; the
         padding here is optical, giving the square a little air so it reads as
         placed rather than dropped. */
      .musie-front-qr {
        position: absolute;
        left: var(--musie-front-qr-inset);
        bottom: var(--musie-front-qr-inset);
        width: ${frontQr.toFixed(2)}mm;
        padding: 0.8mm;
        background: var(--surface-raised);
        border-radius: var(--radius-xs);
      }
      .musie-front-qr svg { display: block; width: 100%; height: auto; }

      .musie-feeling {
        margin: 0;
        font-family: var(--font-display);
        font-weight: var(--font-weight-bold);
        font-size: ${(unit * 0.14).toFixed(2)}mm;
        line-height: 1.05;
        letter-spacing: -0.018em;
        /* German compounds — Dankbarkeit, Einsamkeit — at this size on a 63 mm
           card. hyphens follows the DECLARED language, which is why the page
           is lang="de" and the English line below says otherwise. */
        hyphens: auto;
        overflow-wrap: break-word;
        max-width: 100%;
      }
      .musie-feeling-alt {
        margin: 0;
        font-family: var(--font-text);
        font-weight: var(--font-weight-regular);
        font-size: ${(unit * 0.05).toFixed(2)}mm;
        letter-spacing: 0.04em;
        color: var(--on-surface-muted);
      }

      .musie-scan {
        display: flex; flex-direction: column; align-items: center; gap: 2.5mm;
        width: 100%;
      }
      .musie-qr { width: ${qr.toFixed(2)}mm; }
      .musie-qr svg { display: block; width: 100%; height: auto; }
      /* The QR's own quiet zone is drawn by the encoder (margin: 2 modules) and
         is TRANSPARENT, so the card colour runs through it — a white square on
         a sand card is a sticker, not a card. The quiet zone is still there and
         still does its work: a reader needs the contrast, which sand-1 against
         the code's near-black is far past, and it needs the clear space, which
         is what the two modules are. */

      .musie-code {
        margin: 0;
        font-family: var(--font-text);
        font-weight: var(--font-weight-medium);
        font-size: ${(unit * 0.045).toFixed(2)}mm;
        letter-spacing: 0.12em;
      }
      .musie-caption {
        margin: 0;
        font-family: var(--font-text);
        font-size: ${(unit * 0.035).toFixed(2)}mm;
        color: var(--on-surface-muted);
      }
      .musie-wordmark {
        margin: 0 0 1mm;
        font-family: var(--font-display);
        font-weight: var(--font-weight-medium);
        font-size: ${(unit * 0.04).toFixed(2)}mm;
        letter-spacing: 0.06em;
        color: var(--on-surface-muted);
      }
    </style>
  </head>
  <body data-theme="light">
${body}
    <script>
      /* THE ONLY SCRIPT ON A PRINTED PAGE, and it earns its place: the feeling
         is the card, and one size cannot serve both "Wut" and a compound twice
         its length. This sets each word as large as fits on ONE LINE, stepping
         down from the size above to a floor, so the deck stays typographically
         even without anybody tuning a card by hand.

         It runs on load, before the PDF is taken, and it is inline rather than
         done by the script that writes this file so that deck.html looks in a
         browser exactly like deck.pdf looks on paper.

         A Range's client rects are the LINE BOXES — the one measurement that
         says "this wrapped" without arithmetic on line-height.

         AFTER document.fonts.ready, and that is not belt and braces. Measured
         at parse time this fits the word to the FALLBACK face, the real one
         arrives a moment later at a different width, and the card goes to
         print wrapped — which is exactly what happened the first time. The
         flag is what the printing script waits for. */
      document.fonts.ready.then(() => {
        for (const word of document.querySelectorAll('.musie-feeling')) {
          const range = document.createRange();
          range.selectNodeContents(word);
          const lines = () => range.getClientRects().length;
          let size = parseFloat(getComputedStyle(word).fontSize);
          const floor = size * 0.55;
          /* Below the floor a word is small enough to look like a mistake, so
             it is allowed to hyphenate instead — which is why the page is
             lang="de" and --text-hyphens is what it is. */
          while (lines() > 1 && size > floor) {
            size -= 0.5;
            word.style.fontSize = size + 'px';
          }
        }
        window.deckFitted = true;
      });
    </script>
  </body>
</html>
`;
}

/* ── main ─────────────────────────────────────────────────────────────── */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = typeof args['base-url'] === 'string' ? args['base-url'] : DEFAULT_BASE_URL;
  const out = resolve(typeof args.out === 'string' ? args.out : 'deck-print');
  const card = parseSize(args.card, { width: 88, height: 63 });
  const bleed = args.bleed === undefined ? 3 : Number(args.bleed);
  const layout = args.layout === 'sheet' ? 'sheet' : 'single';

  if (!Number.isFinite(bleed) || bleed < 0) throw new Error('--bleed wants millimetres, from 0 up.');

  const wanted = args.locale === true || args.locale === undefined ? 'both' : String(args.locale);
  if (wanted !== 'both' && !LOCALES.includes(wanted)) {
    throw new Error(`--locale takes ${LOCALES.join(', ')} or both, not "${wanted}".`);
  }
  /* German first when both are printed: the deck is a German product, and the
     front's big word is the first locale in this list. */
  const locales = wanted === 'both' ? ['de', 'en'] : [wanted];

  const deck = assertDeck(await readDeck());
  let cards = ordered(deck);

  if (typeof args.codes === 'string') {
    const only = new Set(args.codes.split(',').map((code) => code.trim().toUpperCase()).filter(Boolean));
    const unknown = [...only].filter((code) => !cards.some((c) => c.code === code));
    if (unknown.length > 0) throw new Error(`This deck has no ${unknown.join(', ')}.`);
    cards = cards.filter((c) => only.has(c.code));
  }

  /* `margin` is the quiet zone, in modules — the same 2 the dev sheet and
     qr-codes.mjs use, so all three print the same code. */
  const qr = new Map();
  for (const c of cards) {
    qr.set(
      c.id,
      await QRCode.toString(scanLink(c.code, baseUrl), {
        type: 'svg',
        margin: 2,
        /* Transparent light modules — see .musie-qr. The dark modules stay the
           encoder's black rather than an ink token: a QR is read by a machine
           at whatever contrast the paper gives it, and that is not a place to
           spend the brand. */
        color: { light: '#0000' },
      }),
    );
  }

  /**
   * IS THE CORNER SQUARE STILL A MACHINE'S TARGET? Asked, not assumed.
   *
   * The two numbers that decide it move independently. The printed size is
   * fixed in millimetres by the card, and the module count grows with the URL
   * — and print day runs this command with a `--base-url` nobody has typed
   * yet (the domain is still open; BUILD-PLAN.md's blocker table). So a deck
   * that scans perfectly against `localhost:5173` can come back from the press
   * unscannable on the front, and the way that gets discovered is a tester
   * holding a card.
   *
   * The encoder's grid excludes the quiet zone; the SVG adds `margin: 2` each
   * side and the two share one physical box, so the four go into the divisor.
   */
  const frontQrMm = frontQrSize(card);
  let widest = 0;
  for (const c of cards) {
    widest = Math.max(widest, QRCode.create(scanLink(c.code, baseUrl), {}).modules.size + 4);
  }
  const moduleMm = frontQrMm / widest;
  if (moduleMm < MIN_MODULE_MM) {
    console.warn(
      `[musie] the front's corner QR prints at ${moduleMm.toFixed(2)} mm per module ` +
        `(${widest} modules across ${frontQrMm.toFixed(1)} mm), under the ${MIN_MODULE_MM} mm a ` +
        `phone needs to resolve one. The back's full-size code is unaffected. A shorter ` +
        `--base-url is the cheap fix; raising FRONT_QR_FRACTION is the other one.`,
    );
  }

  /**
   * WHICH CARDS HAVE A PICTURE, resolved against the file system rather than
   * trusted from the column.
   *
   * `cards.image_url` is a path, and a path in a database is a claim. The nine
   * currently claim `assets/web/method-card.png`, which has never existed on
   * disk — so believing the column would print nine broken images. Checking
   * means a card falls back to its word for exactly one reason: there is no
   * file there.
   */
  const artwork = new Map();
  const fromMaster = new Set();
  for (const c of cards) {
    const master = MASTER_EXT.map((ext) => join(MASTERS, `${c.id}${ext}`)).find((f) => existsSync(f));
    if (master !== undefined) {
      artwork.set(c.id, pathToFileURL(master).href);
      fromMaster.add(c.id);
      continue;
    }
    const web = c.image === null ? null : join(PUBLIC, c.image);
    artwork.set(c.id, web !== null && existsSync(web) ? pathToFileURL(web).href : null);
  }

  const drawn = cards.filter((c) => artwork.get(c.id) !== null);
  const claimed = cards.filter((c) => c.image !== null && artwork.get(c.id) === null);
  const webOnly = drawn.filter((c) => !fromMaster.has(c.id));
  if (webOnly.length > 0) {
    console.warn(
      `[musie] ${webOnly.length} card${webOnly.length === 1 ? '' : 's'} print from the WEB copy, which is sized ` +
        `for a screen: ${webOnly.map((c) => c.code).join(', ')}. Put the print master in artwork/cards/.`,
    );
  }
  if (claimed.length > 0) {
    console.warn(
      `[musie] ${claimed.length} card${claimed.length === 1 ? '' : 's'} name a picture that is not on disk, ` +
        `and print their feeling instead: ${claimed.map((c) => `${c.code} → ${c.image}`).join(', ')}`,
    );
  }

  const renderFront = (c) => front(c, locales, artwork.get(c.id), qr.get(c.id));
  const renderBack = (c) => back(c, locales, qr.get(c.id));

  const { css, html } =
    layout === 'sheet'
      ? sheetPages(cards, renderFront, renderBack, card)
      : singlePages(cards.flatMap((c) => [renderFront(c), renderBack(c)]), card, bleed);

  const page = document_(html, css, card, { title: `deck for ${baseUrl}` });

  await mkdir(out, { recursive: true });
  const htmlPath = join(out, 'deck.html');
  const pdfPath = join(out, 'deck.pdf');
  await writeFile(htmlPath, page, 'utf8');

  const { chromium } = await import('@playwright/test');
  let browser;
  try {
    browser = await chromium.launch();
  } catch {
    throw new Error(
      'Chromium is not installed for Playwright. Run `pnpm --filter web exec playwright install chromium`, ' +
        `then this again. ${htmlPath} is already written — a browser can print it by hand meanwhile.`,
    );
  }

  try {
    const tab = await browser.newPage();
    await tab.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
    /* Waiting on the page's own fit pass, which waits on the webfonts — so this
       covers both: without it the first page can print in a fallback face,
       because @font-face is fetched lazily and `load` does not wait for it.

       Expressions rather than functions, because these run in the PAGE and
       everything else in this file runs in node — where `document` and
       `window` are neither defined nor lintable (eslint.config.js hands
       scripts/ node's globals and nothing else, on purpose). */
    await tab.evaluate('document.fonts.ready');
    await tab.waitForFunction('window.deckFitted === true');
    await tab.pdf({ path: pdfPath, printBackground: true, preferCSSPageSize: true });
  } finally {
    await browser.close();
  }

  const faces = layout === 'sheet' ? 'sheets' : 'pages';
  console.log(
    `${cards.length} cards · ${drawn.length} with artwork, ${cards.length - drawn.length} set in type · ` +
      `${locales.join(' + ')} · ${layout} ${faces} · ${card.width}×${card.height}mm` +
      `${layout === 'single' ? ` + ${bleed}mm bleed` : ''}\n` +
      `QR codes point at ${baseUrl}\n\n  ${pdfPath}\n  ${htmlPath}`,
  );
}

main().catch((thrown) => {
  console.error(`[musie] ${thrown instanceof Error ? thrown.message : String(thrown)}`);
  process.exitCode = 1;
});
