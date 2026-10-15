/**
 * `/maintenance` — the deck, the music and the artwork, as things you can edit.
 *
 * ── A TOOL, NOT A SCREEN ──────────────────────────────────────────────────
 * The fourth of its kind after `/dev/qr`, `/goal-mappings` and
 * `/insight-map`: linked from nowhere, reachable only by typing the path, and
 * `lazy` in the route table so nobody who never types it downloads a byte.
 *
 * Unlike `/goal-mappings`, THIS ONE WRITES. Every press lands in the database
 * through the `content-admin` function, and every write is in the log before
 * the toast has faded. See MAINTENANCE-UI.md.
 *
 * ── THE GATE IS NOT HERE, AND THAT IS DELIBERATE ──────────────────────────
 * There is no allowlist in this file and no check against one. The screen
 * simply asks for the deck; if the account is not a maintainer the function
 * answers 403 and that refusal is what gets drawn. So the list of who may
 * open this exists in exactly ONE place — the function's `MAINTAINERS` — and
 * a copy here could only ever drift from it or lie about it.
 *
 * ── COPY: EXEMPT, AND SAID OUT LOUD ───────────────────────────────────────
 * Strings are inline and English, like `DevQrSheet.tsx`, which writes its own
 * exemption into its header for the same reason. Rules 6 and 7 are about the
 * product; this is a tool for one person, and ~160 catalogue keys for a
 * surface nobody but an operator sees would be copy written to be read once.
 * Logged in `apps/web/OPEN-QUESTIONS.md`. The one thing that IS translated is
 * the artwork alt text, because that is content and it reaches a listener.
 *
 * ── WHAT DRAWS WHAT ───────────────────────────────────────────────────────
 * `Field`, `ContentBox`, `CtaButton`, `Lightbox`, `Message`, `Toast`,
 * `SegmentedControl` and `Badge` are the design system's; the only thing with no
 * component is the 5 × 5 grid itself, which `10-layout.md` L14 permits as a
 * `musie-`prefixed pattern whose every declaration resolves to a Layer 1
 * token. A select is the second — the system has no dropdown, and a native
 * one is the honest answer for a list of nine. Both are component requests if
 * they recur (L14.3), and both are logged.
 */
import * as React from 'react';
import { Clock, Image, LayoutGrid, Layers, Music, Redo2, Undo2 } from 'lucide-react';
import {
  Badge,
  ContentBox,
  CtaButton,
  Field,
  IconButton,
  Lightbox,
  Message,
  SegmentedControl,
  Toast,
} from '@musie/design-system';
import {
  AXIS_MAX,
  AXIS_MIN,
  CELLS,
  LICENCE_TYPES,
  cellId,
  nextFreeCode,
  nextId,
  parseCellId,
  validateArtwork,
  validateCard,
  validateTrack,
} from '../lib/deckRules';
import type { Cell } from '../lib/deckRules';
import { contentImageUrl } from '../lib/assets';
import { readAudioTags } from '../lib/audioTags';
import {
  AUDIO_EXTENSIONS,
  asUploadableAudio,
  hashFile,
  measureDuration,
  readHead,
  resizeArtwork,
} from '../lib/mediaFile';
import { scanLink } from '../lib/scanCode';
import {
  MaintenanceError,
  listHistory,
  readDeck,
  reorderCards,
  revertEdit,
  saveArtwork,
  saveCard,
  saveTrack,
  setArchived,
  setCell,
  uploadMedia,
} from '../lib/maintenance';
import type {
  ContentEdit,
  MaintenanceArtwork,
  MaintenanceCard,
  MaintenanceCell,
  MaintenanceDeck,
  MaintenanceTrack,
  Patch,
} from '../lib/maintenance';
import '../maintenance.css';

type View = 'grid' | 'music' | 'artwork' | 'cards' | 'log';

/**
 * The five positions on either axis, derived from `deckRules` so there is one
 * definition of how wide the grid is. Valence reads left to right; arousal is
 * drawn top-down, so its rows are this reversed — up is more activating.
 */
const AXIS: number[] = Array.from(
  { length: AXIS_MAX - AXIS_MIN + 1 },
  (_, step) => AXIS_MIN + step,
);

/* ═══ SMALL SHARED PIECES ═══════════════════════════════════════════════════ */

/**
 * A select, because the design system has no dropdown and a list of nine does
 * not want nine radio buttons. `musie-` prefixed per L14.2 so a screen file
 * can never be mistaken for a system file.
 */
