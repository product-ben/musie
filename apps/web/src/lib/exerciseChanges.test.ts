/**
 * The change log, and the flag that decides whether Ben can just upload it.
 *
 * The rule under test is the one Ben stated on 2026-10-27: *"If anything
 * structural changes, this must be flagged so I know I need to make
 * implementation decisions and can't just upload it."* Every test here is
 * about where that line falls — and the ones worth having are the cases where
 * it is NOT obvious: a text field whose effect is structural, a question added
 * rather than reworded, and a mode override that is text in a structural-
 * looking place.
 */
import { describe, expect, it } from 'vitest';

import {
  buildHandover, changeLog, classifyPath, pathSegments, setAtPath, summarise,
} from './exerciseChanges';
import type { ExerciseConfig } from './exerciseConfig';

const AT = '2026-10-27T09:00:00.000Z';

function base(): ExerciseConfig {
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
      de: { name: 'Achtsame Pause', description: 'D', needs: 'Die Karten', imageAlt: 'A' },
      en: { name: 'Mindful Break', description: 'D', needs: 'The cards', imageAlt: 'A' },
    },
    run: [
      { step: 'intro', features: ['needs_note'], copy: { de: { headline: 'Los', bodyMd: 'T' } } },
      {
        step: 'listen', gateSeconds: 90, features: ['rotating_question'],
        questions: { de: [{ id: 'q-01', listen: 'L', reflect: 'R', helper: 'H' }] },
        copy: { de: { headline: 'Hör', bodyMd: 'T' } },
      },
    ],
    content: { locales: ['de', 'en'], textLocales: ['de', 'en'] },
  };
}

const edit = (mutate: (draft: ExerciseConfig) => void): ExerciseConfig => {
  const draft = structuredClone(base());
  mutate(draft);
  return draft;
};

describe('which paths are text', () => {
  it('knows the four text shapes', () => {
    expect(classifyPath('library.de.description')).toBe('text');
    expect(classifyPath('run[0].copy.de.headline')).toBe('text');
    expect(classifyPath('run[0].copy.de.digital.bodyMd')).toBe('text');
    expect(classifyPath('run[1].questions.de[0].listen')).toBe('text');
  });

  it('treats everything else as structural', () => {
    for (const path of [
      'run[0].features[0]', 'modes.offers', 'catalogue.cardsDealt',
      'run[1].gateSeconds', 'content.locales[1]', 'kind',
      'run[1].cuts.expects[0].ending', 'run[0].ask.posture.default',
    ]) {
      expect(classifyPath(path)).toBe('structural');
    }
  });

  /* AN ALLOWLIST, so a field added to the schema later is structural until
     somebody decides it is not. That is the safe direction for a flag Ben
     relies on, and this is the test that keeps it that way. */
  it('calls an unknown field structural rather than text', () => {
    expect(classifyPath('library.de.somethingNew')).toBe('structural');
    expect(classifyPath('run[0].copy.de.subtitle')).toBe('structural');
  });
});

describe('the change log', () => {
  it('is empty when nothing moved', () => {
    expect(changeLog(base(), base())).toEqual([]);
  });

  it('reports a reworded headline as text, before and after', () => {
    const after = edit((d) => { d.run[0]!.copy.de!.headline = 'So geht es los'; });
    expect(changeLog(base(), after)).toEqual([{
      path: 'run[0].copy.de.headline',
      kind: 'text',
      before: 'Los',
      after: 'So geht es los',
      by: 'hand',
    }]);
  });

  it('carries provenance where a model wrote the value', () => {
    const after = edit((d) => { d.library.en!.description = 'Translated.'; });
    const [change] = changeLog(base(), after, { 'library.en.description': 'translation' });
    expect(change?.by).toBe('translation');
  });

  it('keeps her own words beside a prompted change', () => {
    const after = edit((d) => { d.run[0]!.copy.de!.bodyMd = 'Wärmer.'; });
    const [change] = changeLog(
      base(), after,
      { 'run[0].copy.de.bodyMd': 'prompt' },
      { 'run[0].copy.de.bodyMd': 'Mach die Einleitung wärmer' },
    );
    expect(change?.prompt).toBe('Mach die Einleitung wärmer');
  });

  /* THE HANDOVER BLOCK DESCRIBES THE CHANGES; it is not one of them. Without
     this the log would grow an entry about itself on every rebuild. */
  it('never reports the handover block as a change', () => {
    const after = edit((d) => {
      d.handover = {
        safeToApply: true, blockers: [], baseline: { takenAt: AT },
        changes: [], requests: [], machineTranslated: [],
      };
    });
    expect(changeLog(base(), after)).toEqual([]);
  });

  it('reports a field that appeared, with null before', () => {
    const after = edit((d) => { d.run[0]!.copy.de!.continueLabel = 'Weiter'; });
    const [change] = changeLog(base(), after);
    expect(change).toMatchObject({ before: null, after: 'Weiter', kind: 'text' });
  });

  it('reports a field that was cleared, with null after', () => {
    const after = edit((d) => { d.library.de!.needs = null; });
    const [change] = changeLog(base(), after);
    expect(change).toMatchObject({ path: 'library.de.needs', before: 'Die Karten', after: null });
  });
});

