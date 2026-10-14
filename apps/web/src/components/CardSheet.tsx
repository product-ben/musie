/**
 * The cards, full screen — the walk both digital second steps open.
 *
 * ── ONE SHEET, TWO STEPS, AND THAT IS WHY IT IS A FILE ────────────────────
 * `view` shows the one card that was dealt; `select` shows the five you are
 * about to choose between. The same surface, the same gestures, the same
 * labels — only the pages differ, and the difference is a count.
 *
 * It was mounted by `Session.tsx` until 2026-10-14, which is how the sheet
 * came to need a derived `sheetStep` constant answering "which step do I
 * belong to". Two steps asking for it by name is the answer that constant was
 * standing in for.
 *
 * ── THE LEAD PAGE IS A COUNT, NOT A FLAG ──────────────────────────────────
 * More than one card gets an instruction page in front of them: turn the phone
 * to landscape, look at each and breathe. One card gets no such page, because
 * there is nothing to pace and the step itself has already said what to do.
 * So `cards.length` decides it, like everything else about the shape of this
 * feature.
 *
 * ── WHAT IT DOES NOT OWN ──────────────────────────────────────────────────
 * Whether it is open. That is `?focus` in the address, read and written by the
 * STEP — `view` offers it behind a control on the picture, `select` opens it on
 * arrival. A sheet that owned its own open state could not be either.
 */
import * as React from 'react';
import { CtaButton, Sheet } from '@musie/design-system';
import type { LightboxOrigin, SheetPage } from '@musie/design-system';
import { Image } from '@musie/design-system';
import { useT } from '../i18n/localeContext';
import { fromRoot } from '../lib/assets';
import type { Card } from '../lib/content';

export interface CardSheetProps {
  /** The hand, in deck order. One card or five. */
  cards: readonly Card[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The rect it grows out of, measured at the press that opened it. */
  origin: LightboxOrigin | null;
  /**
   * The way on, pressed on the last page. The step decides what that means:
   * `select` collapses the sheet onto its grid, `view` simply closes.
   */
  onDone: () => void;
}

export function CardSheet({ cards, open, onOpenChange, origin, onDone }: CardSheetProps) {
  const t = useT();
  const [index, setIndex] = React.useState(0);

  /* THE WALK STARTS AT THE TOP EVERY TIME IT OPENS. Without this, closing on
     the fifth card and opening again lands on the fifth card — which is right
     for a document and wrong for a sequence you are meant to move through. */
  React.useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const walked = cards.length > 1;
  const pages: SheetPage[] = [
    ...(walked
      ? [{
        id: 'lead',
        content: (
          <div className="musie-cards__lead">
            <p>{t('session.cards.lead')}</p>
          </div>
        ),
      } satisfies SheetPage]
      : []),
    ...cards.map((one) => ({
      id: one.id,
      /* Full-bleed artwork, so the sheet paints its dark field and the
         position row takes its white tone. */
      media: true,
      content: (
        <div className="musie-cards__media">
          <Image
            className="musie-cards__art"
            src={fromRoot(one.imageUrl ?? '')}
            alt={one.imageAlt ?? t('session.cards.fallbackAlt', { code: one.code })}
            width={1200}
            height={849}
            decoding="async"
          />
        </div>
      ),
    } satisfies SheetPage)),
  ];

  const last = pages.length - 1;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('session.cards.title')}
      closeLabel={t('session.cards.close')}
      origin={origin}
      index={index}
      onIndexChange={setIndex}
      dotLabel={(position, total) => t('session.cards.dot', {
        position: String(position), total: String(total),
      })}
      nextLabel={t('session.cards.next')}
      previousLabel={t('session.cards.previous')}
      pages={pages}
      /* THE FOOT, PER PAGE — a way in on the instruction, nothing in the
         middle while the chevrons carry the walk, and a way on at the end.
         The sheet does not decide this: what a flow offers besides moving
         between pages is the flow's own business. */
      foot={(() => {
        if (walked && index === 0) {
          return (
            <CtaButton onClick={() => setIndex(1)}>
              {t('session.cards.first')}
            </CtaButton>
          );
        }
        if (index === last) {
          return <CtaButton onClick={onDone}>{t('common.continue')}</CtaButton>;
        }
        return undefined;
      })()}
    />
  );
}
