/**
 * QR Scanner — Layer 2
 * The viewfinder a paper card is held up to, and the two ways out of it.
 *
 * base-ui: none of its own. It composes §7.4 CTA Button and §7.2 Icon Button,
 * because every control in it is one of those two and a scanner that grew its
 * own button would have its own target ladder, its own focus ring and its own
 * disabled state to keep in step.
 *
 * ── IT HOLDS NO CAMERA, AND THAT IS THE MAIN DECISION ─────────────────────
 * The same split Record Button makes: that component draws the meter and never
 * records, this one draws the frame and never calls `getUserMedia`. `mode` is
 * passed in, `videoRef` is attached to the `<video>` this renders, and every
 * press goes straight back out. So the app owns the stream, the decode loop,
 * the permission prompt and the seven reasons a camera does not open — none of
 * which a design system can have an opinion about — and this owns the picture.
 *
 * It also means all five states are reachable in Storybook with no camera, no
 * permission and no session, which is the only way anybody ever looks at
 * `blocked` on purpose.
 *
 * ── FIVE MODES, AND THREE OF THEM ARE THE SAME SQUARE ─────────────────────
 *   idle      two ways in, centred in an otherwise empty frame;
 *   starting  the same two, the first of them spinning — same buttons in the
 *             same places, so the frame does not reflow while somebody is
 *             answering a permission prompt over the top of it;
 *   live      the preview, the mask, and two icon controls bottom-right;
 *   manual    the typed-code form, INSIDE the frame;
 *   blocked   why not, and what to do instead — never an apology.
 *
 * TWO OF THEM CHANGE THE BOX, and both changes are earned.
 *
 * `live` is taller than the square by exactly one inset, one target and one
 * inset: the band under the window where the two controls sit (Ben,
 * 2026-09-24). They were in the frame's corner before, lying across the
 * window's own bottom-right bracket — over the undimmed picture, on top of the
 * corner the bracket is there to mark. The band is padding, so the three gaps
 * around the controls are one token each and none of them is a number.
 *
 * `manual` drops the square altogether: the frame is capped at five guided
 * targets (320px), and a label, a field, a hint and two buttons do not fit in
 * a 320px square on a phone, so the box fits its form. The square matters
 * while this is a viewfinder; a form has no reason to be one.
 *
 * ── NOTHING IS WRITTEN ON THE PICTURE WITHOUT A BACKGROUND UNDER IT ───────
 * The mask dims everything outside the card window (`--alpha-scrim`, the same
 * token the Lightbox backdrop uses) and the corner brackets are drawn in
 * `--on-scrim`, which is light in BOTH themes because the scrim is dark in
 * both. The two icon controls are `secondary`, the one variant that carries an
 * opaque `--surface-raised` and a `--border-strong` edge of its own.
 *
 * That is not decoration. L15 asks for contrast against every surface an
 * indicator can land on, and a camera preview is not a surface with a colour —
 * it is whatever the phone is pointed at, which is a white table as often as a
 * dark room. Anything drawn plainly over it is legible half the time. The
 * scrim and the opaque pill are what make the question answerable at all.
 *
 * The running commentary (`notice`) stays BELOW the frame while live for the
 * same reason, and moves INSIDE it when blocked — where there is no picture
 * and the sentence is the only thing to read.
 *
 * ── THE PRIMARY MOVES WITH THE WAY ON ─────────────────────────────────────
 * §7.4's rule: one primary per unit per state, and it is the action that
 * carries the person onward. This component is a unit that changes what it is
 * showing, so the primary moves rather than sitting on one control:
 *
 *   idle / starting   the camera (`scanLabel`);
 *   live              neither — the way on is holding a card up, not pressing
 *                     anything, and the two icon controls are side routes;
 *   manual            the consumer's own submit, inside the form;
 *   blocked, retryable    the retry;
 *   blocked, final        typing the code, which is then the only way out.
 *
 * ── EVERY LABEL IS REQUIRED ───────────────────────────────────────────────
 * No copy defaults, unlike Lightbox and Photo Upload. A default here would be
 * German in an English session — and this is a screen somebody reaches while
 * holding a physical card, where a control saying the wrong thing is worse
 * than one saying nothing.
 */
