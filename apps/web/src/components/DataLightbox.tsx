/**
 * "What Musie keeps" — the whole of the data promise, brought forward.
 *
 * ── WHY IT EXISTS AT ALL ───────────────────────────────────────────────────
 * The reflect step used to carry the voice promise as a five-line `Message`:
 * a headline, then a paragraph explaining that words become text, that the
 * recording is never stored, and what was still unbuilt. It was the tallest
 * thing on a screen whose job is to get an answer out of somebody, and it was
 * read once — by the person who wrote it.
 *
 * So the step keeps the one sentence that is a promise and hands the rest to
 * this (Ben, 2026-09-23). The sentences themselves are not new: `privacy.*`
 * has been in the catalogue since C.2 and four of its six keys had no screen
 * to appear on, which is the same gap said from the other end.
 *
 * ── A LIGHTBOX, NOT A ROUTE ────────────────────────────────────────────────
 * It opens over the step rather than navigating away from it. A reflection in
 * progress is the one thing on this screen that cannot survive a round trip —
 * the transcript lives in `useTranscription` and a route change unmounts it —
 * so a page at /privacy would answer a small question by throwing away the
 * answer being written. Escape, the X and the scrim all put the person back
 * where they were, mid-sentence.
 *
 * ── THE TRIGGER IS THE CALLER'S ────────────────────────────────────────────
 * `open` and `onOpenChange` rather than `trigger`, because the control that
 * opens this is a word inside a sentence and `Dialog.Trigger` would wrap it —
 * the sentence is the app's, and the inline link is a screen pattern (L14).
 * The cost is the one `Lightbox` documents: with no trigger element there is
 * nothing to hand focus back to. `finalFocus` is passed by the caller, which
 * is the only place that holds a ref to the link.
 */
import * as React from 'react';
import { ContentBox, Lightbox } from '@musie/design-system';
import { useT } from '../i18n/localeContext';
import type { MessageKey } from '../i18n';

/**
 * The promise, in the order a person asks it: who the diary belongs to, then
 * what each of the three ways of answering leaves behind, then the one
 * consequence of the account living in a browser.
 *
 * A LIST RATHER THAN FIVE ELEMENTS, so the order is one thing to read and a
 * sixth sentence is one line. Every key is `privacy.*`, which is where C.2 put
 * them; nothing here is written inline (rule 7).
 */
const PROMISE: MessageKey[] = [
  'privacy.account',
  'privacy.voice',
  'privacy.written',
  'privacy.photo',
  'privacy.browserBound',
];

export interface DataLightboxProps {
  open: boolean;
  onClose: () => void;
  /** Where focus goes on close — the link that opened it. */
  finalFocus?: React.RefObject<HTMLElement | null>;
}

export function DataLightbox({ open, onClose, finalFocus }: DataLightboxProps) {
  const t = useT();

  return (
    <Lightbox
      open={open}
      /* The box's headline is the visible one, so the dialog's name is the
         same string hidden — `Lightbox`'s own documented pattern for a popup
         whose first child is a Content Box, and the one DiaryEntry uses. */
      title={t('privacy.title')}
      titleHidden
      closeLabel={t('common.closeLabel')}
      finalFocus={finalFocus}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      {/* h3, under the dialog's own hidden h2 — the level is never guessed
          (§7.9, 1.3.1). */}
      <ContentBox headingLevel={3} headline={t('privacy.title')}>
        <div className="musie-prose">
          {PROMISE.map((key) => <p key={key}>{t(key)}</p>)}
        </div>
      </ContentBox>
    </Lightbox>
  );
}
