/**
 * What a step says when the config says nothing — the words built into the app.
 *
 * ── WHY THE BUILDER HAS TO SHOW THESE ─────────────────────────────────────
 * Ben, 2026-10-27, looking at the digital variant: *"I think you didn't
 * expose all the text for the 'no physical cards available' variant (incl.
 * button labels)."* He was right, and twice over:
 *
 *   1. `select` and `view` have NO content columns. Every word they show is a
 *      `MessageKey`, so the builder drew two empty fields and an explanation.
 *      Empty fields do not tell a therapist what the screen currently says.
 *   2. NO step's button label was editable anywhere. `StepCopy.continueLabel`
 *      has been in the schema since the first commit and the editor never
 *      drew a field for it — so every forward action in the app was invisible
 *      to the person whose job is the wording.
 *
 * ── SHOWN AS A PLACEHOLDER, NOT AS A VALUE ────────────────────────────────
 * Seeding the config with these strings would make every exercise override
 * the chrome with the identical text, and `continueLabel`'s whole meaning is
 * *absent falls back to the app's own word*. A placeholder keeps that: she
 * sees what it says now, an empty field still means "leave it alone", and
 * typing is a proposal to move that string out of chrome.
 *
 * ── A MAP, SO A NEW STEP IS A COMPILE ERROR ───────────────────────────────
 * `Record<StepId, …>`, like `STEPS` and `STEP_FEATURES`. A seventh step has
 * to answer here, where the answer is known.
 *
 * Pure: returns KEYS, never resolved text, so this module needs no locale and
 * no `useT`. The caller translates.
 */
import type { MessageKey } from '../i18n/en';
import type { StepId } from '../routeHandle';
import type { Locale } from '../i18n';
import type { ExerciseConfig, RunMode } from './exerciseConfig';

export interface ChromeDefault {
  key: MessageKey;
  /** For a key with a slot — `session.intro.deal` quotes the card count. */
  slots?: Record<string, string>;
}

export interface ChromeCopy {
  headline?: ChromeDefault;
  bodyMd?: ChromeDefault;
  /** The forward action. Every step has one. */
  continueLabel?: ChromeDefault;
  /** The other button, where the step has two. */
  secondaryLabel?: ChromeDefault;
}

export interface ChromeShape {
  mode: RunMode;
  /** `exercises.cards_dealt` — it decides the intro's forward label. */
  cardsDealt: number | null;
}

const CHROME: Record<StepId, (shape: ChromeShape) => ChromeCopy> = {
  /* The intro's forward action is the one that changes with the mode: on
     paper it is just a way on, on screen it deals the hand. */
  intro: ({ mode, cardsDealt }) => ({
    continueLabel: mode === 'analogue'
      ? { key: 'common.continue' }
      : (cardsDealt === 1
        ? { key: 'session.intro.drawRandom' }
        : { key: 'session.intro.deal', slots: { count: String(cardsDealt ?? 0) } }),
  }),

  scan: () => ({
    continueLabel: { key: 'common.continue' },
    secondaryLabel: { key: 'session.scan.again' },
  }),

  /* THE TWO WITH NO CONTENT COLUMNS AT ALL. `session.view.headline` is *Was
     siehst du in dem Bild?* and `session.select.headline` is *Wähle eine
     Karte aus* — which is also the `## ` heading of `scan_md`, the same
     sentence in two systems. */
  view: () => ({
    headline: { key: 'session.view.headline' },
    bodyMd: { key: 'session.view.lead' },
    continueLabel: { key: 'common.continue' },
    secondaryLabel: { key: 'session.view.expand' },
  }),

  select: () => ({
    headline: { key: 'session.select.headline' },
    bodyMd: { key: 'session.select.lead' },
    continueLabel: { key: 'common.continue' },
    secondaryLabel: { key: 'session.select.lookAgain' },
  }),

  /* The listen step's forward action is two words depending on the gate, and
     the locked one is what somebody arriving sees first. */
  listen: () => ({
    continueLabel: { key: 'session.listen.start' },
    secondaryLabel: { key: 'session.listen.startLocked' },
  }),

  reflect: () => ({
    continueLabel: { key: 'reflect.save' },
  }),
};

export function chromeCopyFor(step: StepId, shape: ChromeShape): ChromeCopy {
  return CHROME[step](shape);
}