function Picker(props: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}): React.ReactElement {
  const id = React.useId();
  return (
    <div className="musie-picker">
      <label className="musie-picker__label" htmlFor={id}>{props.label}</label>
      <select
        id={id}
        className="musie-picker__select"
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

/** A fact that cannot be typed. Shown, never offered. */
function Fact(props: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="musie-fact">
      <span className="musie-fact__label">{props.label}</span>
      <span className="musie-fact__value">{props.children}</span>
    </div>
  );
}

function when(iso: string): string {
  /* The operator's own locale and timezone: this is a log of what they did,
     read minutes or months later, and a UTC stamp would need translating in
     their head every time. */
  return new Date(iso).toLocaleString();
}

function seconds(total: number): string {
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(Math.round(total % 60)).padStart(2, '0')}`;
}

/** What actually moved between two states, as a sentence per field. */
function changes(edit: ContentEdit): string {
  const before = edit.before ?? {};
  const after = edit.after;
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => key !== 'created_at');

  const moved = keys
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((key) => {
      const from = before[key];
      const to = after[key];
      const show = (value: unknown): string =>
        value === null || value === undefined || value === '' ? '—' : String(value);
      return edit.before === null
        ? `${key} ${show(to)}`
        : `${key} ${show(from)} → ${show(to)}`;
    });

  return moved.length === 0 ? 'nothing changed' : moved.join(' · ');
}

/**
 * Always on screen, below every library. Ben, 2026-10-14.
 *
 * Nothing here is ever deleted — a code can never be freed and a history must
 * always have something to return to — so *retired* is a permanent part of
 * every list rather than an empty state somebody might never see. Which is
 * also why the empty case says what it says: this section fills up over time
 * and never empties.
 */
function Retired(props: { count: number; children: React.ReactNode }): React.ReactElement {
  return (
    <section className="musie-retired">
      <h2 className="musie-retired__head">Retired</h2>
      {props.count === 0
        ? (
          <p className="musie-note">
            Nothing is retired. Nothing here is ever deleted, so this fills up
            rather than empties.
          </p>
        )
        : props.children}
    </section>
  );
}

/**
 * What the file picker offers.
 *
 * THE EXTENSIONS MATTER AS MUCH AS THE TYPES. `accept` is matched against the
 * operating system's idea of a file's type, and the bucket is matched against
 * the BROWSER's — and for `.m4a` those disagree (`asUploadableAudio` has the
 * measurement). Naming the extensions too means the picker can never grey out
 * a file this screen can in fact upload.
 */
const AUDIO_ACCEPT = [
  'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav',
  ...AUDIO_EXTENSIONS.map((extension) => `.${extension}`),
].join(',');

/** A filename without its extension — the last fallback for a title. */
function stemOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return (dot > 0 ? filename.slice(0, dot) : filename).trim();
}

function reason(thrown: unknown): string {
  return thrown instanceof Error ? thrown.message : String(thrown);
}

/**
 * The history, which is on every detail view rather than on a screen of its
 * own.
 *
 * Ben, 2026-10-14: *always display a version history and a timestamp, who has
 * made a change when, including a way to roll back.* A reverted edit is
 * marked and so is the revert, so the log reads forward and never looks like
 * it has been edited — because it never has been.
 */
function History(props: {
  edits: ContentEdit[];
  onRevert: (editId: string) => void;
  busy: boolean;
}): React.ReactElement {
  const reverted = new Set(
    props.edits.map((edit) => edit.reverts).filter((id): id is string => id !== null),
  );

  if (props.edits.length === 0) {
    return <p className="musie-note">Nothing has been changed here yet.</p>;
  }

  return (
    <ol className="musie-log">
      {props.edits.map((edit) => (
        <li key={edit.id} className="musie-log__entry">
          <div className="musie-log__head">
            <strong>{edit.action}</strong>
            <span className="musie-log__who">{edit.actor_email}</span>
            <span className="musie-log__when">{when(edit.at)}</span>
            {edit.reverts !== null && <Badge variant="neutral" hideIcon>revert</Badge>}
            {reverted.has(edit.id) && <Badge variant="neutral" hideIcon>reverted</Badge>}
          </div>
          <p className="musie-log__what">
            {edit.entity} {edit.row_id} — {changes(edit)}
          </p>
          <CtaButton
            variant="secondary"
            size="min"
            loading={props.busy}
            loadingLabel="Reverting"
            onClick={() => props.onRevert(edit.id)}
          >
            Revert this
          </CtaButton>
        </li>
      ))}
    </ol>
  );
}

/* ═══ THE SCREEN ════════════════════════════════════════════════════════════ */

export function Maintenance(): React.ReactElement {
  const [deck, setDeck] = React.useState<MaintenanceDeck | null>(null);
  const [problem, setProblem] = React.useState<string | null>(null);
  const [refused, setRefused] = React.useState(false);
  const [view, setView] = React.useState<View>('music');
  const [toast, setToast] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  /**
   * A DRAFT IS NOT A ROW. Ben, 2026-10-14: only create an item when it is
   * saved. These used to write a placeholder immediately — a piece called
   * `Untitled` by `Unknown`, an artwork whose `src` was `art-07-pending` —
   * and open the panel on it, so closing the panel left the placeholder in
   * the library and in the log. Now the panel holds a draft that exists
   * nowhere until Save, and the log's first line for a row is its real one.
   */
  const [draftTrack, setDraftTrack] = React.useState(false);
  const [draftCard, setDraftCard] = React.useState(false);
  const [draftCell, setDraftCell] = React.useState<string>('');

  /** Which thing is open, if any. */
  const [openCell, setOpenCell] = React.useState<Cell | null>(null);
  const [openTrack, setOpenTrack] = React.useState<string | null>(null);
  const [openArtwork, setOpenArtwork] = React.useState<string | null>(null);
  const [openCard, setOpenCard] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setDeck(await readDeck());
      setProblem(null);
    } catch (thrown: unknown) {
      if (thrown instanceof MaintenanceError && thrown.code === 'forbidden') {
        setRefused(true);
        return;
      }
      setProblem(thrown instanceof Error ? thrown.message : String(thrown));
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  /**
   * Every write goes through here: it runs the call, re-reads everything, and
   * reports.
   *
   * RE-READING THE WHOLE DECK after each write rather than patching state is
   * deliberate. One write can move several rows — a cell change rewrites
   * `exercise_tracks` and a card's `image_url` through the projection — so a
   * local patch would be a second, partial model of what the database did,
   * and the two would eventually disagree. Nine cards is a cheap read.
   */
  const run = React.useCallback(async (
    label: string,
    work: () => Promise<unknown>,
  ): Promise<boolean> => {
    setBusy(true);
    try {
      await work();
      await load();
      setToast(label);
      return true;
    } catch (thrown: unknown) {
      /* The database's own sentence, which names the constraint that refused.
         Better than anything this file could compose. */
      setToast(thrown instanceof Error ? thrown.message : String(thrown));
      return false;
    } finally {
      setBusy(false);
    }
  }, [load]);

  if (refused) {
    return (
      <div className="musie-maintenance">
        <Message
          variant="error"
          headline="This account cannot open the maintenance screen"
          text={
            'Access is an allowlist in the content-admin function, and changing it ' +
            'is an edit to that file plus a deploy. Sign in as the maintainer ' +
            'account — note that a signed-in anonymous session has no email at all.'
          }
          statusWord="Refused"
        />
      </div>
    );
  }

  if (problem !== null) {
    return (
      <div className="musie-maintenance">
        <Message
          variant="error"
          headline="The deck could not be read"
          text={problem}
          statusWord="Error"
          action={<CtaButton variant="secondary" size="min" onClick={() => void load()}>Try again</CtaButton>}
        />
      </div>
    );
  }

  if (deck === null) {
    return <div className="musie-maintenance"><p className="musie-note">Reading the deck…</p></div>;
  }

  /* ── LOOKUPS ────────────────────────────────────────────────────────────── */

  const cellAt = (cell: Cell): MaintenanceCell | undefined =>
    deck.cells.find((c) => c.valence === cell.valence && c.arousal === cell.arousal);

  const cardAt = (cell: Cell): MaintenanceCard | undefined =>
    deck.cards.find((c) => c.valence === cell.valence && c.arousal === cell.arousal
      && c.archived_at === null);

  const trackById = (id: string | null): MaintenanceTrack | undefined =>
    id === null ? undefined : deck.tracks.find((t) => t.id === id);

  const artworkById = (id: string | null): MaintenanceArtwork | undefined =>
    id === null ? undefined : deck.artworks.find((a) => a.id === id);

  const liveTracks = deck.tracks.filter((t) => t.archived_at === null);
  const liveArtworks = deck.artworks.filter((a) => a.archived_at === null);
  const liveCards = deck.cards.filter((c) => c.archived_at === null);

  const retiredTracks = deck.tracks.filter((t) => t.archived_at !== null);
  const retiredArtworks = deck.artworks.filter((a) => a.archived_at !== null);
  const retiredCards = deck.cards.filter((c) => c.archived_at !== null);

  /** Which cells a track or artwork sits on — the "archiving this costs" list. */
  const cellsUsing = (kind: 'track' | 'artwork', id: string): MaintenanceCell[] =>
    deck.cells.filter((cell) => (kind === 'track' ? cell.track_id : cell.artwork_id) === id);

  const editsFor = (entity: string, rowId: string): ContentEdit[] =>
    deck.edits.filter((edit) => edit.entity === entity && edit.row_id === rowId);

  const revert = (editId: string): void => {
    void run('Reverted', () => revertEdit(editId));
  };

  /* ── UNDO AND REDO ──────────────────────────────────────────────────────
     Both are READ OUT OF THE LOG rather than kept in a stack beside it. The
     log is append-only and a revert is itself an edit naming what it undid,
     so the whole of the state is already there — which is why these survive a
     reload, why they are the same for two people looking at one deck, and why
     there is nothing to keep in step.

     An edit is CANCELLED when a later, live revert names it. Walking newest
     first and skipping what is already cancelled is what makes a revert that
     was itself undone count for nothing, which is the case a counter gets
     wrong. */
  const cancelled = new Set<string>();
  for (const edit of deck.edits) {
    if (cancelled.has(edit.id)) continue;
    if (edit.action === 'revert' && edit.reverts !== null) cancelled.add(edit.reverts);
  }

  /** The newest edit still standing that is not itself an undo. */
  const undoTarget = deck.edits.find(
    (edit) => !cancelled.has(edit.id) && edit.action !== 'revert',
  ) ?? null;

  /**
   * REDO IS ONE LEVEL, and deliberately: it undoes your last undo.
   *
   * It is offered only when the newest edit is a revert of something that is
   * NOT itself a revert. Without that second half, pressing redo twice would
   * undo again — the second press would revert the revert-of-a-revert — and a
   * control that alternates between two meanings is worse than one that stops.
   * Deeper redo wants a cursor the log does not carry; logged rather than
   * faked.
   */
  const newestEdit = deck.edits[0] ?? null;
  const redoneEdit = newestEdit !== null && newestEdit.reverts !== null
    ? deck.edits.find((edit) => edit.id === newestEdit.reverts) ?? null
    : null;
  const redoTarget = newestEdit !== null
    && newestEdit.action === 'revert'
    && !cancelled.has(newestEdit.id)
    && redoneEdit !== null
    && redoneEdit.action !== 'revert'
    ? newestEdit
    : null;

  /** What a press would do, as the sentence the tooltip shows. */
  const describe = (edit: ContentEdit): string =>
    `${edit.entity} ${edit.row_id} — ${changes(edit)}`;

  /* ── THE GRID ───────────────────────────────────────────────────────────── */

  const grid = (
    <>
      <p className="musie-note">
        Valence across, arousal up — both run −2 to +2. A card plays whatever
        music sits on its square and shows whatever picture sits there. The same
        piece may sit on several squares; an empty square is a silent card,
        which is ordinary.
      </p>
      <div className="musie-grid" role="group" aria-label="The valence and arousal grid">
        {/* THE LABELS ARE `aria-hidden`. Each cell's own `aria-label` already
            says "Valence 1, arousal 2", so a screen reader gets the position
            from the thing it is on; a labelled row and column would read the
            same two numbers again on the way past. */}
        <span className="musie-grid__axis" aria-hidden="true" />
        {AXIS.map((valence) => (
          <span key={`valence-${valence}`} className="musie-grid__axis" aria-hidden="true">
            {valence}
          </span>
        ))}

        {[...AXIS].reverse().map((arousal) => (
          <React.Fragment key={`arousal-${arousal}`}>
            <span className="musie-grid__axis" aria-hidden="true">{arousal}</span>
            {AXIS.map((valence) => {
              const cell = { valence, arousal };
              const held = cellAt(cell);
              const card = cardAt(cell);
              const track = trackById(held?.track_id ?? null);
              const artwork = artworkById(held?.artwork_id ?? null);
              return (
                <button
                  key={cellId(cell)}
                  type="button"
                  className="musie-grid__cell"
                  aria-label={`Valence ${valence}, arousal ${arousal}`}
                  onClick={() => setOpenCell(cell)}
                >
                  <span className="musie-grid__code">{card?.code ?? '·'}</span>
                  {artwork !== undefined && (
                    <img
                      className="musie-grid__art"
                      src={contentImageUrl(artwork.src)}
                      alt=""
                    />
                  )}
                  <span className="musie-grid__track">
                    {track === undefined ? 'no music' : track.title}
                  </span>
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </>
  );

  /* ── THE CELL PANEL ─────────────────────────────────────────────────────── */

  const heldCell = openCell === null ? undefined : cellAt(openCell);
  const cellPanel = openCell !== null && heldCell !== undefined && (
    <Lightbox
      title={`Square ${openCell.valence}, ${openCell.arousal}`}
      open
      onOpenChange={(next) => { if (!next) setOpenCell(null); }}
      closeLabel="Close"
    >
      <Picker
        label="Card standing here"
        value={cardAt(openCell)?.id ?? ''}
        options={[
          { value: '', label: '— no card —' },
          ...liveCards.map((card) => ({ value: card.id, label: card.code })),
        ]}
        disabled={busy}
        onChange={(id) => {
          const target = openCell;
          const standing = cardAt(target);
          void run('Card moved', async () => {
            /* One card per cell is a unique constraint, so the card that was
               standing here has to leave before another arrives. */
            if (standing !== undefined && standing.id !== id) {
              await saveCard(standing.id, { valence: null, arousal: null });
            }
            if (id !== '') {
              await saveCard(id, { valence: target.valence, arousal: target.arousal });
            }
          });
        }}
      />

      <Picker
        label="Music on this square"
        value={heldCell.track_id ?? ''}
        options={[
          { value: '', label: '— silent —' },
          ...liveTracks.map((track) => ({
            value: track.id,
            label: `${track.title} — ${track.artist}${track.src === null ? ' (no file)' : ''}`,
          })),
        ]}
        disabled={busy}
        onChange={(id) => {
          void run('Music moved', () => setCell(cellId(openCell), { track_id: id === '' ? null : id }));
        }}
      />

      <Picker
        label="Picture on this square"
        value={heldCell.artwork_id ?? ''}
        options={[
          { value: '', label: '— none —' },
          ...liveArtworks.map((artwork) => ({ value: artwork.id, label: artwork.id })),
        ]}
        disabled={busy}
        onChange={(id) => {
          void run('Picture moved', () => setCell(cellId(openCell), { artwork_id: id === '' ? null : id }));
        }}
      />

      <ContentBox headline="What changed here" headingLevel={3}>
        <History edits={editsFor('cell', cellId(openCell))} onRevert={revert} busy={busy} />
      </ContentBox>
    </Lightbox>
  );

  /* ── MUSIC ──────────────────────────────────────────────────────────────── */

  /**
   * SEVERAL FILES AT ONCE, each becoming a piece filled in from its own tags.
   * Ben, 2026-10-14.
   *
   * ── THE IDS ARE MINTED FROM A LIST THAT GROWS ───────────────────────────
   * `nextId` reads the highest id in use, and nothing has been written yet
   * when the second file is reached — so minting from `deck.tracks` would
   * give every file in one drop the same id, and the second write would
   * quietly update the first piece. The local `taken` is what makes a drop of
   * nine files nine pieces.
   *
   * ── ROW FIRST, THEN FILE ────────────────────────────────────────────────
   * The metadata write creates the row and the upload fills in `src` and the
   * duration. That order means a failed upload leaves a piece with no
   * recording — which is a legal and honest state, five of the nine are like
   * that, and the row carries the credit the file came with. The other order
   * would leave an object in the bucket that nothing points at.
   *
   * ── AND THE TITLE MAY BE A FILENAME ─────────────────────────────────────
   * Tags first, the filename stem second. A studio's export is called
   * `BodyScan - mit Hintergrund.mp3`, so the fallback is a prompt rather
   * than an answer — which is what the toast says.
   */
  const uploadPieces = async (files: FileList): Promise<void> => {
    setBusy(true);
    const added: string[] = [];
    const skipped: string[] = [];
    const failed: string[] = [];
    const taken = deck.tracks.map((track) => track.id);

    /**
     * ── NO FILE TWICE ─────────────────────────────────────────────────────
     * Hash → what already holds it, so a refusal can NAME the piece rather
     * than report a constraint. Seeded from the library and added to as the
     * drop runs, which is what catches the same file selected twice in one
     * go — the case a check against the library alone would miss.
     *
     * This is the courtesy. The guard is `tracks_content_hash_once`, and the
     * hash is written with the row BEFORE the bytes move, so a duplicate is
     * refused without uploading anything.
     */
    const seen = new Map<string, string>();
    for (const track of deck.tracks) {
      if (track.content_hash !== null) {
        seen.set(track.content_hash, track.title === '' ? track.id : track.title);
      }
    }

    /**
     * ── A FAILED UPLOAD MUST NOT POISON THE NEXT ATTEMPT ──────────────────
     * The hash is written WITH THE ROW, before the bytes move, so the unique
     * index can refuse a duplicate without spending an upload. That is
     * `20261014120000`'s design and it is the right one — but it has a cost
     * nobody had paid yet: a row whose upload then FAILED still holds the
     * hash, and the loop above skips any file whose hash it can already see.
     *
     * So one failure made a file UNUPLOADABLE FOREVER through this door.
     * Every later drop answered *already here as …*, naming a piece that has
     * no recording — which reads as the screen being wrong about its own
     * library rather than as a retry being refused.
     *
     * Clearing the hash is the undo. The row stays, because nothing in this
     * schema is hard-deleted and a piece with no file is a state five of the
     * nine imported rows are already in; it simply stops standing in the way.
     * The toast names it either way, so it can be retired or filled in.
     */
    const unblockRetry = async (id: string, hash: string): Promise<string> => {
      seen.delete(hash);
      try {
        await saveTrack(id, { content_hash: null });
        return `${id} is here with no file — drop it again to retry`;
      } catch {
        /* The undo itself failed, and that is worth saying plainly: the next
           drop WILL skip this file until the row is retired by hand. */
        return `${id} still holds this file's fingerprint — retire it to retry`;
      }
    };

    for (const file of Array.from(files)) {
      /* The row this file got, once it has one. A failure AFTER this is set
         has to undo the hash — see `unblockRetry`. */
      let wrote: { id: string; hash: string } | null = null;
      try {
        /* THE FORMAT IS CHECKED FIRST, before anything is written. Storage
           judges the type the bytes arrive with, so a format the bucket has
           no content type for cannot be uploaded at all — and finding that
           out here means no row and no hash are left behind for it. */
        const body = asUploadableAudio(file, file.name);

        const hash = await hashFile(file);
        const already = seen.get(hash);
        if (already !== undefined) {
          skipped.push(`${file.name} is already here as ${already}`);
          continue;
        }

        const tags = readAudioTags(await readHead(file));
        const measured = await measureDuration(file);
        const id = nextId('trk', taken);
        taken.push(id);

        const title = tags.title ?? stemOf(file.name);
        await saveTrack(id, {
          title,
          artist: tags.artist ?? '',
          album: tags.album,
          release_year: tags.year,
          tempo_bpm: tags.tempoBpm,
          content_hash: hash,
        });
        wrote = { id, hash };
        seen.set(hash, title);

        await uploadMedia({
          kind: 'track', id, file: body, filename: file.name,
          durationSeconds: measured, contentHash: hash,
        });
        added.push(id);
      } catch (thrown: unknown) {
        const undone = wrote === null ? null : await unblockRetry(wrote.id, wrote.hash);
        failed.push(`${file.name}: ${reason(thrown)}${undone === null ? '' : ` (${undone})`}`);
      }
    }

    await load();
    setBusy(false);
    setToast([
      added.length === 0 ? null : `${added.length} piece(s) added — check the titles`,
      skipped.length === 0 ? null : `${skipped.length} skipped: ${skipped.join('; ')}`,
      failed.length === 0 ? null : `${failed.length} failed: ${failed.join('; ')}`,
    ].filter((line) => line !== null).join(' · ') || 'nothing to add');
  };

  /** One row, live or retired. */
  const trackRow = (track: MaintenanceTrack): React.ReactElement => (
    <li key={track.id}>
      <button
        type="button"
        className={`musie-row${track.archived_at === null ? '' : ' musie-row--retired'}`}
        onClick={() => setOpenTrack(track.id)}
      >
        <span className="musie-row__name">
          {track.title === '' ? track.id : track.title}
          {track.artist.trim() === '' && <Badge variant="warning" hideIcon>no artist</Badge>}
        </span>
        <span className="musie-row__meta">
          {track.artist.trim() === '' ? 'artist not filled in yet' : track.artist}
          {track.tempo_bpm !== null && ` · ${track.tempo_bpm} bpm`}
          {track.src === null ? ' · no file' : ` · ${seconds(track.duration_seconds)}`}
          {` · ${cellsUsing('track', track.id).length} square(s)`}
        </span>
      </button>
    </li>
  );

  /* Calmest first where a tempo is known, which is the judgement being made
     every time a piece is placed on the vertical axis. */
  const byTempo = (a: MaintenanceTrack, b: MaintenanceTrack): number =>
    (a.tempo_bpm ?? Number.MAX_SAFE_INTEGER) - (b.tempo_bpm ?? Number.MAX_SAFE_INTEGER)
    || a.title.localeCompare(b.title);

  const music = (
    <>
      <div className="musie-toolrow">
        <label className="musie-file">
          <span>Upload pieces — one per file, filled in from its own tags</span>
          <input
            type="file"
            multiple
            accept={AUDIO_ACCEPT}
            disabled={busy}
            onChange={(event) => {
              const files = event.target.files;
              if (files !== null && files.length > 0) void uploadPieces(files);
              event.target.value = '';
            }}
          />
        </label>
        <CtaButton
          variant="secondary"
          size="min"
          disabled={busy}
          onClick={() => setDraftTrack(true)}
        >
          Add one with no file
        </CtaButton>
      </div>

      <p className="musie-note">
        {liveTracks.length} live. Sorted calmest first where a tempo is known.
      </p>

      <ul className="musie-rows">{[...liveTracks].sort(byTempo).map(trackRow)}</ul>

      <Retired count={retiredTracks.length}>
        <ul className="musie-rows">{[...retiredTracks].sort(byTempo).map(trackRow)}</ul>
      </Retired>
    </>
  );

  const trackPanel = openTrack !== null && (() => {
    const track = trackById(openTrack);
    if (track === undefined) return false;
    return (
      <TrackPanel
        track={track}
        cells={cellsUsing('track', track.id)}
        cards={deck.cards}
        edits={editsFor('track', track.id)}
        busy={busy}
        onClose={() => setOpenTrack(null)}
        onSave={(patch) => run('Piece saved', () => saveTrack(track.id, patch))}
        /* THE HASH GOES WITH IT. `upload.finish` always writes
           `content_hash`, so leaving it out here wrote NULL — a replacement
           quietly surrendered the row's duplicate protection, and the same
           file could then be dropped in again as a new piece. */
        onUpload={(file, durationSeconds) => run('File replaced', async () => uploadMedia({
          kind: 'track', id: track.id, file, filename: file.name, durationSeconds,
          contentHash: await hashFile(file),
        }))}
        onArchive={(archived) => run(archived ? 'Piece retired' : 'Piece restored',
          () => setArchived('track', track.id, archived))}
        onRevert={revert}
      />
    );
  })();

  /* ── ARTWORK ────────────────────────────────────────────────────────────── */

  /**
   * A PICTURE IS CREATED BY CHOOSING ONE, not by pressing Add.
   *
   * `artworks.src` is `not null`, so an artwork with no file is not a state
   * the schema can hold — which used to mean inventing one: the Add button
   * wrote `src: 'art-07-pending'`, a key pointing at nothing, and left it
   * there if the panel was closed. Choosing the file IS the save here, which
   * is what Ben asked for and also the only honest shape available.
   *
   * Resized to 768² WebP before it leaves the browser — the size
   * `20260924140000` worked out as 4× the largest slot a card gives an image.
   */
  const uploadPictures = async (files: FileList): Promise<void> => {
    setBusy(true);
    const added: string[] = [];
    const skipped: string[] = [];
    const failed: string[] = [];
    const taken = deck.artworks.map((art) => art.id);

    /* THE SOURCE IS HASHED, not the resize — two drops of one photograph are
       the duplicate worth refusing, and hashing the WebP would make "the same
       picture" mean "encoded identically". */
    const seen = new Map<string, string>();
    for (const art of deck.artworks) {
      if (art.content_hash !== null) seen.set(art.content_hash, art.id);
    }

    for (const file of Array.from(files)) {
      try {
        const hash = await hashFile(file);
        const already = seen.get(hash);
        if (already !== undefined) {
          skipped.push(`${file.name} is already here as ${already}`);
          continue;
        }

        const resized = await resizeArtwork(file);
        const id = nextId('art', taken);
        taken.push(id);
        seen.set(hash, id);

        await uploadMedia({
          kind: 'artwork', id, file: resized, filename: `${id}.webp`, contentHash: hash,
        });
        added.push(id);
      } catch (thrown: unknown) {
        failed.push(`${file.name}: ${reason(thrown)}`);
      }
    }

    await load();
    setBusy(false);
    setToast([
      added.length === 0 ? null : `${added.length} picture(s) added`,
      skipped.length === 0 ? null : `${skipped.length} skipped: ${skipped.join('; ')}`,
      failed.length === 0 ? null : `${failed.length} failed: ${failed.join('; ')}`,
    ].filter((line) => line !== null).join(' · ') || 'nothing to add');
  };

  const artworkThumb = (art: MaintenanceArtwork): React.ReactElement => (
    <button
      key={art.id}
      type="button"
      className={`musie-thumb${art.archived_at === null ? '' : ' musie-thumb--retired'}`}
      onClick={() => setOpenArtwork(art.id)}
    >
      {/* `cover` here and `contain` in the panel: a thumbnail is a label and
          wants one shape, and the panel is where the picture is the subject. */}
      <img src={contentImageUrl(art.src)} alt="" className="musie-thumb__img" />
      <span className="musie-thumb__name">{art.id}</span>
      <span className="musie-note">{cellsUsing('artwork', art.id).length} square(s)</span>
    </button>
  );

  const artwork = (
    <>
      <div className="musie-toolrow">
        <label className="musie-file">
          <span>Upload pictures — resized to 768² WebP on the way</span>
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={(event) => {
              const files = event.target.files;
              if (files !== null && files.length > 0) void uploadPictures(files);
              event.target.value = '';
            }}
          />
        </label>
        <span className="musie-note">{liveArtworks.length} live.</span>
      </div>

      <div className="musie-thumbs">{liveArtworks.map(artworkThumb)}</div>

      <Retired count={retiredArtworks.length}>
        <div className="musie-thumbs">{retiredArtworks.map(artworkThumb)}</div>
      </Retired>
    </>
  );

  const artworkPanel = openArtwork !== null && (() => {
    const art = artworkById(openArtwork);
    if (art === undefined) return false;
    return (
      <ArtworkPanel
        artwork={art}
        cells={cellsUsing('artwork', art.id)}
        cards={deck.cards}
        edits={editsFor('artwork', art.id)}
        busy={busy}
        onClose={() => setOpenArtwork(null)}
        onSave={(patch) => run('Picture saved', () => saveArtwork(art.id, patch))}
        onUpload={(file) => run('Picture replaced', () => uploadMedia({
          kind: 'artwork', id: art.id, file, filename: `${art.id}.webp`,
        }))}
        onArchive={(archived) => run(archived ? 'Picture retired' : 'Picture restored',
          () => setArchived('artwork', art.id, archived))}
        onRevert={revert}
      />
    );
  })();

  /* ── CARDS ──────────────────────────────────────────────────────────────── */

  /**
   * EVERY code the deck has ever had, archived cards included. A code is never
   * freed, so handing `nextFreeCode` only the live ones would re-offer a
   * retired card's code and point old diary rows at a card they never drew.
   */
  const everUsedCodes = deck.cards.map((card) => card.code);
  const free = nextFreeCode(everUsedCodes);

  const cardRow = (
    card: MaintenanceCard,
    index: number,
    all: MaintenanceCard[],
  ): React.ReactElement => (
    <li key={card.id}>
      <div className={`musie-row musie-row--split${card.archived_at === null ? '' : ' musie-row--retired'}`}>
        <button type="button" className="musie-row__main" onClick={() => setOpenCard(card.id)}>
          <span className="musie-row__name">{card.code}</span>
          <span className="musie-row__meta">
            {card.valence === null
              ? 'not on the grid'
              : `square ${card.valence}, ${card.arousal}`}
            {' · '}
            {card.valence === null
              ? 'no music'
              : trackById(cellAt({ valence: card.valence, arousal: card.arousal ?? 0 })?.track_id ?? null)?.title ?? 'no music'}
          </span>
        </button>
        {card.archived_at === null && (
          <span className="musie-row__actions">
            <CtaButton
              variant="secondary"
              size="min"
              loading={busy}
              loadingLabel="…"
              onClick={() => {
                if (index === 0) return;
                const order = all.map((one) => one.id);
                [order[index - 1], order[index]] = [order[index], order[index - 1]];
                void run('Order changed', () => reorderCards(order));
              }}
            >
              Up
            </CtaButton>
            <CtaButton
              variant="secondary"
              size="min"
              loading={busy}
              loadingLabel="…"
              onClick={() => {
                if (index === all.length - 1) return;
                const order = all.map((one) => one.id);
                [order[index], order[index + 1]] = [order[index + 1], order[index]];
                void run('Order changed', () => reorderCards(order));
              }}
            >
              Down
            </CtaButton>
          </span>
        )}
      </div>
    </li>
  );

  const ordered = [...liveCards].sort((a, b) => a.sort - b.sort);

  const cards = (
    <>
      <div className="musie-toolrow">
        <CtaButton
          variant="primary"
          size="min"
          disabled={busy || free === null}
          onClick={() => { setDraftCell(''); setDraftCard(true); }}
        >
          {free === null ? 'All 99 codes are used' : `Add ${free}`}
        </CtaButton>
        <span className="musie-note">
          {liveCards.length} live of {deck.cards.length} ever made. A code is written
          once and never reused, so a retired card keeps its own for ever.
        </span>
      </div>

      <ul className="musie-rows">
        {ordered.map((card, index) => cardRow(card, index, ordered))}
      </ul>

      <Retired count={retiredCards.length}>
        <ul className="musie-rows">
          {retiredCards.map((card, index) => cardRow(card, index, retiredCards))}
        </ul>
      </Retired>
    </>
  );

  const cardPanel = openCard !== null && (() => {
    const card = deck.cards.find((c) => c.id === openCard);
    if (card === undefined) return false;
    const on = card.valence === null ? null : { valence: card.valence, arousal: card.arousal ?? 0 };
    return (
      <Lightbox
        title={card.code}
        open
        onOpenChange={(next) => { if (!next) setOpenCard(null); }}
        closeLabel="Close"
      >
        {/* READ-ONLY, and the trigger in the schema is what makes it true.
            Ben, 2026-10-14: MC-01 stays MC-01 whatever new image is on it. */}
        <Field
          label="Code"
          value={card.code}
          readOnly
          description="Written once. A printed QR encodes it, and paper cannot be reissued."
        />

        <Picker
          label="Square"
          value={on === null ? '' : cellId(on)}
          options={[
            { value: '', label: '— not on the grid —' },
            ...CELLS.map((cell) => {
              const occupant = cardAt(cell);
              const taken = occupant !== undefined && occupant.id !== card.id;
              return {
                value: cellId(cell),
                label: `${cell.valence}, ${cell.arousal}${taken ? ` (held by ${occupant.code})` : ''}`,
              };
            }),
          ]}
          disabled={busy}
          onChange={(value) => {
            const target = value === '' ? null : parseCellId(value);
            void run('Card moved', async () => {
              if (target !== null) {
                const occupant = cardAt(target);
                if (occupant !== undefined && occupant.id !== card.id) {
                  await saveCard(occupant.id, { valence: null, arousal: null });
                }
              }
              await saveCard(card.id, {
                valence: target?.valence ?? null,
                arousal: target?.arousal ?? null,
              });
            });
          }}
        />

        <Fact label="Plays">
          {on === null ? '—' : trackById(cellAt(on)?.track_id ?? null)?.title ?? 'nothing'}
        </Fact>
        <Fact label="Shows">
          {on === null ? '—' : cellAt(on)?.artwork_id ?? 'nothing'}
        </Fact>
        {/**
          * THE QR SEAM. `scanLink` is the one definition of what a printed
          * code encodes — `/dev/qr` builds its sheet from the same function —
          * so docking a generator here is "draw this string" and a layout.
          * The origin is this app's own, which is why the string works on
          * localhost, on a LAN address and on a domain that does not exist
          * yet.
          */}
        <Fact label="Scans to">
          <code>{scanLink(card.code, window.location.origin)}</code>
        </Fact>

        {/**
          * ── RETIRING A CARD IS OFF ────────────────────────────────────────
          * MAINTENANCE-UI.md §10 promised that the deck query would filter
          * `archived_at`, and it does not: `CARD_SELECT` in `lib/content.ts`
          * reads id, code, image_url, sort and the i18n row, and nothing
          * anywhere excludes an archived card. So retiring one does half of
          * what the button says — it leaves this grid and frees its square,
          * and STAYS IN THE DECK THE PRODUCT DEALS.
          *
          * Retiring a piece of music or a picture is sound and is untouched:
          * the projection skips archived rows, so the card goes silent or
          * loses its picture, which is visible and correct. It is only the
          * card itself that the read path cannot hide.
          *
          * The button is disabled AND the database refuses
          * (`20261014150000`), because a disabled control is not a guard —
          * a stale tab reaches the function without passing it, which is the
          * same reason this screen's own route gate is cosmetic.
          *
          * RESTORE STAYS LIVE. Only the retire direction is off, so nothing
          * can be trapped in the state the guard exists to prevent.
          */}
        {card.archived_at === null ? (
          <>
            <CtaButton variant="secondary" disabled loading={false}>
              Retire this card
            </CtaButton>
            <p className="musie-note">
              Retiring a card is off until the app can hide one. The deck the
              product deals does not filter retired cards yet, so a card
              retired here would still be dealt to players — and you could not
              tell from this screen. Retire its music or its picture instead;
              both work and both show.
            </p>
          </>
        ) : (
          <CtaButton
            variant="secondary"
            loading={busy}
            loadingLabel="…"
            onClick={() => {
              void run('Card restored', () => setArchived('card', card.id, false));
            }}
          >
            Bring it back
          </CtaButton>
        )}

        <ContentBox headline="What changed here" headingLevel={3}>
          <History edits={editsFor('card', card.id)} onRevert={revert} busy={busy} />
        </ContentBox>
      </Lightbox>
    );
  })();

  /* ── THE DRAFTS, WHICH ARE NOT ROWS YET ─────────────────────────────────── */

  const draftTrackId = nextId('trk', deck.tracks.map((track) => track.id));

  const trackDraft = draftTrack && (
    <TrackPanel
      isNew
      track={{
        id: draftTrackId,
        src: null,
        duration_seconds: 0,
        title: '',
        artist: '',
        album: null,
        release_year: null,
        tempo_bpm: null,
        mood_note: null,
        licence_type: null,
        catalogue_ref: null,
        licence_ref: null,
        /* No bytes, so nothing to hash. A piece created with no file picks
           one up the first time one is uploaded onto it. */
        content_hash: null,
        archived_at: null,
      }}
      cells={[]}
      cards={deck.cards}
      edits={[]}
      busy={busy}
      onClose={() => setDraftTrack(false)}
      onSave={async (patch) => {
        const ok = await run(`${draftTrackId} created`, () => saveTrack(draftTrackId, patch));
        /* Straight into the real panel, which is where the file goes — the
           draft has no upload control, because there is no row to hang a key
           on until this moment. */
        if (ok) { setDraftTrack(false); setOpenTrack(draftTrackId); }
        return ok;
      }}
      onUpload={() => Promise.resolve(false)}
      onArchive={() => Promise.resolve(false)}
      onRevert={() => undefined}
    />
  );

  const cardDraft = draftCard && free !== null && (
    <Lightbox
      title={`New card · ${free}`}
      open
      onOpenChange={(next) => { if (!next) setDraftCard(false); }}
      closeLabel="Close"
    >
      <p className="musie-note">
        Nothing is written until you press Create.
      </p>

      <Field
        label="Code"
        value={free}
        readOnly
        description="The lowest code nobody has taken. It cannot be changed afterwards, and it is never offered again — a printed QR encodes it."
      />

      <Picker
        label="Square"
        value={draftCell}
        options={[
          { value: '', label: '— not on the grid —' },
          ...CELLS.map((cell) => {
            const occupant = cardAt(cell);
            return {
              value: cellId(cell),
              label: `${cell.valence}, ${cell.arousal}${occupant === undefined ? '' : ` (held by ${occupant.code})`}`,
            };
          }),
        ]}
        disabled={busy}
        onChange={setDraftCell}
      />

      <CtaButton
        variant="primary"
        loading={busy}
        loadingLabel="Creating"
        onClick={() => {
          const target = draftCell === '' ? null : parseCellId(draftCell);
          const problems = validateCard(
            { code: free, valence: target?.valence ?? null, arousal: target?.arousal ?? null },
            everUsedCodes,
          );
          if (problems.length > 0) { setToast(problems[0]); return; }

          void run(`${free} created`, async () => {
            /* One card per cell is a unique constraint, so whoever is standing
               there has to step off first. */
            const occupant = target === null ? undefined : cardAt(target);
            if (occupant !== undefined) {
              await saveCard(occupant.id, { valence: null, arousal: null });
            }
            await saveCard(free.toLowerCase(), {
              code: free,
              valence: target?.valence ?? null,
              arousal: target?.arousal ?? null,
            });
          }).then((ok) => { if (ok) setDraftCard(false); });
        }}
      >
        Create {free}
      </CtaButton>
    </Lightbox>
  );

  /* ── THE LOG ────────────────────────────────────────────────────────────── */

  const log = (
    <>
      <p className="musie-note">
        Everything, newest first. Reverting appends a line rather than removing one,
        so this never looks like it has been edited — because it never has been.
      </p>
      <History edits={deck.edits} onRevert={revert} busy={busy} />
      <CtaButton
        variant="secondary"
        size="min"
        onClick={() => {
          void listHistory({ limit: 500 }).then((edits) => {
            setDeck((current) => (current === null ? current : { ...current, edits }));
          });
        }}
      >
        Load more
      </CtaButton>
    </>
  );

  /* ── THE WHOLE THING ────────────────────────────────────────────────────── */

  return (
    <div className="musie-maintenance">
      <div className="musie-maintenance__head">
        <h1 className="musie-placeholder">Maintenance</h1>

        {/* The label IS the tooltip — `IconButton` shows it on hover and gives
            it to a screen reader as the button's name, so the two cannot say
            different things. `MusyTooltipProvider` is already mounted in
            AppShell, above every route. */}
        <div className="musie-maintenance__undo">
          <IconButton
            glyph={Undo2}
            tooltip
            size="min"
            variant="secondary"
            disabled={busy || undoTarget === null}
            label={undoTarget === null
              ? 'Nothing to undo'
              : `Undo ${describe(undoTarget)}`}
            onClick={() => { if (undoTarget !== null) revert(undoTarget.id); }}
          />
          <IconButton
            glyph={Redo2}
            tooltip
            size="min"
            variant="secondary"
            disabled={busy || redoTarget === null}
            label={redoTarget === null || redoneEdit === null
              ? 'Nothing to redo'
              : `Redo ${describe(redoneEdit)}`}
            onClick={() => { if (redoTarget !== null) revert(redoTarget.id); }}
          />
        </div>
      </div>

      <SegmentedControl
        name="maintenance-view"
        legend="What to work on"
        /* A glyph is REQUIRED on a segmented option, and it is the part that
           survives a narrow viewport where the label is clipped. */
        options={[
          { value: 'music', label: 'Music', glyph: Music },
          { value: 'artwork', label: 'Artwork', glyph: Image },
          { value: 'cards', label: 'Cards', glyph: Layers },
          { value: 'grid', label: 'Grid', glyph: LayoutGrid },
          { value: 'log', label: 'Log', glyph: Clock },
        ]}
        value={view}
        onValueChange={(next) => setView(next as View)}
      />

      {view === 'grid' && grid}
      {view === 'music' && music}
      {view === 'artwork' && artwork}
      {view === 'cards' && cards}
      {view === 'log' && log}

      {cellPanel}
      {trackPanel}
      {artworkPanel}
      {cardPanel}
      {trackDraft}
      {cardDraft}

      <Toast label={toast} onDismiss={() => setToast(null)} dismissLabel="Dismiss" />
    </div>
  );
}

