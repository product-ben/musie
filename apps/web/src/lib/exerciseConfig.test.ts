/**
 * The contract, and the three holes it was written to find.
 *
 * `docs/EXERCISE-MODEL.md` argues that "what an exercise is" lived in four
 * places that could not be read together, so nothing could check they agreed —
 * and they did not. Three disagreements were live on 2026-10-21 and each has a
 * test here, named after the thing it catches rather than after the rule:
 *
 *   · `free-rein` has no `reflect_placeholder` and its sibling does
 *   · the listening exercises have English text and German-only recordings
 *   · Achtsame Pause's intro tells a DIGITAL run to lay cards on a table
 *
 * Pure functions over plain objects, so no database and no React — the same
 * bargain `exerciseKind.test.ts` makes, for the same reason.
 */
import { describe, expect, it } from 'vitest';

import {
  STEP_FEATURES, joinHeadline, splitHeadline, validateConfig,
} from './exerciseConfig';
import type { ExerciseConfig, RunStep } from './exerciseConfig';
import { STEP_IDS } from '../routeHandle';

/* ── Fixtures ─────────────────────────────────────────────────────────────
   Shaped like the real thing and small enough to read. `card()` is Achtsame
   Pause's shape: both modes, five dealt, the second step written twice. */

const copy = (headline: string, extra: Record<string, string> = {}) => ({
  de: { headline, bodyMd: 'Text.', ...extra },
  en: { headline, bodyMd: 'Text.', ...extra },
});

function card(overrides: Partial<ExerciseConfig> = {}): ExerciseConfig {
  const run: RunStep[] = [
    { step: 'intro', features: ['mode_switch', 'needs_note'], copy: copy('Los') },
    {
      step: 'scan', mode: 'analogue',
      features: ['card_scan_camera', 'card_scan_code', 'card_scan_deeplink'],
      copy: copy('Karte'),
    },
    { step: 'select', mode: 'digital', features: ['card_pick_from_hand'], copy: copy('Wähle') },
    {
      step: 'listen', gateSeconds: 90,
      features: ['track_from_card', 'card_visual', 'immersive_view'],
      copy: copy('Hör zu'),
    },
    {
      step: 'reflect',
      features: ['mode_text', 'mode_voice', 'mode_photo'],
      copy: copy('Gedanken', { placeholder: 'Schreib etwas.' }),
    },
  ];

  return {
    id: 'mindfulness-cards',
    kind: 'card_based',
    implemented: true,
    modes: { offers: 'both', default: 'analogue' },
    catalogue: {
      sort: 1, timeframeMinutes: { min: 2, max: 12 }, cardsDealt: 5,
      artwork: 'a.webp', goals: ['mindfulness'],
    },
    library: {
      de: { name: 'Achtsame Pause', description: 'D', needs: null, imageAlt: 'A' },
      en: { name: 'Mindful Break', description: 'D', needs: null, imageAlt: 'A' },
    },
    run,
    content: { locales: ['de', 'en'], textLocales: ['de', 'en'] },
    ...overrides,
  };
}

function listening(overrides: Partial<ExerciseConfig> = {}): ExerciseConfig {
  const run: RunStep[] = [
    {
      step: 'intro',
      features: ['ending_question'],
      ask: { posture: null, ending: { default: 'day' } },
      copy: copy('Bequem'),
    },
    {
      step: 'listen', gateSeconds: 574,
      features: ['cut_from_answers', 'immersive_view'],
      cuts: { expects: [{ posture: 'any', ending: 'day' }, { posture: 'any', ending: 'sleep' }] },
      copy: copy('Klänge'),
    },
    {
      step: 'reflect',
      features: ['mode_text'],
      copy: copy('Ohr', { placeholder: 'Welcher Klang?' }),
    },
  ];

  return {
    id: 'sound-journey',
    kind: 'listening_only',
    implemented: true,
    modes: null,
    catalogue: {
      sort: 4, timeframeMinutes: { min: 10, max: 14 }, cardsDealt: null,
      artwork: 's.webp', goals: ['mindfulness'],
    },
    library: {
      de: { name: 'Klangreise', description: 'D', needs: null, imageAlt: 'A' },
      en: { name: 'Sound Journey', description: 'D', needs: null, imageAlt: 'A' },
    },
    run,
    content: { locales: ['de'], textLocales: ['de', 'en'] },
    ...overrides,
  };
}