describe('what counts as structural', () => {
  /* The switch removes two features. Index-wise that reads as three renames
     — `features[4]: rotating_question → immersive_view` — which is true of
     the array and false about the exercise. One entry, one before, one after. */
  it('reports a feature list as one change, not one per index', () => {
    const after = edit((d) => { d.run[1]!.features = []; });
    const log = changeLog(base(), after);
    const features = log.filter((change) => change.path.startsWith('run[1].features'));
    expect(features).toHaveLength(1);
    expect(features[0]?.path).toBe('run[1].features');
    expect(features[0]?.before).toBe('["rotating_question"]');
    expect(features[0]?.after).toBe('[]');
  });

  it('still walks a list of questions by position', () => {
    const after = edit((d) => { d.run[1]!.questions!.de![0]!.listen = 'Anders?'; });
    expect(changeLog(base(), after)[0]?.path).toBe('run[1].questions.de[0].listen');
  });

  it('flags the rotating-question switch', () => {
    const after = edit((d) => { d.run[1]!.features = []; delete d.run[1]!.questions; });
    const log = changeLog(base(), after);
    expect(log.some((change) => change.kind === 'structural')).toBe(true);
  });

  /* REWORDING a question is text; ADDING one is not, because the new id is
     not in `QuestionId` and today's app cannot render it. The diff finds the
     `.id` path, which is not on the text allowlist. */
  it('calls a reworded question text', () => {
    const after = edit((d) => { d.run[1]!.questions!.de![0]!.listen = 'Anders?'; });
    expect(changeLog(base(), after).every((change) => change.kind === 'text')).toBe(true);
  });

  /* ONE ENTRY FOR THE WHOLE QUESTION, not four. A slot that was empty and now
     holds an object is reported at the slot — which reads as "a question
     appeared" rather than as four unrelated fields, and is structural because
     the slot path carries no text field name. */
  it('calls an added question structural, as one entry', () => {
    const after = edit((d) => {
      d.run[1]!.questions!.de!.push({ id: 'q-02', listen: 'L', reflect: 'R', helper: 'H' });
    });
    const log = changeLog(base(), after);
    const added = log.find((change) => change.path === 'run[1].questions.de[1]');
    expect(added?.kind).toBe('structural');
    expect(added?.before).toBeNull();
    expect(added?.after).toContain('q-02');
  });

  /* The case the line is not clean for: a TEXT field whose effect is
     structural. Clearing `needs` switches off `needs_note` — and the feature
     change is what the walk sees and flags. */
  it('flags the feature a cleared note switches off', () => {
    const after = edit((d) => {
      d.library.de!.needs = null;
      d.run[0]!.features = [];
    });
    const log = changeLog(base(), after);
    expect(log.find((change) => change.path === 'library.de.needs')?.kind).toBe('text');
    expect(log.some((change) => change.path.startsWith('run[0].features')
      && change.kind === 'structural')).toBe(true);
  });
});