/* ═══ THE MUSIC FORM ════════════════════════════════════════════════════════ */

/**
 * The biggest of the three forms, and the only one holding three kinds of
 * field at once — so it groups them rather than running them together.
 *
 * Ben, 2026-10-14: *display all the music metadata and make it editable.* All
 * of it is here. Two of the fields are not editable and are shown as facts
 * instead, each saying why: a duration is measured off the file, and the id
 * and the key are the server's because they are deliberately opaque.
 */
function TrackPanel(props: {
  track: MaintenanceTrack;
  cells: MaintenanceCell[];
  cards: MaintenanceCard[];
  edits: ContentEdit[];
  busy: boolean;
  /** A draft: nothing exists in the database until Save. */
  isNew?: boolean;
  onClose: () => void;
  onSave: (patch: Patch) => Promise<boolean>;
  onUpload: (file: File, durationSeconds: number) => Promise<boolean>;
  onArchive: (archived: boolean) => Promise<boolean>;
  onRevert: (editId: string) => void;
}): React.ReactElement {
  const { track } = props;
  const [draft, setDraft] = React.useState(track);
  const [fromFile, setFromFile] = React.useState<string[]>([]);
  const [problems, setProblems] = React.useState<string[]>([]);

  React.useEffect(() => { setDraft(track); setFromFile([]); }, [track]);

  const set = (patch: Partial<MaintenanceTrack>): void =>
    setDraft((current) => ({ ...current, ...patch }));

  const number = (value: string): number | null => {
    const parsed = Number.parseInt(value, 10);
    return value.trim() === '' || !Number.isInteger(parsed) ? null : parsed;
  };

  /** Which cards hear this piece — the sentence `Retire` has to be able to say. */
  const hearing = props.cells
    .map((cell) => props.cards.find((card) =>
      card.valence === cell.valence && card.arousal === cell.arousal && card.archived_at === null))
    .filter((card): card is MaintenanceCard => card !== undefined)
    .map((card) => card.code);

  const save = (): void => {
    const found = validateTrack({
      title: draft.title,
      artist: draft.artist,
      album: draft.album,
      releaseYear: draft.release_year,
      tempoBpm: draft.tempo_bpm,
      licenceType: draft.licence_type,
      /* NULL where there is no file. A piece with no recording is ordinary —
         five of the nine are — and `validateTrack` reads a zero as a
         measurement that failed, which for a draft would be a sentence about
         a broken upload that never happened. */
      durationSeconds: draft.src === null ? null : draft.duration_seconds,
    });
    setProblems(found);
    if (found.length > 0) return;

    void props.onSave({
      title: draft.title,
      artist: draft.artist,
      album: draft.album,
      release_year: draft.release_year,
      tempo_bpm: draft.tempo_bpm,
      mood_note: draft.mood_note,
      licence_type: draft.licence_type,
      catalogue_ref: draft.catalogue_ref,
      licence_ref: draft.licence_ref,
    });
  };

  /**
   * ── THE FILE FILLS IN ITS OWN FORM ────────────────────────────────────────
   * The tags are read in the browser and used only where the field is still
   * empty — nothing already typed is overwritten — and what came from the file
   * is listed underneath, so a guess never looks like a decision. A studio's
   * export is as likely to say `Untitled (Master) v3` as it is to say the
   * truth.
   */
  const choose = async (file: File): Promise<void> => {
    const tags = readAudioTags(await readHead(file));
    const taken: string[] = [];
    const patch: Partial<MaintenanceTrack> = {};

    const offer = <K extends keyof MaintenanceTrack>(
      key: K, value: MaintenanceTrack[K] | null, label: string,
    ): void => {
      if (value === null) return;
      const current = draft[key];
      const empty = current === null || current === '' || current === 'Untitled' || current === 'Unknown';
      if (!empty) return;
      patch[key] = value;
      taken.push(label);
    };

    offer('title', tags.title as MaintenanceTrack['title'], 'title');
    offer('artist', tags.artist as MaintenanceTrack['artist'], 'artist');
    offer('album', tags.album, 'album');
    offer('release_year', tags.year, 'year');
    offer('tempo_bpm', tags.tempoBpm, 'tempo');

    set(patch);
    setFromFile(taken);

    /* The duration is the platform decoder's, never typed, and the function
       clamps it. A file it cannot decode is refused here rather than uploaded
       and then wondered about. */
    try {
      const measured = await measureDuration(file);
      await props.onUpload(file, measured);
    } catch (thrown: unknown) {
      setProblems([thrown instanceof Error ? thrown.message : String(thrown)]);
    }
  };

  return (
    <Lightbox
      title={props.isNew === true
        ? `New piece · ${track.id}`
        : (draft.title === '' ? track.id : draft.title)}
      open
      onOpenChange={(next) => { if (!next) props.onClose(); }}
      closeLabel="Close"
    >
      {props.isNew === true && (
        <p className="musie-note">
          Nothing is written until you press Create. A piece with no file is
          ordinary — five of the nine are, and the listen step runs its clock
          instead. Upload the audio once it exists.
        </p>
      )}
      {problems.length > 0 && (
        <Message
          variant="error"
          headline="Not saved"
          text={problems.join(' ')}
          statusWord="Refused"
          onDismiss={() => setProblems([])}
          dismissLabel="Dismiss"
        />
      )}

      <ContentBox headline="The credit" headingLevel={3}>
        <Field label="Title" value={draft.title} required
          onValueChange={(value) => set({ title: value })} />
        <Field label="Artist" value={draft.artist} required
          onValueChange={(value) => set({ artist: value })} />
        <Field label="Album" value={draft.album ?? ''}
          onValueChange={(value) => set({ album: value === '' ? null : value })} />
        <Field label="Release year" value={draft.release_year === null ? '' : String(draft.release_year)}
          onValueChange={(value) => set({ release_year: number(value) })} />
      </ContentBox>

      <ContentBox headline="The sound" headingLevel={3}>
        <Field
          label="Tempo (bpm)"
          value={draft.tempo_bpm === null ? '' : String(draft.tempo_bpm)}
          description="Sorts the library calmest first. A proxy for how activating a piece is, not a measurement of it."
          onValueChange={(value) => set({ tempo_bpm: number(value) })}
        />
        <Field label="Mood note" value={draft.mood_note ?? ''} multiline rows={2}
          description="Yours, in English. Never shown to a listener."
          onValueChange={(value) => set({ mood_note: value === '' ? null : value })} />
      </ContentBox>

      {/* The two columns that answer *what are we allowed to do with this*.
          `licence_ref` was carrying both the identifier and the terms —
          20260921160000 — and this is the split. */}
      <ContentBox headline="The licence" headingLevel={3}>
        <Picker
          label="Type"
          value={draft.licence_type ?? ''}
          options={[
            { value: '', label: '— not recorded —' },
            ...LICENCE_TYPES.map((type) => ({ value: type, label: type.replace('_', ' ') })),
          ]}
          onChange={(value) => set({ licence_type: value === '' ? null : value })}
        />
        <Field label="Catalogue number or ISRC" value={draft.catalogue_ref ?? ''}
          onValueChange={(value) => set({ catalogue_ref: value === '' ? null : value })} />
        <Field label="Licence note" value={draft.licence_ref ?? ''} multiline rows={2}
          onValueChange={(value) => set({ licence_ref: value === '' ? null : value })} />
      </ContentBox>

      {props.isNew !== true && (
      <ContentBox headline="The file, and what cannot be typed" headingLevel={3}>
        <Fact label="Duration">
          {track.src === null ? 'no file' : `${seconds(track.duration_seconds)} · measured`}
        </Fact>
        <Fact label="Key">{track.src ?? '—'}</Fact>
        <Fact label="Id">{track.id}</Fact>
        <Fact label="On">
          {props.cells.length === 0
            ? 'no squares'
            : `${props.cells.length} square(s)${hearing.length > 0 ? ` — ${hearing.join(', ')}` : ''}`}
        </Fact>

        <label className="musie-file">
          <span>{track.src === null ? 'Upload the audio' : 'Replace the audio'}</span>
          <input
            type="file"
            accept={AUDIO_ACCEPT}
            disabled={props.busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file !== undefined) void choose(file);
            }}
          />
        </label>
        {fromFile.length > 0 && (
          <p className="musie-note">Read from the file: {fromFile.join(', ')}. Change anything that is wrong.</p>
        )}
      </ContentBox>
      )}

      <div className="musie-toolrow">
        <CtaButton variant="primary" loading={props.busy} loadingLabel="Saving" onClick={save}>
          {props.isNew === true ? 'Create' : 'Save'}
        </CtaButton>
        {props.isNew !== true && (
        <CtaButton
          variant="secondary"
          loading={props.busy}
          loadingLabel="…"
          onClick={() => {
            const archived = track.archived_at === null;
            if (archived && props.cells.length > 0 && !window.confirm(
              `This piece sits on ${props.cells.length} square(s)` +
              `${hearing.length > 0 ? ` — retiring it leaves ${hearing.join(', ')} silent` : ''}. Retire it?`,
            )) return;
            void props.onArchive(archived);
          }}
        >
          {track.archived_at === null ? 'Retire this piece' : 'Bring it back'}
        </CtaButton>
        )}
      </div>

      {props.isNew !== true && (
        <ContentBox headline="What changed here" headingLevel={3}>
          <History edits={props.edits} onRevert={props.onRevert} busy={props.busy} />
        </ContentBox>
      )}
    </Lightbox>
  );
}

