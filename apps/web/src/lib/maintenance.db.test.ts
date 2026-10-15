/**
 * The maintenance schema, against a real database.
 *
 * ── WHAT THIS IS FOR, AND WHAT `deckRules.test.ts` IS FOR ─────────────────
 * `deckRules.test.ts` asserts what the FORM refuses, which is a courtesy:
 * the operator gets a sentence instead of an error code. This asserts what
 * the DATABASE refuses, which is the actual rule. Where the two disagree the
 * database is right, so these are the ones that matter.
 *
 * ── AND THE THREE PROPERTIES THAT CANNOT BE CHECKED ANY OTHER WAY ─────────
 *   1. THE ACCESS. Four new tables with RLS and no policy for
 *      `authenticated`, which is only true if the revoke actually ran — the
 *      local stack grants every new table to `anon` and `authenticated` by
 *      default, so a missing revoke looks exactly like a working one until
 *      somebody reads a row. CLAUDE.md rule 2.
 *   2. THE PROJECTION. `exercise_tracks` is derived now, and "derived"
 *      is a claim about a function nobody has watched run.
 *   3. THE REVERT. A revert that appends rather than erases, and a revert of
 *      a revert that returns to where it started, is the whole of
 *      MAINTENANCE-UI.md §7 — described in prose everywhere and true only
 *      here.
 *
 * ── THE FIXTURES CLEAN UP AFTER THEMSELVES ────────────────────────────────
 * MC-98, trk-98, art-98 and whichever cell no card stands on — found at
 * startup, never assumed; see below.
 * Nothing touches mc-01…mc-09 or trk-01…trk-09: this suite can be pointed at
 * HOSTED (CLAUDE.md rule 4), and a test that moved a real card's music would
 * change what a beta tester hears. `20261014100200` is the migration that
 * grants the delete this needs, and says why withholding it was wrong.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { INSUFFICIENT_PRIVILEGE, anonClient, serviceClient } from './db.support';
import { CELLS, cellId } from './deckRules';

/** Top of the code space: the deck grows from MC-01 up, so these are last. */
const CARD = 'mc-98';
const CARD_CODE = 'MC-98';
const TRACK = 'trk-98';
const ARTWORK = 'art-98';

/**
 * A cell no card stands on — FOUND, not assumed.
 *
 * This was `{ valence: 0, arousal: 2 }`, hard-coded, on the reasoning that the
 * nine imported cards are placed elsewhere. That reasoning is true of the deck
 * this branch imports and of nothing else: the local stack is one Postgres
 * behind every worktree (CLAUDE.md rule 9), so the deck in it is whichever
 * branch last ran `supabase db reset`, and a card standing on the fixture's
 * cell makes four tests fail for a reason that has nothing to do with what
 * they assert — `cards_one_per_cell` refusing the fixture, two statements
 * before the assertion.
 *
 * So it is looked up once, before anything runs. 25 cells against at most a
 * handful of cards means there is always one; `beforeAll` throws if there is
 * not, which would be a real finding rather than a flake.
 */
let CELL = { valence: 0, arousal: 2 };
let CELL_ID = '0,2';

const ACTOR = 'db-test@musie.invalid';

/** Every admin write goes through one function; so does every test of one. */
async function write(
  entity: string,
  rowId: string,
  patch: Record<string, unknown>,
): Promise<{ data: unknown; error: { message: string } | null }> {
  return await serviceClient().rpc('admin_write', {
    p_actor_id: null,
    p_actor_email: ACTOR,
    p_entity: entity,
    p_row_id: rowId,
    p_patch: patch,
  });
}

async function editsFor(entity: string, rowId: string): Promise<Record<string, unknown>[]> {
  const { data } = await serviceClient()
    .from('content_edits')
    .select('*')
    .eq('entity', entity)
    .eq('row_id', rowId)
    .order('at', { ascending: true });
  return (data ?? []) as Record<string, unknown>[];
}

