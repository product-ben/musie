/**
 * A credential for one recording session — F.1's client half.
 *
 * ── WHAT THE APP IS ALLOWED TO HOLD ───────────────────────────────────────
 * Not the OpenAI key. That is a Supabase secret read by the `realtime-token`
 * Edge Function and by nothing else; it is never in a bundle, never in
 * `.env.local`, and never in this repository. What comes back here is an
 * ephemeral `ek_…` that expires in ten minutes and can open a transcription
 * session and nothing else.
 *
 * ── ONE PER RECORDING, NOT ONE PER APP ────────────────────────────────────
 * Deliberately not cached. A token lives about ten minutes, a reflection takes
 * two, and the failure mode of reusing a stale one is a socket that closes
 * seconds after somebody starts speaking — which reads as "the microphone
 * broke" and is the hardest kind of bug to describe. Minting per session costs
 * one request against an endpoint that already exists.
 *
 * ── THE TWO FAILURES THAT ARE NOT FAULTS ──────────────────────────────────
 * Out of budget and rate limited are states of the account, not of the code,
 * and they arrive here as `noCredits` and `rateLimited` — the codes
 * `@musie/voice` already has written copy for in both languages. Ben's project
 * has a $50 cap that fails requests hard when reached; without this mapping
 * that failure reaches a person as "the connection dropped", which sends them
 * to their wifi rather than to their invoice.
 */
import type { VoiceMessageCode } from '@musie/voice';
import { getSupabase } from './supabase';

export type TokenOutcome =
  | { kind: 'token'; token: string; expiresAt: number | null; model: string }
  /** A code `voiceMessages.ts` already maps to catalogue copy. */
  | { kind: 'failed'; code: VoiceMessageCode };

interface TokenBody {
  token: string;
  expiresAt: number | null;
  model: string;
}

/**
 * Ask for a token for this recording.
 *
 * `model` is checked against a fixed list on the server, so passing something
 * unknown quietly gets the default rather than an error — the browser does not
 * get to name models on the account.
 */
export async function realtimeToken(model?: string): Promise<TokenOutcome> {
  const { data, error } = await getSupabase()
    .functions.invoke<TokenBody>('realtime-token', { body: model ? { model } : {} });

  if (error !== null) {
    const status = (error as { context?: { status?: number } }).context?.status;

    /* 402 and 429 are the account speaking, and each has its own sentence. */
    if (status === 402) return { kind: 'failed', code: 'noCredits' };
    if (status === 429) return { kind: 'failed', code: 'rateLimited' };

    /* 401 means this browser is not signed in, which on a screen reached
       mid-session should be impossible — so it is a connection failure from
       the person's point of view, and a real one from ours. */
    console.warn('[musie] realtime-token failed:', error.message, status);
    return { kind: 'failed', code: 'connectionFailed' };
  }

  if (data === null || typeof data.token !== 'string' || data.token === '') {
    console.warn('[musie] realtime-token returned no token');
    return { kind: 'failed', code: 'connectionFailed' };
  }

  return { kind: 'token', token: data.token, expiresAt: data.expiresAt, model: data.model };
}
