/**
 * `content-admin` — the only door the deck can be edited through.
 *
 * ── WHY A FUNCTION AND NOT POLICIES, WHICH IS THE SAME ANSWER AS E.5 ──────
 * The maintenance screen has to show `tracks.title`, `artist` and
 * `licence_ref`. `authenticated` is granted `select (id, src,
 * duration_seconds)` and nothing else — `20260921170000` took `licence_ref`
 * back on 21 September — and **RLS cannot narrow a column grant**, because a
 * grant belongs to a role. There is no policy that lets one signed-in person
 * read titles without letting every signed-in person read them.
 *
 * `reveal-track` already made this argument and solved it the only way it can
 * be solved: "a server holding the service role, which is exactly one place,
 * with exactly one rule in it". This is the second door built on the same
 * reasoning, and it writes as well as reads.
 *
 * Three things follow, and they are why this file is worth its length:
 *
 *   1. NO CONTENT TABLE NEEDS A WRITE POLICY, and `authenticated` needs no
 *      new grant at all. Rule 2's revoke-then-grant trap and rule 3's
 *      prohibition never arise for the client, because the client never
 *      writes.
 *   2. THE ACTOR CANNOT BE FORGED. The email written into every history row
 *      comes from the verified token below and never from the payload.
 *   3. The allowlist, the gate and the audit have one place to live.
 *
 * ── THE GATE IS HERE; THE INVARIANTS ARE IN SQL ───────────────────────────
 * This file decides WHO may ask. What a valid write IS lives in
 * `20261014100000` — `admin_write`, the check constraints and the write-once
 * trigger — because three things have to happen in one statement (the row,
 * its history entry and the projection) and supabase-js cannot open a
 * transaction. So nearly every action below is a thin, named `rpc` call, and
 * that is the design rather than laziness: a second validator here could
 * disagree with the database, and the database is the one that is true.
 *
 * ── DEPLOY ────────────────────────────────────────────────────────────────
 *   supabase functions deploy content-admin
 *
 * By hand, like `reveal-track` and `realtime-token`. No workflow covers it —
 * `db-push.yml` pushes migrations only — so CHANGING THE ALLOWLIST IS AN EDIT
 * AND A DEPLOY. That is what "the selection is only possible via code" means
 * in practice.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * ── WHO MAY OPEN IT ───────────────────────────────────────────────────────
 * Ben, 2026-10-14: available only to selected users, and the selection is
 * possible only via code. This is that code. Adding somebody is an edit to
 * this array and a deploy, which is also the only thing that makes the list
 * auditable.
 *
 * BOTH SPELLINGS OF ONE MAILBOX. The brief says `lipinskib@gmail.com`; the
 * account signs in as `lipinskib@googlemail.com`. Google treats them as the
 * same inbox and Postgres compares strings, so both are listed. Nothing
 * cleverer: stripping dots and `+suffixes` the way Gmail does would make this
 * list match addresses nobody put in it.
 */
const MAINTAINERS = [
  'lipinskib@gmail.com',
  'lipinskib@googlemail.com',
  /* Lucia, 2026-10-14. ONE spelling, and deliberately: her account was created
     by `create-tester.mjs` on exactly this address, so this is the string
     `auth.users` holds and the only one a token can ever carry. The pair above
     is not a pattern to copy — it exists because Ben's account signs in as the
     spelling his brief did not name. */
  'lucia.vondamnitz@gmail.com',
];

/**
 * An ANONYMOUS USER'S EMAIL IS THE EMPTY STRING, not null and not undefined —
 * measured against the local stack on 2026-09-22 and documented in
 * `lib/auth.ts`, where the same assumption shipped a bug. If an empty string
 * ever matched an entry here, every anonymous visitor would be a maintainer.
 */
function isMaintainer(email: string | null | undefined): boolean {
  if (typeof email !== 'string') return false;
  const normalised = email.trim().toLowerCase();
  if (normalised === '') return false;
  return MAINTAINERS.includes(normalised);
}

/* The app is same-origin in production; in development it is a Vite server on
   another port, so the preflight has to be answered. */
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

/* ═══ WHAT THE SCREEN READS ═════════════════════════════════════════════════ */