const errors = (config: ExerciseConfig, context = {}) =>
  validateConfig(config, context).filter((problem) => problem.severity === 'error');

describe('the registry is closed', () => {
  it('names only steps the app has', () => {
    expect(Object.keys(STEP_FEATURES).sort()).toEqual([...STEP_IDS].sort());
  });

  it('refuses a feature that belongs to another step', () => {
    const config = card();
    /* `mode_voice` is real — on `reflect`. On `listen` it is a typo that would
       otherwise render nothing and report nothing. */
    config.run[3]!.features.push('mode_voice');
    expect(errors(config).map((problem) => problem.message).join()).toContain('mode_voice');
  });

  it('refuses a feature that is not real at all', () => {
    const config = card();
    config.run[3]!.features.push('karaoke_mode');
    expect(errors(config)).toHaveLength(1);
  });
});

describe('a card exercise declares both runs in one array', () => {
  /* THE REGRESSION THIS FILE EXISTS FOR. The first draft of the validator
     refused `scan` and `select` in one `run`, which is exactly the file every
     card exercise has to have: the config declares both runs, a MODE resolves
     one. Checked on the resolved run, never on the array. */
  it('accepts scan beside select', () => {
    expect(errors(card())).toEqual([]);
  });

  it('still refuses them in the SAME resolved run', () => {
    const config = card();
    /* Untag it and the analogue run holds both. */
    delete config.run[2]!.mode;
    expect(errors(config).map((problem) => problem.message).join()).toContain('same slot');
  });

  it('refuses a digital run that is a step shorter than the analogue one', () => {
    const config = card();
    config.run.splice(2, 1);
    const said = errors(config).map((problem) => problem.message).join();
    expect(said).toContain('same length');
  });

  it('refuses select where only one card is dealt', () => {
    const config = card();
    config.catalogue.cardsDealt = 1;
    expect(errors(config).map((problem) => problem.message).join()).toContain('one card is view');
  });
});

describe('the three live holes', () => {
  /* 1 · free-rein. Its sibling has a `reflect_placeholder` and it does not,
     and until this rule nothing in the repository could say that was wrong. */
  it('catches a text answer with no placeholder', () => {
    const config = card();
    delete config.run[4]!.copy.de!.placeholder;
    const problem = errors(config).find((entry) => entry.path.includes('placeholder'));
    expect(problem?.path).toBe('run[4].copy.de.placeholder');
  });

  /* 2 · Klangreise. English text, German-only recordings — two facts nothing
     related, so nothing said the English version cannot be listened to. */
  it('catches a declared audio locale the cuts cannot serve', () => {
    const config = listening({ content: { locales: ['de', 'en'], textLocales: ['de', 'en'] } });
    const said = errors(config, {
      cutsByLocale: {
        de: [{ posture: 'any', ending: 'day' }, { posture: 'any', ending: 'sleep' }],
        en: [],
      },
    }).map((problem) => problem.message).join();
    expect(said).toContain('en');
  });

  /* 3 · Achtsame Pause's intro. Analogue copy on a digital run — the override
     is the fix, and a config may only carry one for a mode it offers. */
  it('allows a digital override where both modes are offered', () => {
    const config = card();
    config.run[0]!.copy.de!.digital = { bodyMd: 'Ich ziehe fünf Karten für dich.' };
    expect(errors(config)).toEqual([]);
  });

  it('refuses a digital override on an exercise with no modes', () => {
    const config = listening();
    config.run[0]!.copy.de!.digital = { bodyMd: 'Nope.' };
    expect(errors(config).map((problem) => problem.path).join()).toContain('copy.de.digital');
  });
});