/* ═══ THE ARTWORK FORM ══════════════════════════════════════════════════════ */

function ArtworkPanel(props: {
  artwork: MaintenanceArtwork;
  cells: MaintenanceCell[];
  cards: MaintenanceCard[];
  edits: ContentEdit[];
  busy: boolean;
  onClose: () => void;
  onSave: (patch: Patch) => Promise<boolean>;
  onUpload: (file: Blob) => Promise<boolean>;
  onArchive: (archived: boolean) => Promise<boolean>;
  onRevert: (editId: string) => void;
}): React.ReactElement {
  const { artwork } = props;
  const [altDe, setAltDe] = React.useState(artwork.alt_de ?? '');
  const [altEn, setAltEn] = React.useState(artwork.alt_en ?? '');
  const [problems, setProblems] = React.useState<string[]>([]);

  React.useEffect(() => {
    setAltDe(artwork.alt_de ?? '');
    setAltEn(artwork.alt_en ?? '');
  }, [artwork]);

  const showing = props.cells
    .map((cell) => props.cards.find((card) =>
      card.valence === cell.valence && card.arousal === cell.arousal && card.archived_at === null))
    .filter((card): card is MaintenanceCard => card !== undefined)
    .map((card) => card.code);

  return (
    <Lightbox
      title={artwork.id}
      open
      onOpenChange={(next) => { if (!next) props.onClose(); }}
      closeLabel="Close"
    >
      {problems.length > 0 && (
        <Message variant="error" headline="Not saved" text={problems.join(' ')}
          statusWord="Refused" onDismiss={() => setProblems([])} dismissLabel="Dismiss" />
      )}

      <img
        src={contentImageUrl(artwork.src)}
        alt={artwork.alt_en ?? ''}
        className="musie-artwork__preview"
      />

      <label className="musie-file">
        <span>Replace the picture</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={props.busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file === undefined) return;
            /* Resized to 768² WebP before it leaves the browser — the size
               20260924140000 worked out as 4× the largest slot a card gives
               an image. */
            void resizeArtwork(file)
              .then((resized) => props.onUpload(resized))
              .catch((thrown: unknown) => setProblems([
                thrown instanceof Error ? thrown.message : String(thrown),
              ]));
          }}
        />
      </label>

      {/* The only translated copy left in the deck. Both locales or neither:
          null in both is data, null in one is a dropped translation, which is
          what `missing_translations` reports. */}
      <ContentBox headline="Alt text" headingLevel={3}
        text="Written in both languages or in neither. It is read out by a screen reader when somebody chooses this card.">
        <Field label="German" value={altDe} onValueChange={setAltDe} />
        <Field label="English" value={altEn} onValueChange={setAltEn} />
      </ContentBox>

      <Fact label="Key">{artwork.src}</Fact>
      <Fact label="On">
        {props.cells.length === 0
          ? 'no squares'
          : `${props.cells.length} square(s)${showing.length > 0 ? ` — ${showing.join(', ')}` : ''}`}
      </Fact>

      <div className="musie-toolrow">
        <CtaButton
          variant="primary"
          loading={props.busy}
          loadingLabel="Saving"
          onClick={() => {
            const found = validateArtwork({
              src: artwork.src,
              altDe: altDe === '' ? null : altDe,
              altEn: altEn === '' ? null : altEn,
            });
            setProblems(found);
            if (found.length > 0) return;
            void props.onSave({
              alt_de: altDe === '' ? null : altDe,
              alt_en: altEn === '' ? null : altEn,
            });
          }}
        >
          Save
        </CtaButton>
        <CtaButton
          variant="secondary"
          loading={props.busy}
          loadingLabel="…"
          onClick={() => {
            const archived = artwork.archived_at === null;
            if (archived && props.cells.length > 0 && !window.confirm(
              `This picture sits on ${props.cells.length} square(s)` +
              `${showing.length > 0 ? ` — retiring it leaves ${showing.join(', ')} with no picture` : ''}. Retire it?`,
            )) return;
            void props.onArchive(archived);
          }}
        >
          {artwork.archived_at === null ? 'Retire this picture' : 'Bring it back'}
        </CtaButton>
      </div>

      <ContentBox headline="What changed here" headingLevel={3}>
        <History edits={props.edits} onRevert={props.onRevert} busy={props.busy} />
      </ContentBox>
    </Lightbox>
  );
}
