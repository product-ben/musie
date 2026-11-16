/**
 * `src/lib/instruments.ts`: the harp's definition as `getInstrument('harp')`
 * returned it from the local stack. Its samples are static files under
 * /instruments/harp/, served from apps/web/public.
 */
import type { InstrumentDefinition } from '../../../../src/instruments/types';
import * as store from '../data/store';

export * from '../../../../src/lib/instruments';

export async function getInstrument(id: string): Promise<InstrumentDefinition> {
  return store.tick(store.instrument(id));
}
