/**
 * The three instruments, assembled from the files the app's migration was
 * generated from — `supabase/content/instruments/*.json`, which sources.test.ts
 * holds to the experiments. Assembled the way `getInstrument` reads the rows:
 * the shared answer merged with the instrument's own, samples sorted by path.
 * (The harp's assembly equals the one the Reflexion experiment exported from
 * the database, field for field — checked 2026-11-20.)
 *
 * The samples are the app's static files under /instruments/…, fetched whole
 * by the engine (no Range needed).
 */
import sharedAnswer from '../../../../../supabase/content/instruments/answer.json';
import harp from '../../../../../supabase/content/instruments/harp.json';
import kalimba from '../../../../../supabase/content/instruments/kalimba.json';
import marimba from '../../../../../supabase/content/instruments/marimba.json';
import samples from '../../../../../supabase/content/instruments/samples.json';
import type { AnswerConfig, InstrumentDefinition, InstrumentFamily, InstrumentId } from '../../../src/instruments/types';

interface InstrumentFile {
  id: string;
  family: string;
  sound: Record<string, unknown>;
  answer: Record<string, unknown>;
  demo: Record<string, unknown>;
}

function definitionOf(file: InstrumentFile): InstrumentDefinition {
  const { $comment: _comment, ...shared } = sharedAnswer as Record<string, unknown>;
  const id = file.id as InstrumentId;
  return {
    id,
    family: file.family as InstrumentFamily,
    sound: file.sound,
    answer: { ...shared, ...file.answer } as unknown as AnswerConfig,
    demo: file.demo,
    samples: samples.samples
      .filter((s) => s.instrument === id)
      .map(({ file: name, path, midi, layer, bytes, sha256 }) => ({ file: name, path, midi, layer, bytes, sha256 }))
      .sort((a, b) => a.path.localeCompare(b.path)),
  };
}

export const DEFINITIONS: Record<InstrumentId, InstrumentDefinition> = {
  harp: definitionOf(harp as InstrumentFile),
  kalimba: definitionOf(kalimba as InstrumentFile),
  marimba: definitionOf(marimba as InstrumentFile),
};

export const INSTRUMENT_NAMES: Record<InstrumentId, string> = {
  harp: 'Harfe',
  kalimba: 'Kalimba',
  marimba: 'Marimba',
};
