/**
 * Logo — Layer 2  [LOCKED]
 * base-ui has no logo primitive. Semantic HTML: <img> with alt when it is the
 * only naming of the product; aria-hidden + adjacent text when a wordmark is
 * rendered beside it. Built on base-ui's `useRender` so the wrapper can be
 * composed — which is how the app turns it into a home link without this
 * component knowing about routing.
 *
 * One asset, both themes (per the brief: no distinct dark-mode asset needed —
 * the mark is a full-colour illustration, so Layer 1's surface tokens carry the
 * contrast around it rather than through it).
 *
 * Sizes: nav 24px (--icon-size-lg), splash 96px (--icon-size-xl * 3).
 * The default src is the WEB rendition (192px wide, 2x the splash size). The
 * 1217px Figma original lives at /assets/source/ for handoff — it must never be
 * the src: a 601 KB bitmap decoded at 24px is pure cost.
 * NOT a home link — wrapping it in an anchor is the consuming app's job.
 */
import * as React from 'react';
import { useRender } from '@base-ui/react/use-render';

export type LogoSize = 'nav' | 'splash';

export interface LogoProps {
  size?: LogoSize;
  /** Show the "Musy" wordmark next to (nav) or under (splash) the mark. */
  showWordmark?: boolean;
  /** Accessible name. Set to '' only when adjacent text already names it. */
  alt?: string;
  src?: string;
  className?: string;
  /** base-ui composition — e.g. render={<Link href="/" />} for a home link. */
  render?: useRender.RenderProp;
}

export function Logo({
  size = 'nav', showWordmark = false, alt = 'Musy',
  src = '/assets/web/musy-logo.png', className, render,
}: LogoProps) {
  const named = showWordmark ? '' : alt;
  return useRender({
    render: render ?? <span />,
    props: {
      className: [
        'musy-logo',
        size === 'splash' ? 'musy-logo--splash' : '',
        className ?? '',
      ].filter(Boolean).join(' '),
      children: (
        <>
          <img className="musy-logo__mark" src={src} alt={named}
               aria-hidden={named === '' ? true : undefined} />
          {showWordmark && <span className="musy-logo__wordmark">{alt}</span>}
        </>
      ),
    },
  });
}
