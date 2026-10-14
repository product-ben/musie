/**
 * Step 2b · Auswählen — five cards, looked at and then chosen between.
 *
 * ── TWO PHASES, ONE STEP ──────────────────────────────────────────────────
 * Ben, 2026-10-14: *"Hier sollte sich erst das Sheet öffnen und dann, wenn der
 * gesamte Content gesehen wurde, sollte das Sheet collapsen und die Auswahl
 * der Karte im Step stattfinden."*
 *
 *     arrive → the sheet, five cards one at a time → Weiter on the last
 *            → the grid, in the step
 *
 * The sheet is not a step and not an overlay somebody has to find: it is how
 * this step opens. **The rail is four markers long either way** — it was Ben's
 * answer to the question of whether it should grow, and it is what makes the
 * sheet a phase rather than a sixth marker.
 *
 * ── THE PHASE IS IN THE ADDRESS, WRITTEN ON ARRIVAL BY REPLACE ────────────
 * `?focus`, the same mechanism and the same reason as the listen step's
 * `?overview` since 2026-10-07: a reload keeps the phase you were in, the
 * browser's own Back closes the sheet onto the grid, and a tester can be sent
 * to either. REPLACE rather than push, so opening the step does not put an
 * entry between the person and Einsteigen.
 *
 * AND ONLY WHILE NOTHING IS CHOSEN. Coming back from Hören finds a card on the
 * row and lands on the grid, with the chosen picture marked — re-opening the
 * walk there would be the product insisting you look again at five cards you
 * have already decided between.
 */
import * as React from 'react';
import { Message, RadioImage } from '@musie/design-system';
import type { LightboxOrigin } from '@musie/design-system';
import { CardSheet } from './CardSheet';
import { Markdown } from './Markdown';
import { useT } from '../i18n/localeContext';
import { fromRoot } from '../lib/assets';
import type { Block } from '../lib/markdown';
import type { Card } from '../lib/content';

export interface SessionSelectProps {
  /** The hand this session was dealt, in deck order. */
  hand: readonly Card[];
  /** The card already chosen, for somebody who walked back into this step. */
  card: Card | null;
  /** Busy while a choice is being written. */
  choosing: boolean;
  /** Why the last choice did not land, already translated — or null. */
  error: string | null;
  /** Take this card: writes both columns and moves the step on. */
  onPick: (card: Card) => void;
  /** Whether the sheet is up — `?focus`, owned by the route. */
  sheetOpen: boolean;
  onSheetOpenChange: (open: boolean, options?: { replace?: boolean }) => void;
}

export function SessionSelect({
  hand, card, choosing, error, onPick, sheetOpen, onSheetOpenChange,
}: SessionSelectProps) {
  const t = useT();
  const origin = React.useRef<LightboxOrigin | null>(null);

  /* ── THE SHEET OPENS ITSELF, ONCE, BY REPLACE ───────────────────────────
     Guarded three ways and each guard is a real case: a card already chosen
     means this is a return visit; `sheetOpen` already true means a reload has
     restored the phase and re-writing it would mint a history entry; and the
     ref means a close must not be undone by the effect that opens it. */
  const opened = React.useRef(false);
  React.useEffect(() => {
    if (card !== null || sheetOpen || opened.current) return;
    opened.current = true;
    onSheetOpenChange(true, { replace: true });
  }, [card, sheetOpen, onSheetOpenChange]);

  const alt = (one: Card) =>
    one.imageAlt ?? t('session.cards.fallbackAlt', { code: one.code });

  return (
    <>
      {/* The exercise's own headline, and one sentence under it. The sentence
          is chrome: it is the exercise's first instruction with the half about
          paper removed, and what it leaves out is exactly the part that only
          applies to a deck. */}
      <Markdown
        md=""
        arrange={(): Block[] => [
          { kind: 'heading', level: 2, spans: [{ text: t('session.select.headline') }] },
          { kind: 'paragraph', spans: [{ text: t('session.select.lead') }] },
        ]}
      />

      {error !== null && <Message variant="error" headline={error} live="assertive" />}

      {/* ── THE GRID ─────────────────────────────────────────────────────
          `legendHidden`, because the headline above IS the question and
          printing it twice is a caption on a caption. It stays the group's
          accessible name.

          `onCommit` AND NOT `onValueChange`: the arrow keys move selection
          through a radio group as a way of READING it, and committing on that
          would carry a keyboard user off the screen mid-look. */}
      <RadioImage
        name="session-card"
        legend={t('session.select.gridLabel')}
        legendHidden
        value={card?.id}
        onCommit={(chosen) => {
          const one = hand.find((candidate) => candidate.id === chosen);
          if (one !== undefined) onPick(one);
        }}
        disabled={choosing}
        options={hand.map((one) => ({
          value: one.id,
          image: fromRoot(one.imageUrl ?? ''),
          imageAlt: alt(one),
        }))}
      />

      <CardSheet
        cards={hand}
        open={sheetOpen}
        onOpenChange={onSheetOpenChange}
        origin={origin.current}
        /* THE WALK COLLAPSES ONTO THE GRID. `Weiter` on the last card closes
           the sheet and leaves the step exactly where it was — the choice is
           the next thing, in the step, which is what Ben asked for. */
        onDone={() => onSheetOpenChange(false)}
      />
    </>
  );
}
