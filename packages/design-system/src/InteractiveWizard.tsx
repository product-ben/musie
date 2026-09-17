/**
 * Interactive Wizard — Layer 2 · §7.17
 * The interactive sibling of §7.8 Process Visualisation: same step geometry,
 * but each step is a real <button> inside <nav><ol>, and the step on screen
 * carries `aria-current="step"`. Process Visualisation deliberately has no
 * current-step state — that is this component, and keeping them apart is what
 * stops a non-interactive explainer from growing a tap affordance.
 *
 * No APG pattern and no base-ui primitive: a wizard is navigation, so it is a
 * <nav> containing an ordered list of buttons. Roving focus is NOT applied —
 * these are links-in-spirit, every one is a tab stop, which is what a user
 * expects from a navigation region.
 *
 * REACHABILITY IS THE COMPONENT'S RULE, not the consumer's: every completed
 * step stays reachable, so going back is always allowed; the only unreachable
 * step is one whose predecessors are unfinished. That rule lives here so two
 * screens cannot disagree about it.
 *
 * Four states, and they are a progression rather than a palette:
 *   disabled → active → selected → completed
 * Selection changes the marker FILL and the label WEIGHT; completion changes
 * the GLYPH (number → check). No state rests on hue (1.4.1).
 *
 * Narrow screens COLLAPSE rather than stack: the step on screen keeps its
 * label, every other step shrinks to its marker. The hidden labels are moved
 * out of sight, not removed, so a marker-only step still announces its name.
 */
import * as React from 'react';
import { Check } from 'lucide-react';
import { Icon } from './Icon';

export type WizardStepState = 'disabled' | 'active' | 'selected' | 'completed';

export interface WizardStep {
  id: string;
  label: string;
}

/** The state word appended under each label. Localised by the consumer; the
 *  defaults are English because the prototype ships English first. */
export interface WizardStateWords {
  disabled: string;
  active: string;
  selected: string;
  completed: string;
}

const DEFAULT_STATE_WORDS: WizardStateWords = {
  disabled: 'locked',
  active: 'available',
  selected: 'current',
  completed: 'done',
};

/** The three solved accent families, named verbatim per Decision 3. */
export type WizardAccent = 'primary' | 'accent-placeholder1' | 'accent-placeholder2';

export interface InteractiveWizardProps {
  /** Names the navigation region. Required (4.1.2). */
  label: string;
  steps: WizardStep[];
  /** id of the step on screen. */
  current: string;
  /** ids of finished steps. A completed step is always reachable. */
  completed?: string[];
  onStepChange?: (id: string) => void;
  /** Opt-in label-first stacking. Narrow screens collapse instead — see above. */
  vertical?: boolean;
  /** Force the collapsed run inside a narrow container, which no media query
   *  can see. */
  compact?: boolean;
  /** Hide the state word under each label. */
  showStateWords?: boolean;
  stateWords?: Partial<WizardStateWords>;
  /**
   * Which solved accent family paints the markers, the current label and the
   * completed connectors. Whole families, not a hue swap: ocher and purple are
   * LIGHT solids and take dark ink where terracotta is a dark solid and takes
   * light ink, so `-on` travels with `-subtle` or the selected marker's number
   * fails 1.4.3. Which of the three a screen should use is still undefined —
   * conflict B12, open question 7.
   */
  accent?: WizardAccent;
  className?: string;
}

export function InteractiveWizard({
  label, steps, current, completed = [], onStepChange,
  vertical = false, compact = false,
  showStateWords = true, stateWords, accent = 'primary', className,
}: InteractiveWizardProps) {
  const words = { ...DEFAULT_STATE_WORDS, ...stateWords };
  const done = React.useMemo(() => new Set(completed), [completed]);

  /** A step is reachable when it is the current one, when it is completed, or
   *  when every step before it is completed. */
  const stateOf = (step: WizardStep, index: number): WizardStepState => {
    if (step.id === current) return 'selected';
    if (done.has(step.id)) return 'completed';
    const predecessorsDone = steps.slice(0, index).every((s) => done.has(s.id));
    return predecessorsDone ? 'active' : 'disabled';
  };

  return (
    <nav
      className={[
        'musy-wizard',
        accent !== 'primary' ? `musy-wizard--${accent}` : '',
        vertical ? 'musy-wizard--vertical' : '',
        compact ? 'musy-wizard--compact' : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      aria-label={label}
    >
      <ol className="musy-wizard__list">
        {steps.map((step, i) => {
          const state = stateOf(step, i);
          const isLast = i === steps.length - 1;
          return (
            <li className="musy-wizard__step" key={step.id}>
              <button
                type="button"
                className="musy-wizard__trigger"
                data-state={state}
                aria-current={step.id === current ? 'step' : undefined}
                disabled={state === 'disabled'}
                onClick={() => onStepChange?.(step.id)}
              >
                {/* The number and the check are siblings; the state decides
                    which one shows, so a completed step never re-renders its
                    marker from a different tree. */}
                <span className="musy-wizard__marker" aria-hidden="true">
                  <span className="musy-wizard__num">{i + 1}</span>
                  <span className="musy-wizard__check"><Icon glyph={Check} size="sm" /></span>
                </span>
                <span className="musy-wizard__label">
                  {step.label}
                  {showStateWords && (
                    <span className="musy-wizard__hint">{words[state]}</span>
                  )}
                </span>
              </button>
              {!isLast && (
                <span
                  className="musy-wizard__connector"
                  data-complete={done.has(step.id) ? '' : undefined}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export interface WizardPanelProps {
  children: React.ReactNode;
  /** The action row below the panel body. */
  actions?: React.ReactNode;
  className?: string;
}

/** The panel the wizard drives. Content Box geometry — the wizard owns the
 *  header, not the body. */
export function WizardPanel({ children, actions, className }: WizardPanelProps) {
  return (
    <div className={['musy-wizard__panel', className ?? ''].filter(Boolean).join(' ')}>
      {children}
      {actions && <div className="musy-wizard__actions">{actions}</div>}
    </div>
  );
}
