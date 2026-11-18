/**
 * The experiment's reflect step — `/session/:id/reflect` in the memory router,
 * standing where Session's own reflect step would.
 *
 * SAME FRAME AS SESSION (main, 2026-11-16): `WizardPanel` with `stepper` is
 * the whole card — the run's own steps in the header (`stepsForRun`, reflect
 * current), the exercise's name as the hidden h1, Intro then Content in the
 * body, the action row last with Back (arrow) first and the one forward
 * action after it. Under the card, Session's footer line: exercise, date.
 * Reflect has no × there, as in Session.
 *
 * THE BODY (brief): the questions from the config in the active language,
 * none required: multi-line fields that grow with their text, and since v3
 * (Ben, 2026-11-18) one Ja/Nein question whose follow-up field appears only
 * on „Ja“. A hidden follow-up is saved empty. „Fertig“ saves one row; a
 * failure keeps every word and says so, and pressing again retries.
 *
 * The text lives in a module-level draft as well as in state, so it survives
 * a language switch (no remount, but cheap insurance) AND a trip back to an
 * earlier step and forward again, which does unmount this route.
 *
 * ── THE FEELINGS HELP (Ben, 2026-11-16; inside the field since 11-18) ─────
 * A question marked `feelingsHelp` gets a small button INSIDE its field, at
 * the bottom end (Figma node 190:15804), that opens the app's own
 * `FeelingsSheet`, unmodified. Hardcoded for this experiment, which is what
 * Ben asked for: the system's Field has no slot for it. A pick is not stored
 * anywhere as a feeling: its word is APPENDED TO THE ANSWER as plain text,
 * which the person can then edit like anything they typed. The sheet's
 * "already held" refers to the words picked here that are still in the text,
 * so deleting a word frees it again.
 */
import * as React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import {
  Button, Field, InteractiveWizard, Message, RadioGroupText, WizardContent, WizardIntro,
  WizardPanel,
} from '@musie/design-system';
import { FeelingsSheet } from '../../../src/components/FeelingsSheet';
import { useLocale, useT } from '../../../src/i18n/localeContext';
import { getExercise } from '../../../src/lib/content';
import { formatShortDate } from '../../../src/lib/diary';
import { idOf, pathOf, resolveFeeling } from '../../../src/lib/feelings';
import type { HeldFeeling } from '../../../src/lib/feelings';
import type { Exercise } from '../../../src/lib/content';
import { STEP_ICON } from '../../../src/lib/stepIcons';
import { stepMessageKey } from '../../../src/routeHandle';
import type { StepId } from '../../../src/routeHandle';
import { DONE_PATH } from './App';
import { QUESTIONS, YES_NO, type ReflectionQuestion } from './config';
import { useCopy, useExperiment } from './context';
import { RUN } from './run';
import { saveResponse } from './save';
import { RUN_SHAPE, runSteps } from './steps';
import { error as trackError, track } from './track';


/* The run's start, for the footer's date. */
const STARTED_AT = new Date().toISOString();

/* One page load = one run, so one draft. */
const draft: Record<string, string> = {};
/* The feelings picked through the sheet in this run, per question. */
const draftPicks: Record<string, HeldFeeling[]> = {};

