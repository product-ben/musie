/**
 * `/exercise-builder` — the exercise, as one file a music therapist can edit.
 *
 * ── A TOOL, NOT A SCREEN ──────────────────────────────────────────────────
 * The same kind of object `/goal-mappings` and `/dev/qr` are: linked from
 * nowhere, reachable only by typing the path, `lazy` in the route table. It is
 * `wide` because it is two columns — a phone beside an editor.
 *
 * ── IT WRITES NOTHING, AND THAT IS THE WHOLE DESIGN ───────────────────────
 * Ben, 2026-10-21: *"The therapist can never push this to the db, but only
 * download a config file per exercise and hand this over to me."* So this
 * reads the live tables, lets the copy be edited in the browser, and emits a
 * file. No insert, no update, no `admin_write`, no Edge Function.
 *
 * `exercise_i18n` has no update policy for `authenticated`, so a client write
 * would be refused by the privilege check before RLS was consulted; this
 * screen does not try. When saving arrives it arrives as a decision, through
 * `admin_write` and `content_edits`, with an operator's name on it.
 *
 * ── THE PREVIEW IS THE REAL SCREEN ────────────────────────────────────────
 * Rebuilt 2026-10-27 on Ben's brief: a phone-width live preview on the left
 * showing the step *including all its elements*, the editor for that step on
 * the right, and the exercise picker folded into a collapsible above.
 *
 * It mounts the SESSION COMPONENTS THEMSELVES — `SessionIntro`, `SessionScan`,
 * `SessionSelect`, `SessionView`, `SessionListen`, `SessionReflect` — inside
 * the real `ContentBox` + `InteractiveWizard` + `WizardPanel` shell that
 * `Session.tsx` uses. Not a drawing of the step: the step.
 *
 * That is safe because of three facts, each checked rather than assumed:
 *   · five of the six are PURE — props in, `Exercise` imported as a type
 *   · `SessionListen` writes exactly twice, both from the play handler, so a
 *     preview nobody presses play in writes nothing
 *   · `CardScanner` has no mount effect and calls `start()` from a tap, so no
 *     camera permission is ever asked for
 *
 * ── THE RAIL IS THE STEP PICKER ───────────────────────────────────────────
 * `InteractiveWizard` already takes `onStepChange`, and in the real session
 * that navigates. Here it selects which step is being edited — so the control
 * that chooses a step is the same control the therapist will see people use,
 * and there is no second row of buttons duplicating it.
 *
 * ── ONE VARIANT AT A TIME, AND BEN CHOSE THAT ─────────────────────────────
 * *"Du kannst einfach eine Ausprägung der Übung nehmen."* A card exercise has
 * two runs and every step has two locales. The preview renders one of each;
 * both are switches in the collapsible, and `configToExercise` resolves the
 * mode's copy overrides at that boundary.
 *
 * ── WHAT IS NOT EDITABLE HERE, ON PURPOSE ─────────────────────────────────
 * Which steps a run has, which features are on, the cut matrix, the
 * timeframes. Those are read out of the database and shown, because a config
 * states them and the therapist should see what they are handing over — but
 * changing them is changing what the app does. The therapist edits TEXT, plus
 * the one structural switch Ben asked for: whether the listen step rotates
 * questions.
 */
