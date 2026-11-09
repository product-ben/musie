/**
 * One instrument's locked sound, read when the play step mounts.
 *
 * Not part of `getExercises`: the library list has no use for a few kilobytes
 * of jsonb and the sample index per instrument, and the play step is the only
 * screen that does. `content.ts` carries what the exercise SAYS
 * (`Exercise.instrument`); this carries how it SOUNDS.
 *
 * ── WHAT IS TRUSTED ───────────────────────────────────────────────────────
 * The sound and the answer are jsonb the app reads but never writes — only a
 * migration does, generated from the files `sources.test.ts` holds against
 * the experiments. So the jsonb is cast to its declared shape rather than
 * validated field by field; what is checked is that the three parts exist,
 * which is the failure a half-applied migration would produce.
 */
import { getSupabase } from './supabase';
import { isInstrumentId } from '../instruments/types';
import type { AnswerConfig, InstrumentDefinition, InstrumentFamily } from '../instruments/types';

const INSTRUMENT_SELECT = 'id, family, instrument_sounds(sound, answer, demo), instrument_samples(file, path, midi, layer, bytes, sha256)';

export async function getInstrument(id: string): Promise<InstrumentDefinition> {
  const { data, error } = await getSupabase()
    .from('instruments')
    .select(INSTRUMENT_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error !== null) throw new Error(`instruments: ${error.message}`);
  if (data === null || !isInstrumentId(data.id)) throw new Error(`instruments: no instrument "${id}"`);

  /* One-to-one on the primary key, so an object — tolerated as an array too,
     the same way `content.ts` reads `exercise_instruments`. */
  const sounds = Array.isArray(data.instrument_sounds) ? data.instrument_sounds[0] : data.instrument_sounds;
  if (sounds === null || sounds === undefined) throw new Error(`instruments: no sound for "${id}"`);
  if (data.instrument_samples.length === 0) throw new Error(`instruments: no samples for "${id}"`);

  return {
    id: data.id,
    family: data.family as InstrumentFamily,
    sound: sounds.sound as Record<string, unknown>,
    answer: sounds.answer as unknown as AnswerConfig,
    demo: sounds.demo as Record<string, unknown>,
    samples: [...data.instrument_samples].sort((a, b) => a.path.localeCompare(b.path)),
  };
}
