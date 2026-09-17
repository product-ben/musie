/**
 * Icon — Layer 2
 * Decision 1: STATIC Lucide is the default. Animation is a per-component
 * opt-in gated by BOTH a user setting and prefers-reduced-motion; it is never
 * a default and it is never implicit.
 *
 * base-ui has no Icon primitive — an icon is not a behaviour. It is built on
 * base-ui's `useRender` instead, so it accepts the same `render` composition
 * prop as every other component in the set and stays consistent to use.
 *
 * PROVISIONAL: size="sm" consumes --icon-stroke-sm (token gap G1).
 */
import * as React from 'react';
import { useRender } from '@base-ui/react/use-render';
import type { LucideIcon } from 'lucide-react';

export type IconSize = 'sm' | 'md' | 'lg' | 'xl';
export type IconTone =
  | 'inherit' | 'muted' | 'strong' | 'primary'
  | 'info' | 'warning' | 'success' | 'error';

export interface IconProps {
  /** Any static Lucide component. Pass the component, not a name string —
   *  a name string forces the whole icon set into the bundle. */
  glyph: LucideIcon;
  size?: IconSize;
  tone?: IconTone;
  /** Accessible name. Omit for a decorative icon: the icon is then
   *  aria-hidden and the adjacent text carries the meaning. */
  label?: string;
  /** True when the icon sits next to text — applies --icon-optical-nudge. */
  inline?: boolean;
  /**
   * Animated variant opt-in. Requires the user setting to be on AND
   * prefers-reduced-motion to be no-preference; the CSS removes the
   * transition under reduced motion regardless of what is passed here.
   * Leave undefined for every ordinary use.
   */
  animate?: boolean;
  className?: string;
  /** base-ui composition: replace or wrap the rendered element. */
  render?: useRender.RenderProp;
}

export function Icon({
  glyph: Glyph, size = 'md', tone = 'inherit', label,
  inline = false, animate, className, render,
}: IconProps) {
  const classes = [
    'musy-icon',
    `musy-icon--${size}`,
    tone !== 'inherit' ? `musy-icon--${tone}` : '',
    inline ? 'musy-icon--inline' : '',
    className ?? '',
  ].filter(Boolean).join(' ');

  return useRender({
    render: render ?? <Glyph />,
    props: {
      className: classes,
      'data-animate': animate ? 'on' : undefined,
      'aria-hidden': label ? undefined : true,
      role: label ? 'img' : undefined,
      'aria-label': label,
      focusable: 'false',
      /* Size and stroke come from CSS custom properties, so the SVG's own
         width/height/stroke-width attributes must not compete with them. */
      width: undefined,
      height: undefined,
      strokeWidth: undefined,
    },
  });
}
