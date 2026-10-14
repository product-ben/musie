/**
 * THE DATABASE IS THE DECK FILE. This is the test that makes that true.
 *
 * `supabase/content/deck.json` is only a source of truth if something fails
 * when it stops being one, and there are four ordinary ways for it to stop:
 *
 *   · the deck is edited and `pnpm deck:migration` is never run;
 *   · a generated migration is written and never applied (`supabase db reset`);
 *   · it is applied locally and never pushed (`supabase db push`) — this suite
 *     can be aimed at the hosted project, which is how that one gets caught;
 *   · somebody edits a row in Studio, where nothing stacks and nothing is
 *     recorded.
 *
 * All four look identical from inside the app, and all four are red here.
 *
 * The service role because this reads content to COMPARE it, not to prove who
 * may see it — `db.security.db.test.ts` owns that question. It reads every
 * column, including ones the client's column grant withholds, which is exactly
 * what makes it able to say the row is right.
 */
import { describe, expect, it } from 'vitest';
import { readDeck, rows } from '../../scripts/deck.mjs';
import { serviceClient } from './db.support';

const expected = rows(await readDeck());
const service = serviceClient();

/** Ordered the same way on both sides, so a mismatch reads as a diff rather
 *  than as nine rows in a different sequence. */
const by = (...keys: string[]) =>
  (a: Record<string, unknown>, b: Record<string, unknown>) =>
    keys.map((key) => String(a[key]).localeCompare(String(b[key]))).find((n) => n !== 0) ?? 0;

describe('the database carries the deck in supabase/content/deck.json', () => {
  it('has the same cards, with the same codes, artwork and order', async () => {
    const { data, error } = await service
      .from('cards')
      .select('id, code, image_url, sort')
      .order('sort');

    expect(error).toBeNull();
    expect(data).toEqual(expected.cards);
  });

  it('has the same feeling in both locales, and the same alt text', async () => {
    const { data, error } = await service
      .from('card_i18n')
      .select('card_id, locale, feeling, image_alt');

    expect(error).toBeNull();
    expect((data ?? []).sort(by('card_id', 'locale'))).toEqual(
      [...expected.card_i18n].sort(by('card_id', 'locale')),
    );
  });

  it('pairs each card with the same track in each exercise', async () => {
    /* `card_id is not null` only. A null card_id is a cardless exercise's own
       track, which is not the deck's and which the generator is careful never
       to delete — so it is not this test's to demand either. */
    const { data, error } = await service
      .from('exercise_tracks')
      .select('exercise_id, card_id, track_id')
      .not('card_id', 'is', null);

    expect(error).toBeNull();
    expect((data ?? []).sort(by('exercise_id', 'card_id'))).toEqual(
      [...expected.exercise_tracks].sort(by('exercise_id', 'card_id')),
    );
  });

  it('has a real recording behind every pairing', async () => {
    /* The foreign key already guarantees the track ROW exists. This is the
       other half: whether the row has a FILE.

       ── IT FAILS NOW, WHERE IT USED TO LOG — Ben, 2026-10-14 ──────────────
       This was a `console.info` and a green run, and the comment said "five of
       nine are silent by design". Both were true while a PERSON drew the
       cards: a silent card was the deck's state of the world, and the listen
       step runs a simulated clock for it rather than breaking.

       Two things changed. `20261002153212` remapped mc-06…mc-09 off the four
       tracks whose files never landed and onto the four that did, so nothing
       is silent today — and digital mode means **Musie deals the cards**
       (`DIGITAL-CARDS.md` section 5.2). A pairing with no file is now our
       choice rather than the deck's luck, and it is dealt to somebody who had
       no say in which cards they were offered.

       THE COST IS NAMED RATHER THAN DISCOVERED: a tenth card added before its
       recording lands turns this red. That is the point. Either point it at a
       track that plays, as the remap did, or land the recording — a card the
       app hands over should make a sound. */
    const { data, error } = await service.from('tracks').select('id, src');
    expect(error).toBeNull();

    const withFile = new Set((data ?? []).filter((track) => track.src !== null).map((t) => t.id));
    const silent = expected.exercise_tracks.filter((pair) => !withFile.has(pair.track_id));
    expect(
      silent.map((pair) => `${pair.card_id ?? 'no card'} plays ${pair.track_id}`),
      'a dealt card with no recording behind it',
    ).toEqual([]);
  });
});
