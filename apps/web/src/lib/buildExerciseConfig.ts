/**
 * The live database → one `ExerciseConfig`. The direction content travels for
 * now, and the only way a config comes into existence today.
 *
 * ── WHY THERE IS NO EXPORT SCRIPT ─────────────────────────────────────────
 * The obvious shape is `pnpm exercises:export`, a `.mjs` beside
 * `content-export.mjs`, writing five files into `supabase/content/exercises/`.
 * It is not here, and the reason is one import: the rotating questions live in
 * `content/questions.ts` as TypeScript — `QUESTION_SETS`, `questionsDe`,
 * `questionsEn` — and Node cannot import that. Making it importable means
 * moving the copy into JSON and giving up the `Record<QuestionId, QuestionText>`
 * completeness check that file is built around.
 *
 * That move has to happen (the `QuestionId` union is the blocker the model
 * names), but it is a change to a file three screens read, and it is not what
 * today is for. So the BUILDER assembles configs in the browser, where both
 * the database and `questions.ts` are ordinary imports, and the therapist
 * downloads the result. Logged in OPEN-QUESTIONS.md.
 *
 * ── IT DESCRIBES TODAY, IT DOES NOT PROPOSE ───────────────────────────────
 * Every feature below is switched on because something in the app switches it
 * on today, mirroring the conditional that does it. This file is therefore the
 * place those conditionals are written down twice, which is a cost — paid on
 * purpose, because the second copy is the one that can be checked.
 *
 * `import type` only, from `content.ts`: the type is erased at compile time, so
 * this module stays free of supabase and stays testable without a database.
 */
import type { Exercise } from './content';
import type { Locale } from '../i18n';
import { LOCALES } from '../i18n';
import { DEFAULT_POSTURE, DEFAULT_ENDING } from './exerciseKind';
import { splitHeadline } from './exerciseConfig';
import type {
  ExerciseConfig, RunStep, StepCopy, CutExpectation, QuestionText, LibraryCopy,
} from './exerciseConfig';

/** One `exercise_cuts` row, only the columns a config can be checked against. */
export interface CutRow {
  locale: string;
  posture: string | null;
  ending: string | null;
  voice_src: string | null;
  intro_until: number | null;
}

/** The rotating set for one exercise, already resolved out of `questions.ts`. */
export interface QuestionSource {
  ids: readonly string[];
  de: Record<string, { listen: string; reflect: string; helper: string }>;
  en: Record<string, { listen: string; reflect: string; helper: string }>;
}

export interface ExerciseSource {
  /** The same row read twice, once per locale. */
  byLocale: Record<Locale, Exercise>;
  cuts: CutRow[];
  /** Absent where this exercise draws from no question set, which is three
   *  of the five today. */
  questions?: QuestionSource;
}

/** `exercise_cuts` spells a wildcard as null; a config spells it `any`. */
function asAny(value: string | null): string {
  return value ?? 'any';
}

function copyFor(exercise: Exercise, step: string): StepCopy {
  const md = step === 'intro' ? exercise.introMd
    : step === 'scan' ? exercise.scanMd
      : step === 'listen' ? exercise.listenMd
        : step === 'reflect' ? exercise.reflectMd
          : '';

  const { headline, bodyMd } = splitHeadline(md);
  const copy: StepCopy = { headline, bodyMd };

  /* ONLY WHERE IT MEANS SOMETHING. `reflect_placeholder` is null-meaningful —
     null is "this exercise asks nothing specific" and the screen falls back to
     the catalogue sentence. An empty string here would be a field with no
     prompt, which is a different and worse thing. */
  if (step === 'reflect' && exercise.reflectPlaceholder !== null) {
    copy.placeholder = exercise.reflectPlaceholder;
  }

  return copy;
}

function libraryFor(exercise: Exercise): LibraryCopy {
  return {
    name: exercise.name,
    description: exercise.description,
    needs: exercise.needs,
    imageAlt: exercise.imageAlt,
  };
}

function questionsFor(source: QuestionSource, locale: Locale): QuestionText[] {
  const table = locale === 'de' ? source.de : source.en;
  return source.ids.map((id) => ({
    id,
    listen: table[id]?.listen ?? '',
    reflect: table[id]?.reflect ?? '',
    helper: table[id]?.helper ?? '',
  }));
}