beforeAll(async () => {
  const { data, error } = await serviceClient().from('cards').select('valence, arousal');
  if (error !== null) throw new Error(`could not read the deck: ${error.message}`);

  const taken = new Set((data ?? [])
    .filter((card) => card.valence !== null)
    .map((card) => `${card.valence},${card.arousal}`));

  const free = CELLS.find((cell) => !taken.has(cellId(cell)));
  if (free === undefined) {
    throw new Error('every one of the 25 cells holds a card; this suite needs one free');
  }

  CELL = free;
  CELL_ID = cellId(free);
});

async function cleanUp(): Promise<void> {
  const service = serviceClient();
  /* The cell first: it is the only fixture that cannot be deleted — a cell is
     a position — so it is emptied instead, and `on delete restrict` means the
     track and artwork cannot go while it still points at them. */
  await service.from('grid_cells')
    .update({ track_id: null, artwork_id: null })
    .eq('valence', CELL.valence).eq('arousal', CELL.arousal);
  await service.from('cards').delete().eq('id', CARD);
  await service.from('tracks').delete().eq('id', TRACK);
  await service.from('artwork_i18n').delete().eq('artwork_id', ARTWORK);
  await service.from('artworks').delete().eq('id', ARTWORK);
  /**
   * ── ONLY THIS SUITE'S OWN LINES ───────────────────────────────────────
   * Keyed on the ACTOR, not on the row. It used to delete every log line for
   * the fixture rows, and the reorder test below deleted one per live card —
   * which took out a real repair somebody had made to mc-07 through
   * `admin_write` an hour earlier. A suite that erases history it did not
   * write is the opposite of what the log is for, and this one can be
   * pointed at HOSTED (CLAUDE.md rule 4), where those lines are the record of
   * what an operator actually did.
   *
   * `db-test@musie.invalid` is written by nothing else, so this is exact.
   */
  await service.from('content_edits').delete().eq('actor_email', ACTOR);
  /* And the projection, so a half-finished test does not leave a pairing
     behind for the deck tests to find. */
  await service.rpc('project_deck');
}

beforeEach(cleanUp);
afterEach(cleanUp);
/* The fixture cell is shared state on a shared stack: leave it as found. */
afterAll(cleanUp);

/* ═══ ACCESS ════════════════════════════════════════════════════════════════ */

describe('the new tables are invisible to the client', () => {
  /**
   * THE REVOKE IS THE WHOLE TEST. The local stack ships `alter default
   * privileges in schema public grant all on tables to postgres, anon,
   * authenticated, service_role`, so each of these arrived fully granted and
   * RLS-with-no-policy would have been the only thing standing between a
   * signed-in beta tester and the entire edit history. Rule 2.
   */
  it.each(['grid_cells', 'artworks', 'artwork_i18n', 'content_edits'])(
    'refuses %s to authenticated at the privilege check', async (table) => {
      const { error } = await anonClient().from(table).select('*').limit(1);
      expect(error?.code, `${table} is readable by the client`).toBe(INSUFFICIENT_PRIVILEGE);
    },
  );

  /**
   * Postgres grants EXECUTE on a new function to PUBLIC, so without the
   * explicit revoke any signed-in user could call this over `/rest/v1/rpc`.
   * The table grants would still refuse them, but a privilege that is only
   * indirectly withheld is one refactor from being granted.
   */
  it.each(['admin_write', 'admin_revert', 'admin_reorder_cards', 'project_deck'])(
    'refuses to let the client execute %s', async (fn) => {
      const { error } = await anonClient().rpc(fn, {});
      expect(error, `${fn} is callable by the client`).not.toBeNull();
    },
  );
});

/* ═══ THE GRID ══════════════════════════════════════════════════════════════ */

