/**
 * `/goal-mappings` — which exercises each goal offers, as a thing you can tick.
 *
 * ── A TOOL, NOT A SCREEN ──────────────────────────────────────────────────
 * Linked from nowhere, reachable only by typing the path, and it is the same
 * kind of object `/dev/qr` is: something that exists so a decision can be
 * made quickly, rather than something the product shows anybody. It is
 * `lazy` in the route table for that reason — `FilterChips` is not used
 * anywhere else in the app, and a visitor who never types this path should
 * not download it.
 *
 * ── IT WRITES NOTHING, AND THAT IS THE DESIGN ─────────────────────────────
 * Content changes by migration only — there is no insert, update or delete
 * policy on `exercise_goals`, and a client write would be refused by the
 * privilege check before RLS was even consulted. So this reads the current
 * mapping, lets it be edited in the browser, and emits the CONFIG. Ben pastes
 * that back into the chat and it becomes the next migration.
 *
 * The round trip is the point: it keeps the database's history honest (every
 * change is a migration with a reason in its header) while making the
 * thinking part — which exercise serves which goal — a thing you do by
 * looking at it rather than by writing SQL.
 *
 * ── FILTERCHIPS, BECAUSE ITS VALUE TYPE IS THE ANSWER ─────────────────────
 * `FilterChipSelection` is `Record<string, string[]>`. Keyed by exercise,
 * holding goal ids, that IS the mapping — so there is no shape to convert and
 * nothing to keep in step. Dimensions are the exercises and values are the
 * goals, which also matches how the question is asked out loud: "which goals
 * does this exercise serve?"
 *
 * ONE INVARIANT TO REMEMBER: a dimension with nothing selected is ABSENT from
 * the selection, never present with an empty array. `configFor` puts those
 * exercises back as `[]`, because "serves no goal" is a real answer the
 * config has to be able to state.
 */
import * as React from 'react';
import { Sparkles } from 'lucide-react';
import { ContentBox, CtaButton, FilterChips } from '@musie/design-system';
import type { FilterChipSelection } from '@musie/design-system';
import { useT } from '../i18n/localeContext';
import { useExercises, useGoals } from '../lib/useContent';
import type { Exercise } from '../lib/content';

/**
 * The selection as the config, with every exercise named.
 *
 * SORTED, both the exercises and each one's goals, so pressing the button
 * twice without changing anything produces a byte-identical string — a diff
 * between two configs should show what was re-mapped and nothing else.
 */
function configFor(exercises: Exercise[], selection: FilterChipSelection): string {
  const exerciseGoals: Record<string, string[]> = {};
  for (const exercise of [...exercises].sort((a, b) => a.id.localeCompare(b.id))) {
    exerciseGoals[exercise.id] = [...(selection[exercise.id] ?? [])].sort();
  }
  return JSON.stringify({ exerciseGoals }, null, 2);
}

export function GoalMappings() {
  const t = useT();
  const { data: exerciseData, loading: exercisesLoading, error } = useExercises();
  const { data: goalData, loading: goalsLoading } = useGoals();

  const exercises = React.useMemo(() => exerciseData ?? [], [exerciseData]);
  const goals = React.useMemo(() => goalData ?? [], [goalData]);
  const loading = exercisesLoading || goalsLoading;

  const [selection, setSelection] = React.useState<FilterChipSelection | null>(null);
  const [config, setConfig] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  /* SEEDED ONCE, FROM THE DATABASE. `selection === null` means "not seeded
     yet" rather than "nothing selected", which is what lets an exercise be
     unticked down to zero goals without the seed putting them back. */
  React.useEffect(() => {
    if (selection !== null || loading || exercises.length === 0) return;
    const seeded: FilterChipSelection = {};
    for (const exercise of exercises) {
      /* THE INVARIANT: absent, not empty. An exercise mapped to no goal has
         no key at all. */
      if (exercise.goalIds.length > 0) seeded[exercise.id] = [...exercise.goalIds];
    }
    setSelection(seeded);
  }, [exercises, loading, selection]);

  const onCopy = React.useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch (thrown: unknown) {
      /* Insecure origin, or permission refused. The <pre> is still on screen
         and still selectable, so the config is not lost — only the shortcut. */
      console.error('[musie] could not copy the config:', thrown);
    }
  }, []);

  return (
    <div className="musie-goal-admin">
      <h1 className="musie-placeholder">{t('goalMap.headline')}</h1>
      <p className="musie-note">{t('goalMap.intro')}</p>

      {loading && <p className="musie-note">{t('content.loading')}</p>}
      {error !== null && <p className="musie-note">{t('content.errorDetail')}</p>}
      {!loading && exercises.length === 0 && <p className="musie-note">{t('content.empty')}</p>}

      {selection !== null && goals.length > 0 && (
        <div className="musie-goal-admin">
          <FilterChips
            name="goal-mapping"
            legend={t('goalMap.legend')}
            dimensions={exercises.map((exercise) => ({
              value: exercise.id,
              label: exercise.name,
              /* REQUIRED at level 1 — the glyph is the part that survives the
                 scroller's trailing edge. One for all five: they are the same
                 kind of thing, and five invented icons would imply a taxonomy
                 this tool does not have. */
              glyph: Sparkles,
              values: goals.map((goal) => ({ value: goal.id, label: goal.label })),
            }))}
            value={selection}
            onValueChange={(next) => { setSelection(next); setConfig(null); setCopied(false); }}
            emptyLabel={t('content.empty')}
          />

          <CtaButton
            variant="primary"
            className="musie-goal-admin__action"
            onClick={() => { setConfig(configFor(exercises, selection)); setCopied(false); }}
          >
            {t('goalMap.submit')}
          </CtaButton>
        </div>
      )}

      {config !== null && (
        <ContentBox headline={t('goalMap.outputLabel')} headingLevel={2}>
          <pre className="musie-goal-config">{config}</pre>
          <CtaButton variant="secondary" size="min" onClick={() => void onCopy(config)}>
            {copied ? t('goalMap.copied') : t('goalMap.copy')}
          </CtaButton>
        </ContentBox>
      )}
    </div>
  );
}
