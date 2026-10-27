/**
 * `exercise-prompt` — the therapist describes a change, and only the WORDS move.
 *
 * ── WHY A FUNCTION ────────────────────────────────────────────────────────
 * Third door built on the same reasoning as `reveal-track` and
 * `content-admin`: a server holding one secret, with one rule in it. Here the
 * secret is `ANTHROPIC_API_KEY`, which cannot live in the browser bundle —
 * everything a Vite build sees with a `VITE_` prefix ships to every visitor.
 *
 * ── THE BOUNDARY IS THIS FILE, NOT THE MODEL ──────────────────────────────
 * Ben, 2026-10-27: a structural change must be flagged so he knows he cannot
 * just upload the file. The safest version of that is a model which CANNOT
 * make one — so the request carries only the TEXT fields, as a flat map of
 * path to string. The model never sees `features`, `run`, `modes`, `cuts` or
 * `gateSeconds`, so it cannot return an edit to them; `extractText` below is
 * the allowlist, and it is the whole security argument.
 *
 * Everything structural it is asked for comes back in `declined`, in her own
 * words, and the builder writes those into the file's `handover.requests`.
 *
 * TWO CHECKS, AND THE CLIENT'S WINS. The paths returned here are checked
 * again in the browser against `classifyPath` in `lib/exerciseChanges.ts`
 * before anything is applied. That list and the one here are two copies, so
 * they can drift — and the drift is safe in one direction only, which is why
 * the client re-checks rather than trusting this file.
 *
 * ── DEPLOY ────────────────────────────────────────────────────────────────
 *   supabase secrets set ANTHROPIC_API_KEY=…
 *   supabase functions deploy exercise-prompt
 *
 * By hand, like the other three. No workflow covers it, so CHANGING THE
 * EDITOR LIST IS AN EDIT AND A DEPLOY.
 */
import Anthropic from 'npm:@anthropic-ai/sdk@0.69.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * ── WHO MAY ASK ───────────────────────────────────────────────────────────
 * Separate from `content-admin`'s MAINTAINERS on purpose: that list is who
 * may edit the deck in the database, this one is who may edit exercise COPY
 * in a file. A music therapist belongs on this list and not on that one.
 *
 * Adding somebody is an edit here and a deploy, which is also the only thing
 * that makes the list auditable.
 */
const EDITORS: readonly string[] = [
  'lipinskib@gmail.com',
  'lipinskib@googlemail.com',
];