describe('the grid', () => {
  it('is twenty-five positions, created once', async () => {
    const { data } = await serviceClient().from('grid_cells').select('valence, arousal');
    expect(data).toHaveLength(25);
  });

  /* ONE PER CELL, AND NO LONGER NINE. The count was `toHaveLength(9)` with a
     matching `toBe(9)` below it until 2026-10-15, when it failed against
     hosted because MC-10 had been added through this very screen — a test
     asserting that the maintenance UI goes unused.
   *
   * The assertion that was always meant is the second one: no two cards share
   * a cell. `cells.size === data.length` says exactly that and says it for any
   * size of deck, which the pair of nines could not. The grid's own size is
   * still fixed and still asserted, one test above. */
  it('holds each placed card in a cell of its own', async () => {
    const { data } = await serviceClient()
      .from('cards')
      .select('id, valence, arousal')
      .not('valence', 'is', null);
    expect((data ?? []).length, 'no card is placed at all').toBeGreaterThan(0);
    const cells = new Set((data ?? []).map((c) => `${c.valence},${c.arousal}`));
    expect(cells.size, 'two cards share a cell').toBe((data ?? []).length);
  });

  it('refuses a second card on an occupied cell', async () => {
    const existing = await serviceClient()
      .from('cards').select('valence, arousal').eq('id', 'mc-01').single();

    await write('card', CARD, { code: CARD_CODE });
    const { error } = await write('card', CARD, {
      valence: existing.data?.valence, arousal: existing.data?.arousal,
    });
    expect(error?.message).toMatch(/cards_one_per_cell|duplicate key/);
  });

  it('refuses a cell off the grid', async () => {
    const { error } = await write('cell', '3,0', { track_id: null });
    expect(error?.message).toMatch(/no cell at/);
  });
});

/* ═══ CODES ═════════════════════════════════════════════════════════════════ */

describe('a card code', () => {
  it.each(['MC-00', 'MC-1', 'MC-100', 'ZZ-99', 'mc-98'])(
    'refuses %s', async (code) => {
      const { error } = await serviceClient()
        .from('cards').insert({ id: code.toLowerCase(), code, sort: 98 });
      expect(error, `${code} was accepted`).not.toBeNull();
    },
  );

  it('is written once and can never be changed', async () => {
    await write('card', CARD, { code: CARD_CODE });

    const { error } = await serviceClient()
      .from('cards').update({ code: 'MC-97' }).eq('id', CARD);

    expect(error?.message).toMatch(/written once/);
  });

  it('keeps its id as the code lower-cased', async () => {
    const { error } = await serviceClient()
      .from('cards').insert({ id: 'something-else', code: CARD_CODE, sort: 98 });
    expect(error, 'an id that is not the code was accepted').not.toBeNull();
  });
});

/* ═══ WHAT A PIECE OF MUSIC ACCEPTS ═════════════════════════════════════════ */

describe('a piece of music', () => {
  beforeEach(async () => {
    await write('track', TRACK, { title: 'Test', artist: 'Test', licence_type: 'none_yet' });
  });

  it('takes the six new fields', async () => {
    await write('track', TRACK, {
      album: 'Petals & Dust', release_year: 2021, tempo_bpm: 74,
      mood_note: 'warm, unhurried', licence_type: 'subscription', catalogue_ref: 'ES_1234567',
    });

    const { data } = await serviceClient().from('tracks').select('*').eq('id', TRACK).single();
    expect(data).toMatchObject({
      album: 'Petals & Dust', release_year: 2021, tempo_bpm: 74,
      licence_type: 'subscription', catalogue_ref: 'ES_1234567',
    });
  });

  it.each([
    ['release_year', 1800],
    ['release_year', 2200],
    ['tempo_bpm', 0],
    ['tempo_bpm', 401],
  ])('refuses %s of %s', async (column, value) => {
    const { error } = await write('track', TRACK, { [column]: value });
    expect(error, `${column} ${value} was accepted`).not.toBeNull();
  });

  it('refuses a licence type it does not know', async () => {
    const { error } = await write('track', TRACK, { licence_type: 'cleared' });
    expect(error).not.toBeNull();
  });

  /* The credit is withheld from the client by COLUMN grant, which is the
     whole reason the maintenance UI needs a server at all. Worth asserting
     here because a later migration adding a table-wide grant would undo it
     silently. */
  it('still withholds its credit from the client', async () => {
    const { error } = await anonClient().from('tracks').select('title').limit(1);
    expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
  });
});

