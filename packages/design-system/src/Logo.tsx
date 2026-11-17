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
 * 1217px Figma original ships beside it at assets/musy-logo.png — it must never
 * be the src: a 601 KB bitmap decoded at 24px is pure cost. There is no
 * assets/source/; this comment claimed one until 2026-10-13.
 * NOT a home link — wrapping it in an anchor is the consuming app's job.
 *
 * ── THE FLAT MARK · Ben, 2026-11-17 ──────────────────────────────────────
 * `variant="flat"` is the one-colour mark from Figma's *Einsteigen · Bodyscan
 * · 17.11.* page (the `logo` symbol, 194:16546), drawn for the minimal nav
 * pill. The lock is broken on Ben's call, and only by ADDING: `colour`, the
 * default, renders exactly what it rendered before.
 *
 * INLINE SVG IN `currentColor`, NOT A SECOND IMAGE FILE. The Figma export
 * fills it with #1A1F1C, which is `--on-surface` in the light theme — and an
 * <img> of that file would vanish on the dark theme's surface. The paths below
 * are the export's own, copied verbatim; only the fill became `currentColor`,
 * so the mark takes the wordmark's ink in every theme and CanvasText under
 * forced colours, with no override of its own.
 *
 * The flat lockup is the label-lg wordmark and a 20px mark (--icon-size-md) —
 * the pill's numbers, in musy-components.css §12. `src` is ignored: there is
 * no file to point at.
 */
import * as React from 'react';
import { useRender } from '@base-ui/react/use-render';

export type LogoSize = 'nav' | 'splash';

export type LogoVariant = 'colour' | 'flat';

export interface LogoProps {
  size?: LogoSize;
  /** `colour` is the full-colour bitmap; `flat` the one-colour vector mark. */
  variant?: LogoVariant;
  /** Show the "Musy" wordmark next to (nav) or under (splash) the mark. */
  showWordmark?: boolean;
  /** Accessible name. Set to '' only when adjacent text already names it. */
  alt?: string;
  /** The bitmap for `colour`. Ignored by `flat`, which is drawn inline. */
  src?: string;
  className?: string;
  /** base-ui composition — e.g. render={<Link href="/" />} for a home link. */
  render?: useRender.RenderProp;
}

/* The `logo` symbol's three paths, verbatim from the Figma export. */
function FlatMark({ named }: { named: string }) {
  return (
    <svg
      className="musy-logo__mark"
      viewBox="0 0 21 21"
      overflow="visible"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      role={named === '' ? undefined : 'img'}
      aria-label={named === '' ? undefined : named}
      aria-hidden={named === '' ? true : undefined}
      focusable="false"
    >
      <path d="M16.1842 8.13967C16.0672 8.9624 16.1086 9.92098 16.0632 10.7569C16.0331 11.3089 15.9791 11.8536 15.9481 12.4022C15.8375 14.3613 15.4451 16.4327 14.0244 17.8926C12.4586 19.4941 10.3316 20.0721 8.14342 19.8717C6.7433 19.7434 5.47577 19.2821 4.43773 18.2937C3.58099 17.478 3.10158 16.4266 2.9748 15.2586C2.94213 14.9428 2.86765 14.6163 2.87105 14.2942C2.87187 13.0741 2.86818 11.8551 2.85795 10.6352L2.8494 9.34352C2.84542 8.86345 2.79614 8.43336 2.98239 7.97893C3.43385 6.87731 5.12322 6.87278 5.56488 7.98029C5.7426 8.426 5.70896 9.22017 5.71573 9.71342C5.72654 11.0297 5.70113 12.3412 5.75299 13.6572C5.77687 14.5044 5.8306 15.5349 6.51217 16.1478C7.62648 17.1497 9.45084 17.1918 10.7577 16.6032C11.5849 16.2248 12.2204 15.5231 12.5152 14.6625C12.6788 14.1838 12.7629 13.5614 12.8264 13.0558C12.9958 11.7123 12.9634 10.3326 13.0979 8.98759C13.1593 8.37361 13.1307 7.19652 13.3448 6.6257C13.4134 6.44813 13.5183 6.28685 13.6529 6.15226C14.4232 5.37514 15.6592 5.65737 16.0642 6.6691C16.2417 7.11231 16.1856 7.63701 16.1844 8.11125L16.1842 8.13967Z" />
      <path d="M9.5555 1.83483C10.611 1.73184 10.9363 2.8203 10.4938 3.63015C9.92683 4.66784 8.99463 5.40621 7.85694 5.76284C6.60182 6.15786 5.24131 6.03939 4.07337 5.43338C3.39829 5.08594 2.41215 4.32893 2.98949 3.43645C3.46039 2.70853 4.41499 3.24817 5.00184 3.4351C5.34163 3.54334 5.94079 3.57433 6.29865 3.56061C7.19328 3.52076 7.95041 3.1128 8.59602 2.51176C8.94227 2.18937 9.07215 1.93731 9.5555 1.83483Z" />
      <path d="M18.3747 0.0120985C18.5873 -0.0108969 18.7773 -0.00963974 18.9713 0.0930654C19.6798 0.468272 19.6416 1.19163 19.3324 1.80223C18.2692 3.90149 15.5275 4.7208 13.4347 3.71573C12.8571 3.43192 12.1784 3.03055 12.2561 2.28174C12.2654 2.19194 12.2907 2.10624 12.3302 2.02521C12.413 1.85799 12.5439 1.71936 12.706 1.62707C13.2511 1.32391 13.8168 1.70845 14.343 1.82464C14.6498 1.8924 15.1246 1.89739 15.4364 1.85516C16.2329 1.74727 16.9293 1.31605 17.4801 0.744601C17.8324 0.379074 17.8794 0.179118 18.3747 0.0120985Z" />
    </svg>
  );
}

export function Logo({
  size = 'nav', variant = 'colour', showWordmark = false, alt = 'Musy',
  src = '/assets/web/musy-logo.png', className, render,
}: LogoProps) {
  const named = showWordmark ? '' : alt;
  return useRender({
    render: render ?? <span />,
    props: {
      className: [
        'musy-logo',
        size === 'splash' ? 'musy-logo--splash' : '',
        variant === 'flat' ? 'musy-logo--flat' : '',
        className ?? '',
      ].filter(Boolean).join(' '),
      children: (
        <>
          {variant === 'flat'
            ? <FlatMark named={named} />
            : <img className="musy-logo__mark" src={src} alt={named}
                   aria-hidden={named === '' ? true : undefined} />}
          {showWordmark && <span className="musy-logo__wordmark">{alt}</span>}
        </>
      ),
    },
  });
}