describe('the two questions and the cut they reach', () => {
  it('accepts the Klangreise shape', () => {
    expect(errors(listening())).toEqual([]);
  });

  it('refuses an ending the intro never asks about', () => {
    const config = listening();
    config.run[0]!.features = [];
    delete config.run[0]!.ask;
    const said = errors(config).map((problem) => problem.message).join();
    expect(said).toContain('never asks about the ending');
  });

  it('refuses a posture default that is not an option the app has', () => {
    const config = listening();
    config.run[0]!.features.push('posture_question');
    config.run[0]!.ask = { posture: { default: 'standing' }, ending: { default: 'day' } };
    const said = errors(config).map((problem) => problem.message).join();
    expect(said).toContain('cannot add an option');
  });

  /* The Bodyscan: both questions on, one `any`/`any` cut answering all four
     combinations. Legal, and now STATED rather than discovered. */
  it('accepts one wildcard cut serving both questions', () => {
    const config = listening();
    config.run[0]!.features.push('posture_question');
    config.run[0]!.ask = { posture: { default: 'sitting' }, ending: { default: 'day' } };
    config.run[1]!.cuts = { expects: [{ posture: 'any', ending: 'any' }] };
    expect(errors(config)).toEqual([]);
  });

  /* A WILDCARD SERVES AN ASKED QUESTION — that is the test above, and it is
     why asking about posture against one `any` recording is legal. What is
     NOT legal is a matrix with a hole in it: name `sitting` explicitly and
     `lying` has nowhere to go. */
  it('refuses a matrix that misses an answer the questions can produce', () => {
    const config = listening();
    config.run[0]!.features.push('posture_question');
    config.run[0]!.ask = { posture: { default: 'sitting' }, ending: { default: 'day' } };
    config.run[1]!.cuts = { expects: [{ posture: 'sitting', ending: 'any' }] };
    const said = errors(config).map((problem) => problem.message).join();
    expect(said).toContain('Nothing serves posture lying');
  });
});

describe('a chrome-backed step is not a hole', () => {
  /* `select` and `view` have no content columns, so their copy is EXPECTED to
     be empty. Before `copySource` the builder opened on four red errors that
     no therapist could resolve, which is how a panel stops being read. */
  it('skips the copy rules for a chrome-backed step', () => {
    const config = card();
    config.run[2]!.copySource = 'chrome';
    config.run[2]!.copy = {};
    expect(errors(config)).toEqual([]);
  });

  it('still reports an ordinary step with no copy', () => {
    const config = card();
    config.run[2]!.copy = {};
    expect(errors(config).map((problem) => problem.path).join()).toContain('run[2].copy');
  });

  it('still checks the FEATURES of a chrome-backed step', () => {
    const config = card();
    config.run[2]!.copySource = 'chrome';
    config.run[2]!.copy = {};
    config.run[2]!.features = ['mode_text'];
    expect(errors(config)).toHaveLength(1);
  });
});

describe('the rotating questions', () => {
  const withQuestions = () => {
    const config = listening();
    config.run[1]!.features.push('rotating_question');
    config.run[1]!.questions = {
      de: [{ id: 'q-01', listen: 'L', reflect: 'R', helper: 'H' }],
      en: [{ id: 'q-01', listen: 'L', reflect: 'R', helper: 'H' }],
    };
    return config;
  };

  /* Ben, 2026-10-21: whether a listening exercise rotates questions is the
     therapist's call. Nothing binds the feature to a kind, and this is the
     test that keeps it that way. */
  it('lets a LISTENING exercise rotate questions', () => {
    expect(errors(withQuestions())).toEqual([]);
  });

  it('refuses a set switched on and empty', () => {
    const config = withQuestions();
    config.run[1]!.questions = { de: [], en: [] };
    const said = errors(config).map((problem) => problem.message).join();
    expect(said).toContain('at least one');
  });

  it('refuses two locales in two orders', () => {
    const config = withQuestions();
    config.run[1]!.questions!.de!.push({ id: 'q-02', listen: 'L', reflect: 'R', helper: 'H' });
    config.run[1]!.questions!.en!.unshift({ id: 'q-02', listen: 'L', reflect: 'R', helper: 'H' });
    const said = errors(config).map((problem) => problem.message).join();
    expect(said).toContain('same question ids in the same order');
  });

  it('refuses a locale that is missing the set entirely', () => {
    const config = withQuestions();
    delete config.run[1]!.questions!.en;
    expect(errors(config).map((problem) => problem.path).join()).toContain('questions.en');
  });

  it('refuses questions written with the switch off', () => {
    const config = withQuestions();
    config.run[1]!.features = config.run[1]!.features.filter((f) => f !== 'rotating_question');
    const said = errors(config).map((problem) => problem.message).join();
    expect(said).toContain('rotating_question is off');
  });
});

