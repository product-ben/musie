/**
 * Step 2 · Scan — draw a card, and find out what it plays.
 *
 * ── THE READER IS SIMULATED, AND SAYS SO ON SCREEN ─────────────────────────
 * No camera, no code entry: both are Phase E, in that order — E.1 is a field
 * that takes `MC-01`, E.2 the camera, E.3 a wasm fallback for Safari. The
 * `Message variant="info"` carries the simulate control as its single `action`,
 * which is the clickdummy handoff's own mapping for this block, and it
 * disappears with the simulation rather than being restyled around it.
 *
 * MOCKUPS.md 4 is the entry that covers this, and the standard it sets is why
 * the message exists at all: a control that does not do what it appears to do
 * says so, rather than pretending.
 *
 * ── ONE PANEL, TWO STATES ──────────────────────────────────────────────────
 * The reader, and the card that was drawn. They are the same step rather than
 * two, because the second is what you come back to if you change your mind —
 * *Scan a different card* returns to the first without leaving the step or
 * losing the session.
 *
 * ── A SCAN WRITES TWO FACTS AT ONCE ────────────────────────────────────────
 * `card_id` and `track_id`, in one update. What you drew and what it plays are
 * different things, but they are decided by one act, and writing them apart
 * would allow a row holding a card and no recording because the second request
 * failed. `saveCard` is where that is enforced.
 */
import { ContentList, CtaButton, Message } from '@musie/design-system';
import type { ContentListItem } from '@musie/design-system';
import { ScanLine } from 'lucide-react';
import { Icon } from '@musie/design-system';
import { StepText } from './StepText';
import { useT } from '../i18n/localeContext';
import type { Card, Exercise } from '../lib/content';

export interface SessionScanProps {
  exercise: Exercise;
  /** The card already drawn in this session, or null. */
  card: Card | null;
  /** Busy while the pick is being written. */
  scanning: boolean;
  onSimulate: () => void;
}

/**
 * THE BODY ONLY — the action row is `WizardPanel`'s, filled by `Session.tsx`.
 * *Scan a different card* is there too, beside Back and Continue, because it is
 * one of the step's three ways on rather than something that belongs inside
 * the reader.
 */
export function SessionScan({
  exercise, card, scanning, onSimulate,
}: SessionScanProps) {
  const t = useT();

  const facts: ContentListItem[] = card === null ? [] : [
    { label: t('session.scan.yourCard'), content: `${card.code} · ${card.feeling}` },
  ];

  return (
    <>
      {/* The exercise's own card-picking advice. THIS IS THE ONE STEP WHOSE
          copy actually exists — `scan_text` is the old `guideline`, carried
          through C.0's rename rather than dropped, so Quick Mindfulness Break
          really does say "work with the card you are drawn to". No fallback:
          the two exercises that lack it draw no cards, so they never reach
          this step at all. */}
      <StepText lines={exercise.scanText} />

      {card === null ? (
        <div className="musie-stack">
          <div className="musie-scanner">
            <Icon glyph={ScanLine} size="xl" />
            <p className="musie-scanner__text">{t('session.scan.reader')}</p>
          </div>

          <Message
            variant="info"
            /* 'off': this is present on load rather than injected after it, and
               role="alert" on load trains people to ignore alerts. L11. */
            live="off"
            headingLevel={3}
            headline={t('session.scan.simulateTitle')}
            text={t('session.scan.simulateText')}
            action={
              <CtaButton
                variant="secondary"
                loading={scanning}
                loadingLabel={t('content.loading')}
                onClick={onSimulate}
              >
                {t('session.scan.simulate')}
              </CtaButton>
            }
          />
        </div>
      ) : (
        <ContentList
          label={t('session.scan.done')}
          items={facts}
          emptyLabel={t('content.empty')}
        />
      )}

    </>
  );
}