/**
 * Everything the maintenance screen draws, in one round trip.
 *
 * One call rather than five because the screen is a grid that shows cards,
 * tracks and artwork at once: fetching them separately would paint it three
 * times and give a cell a track id it cannot yet name.
 *
 * `tracks` is selected with `*` ON PURPOSE. Every column, credit included —
 * that is the whole reason this endpoint exists, and the reason it may only
 * answer a maintainer.
 */
async function readAll(server: SupabaseClient): Promise<unknown> {
  const [cards, tracks, artworks, alts, cells, edits] = await Promise.all([
    server.from('cards').select('*').order('sort'),
    server.from('tracks').select('*').order('id'),
    server.from('artworks').select('*').order('id'),
    server.from('artwork_i18n').select('*'),
    server.from('grid_cells').select('*'),
    server.from('content_edits').select('*').order('at', { ascending: false }).limit(50),
  ]);

  for (const result of [cards, tracks, artworks, alts, cells, edits]) {
    if (result.error !== null) throw new Error(result.error.message);
  }

  /* The alt text is folded onto its artwork, because "null in both locales or
     written in both" is a rule about the PAIR and a screen that holds them
     apart invites breaking it. */
  const altFor = (id: string, locale: string): string | null => {
    const row = (alts.data ?? []).find(
      (a: Record<string, unknown>) => a.artwork_id === id && a.locale === locale,
    );
    return (row?.alt as string | null) ?? null;
  };

  return {
    cards: cards.data,
    tracks: tracks.data,
    artworks: (artworks.data ?? []).map((a: Record<string, unknown>) => ({
      ...a,
      alt_de: altFor(a.id as string, 'de'),
      alt_en: altFor(a.id as string, 'en'),
    })),
    cells: cells.data,
    edits: edits.data,
  };
}

/* ═══ UPLOADS ═══════════════════════════════════════════════════════════════ */

const BUCKETS = { track: 'tracks', artwork: 'artworks' } as const;

/**
 * A key the SERVER mints, and the client cannot influence.
 *
 * ── A KEY MAY NOT SAY WHAT THE CARD IS ────────────────────────────────────
 * `20260921160000` rejected `apps/web/public/` for three reasons, the third
 * being that `mc-01-joy.mp3` names the card AND the feeling — the same leak
 * the opaque `trk-NN` ids exist to prevent. So a key is the opaque id, a
 * random suffix and the extension, and never a filename the studio chose.
 *
 * ── THE SUFFIX IS RANDOM RATHER THAN A CONTENT HASH ───────────────────────
 * `music-upload.mjs` hashes the bytes, which lets it serve a one-year
 * `immutable` cache header safely: a re-bounce is a new key, so a cached
 * response can never go stale. The property that makes that safe is *a
 * replacement is a new key*, and a random suffix has it too — the server
 * cannot hash bytes it has not seen, because the browser PUTs them straight
 * to storage. What is lost is deduplication of two identical uploads, which
 * nobody needs, and it is the old object surviving a replacement that makes
 * a revert possible at all.
 */
