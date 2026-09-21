/**
 * Step 2 · Scan — draw a card, and find out what it plays.
 *
 * ── THE SIMULATED SCAN IS GONE. TWO REAL WAYS IN REPLACE IT ────────────────
 * E.0 and E.1. *Simulate a scan* picked one of the nine cards at random and
 * said so on screen; nothing here picks a card any more, because two ways of
 * naming the card you are actually holding now work:
 *
 *   1. THE QR CODE ON THE CARD, read by the PHONE'S OWN camera app. It carries
 *      `<origin>/s/MC-01`, so it opens Musie at that card without Musie ever
 *      touching a camera — and that is the common way in for somebody holding
 *      a printed card. `routes/ScanLink.tsx` is where it lands.
 *   2. THE CODE PRINTED BESIDE IT, typed into the field below.
 *
 * Both converge on `scanCardInto` (lib/scan.ts) and therefore on
 * `getCardByCode`, so a deep link and a typed code perform one act rather than
 * two implementations of it. E.2's in-app camera will be the third caller of
 * the same function, which is what that split is for.
 *
 * ── THE FRAME STAYS, AND IT STOPPED PRETENDING ─────────────────────────────
 * The dashed viewport is where E.2's camera goes, so it survives as the step's
 * anchor — but its copy no longer says "hold the QR code inside the frame" at
 * a frame that cannot see anything. It says what works today and, in a second
 * line, what does not yet. MOCKUPS.md 4's standard, unchanged: a surface that
 * does not do what it appears to do says so rather than pretending.
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
 * failed. `saveCard` is where that is enforced, and `scanCardInto` is the only
 * thing that calls it on this path.
 */
import * as React from 'react';
import { ContentList, CtaButton, Field } from '@musie/design-system';
import type { ContentListItem } from '@musie/design-system';
import { ScanLine } from 'lucide-react';
import { Icon } from '@musie/design-system';
import { StepText } from './StepText';
import { useT } from '../i18n/localeContext';
import type { Card, Exercise } from '../lib/content';
import { takeHeldCode } from '../lib/scan';

export interface SessionScanProps {
  exercise: Exercise;
  /** The card already drawn in this session, or null. */
  card: Card | null;
  /** Busy while the code is being looked up and written. */
  scanning: boolean;
  /**
   * Why the last code did not land, already translated — or null.
   *
   * A STRING RATHER THAN A CATALOGUE KEY, because one of the three answers
   * carries the code that was typed, and interpolating a catalogue entry is
   * the screen's job rather than the field's. `Session.tsx` holds the outcome
   * and the catalogue; this holds the field.
   */
  codeError: string | null;
  onSubmitCode: (code: string) => void;
}

/**
 * THE BODY ONLY — the action row is `WizardPanel`'s, filled by `Session.tsx`.
 * *Scan a different card* is there too, beside Back and Continue, because it is
 * one of the step's three ways on rather than something that belongs inside
 * the reader.
 */
export function SessionScan({
  exercise, card, scanning, codeError, onSubmitCode,
}: SessionScanProps) {
  const t = useT();

  /**
   * A CODE SCANNED BEFORE THERE WAS A SESSION — PRE-FILLED, NOT WRITTEN.
   *
   * Taken once, on mount, and this component mounts when the scan step is on
   * screen — so a held code is consumed by the step that can use it rather
   * than by the session screen arriving at `intro` and throwing it away. It
   * fills the field; it does not press the button. `lib/scan.ts` says why that
   * distinction is the whole point.
   */
  const [held] = React.useState(() => takeHeldCode());
  const [code, setCode] = React.useState(held ?? '');

  /**
   * WHICH VALUE THE ERROR BELONGS TO.
   *
   * Without it, the message earned by `MC-99` sits under the field while
   * somebody types `MC-01`, contradicting what is on screen. Comparing rather
   * than clearing on change keeps one direction of truth: the error shows for
   * exactly the string that earned it, and disappears the moment that string
   * does.
   */
  const [errored, setErrored] = React.useState<string | null>(null);

  const facts: ContentListItem[] = card === null ? [] : [
    { label: t('session.scan.yourCard'), content: `${card.code} · ${card.feeling}` },
  ];

  function submit(event: React.FormEvent) {
    /* A REAL <form>, so Enter submits. A five-character code typed on a phone
       keyboard is finished with the go key, not by reaching for a button. */
    event.preventDefault();
    const trimmed = code.trim();
    if (trimmed === '' || scanning) return;
    setErrored(trimmed);
    onSubmitCode(trimmed);
  }

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
            {/* Two sentences, two paragraphs, ONE TYPE STEP. The second is not
                a footnote — it is the reason the first one sends you to a
                different app — so it does not drop to body-sm (L8). */}
            <p className="musie-scanner__text">{t('session.scan.reader')}</p>
            <p className="musie-scanner__text">{t('session.scan.readerNote')}</p>
          </div>

          <form className="musie-code" onSubmit={submit}>
            <Field
              label={t('session.scan.codeLabel')}
              name="card-code"
              value={code}
              onValueChange={setCode}
              placeholder={t('session.scan.codePlaceholder')}
              /* The held hint REPLACES the how-to-find-it line while the field
                 still carries the scanned code: somebody who just scanned the
                 card does not need to be told where the code is printed. */
              description={held !== null && code === held
                ? t('session.scan.heldHint')
                : t('session.scan.codeHint')}
              error={codeError !== null && code.trim() === errored ? codeError : undefined}
            />

            {/* A plain <div> so the button hugs its label instead of stretching
                across the column: `.musy-btn` is inline-flex, and a block
                parent is all that takes. No CSS, and nothing reaching into the
                component's own geometry. */}
            <div>
              <CtaButton
                type="submit"
                variant="secondary"
                loading={scanning}
                loadingLabel={t('content.loading')}
                disabled={code.trim() === ''}
              >
                {t('session.scan.codeSubmit')}
              </CtaButton>
            </div>
          </form>
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
