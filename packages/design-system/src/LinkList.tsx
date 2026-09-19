/**
 * Link List — Layer 2
 *
 * A list of DESTINATIONS. Every row is one hit target, and the element that
 * makes the row navigable comes from the consumer through the item's `render`
 * prop. Deliberately basic: the bones are correct, the visual detail lands in
 * Phase G.1.
 *
 * WHY IT EXISTS. Nothing in the set was a navigable list row. RadioCards is a
 * radio — an interactive control inside a radio's label is a nested control
 * (4.1.2) and a link there is not permitted, so a card that navigates cannot be
 * a RadioCard. ContentList is a non-interactive `<dl>` of term/definition
 * pairs. ContentBox is clickable only by replacing the whole `<article>` through
 * `render`, which makes ONE box a link, not a list of them. This component is
 * the missing third thing.
 *
 * No APG pattern. A run of links is content, not a widget: there is no roving
 * tabindex and no arrow-key handling, because each row is its own tab stop and
 * that is what a list of links is. Adding `role="listbox"` or a composite
 * widget's keyboard model would promise a selection this list does not hold.
 *
 * L3 — a real `<ul>` of `<li>`. The count and each position reach assistive
 * tech instead of being drawn. `aria-label` is honest here in a way it is not
 * on ContentList's `<dl>`: `<ul>` has an implicit `list` role, so a bare
 * `aria-label` on it is exposed.
 *
 * THE `render` PROP IS THE ROUTER BOUNDARY. This package must never import
 * react-router — that is the entire reason `render` exists. A screen writes
 * `render={<Link to="/diary/abc" />}` and the row becomes that element, built
 * on base-ui's `useRender` exactly as ContentBox is. An item with no `render`
 * is a static row, which is legal and inert: nothing here fabricates an anchor
 * without a destination.
 *
 * TARGET SIZE. The whole row is the target and it is `--target-primary` (44px)
 * at every pointer, so there is nothing for L5's pointer split to choose
 * between — `useCoarsePointer` exists to pick 24px vs 44px for an icon button
 * inside a card, and a row that is already 44px on a fine pointer has no
 * smaller rung to take. No `size` prop, and no media query.
 *
 * TYPE STEPS ARE FIXED, not props. The headline is `label-lg`: the same size as
 * `body-md` (17→18px, L8's floor) at weight 500, so the row reads as emphasised
 * without dropping below the floor. `label-md` and `body-sm` are barred from
 * essential prose by Layer 1 §4, which is why neither carries the headline.
 * `meta` is `body-sm` — L8's captions / counts / timestamps row. If a consumer
 * needs essential prose in a row, it belongs in the headline.
 *
 * EVERY USER-VISIBLE STRING IS A REQUIRED PROP. `label` and `emptyLabel` have
 * no defaults. The older components in this package ship a mix of German and
 * English defaults, and one leaked default makes a screen half-German whatever
 * the locale says; a required prop cannot leak the wrong language.
 */
import * as React from 'react';
import { useRender } from '@base-ui/react/use-render';
import type { HeadingLevel } from './ContentBox';

export interface LinkListItem {
  /** Stable identity. The React key, and the row's handle for the consumer. */
  id: string;
  /** The row's own line. Rendered at `label-lg`. */
  headline: string;
  /** Supporting lines under the headline — a date, a duration, a count. Pass
   *  each line as its own element: the slot is a column, so two or three
   *  siblings stack at `--sp-1` rather than running together. */
  meta?: React.ReactNode;
  /** Optional thumbnail. `alt` is required when `src` is given: these sit
   *  beside a meaning-bearing headline, so a decorative image would be a lie.
   *  Mirrors ContentList's media shape. */
  media?: { src: string; alt: string } | { node: React.ReactNode };
  /** base-ui composition: what the row IS. `render={<Link to="/diary/abc" />}`
   *  makes the whole row navigable. Omitted, the row is a static `<div>`. */
  render?: useRender.RenderProp;
}

export interface LinkListProps {
  /** Accessible name for the list. Required — never defaulted. */
  label: string;
  items: LinkListItem[];
  /** Rendered as a paragraph instead of an empty `<ul>`. Required — never
   *  defaulted, so the empty state cannot arrive in the wrong language. */
  emptyLabel: string;
  /**
   * Render every row's headline as this heading level instead of a `<span>`.
   * NO DEFAULT, and not guessed: thirty diary rows as thirty headings is an
   * outline nobody can use, and when headings ARE wanted the correct level
   * depends on what sits above the list — a Timeline group heading at level 3
   * makes its rows level 4. Omit it unless a screen has decided.
   */
  headingLevel?: HeadingLevel;
  className?: string;
}

/** One row. A component rather than an inline map body because `useRender` is a
 *  hook and cannot be called in a loop. */
function LinkListRow({ item, headingLevel }: {
  item: LinkListItem;
  headingLevel?: HeadingLevel;
}) {
  /* A heading is only ever an element the caller asked for; otherwise a span,
     which adds nothing to the document outline. */
  const Headline = (headingLevel ? `h${headingLevel}` : 'span') as 'h2';
  return useRender({
    /* No `render` ⇒ a plain block. A static row, not a destination with no
       address. `musy-focusable` is the SHARED PRIMITIVES block's single focus
       indicator, which only resolves on something that can take
       :focus-visible. */
    render: item.render ?? <div />,
    props: {
      className: 'musy-llist__row musy-focusable',
      children: (
        <>
          {item.media && (
            <div className="musy-llist__media">
              {'src' in item.media
                ? <img src={item.media.src} alt={item.media.alt} />
                : item.media.node}
            </div>
          )}
          <div className="musy-llist__text">
            <Headline className="musy-llist__headline" data-type-step="label-lg">
              {item.headline}
            </Headline>
            {item.meta && (
              <div className="musy-llist__meta" data-type-step="body-sm">{item.meta}</div>
            )}
          </div>
        </>
      ),
    },
  });
}

export function LinkList({
  label, items, emptyLabel, headingLevel, className,
}: LinkListProps) {
  if (items.length === 0) {
    /* A paragraph, not an empty <ul>: a labelled list announcing "0 items"
       says less than the sentence does, and a list holding the empty message
       as its one <li> would announce a count that is a lie. The list's
       accessible name is not carried into this branch — the same open question
       ContentList already has, deliberately not re-decided here. */
    return (
      <p
        className={['musy-llist__empty', className ?? ''].filter(Boolean).join(' ')}
        data-type-step="body-md"
      >
        {emptyLabel}
      </p>
    );
  }
  return (
    <ul className={['musy-llist', className ?? ''].filter(Boolean).join(' ')} aria-label={label}>
      {items.map((item) => (
        <li key={item.id} className="musy-llist__item">
          <LinkListRow item={item} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
