/**
 * Content List — Layer 2
 * No APG pattern, and base-ui has no description-list primitive. Semantic HTML:
 * <dl> — each row is a de-emphasised term and its content, which is the
 * definition of a description list. Not a <ul> (the label/content pairing would
 * be lost) and not a <table> (one value column, so nothing to cross-reference).
 * Row rules use base-ui's Separator rather than a border, so the rule carries
 * the right role instead of being invisible to AT by accident.
 *
 * Per-item media is optional. An "animation" item follows Decision 1: static by
 * default, animated only when the consuming app passes an already-gated node.
 */
import * as React from 'react';
import { Separator } from '@base-ui/react/separator';
import type { TypeStep } from './ContentBox';

export interface ContentListItem {
  /** The de-emphasised label — on-surface-muted / body-sm territory. */
  label: string;
  /** The content. A string, or arbitrary nodes for richer rows. */
  content: React.ReactNode;
  /** Optional media. alt is required when src is given: these sit next to
   *  meaning-bearing labels, so a decorative image would be a lie. */
  media?: { src: string; alt: string } | { node: React.ReactNode };
  /**
   * A list as the row's content. Real <ul>/<ol> markup, so the count and the
   * sequence are conveyed to AT rather than drawn. Use ordered ONLY when the
   * order is the meaning (steps); an unordered set of facts is a bullet list.
   * Renders after `content`, so a row can have a lead-in line and a list.
   */
  list?: { ordered?: boolean; items: React.ReactNode[] };
}

export interface ContentListProps {
  /** Accessible name for the list. */
  label?: string;
  items: ContentListItem[];
  contentStep?: TypeStep;
  emptyLabel?: string;
  className?: string;
}

export function ContentList({
  label, items, contentStep = 'body-md',
  emptyLabel = 'Noch keine Einträge', className,
}: ContentListProps) {
  if (items.length === 0) {
    return <p className="musy-clist__empty" data-type-step="body-md">{emptyLabel}</p>;
  }
  return (
    <dl className={['musy-clist', className ?? ''].filter(Boolean).join(' ')} aria-label={label}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <div className="musy-clist__row">
            <dt className="musy-clist__term">{item.label}</dt>
            <dd className="musy-clist__def" data-type-step={contentStep}>
              {item.media && (
                <div className="musy-clist__media">
                  {'src' in item.media
                    ? <img src={item.media.src} alt={item.media.alt} />
                    : item.media.node}
                </div>
              )}
              {item.content}
              {item.list && (
                item.list.ordered
                  ? <ol className="musy-clist__numbers">
                      {item.list.items.map((li, j) => <li key={j}>{li}</li>)}
                    </ol>
                  : <ul className="musy-clist__bullets">
                      {item.list.items.map((li, j) => <li key={j}>{li}</li>)}
                    </ul>
              )}
            </dd>
          </div>
          {i < items.length - 1 && <Separator className="musy-clist__rule" />}
        </React.Fragment>
      ))}
    </dl>
  );
}
