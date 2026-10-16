/**
 * A feeling survives the round trip from the wheel to a row and back.
 *
 * Worth testing because the failure is SILENT and permanent: a path written
 * wrong is a row in somebody's diary that resolves to a word they never
 * chose, and nothing in the schema, the types or the UI would say so. The
 * pure half of `lib/feelings.ts` is all testable without a database, which is
 * why it is a pure half at all.
 */
import { describe, expect, it } from 'vitest';
import { EMOTION_WHEEL } from '../content/emotionWheel';
import { idOf, pathOf, resolveFeeling, wheelAsTree } from './feelings';
import type { FeelingPath } from './feelings';

/** The three shapes a path can have, by where it stopped. */
const LEVEL_1: FeelingPath = { emotionId: 'happy', detailedId: null, specificI: null };
const LEVEL_2: FeelingPath = { emotionId: 'happy', detailedId: 'optimistic', specificI: null };
const LEVEL_3: FeelingPath = { emotionId: 'happy', detailedId: 'optimistic', specificI: 0 };

describe('resolveFeeling', () => {
  it('reads the level the path stopped at, in German', () => {
    expect(resolveFeeling(LEVEL_1, 'de')).toBe('Glücklich');
    expect(resolveFeeling(LEVEL_2, 'de')).toBe('Optimistisch');
    expect(resolveFeeling(LEVEL_3, 'de')).toBe('Kraftvoll');
  });

  it('reads the same three in English', () => {
    expect(resolveFeeling(LEVEL_1, 'en')).toBe('Happy');
    expect(resolveFeeling(LEVEL_2, 'en')).toBe('Optimistic');
    expect(resolveFeeling(LEVEL_3, 'en')).toBe('Powerful');
  });

  /* THE WHOLE REASON THE TABLE STORES A PATH. Two different feelings share
     one label — happy/optimistic/0 and happy/strong/5 are both "Kraftvoll" —
     so a table keyed on the word could not tell them apart, and a diary would
     show one where the other was chosen. */
  it('tells two feelings with the same word apart', () => {
    const optimistic: FeelingPath = { emotionId: 'happy', detailedId: 'optimistic', specificI: 0 };
    const strong: FeelingPath = { emotionId: 'happy', detailedId: 'strong', specificI: 5 };

    expect(resolveFeeling(optimistic, 'de')).toBe('Kraftvoll');
    expect(resolveFeeling(strong, 'de')).toBe('Kraftvoll');
    expect(idOf(optimistic)).not.toBe(idOf(strong));
  });

  /* A WORD RETIRED FROM THE WHEEL. Nothing has ever been retired and nothing
     rules on what should happen (OPEN-QUESTIONS.md) — this pins the
     least-harmful behaviour so a future change to it is deliberate. */
  it('falls back to the level above when a level is gone', () => {
    expect(resolveFeeling(
      { emotionId: 'happy', detailedId: 'optimistic', specificI: 99 }, 'de',
    )).toBe('Optimistisch');

    expect(resolveFeeling(
      { emotionId: 'happy', detailedId: 'gone', specificI: 2 }, 'de',
    )).toBe('Glücklich');
  });

  it('returns null when even the first level is gone, so the row can be dropped', () => {
    expect(resolveFeeling(
      { emotionId: 'gone', detailedId: null, specificI: null }, 'de',
    )).toBeNull();
  });
});

describe('pathOf and idOf', () => {
  it('round-trips all three shapes', () => {
    for (const path of [LEVEL_1, LEVEL_2, LEVEL_3]) {
      expect(pathOf(idOf(path))).toEqual(path);
    }
  });

  it('refuses a malformed id rather than guessing', () => {
    expect(pathOf('')).toBeNull();
    expect(pathOf('happy/optimistic/notanumber')).toBeNull();
    expect(pathOf('a/b/c/d')).toBeNull();
  });
});

describe('wheelAsTree', () => {
  it('carries every node of the wheel', () => {
    const tree = wheelAsTree('de');
    expect(tree).toHaveLength(EMOTION_WHEEL.length);

    const detailed = tree.flatMap((e) => e.children);
    const specific = detailed.flatMap((d) => d.children);
    expect(detailed).toHaveLength(EMOTION_WHEEL.flatMap((e) => e.detailed).length);
    expect(specific).toHaveLength(
      EMOTION_WHEEL.flatMap((e) => e.detailed).flatMap((d) => d.specific).length,
    );
  });

  /* THE CONTRACT BETWEEN THE TREE AND THE TABLE: every id DrillDown can hand
     back decodes to a path that resolves to the label it was handed back
     with. If this holds for all 128, no tap in the sheet can store a feeling
     other than the one that was tapped. */
  it('every node id in the tree decodes to its own label', () => {
    const walk = (nodes: ReturnType<typeof wheelAsTree>[number][]): number => {
      let seen = 0;
      for (const node of nodes) {
        const path = pathOf(node.id);
        expect(path).not.toBeNull();
        expect(resolveFeeling(path!, 'de')).toBe(node.label);
        seen += 1;
        if ('children' in node && node.children) {
          seen += walk(node.children as ReturnType<typeof wheelAsTree>[number][]);
        }
      }
      return seen;
    };
    expect(walk(wheelAsTree('de'))).toBe(8 + 40 + 80);
  });

  it('switches side with the locale', () => {
    expect(wheelAsTree('de')[0].label).toBe('Glücklich');
    expect(wheelAsTree('en')[0].label).toBe('Happy');
  });
});