import * as React from 'react';
import { Languages } from 'lucide-react';
import {
  Badge, BadgeRow, ContentBox, CtaButton, Field, InteractiveWizard, Message,
  RadioGroupText, SegmentedControl, Switch, WizardPanel,
} from '@musie/design-system';
import { SessionIntro } from '../components/SessionIntro';
import { SessionScan } from '../components/SessionScan';
import { SessionSelect } from '../components/SessionSelect';
import { SessionView } from '../components/SessionView';
import { SessionListen } from '../components/SessionListen';
import { SessionReflect } from '../components/SessionReflect';
import { LocaleContext, useT } from '../i18n/localeContext';
import { LOCALES } from '../i18n';
import type { Locale } from '../i18n';
import { stepMessageKey } from '../routeHandle';
import type { StepId } from '../routeHandle';
import { STEP_ICON } from '../lib/stepIcons';
import { getExercises, getExerciseCuts } from '../lib/content';
import type { Exercise } from '../lib/content';
import { QUESTION_SETS, questionsDe, questionsEn } from '../content/questions';
import type { QuestionId } from '../content/questions';
import { buildExerciseConfig, configToFile } from '../lib/buildExerciseConfig';
import type { QuestionSource } from '../lib/buildExerciseConfig';
import { configToExercise, previewCard, previewHand, stepsInMode } from '../lib/configToExercise';
import { validateConfig } from '../lib/exerciseConfig';
import type { ExerciseConfig, QuestionText, RunMode, StepCopy } from '../lib/exerciseConfig';

/** Where a new question's id comes from. Scoped to its set, so `q-01` in two
 *  exercises is two different questions and nothing collides. */
function nextQuestionId(existing: readonly QuestionText[]): string {
  const used = new Set(existing.map((question) => question.id));
  for (let n = 1; n < 100; n += 1) {
    const id = `q-${String(n).padStart(2, '0')}`;
    if (!used.has(id)) return id;
  }
  return `q-${Date.now()}`;
}

function questionSourceFor(exerciseId: string): QuestionSource | undefined {
  const ids = QUESTION_SETS[exerciseId];
  if (ids === undefined || ids.length === 0) return undefined;
  return { ids, de: questionsDe, en: questionsEn };
}

/**
 * The live preview: the real shell, the real step, the edited copy.
 *
 * Its own component so the session screens' hooks sit behind one boundary —
 * `SessionListen` alone is 26 of them, and re-running those on every keystroke
 * in the editor beside it is the thing that would make typing feel slow.
 */
interface PreviewProps {
  exercise: Exercise;
  config: ExerciseConfig;
  step: StepId;
  steps: StepId[];
  locale: Locale;
  mode: RunMode;
  onStepChange: (next: StepId) => void;
}

/**
 * The preview, in the language being edited.
 *
 * TWO COMPONENTS AND NOT ONE, and the split is the whole point: a `useT()`
 * called beside the provider runs BEFORE it, so everything the outer function
 * translated came out in the app's locale while the step inside came out in
 * the editor's. That showed as a German step under an English rail — *Start*
 * where the screen says *Einsteigen* — and it survived one round of fixing
 * because the button was patched on its own instead of the boundary being
 * moved. Everything that translates now sits inside.
 */
function StepPreview(props: PreviewProps) {
  const { locale } = props;

  /* `setLocale` is a no-op on purpose: nothing inside the preview may change
     the builder's own language, and nothing inside it tries. */
  const value = React.useMemo(
    () => ({ locale, resolved: true, setLocale: () => { /* not from in here. */ } }),
    [locale],
  );

  return (
    <LocaleContext.Provider value={value}>
      <PreviewBody {...props} />
    </LocaleContext.Provider>
  );
}

