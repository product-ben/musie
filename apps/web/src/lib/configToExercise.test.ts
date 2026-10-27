/**
 * The config back into an `Exercise`, which is what makes the builder's
 * preview the real screen rather than a drawing of one.
 *
 * The rules worth a test are the ones a future edit could break without
 * anything going red: that a mode override wins over the base copy and only
 * for the fields it spells, that an empty placeholder becomes NULL rather than
 * `''` (two different things to the reflect step), and that the two runs of a
 * card exercise resolve to the right four steps each.
 */
import { describe, expect, it } from 'vitest';

import { configToExercise, copyInMode, previewHand, stepsInMode } from './configToExercise';
import type { ExerciseConfig, RunStep } from './exerciseConfig';

const copy = (headline: string, extra: Record<string, unknown> = {}) => ({
  de: { headline, bodyMd: 'Text.', ...extra },
  en: { headline, bodyMd: 'Text.', ...extra },
});

function card(): ExerciseConfig {
  const run: RunStep[] = [
    {
      step: 'intro',
      features: ['mode_switch', 'needs_note'],
      copy: {
        de: {
          headline: 'So legen wir los',
          bodyMd: 'Zieh fünf Karten und leg sie vor dich.',
          digital: { bodyMd: 'Ich ziehe fünf Karten für dich.' },
        },
      },
    },
    {
      step: 'scan', mode: 'analogue',
      features: ['card_scan_camera', 'card_scan_code', 'card_scan_deeplink'],
      copy: copy('Karte'),
    },
    {
      step: 'select', mode: 'digital', features: ['card_pick_from_hand'],
      copySource: 'chrome', copy: {},
    },
    {
      step: 'listen', gateSeconds: 90,
      features: ['track_from_card', 'card_visual', 'immersive_view'],
      copy: copy('Hör zu'),
    },
    {
      step: 'reflect', features: ['mode_text'],
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
      de: { name: 'Achtsame Pause', description: 'D', needs: 'Die Karten', imageAlt: 'A' },
      en: { name: 'Mindful Break', description: 'D', needs: 'The cards', imageAlt: 'A' },
    },
    run,
    content: { locales: ['de', 'en'], textLocales: ['de', 'en'] },
  };
}

describe('a mode resolves one of the two runs', () => {
  it('gives the analogue run its scan and no select', () => {
    expect(stepsInMode(card(), 'analogue')).toEqual(['intro', 'scan', 'listen', 'reflect']);
  });

  it('gives the digital run its select and no scan', () => {
    expect(stepsInMode(card(), 'digital')).toEqual(['intro', 'select', 'listen', 'reflect']);
  });

  /* Ben's rail rule, 2026-10-14: a card run is four markers long whatever the
     mode. If this ever differs the preview draws a different rail from the
     app, which is the one thing a preview must not do. */
  it('keeps both runs the same length', () => {
    const config = card();
    expect(stepsInMode(config, 'analogue')).toHaveLength(4);
    expect(stepsInMode(config, 'digital')).toHaveLength(4);
  });
});

describe('the mode override', () => {
  it('replaces only the fields it spells', () => {
    const base = { headline: 'Los', bodyMd: 'Papier', digital: { bodyMd: 'Bildschirm' } };
    expect(copyInMode(base, 'digital')).toMatchObject({
      headline: 'Los', bodyMd: 'Bildschirm',
    });
  });

  it('leaves the base alone in the other mode', () => {
    const base = { headline: 'Los', bodyMd: 'Papier', digital: { bodyMd: 'Bildschirm' } };
    expect(copyInMode(base, 'analogue').bodyMd).toBe('Papier');
  });

  /* The live bug the model was written around: Achtsame Pause's intro tells a
     DIGITAL run to lay cards on a table. The override is the fix, and this is
     the assertion that it reaches the screen. */
  it('reaches introMd through configToExercise', () => {
    expect(configToExercise(card(), 'de', 'analogue').introMd)
      .toContain('leg sie vor dich');
    expect(configToExercise(card(), 'de', 'digital').introMd)
      .toContain('Ich ziehe fünf Karten');
  });

  it('keeps the headline across the override', () => {
    expect(configToExercise(card(), 'de', 'digital').introMd)
      .toContain('## So legen wir los');
  });
});

describe('the exercise the preview gets', () => {
  it('carries the library card of the chosen locale', () => {
    expect(configToExercise(card(), 'en', 'analogue').name).toBe('Mindful Break');
    expect(configToExercise(card(), 'de', 'analogue').name).toBe('Achtsame Pause');
  });

  /* NULL IS KEPT, unlike the four `_md` fields: null means the exercise asks
     nothing specific and the step falls back to the catalogue sentence, where
     '' would be a field with no prompt at all. */
  it('turns an empty placeholder into null, not an empty string', () => {
    const config = card();
    config.run[4]!.copy.de!.placeholder = '   ';
    expect(configToExercise(config, 'de', 'analogue').reflectPlaceholder).toBeNull();
  });

  it('keeps a written placeholder', () => {
    expect(configToExercise(card(), 'de', 'analogue').reflectPlaceholder)
      .toBe('Schreib etwas.');
  });

  it('derives asksPosture from the intro features, not from a column', () => {
    const config = card();
    expect(configToExercise(config, 'de', 'analogue').asksPosture).toBe(false);
    config.run[0]!.features.push('posture_question');
    expect(configToExercise(config, 'de', 'analogue').asksPosture).toBe(true);
  });

  it('takes the listen gate off the listen step', () => {
    expect(configToExercise(card(), 'de', 'analogue').listenGateSeconds).toBe(90);
  });

  /* `Exercise` has four `_md` fields and the run has up to five steps, so the
     mode decides which steps RENDER, never which copy is read: `scanMd` is the
     scan step's copy in both modes, and the digital run simply never draws it.
     Worth pinning — the alternative reading, that the mode filters the copy
     too, would quietly blank a field somebody is editing. */
  it('reads a step copy regardless of which mode runs that step', () => {
    expect(configToExercise(card(), 'de', 'digital').scanMd).toBe('## Karte\n\nText.');
  });

  /* A locale with no copy for a step yields an empty document, which is what
     every reader of these fields already handles — `content.ts` coalesces the
     nullable columns at the same boundary for the same reason. */
  it('gives an empty document where the locale has no copy', () => {
    const config = card();
    delete config.run[1]!.copy.en;
    expect(configToExercise(config, 'en', 'analogue').scanMd).toBe('');
  });
});

describe('the preview hand', () => {
  it('is as long as the exercise deals', () => {
    expect(previewHand(5)).toHaveLength(5);
  });

  /* `view` is the one-card shape, and a null `cards_dealt` cannot happen for a
     card exercise — but a preview that rendered an empty hand would draw an
     empty grid rather than a card. */
  it('is one card when nothing is dealt', () => {
    expect(previewHand(null)).toHaveLength(1);
  });

  it('gives every card its own id', () => {
    const ids = previewHand(5).map((entry) => entry.id);
    expect(new Set(ids).size).toBe(5);
  });
});