/* ═══ THE PROJECTION ════════════════════════════════════════════════════════ */

describe('exercise_tracks is derived from the grid', () => {
  beforeEach(async () => {
    await write('track', TRACK, { title: 'Test', artist: 'Test', src: `${TRACK}.mp3` });
    await write('card', CARD, { code: CARD_CODE, valence: CELL.valence, arousal: CELL.arousal });
  });

  const pairings = async (): Promise<Record<string, unknown>[]> => {
    const { data } = await serviceClient()
      .from('exercise_tracks').select('exercise_id, track_id').eq('card_id', CARD);
    return (data ?? []) as Record<string, unknown>[];
  };

  it('pairs a placed card with its cell\'s track, in both card exercises', async () => {
    await write('cell', CELL_ID, { track_id: TRACK });

    const rows = await pairings();
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.exercise_id)))
      .toEqual(new Set(['mindfulness-cards', 'free-rein']));
    expect(rows.every((r) => r.track_id === TRACK)).toBe(true);
  });

  it('removes the pairing when the cell goes quiet', async () => {
    await write('cell', CELL_ID, { track_id: TRACK });
    expect(await pairings()).toHaveLength(2);

    await write('cell', CELL_ID, { track_id: null });
    expect(await pairings()).toHaveLength(0);
  });

  it('removes the pairing when the card leaves the grid', async () => {
    await write('cell', CELL_ID, { track_id: TRACK });
    await write('card', CARD, { valence: null, arousal: null });
    expect(await pairings()).toHaveLength(0);
  });

  /* Archiving names its cost on screen — *this leaves MC-02, MC-05 and MC-08
     silent* — and this is the half that makes the sentence true. */
  it('removes the pairing when the track is retired', async () => {
    await write('cell', CELL_ID, { track_id: TRACK });
    await write('track', TRACK, { archived_at: new Date().toISOString() });
    expect(await pairings()).toHaveLength(0);
  });

  /**
   * `card_id is null` rows are a cardless exercise's OWN track — Atempartitur,
   * Bodyscan — which is not the deck's. The projection deletes by card, and a
   * missing `card_id is not null` would take all of them with it.
   */
  it('leaves a cardless exercise\'s own track alone', async () => {
    const before = await serviceClient()
      .from('exercise_tracks').select('exercise_id').is('card_id', null);

    await write('cell', CELL_ID, { track_id: TRACK });

    const after = await serviceClient()
      .from('exercise_tracks').select('exercise_id').is('card_id', null);
    expect(after.data).toEqual(before.data);
  });

  it('writes the cell\'s artwork onto the card', async () => {
    await write('artwork', ARTWORK, { src: 'art-98-ffffffff.webp' });
    await write('cell', CELL_ID, { artwork_id: ARTWORK });

    const { data } = await serviceClient()
      .from('cards').select('image_url').eq('id', CARD).single();
    expect(data?.image_url).toBe('art-98-ffffffff.webp');
  });
});

/* ═══ THE HISTORY, AND THE WAY BACK ═════════════════════════════════════════ */

