/**
 * `src/lib/session.ts`: the listen step writes two facts about the press on
 * play. There is no session row here, so both are dropped. Everything else is
 * the real module; anything of it that reaches Supabase hits the throwing
 * `lib__supabase.ts` shim, which is how a missing override shows itself.
 */
export * from '../../../../src/lib/session';

export async function markListened(_id: string): Promise<void> {}

export async function savePlayed(_id: string, _trackId: string | null, _cutId: string | null): Promise<void> {}