function mintKey(id: string, filename: string): string {
  const dot = filename.lastIndexOf('.');
  const extension = dot > 0 ? filename.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : 'bin';
  const suffix = [...crypto.getRandomValues(new Uint8Array(4))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `${id}-${suffix}.${extension}`;
}

/* ═══ THE DOOR ══════════════════════════════════════════════════════════════ */

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  if (authorization === null) return json({ error: 'unauthenticated' }, 401);

  let action: unknown;
  let payload: Record<string, unknown>;
  try {
    const body = await req.json();
    action = body.action;
    payload = (body.payload ?? {}) as Record<string, unknown>;
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (typeof action !== 'string' || action === '') {
    return json({ error: 'bad_request' }, 400);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return json({ error: 'misconfigured' }, 500);

  /* WHO IS ASKING. The caller's own JWT, verified by asking Supabase rather
     than by decoding it here — a signature check written by hand is the
     classic place this goes wrong. Same shape as `reveal-track`. */
  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: auth, error: whoError } = await asCaller.auth.getUser();
  if (whoError !== null || auth.user === null) return json({ error: 'unauthenticated' }, 401);

  /**
   * ── THE CHECK THAT MATTERS ──────────────────────────────────────────────
   * The route gate in the browser is cosmetic: anyone signed in can type a
   * path, and anyone at all can call an endpoint. This is the permission.
   *
   * `forbidden` rather than `not_found`, deliberately — unlike
   * `reveal-track`, this endpoint is not an oracle for anything. Its
   * existence is in the repository, and a maintainer who mistypes their
   * sign-in should be told what is wrong.
   */
  const email = auth.user.email;
  if (!isMaintainer(email)) return json({ error: 'forbidden' }, 403);

  const actorId = auth.user.id;
  const actorEmail = (email as string).trim().toLowerCase();

  const server = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  /** Every write goes through one SQL function. See the file header. */
  const write = async (
    entity: string,
    rowId: string,
    patch: Record<string, unknown>,
  ): Promise<Response> => {
    const { data, error } = await server.rpc('admin_write', {
      p_actor_id: actorId,
      p_actor_email: actorEmail,
      p_entity: entity,
      p_row_id: rowId,
      p_patch: patch,
    });
    /* The database's own message is handed back verbatim. It is the one that
       knows which constraint refused, and the one reader is an operator who
       can act on it — "a card code is written once: MC-03 cannot become
       MC-04" is a better sentence than anything this file could compose. */
    if (error !== null) return json({ error: 'refused', detail: error.message }, 409);
    return json({ data }, 200);
  };

  try {
    switch (action) {
      case 'read.all':
        return json({ data: await readAll(server) }, 200);

      case 'card.save': {
        const id = String(payload.id ?? '');
        if (id === '') return json({ error: 'bad_request' }, 400);
        return await write('card', id, payload.patch as Record<string, unknown>);
      }

      case 'track.save': {
        const id = String(payload.id ?? '');
        if (id === '') return json({ error: 'bad_request' }, 400);
        return await write('track', id, payload.patch as Record<string, unknown>);
      }

      case 'artwork.save': {
        const id = String(payload.id ?? '');
        if (id === '') return json({ error: 'bad_request' }, 400);
        return await write('artwork', id, payload.patch as Record<string, unknown>);
      }

      /* A cell's id IS its position — `"2,1"`. `admin_write` splits it apart,
         and `deckRules.cellId()` is what puts it together on the client, so
         there is one spelling on both sides of the wire. */
      case 'cell.set': {
        const id = String(payload.id ?? '');
        if (!/^-?[0-2],-?[0-2]$/.test(id)) return json({ error: 'bad_request' }, 400);
        return await write('cell', id, payload.patch as Record<string, unknown>);
      }

      /* Archive and restore are not separate operations: they are a patch to
         one column. That is why there is no `delete` action anywhere in this
         file — nothing in this schema can be hard-deleted, because a history
         must always have something to return to. */
      case 'archive': {
        const entity = String(payload.entity ?? '');
        const id = String(payload.id ?? '');
        if (entity === '' || id === '') return json({ error: 'bad_request' }, 400);
        const archived = payload.archived !== false;
        return await write(entity, id, {
          archived_at: archived ? new Date().toISOString() : null,
        });
      }

      case 'cards.reorder': {
        const ids = payload.ids;
        if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
          return json({ error: 'bad_request' }, 400);
        }
        const { data, error } = await server.rpc('admin_reorder_cards', {
          p_actor_id: actorId,
          p_actor_email: actorEmail,
          p_ids: ids,
        });
        if (error !== null) return json({ error: 'refused', detail: error.message }, 409);
        return json({ data }, 200);
      }

      /* The log, newest first: one row's history for a detail view, or
         everything for the global one. */
      case 'history.list': {
        let query = server
          .from('content_edits')
          .select('*')
          .order('at', { ascending: false })
          .limit(Number(payload.limit ?? 100));

        if (typeof payload.entity === 'string' && payload.entity !== '') {
          query = query.eq('entity', payload.entity);
        }
        if (typeof payload.rowId === 'string' && payload.rowId !== '') {
          query = query.eq('row_id', payload.rowId);
        }

        const { data, error } = await query;
        if (error !== null) return json({ error: 'lookup_failed' }, 500);
        return json({ data }, 200);
      }

      /* A revert is a new edit. `admin_revert` applies the named edit's
         `before` through the same path a save takes, then appends a row
         naming what it undid — so a revert of a revert needs no special
         case here or there. */
      case 'revert': {
        const editId = String(payload.editId ?? '');
        if (editId === '') return json({ error: 'bad_request' }, 400);
        const { data, error } = await server.rpc('admin_revert', {
          p_actor_id: actorId,
          p_actor_email: actorEmail,
          p_edit_id: editId,
        });
        if (error !== null) return json({ error: 'refused', detail: error.message }, 409);
        return json({ data }, 200);
      }

      /**
       * ── UPLOADING, IN TWO HALVES ──────────────────────────────────────────
       * The browser PUTs the bytes straight to storage through a signed URL
       * this mints. It does NOT post them here: an edge function has a
       * request-body limit a seven-megabyte master would sit against, and
       * proxying a file through a server that does nothing to it is a cost
       * with no buyer.
       *
       * `storage.objects` therefore still has no insert policy for
       * `authenticated` — `20260921160000`'s "uploading is an operator act
       * done with the service role" stays literally true. What changed is
       * that the act now goes through a server that checks WHICH operator.
       */
      case 'upload.sign': {
        const kind = String(payload.kind ?? '');
        const id = String(payload.id ?? '');
        const filename = String(payload.filename ?? 'file.bin');
        if (kind !== 'track' && kind !== 'artwork') return json({ error: 'bad_request' }, 400);
        if (id === '') return json({ error: 'bad_request' }, 400);

        const bucket = BUCKETS[kind];
        const key = mintKey(id, filename);
        const { data, error } = await server.storage.from(bucket).createSignedUploadUrl(key);
        if (error !== null) return json({ error: 'sign_failed', detail: error.message }, 500);
        return json({ data: { ...data, key, bucket } }, 200);
      }

      /**
       * The row only learns about the file once the file is actually there.
       *
       * A PUT that failed halfway would otherwise leave `src` pointing at
       * nothing — which is indistinguishable, from the app's side, from the
       * null that means "this piece has no recording" and is the one state
       * `20260921160000` went out of its way to make honest.
       *
       * The DURATION comes from the client, measured by the platform decoder
       * (`audioMeta.ts`), and is clamped here. MAINTENANCE-UI.md §6.1 had the
       * server measure it; doing that would mean a third copy of MP3 frame
       * parsing in a third runtime, and a hand-rolled parser is worse at VBR
       * than the browser's own decoder. The number is recorded in the history
       * either way, so a wrong one is visible and revertable.
       */
      case 'upload.finish': {
        const kind = String(payload.kind ?? '');
        const id = String(payload.id ?? '');
        const key = String(payload.key ?? '');
        if (kind !== 'track' && kind !== 'artwork') return json({ error: 'bad_request' }, 400);
        if (id === '' || key === '') return json({ error: 'bad_request' }, 400);

        const bucket = BUCKETS[kind];
        const { data: listed, error: listError } = await server.storage
          .from(bucket)
          .list('', { search: key });
        if (listError !== null) return json({ error: 'lookup_failed' }, 500);
        if (!(listed ?? []).some((object: { name: string }) => object.name === key)) {
          return json({ error: 'no_such_object', detail: key }, 409);
        }

        /* The hash comes from the browser because the browser is the only
           thing that held the bytes — see `hashFile`. It is not a security
           claim and does not need to be: a wrong one costs a duplicate, and
           the unique index behind the column is what refuses a real one. */
        const contentHash = typeof payload.contentHash === 'string' && payload.contentHash !== ''
          ? payload.contentHash
          : null;

        if (kind === 'artwork') {
          return await write('artwork', id, { src: key, content_hash: contentHash });
        }

        const seconds = Number(payload.durationSeconds);
        if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 7200) {
          return json({ error: 'bad_duration', detail: String(payload.durationSeconds) }, 400);
        }
        return await write('track', id, {
          src: key,
          duration_seconds: Math.round(seconds),
          content_hash: contentHash,
        });
      }

      default:
        return json({ error: 'unknown_action', detail: action }, 400);
    }
  } catch (thrown: unknown) {
    /* Anything that got past the switch is ours, not the caller's. The
       message goes back because the only caller is an operator who can act
       on it, and nothing here reads a row that is not already theirs to see. */
    return json({
      error: 'failed',
      detail: thrown instanceof Error ? thrown.message : String(thrown),
    }, 500);
  }
});
