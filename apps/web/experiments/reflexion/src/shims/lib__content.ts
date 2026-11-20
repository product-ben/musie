/**
 * `src/lib/content.ts`, served from the baked content (`../data/content.json`)
 * instead of the content tables, which are closed to `anon`. Same signatures,
 * same shapes — the JSON IS what the real functions returned.
 */
import type { Locale } from '../../../../src/i18n';
import type { Card, Exercise, ListenAudio, Track } from '../../../../src/lib/content';
import * as store from '../data/store';

export * from '../../../../src/lib/content';

export async function getExercise(id: string, locale: Locale): Promise<Exercise | null> {
  return store.tick(store.exercise(id, locale));
}

export async function getExercises(locale: Locale): Promise<Exercise[]> {
  const ids = ['harp', 'body-scan-soundwalk', store.FREE_REIN];
  return store.tick(ids.flatMap((id) => store.exercise(id, locale) ?? []));
}

/** The deck is ONE card here: MC-01 with the configured picture. */
export async function getCards(locale: Locale): Promise<Card[]> {
  return store.tick([store.theCard(locale)]);
}

export async function getCard(id: string, locale: Locale): Promise<Card | null> {
  const card = store.theCard(locale);
  return store.tick(card.id === id ? card : null);
}

export async function getCardByCode(code: string, locale: Locale): Promise<Card | null> {
  const card = store.theCard(locale);
  return store.tick(card.code === code ? card : null);
}

/** The piece stored on the session row (`saveCard` below put it there). */
export async function getTrack(trackId: string | null): Promise<Track | null> {
  return store.tick(store.trackById(trackId));
}

export async function getTrackFor(exerciseId: string, cardId: string | null): Promise<Track | null> {
  return store.tick(store.trackFor(exerciseId, cardId));
}

export async function getListenAudio(
  exerciseId: string,
  locale: Locale,
  posture: string,
  ending: string,
): Promise<ListenAudio | null> {
  return store.tick(store.listenAudio(exerciseId, locale, posture, ending));
}
