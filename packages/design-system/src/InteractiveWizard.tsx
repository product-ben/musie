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
 * REACHABILITY IS THE SYSTEM'S RULE, not the consumer's: every completed step
 * stays reachable, so going back is always allowed; the only unreachable step
 * is one whose predecessors are unfinished.
 *
 * The rule itself no longer lives in this file. It used to sit in a private
 * closure here, which meant the app could not ask the question and wrote the
 * same rule a second time in its session reducer. It is now one pure function,
 * `wizardStepState` in src/wizardSteps.ts, exported from the package — this
 * component is a CONSUMER of it, like anything else.
 *
 * Four states, and they are a progression rather than a palette:
 *   disabled → active → selected → completed
 * Selection changes the marker FILL and the label WEIGHT; completion changes
 * the GLYPH (the step's own marker → check). No state rests on hue (1.4.1).
 *
 * WHAT THE MARKER DRAWS is the step's `icon` where it has one and its position
 * number where it does not — the icon arrived 2026-09-24, the number is what
 * every earlier consumer still gets. Either way it is the SAME glyph across
 * disabled, active and selected, and either way completion and skipping
 * replace it. The 1.4.1 argument is unchanged by the switch, because it never
 * rested on the number being a number: it rests on the glyph CHANGING.
 *
 * AND A FIFTH THAT IS NOT ON THAT LINE — `skipped`, D14. A step that is not
 * part of this run at all: the rail still draws its marker, so every run reads
 * structurally alike, but the number becomes a dash and the step is not
 * reachable. It is a separate state because neither of the two candidates could
 * say it — `completed` draws a check for something nobody did, and `disabled`
 * reads as "not yet" about a step that is never opening. The GLYPH is what
 * distinguishes it from `disabled`, not the ink, for the same 1.4.1 reason the
 * check distinguishes `completed`. With icons on, the dash is telling a step's
 * own glyph apart from itself-greyed-out, which is exactly the job it had
 * against the number.
 *
 * Narrow screens COLLAPSE rather than stack: the step on screen keeps its
 * label, every other step shrinks to its marker. The hidden labels are moved
 * out of sight, not removed, so a marker-only step still announces its name.
 *
 * THE STATE WORD IS SPOKEN, NEVER DRAWN — changed 2026-09-24, from user
 * testing. It used to render as a second line under every label, saying what
 * the marker already says in ink: the check IS "erledigt", the filled marker
 * IS "aktuell", the greyed one IS "gesperrt". Every step read as two things
 * where there was one.
 *
 * IT COST NO HEIGHT, WHICH IS WORTH KNOWING BEFORE ANYONE RE-ARGUES THIS.
 * Measured in the app, both locales, before and after: the trigger is 60px
 * either way. The 44px marker sets the height and two short lines fit inside
 * it, so the second line was free in space and expensive only in reading. The
 * case for removing it is redundancy, not room.
 *
 * It is not deleted, because the marker is the ONLY carrier for a user who
 * cannot see it — `aria-disabled` is absent by design (the button is really
 * disabled) and nothing else distinguishes 'active' from 'completed' in
 * speech. So the word moves into the trigger's `aria-label`: "Hören, aktuell".
 * Same words, same locale catalogue, same override prop — a different sense.
 *
 * AN `aria-label` RATHER THAN THE `.musy-sr-only` SPAN this package uses
 * everywhere else, and it was measured before it was chosen. A hidden span is
 * absolutely positioned, and the name computation then inserts a space between
 * the label's text node and it — Chromium computed "Intro , current", comma
 * adrift, in both locales. There is no markup that takes the space back out.
 * The trigger can afford the stronger tool because its only other content is
 * the marker, which is `aria-hidden`: nothing visible is being overridden, and
 * the name still OPENS with the visible label, so 2.5.3 Label in Name holds
 * for anyone driving it by voice.
 *
 * With the second line gone, the label is a single line and the trigger's own
 * `align-items: center` centres it against the 44px marker. That is why there
 * is no vertical-centring rule to write: there was never anything wrong with
 * the centring, only with what was being centred.
 */
import * as React from 'react';
import { Check, Dot, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';
import { useMusyText } from './locale';
import { wizardStepState } from './wizardSteps';

/* Declared in wizardSteps.ts, beside the function that returns it, and
   re-exported here so the component's own type surface is unchanged. */
export type { WizardStepState } from './wizardSteps';

export interface WizardStep {
  id: string;
  label: string;
  /**
   * The glyph this step's marker carries INSTEAD OF ITS NUMBER — added
   * 2026-09-24, from user testing.
   *
   * Optional, and the number is what a step without one still draws, so a
   * wizard that passes no icons renders exactly as it did. Mixing the two
   * inside one run is possible and is a mistake: half a rail of numbers reads
   * as a count with holes in it. Pass all of them or none.
   *
   * IT ONLY EVER REPLACES THE NUMBER. `completed` still swaps to a check and
   * `skipped` still swaps to a dash, because that swap is what keeps the five
   * states apart without hue (1.4.1) — an icon that stayed put through
   * completion would leave `active` and `completed` differing by fill alone.
   * So a step's own glyph says WHICH step, and the two universal glyphs say
   * what happened to it.
   *
   * A component, not a name string: a name string forces the whole icon set
   * into the bundle (see Icon's `glyph`).
   */
  icon?: LucideIcon;
}

/** The state word appended to each step's ACCESSIBLE NAME — screen-reader-only
 *  since 2026-09-24, see the header. Each one defaults to the locale catalogue
 *  (src/locale.ts); pass any subset to override. */
export interface WizardStateWords {
  disabled: string;
  active: string;
  selected: string;
  completed: string;
  skipped: string;
}

/** The three solved accent families, named verbatim per Decision 3. */
export type WizardAccent = 'primary' | 'accent' | 'accent-alt';

export interface InteractiveWizardProps {
  /** Names the navigation region. Required (4.1.2). */
  label: string;
  steps: WizardStep[];
  /** id of the step on screen. */
  current: string;
  /** ids of finished steps. A completed step is always reachable. */
  completed?: string[];
  /**
   * ids that are NOT PART OF THIS RUN — D14.
   *
   * The rail still shows the marker, so every run reads structurally alike; the
   * step is drawn as skipped and is not reachable. DERIVED by the consumer from
   * whatever makes the step inapplicable (in Musie, `exercises.needs_cards`),
   * never stored — a content edit must not be able to leave a stale answer
   * behind.
   *
   * Skipped steps are transparent to the reachability rule: without that, every
   * step after one would be locked forever and the run could not be finished.
   */
  skipped?: string[];
  onStepChange?: (id: string) => void;
  /** Opt-in label-first stacking. Narrow screens collapse instead — see above. */
  vertical?: boolean;
  /** Force the collapsed run inside a narrow container, which no media query
   *  can see. */
  compact?: boolean;
  /**
   * Override any of the five state words a step announces. There is no prop to
   * SUPPRESS them: `showStateWords` is gone, because what it controlled —
   * whether the word was drawn — no longer happens either way, and a switch
   * that took the word out of the accessible name would be an accessibility
   * regression offered as an option.
   */
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
  label, steps, current, completed = [], skipped = [], onStepChange,
  vertical = false, compact = false,
  stateWords, accent = 'primary', className,
}: InteractiveWizardProps) {
  const t = useMusyText();
  const words: WizardStateWords = {
    disabled: t.wizardDisabled,
    active: t.wizardActive,
    selected: t.wizardSelected,
    completed: t.wizardCompleted,
    skipped: t.wizardSkipped,
    ...stateWords,
  };
  const done = React.useMemo(() => new Set(completed), [completed]);
  const notInRun = React.useMemo(() => new Set(skipped), [skipped]);
  const ids = React.useMemo(() => steps.map((s) => s.id), [steps]);

  /**
   * The connector's completion, folded along the run rather than read per step.
   *
   * `done.has(step.id)` alone leaves a GAP either side of a skipped step: the
   * run visibly passes through it, so the line has to as well. A skipped step
   * is therefore transparent to the connector in the same way it is transparent
   * to the reachability rule — it inherits the completion of the connector
   * before it and passes it on.
   *
   * Written as a fold with a running value, not as "every earlier step is
   * done", so a run with nothing skipped renders byte-identically to before.
   */
  const connectorComplete = React.useMemo(() => {
    let carried = false;
    return steps.map((step) => {
      carried = notInRun.has(step.id) ? carried : done.has(step.id);
      return carried;
    });
  }, [steps, done, notInRun]);

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
          const state = wizardStepState(ids, step.id, current, done, notInRun);
          const isLast = i === steps.length - 1;
          return (
            <li className="musy-wizard__step" key={step.id}>
              <button
                type="button"
                className="musy-wizard__trigger"
                data-state={state}
                /* A skipped step is never the one on screen, so it never
                   carries aria-current even if a caller passes it as both. */
                aria-current={step.id === current && state !== 'skipped' ? 'step' : undefined}
                /* The visible name first, then the state the marker draws.
                   See the header for why this is a label and not a hidden
                   span, and note what it does NOT do: it never replaces the
                   label, only extends it. */
                aria-label={`${step.label}, ${words[state]}`}
                disabled={state === 'disabled' || state === 'skipped'}
                onClick={() => onStepChange?.(step.id)}
              >
                {/* The number, the check and the dash are siblings; the state
                    decides which one shows, so a step never re-renders its
                    marker from a different tree. */}
                <span className="musy-wizard__marker" aria-hidden="true">
                  {/* The step's own glyph where it has one, its position where
                      it does not. Decorative either way — the marker is
                      aria-hidden and the trigger's aria-label carries the
                      name and the state. */}
                  <span className="musy-wizard__num">
                    {step.icon ? <Icon glyph={step.icon} size="sm" /> : i + 1}
                  </span>
                  <span className="musy-wizard__check"><Icon glyph={Check} size="sm" /></span>
                  {/* A DIFFERENT GLYPH, not a different colour: greyed-out is
                      what `disabled` already is, and the two states have to be
                      told apart without hue (1.4.1). */}
                  <span className="musy-wizard__skip"><Icon glyph={Minus} size="sm" /></span>
                </span>
                {/* Visible text only. A collapsed step clips this out of
                    sight and keeps announcing its name, which is now the
                    trigger's own label rather than the clipped span's. */}
                <span className="musy-wizard__label">{step.label}</span>
              </button>
              {!isLast && (
                <span
                  className="musy-wizard__connector"
                  data-complete={connectorComplete[i] ? '' : undefined}
                  aria-hidden="true"
                >
                  {/* A DOT, NOT A RULE — 2026-09-24, from user testing on a
                      phone. The element itself is unchanged: it is still the
                      flex spacer every width rule above sizes, still
                      decorative, and still the only thing that carries the
                      run's completion between two markers. What changed is
                      what it draws inside that space. */}
                  <Icon glyph={Dot} size="md" />
                </span>
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
