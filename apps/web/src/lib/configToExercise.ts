/**
 * A config back into an `Exercise` — so the builder's preview is the real
 * screen rather than a drawing of one.
 *
 * ── WHY THIS EXISTS AT ALL ────────────────────────────────────────────────
 * `buildExerciseConfig` goes database → config. This goes config → the shape
 * the session screens already take, and the point is that `SessionIntro`,
 * `SessionScan`, `SessionSelect`, `SessionView`, `SessionListen` and
 * `SessionReflect` can then be mounted WITH THE EDITED COPY IN THEM. What the
 * therapist sees is not a lookalike: it is the component the exercise runs.
 *
 * That is only possible because five of those six are pure — they take props
 * and import `Exercise` as a type. `SessionListen` is the exception and
 * writes two rows, but only from the play handler, so a preview nobody presses
 * play in writes nothing. The scanner never starts a camera on mount either;
 * `CardScanner` has no effect and calls `start()` from a tap.
 *
 * ── ONE VARIANT, AND BEN CHOSE THAT ───────────────────────────────────────
 * *"Du kannst einfach eine Ausprägung der Übung nehmen"* (2026-10-27). A card
 * exercise has two runs and every step has two locales, so a preview has to
 * pick: this takes a LOCALE and a MODE and renders that one. The editor says
 * which above it, and both are switchable.
 *
 * ── THE MODE OVERRIDE IS APPLIED HERE, NOT IN THE SCREEN ──────────────────
 * `StepCopy.digital` / `.analogue` carry only the fields that differ. The
 * session screens know nothing about modes-in-copy — they take one `introMd`
 * — so the resolution happens at this boundary, which is also the only place
 * it would happen if the app ever read configs for real.
 *
 * Pure: no supabase, no React. `Exercise` is a type-only import.
 */
import type { Exercise, Card } from './content';
import type { Locale } from '../i18n';
import { joinHeadline } from './exerciseConfig';
import type { ExerciseConfig, RunMode, StepCopy } from './exerciseConfig';
import type { StepId } from '../routeHandle';

/** The copy for one step, with the mode's overrides folded in. */
export function copyInMode(
  copy: StepCopy | undefined,
  mode: RunMode,
): StepCopy {
  if (copy === undefined) return { headline: '', bodyMd: '' };
  const override = mode === 'digital' ? copy.digital : copy.analogue;
  if (override === undefined) return copy;
  /* Only the fields the override spells. A `digital` block carrying just a
     `bodyMd` keeps the base headline, which is the common case and the reason
     the override is a `Partial`. */
  return { ...copy, ...override };
}

/** The steps this config runs in one mode, in order. */
export function stepsInMode(config: ExerciseConfig, mode: RunMode): StepId[] {
  return config.run
    .filter((entry) => entry.mode === undefined || entry.mode === mode)
    .map((entry) => entry.step);
}

function mdFor(
  config: ExerciseConfig,
  step: StepId,
  locale: Locale,
  mode: RunMode,
): string {
  const entry = config.run.find((candidate) => candidate.step === step);
  if (entry === undefined) return '';
  const copy = copyInMode(entry.copy[locale], mode);
  return joinHeadline(copy.headline, copy.bodyMd);
}

export function configToExercise(
  config: ExerciseConfig,
  locale: Locale,
  mode: RunMode,
): Exercise {
  const card = config.library[locale];
  const intro = config.run.find((entry) => entry.step === 'intro');
  const listen = config.run.find((entry) => entry.step === 'listen');
  const reflect = config.run.find((entry) => entry.step === 'reflect');
  const reflectCopy = copyInMode(reflect?.copy[locale], mode);

  return {
    id: config.id,
    kind: config.kind,
    timeframeMin: config.catalogue.timeframeMinutes.min,
    timeframeMax: config.catalogue.timeframeMinutes.max,
    /* Superseded by `kind` and held equal to it by a check constraint. Derived
       rather than carried, because the config does not state it twice. */
    needsCards: config.kind === 'card_based',
    cardsDealt: config.catalogue.cardsDealt,
    needsSound: true,
    /* Flattened to a boolean, exactly as `content.ts` flattens the column: the
       difference between *does not ask* and *could not be asked* belongs to
       the schema, not to a React prop. */
    asksPosture: intro?.features.includes('posture_question') ?? false,
    imageUrl: config.catalogue.artwork === '' ? null : config.catalogue.artwork,
    implemented: config.implemented,
    sort: config.catalogue.sort,
    listenGateSeconds: listen?.gateSeconds ?? 90,
    name: card?.name ?? '',
    description: card?.description ?? '',
    needs: card?.needs ?? null,
    introMd: mdFor(config, 'intro', locale, mode),
    scanMd: mdFor(config, 'scan', locale, mode),
    listenMd: mdFor(config, 'listen', locale, mode),
    reflectMd: mdFor(config, 'reflect', locale, mode),
    /* NULL IS KEPT, unlike the four `_md` fields above: null means this
       exercise asks nothing specific and the screen falls back to the
       catalogue sentence, where `''` would be a field with no prompt at all. */
    reflectPlaceholder: reflectCopy.placeholder === undefined
      || reflectCopy.placeholder.trim() === ''
      ? null
      : reflectCopy.placeholder,
    imageAlt: card?.imageAlt ?? '',
    goalIds: [...config.catalogue.goals],
  };
}

/**
 * A card to show the card steps, invented here and nowhere near the database.
 *
 * The scan, view, select and listen steps all draw one. Reading a real one
 * would mean a second query and a decision about WHICH — and the answer does
 * not matter: the copy is what is being edited, and the card is furniture for
 * it. `imageUrl` is null, which the card components already handle, because
 * five of the nine deck cards are genuinely silent and imageless.
 */
export function previewCard(): Card {
  return {
    id: 'preview-card',
    code: 'MC-01',
    imageUrl: null,
    sort: 1,
    feeling: '',
    imageAlt: null,
  };
}

/** A hand for `select`, as long as the exercise deals. */
export function previewHand(cardsDealt: number | null): Card[] {
  const count = cardsDealt ?? 1;
  return Array.from({ length: count }, (_, index) => ({
    ...previewCard(),
    id: `preview-card-${index + 1}`,
    code: `MC-0${index + 1}`,
    sort: index + 1,
  }));
}
