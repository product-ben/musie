/**
 * A session is already running — the choice, as a dialog.
 *
 * ── WHY A DIALOG ──────────────────────────────────────────────────────────
 * Because a press — or a scan — has already happened and an answer is owed
 * before anything else can occur. On /exercises the screen behind it offers
 * the pile and a notice saying the same thing (see `RunningSessionNotice` in
 * routes/Exercises.tsx); after a printed card's QR code (`/s/:code`) there is
 * nothing behind it at all.
 *
 * ── STARTING THE NEW ONE IS THE PRIMARY ANSWER — 2026-11-23 ───────────────
 * PRD „Übungskarten mit QR-Code" (D13, D14). Ben: the person asked for the
 * new exercise — by pressing it, or by scanning its card — so starting it is
 * the likeliest answer and takes the filled treatment. Continuing the running
 * one is `secondary`. It was the other way round until this day, and the
 * ghost *Cancel* went with it: the two answers are *start the new one* and
 * *stay with the old one*, and staying is what continuing is. The X still
 * closes; what that means is the caller's (D15) — on /exercises the pile is
 * behind it, after a scan the running session is.
 *
 * L6's order, unchanged: the likeliest answer outermost, the quieter one
 * first in the DOM so tab order matches the screen.
 *
 * ── ITS OWN TITLE, AND THE SENTENCE NAMES BOTH ────────────────────────────
 * „Neue Übung starten?" (Ben, 2026-11-23), where the dialog used to repeat
 * the notice's „{name} läuft noch". The notice keeps that headline. With the
 * running exercise gone from the title, the sentence names both — and says
 * what ending costs: a session recorded `abandoned` cannot be picked up again.
 *
 * ── NO CONTENT BOX, AND THAT IS THE FIX RATHER THAN A SHORTCUT ────────────
 * Every other lightbox in this app frames its content in a `ContentBox` and
 * hides one of the two headlines. That leaves BOTH headings in the
 * accessibility tree with the same name (`.musy-sr-only` hides from the eye
 * only), and `getByRole('heading', { name })` matches two. `ContentBox` cannot
 * drop its required headline, so the box goes: this is the system's own
 * `MinimalContent` shape (Lightbox.stories.tsx) — a title, a line of body
 * copy, and the actions.
 */
import { ButtonGroup, Button, Lightbox } from '@musie/design-system';
import { Link } from 'react-router';
import { useT } from '../i18n/localeContext';
import type { ActiveSession } from '../lib/session';

export interface SessionRunningLightboxProps {
  /** The exercise that was asked for, named in the primary action. */
  name: string;
  /**
   * The exercise that is RUNNING, named in the sentence and the secondary
   * action.
   *
   * Null when the catalogue has no row for `session.exerciseId` — content it
   * does not know about, or a session started before an exercise was retired.
   * The dialog then names no exercise rather than printing an id.
   */
  runningName: string | null;
  /** The running session, or null when reading it back also failed. */
  session: ActiveSession | null;
  /** End the running session and start the asked-for one. */
  onEndAndStart: () => void;
  /** True while that is in flight. */
  starting: boolean;
  /** The X and Escape. What closing means is the caller's (D15). */
  onClose: () => void;
}

export function SessionRunningLightbox({
  name, runningName, session, onEndAndStart, starting, onClose,
}: SessionRunningLightboxProps) {
  const t = useT();

  return (
    <Lightbox
      open
      title={t('exercises.running.dialogTitle')}
      closeLabel={t('common.closeLabel')}
      /* No `trigger`: a press on a card opened this, and that card is still
         mounted behind the scrim — base-ui returns focus to it. After a scan
         there is nothing to return to, and the caller navigates instead. */
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <div className="musie-dialog">
        <p data-type-step="body-md">
          {runningName === null
            ? t('exercises.running.replaceUnknown', { name })
            : t('exercises.running.replace', { name, running: runningName })}
        </p>

        {/* L6's action row: the likeliest answer outermost, the quiet one first
            in the DOM so tab order matches the screen. */}
        <ButtonGroup align="end">
          {/* STAYING WITH THE RUNNING ONE. Absent when the running session could
              not be read back — there is nowhere to send anybody — and then the
              dialog is starting or closing, which is the honest shape of that
              state.

              `nativeButton={false}` because this one renders an `<a>`: base-ui
              asks to be told, and warns in the console when it is not. */}
          {session !== null && (
            <Button
              variant="secondary"
              nativeButton={false}
              render={
                <Link to={`/session/${encodeURIComponent(session.id)}/${session.step}`} />
              }
            >
              {runningName === null
                ? t('exercises.goToSession')
                : t('exercises.running.continue', { name: runningName })}
            </Button>
          )}
          <Button
            variant="primary"
            loading={starting}
            loadingLabel={t('content.loading')}
            onClick={onEndAndStart}
          >
            {t('exercises.running.start', { name })}
          </Button>
        </ButtonGroup>
      </div>
    </Lightbox>
  );
}