import * as React from 'react';
import { CameraOff, ScanQrCode, TextCursorInput } from 'lucide-react';
import { CtaButton } from './CtaButton';
import type { CtaVariant } from './CtaButton';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

export type QrScannerMode = 'idle' | 'starting' | 'live' | 'manual' | 'blocked';

export interface QrScannerProps {
  mode: QrScannerMode;
  /** Attach to the `<video>` this renders while `live`. The consumer's hook
   *  owns the stream; this owns the element. */
  videoRef?: React.Ref<HTMLVideoElement>;
  /** The preview's accessible name — what a screen reader gets for a picture
   *  that has no alternative text to give. */
  cameraLabel: string;
  /** Start the camera. The primary way in. */
  scanLabel: string;
  /** Type the code instead. Both a button (idle, blocked) and an icon control
   *  (live), so one string names one act in three places. */
  manualLabel: string;
  /** Put the camera away, back to `idle`. */
  hideCameraLabel: string;
  /** Leave `manual` for the scanner again. */
  backLabel: string;
  /** Start the camera, from `idle` or from a retryable `blocked`. */
  onScan: () => void;
  /** Show the typed-code form. Fired by a button and by an icon control. */
  onManual: () => void;
  /** Put the camera away. */
  onHideCamera: () => void;
  /** Leave the typed-code form. */
  onBack: () => void;
  /**
   * Offer the camera again after a refusal — PRESENT means offer it.
   *
   * Not a boolean, and not decided here: whether a reason can change on this
   * screen is the app's knowledge, and a scanner that always offered a retry
   * would be the system declining to take no for an answer.
   */
  retryLabel?: string;
  /**
   * One sentence. Under the frame while `live` (what to hold up, or that the
   * code in view is not one of ours); inside it while `blocked` (why).
   *
   * A node rather than a string so a consumer can carry an id or a `<strong>`
   * through it, but one sentence is the shape — this is not a slot for prose.
   */
  notice?: React.ReactNode;
  /** The typed-code form. Rendered inside the frame, in `manual` only. */
  children?: React.ReactNode;
  /** Something is already being looked up. Nothing new starts during it. */
  busy?: boolean;
  /** Announced while the camera is opening. Defaults to the locale
   *  catalogue's word through CTA Button. */
  loadingLabel?: string;
  className?: string;
}

/** The four corner brackets. Decorative, and drawn rather than described —
 *  the sentence under the frame is what says to hold the card up. */
const CORNERS = ['tl', 'tr', 'bl', 'br'] as const;