/** A picked feeling's word, added to what is already written. */
function withFeeling(text: string, word: string): string {
  const trimmed = text.trimEnd();
  if (trimmed === '') return word;
  return /[.!?…:;,–-]$/.test(trimmed) ? `${trimmed} ${word}` : `${trimmed}, ${word}`;
}

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
  const [picks, setPicks] = React.useState<Record<string, HeldFeeling[]>>(() => ({ ...draftPicks }));
  /** The question whose feelings sheet is open, or null. */
  const [feelingsFor, setFeelingsFor] = React.useState<string | null>(null);
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

  const fallback = RUN_SHAPE[exercise.slug];
  const kind = row?.kind ?? fallback.kind;
  const cardsDealt = row?.cardsDealt ?? fallback.cardsDealt;
  /* Freie Bahn deals its one card on screen: the digital run. */
  const steps = React.useMemo(() => runSteps(kind, cardsDealt), [kind, cardsDealt]);
  const before = steps.slice(0, steps.indexOf('reflect'));
  const previous: StepId | null = before[before.length - 1] ?? null;
  const goTo = (step: StepId) => navigate(`/session/${encodeURIComponent(id)}/${step}`);

  /* Sized whenever the text changes, typed or not, when the browser cannot
     do it itself: a draft on mount, relabelling after a language switch, and
     a feeling written in from the sheet, which fires no input event. */
  const areaRef = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    if (FIELD_SIZING) return;
    areaRef.current?.querySelectorAll('textarea').forEach(grow);
  }, [locale, answers]);

  const focusTimer = React.useRef<number | undefined>(undefined);
  React.useEffect(() => () => window.clearTimeout(focusTimer.current), []);

  if (participant === null) return null;

  const change = (key: string, value: string) => {
    draft[key] = value;
    setAnswers((current) => ({ ...current, [key]: value }));
  };

  /** A follow-up shows only while its question has the answer it waits for. */
  const visible = (question: ReflectionQuestion) =>
    question.showIf === undefined || answers[question.showIf.key] === question.showIf.answer;

  /** Picked here AND still in the text — what the sheet treats as held. */
  const heldFor = (key: string): HeldFeeling[] => {
    const text = (answers[key] ?? '').toLocaleLowerCase(locale);
    return (picks[key] ?? []).filter((p) => text.includes(p.label.toLocaleLowerCase(locale)));
  };

  const pickFeeling = async (key: string, nodeId: string): Promise<'added' | 'already-held'> => {
    const path = pathOf(nodeId);
    const word = path === null ? null : resolveFeeling(path, locale);
    if (path === null || word === null) return 'already-held';
    const held = heldFor(key);
    const feelingId = idOf(path);
    if (held.some((h) => h.id === feelingId)) return 'already-held';
    const next = withFeeling(draft[key] ?? answers[key] ?? '', word);
    change(key, next);
    const nextPicks = [...held, { ...path, id: feelingId, label: word }];
    draftPicks[key] = nextPicks;
    setPicks((current) => ({ ...current, [key]: nextPicks }));
    /* Counts only, never the word (brief: no content to PostHog). */
    track('exp_feeling_picked', {
      question_key: key,
      depth: path.specificI !== null ? 3 : path.detailedId !== null ? 2 : 1,
      feelings_in_answer: nextPicks.length,
    });
    return 'added';
  };

  const openFeelings = (key: string) => {
    setFeelingsFor(key);
    track('exp_feelings_help_opened', { question_key: key });
  };

  /** A multi-line answer; with `feelingsHelp`, the sheet's button sits inside
      it. In the DOM the button comes AFTER the field, so tabbing goes field →
      button, the order they are read in; experiment.css places it in the
      field's bottom end and keeps the text clear of it. */
  const renderText = (question: ReflectionQuestion) => {
    const field = (
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
    );
    if (question.feelingsHelp !== true) return field;
    return (
      <div key={question.question_key} className="musie-reflexion-infield">
        {field}
        <Button
          variant="ghost"
          size="min"
          className="musie-reflexion-infield__btn"
          onClick={() => openFeelings(question.question_key)}
        >
          {copy.feelingsHelp}
        </Button>
      </div>
    );
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
          /* A hidden follow-up is saved empty: text typed under „Ja“ and then
             switched to „Nein“ is not an answer anybody gave. */
          answer: visible(question) ? answers[question.question_key] ?? '' : '',
        })),
      });
      for (const key of Object.keys(draft)) delete draft[key];
      for (const key of Object.keys(draftPicks)) delete draftPicks[key];
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
      <WizardPanel
        headingLevel={1}
        headlineStep="heading-sm"
        headlineHidden
        headline={row?.name ?? copy.reflectionHeading}
        stepper={
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
        }
        actions={
          <>
            {previous !== null && (
              <Button
                variant="ghost"
                leadingIcon={ArrowLeft}
                onClick={() => goTo(previous)}
                disabled={saving}
              >
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
        <WizardIntro>
          {/* The app's own reflect headline (Ben, 2026-11-18: „Nachdenken“ did
              not fit), from the app's catalogue, so the two stay one string. */}
          <h2 className="musie-reflect__welcome">{t('reflect.welcome.headline')}</h2>
        </WizardIntro>
        <WizardContent>
          <div
            ref={areaRef}
            className="musie-reflexion-answers ph-no-capture"
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
            {QUESTIONS.map((question) => {
              /* A follow-up is drawn by its question, below, as one block. */
              if (question.showIf !== undefined) return null;
              if (question.kind !== 'yesNo') return renderText(question);
              const followUps = QUESTIONS.filter(
                (q) => q.showIf?.key === question.question_key && visible(q),
              );
              return (
                <div key={question.question_key} className="musie-reflexion-group">
                  <RadioGroupText
                    name={question.question_key}
                    legend={question.text[locale]}
                    options={YES_NO.map((answer) => ({ value: answer, label: copy.yesNo[answer] }))}
                    /* '' rather than undefined: controlled from the first
                       render, with nothing chosen. */
                    value={answers[question.question_key] ?? ''}
                    onValueChange={(value) => change(question.question_key, value)}
                    emptyLabel={copy.optionsEmpty}
                  />
                  {followUps.map(renderText)}
                </div>
              );
            })}
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
        </WizardContent>
      </WizardPanel>
      {/* Session's footer line, without the × (reflect has none there). */}
      <div className="musie-session__foot">
        <p className="musie-session__context">
          {t('session.context', {
            exercise: row?.name ?? '',
            date: formatShortDate(STARTED_AT, locale),
          })}
        </p>
      </div>
      {/* Beside the panel, as Session mounts it. */}
      <FeelingsSheet
        open={feelingsFor !== null}
        onOpenChange={(next) => { if (!next) setFeelingsFor(null); }}
        held={feelingsFor === null ? [] : heldFor(feelingsFor)}
        onPick={(nodeId) => (feelingsFor === null
          ? Promise.resolve('already-held' as const)
          : pickFeeling(feelingsFor, nodeId))}
        error={null}
      />
    </div>
  );
}
