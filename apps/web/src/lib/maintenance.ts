/**
 * The maintenance screen's only way to reach the database.
 *
 * Every call here lands on the `content-admin` Edge Function, which holds the
 * service role. Nothing in this file talks to PostgREST, and that is not a
 * style choice: the screen has to show `tracks.title`, which is not granted to
 * `authenticated` at all, and no policy can widen a column grant. The
 * function's header has the whole argument.
 *
 * ── ERRORS THROW HERE, UNLIKE `reveal.ts` ─────────────────────────────────
 * The reveal degrades to a line of text because it is the least important
 * thing on a screen somebody is standing on at the end of an exercise. This
 * is the opposite: every call is something an operator just pressed, and a
 * save that silently did nothing is the worst outcome available. So a failure
 * is thrown with the database's own message — `refused` carries the
 * constraint that said no, and that sentence is better than anything this
 * file could compose.
 */
import { asUploadableAudio } from './mediaFile';
import { getSupabase } from './supabase';

/* ═══ WHAT COMES BACK ═══════════════════════════════════════════════════════ */

/** A card. `valence`/`arousal` are null for a card that is not on the grid. */
export interface MaintenanceCard {
  id: string;
  code: string;
  sort: number;
  image_url: string | null;
  valence: number | null;
  arousal: number | null;
  archived_at: string | null;
}

/**
 * A piece of music, every column of it — the credit included.
 *
 * This is the shape the rest of the app is deliberately not allowed to see:
 * `title`, `artist`, `licence_ref` and `catalogue_ref` are withheld from
 * `authenticated` by column grant, and `reveal-track` is the only other door
 * any of them come through.
 */
export interface MaintenanceTrack {
  id: string;
  src: string | null;
  duration_seconds: number;
  title: string;
  artist: string;
  album: string | null;
  release_year: number | null;
  tempo_bpm: number | null;
  mood_note: string | null;
  licence_type: string | null;
  catalogue_ref: string | null;
  licence_ref: string | null;
  /** SHA-256 of the uploaded file. Null for anything the import created. */
  content_hash: string | null;
  archived_at: string | null;
}

export interface MaintenanceArtwork {
  id: string;
  src: string;
  created_at: string;
  /** SHA-256 of the SOURCE image, before the resize. */
  content_hash: string | null;
  archived_at: string | null;
  /** Null in both or written in both. One of the two is a dropped translation. */
  alt_de: string | null;
  alt_en: string | null;
}

export interface MaintenanceCell {
  valence: number;
  arousal: number;
  track_id: string | null;
  artwork_id: string | null;
}

/** One line of the log. `before` is null when the edit created the row. */
export interface ContentEdit {
  id: string;
  at: string;
  actor_email: string;
  entity: 'card' | 'track' | 'artwork' | 'cell';
  row_id: string;
  action: 'create' | 'update' | 'archive' | 'restore' | 'revert';
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
  /** The edit this one undid, when it is a revert. */
  reverts: string | null;
}

export interface MaintenanceDeck {
  cards: MaintenanceCard[];
  tracks: MaintenanceTrack[];
  artworks: MaintenanceArtwork[];
  cells: MaintenanceCell[];
  edits: ContentEdit[];
}

/* ═══ THE CALL ══════════════════════════════════════════════════════════════ */

interface Envelope<T> {
  data?: T;
  error?: string;
  detail?: string;
}

/**
 * The refusal an operator should be shown.
 *
 * `detail` is the database's own message where there is one, so a write that
 * hit `cards_code_shape` or the write-once trigger says which rule refused
 * rather than "409".
 */
export class MaintenanceError extends Error {
  readonly code: string;

  constructor(code: string, detail?: string) {
    super(detail && detail !== '' ? detail : code);
    this.name = 'MaintenanceError';
    this.code = code;
  }
}

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await getSupabase()
    .functions.invoke<Envelope<T>>('content-admin', { body: { action, payload } });

  if (error !== null) {
    /* supabase-js puts the body of a non-2xx response out of reach of
       `error.message`, so the status is what there is to go on. 403 is the
       allowlist and is worth naming: it is the one failure whose cause is the
       account rather than the request. */
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 403) throw new MaintenanceError('forbidden');
    if (status === 401) throw new MaintenanceError('unauthenticated');
    throw new MaintenanceError('failed', error.message);
  }

  if (data === null || data === undefined) throw new MaintenanceError('empty');
  if (data.error !== undefined) throw new MaintenanceError(data.error, data.detail);
  return data.data as T;
}

/* ═══ READING ═══════════════════════════════════════════════════════════════ */

/**
 * Everything, in one round trip.
 *
 * One call rather than five because the grid shows cards, tracks and artwork
 * at once — fetching them separately would paint it three times and briefly
 * give a cell a track id it cannot yet name.
 */