function mayEdit(email: string | undefined): boolean {
  const normalised = (email ?? '').trim().toLowerCase();
  if (normalised === '') return false;
  return EDITORS.includes(normalised);
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

const MODEL = 'claude-opus-5';

/* ── WHAT THE MODEL IS ALLOWED TO SEE ══════════════════════════════════════
   The text half of a config, flattened to path → string. Mirrors the shapes
   in `lib/exerciseChanges.ts`; see the header on why there are two copies. */
function extractText(config: Record<string, any>, locale: string): Record<string, string> {
  const out: Record<string, string> = {};

  const card = config.library?.[locale];
  if (card) {
    for (const field of ['name', 'description', 'needs', 'imageAlt']) {
      if (typeof card[field] === 'string') out[`library.${locale}.${field}`] = card[field];
    }
  }

  const run = Array.isArray(config.run) ? config.run : [];
  run.forEach((entry: Record<string, any>, index: number) => {
    const copy = entry.copy?.[locale];
    if (copy) {
      for (const field of ['headline', 'bodyMd', 'placeholder', 'continueLabel']) {
        if (typeof copy[field] === 'string') {
          out[`run[${index}].copy.${locale}.${field}`] = copy[field];
        }
      }
      for (const mode of ['digital', 'analogue']) {
        const override = copy[mode];
        if (!override) continue;
        for (const field of ['headline', 'bodyMd', 'placeholder', 'continueLabel']) {
          if (typeof override[field] === 'string') {
            out[`run[${index}].copy.${locale}.${mode}.${field}`] = override[field];
          }
        }
      }
    }

    const questions = entry.questions?.[locale];
    if (Array.isArray(questions)) {
      questions.forEach((question: Record<string, any>, position: number) => {
        for (const field of ['listen', 'reflect', 'helper']) {
          if (typeof question[field] === 'string') {
            out[`run[${index}].questions.${locale}[${position}].${field}`] = question[field];
          }
        }
      });
    }
  });

  return out;
}

/** Read-only context, so the model knows what kind of exercise it is editing. */
function describe(config: Record<string, any>): string {
  const steps = (Array.isArray(config.run) ? config.run : [])
    .map((entry: Record<string, any>) => entry.step)
    .join(' · ');
  return [
    `kind: ${config.kind}`,
    `steps: ${steps}`,
    `offers: ${config.modes?.offers ?? 'no modes — this exercise has no cards'}`,
  ].join('\n');
}

/* ── THE WRITING RULES ═════════════════════════════════════════════════════
   Condensed from docs/GERMAN-UI-WRITING.md. Kept short on purpose: the full
   document is for people writing chrome, and most of it is about length
   budgets and compounds that do not apply to a therapist's own prose. */
const GERMAN_RULES = `
German copy rules (docs/GERMAN-UI-WRITING.md):
- "du", never "Sie".
- Sentence case, not Title Case.
- Actions start with a verb: "Karte wählen", not "Auswahl der Karte".
- Never "Bitte".
- Typography: – (en dash), never —. Proper quotes „ ".
`.trim();

const SYSTEM = `
You help a music therapist edit the wording of a mindfulness exercise in the
Musie app. You are given the exercise's TEXT fields only, as a map of path to
string, plus read-only context about what kind of exercise it is.

WHAT YOU MAY DO
Rewrite the text of the fields you were given. That is all. Return every field
you changed in "edits", keyed by the exact path you were given.

WHAT YOU MAY NOT DO
You cannot add or remove steps, turn features on or off, add or remove
questions, change which recording plays, change timings, or change anything
you were not given as a field. You cannot invent a path. If she asks for
something like that — or for anything you cannot do by rewriting one of these
strings — put it in "declined" with a short reason, and do not attempt it.
Declining is a correct and expected outcome, not a failure.

A question's WORDING is yours to change. Adding a question is not.

HOW TO WRITE
Match the voice already in the fields: warm, plain, addressed to one person
mid-exercise. Keep the Markdown structure of a body field — numbered lists stay
numbered lists. Do not add headings. Do not pad. If a field does not need to
change, leave it out of "edits" entirely.

${GERMAN_RULES}

"note" is one short sentence back to her, in the language she wrote in, saying
what you did or why you did not.
`.trim();

const TRANSLATE_SYSTEM = `
You translate the wording of a mindfulness exercise in the Musie app between
German and English, for a music therapist.

Translate meaning and REGISTER, not words. This is therapeutic copy addressed
to one person mid-exercise: warm, plain, calm. German uses "du" and never
"Sie". Keep the Markdown structure exactly — a numbered list stays a numbered
list with the same number of items, a heading stays absent if it was absent.

Translate every field you are given, and return each one keyed by the exact
path it came with. Change nothing else.

${GERMAN_RULES}
`.trim();

const EDIT_TOOL = {
  name: 'return_edits',
  description: 'Return the rewritten fields, and anything you declined to do.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      edits: {
        type: 'array',
        description: 'Only fields whose text you changed.',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            path: { type: 'string' },
            value: { type: 'string' },
          },
          required: ['path', 'value'],
        },
      },
      declined: {
        type: 'array',
        description: 'Anything asked for that is not a rewrite of a given field.',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            what: { type: 'string' },
            why: { type: 'string' },
          },
          required: ['what', 'why'],
        },
      },
      note: { type: 'string' },
    },
    required: ['edits', 'declined', 'note'],
  },
} as const;

