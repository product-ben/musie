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
 * ── THE PHASE IS IN THE ADDRESS, AND THIS STEP DOES NOT WRITE IT ──────────
 * `?focus`, the same token and the same reason as the listen step's own
 * full-screen view: a reload keeps the phase you were in, the browser's Back
 * closes the sheet onto the grid, and a tester can be sent to either.
 *
 * THE NAVIGATION THAT ENTERS THIS STEP NAMES THE PHASE — `Session.tsx`'s `go`,
 * which carries `?focus` when nothing is chosen yet. Three versions of an
 * effect in this file tried to write it on arrival instead, and all three were
 * wrong in ways only the walk found; `go`'s docblock lists them. What is left
 * here is a screen that reads `sheetOpen` and draws, which is what a screen
 * should be.
 */
import * as React from 'react';
import { Message, RadioImage } from '@musie/design-system';
import type { LightboxOrigin } from '@musie/design-system';
import { CardSheet } from './CardSheet';
import { Markdown } from './Markdown';
import { useT } from '../i18n/localeContext';
import { contentImageUrl } from '../lib/assets';
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
  /** The rect the sheet grows out of when the step's own button opened it. */
  sheetOrigin: LightboxOrigin | null;
}

export function SessionSelect({
  hand, card, choosing, error, onPick, sheetOpen, onSheetOpenChange, sheetOrigin,
}: SessionSelectProps) {
  const t = useT();

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
          image: contentImageUrl(one.imageUrl ?? ''),
          imageAlt: alt(one),
        }))}
      />

      <CardSheet
        cards={hand}
        open={sheetOpen}
        onOpenChange={onSheetOpenChange}
        origin={sheetOrigin}
        /* THE WALK COLLAPSES ONTO THE GRID. `Weiter` on the last card closes
           the sheet and leaves the step exactly where it was — the choice is
           the next thing, in the step, which is what Ben asked for. */
        onDone={() => onSheetOpenChange(false)}
      />
    </>
  );
}
