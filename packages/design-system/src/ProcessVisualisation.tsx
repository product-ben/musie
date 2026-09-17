/**
 * Process Visualisation — Layer 2
 * base-ui: Separator (`@base-ui/react/separator`) for the divider line.
 *
 * No APG pattern exists — it is not interactive, not a widget, not a navigation
 * structure, so base-ui has no primitive for the whole. Semantic HTML: <ol>,
 * because the steps are ordered and the order IS the content. Separator is the
 * one part base-ui does own: it renders the correct role and orientation for a
 * decorative rule, which is easy to get wrong by hand.
 *
 * Not a carousel, not a stepper, not a progress indicator — nothing here
 * tracks where the user currently is.
 */
import * as React from 'react';
import { Separator } from '@base-ui/react/separator';
import { ArrowDown } from 'lucide-react';
import { Icon } from './Icon';
import type { LucideIcon } from 'lucide-react';
import type { TypeStep } from './ContentBox';

export interface ProcessStep {
  glyph: LucideIcon;
  title: string;
  /** Optional supporting sentence. */
  body?: string;
}

export interface ProcessVisualisationProps {
  /** Accessible name for the list. */
  label: string;
  steps: ProcessStep[];
  /** Show "Schritt 1" style ordinals above each title. On by default: the
   *  visible number is what a group reading together points at. */
  showOrdinals?: boolean;
  /** Localised ordinal prefix. */
  ordinalPrefix?: string;
  titleStep?: TypeStep;
  bodyStep?: TypeStep;
  className?: string;
}

export function ProcessVisualisation({
  label, steps, showOrdinals = true, ordinalPrefix = 'Schritt',
  titleStep = 'heading-sm', bodyStep = 'body-md', className,
}: ProcessVisualisationProps) {
  return (
    <ol className={['musy-process', className ?? ''].filter(Boolean).join(' ')} aria-label={label}>
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <li className="musy-process__step">
            <span className="musy-process__badge">
              <Icon glyph={step.glyph} size="lg" />
            </span>
            <span className="musy-process__text">
              {showOrdinals && (
                <span className="musy-process__ordinal">{ordinalPrefix} {i + 1}</span>
              )}
              <h3 className="musy-process__title" data-type-step={titleStep}>{step.title}</h3>
              {step.body && (
                <p className="musy-process__body" data-type-step={bodyStep}>{step.body}</p>
              )}
            </span>
          </li>
          {i < steps.length - 1 && (
            /* aria-hidden: the <ol> already conveys sequence and position, so
               announcing an arrow between every step is pure noise. */
            <li className="musy-process__divider" aria-hidden="true">
              <Separator orientation="vertical" className="musy-process__divider-line" />
              <Icon glyph={ArrowDown} size="md" />
            </li>
          )}
        </React.Fragment>
      ))}
    </ol>
  );
}
