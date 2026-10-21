/**
 * `/exercise-builder` — the exercise, as one file a music therapist can edit.
 *
 * ── A TOOL, NOT A SCREEN ──────────────────────────────────────────────────
 * The same kind of object `/goal-mappings` and `/dev/qr` are: linked from
 * nowhere, reachable only by typing the path, `lazy` in the route table. It is
 * `wide`, like `/maintenance`, because two columns of copy beside a preview is
 * what it is for.
 *
 * ── IT WRITES NOTHING, AND THAT IS THE WHOLE DESIGN ───────────────────────
 * Ben, 2026-10-21: *"The therapist can never push this to the db, but only
 * download a config file per exercise and hand this over to me."* So this
 * reads the live tables, lets the copy be edited in the browser, and emits a
 * file. No insert, no update, no `admin_write`, no Edge Function — the
 * therapist's browser holds an edit and a download button, and nothing else.
 *
 * That is not a limitation to be lifted later by accident. `exercise_i18n` has
 * no update policy for `authenticated`, so a client write would be refused by
 * the privilege check before RLS was consulted; this screen does not try. When
 * saving does arrive it arrives as a decision, through `admin_write` and
 * `content_edits`, with an operator's name on it — not as a button somebody
 * added here.
 *
 * ── WHY THE COPY IS SPLIT INTO A HEADLINE AND A BODY ──────────────────────
 * `exercise_i18n.<step>_md` is one Markdown string whose first line is a `## `
 * heading. To the person writing it those are two different things, and a
 * heading typed as `###` by accident is a bug nobody sees until it ships. So
 * `splitHeadline` lifts it out, the builder edits two fields, and
 * `joinHeadline` puts it back for the preview — which renders through the
 * SAME `Markdown` component the step itself uses, so what is on screen here is
 * what the step draws.
 *
 * ── WHAT IS NOT EDITABLE HERE, ON PURPOSE ─────────────────────────────────
 * Structure: which steps a run has, which features are on, the cut matrix, the
 * timeframes. Those are read out of the database and shown, because a config
 * states them and the therapist should see what they are handing over — but
 * changing them is changing what the app does, and the model's whole argument
 * is that the step list is code. The therapist edits TEXT, plus the one
 * structural switch Ben asked for: whether the listen step rotates questions.
 */
import * as React from 'react';
import {
  Badge, BadgeRow, ContentBox, CtaButton, Field, Message,
  RadioGroupText, SegmentedControl, Switch,
} from '@musie/design-system';
import { Languages } from 'lucide-react';
import { Markdown } from '../components/Markdown';
import { useT } from '../i18n/localeContext';
import { LOCALES } from '../i18n';
import type { Locale } from '../i18n';
import { stepMessageKey } from '../routeHandle';
import { getExercises, getExerciseCuts } from '../lib/content';
import type { Exercise } from '../lib/content';
import { QUESTION_SETS, questionsDe, questionsEn } from '../content/questions';
import { buildExerciseConfig, configToFile } from '../lib/buildExerciseConfig';
import type { QuestionSource } from '../lib/buildExerciseConfig';
import { joinHeadline, validateConfig } from '../lib/exerciseConfig';
import type { ExerciseConfig, QuestionText, StepCopy } from '../lib/exerciseConfig';

/** Where a new question's id comes from. Scoped to its set, so `q-01` in two
 *  exercises is two different questions and nothing collides. */
function nextQuestionId(existing: readonly QuestionText[]): string {
  const used = new Set(existing.map((question) => question.id));
  for (let n = 1; n < 100; n += 1) {
    const id = `q-${String(n).padStart(2, '0')}`;
    if (!used.has(id)) return id;
  }
  /* A hundred questions in one set is not a thing that happens; returning a
     duplicate would be worse than a long id. */
  return `q-${Date.now()}`;
}

/** The rotating set as `questions.ts` holds it, or undefined where there is
 *  none — which is three of the five exercises today. */
function questionSourceFor(exerciseId: string): QuestionSource | undefined {
  const ids = QUESTION_SETS[exerciseId];
  if (ids === undefined || ids.length === 0) return undefined;
  return { ids, de: questionsDe, en: questionsEn };
}