describe('the two listen controls share one slot', () => {
  /* A WARNING, NOT AN ERROR. Nothing in the schema forbids a cut carrying both
     an intro mark and a voice stem; what forbids it is a comment in
     `SessionListen.tsx` and a layout with room for one control. Making these
     configurable is what produces the pairing, so it is said out loud. */
  it('warns when skip_intro and mute_background are both on', () => {
    const config = listening();
    config.run[1]!.features.push('voice_track_mix', 'mute_background', 'skip_intro');
    const problems = validateConfig(config);
    expect(problems.filter((problem) => problem.severity === 'error')).toEqual([]);
    expect(problems.filter((problem) => problem.severity === 'warning')).toHaveLength(1);
  });

  it('refuses mute_background with nothing to mute to', () => {
    const config = listening();
    config.run[1]!.features.push('mute_background');
    const said = errors(config).map((problem) => problem.message).join();
    expect(said).toContain('nothing to mute to');
  });
});

describe('implemented: false suspends the content rules', () => {
  /* breathing-score: five columns of nothing, and a legal, obviously
     unfinished config rather than an error per empty field. */
  it('keeps the structural rules and drops the copy ones', () => {
    const config = card({ implemented: false });
    config.library = {};
    for (const step of config.run) step.copy = {};
    expect(errors(config)).toEqual([]);
  });

  it('still catches a bad feature on an unfinished exercise', () => {
    const config = card({ implemented: false });
    config.run[3]!.features.push('karaoke_mode');
    expect(errors(config)).toHaveLength(1);
  });
});

describe('the headline split', () => {
  /* Real copy, from `exercise_i18n` as it stands. The round trip has to be
     exact or the builder rewrites every step the first time it is opened. */
  const REAL = [
    '## So legen wir los\n\n1. Zieh fünf zufällige Karten und leg sie vor dich.\n2. Lass die Bilder einen Moment auf dich wirken.',
    '## Lass die Klänge kommen, ohne sie zu deuten\n\nSchließe deine Augen und atme ruhig.',
    '## Was ist dir im Ohr geblieben?\n\nSchreib auf, was du magst. Ein Wort reicht.',
  ];

  it('round-trips every real step document', () => {
    for (const md of REAL) {
      const { headline, bodyMd } = splitHeadline(md);
      expect(joinHeadline(headline, bodyMd)).toBe(md);
    }
  });

  it('lifts the heading out', () => {
    expect(splitHeadline(REAL[1]!)).toEqual({
      headline: 'Lass die Klänge kommen, ohne sie zu deuten',
      bodyMd: 'Schließe deine Augen und atme ruhig.',
    });
  });

  /* NO HEADING MEANS NO HEADLINE, not a guessed one: a step whose copy has no
     heading is a hole, and inventing one here would hide it from the rule
     above that reports it. */
  it('leaves the headline empty when there is no heading', () => {
    expect(splitHeadline('Just a sentence.')).toEqual({
      headline: '', bodyMd: 'Just a sentence.',
    });
  });

  it('treats null and empty as nothing', () => {
    expect(splitHeadline(null)).toEqual({ headline: '', bodyMd: '' });
    expect(splitHeadline('   ')).toEqual({ headline: '', bodyMd: '' });
  });

  it('keeps a headline with no body', () => {
    expect(joinHeadline('Nur eine Überschrift', '')).toBe('## Nur eine Überschrift');
  });
});