describe('every write is in the log', () => {
  it('logs exactly one row, naming the actor and the result', async () => {
    await write('card', CARD, { code: CARD_CODE });

    const edits = await editsFor('card', CARD);
    expect(edits).toHaveLength(1);
    expect(edits[0]).toMatchObject({ action: 'create', actor_email: ACTOR, before: null });
    expect((edits[0].after as Record<string, unknown>).code).toBe(CARD_CODE);
  });

  it('calls the second write an update, and carries the before', async () => {
    await write('card', CARD, { code: CARD_CODE });
    await write('card', CARD, { valence: CELL.valence, arousal: CELL.arousal });

    const edits = await editsFor('card', CARD);
    expect(edits).toHaveLength(2);
    expect(edits[1].action).toBe('update');
    expect((edits[1].before as Record<string, unknown>).valence).toBeNull();
    expect((edits[1].after as Record<string, unknown>).valence).toBe(CELL.valence);
  });

  /* Archive and restore are a patch to one column, so the action has to be
     DERIVED rather than asked for — otherwise the log would read `update` for
     the two things an operator most wants to find in it. */
  it('calls an archive an archive, and a restore a restore', async () => {
    await write('track', TRACK, { title: 'Test', artist: 'Test' });
    await write('track', TRACK, { archived_at: new Date().toISOString() });
    await write('track', TRACK, { archived_at: null });

    const actions = (await editsFor('track', TRACK)).map((edit) => edit.action);
    expect(actions).toEqual(['create', 'archive', 'restore']);
  });
});

describe('a revert', () => {
  const revert = async (editId: string) => await serviceClient().rpc('admin_revert', {
    p_actor_id: null, p_actor_email: ACTOR, p_edit_id: editId,
  });

  it('puts the value back, and appends rather than erases', async () => {
    await write('track', TRACK, { title: 'First', artist: 'Test' });
    await write('track', TRACK, { title: 'Second' });

    const edits = await editsFor('track', TRACK);
    expect(edits).toHaveLength(2);

    const { error } = await revert(edits[1].id as string);
    expect(error).toBeNull();

    const after = await serviceClient().from('tracks').select('title').eq('id', TRACK).single();
    expect(after.data?.title).toBe('First');

    /* THREE rows, not one. The log is append-only: the edit that was undone
       is still there, and the undoing is its own line. */
    const now = await editsFor('track', TRACK);
    expect(now).toHaveLength(3);
    expect(now[2]).toMatchObject({ action: 'revert', reverts: edits[1].id });
  });

  /**
   * The property that proves the shape is right. `admin_revert` applies a
   * `before` through the same path an ordinary save takes, so reverting a
   * revert needs no special case anywhere — and if it did, this is where the
   * absence of one would show.
   */
  it('can itself be reverted, back to where it started', async () => {
    await write('track', TRACK, { title: 'First', artist: 'Test' });
    await write('track', TRACK, { title: 'Second' });

    const edits = await editsFor('track', TRACK);
    await revert(edits[1].id as string);

    const afterRevert = await editsFor('track', TRACK);
    await revert(afterRevert[2].id as string);

    const final = await serviceClient().from('tracks').select('title').eq('id', TRACK).single();
    expect(final.data?.title).toBe('Second');
    expect(await editsFor('track', TRACK)).toHaveLength(4);
  });

  /* Nothing is ever hard-deleted, so there is nothing to revert a create TO.
     Retiring the row is the honest inverse: the id stays taken and every
     diary entry that referred to it keeps it.

     SHOWN ON A TRACK rather than a card, because `20261014150000` refuses to
     archive a card until the deck query can hide one — see the describe
     below, which asserts that refusal rather than working around it. */
  it('retires a row rather than deleting it, when it undoes a create', async () => {
    await write('track', TRACK, { title: 'T', artist: 'A' });
    const edits = await editsFor('track', TRACK);

    await revert(edits[0].id as string);

    const { data } = await serviceClient()
      .from('tracks').select('archived_at').eq('id', TRACK).single();
    expect(data?.archived_at).not.toBeNull();
  });

  it('refuses an edit that does not exist', async () => {
    const { error } = await revert('00000000-0000-0000-0000-000000000000');
    expect(error).not.toBeNull();
  });
});

