/**
 * The therapist's own words → changed copy, through `exercise-prompt`.
 *
 * ── THIS FILE HOLDS NO KEY AND NO RULES ───────────────────────────────────
 * It is a typed wrapper around one Edge Function. The API key, the model, the
 * writing rules and the text-only boundary all live in
 * `supabase/functions/exercise-prompt/index.ts`, because a browser cannot
 * keep a secret and a rule the client enforces is a rule an attacker edits.
 *
 * What DOES live here is the third gate: every path that comes back is
 * checked against `classifyPath` before the caller applies it. The function
 * already filters to the fields it handed out; this is the copy that wins if
 * the two ever drift, and it is in the repository the app actually ships.
 */
import { getSupabase } from './supabase';
import { classifyPath } from './exerciseChanges';
import type { ExerciseConfig } from './exerciseConfig';
import type { IntegrationOption } from './chromeCopy';
import type { Locale } from '../i18n';

export interface PromptEdit {
  path: string;
  value: string;
}

export interface PromptDecline {
  what: string;
  why: string;
}

export interface PromptAnswer {
  edits: PromptEdit[];
  declined: PromptDecline[];
  /** One sentence back to her, in the language she wrote in. */
  note: string;
}

/** Thrown shapes the screen can tell apart. `no_api_key` is the setup step. */
export type PromptFailure = 'no_api_key' | 'forbidden' | 'model_failed' | 'unknown';

export class PromptError extends Error {
  readonly reason: PromptFailure;

  constructor(reason: PromptFailure) {
    super(reason);
    this.reason = reason;
    this.name = 'PromptError';
  }
}

function failureOf(payload: unknown): PromptFailure {
  const error = (payload as { error?: unknown } | null)?.error;
  if (error === 'no_api_key' || error === 'forbidden' || error === 'model_failed') return error;
  return 'unknown';
}

async function call(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await getSupabase().functions.invoke('exercise-prompt', { body });

  if (error !== null) {
    /* supabase-js puts a non-2xx body behind `context`; the reason matters
       more than the status, because `no_api_key` is a thing Ben can fix in
       one command and the others are not. */
    let payload: unknown = null;
    try {
      payload = await (error as { context?: Response }).context?.json();
    } catch { /* no body, or not JSON — falls through to `unknown`. */ }
    throw new PromptError(failureOf(payload));
  }

  return (data ?? {}) as Record<string, unknown>;
}

/**
 * Ask for a change in words, get back edits to text fields.
 *
 * Anything structural comes back in `declined` rather than being attempted —
 * the function never shows the model a structural field, so it cannot.
 */
export async function promptEdits(
  config: ExerciseConfig,
  locale: Locale,
  prompt: string,
  /* The app's own words, keyed by path. They live in the browser's `i18n`
     catalogue and not in the config, so the function cannot find them — and
     without them the model never sees a button label, because "absent" is
     what "use the app's own word" looks like. */
  chrome: Record<string, string> = {},
): Promise<PromptAnswer> {
  const data = await call({ action: 'prompt', config, locale, prompt, chrome });

  const edits = (Array.isArray(data.edits) ? data.edits : [])
    .filter((edit: unknown): edit is PromptEdit => {
      const candidate = edit as PromptEdit | null;
      return typeof candidate?.path === 'string'
        && typeof candidate?.value === 'string'
        /* THE GATE THAT WINS. A structural path here would mean the function's
           allowlist and this one disagree; the answer is to drop it. */
        && classifyPath(candidate.path) === 'text';
    });

  return {
    edits,
    declined: (Array.isArray(data.declined) ? data.declined : []) as PromptDecline[],
    note: typeof data.note === 'string' ? data.note : '',
  };
}

/**
 * Translate the fields given, keyed by the path each came with.
 *
 * Called with ONE field at a time by the builder: she edits a German string,
 * its English twin is rewritten, and that write does not itself trigger a
 * translation back. Two fields that regenerate each other would mean the last
 * edit always silently destroys the other side.
 */
export async function translateFields(
  from: Locale,
  to: Locale,
  fields: { path: string; text: string }[],
): Promise<{ path: string; text: string }[]> {
  if (fields.length === 0) return [];

  const data = await call({ action: 'translate', from, to, fields });

  return (Array.isArray(data.translations) ? data.translations : [])
    .filter((entry: unknown): entry is { path: string; text: string } => {
      const candidate = entry as { path?: unknown; text?: unknown } | null;
      return typeof candidate?.path === 'string'
        && typeof candidate?.text === 'string'
        && classifyPath(candidate.path) === 'text';
    });
}

/** The same path, in the other locale. `run[0].copy.de.bodyMd` → `…en…`. */
export function twinPath(path: string, from: Locale, to: Locale): string {
  return path.replace(`.${from}.`, `.${to}.`).replace(`.${from}[`, `.${to}[`);
}

/**
 * How each override could be built — written for Ben, not for her.
 *
 * Asked once, when the file is produced, because that is when the answer is
 * needed and asking per keystroke would be a model call per letter. One call
 * for every override in the exercise.
 */
export async function fetchIntegrationOptions(
  overrides: { path: string; locale: string; messageKey: string; builtIn: string; wants: string }[],
): Promise<Record<string, IntegrationOption[]>> {
  if (overrides.length === 0) return {};

  const data = await call({ action: 'options', overrides });
  const fields = Array.isArray(data.fields) ? data.fields : [];

  const out: Record<string, IntegrationOption[]> = {};
  for (const entry of fields as { path?: unknown; options?: unknown }[]) {
    if (typeof entry.path !== 'string' || !Array.isArray(entry.options)) continue;
    out[entry.path] = entry.options.filter((option: unknown) => {
      const candidate = option as IntegrationOption | null;
      return typeof candidate?.title === 'string'
        && typeof candidate?.what === 'string'
        && typeof candidate?.tradeoff === 'string';
    }) as IntegrationOption[];
  }
  return out;
}