function PreviewBody({
  exercise, config, step, steps, locale, mode, onStepChange,
}: PreviewProps) {
  const t = useT();

  /* Local answers, so the segmented controls and the switch in the preview
     actually move. They change nothing outside it. */
  const [posture, setPosture] = React.useState<'sitting' | 'lying'>('sitting');
  const [ending, setEnding] = React.useState<'day' | 'sleep'>('day');
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const intro = config.run.find((entry) => entry.step === 'intro');
  const listen = config.run.find((entry) => entry.step === 'listen');
  const asksPosture = intro?.features.includes('posture_question') ?? false;
  const asksEnding = intro?.features.includes('ending_question') ?? false;
  const offersModes = config.modes?.offers === 'both';

  const card = previewCard();
  const hand = previewHand(config.catalogue.cardsDealt);

  /* The first written question, so the listen step draws one rather than
     falling back to its own copy. `rotates` is the switch's own state. */
  const written = listen?.questions?.[locale] ?? [];
  const first = written.at(0);
  const rotates = listen?.features.includes('rotating_question') ?? false;

  return (
    <ContentBox
      headingLevel={2}
      headlineStep="heading-sm"
      headlineTone="muted"
      headline={exercise.name}
      header={
        <div className="musie-rail">
          <InteractiveWizard
            label={t('session.wizardLabel')}
            steps={steps.map((id) => ({
              id,
              label: t(stepMessageKey(id)),
              icon: STEP_ICON[id],
            }))}
            current={step}
            /* COMPACT, AND THE PROP EXISTS FOR EXACTLY THIS. The wizard
               collapses below `--bp-md` — current step keeps its label, the
               rest shrink to markers — and that rule is a MEDIA query, so in a
               393px frame inside a 1440px window it never fires: every label
               rendered, and the markers sat on top of the words.
               `compact` is documented as "force the collapsed run inside a
               narrow container, which no media query can see", which is this
               container exactly. Same bug as `--gutter` and `--viewport-block`;
               this one the component already had an answer for. */
            compact
            /* EVERY STEP REACHABLE, which a real run would never allow — the
               rail here is a picker, and a therapist editing the reflect copy
               must not have to walk four steps to reach it. */
            completed={steps.filter((id) => id !== step)}
            skipped={[]}
            onStepChange={(next) => onStepChange(next as StepId)}
          />
        </div>
      }
    >
      <WizardPanel
        actions={<CtaButton variant="primary" disabled>{t('common.continue')}</CtaButton>}
      >
        {step === 'intro' && (
          <SessionIntro
            exercise={exercise}
            durationSeconds={exercise.listenGateSeconds}
            posture={asksPosture ? posture : undefined}
            ending={asksEnding ? ending : undefined}
            onPostureChange={setPosture}
            onEndingChange={setEnding}
            /* The switch says *the cards are in front of me*, so the mode is
               its negative — same reading as `Session.tsx`. */
            cardsPresent={offersModes ? mode === 'analogue' : undefined}
            onCardsPresentChange={() => { /* the mode is a control above. */ }}
            dealsHere={(config.catalogue.cardsDealt ?? 0) > 1}
          />
        )}

        {step === 'scan' && (
          <SessionScan
            exercise={exercise}
            card={null}
            scanning={false}
            codeError={null}
            onSubmitCode={() => { /* nothing to look up in a preview. */ }}
          />
        )}

        {step === 'view' && (
          <SessionView
            card={card}
            hand={hand}
            drawing={false}
            error={null}
            onDraw={() => { /* nothing to draw from. */ }}
            sheetOpen={sheetOpen}
            onSheetOpenChange={setSheetOpen}
          />
        )}

        {step === 'select' && (
          <SessionSelect
            hand={hand}
            card={null}
            choosing={false}
            error={null}
            onPick={() => { /* nothing to pick into. */ }}
            sheetOpen={sheetOpen}
            onSheetOpenChange={setSheetOpen}
            sheetOrigin={null}
          />
        )}

        {step === 'listen' && (
          <SessionListen
            exercise={exercise}
            digital={mode === 'digital'}
            /* NULL, which runs the simulated clock. A preview has no cut to
               resolve and must not fetch one. */
            audio={null}
            /* `markListened` and `savePlayed` fire from the play handler only,
               and this id matches no row — so a press warns and writes
               nothing, which is the right failure for a preview. */
            sessionId="preview"
            card={card}
            listened={false}
            onListened={() => { /* nothing records a preview. */ }}
            onAdvance={() => { /* the rail moves, not the step. */ }}
            back={null}
            question={{
              id: (first?.id ?? null) as QuestionId | null,
              text: first === undefined ? null : {
                listen: first.listen, reflect: first.reflect, helper: first.helper,
              },
              rotates,
              assigning: false,
              canSwap: written.length > 1,
              exhausted: false,
              reject: () => { /* no rotation in a preview. */ },
              reset: () => { /* nothing to put back. */ },
            }}
          />
        )}

        {step === 'reflect' && (
          <SessionReflect
            feelings={[]}
            onAddFeeling={() => { /* the wheel is its own screen. */ }}
            onRemoveFeeling={() => { /* nothing held. */ }}
            thoughts=""
            onEditThoughts={() => { /* the sheet is its own screen. */ }}
            onUnderstand={() => { /* the sheet is its own screen. */ }}
          />
        )}
      </WizardPanel>
    </ContentBox>
  );
}