/* ═══ THE ORDER ═════════════════════════════════════════════════════════════ */

describe('reordering the deck', () => {
  /**
   * `cards.sort` is `unique` and NOT deferrable, so Postgres checks it as
   * each ROW is written: two cards swapping places collide halfway through an
   * update that ends perfectly valid. That is the trap `20260923150000` hit
   * on `exercises.sort`, and the reason this has a function of its own.
   */
  it('swaps two cards without colliding on sort', async () => {
    const service = serviceClient();
    const before = await service.from('cards').select('id, sort')
      .is('archived_at', null).order('sort');
    const ids = (before.data ?? []).map((card) => card.id as string);
    expect(ids.length).toBeGreaterThan(1);

    const swapped = [...ids];
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];

    const { error } = await service.rpc('admin_reorder_cards', {
      p_actor_id: null, p_actor_email: ACTOR, p_ids: swapped,
    });
    expect(error, 'the swap collided').toBeNull();

    const after = await service.from('cards').select('id, sort')
      .is('archived_at', null).order('sort');
    expect((after.data ?? []).map((card) => card.id)).toEqual(swapped);
    expect((after.data ?? []).map((card) => card.sort)).toEqual(
      swapped.map((_, index) => index + 1),
    );

    /* Put the deck back: this suite can be pointed at hosted. The log lines
       are cleared by `cleanUp`, which keys on this suite's own actor and so
       cannot take a real operator's history with it. */
    await service.rpc('admin_reorder_cards', {
      p_actor_id: null, p_actor_email: ACTOR, p_ids: ids,
    });
  });
});

/* ═══ THE ONE THING THAT IS SWITCHED OFF ════════════════════════════════════ */

/**
 * Retiring a CARD is refused while `CARD_SELECT` in `lib/content.ts` has no
 * `archived_at` filter — a retired card would leave the maintenance grid and
 * stay in the deck the product deals, which is worse than not offering it.
 *
 * These are the tests that have to be DELETED, along with the trigger, in the
 * change that adds the filter. They are here so that removing the guard is a
 * decision somebody makes rather than something that rots.
 */
describe('a card cannot be retired yet', () => {
  it('refuses the archive, and the message says what to do instead', async () => {
    await write('card', CARD, { code: CARD_CODE });

    const { error } = await write('card', CARD, {
      archived_at: new Date().toISOString(),
    });

    expect(error?.message).toMatch(/cannot be retired yet/);
    expect(error?.message).toMatch(/content\.ts/);
  });

  /* The guard must not trap a row in the state it exists to prevent. */
  it('still allows a card to be brought back', async () => {
    await write('card', CARD, { code: CARD_CODE });
    const { error } = await write('card', CARD, { archived_at: null });
    expect(error).toBeNull();
  });

  /* An undo of a card's creation archives it, so it meets the same guard.
     Worth asserting rather than discovering: while this is on, a card made by
     mistake cannot be undone and simply stays unplaced. */
  it('refuses to undo the creation of a card, which is the cost of the guard', async () => {
    await write('card', CARD, { code: CARD_CODE });
    const edits = await editsFor('card', CARD);

    const { error } = await serviceClient().rpc('admin_revert', {
      p_actor_id: null, p_actor_email: ACTOR, p_edit_id: edits[0].id as string,
    });

    expect(error?.message).toMatch(/cannot be retired yet/);
  });

  /* The asymmetry is the whole point: the projection CAN hide these two. */
  it.each(['track', 'artwork'])('still retires a %s', async (entity) => {
    const id = entity === 'track' ? TRACK : ARTWORK;
    await write(entity, id, entity === 'track'
      ? { title: 'T', artist: 'A' }
      : { src: 'art-98-ffffffff.webp' });

    const { error } = await write(entity, id, {
      archived_at: new Date().toISOString(),
    });

    expect(error, `${entity} should still be retirable`).toBeNull();
  });
});
