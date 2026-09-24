/**
 * Step 2 · Scan — draw a card, and find out what it plays.
 *
 * ── THE SIMULATED SCAN IS GONE. THREE REAL WAYS IN REPLACE IT ──────────────
 * E.0, E.1, E.2 and E.3. *Simulate a scan* picked one of the nine cards at
 * random and said so on screen; nothing here picks a card any more, because
 * three ways of naming the card you are actually holding now work:
 *
 *   1. THE QR CODE ON THE CARD, read by the PHONE'S OWN camera app. It carries
 *      `<origin>/s/MC-01`, so it opens Musie at that card without Musie ever
 *      touching a camera — and that is the common way in for somebody holding
 *      a printed card. `routes/ScanLink.tsx` is where it lands.
 *   2. THE CODE PRINTED BESIDE IT, typed into the form the frame holds
 *      when somebody asks for it.
 *   3. THE CAMERA ON THIS DEVICE, for the person who opened Musie first —
 *      `CardScanner`, E.2, with E.3's WebAssembly decoder under it on Safari.
 *
 * All three converge on `scanCardInto` (lib/scan.ts) and therefore on
 * `getCardByCode`, so a deep link, a typed code and a camera perform one act
 * rather than three implementations of it. That is what the split was for, and
 * the camera is the caller it was built in anticipation of.
 *
 * ── THE CAMERA DOES NOT WRITE; IT FILLS THE FIELD ──────────────────────────
 * A code the camera reads is put into the field and submitted, rather than
 * sent off on its own path. Two reasons, and neither is tidiness: the code
 * that was read stays VISIBLE, which is where an unknown-card error appears
 * under it; and there is exactly one submit path, so the camera cannot acquire
 * behaviour the typed field does not have.
 *
 * ── THE FRAME IS THE STEP, AND IT IS THE SYSTEM'S NOW ──────────────────────
 * The dashed viewport was where E.2's camera would go. The camera is in it —
 * same square, same place, and the border goes solid while it is running,
 * because L10's dashed outline means "a place where something will be" and
 * something now is.
 *
 * Since 2026-09-24 the frame is `QrScanner`, a Layer 2 component, and the
 * typed-code form is one of its modes rather than a second block under it. So
 * all three ways of naming a card happen in ONE box, one at a time, and the
 * step is a square and a sentence instead of a square, a switch and a form.
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
import { CardScanner } from './CardScanner';
import { Markdown } from './Markdown';
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
   * ── TYPING THE CODE IS THE THIRD WAY IN, AND IT IS A MODE OF THE FRAME ──
   * Ben, 2026-09-23, then again 2026-09-24. The field and its button first sat
   * open under the frame, so the step offered a camera and a form at once and
   * the form was the taller of the two; then they folded away behind a switch
   * under the frame. Both versions put the form BESIDE the reader, which made
   * the step two things at once however it was dressed.
   *
   * It is now the fifth mode of the frame itself — the same box, holding the
   * form instead of the viewfinder, with a way back to the scanner under it.
   * One place where a card gets named, three ways of naming it, and only one
   * of them on screen at a time.
   *
   * IT OPENS ITSELF IF IT IS ALREADY NEEDED. A code carried in from a scanned
   * deep link is IN the field, and showing the viewfinder over it would hide
   * the one thing that just happened — same for an error, which appears under
   * the field it belongs to and would otherwise be reported into a frame that
   * is not showing it.
   */
  const [typing, setTyping] = React.useState(held !== null);

  /* An answer about a code OPENS the form rather than being drawn into a
     frame that is showing something else. It sets state rather than being
     folded into the mode test, so *Zurück zum Scannen* keeps working
     afterwards: a condition that forced the form open would leave a control
     that nothing could leave. */
  React.useEffect(() => {
    if (codeError !== null) setTyping(true);
  }, [codeError]);

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

  /**
   * ONE WAY IN, WHOEVER FOUND THE CODE.
   *
   * Typed and scanned both land here: the field is set to the code, the code
   * is remembered as the one that was tried, and it goes up. So a camera read
   * leaves `MC-01` sitting in the field — which is both the feedback that the
   * scan worked and the place the answer will appear if this deck has no such
   * card.
   */
  function applyCode(scanned: string) {
    if (scanning) return;
    setCode(scanned);
    setErrored(scanned);
    onSubmitCode(scanned);
  }

  function submit(event: React.FormEvent) {
    /* A REAL <form>, so Enter submits. A five-character code typed on a phone
       keyboard is finished with the go key, not by reaching for a button. */
    event.preventDefault();
    const trimmed = code.trim();
    if (trimmed === '') return;
    applyCode(trimmed);
  }

  return (
    <>
      {/* The exercise's own headline and card-picking advice — `scan_md`.
          It is the step that tells you HOW to pick, and since 2026-09-23 it
          says so in two numbered steps: choose the image, put the rest out of
          sight, then scan the code.

          No fallback: the two exercises that carry no step copy draw no cards
          either, so they never reach this step at all. */}
      <Markdown md={exercise.scanMd} />

      {card === null ? (
        /* THE FRAME, AND EVERYTHING THAT NAMES A CARD IS IN IT — E.2/E.3, and
           2026-09-24's move of the typed form inside. `CardScanner` owns the
           camera and the join to the design system's `QrScanner`; this owns
           the form, which is passed to it and rendered in the frame's `manual`
           mode. A code the camera reads still comes back here. */
        <CardScanner
          onCode={applyCode}
          busy={scanning}
          manual={typing}
          onManual={() => setTyping(true)}
          onBack={() => setTyping(false)}
        >
          {/* A REAL <form>, so Enter submits. No id and no `aria-controls`
              any more: the form is not disclosed by a control beside it, it
              IS the frame's content while the frame is in that mode, and an
              `aria-controls` pointing at something in the same box would
              describe a relationship that no longer exists. */}
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
            {/* PRIMARY, because it is the way on. Ben, 2026-09-24, as a rule for
                the system rather than a note about this button: within one
                semantic unit and one state of it, the action that carries the
                person onward takes the filled treatment. In this state the
                frame IS the unit and taking the card is the only way out of
                it — *Zurück zum Scannen* goes back, and going back is never
                the primary. Written up in the CTA Button and Button Group
                docs. */}
            <div>
              <CtaButton
                type="submit"
                loading={scanning}
                loadingLabel={t('content.loading')}
                disabled={code.trim() === ''}
              >
                {t('session.scan.codeSubmit')}
              </CtaButton>
            </div>
          </form>
        </CardScanner>
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