export function ExerciseBuilder() {
  const t = useT();

  const [configs, setConfigs] = React.useState<Record<string, ExerciseConfig> | null>(null);
  const [order, setOrder] = React.useState<string[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [locale, setLocale] = React.useState<Locale>('de');
  const [mode, setMode] = React.useState<RunMode>('analogue');
  const [step, setStep] = React.useState<StepId>('intro');
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let live = true;

    void (async () => {
      try {
        const [de, en, cuts] = await Promise.all([
          getExercises('de'), getExercises('en'), getExerciseCuts(),
        ]);
        if (!live) return;

        const byId = new Map<string, Record<Locale, Exercise>>();
        for (const exercise of de) byId.set(exercise.id, { de: exercise, en: exercise });
        for (const exercise of en) {
          const pair = byId.get(exercise.id);
          if (pair !== undefined) pair.en = exercise;
        }

        const built: Record<string, ExerciseConfig> = {};
        const ids: string[] = [];
        for (const [id, byLocale] of byId) {
          built[id] = buildExerciseConfig({
            byLocale,
            cuts: cuts.filter((cut) => cut.exercise_id === id),
            questions: questionSourceFor(id),
          });
          ids.push(id);
        }
        ids.sort((a, b) => (built[a]?.catalogue.sort ?? 0) - (built[b]?.catalogue.sort ?? 0));

        setConfigs(built);
        setOrder(ids);
        setSelected(ids.at(0) ?? null);
      } catch (thrown: unknown) {
        if (!live) return;
        console.error('[musie] the exercise builder could not read the database:', thrown);
        setFailed(true);
      }
    })();

    return () => { live = false; };
  }, []);

  const config = selected === null ? undefined : configs?.[selected];

  const edit = React.useCallback((mutate: (draft: ExerciseConfig) => void) => {
    setConfigs((current) => {
      if (current === null || selected === null) return current;
      const existing = current[selected];
      if (existing === undefined) return current;
      const draft = structuredClone(existing) as ExerciseConfig;
      mutate(draft);
      return { ...current, [selected]: draft };
    });
  }, [selected]);

  const problems = React.useMemo(
    () => (config === undefined ? [] : validateConfig(config)),
    [config],
  );

  const onDownload = React.useCallback(() => {
    if (config === undefined) return;
    const blob = new Blob([configToFile(config)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.id}.json`;
    link.click();
    /* Revoked on the next tick: Safari reads the href after the click returns,
       and revoking in the same turn gives an empty file with no error. */
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [config]);

  if (failed) return <p className="musie-note">{t('content.errorDetail')}</p>;
  if (configs === null) return <p className="musie-note">{t('content.loading')}</p>;
  if (config === undefined || order.length === 0) {
    return <p className="musie-note">{t('content.empty')}</p>;
  }

  const offersModes = config.modes?.offers === 'both';
  const steps = stepsInMode(config, mode);
  /* The mode can drop the step being edited — `scan` has no place in a digital
     run. Fall to the first rather than render an editor for a step the preview
     is not showing. */
  const current = steps.includes(step) ? step : (steps.at(0) ?? 'intro');
  const entryIndex = config.run.findIndex(
    (candidate) => candidate.step === current
      && (candidate.mode === undefined || candidate.mode === mode),
  );
  const entry = config.run[entryIndex];
  const copy: StepCopy = entry?.copy[locale] ?? { headline: '', bodyMd: '' };
  const chrome = entry?.copySource === 'chrome';

  const library = config.library[locale] ?? {
    name: '', description: '', needs: null, imageAlt: '',
  };

  const exercise = configToExercise(config, locale, mode);

  const listenIndex = config.run.findIndex((candidate) => candidate.step === 'listen');
  const listen = listenIndex === -1 ? undefined : config.run[listenIndex];
  const rotates = listen?.features.includes('rotating_question') ?? false;
  const questions = listen?.questions?.[locale] ?? [];

  const editCopy = (field: keyof StepCopy, value: string) => {
    edit((draft) => {
      const target = draft.run[entryIndex];
      if (target === undefined) return;
      const existing = target.copy[locale] ?? { headline: '', bodyMd: '' };
      target.copy[locale] = { ...existing, [field]: value };
    });
  };

  return (
    <div className="musie-builder">
      <h1 className="musie-placeholder">{t('builder.headline')}</h1>
      <p className="musie-note">{t('builder.intro')}</p>

      {/* ── THE EXERCISE, FOLDED AWAY ────────────────────────────────────
          A `<details>` and not a design-system part, because the system has
          none (L14): it is chosen once and then stands out of the way, and the
          native element brings its own keyboard and screen-reader behaviour.
          Logged as a component request in OPEN-QUESTIONS.md. */}
      <details className="musie-builder__pick">
        <summary className="musie-builder__summary">
          <span className="musie-builder__summaryLabel">{t('builder.pick')}</span>
          <span className="musie-builder__summaryValue">
            {`${library.name} · ${t(locale === 'de' ? 'builder.locale.de' : 'builder.locale.en')}`}
          </span>
        </summary>

        <div className="musie-builder__picked">
          <RadioGroupText
            name="builder-exercise"
            legend={t('builder.pick')}
            legendHidden
            options={order.map((id) => ({
              value: id,
              label: configs[id]?.library.de?.name ?? id,
            }))}
            value={selected ?? undefined}
            onValueChange={setSelected}
            emptyLabel={t('content.empty')}
          />

          <SegmentedControl
            name="builder-locale"
            legend={t('builder.locale')}
            options={LOCALES.map((code) => ({
              value: code,
              label: t(code === 'de' ? 'builder.locale.de' : 'builder.locale.en'),
              /* ONE GLYPH FOR BOTH, the way /goal-mappings uses one for all
                 five exercises: two invented icons would imply a difference
                 between the languages that there is not. */
              glyph: Languages,
            }))}
            value={locale}
            onValueChange={(next) => setLocale(next as Locale)}
          />

          {offersModes && (
            <SegmentedControl
              name="builder-mode"
              legend={t('builder.mode')}
              options={[
                { value: 'analogue', label: t('builder.mode.analogue'), glyph: STEP_ICON.scan },
                { value: 'digital', label: t('builder.mode.digital'), glyph: STEP_ICON.select },
              ]}
              value={mode}
              onValueChange={(next) => setMode(next as RunMode)}
            />
          )}

          <BadgeRow>
            <Badge variant="neutral">{config.kind}</Badge>
            <Badge variant={config.implemented ? 'success' : 'warning'}>
              {t(config.implemented ? 'builder.implemented' : 'builder.unimplemented')}
            </Badge>
          </BadgeRow>

          {/* The exercise's own card — not a step's copy, which is why it
              lives up here with the thing it names. */}
          <Field
            label={t('builder.library.name')}
            value={library.name}
            onValueChange={(value) => edit((draft) => {
              draft.library[locale] = { ...library, name: value };
            })}
          />
          <Field
            label={t('builder.library.description')}
            multiline
            rows={3}
            value={library.description}
            onValueChange={(value) => edit((draft) => {
              draft.library[locale] = { ...library, description: value };
            })}
          />
          <Field
            label={t('builder.library.needs')}
            description={t('builder.library.needsHint')}
            multiline
            rows={2}
            value={library.needs ?? ''}
            onValueChange={(value) => edit((draft) => {
              /* EMPTY MEANS NONE, and it has to become null rather than '':
                 the intro's `needs_note` feature is derived from this being
                 non-null, so '' would promise a note with no text. */
              draft.library[locale] = { ...library, needs: value.trim() === '' ? null : value };
            })}
          />
          <Field
            label={t('builder.library.imageAlt')}
            description={t('builder.library.imageAltHint')}
            multiline
            rows={2}
            value={library.imageAlt}
            onValueChange={(value) => edit((draft) => {
              draft.library[locale] = { ...library, imageAlt: value };
            })}
          />
        </div>
      </details>

      {/* ── THE PHONE, AND THE STEP BESIDE IT ───────────────────────────── */}
      <div className="musie-builder__split">
        <div className="musie-builder__phoneColumn">
          <div className="musie-builder__phone">
            <StepPreview
              exercise={exercise}
              config={config}
              step={current}
              steps={steps}
              locale={locale}
              mode={mode}
              onStepChange={setStep}
            />
          </div>
        </div>

        <div className="musie-builder__edit">
          <ContentBox headline={t(stepMessageKey(current))} headingLevel={2}>
            <BadgeRow>
              {entry?.mode !== undefined && (
                <Badge variant="neutral">
                  {t(entry.mode === 'digital' ? 'builder.mode.digital' : 'builder.mode.analogue')}
                </Badge>
              )}
              {(entry?.features ?? []).map((feature) => (
                <Badge key={feature} variant="neutral">{feature}</Badge>
              ))}
            </BadgeRow>

            {chrome && (
              <Message
                variant="info"
                headline={t('builder.chromeCopy.headline')}
                text={t('builder.chromeCopy')}
              />
            )}

            <Field
              label={t('builder.field.headline')}
              value={copy.headline}
              onValueChange={(value) => editCopy('headline', value)}
            />
            <Field
              label={t('builder.field.body')}
              description={t('builder.field.bodyHint')}
              multiline
              rows={8}
              value={copy.bodyMd}
              onValueChange={(value) => editCopy('bodyMd', value)}
            />
            {current === 'reflect' && (
              <>
                <Field
                  label={t('builder.field.placeholder')}
                  description={t('builder.field.placeholderHint')}
                  multiline
                  rows={3}
                  value={copy.placeholder ?? ''}
                  onValueChange={(value) => editCopy('placeholder', value)}
                />
                {/* THE REFLECT COPY DOES NOT SHOW IN THE PREVIEW, and saying
                    so is better than letting somebody type into a field and
                    watch nothing happen. `SessionReflect` draws the feelings,
                    the captured thoughts and two actions; the headline, the
                    text and this prompt live in the sheet behind
                    *Gedanken festhalten*, which is its own screen. */}
                <Message
                  variant="info"
                  headline={t('builder.reflectSheet.headline')}
                  text={t('builder.reflectSheet')}
                />
              </>
            )}
          </ContentBox>

          {/* ── THE ROTATING QUESTIONS ─────────────────────────────────────
              Ben, 2026-10-21: whether a listening exercise rotates questions
              is the therapist's call. The switch is on the listen step for
              every exercise, not only the two that have a set today. */}
          {current === 'listen' && listen !== undefined && (
            <ContentBox headline={t('builder.questions')} headingLevel={2}>
              <p className="musie-note">{t('builder.questions.intro')}</p>

              <Switch
                label={t('builder.questions.toggle')}
                checked={rotates}
                onCheckedChange={(on) => edit((draft) => {
                  const target = draft.run[listenIndex];
                  if (target === undefined) return;
                  if (on) {
                    if (!target.features.includes('rotating_question')) {
                      target.features.push('rotating_question', 'question_helper_ladder');
                    }
                    /* SEEDED IN EVERY TEXT LOCALE AT ONCE, with the same id:
                       the rotation indexes by position, so a set that exists
                       in one locale and not the other shows a German question
                       beside an English helper. */
                    if (target.questions === undefined) {
                      target.questions = {};
                      for (const code of draft.content.textLocales) {
                        target.questions[code] = [
                          { id: 'q-01', listen: '', reflect: '', helper: '' },
                        ];
                      }
                    }
                  } else {
                    target.features = target.features.filter(
                      (feature) => feature !== 'rotating_question'
                        && feature !== 'question_helper_ladder',
                    );
                    /* The written questions go with the switch: copy in the
                       file that nothing reads is the shape of thing somebody
                       edits later and wonders about. */
                    delete target.questions;
                  }
                })}
              />

              {rotates && questions.map((question, position) => (
                <div className="musie-builder__question" key={question.id}>
                  <BadgeRow>
                    <Badge variant="neutral">{question.id}</Badge>
                  </BadgeRow>
                  {(['listen', 'reflect', 'helper'] as const).map((field) => (
                    <Field
                      key={field}
                      label={t(
                        field === 'listen' ? 'builder.questions.listen'
                          : field === 'reflect' ? 'builder.questions.reflect'
                            : 'builder.questions.helper',
                      )}
                      description={t(
                        field === 'listen' ? 'builder.questions.listenHint'
                          : field === 'reflect' ? 'builder.questions.reflectHint'
                            : 'builder.questions.helperHint',
                      )}
                      multiline
                      rows={2}
                      value={question[field]}
                      onValueChange={(value) => edit((draft) => {
                        const target = draft.run[listenIndex];
                        const set = target?.questions?.[locale];
                        const found = set?.at(position);
                        if (found !== undefined) found[field] = value;
                      })}
                    />
                  ))}
                  <CtaButton
                    variant="ghost"
                    size="min"
                    onClick={() => edit((draft) => {
                      const target = draft.run[listenIndex];
                      if (target?.questions === undefined) return;
                      /* REMOVED FROM EVERY LOCALE. One locale short is the one
                         thing the validator cannot repair for you. */
                      for (const code of Object.keys(target.questions) as Locale[]) {
                        const set = target.questions[code];
                        if (set !== undefined) {
                          target.questions[code] = set.filter((q) => q.id !== question.id);
                        }
                      }
                    })}
                  >
                    {t('builder.questions.remove')}
                  </CtaButton>
                </div>
              ))}

              {rotates && (
                <CtaButton
                  variant="secondary"
                  onClick={() => edit((draft) => {
                    const target = draft.run[listenIndex];
                    if (target?.questions === undefined) return;
                    const id = nextQuestionId(target.questions[locale] ?? []);
                    for (const code of draft.content.textLocales) {
                      const set = target.questions[code] ?? [];
                      target.questions[code] = [
                        ...set, { id, listen: '', reflect: '', helper: '' },
                      ];
                    }
                  })}
                >
                  {t('builder.questions.add')}
                </CtaButton>
              )}
            </ContentBox>
          )}
        </div>
      </div>

      {/* ── WHAT IS WRONG WITH IT ────────────────────────────────────────
          Shown always, including when there is nothing: "no problems" is the
          answer the therapist wants before handing a file over, and a panel
          that appears only on failure cannot give it. */}
      <ContentBox headline={t('builder.problems')} headingLevel={2}>
        {problems.length === 0 && (
          <Message variant="success" headline={t('builder.problems.none')} />
        )}
        {problems.map((problem) => (
          <Message
            key={`${problem.path}:${problem.message}`}
            variant={problem.severity === 'error' ? 'error' : 'warning'}
            /* THE PATH IS THE HEADLINE: it is the part a reader scans for —
               which step, which field — and the sentence under it is what is
               wrong with it. The other way round buries the location. */
            headline={problem.path}
            text={problem.message}
          />
        ))}
      </ContentBox>

      <ContentBox headline={t('builder.hand')} headingLevel={2}>
        <p className="musie-note">{t('builder.hand.intro')}</p>
        <CtaButton variant="primary" onClick={onDownload}>
          {t('builder.download')}
        </CtaButton>
      </ContentBox>
    </div>
  );
}
