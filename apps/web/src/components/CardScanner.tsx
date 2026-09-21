/**
 * The frame, with a camera in it — E.2, and E.3 underneath it.
 *
 * ── IT FILLS THE SLOT THAT WAS ALREADY THERE ──────────────────────────────
 * `.musie-scanner` is the dashed square the scan step has drawn since D.5a: a
 * square dashed viewport is a viewfinder by convention, and L10 makes a dashed
 * outline mean *a place where something will be*. This is that something. The
 * frame does not move, change size or change place when the camera starts —
 * only its border stops being dashed, because something IS there now.
 *
 * ── FOUR THINGS IT CAN SHOW, AND ONLY ONE OF THEM IS A PICTURE ────────────
 *   off       the two ways in that need no camera, and a button for the one
 *             that does;
 *   starting  the permission prompt is probably on screen;
 *   live      the preview, plus a line UNDER the frame saying what to do;
 *   blocked   why not, and what to do instead — never an apology.
 *
 * The commentary sits below the frame rather than over the picture. Text on
 * top of live video has no contrast anybody can check, because the background
 * is whatever the camera is pointed at; L15 asks for contrast against every
 * surface an indicator can land on, and a camera preview is not a surface with
 * a colour.
 *
 * ── IT DECIDES NOTHING ABOUT THE CARD ─────────────────────────────────────
 * A code that is read goes straight up to `SessionScan`, which puts it in the
 * field and submits it — the same act as typing it. So the camera is a third
 * way to fill one field rather than a second way to write a session, and the
 * code that was read is visible afterwards, which is where an unknown-card
 * error appears under it.
 */
import { CtaButton, Icon } from '@musie/design-system';
import { CameraOff, ScanLine } from 'lucide-react';

import { useT } from '../i18n/localeContext';
import type { MessageKey } from '../i18n';
import { canRetry } from '../lib/camera';
import type { CameraProblem } from '../lib/camera';
import { useCardScanner } from '../lib/useCardScanner';

/** One sentence per reason. A `Record`, so a seventh reason fails the
 *  typecheck rather than rendering an empty frame. */
const PROBLEM_TEXT: Record<CameraProblem, MessageKey> = {
  denied: 'session.scan.cameraDenied',
  missing: 'session.scan.cameraMissing',
  busy: 'session.scan.cameraBusy',
  insecure: 'session.scan.cameraInsecure',
  unsupported: 'session.scan.cameraUnsupported',
  decoder: 'session.scan.cameraDecoder',
  failed: 'session.scan.cameraFailed',
};

export interface CardScannerProps {
  /** A card code that was read, already canonical — `MC-01`. */
  onCode: (code: string) => void;
  /** True while the last code is being looked up. Nothing starts during it. */
  busy: boolean;
}

export function CardScanner({ onCode, busy }: CardScannerProps) {
  const t = useT();
  const { phase, videoRef, start, stop } = useCardScanner(onCode);

  const live = phase.kind === 'live';

  return (
    <>
      <div className={live ? 'musie-scanner musie-scanner--live' : 'musie-scanner'}>
        {live ? (
          /*
            `muted` and `playsInline` are what let iOS play this at all — an
            unmuted video, or one that wants to go fullscreen, needs a gesture
            Safari recognises and the button press is not it. `autoPlay` is
            belt and braces: the hook calls play() as well, because a stream
            attached after mount does not always trigger the attribute.

            No `poster` and no captions: there is nothing recorded here. The
            label is what a screen reader gets, and the line below the frame is
            what everybody gets.
          */
          <video
            ref={videoRef}
            className="musie-scanner__view"
            aria-label={t('session.scan.cameraLabel')}
            autoPlay
            muted
            playsInline
          />
        ) : (
          <>
            <Icon glyph={phase.kind === 'blocked' ? CameraOff : ScanLine} size="xl" />

            {phase.kind === 'off' && (
              <>
                {/* Two sentences, two paragraphs, ONE TYPE STEP. The second is
                    not a footnote — it is the other way in — so it does not
                    drop to body-sm (L8). */}
                <p className="musie-scanner__text">{t('session.scan.reader')}</p>
                <p className="musie-scanner__text">{t('session.scan.readerNote')}</p>
              </>
            )}

            {phase.kind === 'starting' && (
              <p className="musie-scanner__text">{t('session.scan.cameraStarting')}</p>
            )}

            {phase.kind === 'blocked' && (
              /* `status` rather than `alert`: none of these is urgent and none
                 of them is an error. The person asked for a camera, the camera
                 is not coming, and the field below still works. */
              <p className="musie-scanner__text" role="status">
                {t(PROBLEM_TEXT[phase.problem])}
              </p>
            )}
          </>
        )}
      </div>

      {live && (
        /* The same region for both sentences, so *that is not a Musie code*
           replaces *hold it in the frame* rather than appearing beneath it —
           one line of commentary, changing, not a growing list of advice. */
        <p className="musie-scanner__status" role="status">
          {phase.other ? t('session.scan.cameraOther') : t('session.scan.cameraLive')}
        </p>
      )}

      {/* A plain <div> so the button hugs its label instead of stretching
          across the column: `.musy-btn` is inline-flex, and a block parent is
          all that takes. Nothing reaching into the component's geometry. */}
      {phase.kind === 'off' && (
        <div>
          <CtaButton variant="secondary" disabled={busy} onClick={start}>
            {t('session.scan.cameraStart')}
          </CtaButton>
        </div>
      )}

      {phase.kind === 'starting' && (
        <div>
          <CtaButton variant="secondary" loading loadingLabel={t('content.loading')}>
            {t('session.scan.cameraStart')}
          </CtaButton>
        </div>
      )}

      {live && (
        <div>
          <CtaButton variant="ghost" onClick={stop}>
            {t('session.scan.cameraStop')}
          </CtaButton>
        </div>
      )}

      {/* NO BUTTON AFTER A REFUSAL. `canRetry` is where that is decided and
          why: offering to ask again is the app declining to take no for an
          answer, and three of the other reasons cannot change on this screen
          however many times they are tried. */}
      {phase.kind === 'blocked' && canRetry(phase.problem) && (
        <div>
          <CtaButton variant="secondary" disabled={busy} onClick={start}>
            {t('session.scan.cameraRetry')}
          </CtaButton>
        </div>
      )}
    </>
  );
}
