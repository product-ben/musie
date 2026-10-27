/**
 * ONE FILE SAYS WHAT AN EXERCISE IS — the shape, and the rules it must obey.
 *
 * `docs/EXERCISE-MODEL.md` is the argument; this is the contract. Until
 * 2026-10-21 the answer lived in four places that could not be read together:
 * columns on `public.exercises`, constants in `exerciseKind.ts` and
 * `content/questions.ts`, conditionals inside four screens, and four content
 * tables. Nothing could check that the four agreed, and they did not.
 *
 * ── THIS FILE IS PURE ──────────────────────────────────────────────────────
 * No supabase, no React, no i18n. Same bargain `exerciseKind.ts` and
 * `sessionMachine.ts` make: every rule in here is testable without a database,
 * which is the whole point of having written the rules down.
 *
 * ── NOTHING READS A CONFIG AT RUNTIME YET, AND THAT IS DELIBERATE ──────────
 * Ben, 2026-10-21: the builder downloads a file and hands it over; it never
 * writes to the database. So these types describe an ARTEFACT, not a source of
 * truth — the app still runs off the tables. When that inverts, this file is
 * where the inversion starts, and `validateConfig` is what stops a config that
 * promises something the app cannot do.
 *
 * ── THE CLOSED REGISTRY IS THE WHOLE IDEA ──────────────────────────────────
 * A config may name only features the APP enumerates (`STEP_FEATURES` below),
 * and the typechecker owns that list. An unknown feature is a validation
 * error rather than a screen that renders nothing. The config says WHICH OF
 * THE THINGS THE APP CAN DO this exercise does; it never invents a capability.
 *
 * What is NOT in here, on purpose:
 *   · the step list — `STEP_IDS` is the library, and a step is a React screen
 *   · the posture and ending OPTIONS — a new one needs a glyph, a label in two
 *     locales and a recording, so it is a screen, not a setting
 *   · a recording's own facts — `mixed_src`, `duration_seconds`, `intro_until`
 *     belong to `music.json` and `pnpm music:migration`. A second writer of
 *     `exercise_cuts` is the overlap CLAUDE.md 4.1 exists to prevent.
 */
import { STEP_IDS } from '../routeHandle';
import type { StepId } from '../routeHandle';
import { EXERCISE_KINDS, POSTURES, ENDINGS } from './exerciseKind';
import type { ExerciseKind, Posture, Ending } from './exerciseKind';
import { LOCALES } from '../i18n';
import type { Locale } from '../i18n';

/* ── THE FEATURE REGISTRY ──────────────────────────────────────────────────
 *
 * Per step, because a feature is only meaningful on the screen that draws it:
 * `mode_voice` on `listen` is a schema error, not a no-op. Drawn from the code
 * as it stands — every entry is something a screen already does today, and the
 * right-hand column of the table in `docs/EXERCISE-MODEL.md` says where.
 *
 * A `Record` keyed by `StepId`, so a seventh step added to `STEP_IDS` is a
 * compile error here, where the answer has to be written.
 */
export const STEP_FEATURES: Record<StepId, readonly string[]> = {
  intro: ['mode_switch', 'posture_question', 'ending_question', 'needs_note'],
  scan: ['card_scan_camera', 'card_scan_code', 'card_scan_deeplink'],
  view: ['card_dealt_single'],
  select: ['card_pick_from_hand'],
  listen: [
    'track_from_card', 'cut_from_answers', 'voice_track_mix', 'mute_background',
    'skip_intro', 'card_visual', 'infographic', 'rotating_question',
    'question_helper_ladder', 'track_reveal', 'immersive_view',
  ],
  reflect: [
    'mode_text', 'mode_voice', 'mode_photo',
    'sheet_feelings', 'sheet_thoughts', 'sheet_understand',
    'statement_segmentation', 'feelings_scale',
  ],
};

/** Every feature name the app knows, flattened. Order is `STEP_IDS` order. */
export const ALL_FEATURES: readonly string[] =
  STEP_IDS.flatMap((step) => STEP_FEATURES[step]);

/* ── THE SHAPE ─────────────────────────────────────────────────────────── */

/** Which of the two ways of running a card exercise this one offers. */
export const MODE_OFFERS = ['analogue', 'digital', 'both'] as const;
export type ModeOffer = (typeof MODE_OFFERS)[number];
export type RunMode = 'analogue' | 'digital';

