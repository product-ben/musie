/**
 * The words the app owns, and what happens when a therapist writes over one.
 *
 * Ben, 2026-10-27: let her change static headlines and labels through the AI,
 * show it in the preview, keep it in the change log, and put it in a section
 * of its own — one entry per field, the latest value winning.
 *
 * The rules worth a test are the ones that decide whether Ben can trust that
 * section: that a button override is found at all (it lives in a field that is
 * ABSENT from the config, which is what "use the app's own word" looks like),
 * that rewriting the same field twice leaves one entry, and that the word it
 * replaces is reported in the FIELD'S language rather than the app's.
 */
import { describe, expect, it } from 'vitest';

import { chromeCopyFor, chromeDefaults, staticOverrides } from './chromeCopy';
import type { ChromeDefault } from './chromeCopy';
import type { ExerciseConfig } from './exerciseConfig';
import { translate } from '../i18n';
import type { Locale } from '../i18n';
import { STEP_IDS } from '../routeHandle';

/** The real resolver the builder uses: the field's language, not the app's. */
const resolve = (entry: ChromeDefault, locale: Locale) =>
  translate(locale, entry.key, entry.slots);

function config(): ExerciseConfig {
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
        step: 'select', mode: 'digital', features: ['card_pick_from_hand'],
        copySource: 'chrome', copy: { de: { headline: '', bodyMd: '' } },
      },
    ],
    content: { locales: ['de', 'en'], textLocales: ['de', 'en'] },
  };
}

describe('every step answers for its own words', () => {
  it('has an entry for all six steps', () => {
    for (const step of STEP_IDS) {
      expect(() => chromeCopyFor(step, { mode: 'analogue', cardsDealt: 5 })).not.toThrow();
    }
  });

  /* The intro's forward action is the one that changes with the mode: on
     paper it is a way on, on screen it deals the hand. */
  it('gives the intro a different button per mode', () => {
    expect(chromeCopyFor('intro', { mode: 'analogue', cardsDealt: 5 }).continueLabel?.key)
      .toBe('common.continue');
    expect(chromeCopyFor('intro', { mode: 'digital', cardsDealt: 5 }).continueLabel?.key)
      .toBe('session.intro.deal');
    expect(chromeCopyFor('intro', { mode: 'digital', cardsDealt: 1 }).continueLabel?.key)
      .toBe('session.intro.drawRandom');
  });
});

describe('the words the model is shown', () => {
  /* WITHOUT THIS THE MODEL NEVER SEES A BUTTON. `continueLabel` is absent
     from every config, because absent is what "use the app's own word" looks
     like — so a prompt could only ever refuse. */
  it('offers the absent button labels, resolved', () => {
    const shown = chromeDefaults(config(), 'de', resolve);
    expect(shown['run[0].copy.de.continueLabel']).toBe('Weiter');
    expect(shown['run[1].copy.de.continueLabel']).toBe('Weiter');
  });

  it('offers a chrome-backed step its headline and body', () => {
    const shown = chromeDefaults(config(), 'de', resolve);
    expect(shown['run[1].copy.de.headline']).toBe('Wähle eine Karte aus');
    expect(shown['run[1].copy.de.bodyMd']).toBeTruthy();
  });

  /* An ordinary step owns its own headline, so there is nothing to offer. */
  it('offers nothing for a step that has its own copy', () => {
    const shown = chromeDefaults(config(), 'de', resolve);
    expect(shown['run[0].copy.de.headline']).toBeUndefined();
  });

  it('offers nothing in a locale the exercise has no text for', () => {
    const only = config();
    only.content.textLocales = ['de'];
    expect(Object.keys(chromeDefaults(only, 'en', resolve))).toHaveLength(0);
  });
});

describe('where she wrote over a word the app owns', () => {
  it('finds nothing when she has written nothing', () => {
    expect(staticOverrides(config(), resolve)).toEqual([]);
  });

  it('finds a button override and names the key it replaces', () => {
    const edited = config();
    edited.run[0]!.copy.de!.continueLabel = "Los geht's";
    const [found] = staticOverrides(edited, resolve);
    expect(found).toMatchObject({
      path: 'run[0].copy.de.continueLabel',
      locale: 'de',
      messageKey: 'common.continue',
      wants: "Los geht's",
      options: [],
    });
  });

  /* THE FIELD'S LANGUAGE, NOT THE APP'S. Resolved through the app's own `t`
     this reported `builtIn: "Continue"` for a German override — the one thing
     the field exists to get right. */
  it('reports the replaced word in the field’s own language', () => {
    const edited = config();
    edited.run[0]!.copy.de!.continueLabel = "Los geht's";
    edited.run[0]!.copy.en = { headline: 'Start', bodyMd: 'T', continueLabel: 'Here we go' };
    const found = staticOverrides(edited, resolve);
    expect(found.find((e) => e.locale === 'de')?.builtIn).toBe('Weiter');
    expect(found.find((e) => e.locale === 'en')?.builtIn).toBe('Continue');
  });

  /* BEN'S RULE: one entry per field, the latest value winning. It falls out
     of reading the config's CURRENT value rather than accumulating edits —
     what he implements is where she landed, not how she got there. */
  it('keeps one entry however often the field was rewritten', () => {
    const edited = config();
    edited.run[0]!.copy.de!.continueLabel = 'Erst das';
    edited.run[0]!.copy.de!.continueLabel = 'Dann das';
    edited.run[0]!.copy.de!.continueLabel = 'Am Ende das';
    const found = staticOverrides(edited, resolve);
    expect(found).toHaveLength(1);
    expect(found[0]?.wants).toBe('Am Ende das');
  });

  it('finds a headline written over a chrome-backed step', () => {
    const edited = config();
    edited.run[1]!.copy.de!.headline = 'Such dir eine aus';
    const [found] = staticOverrides(edited, resolve);
    expect(found?.messageKey).toBe('session.select.headline');
    expect(found?.builtIn).toBe('Wähle eine Karte aus');
  });

  /* A step that owns its copy is an ordinary content edit, however it was
     made — nothing for Ben to decide, so nothing in this section. */
  it('ignores a headline on a step that owns its copy', () => {
    const edited = config();
    edited.run[0]!.copy.de!.headline = 'Ganz anders';
    expect(staticOverrides(edited, resolve)).toEqual([]);
  });

  it('ignores a field she cleared again', () => {
    const edited = config();
    edited.run[0]!.copy.de!.continueLabel = '   ';
    expect(staticOverrides(edited, resolve)).toEqual([]);
  });

  it('sorts by path so two downloads match', () => {
    const edited = config();
    edited.run[1]!.copy.de!.headline = 'B';
    edited.run[0]!.copy.de!.continueLabel = 'A';
    const paths = staticOverrides(edited, resolve).map((e) => e.path);
    expect(paths).toEqual([...paths].sort());
  });
});
