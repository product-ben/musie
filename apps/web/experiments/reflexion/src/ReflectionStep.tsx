/**
 * The experiment's reflect step — `/session/:id/reflect` in the memory router,
 * standing where Session's own reflect step would.
 *
 * SAME FRAME AS SESSION: `ContentBox` with the exercise's name muted above
 * the rail, the same `InteractiveWizard` (the run's own steps via
 * `stepsForRun`, reflect current), and `WizardPanel`'s action row with Back
 * first and the one forward action last (Session.tsx ~1330–1520).
 *
 * THE BODY (brief): three multi-line fields that grow with their text, each
 * labelled by a question from the config in the active language, none
 * required. „Fertig“ saves one row; a failure keeps every word and says so,
 * and pressing again retries.
 *
 * The text lives in a module-level draft as well as in state, so it survives
 * a language switch (no remount, but cheap insurance) AND a trip back to an
 * earlier step and forward again, which does unmount this route.
 */
import * as React from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Button, ContentBox, Field, InteractiveWizard, Message, WizardPanel,
} from '@musie/design-system';
import { useLocale, useT } from '../../../src/i18n/localeContext';
import { getExercise } from '../../../src/lib/content';
import type { Exercise } from '../../../src/lib/content';
import { stepsForRun } from '../../../src/lib/exerciseKind';
import type { ExerciseKind } from '../../../src/lib/exerciseKind';
import { STEP_ICON } from '../../../src/lib/stepIcons';
import { stepMessageKey } from '../../../src/routeHandle';
import type { StepId } from '../../../src/routeHandle';
import { DONE_PATH } from './App';
import { QUESTIONS, type Slug } from './config';
import { useCopy, useExperiment } from './context';
import { RUN } from './run';
import { saveResponse } from './save';
import { error as trackError } from './track';

/** What each link's run looks like before (or without) the exercise row. */
const FALLBACK_SHAPE: Record<Slug, { kind: ExerciseKind; cardsDealt: number | null }> = {
  harfe: { kind: 'instruments', cardsDealt: null },
  'body-scan': { kind: 'listening_only', cardsDealt: null },
  'freie-bahn': { kind: 'card_based', cardsDealt: 1 },
};

/* One page load = one run, so one draft. */
const draft: Record<string, string> = {};

const FIELD_SIZING = typeof CSS !== 'undefined'
  && typeof CSS.supports === 'function'
  && CSS.supports('field-sizing', 'content');