export function buildExerciseConfig(source: ExerciseSource): ExerciseConfig {
  const base = source.byLocale.de;
  const card = base.kind === 'card_based';
  const listening = base.kind === 'listening_only';

  /* ── Which locales have what ──────────────────────────────────────────
     TEXT is a row with a name in it. A RECORDING is a cut row — for a card
     exercise there are none, because its audio is the card's track and music
     has no language, so the two lists are the same. For a listening exercise
     they come apart, and saying so is most of the point: Klangreise has
     English text and no English recording. */
  const textLocales = LOCALES.filter((locale) => source.byLocale[locale].name.trim() !== '');
  const cutLocales = [...new Set(source.cuts.map((cut) => cut.locale))]
    .filter((locale): locale is Locale => (LOCALES as readonly string[]).includes(locale));
  const locales = listening ? cutLocales : textLocales;

  const hasVoiceStem = source.cuts.some((cut) => cut.voice_src !== null);
  const hasIntroMark = source.cuts.some((cut) => cut.intro_until !== null);
  const rotates = source.questions !== undefined && source.questions.ids.length > 0;

  const perLocale = <T,>(make: (locale: Locale) => T): Partial<Record<Locale, T>> => {
    const out: Partial<Record<Locale, T>> = {};
    for (const locale of textLocales) out[locale] = make(locale);
    return out;
  };

  const run: RunStep[] = [];

  /* ── intro ───────────────────────────────────────────────────────────── */
  const introFeatures: string[] = [];
  /* `asksForCards` in Session.tsx — and `cards_dealt` non-null is what makes a
     digital hand possible at all. */
  if (card && base.cardsDealt !== null) introFeatures.push('mode_switch');
  if (listening && base.asksPosture) introFeatures.push('posture_question');
  /* No column. Every listening exercise asks it, gated on the kind alone. */
  if (listening) introFeatures.push('ending_question');
  if (base.needs !== null) introFeatures.push('needs_note');

  const intro: RunStep = {
    step: 'intro',
    features: introFeatures,
    copy: perLocale((locale) => copyFor(source.byLocale[locale], 'intro')),
  };
  if (listening) {
    intro.ask = {
      /* Null where the question does not arise, mirroring `asks_posture`'s
         three states rather than flattening to false. */
      posture: base.asksPosture ? { default: DEFAULT_POSTURE } : null,
      ending: { default: DEFAULT_ENDING },
    };
  }
  run.push(intro);

  /* ── the second step, which is one slot and two steps ────────────────── */
  if (card) {
    run.push({
      step: 'scan',
      mode: 'analogue',
      features: ['card_scan_camera', 'card_scan_code', 'card_scan_deeplink'],
      copy: perLocale((locale) => copyFor(source.byLocale[locale], 'scan')),
    });

    if (base.cardsDealt !== null) {
      /* `stepsForRun`: more than one dealt is something to choose between,
         one is something to look at. */
      const digital: RunStep = base.cardsDealt > 1
        ? {
          step: 'select', mode: 'digital', features: ['card_pick_from_hand'],
          copySource: 'chrome', copy: {},
        }
        : {
          step: 'view', mode: 'digital', features: ['card_dealt_single'],
          copySource: 'chrome', copy: {},
        };

      /* THESE TWO HAVE NO CONTENT COLUMNS. `session.select.*` and
         `session.view.*` are chrome, in `i18n/*`, so there is nothing in the
         database to read and the copy comes out empty. The builder shows it as
         a hole to fill rather than hiding the step, because filling it is
         exactly what moving that copy out of chrome will mean. */
      digital.copy = perLocale(() => ({ headline: '', bodyMd: '' }));
      run.push(digital);
    }
  }

  /* ── listen ──────────────────────────────────────────────────────────── */
  const listenFeatures: string[] = [];
  if (card) {
    listenFeatures.push('track_from_card', 'card_visual', 'infographic', 'track_reveal');
  }
  if (listening) {
    listenFeatures.push('cut_from_answers');
    if (hasVoiceStem) listenFeatures.push('voice_track_mix', 'mute_background');
    if (hasIntroMark) listenFeatures.push('skip_intro');
  }
  if (rotates) listenFeatures.push('rotating_question', 'question_helper_ladder');
  listenFeatures.push('immersive_view');

  const listen: RunStep = {
    step: 'listen',
    gateSeconds: base.listenGateSeconds,
    features: listenFeatures,
    copy: perLocale((locale) => copyFor(source.byLocale[locale], 'listen')),
  };

  if (listening) {
    /* Straight off the rows, deduplicated and sorted so two runs of the
       builder produce the same file. */
    const seen = new Set<string>();
    const expects: CutExpectation[] = [];
    for (const cut of source.cuts) {
      const key = `${asAny(cut.posture)}/${asAny(cut.ending)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      expects.push({
        posture: asAny(cut.posture) as CutExpectation['posture'],
        ending: asAny(cut.ending) as CutExpectation['ending'],
      });
    }
    expects.sort((a, b) => `${a.posture}/${a.ending}`.localeCompare(`${b.posture}/${b.ending}`));
    listen.cuts = { expects };
  }

  if (rotates && source.questions !== undefined) {
    const questions = source.questions;
    listen.questions = perLocale((locale) => questionsFor(questions, locale));
  }

  run.push(listen);

  /* ── reflect ─────────────────────────────────────────────────────────── */
  run.push({
    step: 'reflect',
    /* All three modes and all three sheets, always, because that is what the
       screen does today — hard-coded, with nothing to read them off. */
    features: [
      'mode_text', 'mode_voice', 'mode_photo',
      'sheet_feelings', 'sheet_thoughts', 'sheet_understand',
    ],
    copy: perLocale((locale) => copyFor(source.byLocale[locale], 'reflect')),
  });

  return {
    $schema: './exercise.schema.json',
    id: base.id,
    kind: base.kind,
    implemented: base.implemented,
    /* Null where the exercise draws no card: there is nothing physical to lay
       out, so analogue-or-digital does not arise. The three-state shape
       `asks_posture` uses, for the same reason. */
    modes: card && base.cardsDealt !== null
      ? { offers: 'both', default: 'analogue' }
      : null,
    catalogue: {
      sort: base.sort,
      timeframeMinutes: { min: base.timeframeMin, max: base.timeframeMax },
      cardsDealt: base.cardsDealt,
      artwork: base.imageUrl ?? '',
      goals: [...base.goalIds].sort(),
    },
    library: perLocale((locale) => libraryFor(source.byLocale[locale])),
    run,
    content: { locales, textLocales: [...textLocales] },
  };
}

/**
 * The config as the file the therapist downloads.
 *
 * Two spaces and a trailing newline, matching `content-export.mjs` — and
 * STABLE: nothing here depends on a clock or on key insertion order beyond
 * what the builder already fixed, so downloading twice without editing
 * produces identical bytes. A file that differs on every save makes a diff
 * useless, and a diff is the entire point of handing this over.
 */
export function configToFile(config: ExerciseConfig): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}