export function QrScanner({
  mode, videoRef, cameraLabel,
  scanLabel, manualLabel, hideCameraLabel, backLabel, retryLabel,
  onScan, onManual, onHideCamera, onBack,
  notice, children, busy = false, loadingLabel, className,
}: QrScannerProps) {
  /* `starting` and `idle` draw the same two controls, and the ONLY difference
     is the spinner — so they share one branch rather than two that have to be
     kept identical by hand. */
  const waiting = mode === 'idle' || mode === 'starting';

  /**
   * Written once and rendered twice — `idle` and `blocked` both offer it, and
   * the two must not drift into saying the same thing differently.
   *
   * THE TREATMENT IS THE CALLER'S, and that is §7.4's rule rather than a
   * preference: one primary per unit per state, and it is the action that
   * carries the person onward. In `idle` the camera is the way on, so this
   * sits under it as a ghost. In `blocked` the camera is gone — so if no retry
   * is on offer, typing the code IS the way on and takes the filled
   * treatment; if one is, the retry is the way on and this drops back to a
   * ghost beneath it.
   */
  const typeItInstead = (variant: CtaVariant) => (
    <CtaButton variant={variant} leadingIcon={TextCursorInput} onClick={onManual} wrap>
      {manualLabel}
    </CtaButton>
  );

  return (
    <div className={['musy-scanner', className ?? ''].filter(Boolean).join(' ')}>
      <div className={`musy-scanner__frame musy-scanner__frame--${mode}`}>
        {waiting && (
          <div className="musy-scanner__actions">
            <CtaButton
              leadingIcon={ScanQrCode}
              loading={mode === 'starting'}
              loadingLabel={loadingLabel}
              disabled={busy}
              onClick={onScan}
              wrap
            >
              {scanLabel}
            </CtaButton>
            {typeItInstead('ghost')}
          </div>
        )}

        {mode === 'live' && (
          <>
            {/*
              `muted` and `playsInline` are what let iOS play this at all — an
              unmuted video, or one that wants to go fullscreen, needs a
              gesture Safari recognises and a button press is not it.
              `autoPlay` is belt and braces: a stream attached after mount does
              not always trigger the attribute, so the consumer calls play() as
              well.

              No `poster` and no captions: nothing is recorded here. The label
              is what a screen reader gets.
            */}
            <video
              ref={videoRef}
              className="musy-scanner__view"
              aria-label={cameraLabel}
              autoPlay
              muted
              playsInline
            />

            {/* THE WINDOW. Four brackets and a scrim, and no text: what it
                says is said by its shape, and the sentence under the frame
                says it in words. */}
            <div className="musy-scanner__mask" aria-hidden="true">
              {CORNERS.map((corner) => (
                <span key={corner} className={`musy-scanner__corner musy-scanner__corner--${corner}`} />
              ))}
            </div>

            {/* Bottom-right, and in this order: typing sits inboard of the
                control that puts the camera away, so the destructive-ish one
                is the outermost and the two never swap places. */}
            <div className="musy-scanner__tools">
              <IconButton
                glyph={TextCursorInput}
                label={manualLabel}
                variant="secondary"
                onClick={onManual}
              />
              <IconButton
                glyph={CameraOff}
                label={hideCameraLabel}
                variant="secondary"
                onClick={onHideCamera}
              />
            </div>
          </>
        )}

        {mode === 'manual' && (
          <div className="musy-scanner__form">
            {children}
            {/* A plain <div> so the button hugs its label instead of
                stretching: `.musy-btn` is inline-flex, and a block parent is
                all that takes. */}
            <div>
              <CtaButton variant="ghost" leadingIcon={ScanQrCode} onClick={onBack} wrap>
                {backLabel}
              </CtaButton>
            </div>
          </div>
        )}

        {mode === 'blocked' && (
          <>
            <Icon glyph={CameraOff} size="xl" />
            {/* `status` rather than `alert`: none of these is urgent and none
                of them is an error. The person asked for a camera, the camera
                is not coming, and typing the code still works. */}
            {notice !== undefined && (
              <p className="musy-scanner__text" role="status">{notice}</p>
            )}
            {/* THE WAY ON TAKES THE FILLED TREATMENT, and which control that is
                depends on whether the reason can change. A retry that is on
                offer is the way back to the thing they asked for; where there
                is none — a refusal, a browser that will not, a device with no
                camera — typing the code is the only way out of this state and
                is primary itself. Never both. */}
            <div className="musy-scanner__actions">
              {retryLabel !== undefined && (
                <CtaButton
                  leadingIcon={ScanQrCode}
                  disabled={busy}
                  onClick={onScan}
                  wrap
                >
                  {retryLabel}
                </CtaButton>
              )}
              {typeItInstead(retryLabel === undefined ? 'primary' : 'ghost')}
            </div>
          </>
        )}
      </div>

      {/* ONE REGION, so a second sentence REPLACES the first rather than
          appearing beneath it — one line of commentary, changing, not a
          growing list of advice. */}
      {mode === 'live' && notice !== undefined && (
        <p className="musy-scanner__status" role="status">{notice}</p>
      )}
    </div>
  );
}
