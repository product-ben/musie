/**
 * The types for `music.mjs`, hand-written because that file is plain ESM.
 *
 * `allowJs` is false (tsconfig.json), so a `.mjs` import from TypeScript needs
 * a declaration or it is an error rather than an `any`. Hand-written
 * declarations rot; this one is held true by `src/lib/music.test.ts` and
 * `src/lib/music.db.test.ts`, which between them exercise every export.
 *
 * `deck.d.mts` next door is the same arrangement for the deck.
 */

export type Locale = 'de' | 'en';
export type Posture = 'sitting' | 'lying';
export type Ending = 'day' | 'sleep';

/** One licensed recording: the credit, and the music as released. */
export interface MusicPiece {
  /** `tracks.id` — `trk-01`. Opaque on purpose; never a title slug. */
  id: string;
  /** `tracks.title`. An ANSWER — withheld from the client by column grant. */
  title: string;
  /** `tracks.artist`. An ANSWER, as above. */
  artist: string;
  /** `tracks.licence_ref`, or null where there is nothing to cite. */
  licenceRef: string | null;
  /** The local filename `music:upload` reads `file` from. Never a key. */
  fileSource?: string;
  /** `tracks.src` — an object key, or null where there is no recording. */
  file: string | null;
  /** `tracks.duration_seconds`. Measured from the file by `music:upload`. */
  durationSeconds: number;
}

/** One produced recording of one listening exercise. */
export interface MusicCut {
  /** `exercise_cuts.exercise_id`. */
  exercise: string;
  locale: Locale;
  /** Omitted means this recording serves ANY posture. */
  posture?: Posture | null;
  /** Omitted means this recording serves ANY ending. */
  ending?: Ending | null;
  /** `mixed_src` — the exercise as mixed. Required: it is the recording. */
  mixed?: string;
  /** `voice_src` — the same recording with its music removed. The switch's target. */
  voice?: string | null;
  /** `track_id` — the music credited inside the mix, once we hold its file. */
  piece?: string | null;
  /** Both files, which are the same length by construction. */
  durationSeconds: number;
  /** The local filename `music:upload` reads `mixed` from. Never a key. */
  mixedSource?: string;
  /** The local filename `music:upload` reads `voice` from. */
  voiceSource?: string;
}

export interface MusicLibrary {
  pieces: MusicPiece[];
  cuts: MusicCut[];
}

/** `public.tracks`, as the generator and the database test both see it. */
export interface TrackRow {
  id: string;
  src: string | null;
  duration_seconds: number;
  title: string;
  artist: string;
  licence_ref: string | null;
}

/** `public.exercise_cuts`, likewise. */
export interface CutRow {
  id: string;
  exercise_id: string;
  locale: string;
  /** Null means this recording serves any posture. */
  posture: string | null;
  /** Null means this recording serves any ending. */
  ending: string | null;
  mixed_src: string;
  voice_src: string | null;
  duration_seconds: number;
  track_id: string | null;
}

export interface MusicRows {
  tracks: TrackRow[];
  exercise_cuts: CutRow[];
}

export const MUSIC_PATH: string;
export const MUSIC_IN_GIT: string;
export const LOCALES: Locale[];
export const POSTURES: Posture[];
export const ENDINGS: Ending[];

export function readMusic(path?: string): Promise<MusicLibrary>;

/** `cut-sound-journey-de-lying-sleep` — the four answers, spelled once. */
export function cutId(
  cut: Pick<MusicCut, 'exercise' | 'locale' | 'posture' | 'ending'>,
): string;

export function orderedPieces(music: MusicLibrary): MusicPiece[];
export function orderedCuts(music: MusicLibrary): MusicCut[];

/** Problems stop a migration; warnings are legal states that may be unfinished. */
export function checkMusic(music: unknown): { problems: string[]; warnings: string[] };

/** Throws on any problem, returns the library otherwise. */
export function assertMusic(music: MusicLibrary): MusicLibrary;

export function rows(music: MusicLibrary): MusicRows;