/**
 * Null, not absent, where the question does not arise.
 *
 * Copied from `exercises.asks_posture`, which is three-state with a CHECK
 * holding it to the kind: asks, does not ask, and the question does not arise.
 * A boolean loses the third, and false-for-the-wrong-reason reads exactly like
 * false-for-the-right-one.
 */
export interface ModeConfig {
  offers: ModeOffer;
  /** Which one a run starts in. Only meaningful when `offers` is `both`. */
  default: RunMode;
}

/** One question of a rotating set: three texts, in one locale. */
export interface QuestionText {
  /** Scoped to its own set, NOT a member of a global union. See the note on
   *  `validateConfig`'s question rules. */
  id: string;
  /** Shown under the player while the recording runs. */
  listen: string;
  /** Shown again on the reflect step, as a question rather than a prompt. */
  reflect: string;
  /** The ladder behind `?`. One rung today. */
  helper: string;
}

/** What one step says, in one locale, in one mode. */
export interface StepCopy {
  /** The `## ` line of today's `<step>_md`, lifted out so it can be a field. */
  headline: string;
  /** Everything under it. Markdown. */
  bodyMd: string;
  /** `exercise_i18n.reflect_placeholder`. Only the reflect step has one. */
  placeholder?: string;
  /** The forward action. Absent falls back to the chrome `MessageKey`. */
  continueLabel?: string;
  /**
   * The step's OTHER button, where it has two — *Karten ansehen* on `select`,
   * *Karte ansehen* on `view`, *Nochmal scannen* on `scan`.
   *
   * Absent falls back to chrome, exactly like `continueLabel`. Added
   * 2026-10-27: the builder showed neither, so every button in the app was
   * invisible to the person whose job is the wording.
   */
  secondaryLabel?: string;
  /** Overrides for a digital run — the cards are on screen, not on a table. */
  digital?: Partial<StepCopy>;
  /** Overrides for an analogue run. Rare; the base case is usually analogue. */
  analogue?: Partial<StepCopy>;
}

/** Whether a question is asked, and what is preselected. */
export interface AskConfig {
  /** One of the options the app enumerates. A config cannot add one. */
  default: string;
}

/** One answer combination the run can produce, in `exercise_cuts` vocabulary. */
export interface CutExpectation {
  /** A posture, or `any` for the table's null wildcard. */
  posture: Posture | 'any';
  /** An ending, or `any` for the table's null wildcard. */
  ending: Ending | 'any';
}

export interface RunStep {
  step: StepId;
  /** Binds the step to one mode. `scan` is analogue; `select`/`view` digital. */
  mode?: RunMode;
  features: string[];
  /** `listen` only. The gate before the forward action unlocks. */
  gateSeconds?: number;
  /** `intro` only. A key present means ask it; `null` means it cannot arise. */
  ask?: Partial<Record<'posture' | 'ending', AskConfig | null>>;
  /** `listen` only, and only with `cut_from_answers`. */
  cuts?: { expects: CutExpectation[] };
  /** `listen` only, and only with `rotating_question`. Keyed by locale. */
  questions?: Partial<Record<Locale, QuestionText[]>>;
  /**
   * WHERE THIS STEP'S WORDS COME FROM, and `chrome` is the uncomfortable one.
   *
   * `select` and `view` have no content columns at all — no `select_md`, no
   * `view_md`. Every word they show is a `MessageKey` in `i18n/*`:
   * `session.select.headline` is *Wähle eine Karte aus*, which is also the
   * `## ` heading of `scan_md`. The same headline, twice, in two systems, one
   * editable and one not.
   *
   * So their copy is EXPECTED to be empty, and the content rules are skipped
   * for them. Without this the builder opened on four red errors that no
   * therapist can resolve — and a panel that is red on arrival is a panel
   * nobody reads, which is the failure CLAUDE.md keeps naming.
   *
   * It is not a way of excusing a hole. It is the hole, stated: moving that
   * copy out of chrome is what makes these steps editable, and this field is
   * what the move deletes.
   */
  copySource?: 'content' | 'chrome';
  copy: Partial<Record<Locale, StepCopy>>;
}

