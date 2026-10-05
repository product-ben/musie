/**
 * A session is already running — the choice, as a dialog.
 *
 * ── WHY A DIALOG ──────────────────────────────────────────────────────────
 * Because a press has already happened and an answer is owed before anything
 * else can occur. The screen behind it offers five cards and a notice saying
 * the same thing (see `RunningSessionNotice` in routes/Exercises.tsx); this is
 * what stops the deck and takes a decision.
 *
 * The header here used to argue that a dialog was needed because "the refusal
 * is the answer to a SWIPE — a gesture that has already thrown the card off
 * the screen". Both halves of that are stale: /exercises no longer renders a
 * `Message` version of this (the deck replaced the list), and a swipe no longer
 * starts anything — a PRESS does, and the card is still under the thumb.
 *
 * ── IT IS THE SECOND PLACE THIS IS SAID, AND THE WORDS ARE THE SAME ───────
 * `exercises.running.headline` names the running exercise here and in the
 * notice at the top of the screen. The dialog adds exactly one sentence the
 * notice does not need — `exercises.running.choice`, which is the choice — and
 * leaves out exactly one the notice has: where the run stopped. That is not
 * symmetry for its own sake. `session.step.intro` is the word *Start*, and
 * "You stopped at Start" beside a button reading "Start Body Scan and end this
 * one" is a riddle. The notice has no Start button, so it carries the step.
 *
 * ── THE ANSWER THAT LOSES NOTHING IS THE PRIMARY ONE ──────────────────────
 * *Continue session* is `primary`: it is the way on from here and it costs
 * nothing. Ending is `secondary` and spells out what it ends, *Cancel* is
 * `ghost`, and the order is L6's — the likeliest answer outermost, the quiet
 * one first in the DOM so tab order matches the screen.
 *
 * THE DIALOG SAYS WHAT ENDING COSTS, which it never did: a session recorded
 * `abandoned` cannot be picked up again, and until now the only screen that
 * said so was the one you close a session FROM (`session.close.text`). The
 * button that does it from the outside said nothing at all.
 *
 * ── NO CONTENT BOX, AND THAT IS THE FIX RATHER THAN A SHORTCUT ────────────
 * Every other lightbox in this app frames its content in a `ContentBox` and
 * hides one of the two headlines — the dialog's or the box's. Measured: that
 * leaves BOTH headings in the accessibility tree with the same accessible
 * name, because `.musy-sr-only` hides a heading from the eye and from nothing
 * else. A screen reader navigating by heading hears the sentence twice, and
 * `getByRole('heading', { name })` matches two elements, which is how the
 * end-to-end walks have been failing.
 *
 * `ContentBox` cannot be asked to drop it — `headline` is required and its own
 * docs say "Never remove the headline to hide it", because the headline is the
 * article's accessible name. So the box goes instead. This is the system's own
 * `MinimalContent` shape (Lightbox.stories.tsx): a title, a line of body copy,
 * and the actions. The box earns its place where the frame means something;
 * here it was a wrapper repeating the dialog's name back to it.
 */
import { ButtonGroup, CtaButton, Lightbox } from '@musie/design-system';
import { Link } from 'react-router';
import { useT } from '../i18n/localeContext';
import type { ActiveSession } from '../lib/session';

export interface SessionRunningLightboxProps {
  /** The exercise that was asked for, named in the destructive action. */
  name: string;
  /**
   * The exercise that is RUNNING, named in the headline.
   *
   * Null when the catalogue has no row for `session.exerciseId` — content it
   * does not know about, or a session started before an exercise was retired.
   * The dialog falls back to naming no exercise rather than printing an id.
   */
  runningName: string | null;
  /** The running session, or null when reading it back also failed. */
  session: ActiveSession | null;
  /** End the running session and start the asked-for one. */
  onEndAndStart: () => void;
  /** True while that is in flight. */
  starting: boolean;
  onClose: () => void;
}

export function SessionRunningLightbox({
  name, runningName, session, onEndAndStart, starting, onClose,
}: SessionRunningLightboxProps) {
  const t = useT();

  /* THE HEADLINE NEEDS A NAME AND MIGHT NOT HAVE ONE. `exercises.running.*`
     interpolates the running exercise; with no row to read it from, the generic
     noun is the honest filler — "A session is still running" rather than an id
     nobody has seen before. */
  const running = runningName ?? t('exercises.running.fallback');

  return (
    <Lightbox
      open
      /* VISIBLE, and drawn exactly once. It was `titleHidden` with the same
         sentence repeated as the box's headline below — which put two headings
         with one accessible name in the tree, read as a stutter to a screen
         reader, and made `getByRole('heading')` ambiguous for the walks. The
         box hides its headline instead, exactly as the close-session
         confirmation does (routes/Session.tsx). */
      title={t('exercises.running.headline', { name: running })}
      closeLabel={t('common.closeLabel')}
      /* No `trigger`: a press on a card opened this, and that card is still
         mounted behind the scrim — base-ui returns focus to it. */
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <div className="musie-dialog">
        <p data-type-step="body-md">{t('exercises.running.choice', { name })}</p>

        {/* L6's action row: the likeliest answer outermost, the quiet one first
            in the DOM so tab order matches the screen. */}
        <ButtonGroup align="end">
          <CtaButton variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </CtaButton>
          <CtaButton
            variant="secondary"
            loading={starting}
            loadingLabel={t('content.loading')}
            onClick={onEndAndStart}
          >
            {t('exercises.endAndStart', { name })}
          </CtaButton>
          {/* THE ONE THAT LOSES NOTHING. Absent when the running session could
              not be read back — there is nowhere to send anybody — and then the
              dialog is a choice between ending and backing out, which is the
              honest shape of that state.

              `nativeButton={false}` because this one renders an `<a>`: base-ui
              asks to be told, and warns in the console when it is not. */}
          {session !== null && (
            <CtaButton
              variant="primary"
              nativeButton={false}
              render={
                <Link to={`/session/${encodeURIComponent(session.id)}/${session.step}`} />
              }
            >
              {t('exercises.goToSession')}
            </CtaButton>
          )}
        </ButtonGroup>
      </div>
    </Lightbox>
  );
}
