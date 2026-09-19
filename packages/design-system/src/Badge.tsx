/**
 * Badge — Layer 2
 * No APG pattern and no base-ui primitive, because there is no behaviour to
 * borrow: a badge is a <span> with a fill. That is the point. The component
 * exists to stop eight different inline-styled pills appearing across the app,
 * not to add interaction.
 *
 * NOT A CONTROL. There is no onClick, deliberately. A pressable badge is a
 * Button (2.5.8 target size, focus ring, role) and a removable one is a Chip;
 * exposing onClick here would let either be built by accident, as a <span>
 * with no role and no keyboard path — a 4.1.2 failure that looks fine in a
 * screenshot. See open question 22.
 *
 * 1.4.1 — the status variants never rely on their fill. Each renders a glyph,
 * a screen-reader-only status word, and the visible label; the fill is the
 * fourth cue, not the first.
 */
import * as React from 'react';
import { Info, TriangleAlert, CircleCheck, CircleX } from 'lucide-react';
import { Icon } from './Icon';
import { useMusyText } from './locale';
import type { MusyStatusKey } from './locale';
import type { LucideIcon } from 'lucide-react';

export type BadgeVariant =
  | 'neutral' | 'outline'
  | 'primary' | 'primary-subtle'
  | 'accent' | 'accent-alt'
  | 'info' | 'warning' | 'success' | 'error';

const STATUS_GLYPH: Partial<Record<BadgeVariant, LucideIcon>> = {
  info: Info, warning: TriangleAlert, success: CircleCheck, error: CircleX,
};

/** Read BEFORE the label, so the announcement is "Warnung: Deck fehlt" and not
 *  "Deck fehlt" with the severity living in a colour nobody can hear.
 *
 *  This word used to be a hardcoded German record with no prop, which meant an
 *  English screen announced "Fehler: ..." and no amount of care in the app
 *  could reach it. It now comes from the locale catalogue (src/locale.ts) and
 *  can be overridden per badge with `statusWord`. */
const STATUS_WORD_KEY: Partial<Record<BadgeVariant, MusyStatusKey>> = {
  info: 'statusInfo', warning: 'statusWarning', success: 'statusSuccess', error: 'statusError',
};

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  /** Leading glyph. Status variants supply their own; pass this to override,
   *  or on a non-status variant to mark what the badge counts or measures. */
  glyph?: LucideIcon;
  /** Suppress the icon entirely, including a status variant's default. The
   *  status WORD stays, so 1.4.1 still holds — this drops a cue, not the only
   *  one. Correct for a dense row where four glyphs read as noise. */
  hideIcon?: boolean;
  /** The screen-reader status word on a status variant. Defaults to the
   *  locale catalogue's word for that variant. */
  statusWord?: string;
  className?: string;
  id?: string;
}

export function Badge({
  children, variant = 'neutral', glyph, hideIcon = false, statusWord, className, id,
}: BadgeProps) {
  const t = useMusyText();
  const resolved = glyph ?? STATUS_GLYPH[variant];
  const key = STATUS_WORD_KEY[variant];
  const word = statusWord ?? (key ? t[key] : undefined);

  return (
    <span
      id={id}
      className={['musy-badge', `musy-badge--${variant}`, className ?? ''].filter(Boolean).join(' ')}
    >
      {/* Decorative: the status word below is what a screen reader gets. */}
      {resolved && !hideIcon ? <Icon glyph={resolved} size="sm" /> : null}
      {word ? <span className="musy-sr-only">{word}: </span> : null}
      {children}
    </span>
  );
}

/** A wrapping row of badges. A <ul> when the badges are a list of facts about
 *  one thing, which is the common case — otherwise a screen reader gets a run
 *  of unrelated words with no count. */
export function BadgeRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <ul className={['musy-badge-row', className ?? ''].filter(Boolean).join(' ')}>
      {React.Children.map(children, (c, i) => <li key={i}>{c}</li>)}
    </ul>
  );
}