/** The catalogue card, which is the exercise before anybody starts it. */
export interface CatalogueConfig {
  sort: number;
  timeframeMinutes: { min: number; max: number };
  cardsDealt: number | null;
  artwork: string;
  goals: string[];
}

/** The exercise's own name and blurb, per locale. Not a step's copy. */
export interface LibraryCopy {
  name: string;
  description: string;
  /** What to have to hand. Null where the exercise needs nothing. */
  needs: string | null;
  imageAlt: string;
}

/** How a field came to hold what it holds. */
export type ChangeOrigin = 'hand' | 'prompt' | 'translation';

/** Whether a change needs a decision before the file can be applied. */
export type ChangeKind = 'text' | 'structural';

export interface ConfigChange {
  /** Dotted path into the config, as the builder and the validator spell it. */
  path: string;
  kind: ChangeKind;
  /** The value as the database had it. Null where the field did not exist. */
  before: string | null;
  /** The value now. Null where the field is gone. */
  after: string | null;
  by: ChangeOrigin;
  /** The therapist's own words, where `by` is `prompt`. */
  prompt?: string;
}

/** One thing she asked for in her own words. */
export interface HandoverRequest {
  /** ISO 8601, UTC. */
  at: string;
  prompt: string;
  /** False where it was declined as structural, or recorded as a note. */
  applied: boolean;
  /** Why not, where it was not. */
  reason?: string;
}

export interface Handover {
  /**
   * FALSE MEANS STOP. The file still describes a complete exercise; what it
   * also contains is at least one change that needs an implementation
   * decision, so uploading it without reading `blockers` would apply something
   * nobody agreed to.
   */
  safeToApply: boolean;
  /** One line per structural change or declined request. Empty when safe. */
  blockers: string[];
  /** What this was built from, so a reader can tell whether it has gone stale. */
  baseline: { takenAt: string };
  changes: ConfigChange[];
  requests: HandoverRequest[];
  /** Paths whose text a model wrote rather than a person. */
  machineTranslated: string[];
}

export interface ExerciseConfig {
  $schema?: string;
  /**
   * WHAT CHANGED, AND WHETHER IT CAN JUST BE APPLIED — Ben, 2026-10-27.
   *
   * First key after `$schema`, because its whole job is to be read before the
   * rest of the file. Absent on a config straight out of the database: a file
   * nobody has edited has nothing to hand over.
   *
   * `exerciseChanges.ts` computes it. The shape lives here with the rest of
   * the contract so one file says what a config IS.
   */
  handover?: Handover;
  id: string;
  kind: ExerciseKind;
  implemented: boolean;
  /** Null where the exercise has no cards, so the question does not arise. */
  modes: ModeConfig | null;
  catalogue: CatalogueConfig;
  library: Partial<Record<Locale, LibraryCopy>>;
  run: RunStep[];
  content: {
    /** Locales with a RECORDING. */
    locales: Locale[];
    /** Locales with TEXT. May be wider than `locales`, and saying so is the
     *  point — Klangreise has English text and no English recording. */
    textLocales: Locale[];
  };
}

/* ── THE HEADLINE SPLIT ────────────────────────────────────────────────────
 *
 * `exercise_i18n.<step>_md` is one string whose first line is a `## ` heading.
 * The builder edits a headline and a body as two fields, because that is what
 * they are to the person writing them — and because a heading typed as `###`
 * by accident is a bug nobody sees until it ships.
 *
 * Round-trip: `joinHeadline(splitHeadline(md))` is `md` for every row in the
 * database today, which `exerciseConfig.test.ts` asserts against real copy.
 * It is NOT identity for arbitrary Markdown, and it does not pretend to be:
 * a body that happens to start with its own `## ` would lose a blank line.
 */
const HEADLINE_LINE = /^##\s+(.*)$/;

export function splitHeadline(md: string | null): { headline: string; bodyMd: string } {
  if (md === null || md.trim() === '') return { headline: '', bodyMd: '' };

  const lines = md.split('\n');
  const first = lines.at(0) ?? '';
  const match = HEADLINE_LINE.exec(first.trim());

  /* No heading: the whole string is the body, and the headline is empty rather
     than invented. A step whose copy has no heading is a hole the validator
     reports; guessing one here would hide it. */
  if (match === null) return { headline: '', bodyMd: md.trim() };

  return {
    headline: (match.at(1) ?? '').trim(),
    bodyMd: lines.slice(1).join('\n').trim(),
  };
}