/** The fallback for browsers without `field-sizing: content`. */
function grow(area: HTMLTextAreaElement) {
  if (FIELD_SIZING) return;
  area.style.height = 'auto';
  const borders = area.offsetHeight - area.clientHeight;
  area.style.height = `${area.scrollHeight + borders}px`;
}

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function ReflectionStep() {
  const { exercise, participant } = useExperiment();
  const copy = useCopy();
  const t = useT();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const { id = RUN.sessionId } = useParams();

  const [answers, setAnswers] = React.useState<Record<string, string>>(() => ({ ...draft }));
  const [saving, setSaving] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  /* The exercise row, for its name and kind. Kept across a language switch
     rather than blanked while the other language loads. */
  const [row, setRow] = React.useState<Exercise | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    getExercise(exercise.exerciseId, locale).then(
      (next) => { if (!cancelled && next !== null) setRow(next); },
      (error: unknown) => { console.warn('[reflexion] exercise row unavailable:', error); },
    );
    return () => { cancelled = true; };
  }, [exercise.exerciseId, locale]);

  const fallback = FALLBACK_SHAPE[exercise.slug];
  const kind = row?.kind ?? fallback.kind;
  const cardsDealt = row?.cardsDealt ?? fallback.cardsDealt;
  /* Freie Bahn deals its one card on screen: the digital run. */
  const steps = React.useMemo(
    () => stepsForRun(kind, { digital: kind === 'card_based', cardsDealt }),
    [kind, cardsDealt],
  );
  const before = steps.slice(0, steps.indexOf('reflect'));
  const previous: StepId | null = before[before.length - 1] ?? null;
  const goTo = (step: StepId) => navigate(`/session/${encodeURIComponent(id)}/${step}`);

  /* Fields that already hold text (a draft, or after a language switch the
     labels re-render) are sized on mount when the browser cannot. */
  const areaRef = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    if (FIELD_SIZING) return;
    areaRef.current?.querySelectorAll('textarea').forEach(grow);
  }, [locale]);

  const focusTimer = React.useRef<number | undefined>(undefined);
  React.useEffect(() => () => window.clearTimeout(focusTimer.current), []);

  if (participant === null) return null;

  const change = (key: string, value: string) => {
    draft[key] = value;
    setAnswers((current) => ({ ...current, [key]: value }));
  };

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    setFailed(false);
    try {
      await saveResponse({
        participant,
        exerciseKey: exercise.exercise_key,
        language: locale,
        answers: QUESTIONS.map((question) => ({
          question_key: question.question_key,
          question_text: question.text[locale],
          answer: answers[question.question_key] ?? '',
        })),
      });
      for (const key of Object.keys(draft)) delete draft[key];
      navigate(DONE_PATH, { replace: true });
    } catch (error) {
      console.error('[reflexion] save failed:', error);
      trackError('save', error instanceof Error ? error.message : String(error));
      setFailed(true);
      setSaving(false);
    }
  };

  return (
    <div className="musie-session musie-reflexion-reflect">
      <ContentBox
        headingLevel={1}
        headlineStep="heading-sm"
        headlineTone="muted"
        headline={row?.name ?? copy.reflectionHeading}
        header={
          <div className="musie-rail">
            <InteractiveWizard
              label={t('session.wizardLabel')}
              steps={steps.map((step) => ({
                id: step,
                label: t(stepMessageKey(step)),
                icon: STEP_ICON[step],
              }))}
              current="reflect"
              completed={before}
              onStepChange={(next) => {
                if (next !== 'reflect') goTo(next as StepId);
              }}
            />
          </div>
        }
      >
        <WizardPanel
          actions={
            <>
              {previous !== null && (
                <Button variant="ghost" onClick={() => goTo(previous)} disabled={saving}>
                  {copy.back}
                </Button>
              )}
              <Button
                variant="primary"
                loading={saving}
                loadingLabel={copy.saving}
                onClick={() => void finish()}
              >
                {copy.done}
              </Button>
            </>
          }
        >
          <div
            ref={areaRef}
            className="musie-reflexion-answers ph-no-capture"
            onInput={(event) => {
              if (event.target instanceof HTMLTextAreaElement) grow(event.target);
            }}
            onFocus={(event) => {
              /* Keep the field being typed into clear of the iOS keyboard:
                 wait for the keyboard to take its space, then centre. */
              const target = event.target;
              if (!(target instanceof HTMLTextAreaElement)) return;
              window.clearTimeout(focusTimer.current);
              focusTimer.current = window.setTimeout(() => {
                if (document.activeElement !== target) return;
                target.scrollIntoView({
                  block: 'center',
                  behavior: prefersReducedMotion() ? 'auto' : 'smooth',
                });
              }, 300);
            }}
          >
            <h2 className="musie-reflect__welcome">{copy.reflectionHeading}</h2>
            {QUESTIONS.map((question) => (
              <Field
                key={question.question_key}
                className="musie-reflexion-answer"
                label={question.text[locale]}
                name={question.question_key}
                multiline
                rows={3}
                value={answers[question.question_key] ?? ''}
                onValueChange={(value) => change(question.question_key, value)}
                errorWord={copy.statusError}
              />
            ))}
            {failed && (
              <Message
                variant="error"
                live="assertive"
                headingLevel={3}
                headline={copy.saveErrorHeadline}
                text={copy.saveErrorText}
                statusWord={copy.statusError}
              />
            )}
          </div>
        </WizardPanel>
      </ContentBox>
    </div>
  );
}
