/**
 * The one run this page shows: Freie Bahn, digital, with MC-01 dealt and
 * „Aura“ playing — the same run Reflexion's `freie-bahn` link walks, so the
 * focus sheet carries the card picture, the clock and the transport.
 *
 * The exercise copy is the German row as the local stack returned it for
 * Reflexion (`experiments/reflexion/src/data/content.json`), trimmed to what
 * the listen step reads. Provisional content, like all content.
 *
 * THE AUDIO IS REFLEXION'S FILE. `/experiments/reflexion/media/aura.mp3` is
 * served from `apps/web/public`; if that folder is ever deleted, this page
 * does not break — the mixer refuses the file and the listen step runs its
 * simulated clock, which is the app's own path for a card with no recording.
 */
import type { Card, Exercise, ListenAudio } from '../../../src/lib/content';
import type { RevealedTrack } from '../../../src/lib/reveal';

export const SESSION_ID = 'focus-sheet-experiment';

export const AUDIO_SRC = '/experiments/reflexion/media/aura.mp3';

/** What `reveal-track` names once the step is reached. */
export const TRACK: RevealedTrack = {
  id: 'trk-10',
  title: 'Aura',
  artist: 'Martin Landh',
  licenceRef: null,
};

/** 151.32 s by `afinfo`. */
export const AUDIO: ListenAudio = {
  kind: 'piece',
  trackId: TRACK.id,
  src: AUDIO_SRC,
  durationSeconds: 151,
};

/** The app's starting length for a card exercise (2:00, 2026-11-26). */
export const LENGTH_SECONDS = 120;

export const CARD: Card = {
  id: 'mc-01',
  code: 'MC-01',
  imageUrl: '/assets/web/cards/mc-01.webp',
  sort: 1,
  imageAlt: 'Feine blaue Linien fächern über die Fläche, am rechten Rand steigt eine große dunkle Scheibe in warmes Licht.',
};

export const EXERCISE: Exercise = {
  id: 'free-rein',
  kind: 'card_based',
  timeframeMin: 2,
  timeframeMax: 5,
  cardsDealt: 1,
  needsSound: true,
  asksPosture: false,
  imageUrl: '/assets/web/exercises/free-rein.webp',
  implemented: true,
  sort: 2,
  listenGateSeconds: 90,
  name: 'Freie Bahn',
  description: 'Eine zufällige Bildkarte mit passender Musik und eine Höranleitung von mir helfen dir beim Entspannen und Üben von Achtsamkeit.',
  needs: 'Mindfulness-Karten-Set',
  introMd: '## Lass uns mit Freier Bahn beginnen',
  scanMd: '## Wähle eine Karte aus',
  /* Ben, 2026-11-27, in place of „Nimm die Klänge wahr und sieh dir dabei die
     Karte intensiv an“. The old body („Lass dich von ihnen mitnehmen …“) went
     with it: its „ihnen“ were the Klänge of the old headline. */
  listenMd: '## Achte beim Hören darauf, welches Bild vor deinem inneren Auge entsteht. Wenn du magst, interagiere dabei mit dem Bild.',
  reflectMd: '## Spüre und reflektiere',
  reflectPlaceholder: null,
  imageAlt: 'Ein Stapel Mindfulness-Karten, davor steht eine einzelne Karte aufrecht, umgeben von ringförmigen Wellen',
  goalIds: ['mindfulness', 'wake-up'],
  goalSort: {},
  instrument: null,
};