export function readDeck(): Promise<MaintenanceDeck> {
  return call<MaintenanceDeck>('read.all');
}

export function listHistory(
  filter: { entity?: string; rowId?: string; limit?: number } = {},
): Promise<ContentEdit[]> {
  return call<ContentEdit[]>('history.list', filter);
}

/* ═══ WRITING ═══════════════════════════════════════════════════════════════ */

/**
 * A patch, and the two meanings a key can have.
 *
 * A key ABSENT is left alone; a key present and null SETS null. That is the
 * whole interface of `admin_write`, and it is what lets one function serve
 * save, archive, restore and revert — archiving is `{archived_at: <now>}` and
 * restoring is `{archived_at: null}`.
 */
export type Patch = Record<string, string | number | null>;

export function saveCard(id: string, patch: Patch): Promise<MaintenanceCard> {
  return call<MaintenanceCard>('card.save', { id, patch });
}

export function saveTrack(id: string, patch: Patch): Promise<MaintenanceTrack> {
  return call<MaintenanceTrack>('track.save', { id, patch });
}

export function saveArtwork(id: string, patch: Patch): Promise<MaintenanceArtwork> {
  return call<MaintenanceArtwork>('artwork.save', { id, patch });
}

/** `id` is the position — use `cellId()` from `deckRules`, never a template. */
export function setCell(id: string, patch: Patch): Promise<MaintenanceCell> {
  return call<MaintenanceCell>('cell.set', { id, patch });
}

/**
 * Retire a row, or bring it back.
 *
 * There is no delete, anywhere, for anybody. A code can never be freed and a
 * history must always have something to return to, and those two together
 * mean nothing is ever removed — MAINTENANCE-UI.md §10.
 */
export function setArchived(
  entity: 'card' | 'track' | 'artwork',
  id: string,
  archived: boolean,
): Promise<unknown> {
  return call('archive', { entity, id, archived });
}

/** The whole order, in one call, because `cards.sort` is unique and collides. */
export function reorderCards(ids: string[]): Promise<unknown> {
  return call('cards.reorder', { ids });
}

/**
 * Put an edit back.
 *
 * A revert is a NEW EDIT: it applies the named edit's `before` and appends a
 * row saying what it undid. So the log always reads forward, and a revert can
 * itself be reverted.
 */
export function revertEdit(editId: string): Promise<unknown> {
  return call('revert', { editId });
}

/* ═══ UPLOADING ═════════════════════════════════════════════════════════════ */

interface SignedUpload {
  signedUrl: string;
  token: string;
  path: string;
  key: string;
  bucket: string;
}

/**
 * The bytes go straight to storage; only the key comes back through here.
 *
 * Three steps, and the middle one does not touch the function: it mints a
 * signed upload URL, the browser PUTs to storage, and then the row is told
 * about the file. The row learns LAST on purpose — a PUT that failed halfway
 * would otherwise leave `src` pointing at nothing, which is indistinguishable
 * from the null that honestly means "this piece has no recording".
 *
 * `durationSeconds` is measured by the platform decoder (`mediaFile.ts`) and
 * clamped by the function. It is never typed, and it is recorded in the
 * history either way, so a bad measurement is visible and revertable.
 *
 * ── A RECORDING IS RE-LABELLED BEFORE IT GOES ─────────────────────────────
 * `asUploadableAudio` names the content type from the extension, because
 * storage checks the type the bytes ARRIVE with and the bucket's four
 * `allowed_mime_types` do not include `audio/x-m4a` — which is what every
 * macOS browser calls a `.m4a`. Artwork needs none of this: it arrives from
 * `resizeArtwork` already encoded as the `image/webp` it will be stored as.
 */
export async function uploadMedia(options: {
  kind: 'track' | 'artwork';
  id: string;
  file: Blob;
  filename: string;
  durationSeconds?: number;
  /** Written with the key, so the unique index can refuse a second copy. */
  contentHash?: string;
}): Promise<unknown> {
  const signed = await call<SignedUpload>('upload.sign', {
    kind: options.kind,
    id: options.id,
    filename: options.filename,
  });

  const body = options.kind === 'track'
    ? asUploadableAudio(options.file, options.filename)
    : options.file;

  const { error } = await getSupabase()
    .storage.from(signed.bucket)
    .uploadToSignedUrl(signed.key, signed.token, body);

  if (error !== null) throw new MaintenanceError('upload_failed', error.message);

  return call('upload.finish', {
    kind: options.kind,
    id: options.id,
    key: signed.key,
    durationSeconds: options.durationSeconds,
    contentHash: options.contentHash,
  });
}
