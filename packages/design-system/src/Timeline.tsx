/**
 * Timeline — Layer 2
 *
 * Groups a list under headings. Typically by date, but it does not know that:
 * a group is an id, a label and whatever the consumer puts beneath it.
 * Deliberately basic — Phase G.1 draws the real timeline.
 *
 * IT NEVER FORMATS A DATE. The consumer passes `label: '14 September'`, already
 * formatted. Formatting a date is locale work: it needs the active locale, the
 * app's Intl options, "today" / "yesterday" relative wording and the German
 * conventions in docs/GERMAN-UI-WRITING.md — none of which this package has or
 * should have. A design system that formatted dates would be making a copy
 * decision on the app's behalf, in whichever language it happened to be built
 * with. The boundary sits here for the same reason the router boundary sits at
 * LinkList's `render` prop.
 *
 * TWO COMPONENTS, NOT ONE. Timeline groups; LinkList is a list of destinations.
 * Keeping them apart means Phase G.1 can grow a real timeline — a rail, a
 * marker per group, sticky headings — without unpicking the diary row, and a
 * screen can group something that is not a link list at all.
 *
 * `<ol>`, not `<ul>`: the sequence of groups IS the meaning, which is the same
 * test DraggableList applies to its own `<ol>`. Markers are off per L3 — each
 * group states its own date, so an ordinal would be noise. `aria-label` is
 * exposed because `<ol>` has an implicit `list` role.
 *
 * NO EMPTY STATE, ON PURPOSE. Zero groups renders nothing. An empty timeline is
 * not a thing a user should read a sentence about — the emptiness belongs to
 * the list inside it, and LinkList's required `emptyLabel` already owns that
 * sentence. A screen with nothing to show renders the empty LinkList, not an
 * empty Timeline. That also keeps every user-visible string on this component
 * at zero, so there is no default copy here to leak a language.
 */
import * as React from 'react';
import type { HeadingLevel } from './ContentBox';

export interface TimelineGroup {
  /** Stable identity. The React key. */
  id: string;
  /** The group heading, ALREADY FORMATTED — '14 September', 'Heute'. This
   *  component never formats a date. */
  label: string;
  /** Whatever belongs under that heading. Usually one LinkList. */
  children: React.ReactNode;
}

export interface TimelineProps {
  /** Accessible name for the whole run of groups. Required — never defaulted. */
  label: string;
  groups: TimelineGroup[];
  /**
   * Heading level for the group headings, so they land in the right place in
   * the document outline. Defaults to 3, matching ContentBox — a screen whose
   * timeline sits directly under the page title should pass 2.
   */
  headingLevel?: HeadingLevel;
  className?: string;
}

export function Timeline({ label, groups, headingLevel = 3, className }: TimelineProps) {
  if (groups.length === 0) return null;
  const H = `h${headingLevel}` as 'h2';
  return (
    <ol className={['musy-timeline', className ?? ''].filter(Boolean).join(' ')} aria-label={label}>
      {groups.map((group) => (
        <li key={group.id} className="musy-timeline__group">
          <H className="musy-timeline__heading" data-type-step="heading-sm">{group.label}</H>
          <div className="musy-timeline__body">{group.children}</div>
        </li>
      ))}
    </ol>
  );
}
