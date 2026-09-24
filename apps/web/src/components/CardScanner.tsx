/**
 * The camera, wired into the design system's frame — E.2, and E.3 under it.
 *
 * ── IT IS AN ADAPTER NOW, AND THAT IS THE WHOLE FILE ──────────────────────
 * The frame, the mask, the five states and every control in them are
 * `QrScanner`'s (`@musie/design-system`). What was `.musie-scanner` in
 * `shell.css` is `.musy-scanner` in the system, because a square viewfinder
 * with a camera in it recurs by definition — it is the same object on every
 * screen that ever reads a code — and rule 1 says a pattern that recurs is a
 * component request rather than a second copy.
 *
 * What is left here is the join, and only the join: the hook's four phases
 * become the component's five modes, a `CameraProblem` becomes a sentence, and
 * `canRetry` decides whether a retry is offered at all. Every one of those is
 * knowledge the design system must not have.
 *
 * ── THE FIFTH MODE IS NOT A PHASE ─────────────────────────────────────────
 * `manual` — the typed code — is the step's, not the camera's, so it arrives
 * as a prop and outranks whatever the camera is doing. `SessionScan` owns it,
 * because `SessionScan` owns the field it opens.
 *
 * ── OPENING THE FORM STOPS THE CAMERA ─────────────────────────────────────
 * Somebody who has decided to type is not holding a card up any more, and a
 * preview running behind a form is a camera light on for nothing. So the
 * icon control stops the stream on its way out. Coming back from the form
 * does NOT restart it: the camera opens when somebody asks for it, which is
 * the rule the whole of `useCardScanner` is built on.
 *
 * ── IT DECIDES NOTHING ABOUT THE CARD ─────────────────────────────────────
 * A code that is read goes straight up to `SessionScan`, which puts it in the
 * field and submits it — the same act as typing it. So the camera is a third
 * way to fill one field rather than a second way to write a session, and the
 * code that was read is visible afterwards, which is where an unknown-card
 * error appears under it.
 */
import type { ReactNode } from 'react';
import { QrScanner } from '@musie/design-system';
import type { QrScannerMode } from '@musie/design-system';

import { useT } from '../i18n/localeContext';
import type { MessageKey } from '../i18n';
import { canRetry } from '../lib/camera';
import type { CameraProblem } from '../lib/camera';
import { useCardScanner } from '../lib/useCardScanner';

/** One sentence per reason. A `Record`, so an eighth reason fails the
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

/** The camera's four phases, as the frame's four camera modes. `manual` is
 *  the step's and is applied over the top of this. */
const MODE_FOR_PHASE = {
  off: 'idle',
  starting: 'starting',
  live: 'live',
  blocked: 'blocked',
} as const satisfies Record<string, QrScannerMode>;

export interface CardScannerProps {
  /** A card code that was read, already canonical — `MC-01`. */
  onCode: (code: string) => void;
  /** True while the last code is being looked up. Nothing starts during it. */
  busy: boolean;
  /** The typed-code form is open. Outranks every camera phase. */
  manual: boolean;
  /** Somebody asked to type the code. */
  onManual: () => void;
  /** Somebody left the form for the scanner again. */
  onBack: () => void;
  /** The typed-code form itself. Rendered inside the frame while `manual`. */
  children: ReactNode;
}

export function CardScanner({
  onCode, busy, manual, onManual, onBack, children,
}: CardScannerProps) {
  const t = useT();
  const { phase, videoRef, start, stop } = useCardScanner(onCode);

  const mode: QrScannerMode = manual ? 'manual' : MODE_FOR_PHASE[phase.kind];

  /* The commentary, and which of the two places it belongs in is the
     component's business rather than ours: under the frame while live, inside
     it while blocked. Undefined in every other mode, because there is nothing
     true to say in them. */
  const notice =
    phase.kind === 'live'
      ? t(phase.other ? 'session.scan.cameraOther' : 'session.scan.cameraLive')
      : phase.kind === 'blocked'
        ? t(PROBLEM_TEXT[phase.problem])
        : undefined;

  return (
    <QrScanner
      mode={mode}
      videoRef={videoRef}
      cameraLabel={t('session.scan.cameraLabel')}
      scanLabel={t('session.scan.scanCard')}
      manualLabel={t('session.scan.codeManual')}
      hideCameraLabel={t('session.scan.cameraHide')}
      backLabel={t('session.scan.codeBack')}
      /* NO RETRY AFTER A REFUSAL. `canRetry` is where that is decided and why:
         offering to ask again is the app declining to take no for an answer,
         and three of the other reasons cannot change on this screen however
         many times they are tried. Absent rather than disabled — a control
         that cannot work is not a control. */
      retryLabel={
        phase.kind === 'blocked' && canRetry(phase.problem)
          ? t('session.scan.cameraRetry')
          : undefined
      }
      notice={notice}
      busy={busy}
      loadingLabel={t('session.scan.cameraStarting')}
      onScan={start}
      onManual={() => { stop(); onManual(); }}
      onHideCamera={stop}
      onBack={onBack}
    >
      {children}
    </QrScanner>
  );
}
