/**
 * The deck's QR codes, as files — E.0's generator.
 *
 * ── A SCRIPT, NOT NINE PASTED FILES ───────────────────────────────────────
 * The codes are a PRINT ARTEFACT: they go onto card stock, and once they do
 * they cannot be edited. Nine SVGs committed to the repository would be nine
 * files nobody can regenerate and nobody can check — the one thing that must
 * be reproducible is the thing that gets printed. So the generator is
 * committed and its output is not.
 *
 * ── IT TAKES THE ORIGIN; IT DOES NOT KNOW ONE ─────────────────────────────
 * There is no domain yet (Ben, 2026-09-21), and this script does not need one
 * to be useful. `--base-url` defaults to the dev server, which makes the files
 * it writes scannable against `pnpm --filter web dev` today — and the same
 * command with the real address is what print day runs. Nothing here has to
 * change on the day the domain exists; one flag does.
 *
 * The app's own dev sheet at /dev/qr is the same codes for the same purpose,
 * generated from `window.location.origin` instead, which is what makes IT
 * work on a LAN address without being told one. Two front ends, one decoder
 * (`src/lib/scanCode.ts`), and the round trip between them is unit-tested.
 *
 * ── THE CODES COME FROM THE MIGRATIONS ────────────────────────────────────
 * `cards.code` is the printed code, and the migrations are the only record of
 * it that does not need a database running. Reading them rather than holding a
 * list of nine strings means a tenth card cannot be missed — and the script
 * refuses to guess if it finds none, rather than printing a deck somebody
 * invented at the command line.
 *
 * USAGE
 *   node scripts/qr-codes.mjs
 *   node scripts/qr-codes.mjs --base-url https://musie.example --out ./print
 *   node scripts/qr-codes.mjs --codes MC-01,MC-02
 *
 * It writes one SVG per code plus `sheet.html`, which lays them out for a
 * printer and carries the base URL it was generated for on the page — so a
 * sheet found on a desk in three months says what it points at.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, '..', '..', '..', 'supabase', 'migrations');

/** Kept in step with `src/lib/scanCode.ts` by the round-trip test there. */
const CARD_CODE = /^MC-\d{2}$/;
const CARD_CODE_ANYWHERE = /'(MC-\d{2})'/g;

/** The dev server, so the default output is scannable without an argument. */
const DEFAULT_BASE_URL = 'http://localhost:5173';

/** `--flag value` pairs. No dependency, and nothing here needs more. */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    args[arg.slice(2)] = argv[i + 1] ?? '';
    i += 1;
  }
  return args;
}

/**
 * Every card code the migrations insert, in order, without duplicates.
 *
 * Deliberately naive — it matches quoted `MC-NN` anywhere in any migration
 * rather than parsing SQL. A card code appears in exactly two kinds of place,
 * a `cards` insert and a comment about one, and both are the deck. The moment
 * that stops being true, `--codes` is the escape hatch.
 */
async function codesFromMigrations() {
  const files = (await readdir(MIGRATIONS)).filter((name) => name.endsWith('.sql')).sort();
  const found = new Set();
  for (const file of files) {
    const sql = await readFile(join(MIGRATIONS, file), 'utf8');
    for (const match of sql.matchAll(CARD_CODE_ANYWHERE)) found.add(match[1]);
  }
  return [...found].sort();
}

/**
 * The URL a card's QR code carries.
 *
 * A COPY OF `scanLink`, and that is a decision rather than an oversight: this
 * script is plain ESM run by `node` with no build step, and `src/lib/
 * scanCode.ts` is TypeScript. Importing it would mean a loader, a build, or a
 * second toolchain for one line of string concatenation. What keeps the two
 * honest is the test: `scanCode.test.ts` asserts the exact strings this
 * produces, for the same inputs, and `decodeScan` reads them back.
 */
function scanLink(code, baseUrl) {
  const upper = code.trim().toUpperCase();
  if (!CARD_CODE.test(upper)) {
    throw new Error(`"${code}" is not a card code, so it cannot be printed as one`);
  }
  return `${baseUrl.trim().replace(/\/+$/, '')}/s/${upper}`;
}

function sheet(tiles, baseUrl) {
  /* Print CSS only, and no tokens: this file is opened by a printer driver,
     not by the app, so it has no stylesheet to inherit and nothing here is
     part of the design system. */
  const cards = tiles
    .map(
      (tile) => `    <figure>
${tile.svg
  .trim()
  .split('\n')
  .map((line) => `      ${line}`)
  .join('\n')}
      <figcaption>${tile.code}</figcaption>
    </figure>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Musie · card codes for ${baseUrl}</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 2cm; }
      p { color: #555; }
      .sheet { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1cm; }
      figure { margin: 0; text-align: center; }
      svg { width: 100%; height: auto; }
      figcaption { margin-top: 0.3cm; font-size: 12pt; letter-spacing: 0.05em; }
      @media print { p { display: none; } body { margin: 1cm; } }
    </style>
  </head>
  <body>
    <p>Generated for <strong>${baseUrl}</strong>. Every code below opens that server at its card.</p>
    <div class="sheet">
${cards}
    </div>
  </body>
</html>
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = args['base-url'] || DEFAULT_BASE_URL;
  const out = args.out || join(process.cwd(), 'qr-codes');

  const codes = args.codes
    ? args.codes.split(',').map((code) => code.trim()).filter(Boolean)
    : await codesFromMigrations();

  if (codes.length === 0) {
    throw new Error(
      `No card codes found in ${MIGRATIONS}. Pass them explicitly: --codes MC-01,MC-02`,
    );
  }

  await mkdir(out, { recursive: true });

  const tiles = [];
  for (const code of codes) {
    const url = scanLink(code, baseUrl);
    /* `margin` is the quiet zone, in modules. A QR code printed with no border
       around it is one a reader refuses, and on paper there is no CSS to add
       it afterwards. */
    const svg = await QRCode.toString(url, { type: 'svg', margin: 2 });
    await writeFile(join(out, `${code}.svg`), svg, 'utf8');
    tiles.push({ code, url, svg });
    console.log(`${code}  ->  ${url}`);
  }

  await writeFile(join(out, 'sheet.html'), sheet(tiles, baseUrl), 'utf8');
  console.log(`\n${tiles.length} codes and sheet.html written to ${out}`);
}

main().catch((thrown) => {
  console.error(`[musie] ${thrown instanceof Error ? thrown.message : String(thrown)}`);
  process.exitCode = 1;
});