const TRANSLATE_TOOL = {
  name: 'return_translations',
  description: 'Return each field translated, keyed by the path it came with.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      translations: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            path: { type: 'string' },
            text: { type: 'string' },
          },
          required: ['path', 'text'],
        },
      },
    },
    required: ['translations'],
  },
} as const;

/** The tool input, or null where the model answered some other way. */
function toolInput(message: Anthropic.Message, name: string): Record<string, any> | null {
  for (const block of message.content) {
    /* PARSED, NEVER STRING-MATCHED: tool inputs may carry different JSON
       escaping between models, so the SDK's own parse is the only safe read. */
    if (block.type === 'tool_use' && block.name === name) {
      return block.input as Record<string, any>;
    }
  }
  return null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  if (authorization === null) return json({ error: 'unauthenticated' }, 401);

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!url || !anonKey) return json({ error: 'misconfigured' }, 500);
  /* NAMED, so the one setup step anybody forgets reports itself rather than
     looking like a model failure. */
  if (!apiKey) return json({ error: 'no_api_key' }, 500);

  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: auth, error: whoError } = await asCaller.auth.getUser();
  if (whoError !== null || auth.user === null) return json({ error: 'unauthenticated' }, 401);
  if (!mayEdit(auth.user.email)) return json({ error: 'forbidden' }, 403);

  const client = new Anthropic({ apiKey });

  try {
    if (body.action === 'translate') {
      const fields = Array.isArray(body.fields) ? body.fields : [];
      if (fields.length === 0) return json({ translations: [] }, 200);

      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 16000,
        system: TRANSLATE_SYSTEM,
        tools: [TRANSLATE_TOOL as any],
        tool_choice: { type: 'tool', name: 'return_translations' },
        messages: [{
          role: 'user',
          content: `Translate from ${body.from} to ${body.to}.\n\n`
            + JSON.stringify(fields, null, 2),
        }],
      });

      const input = toolInput(message, 'return_translations');
      return json({ translations: input?.translations ?? [] }, 200);
    }

    if (body.action === 'prompt') {
      const config = (body.config ?? {}) as Record<string, any>;
      const locale = typeof body.locale === 'string' ? body.locale : 'de';
      const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
      if (prompt === '') return json({ error: 'bad_request' }, 400);

      const text = extractText(config, locale);

      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 16000,
        /* The rules never change, so they cache; the fields and her words do,
           so they come after. Prefix order is system → messages. */
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        tools: [EDIT_TOOL as any],
        tool_choice: { type: 'tool', name: 'return_edits' },
        messages: [{
          role: 'user',
          content: `About this exercise (read-only, not editable):\n${describe(config)}\n\n`
            + `Her instruction:\n${prompt}\n\n`
            + `The fields you may rewrite:\n${JSON.stringify(text, null, 2)}`,
        }],
      });

      /* A refusal is a 200 with no tool call. Report it as a declined request
         rather than as an error: she asked for something, and the file should
         still carry that she asked. */
      if (message.stop_reason === 'refusal') {
        return json({
          edits: [],
          declined: [{ what: prompt, why: 'refused' }],
          note: '',
        }, 200);
      }

      const input = toolInput(message, 'return_edits');
      if (input === null) return json({ error: 'no_answer' }, 502);

      /* THE SECOND GATE. The model was only shown text fields, so a path
         outside that set is a path it invented — dropped here, and checked
         again in the browser. */
      const edits = (Array.isArray(input.edits) ? input.edits : [])
        .filter((edit: Record<string, any>) => typeof edit?.path === 'string'
          && typeof edit?.value === 'string'
          && Object.prototype.hasOwnProperty.call(text, edit.path));

      return json({
        edits,
        declined: Array.isArray(input.declined) ? input.declined : [],
        note: typeof input.note === 'string' ? input.note : '',
      }, 200);
    }

    return json({ error: 'bad_request' }, 400);
  } catch (thrown: unknown) {
    const detail = thrown instanceof Error ? thrown.message : String(thrown);
    console.error('[exercise-prompt]', detail);
    return json({ error: 'model_failed' }, 502);
  }
});
