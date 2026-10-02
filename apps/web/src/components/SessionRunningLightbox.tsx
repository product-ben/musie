/**
 * "A session is already running" — the refusal, as a dialog.
 *
 * ── WHY A DIALOG AND NOT A MESSAGE ────────────────────────────────────────
 * /exercises renders this refusal inline, as a `Message` above the list, and
 * that is right there: the person TAPPED a card, the list is still on screen,
 * and the message sits beside the thing it is about.
 *
 * The deck cannot do that. The refusal is the answer to a SWIPE — a gesture
 * that has already thrown the card off the screen — so there is no longer a
 * control on screen for a message to sit beside, and the one question that
 * matters ("do you want to end the other one?") would be a paragraph competing
 * with a pile of cards the person is still able to swipe. A dialog stops the
 * deck, asks the question, and takes an answer. Ben, 2026-10-02.
 *
 * ── IT INVENTS NO COPY ────────────────────────────────────────────────────
 * Every string is the one /exercises already uses for this exact outcome —
 * `exercises.alreadyRunning`, `…Detail`, `…goToSession`, `…endAndStart`. Two
 * screens asking one question in two voices is how a product stops sounding
 * like one product, and the refusal is the same refusal from the same unique
 * index either way.
 *
 * ── THE DESTRUCTIVE ANSWER IS THE SECOND ONE ──────────────────────────────
 * *Continue that session* comes first and is the accent action; ending a run
 * in progress is `secondary` and spells out what it ends. The swipe that got
 * here was deliberately the hard one to perform (see CardDeck), and this is
 * the same bargain one step further on: the irreversible option is available,
 * named, and not the one your thumb lands on.
 */
import { ButtonGroup, ContentBox, CtaButton, Lightbox } from '@musie/design-system';
import { Link } from 'react-router';
import { useT } from '../i18n/localeContext';
import type { ActiveSession } from '../lib/session';

export interface SessionRunningLightboxProps {
  /** The exercise that was asked for, named in the destructive action. */
  name: string;
  /** The running session, or null when reading it back also failed. */
  session: ActiveSession | null;
  /** End the running session and start the asked-for one. */
  onEndAndStart: () => void;
  /** True while that is in flight. */
  starting: boolean;
  onClose: () => void;
}

export function SessionRunningLightbox({
  name, session, onEndAndStart, starting, onClose,
}: SessionRunningLightboxProps) {
  const t = useT();

  return (
    <Lightbox
      open
      title={t('exercises.alreadyRunning')}
      /* The box below renders this same string as its headline, and Lightbox's
         own rule is to pass the title anyway and hide it: the dialog still has
         an accessible name, and the sentence is only drawn once. Said twice it
         read as a stutter. */
      titleHidden
      closeLabel={t('common.closeLabel')}
      /* No `trigger`: a swipe opened this, and the card it was performed on is
         already off the screen. base-ui returns focus to the deck, which is
         where the person was and what they will use next. */
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <ContentBox
        /* h3, under the lightbox's own h2. */
        headingLevel={3}
        headline={t('exercises.alreadyRunning')}
        text={t('exercises.alreadyRunningDetail')}
      >
        <ButtonGroup>
          {session !== null && (
            <CtaButton
              variant="accent"
              render={
                <Link to={`/session/${encodeURIComponent(session.id)}/${session.step}`} />
              }
            >
              {t('exercises.goToSession')}
            </CtaButton>
          )}
          <CtaButton
            variant="secondary"
            loading={starting}
            loadingLabel={t('content.loading')}
            onClick={onEndAndStart}
          >
            {t('exercises.endAndStart', { name })}
          </CtaButton>
        </ButtonGroup>
      </ContentBox>
    </Lightbox>
  );
}
