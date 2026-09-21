/**
 * `/dev/qr` — the deck's QR codes, on screen, for pointing a camera at. E.0.
 *
 * ── WHY A SCREEN AND NOT A PILE OF FILES ──────────────────────────────────
 * E.2 (the in-app camera) and E.3 (the Safari fallback) cannot be built or
 * hand-tested without something to scan, and the deck is not printed. This is
 * that something. `scripts/qr-codes.mjs` is the same codes as files, for the
 * day there is a printer involved.
 *
 * ── IT IS SELF-HOSTING, WHICH IS THE WHOLE TRICK ──────────────────────────
 * Every code is generated from `window.location.origin` — the address this
 * page was actually served from. Open it on the laptop at
 * `http://192.168.0.24:5173/dev/qr`, scan a tile with the phone on the same
 * network, and the phone opens `http://192.168.0.24:5173/s/MC-01`, which is a
 * running Musie. No domain, no tunnel, no configuration, and nothing to keep
 * in step: the sheet cannot generate a code for a server it is not being
 * served by.
 *
 * ── LAZILY ROUTED, AND THAT IS NOT DECORATION ─────────────────────────────
 * This module is the only importer of `qrcode` in the app. The route table
 * imports it with `lazy`, so the library lands in its own chunk and a visitor
 * who never types /dev/qr downloads none of it. Keep it that way: an ordinary
 * import here would put a QR encoder in everybody's first paint.
 *
 * ── THE CODES COME FROM THE DATABASE ──────────────────────────────────────
 * `cards.code` is the printed code, so the sheet reads the deck rather than
 * holding a list of nine strings that a tenth card would silently invalidate.
 */
import QRCode from 'qrcode';
import { useLocale, useT } from '../i18n/localeContext';
import { getCards } from '../lib/content';
import { scanLink } from '../lib/scanCode';
import { useAsync } from '../lib/useAsync';

interface Tile {
  code: string;
  url: string;
  /** The rendered `<svg>`, as markup. */
  svg: string;
}

export function DevQrSheet() {
  const t = useT();
  const { locale } = useLocale();

  /* The origin is read ONCE per render pass and passed in, rather than reached
     for inside `scanLink` — that function is pure and is called from a Node
     script where there is no window. */
  const origin = window.location.origin;

  const { data, loading, error } = useAsync<Tile[]>(async () => {
    const cards = await getCards(locale);
    return Promise.all(
      cards.map(async (card) => {
        const url = scanLink(card.code, origin);
        return {
          code: card.code,
          url,
          /* SVG rather than a canvas or a PNG: it stays sharp at whatever size
             the tile ends up, which is what a camera pointed at a laptop
             screen needs. `margin` is the QUIET ZONE, in modules — a QR code
             with no border around it is one a reader will refuse, and it is
             specified here rather than added as padding in CSS because the
             quiet zone belongs to the code and not to the layout. */
          svg: await QRCode.toString(url, { type: 'svg', margin: 2 }),
        };
      }),
    );
  }, `dev-qr:${locale}:${origin}`);

  return (
    <>
      <h1 className="musie-placeholder">{t('scan.dev.title')}</h1>
      <p className="musie-note">{t('scan.dev.text', { origin })}</p>

      {loading && <p className="musie-note">{t('content.loading')}</p>}
      {error !== null && <p className="musie-note">{t('content.errorDetail')}</p>}
      {data !== null && data.length === 0 && <p className="musie-note">{t('content.empty')}</p>}

      {data !== null && data.length > 0 && (
        <ul className="musie-qr-sheet">
          {data.map((tile) => (
            <li key={tile.code} className="musie-qr">
              {/*
                THE MARKUP IS OURS, not anybody's input: it comes from a QR
                encoder given a URL this app built out of its own origin and a
                code from its own database. There is no user-supplied string
                anywhere on the path.

                `role="img"` with a label, because the <svg> the encoder emits
                carries no title of its own — without it a screen reader meets
                an unnamed graphic, and this page is as much a tool as any
                other.
              */}
              <div
                className="musie-qr__code"
                role="img"
                aria-label={t('scan.dev.qrLabel', { code: tile.code })}
                dangerouslySetInnerHTML={{ __html: tile.svg }}
              />
              {/* The code and the link are DATA — a card's printed code and the
                  URL it carries — so neither goes through the catalogue. */}
              <p className="musie-qr__code-label">{tile.code}</p>
              <p className="musie-qr__url">{tile.url}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