export function joinHeadline(headline: string, bodyMd: string): string {
  const head = headline.trim();
  const body = bodyMd.trim();
  if (head === '') return body;
  if (body === '') return `## ${head}`;
  return `## ${head}\n\n${body}`;
}

/* ── VALIDATION ────────────────────────────────────────────────────────────
 *
 * Every rule here exists because something it describes went wrong, or would
 * have. The three the plan predicted on 2026-10-13 and that were still live on
 * 2026-10-21 are marked.
 *
 * A LIST, NOT A THROW. The builder shows every problem at once: a therapist
 * who has emptied three fields wants to see three, not the first one.
 */
export type ProblemSeverity = 'error' | 'warning';

export interface ConfigProblem {
  severity: ProblemSeverity;
  /** Dotted path into the config, so the builder can point at a field. */
  path: string;
  /** A sentence. Not a key: this is a developer- and operator-facing tool and
   *  the message names identifiers, which do not translate. */
  message: string;
}

/** What the validator cannot know from the file alone. */
export interface ValidationContext {
  /** `(posture, ending)` pairs `exercise_cuts` holds, per locale. Nulls come
   *  through as `any`, which is exactly how the table spells a wildcard. */
  cutsByLocale?: Partial<Record<Locale, CutExpectation[]>>;
  /** Cut ids whose `intro_until` is set, per locale — for `skip_intro`. */
  introUntilByLocale?: Partial<Record<Locale, boolean>>;
  /** Whether a guidance-only stem exists, per locale — for `mute_background`. */
  voiceStemByLocale?: Partial<Record<Locale, boolean>>;
}

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** `pickCut`'s rule, as a predicate: an exact match, or a null wildcard. */
function served(want: CutExpectation, have: readonly CutExpectation[]): boolean {
  return have.some(
    (row) =>
      (row.posture === 'any' || row.posture === want.posture) &&
      (row.ending === 'any' || row.ending === want.ending),
  );
}