export function ExerciseBuilder() {
  const t = useT();

  const [configs, setConfigs] = React.useState<Record<string, ExerciseConfig> | null>(null);
  const [order, setOrder] = React.useState<string[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [locale, setLocale] = React.useState<Locale>('de');
  const [failed, setFailed] = React.useState(false);

  /* ONE LOAD, BOTH LOCALES, EVERY CUT. Three round trips rather than one per
     exercise: `exercise_cuts` has three rows in total, and the two exercise
     reads are the same query the catalogue already makes. */
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

  /** Every edit goes through here: clone the selected config, hand it to a
   *  mutator, put it back. One place, so nothing edits a config in place. */
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

  const editCopy = React.useCallback(
    (stepIndex: number, field: keyof StepCopy, value: string) => {
      edit((draft) => {
        const step = draft.run[stepIndex];
        if (step === undefined) return;
        const copy = step.copy[locale] ?? { headline: '', bodyMd: '' };
        step.copy[locale] = { ...copy, [field]: value };
      });
    },
    [edit, locale],
  );

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
    /* Revoked on the next tick rather than immediately: Safari reads the href
       after the click returns, and revoking in the same turn gives an empty
       file with no error anywhere. */
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [config]);

  if (failed) return <p className="musie-note">{t('content.errorDetail')}</p>;
  if (configs === null) return <p className="musie-note">{t('content.loading')}</p>;
  if (config === undefined || order.length === 0) {
    return <p className="musie-note">{t('content.empty')}</p>;
  }

  const library = config.library[locale] ?? {
    name: '', description: '', needs: null, imageAlt: '',
  };
  const listenIndex = config.run.findIndex((step) => step.step === 'listen');
  const listen = listenIndex === -1 ? undefined : config.run[listenIndex];
  const rotates = listen?.features.includes('rotating_question') ?? false;
  const questions = listen?.questions?.[locale] ?? [];

  return (
    <div className="musie-builder">
      <h1 className="musie-placeholder">{t('builder.headline')}</h1>
      <p className="musie-note">{t('builder.intro')}</p>

      <ContentBox headline={t('builder.pick')} headingLevel={2}>
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
            /* ONE GLYPH FOR BOTH, the way /goal-mappings uses one for all five
               exercises: they are the same kind of thing, and two invented
               icons would imply a difference between the languages that there
               is not. The label carries which; the glyph carries what. */
            glyph: Languages,
          }))}
          value={locale}
          onValueChange={(next) => setLocale(next as Locale)}
        />

        <BadgeRow>
          <Badge variant="neutral">{config.kind}</Badge>
          <Badge variant={config.implemented ? 'success' : 'warning'}>
            {t(config.implemented ? 'builder.implemented' : 'builder.unimplemented')}
          </Badge>
        </BadgeRow>
      </ContentBox>

      {/* ── THE LIBRARY CARD ─────────────────────────────────────────────
          The exercise before anybody starts it: what /exercises shows. Not a
          step's copy, which is why it sits in its own box. */}
      <ContentBox headline={t('builder.library')} headingLevel={2}>
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
            /* EMPTY MEANS NONE, and it has to become null rather than '': the
               intro step's `needs_note` feature is derived from this being
               non-null, so an empty string would promise a note with no text. */
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
      </ContentBox>

      {/* ── THE STEPS ────────────────────────────────────────────────────── */}
      {config.run.map((step, index) => {
        const copy = step.copy[locale] ?? { headline: '', bodyMd: '' };
        /* Off the config, not off the step id: `copySource` is the fact, and
           the day `select` gains content columns this screen needs no edit. */
        const chrome = step.copySource === 'chrome';

        return (
          <ContentBox
            key={`${step.step}-${step.mode ?? 'both'}`}
            headline={t(stepMessageKey(step.step))}
            headingLevel={2}
          >
            <BadgeRow>
              {step.mode !== undefined && (
                <Badge variant="neutral">
                  {t(step.mode === 'digital' ? 'builder.mode.digital' : 'builder.mode.analogue')}
                </Badge>
              )}
              {step.features.map((feature) => (
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

            <div className="musie-builder__split">
              <div className="musie-builder__edit">
                <Field
                  label={t('builder.field.headline')}
                  value={copy.headline}
                  onValueChange={(value) => editCopy(index, 'headline', value)}
                />
                <Field
                  label={t('builder.field.body')}
                  description={t('builder.field.bodyHint')}
                  multiline
                  rows={6}
                  value={copy.bodyMd}
                  onValueChange={(value) => editCopy(index, 'bodyMd', value)}
                />
                {step.step === 'reflect' && (
                  <Field
                    label={t('builder.field.placeholder')}
                    description={t('builder.field.placeholderHint')}
                    multiline
                    rows={3}
                    value={copy.placeholder ?? ''}
                    onValueChange={(value) => editCopy(index, 'placeholder', value)}
                  />
                )}
              </div>

              {/* THE SAME RENDERER THE STEP USES. Not a lookalike: if this
                  draws it, the step draws it. */}
              <div className="musie-builder__preview">
                <p className="musie-builder__previewLabel">{t('builder.preview')}</p>
                <Markdown md={joinHeadline(copy.headline, copy.bodyMd)} />
              </div>
            </div>
          </ContentBox>
        );
      })}

      {/* ── THE ROTATING QUESTIONS ───────────────────────────────────────
          Ben, 2026-10-21: whether a listening exercise rotates questions is
          the therapist's call, not ours. So this switch is on every exercise
          with a listen step, not only the two that have a set today. */}
      {listen !== undefined && (
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
                /* SEEDED IN EVERY TEXT LOCALE AT ONCE, with the same id. The
                   rotation indexes by position, so a set that exists in one
                   locale and not the other shows a German question beside an
                   English helper. */
                if (target.questions === undefined) {
                  const id = 'q-01';
                  const blank = { id, listen: '', reflect: '', helper: '' };
                  target.questions = {};
                  for (const code of draft.content.textLocales) {
                    target.questions[code] = [{ ...blank }];
                  }
                }
              } else {
                target.features = target.features.filter(
                  (feature) => feature !== 'rotating_question' && feature !== 'question_helper_ladder',
                );
                /* The written questions go with the switch. Leaving them would
                   put copy in the file that nothing reads, which is the shape
                   of thing somebody edits later and wonders about. */
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
                    const entry = set?.at(position);
                    if (entry !== undefined) entry[field] = value;
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
                  target.questions[code] = [...set, { id, listen: '', reflect: '', helper: '' }];
                }
              })}
            >
              {t('builder.questions.add')}
            </CtaButton>
          )}
        </ContentBox>
      )}

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
            /* THE PATH IS THE HEADLINE. It is the part a reader scans for —
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