describe('the handover block', () => {
  it('is safe when only text moved', () => {
    const after = edit((d) => { d.run[0]!.copy.de!.headline = 'Anders'; });
    const handover = buildHandover(changeLog(base(), after), [], [], AT);
    expect(handover.safeToApply).toBe(true);
    expect(handover.blockers).toEqual([]);
  });

  it('is not safe when anything structural moved, and says what', () => {
    const after = edit((d) => { d.catalogue.cardsDealt = 3; });
    const handover = buildHandover(changeLog(base(), after), [], [], AT);
    expect(handover.safeToApply).toBe(false);
    expect(handover.blockers.join()).toContain('cardsDealt');
    expect(handover.blockers.join()).toContain('5');
    expect(handover.blockers.join()).toContain('3');
  });

  /* A REQUEST NOBODY APPLIED IS ALSO A BLOCKER. She asked for something the
     model would not do; uploading the file without reading it would lose the
     ask entirely. */
  it('is not safe while a request went unapplied', () => {
    const handover = buildHandover(
      [],
      [{ at: AT, prompt: 'Mach daraus zwei Schritte', applied: false, reason: 'structural' }],
      [], AT,
    );
    expect(handover.safeToApply).toBe(false);
    expect(handover.blockers.join()).toContain('zwei Schritte');
  });

  it('stays safe with an applied request', () => {
    const handover = buildHandover(
      [], [{ at: AT, prompt: 'Kürzer bitte', applied: true }], [], AT,
    );
    expect(handover.safeToApply).toBe(true);
  });

  /* A BLOCKER IS A ONE-LINE SUMMARY, and the whole value stays in `changes`.
     Without this a question set put four hundred characters of JSON into the
     list that is meant to be read at a glance. */
  /* A SET SAYS WHAT MOVED. Clipping the two lists gave
     `features: ["track_from_card","card_visual",… → ["track_from_card",…`,
     which is bounded, honest and useless: both sides clip to the same prefix. */
  it('summarises a feature list by what came and went', () => {
    expect(summarise({
      path: 'run[3].features', kind: 'structural', by: 'hand',
      before: '["a","b","c"]', after: '["a","d"]',
    })).toBe('run[3].features: -b -c +d');
  });

  it('says added or removed for a whole block', () => {
    expect(summarise({
      path: 'run[3].questions', kind: 'structural', by: 'hand',
      before: '{"de":[]}', after: null,
    })).toBe('run[3].questions: removed');
    expect(summarise({
      path: 'run[3].cuts', kind: 'structural', by: 'hand',
      before: null, after: '{"expects":[]}',
    })).toBe('run[3].cuts: added');
  });

  it('shortens a long value in the blocker line', () => {
    const after = edit((d) => {
      d.run[1]!.questions!.de!.push({
        id: 'q-02',
        listen: 'Eine sehr lange Frage, die weit über sechzig Zeichen hinausgeht und noch weiter',
        reflect: 'R',
        helper: 'H',
      });
    });
    const handover = buildHandover(changeLog(base(), after), [], [], AT);
    for (const blocker of handover.blockers) {
      expect(blocker.length).toBeLessThan(140);
    }
  });

  it('sorts the machine-translated paths so two builds match', () => {
    const handover = buildHandover([], [], ['run[1].copy.en.bodyMd', 'library.en.name'], AT);
    expect(handover.machineTranslated).toEqual(['library.en.name', 'run[1].copy.en.bodyMd']);
  });

  /* BYTE-STABILITY: `takenAt` is passed in rather than read off a clock, so
     building the same edits twice produces the same file. A diff of two
     configs is only worth reading if nothing moves on its own. */
  it('takes its timestamp from the caller', () => {
    expect(buildHandover([], [], [], AT).baseline.takenAt).toBe(AT);
  });
});

describe('writing back at a path', () => {
  it('splits keys and indexes', () => {
    expect(pathSegments('run[1].questions.de[0].listen'))
      .toEqual(['run', 1, 'questions', 'de', 0, 'listen']);
  });

  it('writes where the path resolves', () => {
    const config = base();
    expect(setAtPath(config, 'run[0].copy.de.headline', 'Neu')).toBe(true);
    expect(config.run[0]!.copy.de!.headline).toBe('Neu');
  });

  it('writes into a question', () => {
    const config = base();
    expect(setAtPath(config, 'run[1].questions.de[0].listen', 'Anders?')).toBe(true);
    expect(config.run[1]!.questions!.de![0]!.listen).toBe('Anders?');
  });

  /* A field the schema calls optional may be absent and still writable — its
     PARENT is what has to exist. */
  it('writes an optional field that was absent', () => {
    const config = base();
    expect(setAtPath(config, 'run[0].copy.de.continueLabel', 'Weiter')).toBe(true);
    expect(config.run[0]!.copy.de!.continueLabel).toBe('Weiter');
  });

  /* THE THIRD GATE. A model that invents a path gets nothing: no branch is
     created, and the caller drops the edit. */
  it('refuses a path that does not resolve', () => {
    const config = base();
    expect(setAtPath(config, 'run[9].copy.de.headline', 'x')).toBe(false);
    expect(setAtPath(config, 'library.fr.name', 'x')).toBe(false);
    expect(setAtPath(config, '', 'x')).toBe(false);
  });

  /* A path naming `__proto__` or `constructor` must not walk out of the
     object it was handed — `hasOwnProperty`, not `in`. */
  it('cannot climb the prototype chain', () => {
    const config = base();
    expect(setAtPath(config, '__proto__.polluted', 'yes')).toBe(false);
    expect(setAtPath(config, 'constructor.prototype.polluted', 'yes')).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('refuses to overwrite a branch with a string', () => {
    const config = base();
    expect(setAtPath(config, 'run[0].copy', 'nope')).toBe(false);
    expect(typeof config.run[0]!.copy).toBe('object');
  });
});