/* ── WHEN SHE OVERRIDES A WORD THE APP OWNS ═══════════════════════════════
 *
 * Ben, 2026-10-27: let her change static headlines and labels through the AI,
 * show it in the preview, keep it in the change log — and put it in a section
 * of its own in the file, with the ways it could be built.
 *
 * WHY A SECTION OF ITS OWN. A rewritten `intro_md` is a row somebody updates.
 * A rewritten BUTTON is not: `common.continue` is a `MessageKey` shared by
 * every exercise in the app, and changing it for one of them is a decision
 * about where that string should live. The change log says what she wants;
 * this section is the work order, and it is why `safeToApply` goes false.
 *
 * ONE ENTRY PER FIELD, LAST WINS — Ben's rule, and it falls out of keying by
 * path: a field rewritten three times has one entry holding the third value,
 * because what Ben implements is where she landed, not how she got there.
 */

/** One way the override could be built, for Ben to choose between. */
export interface IntegrationOption {
  title: string;
  /** What would actually change in the repository. */
  what: string;
  /** What it costs or risks — the half that makes it a choice. */
  tradeoff: string;
}

export interface StaticOverride {
  path: string;
  locale: Locale;
  /** The `MessageKey` this overrides — what to grep for in `i18n/*`. */
  messageKey: string;
  /** What the app says today. */
  builtIn: string;
  /** What she wants it to say. */
  wants: string;
  /** How it could be built. Empty until the options have been asked for. */
  options: IntegrationOption[];
}

/** The fields that are ALWAYS the app's own words, whatever the step. */
const ALWAYS_CHROME = ['continueLabel', 'secondaryLabel'] as const;
/** And these two, only where the step has no content columns at all. */
const CHROME_WHEN_CHROME_BACKED = ['headline', 'bodyMd'] as const;

/**
 * Every place she has written over a word the app owns.
 *
 * `resolve` turns a key into the text it currently shows, which is the
 * caller's job because this module holds no locale.
 */
export function staticOverrides(
  config: ExerciseConfig,
  /* Takes the LOCALE as well as the key: an override on a German field has to
     report the German word it replaces. Resolving through the app's own `t`
     reported `builtIn: "Continue"` for a German override, which is the one
     thing this field exists to get right. */
  resolve: (entry: ChromeDefault, locale: Locale) => string,
): StaticOverride[] {
  const found: StaticOverride[] = [];

  config.run.forEach((entry, index) => {
    const built = chromeCopyFor(entry.step, {
      mode: entry.mode ?? 'analogue',
      cardsDealt: config.catalogue.cardsDealt,
    });

    const fields = [
      ...ALWAYS_CHROME,
      ...(entry.copySource === 'chrome' ? CHROME_WHEN_CHROME_BACKED : []),
    ] as const;

    for (const locale of config.content.textLocales as Locale[]) {
      const copy = entry.copy[locale];
      if (copy === undefined) continue;

      for (const field of fields) {
        const wants = copy[field];
        if (typeof wants !== 'string' || wants.trim() === '') continue;

        const def = built[field];
        /* No chrome default means this field is not the app's word after all
           — nothing to decide, and it stays an ordinary content edit. */
        if (def === undefined) continue;

        found.push({
          path: `run[${index}].copy.${locale}.${field}`,
          locale,
          messageKey: def.key,
          builtIn: resolve(def, locale),
          wants,
          options: [],
        });
      }
    }
  });

  /* Sorted, so two downloads of the same edits produce the same bytes. */
  return found.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * The paths the app owns a default for, as `path → the current word`.
 *
 * Sent with a prompt so the model can rewrite a field that is ABSENT from the
 * config — which is every button label, because absent is what "use the app's
 * own word" looks like. Without this the model never saw them and could only
 * refuse; she could type a button label by hand and not ask for one.
 */
export function chromeDefaults(
  config: ExerciseConfig,
  locale: Locale,
  resolve: (entry: ChromeDefault, locale: Locale) => string,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!config.content.textLocales.includes(locale)) return out;

  config.run.forEach((entry, index) => {
    const built = chromeCopyFor(entry.step, {
      mode: entry.mode ?? 'analogue',
      cardsDealt: config.catalogue.cardsDealt,
    });
    const fields = [
      ...ALWAYS_CHROME,
      ...(entry.copySource === 'chrome' ? CHROME_WHEN_CHROME_BACKED : []),
    ] as const;

    for (const field of fields) {
      const def = built[field];
      if (def === undefined) continue;
      out[`run[${index}].copy.${locale}.${field}`] = resolve(def, locale);
    }
  });

  return out;
}
