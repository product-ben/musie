/**
 * Message — Layer 2
 * No APG pattern for the container, and base-ui has no inline-message primitive:
 * its Toast is a different pattern (portaled, queued, auto-dismissing), so the
 * CONTAINER is semantic HTML — a <div> carrying an ARIA live region. The one
 * interactive part, the dismiss control, is base-ui's Button.
 *
 * Every variant is surface + border + icon + text. There is no solid variant
 * (Layer 1 §2 consolidation) and no colour-only state (1.4.1).
 *
 * LIVE REGIONS — the one thing this component can get dangerously wrong.
 * \`live\` is EXPLICIT, never inferred from variant:
 *   'assertive' → role="alert". Correct ONLY for a message injected after load.
 *   'polite'    → role="status". Non-urgent updates.
 *   'off'       → no live region. Correct for a message present in the initial
 *                 markup — role="alert" on load announces on every page load,
 *                 which trains users to ignore alerts.
 * The default is 'off' precisely so a statically rendered error cannot become a
 * false announcement by accident. See open question 16.
 */
import * as React from 'react';
import { Button } from '@base-ui/react/button';
import { Info, TriangleAlert, CircleCheck, CircleX, X } from 'lucide-react';
import { Icon } from './Icon';
import type { LucideIcon } from 'lucide-react';
import type { TypeStep, HeadingLevel } from './ContentBox';

export type MessageVariant = 'info' | 'warning' | 'success' | 'error';
export type MessageLive = 'off' | 'polite' | 'assertive';

const GLYPH: Record<MessageVariant, LucideIcon> = {
  info: Info, warning: TriangleAlert, success: CircleCheck, error: CircleX,
};

/** Icon-only status is a 1.4.1 failure, so each variant also carries a word.
 *  German, matching the app's primary language. */
const STATUS_WORD: Record<MessageVariant, string> = {
  info: 'Hinweis', warning: 'Warnung', success: 'Erfolg', error: 'Fehler',
};

export interface MessageProps {
  variant: MessageVariant;
  headline: string;
  headlineStep?: TypeStep;
  headingLevel?: HeadingLevel;
  text?: string;
  textStep?: TypeStep;
  /** Exactly one action. Two actions means this is a dialog, not a message. */
  action?: React.ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  live?: MessageLive;
  /** Animate the entrance. Travel comes from --motion-travel-sm, so reduced
   *  motion flattens it without a component branch. */
  entering?: boolean;
  id?: string;
  className?: string;
}

export function Message({
  variant, headline, headlineStep = 'heading-sm', headingLevel = 3,
  text, textStep = 'body-md', action, onDismiss,
  dismissLabel = 'Meldung schließen', live = 'off', entering = false,
  id, className,
}: MessageProps) {
  const H = `h${headingLevel}` as 'h3';
  const role = live === 'assertive' ? 'alert' : live === 'polite' ? 'status' : undefined;

  return (
    <div
      id={id}
      className={['musy-msg', `musy-msg--${variant}`, className ?? ''].filter(Boolean).join(' ')}
      role={role}
      aria-live={live === 'off' ? undefined : live}
      data-entering={entering ? '' : undefined}
    >
      <span className="musy-msg__icon">
        {/* The icon is decorative; the status WORD below is what carries the
            variant to a screen reader, so the meaning never depends on an
            icon's alt text being read. */}
        <Icon glyph={GLYPH[variant]} size="md" />
      </span>
      <div className="musy-msg__main">
        <H className="musy-msg__headline" data-type-step={headlineStep}>
          <span className="musy-sr-only">{STATUS_WORD[variant]}: </span>
          {headline}
        </H>
        {text && <p className="musy-msg__text" data-type-step={textStep}>{text}</p>}
        {action && <div className="musy-msg__action">{action}</div>}
      </div>
      {onDismiss ? (
        <Button className="musy-msg__dismiss" onClick={onDismiss} aria-label={dismissLabel}>
          <Icon glyph={X} size="md" />
        </Button>
      ) : <span />}
    </div>
  );
}
