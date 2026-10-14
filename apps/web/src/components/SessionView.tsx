/**
 * Step 2a · Ansehen — the card you were dealt, before you listen to it.
 *
 * ── THE STEP WHERE NOTHING IS CHOSEN ──────────────────────────────────────
 * Ben, 2026-10-14: *"das ist die Variante, wenn man sich nichts entscheiden
 * muss und vor dem Hören einfach nur ein Visual oder eine Information bekommt,
 * die man sich ansehen soll."* Freie Bahn's whole instruction on paper is
 * *ziehe eine zufällige Karte* — you do not pick it, and the exercise is about
 * letting what you were given work on you. So this step asks a question about
 * the picture and gets out of the way.
 *
 * It was a shape inside `scan` until today, reached by a label override and two
 * derivations. It is a step now, with its own route and its own row in
 * `sessions.step`.
 *
 * ── THE STEP DRAWS THE CARD, AND THAT IS THE PART THAT MOVED ──────────────
 * Ben, same message: *"Der Step sollte die Karte ziehen, der Button im
 * /intro?digitalcards Schritt hat nur das Label bekommen aber macht nichts
 * weiter, als den User weiterbringen."*
 *
 * So Einsteigen's forward action is a plain navigation with a descriptive
 * label, and the write — `card_id` and `track_id`, one update — happens on
 * ARRIVAL here. `onDraw` is called once, from an effect, when the row has no
 * card yet; the parent owns the write because the parent owns every other
 * write in this session.
 *
 * WHY AN EFFECT AND NOT A LOADER: the card has to exist before this screen
 * means anything, and a route loader would put the draw before the step rather
 * than in it — which is where it was, and what Ben moved. The screen draws
 * itself; `busy` is what it shows while it does.
 *
 * ── BACK DOES NOT RE-DRAW ─────────────────────────────────────────────────
 * The row has a card, so the effect does nothing and the same card is shown.
 * Re-drawing on every arrival would make Back a shuffle — the mistake
 * `clearScan` is written up for on the scan step, where drawing again had to
 * become a deliberate act rather than a side effect of navigation.
 */
import * as React from 'react';
import { Image, Message } from '@musie/design-system';
import type { LightboxOrigin } from '@musie/design-system';
import { CardSheet } from './CardSheet';
import { Markdown } from './Markdown';
import { useT } from '../i18n/localeContext';
import { contentImageUrl } from '../lib/assets';
import type { Block } from '../lib/markdown';
import type { Card } from '../lib/content';

export interface SessionViewProps {
  /** The card this session was dealt, or null until the effect below writes. */
  card: Card | null;
  /** The hand — one card, derived from the session id. */
  hand: readonly Card[];
  /** Busy while the draw is in flight. */
  drawing: boolean;
  /** Why the draw did not land, already translated — or null. */
  error: string | null;
  /** Write the one card. Called once, on arrival, when there is none. */
  onDraw: () => void;
  /** Whether the full-screen sheet is up — `?focus`, owned by the route. */
  sheetOpen: boolean;
  onSheetOpenChange: (open: boolean) => void;
}

export function SessionView({
  card, hand, drawing, error, onDraw, sheetOpen, onSheetOpenChange,
}: SessionViewProps) {
  const t = useT();
  const origin = React.useRef<LightboxOrigin | null>(null);

  /* ONCE, AND ONLY WHILE THERE IS NOTHING. `drawing` is in the test rather
     than only in the dependency list: an effect that re-fires while its own
     request is in flight writes the card twice. */
  const asked = React.useRef(false);
  React.useEffect(() => {
    if (card !== null || drawing || asked.current) return;
    asked.current = true;
    onDraw();
  }, [card, drawing, onDraw]);

  return (
    <>
      {/* The step's two lines, both chrome: the exercise's own `scan_md`
          heading is *Wähle eine Karte aus*, which belongs to the exercise that
          actually chooses. Passed through `arrange` rather than as a markdown
          string so a `*` in the copy cannot arrive as emphasis. */}
      <Markdown
        md=""
        arrange={(): Block[] => [
          { kind: 'heading', level: 2, spans: [{ text: t('session.view.headline') }] },
          { kind: 'paragraph', spans: [{ text: t('session.view.lead') }] },
        ]}
      />

      {error !== null && <Message variant="error" headline={error} live="assertive" />}

      {card !== null && (
        <figure className="musie-cardshow">
          <Image
            className="musie-cardshow__art"
            src={contentImageUrl(card.imageUrl ?? '')}
            alt={card.imageAlt ?? t('session.cards.fallbackAlt', { code: card.code })}
            width={1200}
            height={849}
            /* The way to see it properly is ON the picture rather than a third
               button in the action row, which is where it was. */
            expand={{
              label: t('session.view.expand'),
              onClick: (event) => {
                origin.current = event.currentTarget.getBoundingClientRect();
                onSheetOpenChange(true);
              },
            }}
            decoding="async"
          />
        </figure>
      )}

      {hand.length > 0 && (
        <CardSheet
          cards={hand}
          open={sheetOpen}
          onOpenChange={onSheetOpenChange}
          origin={origin.current}
          /* Closing is all the way on means here: the step's own row carries
             *Weiter*, and the sheet is a look rather than a phase. */
          onDone={() => onSheetOpenChange(false)}
        />
      )}
    </>
  );
}
