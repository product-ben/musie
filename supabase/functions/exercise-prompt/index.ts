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
 * A workspace-scoped key is enough. An ORGANISATION key additionally needs
 * `supabase secrets set ANTHROPIC_WORKSPACE_ID=…`, because the API refuses an
 * unscoped key outright — see the note beside the client below.
 *
 * By hand, like the other three. No workflow covers it, so CHANGING THE
 * EDITOR LIST IS AN EDIT AND A DEPLOY.
 */
import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';
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
  /* Lucia, 2026-10-27, and ONE spelling on purpose — the same reasoning
     `content-admin` records for the same person: her account was created by
     `create-tester.mjs` on exactly this address, so it is the string
     `auth.users` holds and the only one a token can ever carry. The pair
     above is not a pattern to copy; it exists because Ben's account signs in
     as the spelling his brief did not name.

     SHE IS ON BOTH LISTS NOW, and they still mean different things: that one
     is who may edit the deck in the database, this one is who may edit
     exercise copy into a file. The overlap is her, not the rule. */
  'lucia.vondamnitz@gmail.com',
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
      for (const field of ['headline', 'bodyMd', 'placeholder', 'continueLabel', 'secondaryLabel']) {
        if (typeof copy[field] === 'string') {
          out[`run[${index}].copy.${locale}.${field}`] = copy[field];
        }
      }
      for (const mode of ['digital', 'analogue']) {
        const override = copy[mode];
        if (!override) continue;
        for (const field of ['headline', 'bodyMd', 'placeholder', 'continueLabel', 'secondaryLabel']) {
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

SOME FIELDS ARE THE APP'S OWN WORDS
A field marked (app's own wording) currently comes from the app rather than
from this exercise — button labels, and the headings of steps that have no
text of their own. You MAY rewrite those: she is allowed to say what she wants
them to say, and somebody will decide afterwards how to build it. Treat them
exactly like any other field. Do not warn her about it; the file records it.

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

const OPTIONS_SYSTEM = `
A music therapist has written her own wording over a string that the Musie app
owns — a button label, or the heading of a step that has no text of its own.
She cannot apply that herself. You are writing the options for the ENGINEER who
will decide how to build it.

WHAT MUSIE LOOKS LIKE, which is what makes these decisions different:
- Chrome lives in \`apps/web/src/i18n/en.ts\` and \`de.ts\` as a \`MessageKey\`.
  It is OURS and PERMANENT, typed: \`de.ts\` is checked against \`en.ts\`, so a
  key added in one language and not the other fails the build. One string there
  is shared by every exercise that renders that screen.
- Content lives in Postgres, in \`exercise_i18n\`, one row per (exercise,
  locale). It is per-exercise and editable without a deploy.
- Some steps (\`select\`, \`view\`) have NO content columns at all, so every
  word they show is chrome today.
- A config file exists (\`StepCopy.continueLabel\`, \`secondaryLabel\`) but
  NOTHING READS IT AT RUNTIME yet. Proposing that it be read is a legitimate
  option, and it is a bigger change than it sounds.

Give between two and four options per field. Order them cheapest first. Each
one is a real route somebody could take this afternoon, not a category:

- "title": a few words naming the route.
- "what": what would actually change — name files, columns or keys where you
  can. Be concrete. "Add a column" is useless; "add \`continue_label\` to
  \`exercise_i18n\`, read it in \`Session.tsx\`'s action row" is an option.
- "tradeoff": the half that makes it a choice. Who else it affects, what it
  costs, what it risks. Changing a shared key changes it for every exercise —
  say so.

Always include the cheapest honest option, even when it is poor, and say in
its tradeoff why it is poor. Do not invent files or columns you were not told
about. Write in English: the engineer reads English, and these are code
decisions.
`.trim();

const OPTIONS_TOOL = {
  name: 'return_options',
  description: 'Ways each override could be built, cheapest first.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      fields: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            path: { type: 'string' },
            options: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  title: { type: 'string' },
                  what: { type: 'string' },
                  tradeoff: { type: 'string' },
                },
                required: ['title', 'what', 'tradeoff'],
              },
            },
          },
          required: ['path', 'options'],
        },
      },
    },
    required: ['fields'],
  },
} as const;

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

  /* ── A KEY MAY OR MAY NOT KNOW ITS WORKSPACE ──────────────────────────
     An ORGANISATION-level key is not scoped to one, and the API then refuses
     every request until `anthropic-workspace-id` names it:

       "This API key is not scoped to a workspace, so this request must
        include the anthropic-workspace-id header…"

     A workspace-scoped key needs none of this, which is the simpler setup and
     the one to prefer. The header is supported anyway so an org key works
     without anybody having to find out why it does not — that refusal arrives
     as a generic model failure otherwise, and looks like a bug in this file. */
  const workspace = Deno.env.get('ANTHROPIC_WORKSPACE_ID');
  const client = new Anthropic({
    apiKey,
    ...(workspace ? { defaultHeaders: { 'anthropic-workspace-id': workspace } } : {}),
  });

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

    if (body.action === 'options') {
      const overrides = Array.isArray(body.overrides) ? body.overrides : [];
      if (overrides.length === 0) return json({ fields: [] }, 200);

      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 16000,
        system: [{ type: 'text', text: OPTIONS_SYSTEM, cache_control: { type: 'ephemeral' } }],
        tools: [OPTIONS_TOOL as any],
        tool_choice: { type: 'tool', name: 'return_options' },
        messages: [{
          role: 'user',
          content: 'She has written her own wording over these app strings. '
            + 'For each one, how could it be built?\n\n'
            + JSON.stringify(overrides, null, 2),
        }],
      });

      const input = toolInput(message, 'return_options');
      return json({ fields: input?.fields ?? [] }, 200);
    }

    if (body.action === 'prompt') {
      const config = (body.config ?? {}) as Record<string, any>;
      const locale = typeof body.locale === 'string' ? body.locale : 'de';
      const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
      if (prompt === '') return json({ error: 'bad_request' }, 400);

      const text = extractText(config, locale);

      /* THE APP'S OWN WORDS, sent by the browser because they live in its
         `i18n` catalogue and not in the config. Merged in only where the
         config says nothing, so an override she has already written wins. */
      const chrome = (body.chrome ?? {}) as Record<string, string>;
      const owned = new Set<string>();
      for (const [path, word] of Object.entries(chrome)) {
        if (typeof word !== 'string') continue;
        owned.add(path);
        if (text[path] === undefined || text[path] === '') text[path] = word;
      }

      const labelled = Object.fromEntries(
        Object.entries(text).map(([path, value]) => [
          owned.has(path) ? `${path} (app's own wording)` : path,
          value,
        ]),
      );
      /* The model answers with the path it was shown, so the label has to come
         back off before anything is applied. */
      const unlabel = (path: string) => path.replace(/ \(app's own wording\)$/, '');

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
            + `The fields you may rewrite:\n${JSON.stringify(labelled, null, 2)}`,
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
        .map((edit: Record<string, any>) => (typeof edit?.path === 'string'
          ? { ...edit, path: unlabel(edit.path) }
          : edit))
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