export function validateConfig(
  config: ExerciseConfig,
  context: ValidationContext = {},
): ConfigProblem[] {
  const problems: ConfigProblem[] = [];
  const error = (path: string, message: string) =>
    problems.push({ severity: 'error', path, message });
  const warn = (path: string, message: string) =>
    problems.push({ severity: 'warning', path, message });

  /* ── Structure ──────────────────────────────────────────────────────── */

  if (!EXERCISE_KINDS.includes(config.kind)) {
    error('kind', `${config.kind} is not one of ${EXERCISE_KINDS.join(', ')}.`);
  }

  const steps = config.run.map((entry) => entry.step);
  for (const step of steps) {
    if (!STEP_IDS.includes(step)) error('run', `${step} is not a step the app has.`);
  }
  if (new Set(steps).size !== steps.length) {
    error('run', 'A step appears twice. Each step runs at most once.');
  }

  /* IN STEP_IDS ORDER. The rail draws them in that order whatever the file
     says, so a file in another order is a file that lies about the run. */
  const ordered = STEP_IDS.filter((step) => steps.includes(step));
  if (ordered.join() !== steps.join()) {
    error('run', `Steps must be in ${STEP_IDS.join(' · ')} order.`);
  }

  /* ── Modes ──────────────────────────────────────────────────────────── */

  const offers = config.modes?.offers ?? null;
  if (config.modes !== null) {
    if (!MODE_OFFERS.includes(config.modes.offers)) {
      error('modes.offers', `${config.modes.offers} is not one of ${MODE_OFFERS.join(', ')}.`);
    }
    if (offers !== 'both' && config.modes.default !== offers) {
      error('modes.default', `Offers only ${offers}, so that is the only legal default.`);
    }
  }

  /* ── THE CONFIG DECLARES BOTH RUNS; A MODE RESOLVES ONE ─────────────────
     A card exercise that offers both carries `scan` tagged analogue AND
     `select` tagged digital, in ONE `run` array. That is not a run with two
     second steps: it is two runs written once, the way `stepsForRun`
     substitutes rather than branching.

     So the "same slot" rule is checked on each RESOLVED run and never on the
     array. Checking the array refuses exactly the file every card exercise
     has to have — which is how this rule read for its first half hour. */
  const resolve = (mode: RunMode): StepId[] =>
    config.run
      .filter((entry) => entry.mode === undefined || entry.mode === mode)
      .map((entry) => entry.step);

  /* Which modes are worth resolving. An analogue-only exercise has no digital
     run, and reporting a collision in a run nobody can reach is noise. */
  const liveModes: RunMode[] = offers === null
    ? ['analogue']
    : offers === 'both' ? ['analogue', 'digital'] : [offers];

  for (const mode of liveModes) {
    const run = resolve(mode);
    if (run.includes('scan') && (run.includes('select') || run.includes('view'))) {
      error('run', `The ${mode} run holds scan and select/view: they are the same slot.`);
    }
    if (run.includes('select') && run.includes('view')) {
      error('run', `The ${mode} run holds both select and view: they are the same slot.`);
    }
  }

  const digitalSecond = steps.includes('select') || steps.includes('view');
  if (offers === 'both' && !(steps.includes('scan') && digitalSecond)) {
    error('run', 'Offering both modes needs an analogue second step and a digital one.');
  }

  /* THE RAIL STAYS THE SAME LENGTH — Ben, 2026-10-14. A config that made one
     mode longer than the other would draw a different number of markers
     depending on a switch, which is the one thing the substitution prevented. */
  if (offers === 'both') {
    const analogue = config.run.filter((entry) => entry.mode !== 'digital').length;
    const digital = config.run.filter((entry) => entry.mode !== 'analogue').length;
    if (analogue !== digital) {
      error('run', `The two runs must be the same length: ${analogue} against ${digital}.`);
    }
  }

  if (steps.includes('select') && (config.catalogue.cardsDealt ?? 0) <= 1) {
    error('catalogue.cardsDealt', 'select needs more than one card dealt; one card is view.');
  }
  if (steps.includes('view') && config.catalogue.cardsDealt !== 1) {
    error('catalogue.cardsDealt', 'view is the one-card shape; more than one is select.');
  }

  /* ── Per step ───────────────────────────────────────────────────────── */

  const textLocales = config.content.textLocales.filter(isLocale);
  if (textLocales.length === 0) error('content.textLocales', 'Name at least one text locale.');

  /* ── WHICH QUESTIONS THE RUN ASKS, READ OFF THE INTRO ───────────────────
     `posture_question` and `ending_question` are features of the INTRO step.
     The answer matrix that depends on them is on the LISTEN step. Reading
     them off the step being validated asked the listen step whether it asks
     about the ending — it never does — and every Klangreise cut came back as
     an answer no question could produce. Caught by the first test written
     against a real shape, which is what the fixtures are for. */
  const introStep = config.run.find((entry) => entry.step === 'intro');
  const asksPosture = introStep?.features.includes('posture_question') ?? false;
  const asksEnding = introStep?.features.includes('ending_question') ?? false;

  for (const [index, entry] of config.run.entries()) {
    const at = `run[${index}]`;
    const legal = STEP_FEATURES[entry.step] ?? [];

    for (const feature of entry.features) {
      if (!legal.includes(feature)) {
        error(`${at}.features`, `${feature} is not a feature of the ${entry.step} step.`);
      }
    }
    if (entry.features.length === 0) {
      error(`${at}.features`, 'A step with no features is an empty screen.');
    }
    if (new Set(entry.features).size !== entry.features.length) {
      error(`${at}.features`, 'A feature is listed twice.');
    }

    const has = (feature: string) => entry.features.includes(feature);

    if (has('mode_switch') && offers !== 'both') {
      error(`${at}.features`, 'mode_switch needs modes.offers to be both; there is nothing to switch.');
    }
    if (has('posture_question') && config.kind !== 'listening_only') {
      error(`${at}.features`, 'Only a listening exercise asks about posture.');
    }

    /* ── A TEXT FIELD THAT SWITCHES OFF A FEATURE ────────────────────────
       `needs_note` is derived from `library[locale].needs` being non-null, so
       clearing that sentence in the builder turns the feature into a promise
       of a note with no text. It is the sharpest case for classifying the
       EFFECT rather than the field: she edited something the model calls
       text, and the config now says something structural.

       An error and not a warning: the step would draw an empty note. */
    if (has('needs_note')) {
      for (const locale of textLocales) {
        if ((config.library[locale]?.needs ?? null) === null) {
          /* REPORTED ON THE FIELD, NOT ON THE FEATURE. She can fix the note;
             she cannot fix a feature list she never sees. It also puts this
             under `library.`, which `implemented: false` suspends with the
             rest of the content rules — where it belongs. */
          error(`library.${locale}.needs`,
            'The intro promises a note about what to have ready, and there is none.');
        }
      }
    }

    /* ── The two questions, and the cut they reach ─────────────────────── */

    if (entry.ask !== undefined) {
      for (const [name, value] of Object.entries(entry.ask)) {
        if (value === null) continue;
        const options: readonly string[] = name === 'posture' ? POSTURES : ENDINGS;
        if (!options.includes(value.default)) {
          error(`${at}.ask.${name}.default`,
            `${value.default} is not one of ${options.join(', ')}. A config cannot add an option.`);
        }
        const feature = name === 'posture' ? 'posture_question' : 'ending_question';
        if (!has(feature)) {
          error(`${at}.ask.${name}`, `Asking it needs the ${feature} feature.`);
        }
      }
    }

    if (entry.cuts !== undefined) {
      if (!has('cut_from_answers')) {
        error(`${at}.cuts`, 'Naming cuts needs the cut_from_answers feature.');
      }

      /* EVERY COMBINATION THE SWITCHED-ON QUESTIONS CAN PRODUCE. Two questions
         on is four, one is two, none is one — unless a wildcard serves them.
         `asksPosture` / `asksEnding` come off the INTRO, above. */
      const wantPostures: (Posture | 'any')[] = asksPosture ? [...POSTURES] : ['any'];
      const wantEndings: (Ending | 'any')[] = asksEnding ? [...ENDINGS] : ['any'];

      for (const posture of wantPostures) {
        for (const ending of wantEndings) {
          if (!served({ posture, ending }, entry.cuts.expects)) {
            error(`${at}.cuts.expects`,
              `Nothing serves posture ${posture} with ending ${ending}.`);
          }
        }
      }

      /* AND THE OTHER DIRECTION: a row for an answer no question can produce
         is a row nobody will ever reach. */
      for (const want of entry.cuts.expects) {
        if (want.posture !== 'any' && !asksPosture) {
          error(`${at}.cuts.expects`,
            `Names posture ${want.posture}, but the intro never asks about posture.`);
        }
        if (want.ending !== 'any' && !asksEnding) {
          error(`${at}.cuts.expects`,
            `Names ending ${want.ending}, but the intro never asks about the ending.`);
        }
      }

      /* AGAINST THE LIVE TABLE, where the caller handed one over. This is the
         rule that catches Klangreise's English text with no English recording. */
      for (const locale of config.content.locales.filter(isLocale)) {
        const have = context.cutsByLocale?.[locale];
        if (have === undefined) continue;
        for (const want of entry.cuts.expects) {
          if (!served(want, have)) {
            error(`${at}.cuts.expects`,
              `exercise_cuts has nothing for ${locale} / ${want.posture} / ${want.ending}.`);
          }
        }
      }
    }

    if (has('cut_from_answers') && entry.cuts === undefined) {
      error(`${at}.cuts`, 'cut_from_answers needs a cuts.expects block.');
    }

    /* ── The two listen controls ───────────────────────────────────────── */

    if (has('skip_intro')) {
      for (const locale of config.content.locales.filter(isLocale)) {
        if (context.introUntilByLocale?.[locale] === false) {
          error(`${at}.features`,
            `skip_intro is on, but no ${locale} recording says where its intro ends.`);
        }
      }
    }
    if (has('mute_background')) {
      if (!has('voice_track_mix')) {
        error(`${at}.features`, 'mute_background needs voice_track_mix: there is nothing to mute to.');
      }
      for (const locale of config.content.locales.filter(isLocale)) {
        if (context.voiceStemByLocale?.[locale] === false) {
          error(`${at}.features`,
            `mute_background is on, but the ${locale} recording has no guidance-only stem.`);
        }
      }
    }

    /* THE SLOT THEY SHARE. `SessionListen.tsx` states in a comment that these
       two can never appear together, which is true of today's two recordings
       and enforced by nothing. Making them configurable is exactly what
       produces the pairing, so it is called out rather than discovered. */
    if (has('skip_intro') && has('mute_background')) {
      warn(`${at}.features`,
        'skip_intro and mute_background share one slot on the immersive sheet. '
        + 'SessionListen assumes they never appear together; the layout has to take both first.');
    }

    /* ── The rotating questions ────────────────────────────────────────── */

    if (has('question_helper_ladder') && !has('rotating_question')) {
      error(`${at}.features`, 'The helper ladder hangs off a rotating question.');
    }

    if (has('rotating_question')) {
      if (entry.questions === undefined) {
        error(`${at}.questions`, 'rotating_question is on, but no questions are written.');
      } else {
        /* ONE REFERENCE ORDER, and every locale matches it. The rotation
           indexes by position, so two locales in two orders would show a
           German question and an English helper for a different one. */
        const reference = entry.questions[textLocales.at(0) as Locale] ?? [];
        if (reference.length === 0) {
          error(`${at}.questions`, 'A question set that is on holds at least one question.');
        }
        for (const locale of textLocales) {
          const set = entry.questions[locale];
          if (set === undefined) {
            error(`${at}.questions.${locale}`, `No ${locale} questions, but ${locale} is a text locale.`);
            continue;
          }
          if (set.map((q) => q.id).join() !== reference.map((q) => q.id).join()) {
            error(`${at}.questions.${locale}`,
              'Every locale needs the same question ids in the same order.');
          }
          for (const [position, question] of set.entries()) {
            for (const field of ['listen', 'reflect', 'helper'] as const) {
              if (question[field].trim() === '') {
                error(`${at}.questions.${locale}[${position}].${field}`,
                  `${question.id} has no ${field} text.`);
              }
            }
          }
        }
      }
    } else if (entry.questions !== undefined) {
      error(`${at}.questions`, 'Questions are written, but rotating_question is off.');
    }

    /* ── Copy ──────────────────────────────────────────────────────────── */

    /* Chrome-backed steps have nothing to check: see `copySource`. Anything a
       therapist types into one is a REQUEST, and a request is not invalid. */
    const chromeBacked = entry.copySource === 'chrome';

    for (const locale of chromeBacked ? [] : textLocales) {
      const copy = entry.copy[locale];
      if (copy === undefined) {
        error(`${at}.copy.${locale}`, `No ${locale} copy for the ${entry.step} step.`);
        continue;
      }
      if (copy.headline.trim() === '') {
        error(`${at}.copy.${locale}.headline`, 'A step needs a headline.');
      }
      if (copy.bodyMd.trim() === '') {
        warn(`${at}.copy.${locale}.bodyMd`, 'A headline with nothing under it.');
      }

      /* THE RULE THAT CATCHES free-rein. Its sibling has a placeholder and it
         does not, and until this file nothing could say that was wrong. */
      if (entry.step === 'reflect' && has('mode_text')) {
        if (copy.placeholder === undefined || copy.placeholder.trim() === '') {
          error(`${at}.copy.${locale}.placeholder`,
            'A text answer needs a placeholder to say what to write.');
        }
      }

      /* A MODE OVERRIDE FOR A MODE THAT IS NOT OFFERED is dead copy somebody
         will later edit and wonder why nothing changed. */
      for (const mode of ['digital', 'analogue'] as const) {
        if (copy[mode] === undefined) continue;
        if (offers === null) {
          error(`${at}.copy.${locale}.${mode}`, 'This exercise has no modes.');
        } else if (offers !== 'both' && offers !== mode) {
          error(`${at}.copy.${locale}.${mode}`, `This exercise only offers ${offers}.`);
        }
      }
    }
  }

  /* ── The library card ───────────────────────────────────────────────── */

  for (const locale of textLocales) {
    const card = config.library[locale];
    if (card === undefined) {
      error(`library.${locale}`, `No ${locale} name or description.`);
      continue;
    }
    for (const field of ['name', 'description', 'imageAlt'] as const) {
      if (card[field].trim() === '') {
        error(`library.${locale}.${field}`, `The ${field} is empty.`);
      }
    }
  }

  /* ── implemented: false suspends the content rules ──────────────────── */

  if (!config.implemented) {
    return problems.filter((problem) => !problem.path.includes('.copy.')
      && !problem.path.startsWith('library.')
      && !problem.path.includes('.questions'));
  }

  return problems;
}
