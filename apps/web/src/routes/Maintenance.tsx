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
import { Clock, Image, LayoutGrid, Layers, Music } from 'lucide-react';
import {
  Badge,
  ContentBox,
  CtaButton,
  Field,
  Lightbox,
  Message,
  SegmentedControl,
  Toast,
} from '@musie/design-system';
import {
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
import { measureDuration, readHead, resizeArtwork } from '../lib/mediaFile';
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
  const [view, setView] = React.useState<View>('grid');
  const [toast, setToast] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

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

  /** Which cells a track or artwork sits on — the "archiving this costs" list. */
  const cellsUsing = (kind: 'track' | 'artwork', id: string): MaintenanceCell[] =>
    deck.cells.filter((cell) => (kind === 'track' ? cell.track_id : cell.artwork_id) === id);

  const editsFor = (entity: string, rowId: string): ContentEdit[] =>
    deck.edits.filter((edit) => edit.entity === entity && edit.row_id === rowId);

  const revert = (editId: string): void => {
    void run('Reverted', () => revertEdit(editId));
  };

  /* ── THE GRID ───────────────────────────────────────────────────────────── */

  const grid = (
    <>
      <p className="musie-note">
        Valence across, arousal up. A card plays whatever music sits on its square
        and shows whatever picture sits there. The same piece may sit on several
        squares; an empty square is a silent card, which is ordinary.
      </p>
      <div className="musie-grid" role="group" aria-label="The valence and arousal grid">
        {CELLS.map((cell) => {
          const held = cellAt(cell);
          const card = cardAt(cell);
          const track = trackById(held?.track_id ?? null);
          const artwork = artworkById(held?.artwork_id ?? null);
          return (
            <button
              key={cellId(cell)}
              type="button"
              className="musie-grid__cell"
              aria-label={`Valence ${cell.valence}, arousal ${cell.arousal}`}
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

  const music = (
    <>
      <div className="musie-toolrow">
        <CtaButton
          variant="primary"
          size="min"
          loading={busy}
          loadingLabel="Adding"
          onClick={() => {
            const id = nextId('trk', deck.tracks.map((t) => t.id));
            void run('Piece added', () => saveTrack(id, { title: 'Untitled', artist: 'Unknown' }))
              .then((ok) => { if (ok) setOpenTrack(id); });
          }}
        >
          Add a piece
        </CtaButton>
        <span className="musie-note">
          {liveTracks.length} live, {deck.tracks.length - liveTracks.length} retired. Sorted
          calmest first where a tempo is known.
        </span>
      </div>

      <ul className="musie-rows">
        {[...deck.tracks]
          .sort((a, b) => (a.tempo_bpm ?? 9999) - (b.tempo_bpm ?? 9999)
            || a.title.localeCompare(b.title))
          .map((track) => (
            <li key={track.id}>
              <button type="button" className="musie-row" onClick={() => setOpenTrack(track.id)}>
                <span className="musie-row__name">
                  {track.title}
                  {track.archived_at !== null && <Badge variant="neutral" hideIcon>retired</Badge>}
                </span>
                <span className="musie-row__meta">
                  {track.artist}
                  {track.tempo_bpm !== null && ` · ${track.tempo_bpm} bpm`}
                  {track.src === null ? ' · no file' : ` · ${seconds(track.duration_seconds)}`}
                  {` · ${cellsUsing('track', track.id).length} square(s)`}
                </span>
              </button>
            </li>
          ))}
      </ul>
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
        onUpload={(file, durationSeconds) => run('File replaced', () => uploadMedia({
          kind: 'track', id: track.id, file, filename: file.name, durationSeconds,
        }))}
        onArchive={(archived) => run(archived ? 'Piece retired' : 'Piece restored',
          () => setArchived('track', track.id, archived))}
        onRevert={revert}
      />
    );
  })();

  /* ── ARTWORK ────────────────────────────────────────────────────────────── */

  const artwork = (
    <>
      <div className="musie-toolrow">
        <CtaButton
          variant="primary"
          size="min"
          loading={busy}
          loadingLabel="Adding"
          onClick={() => {
            const id = nextId('art', deck.artworks.map((a) => a.id));
            /* A row with a placeholder src, so the file can be uploaded onto
               it: `artworks.src` is `not null`, and a picture with no file is
               not a state worth modelling for the five minutes it lasts. */
            void run('Picture added', () => saveArtwork(id, { src: `${id}-pending` }))
              .then((ok) => { if (ok) setOpenArtwork(id); });
          }}
        >
          Add a picture
        </CtaButton>
        <span className="musie-note">{liveArtworks.length} live.</span>
      </div>

      <div className="musie-thumbs">
        {deck.artworks.map((art) => (
          <button
            key={art.id}
            type="button"
            className="musie-thumb"
            onClick={() => setOpenArtwork(art.id)}
          >
            <img src={contentImageUrl(art.src)} alt="" className="musie-thumb__img" />
            <span className="musie-thumb__name">
              {art.id}
              {art.archived_at !== null && <Badge variant="neutral" hideIcon>retired</Badge>}
            </span>
            <span className="musie-note">{cellsUsing('artwork', art.id).length} square(s)</span>
          </button>
        ))}
      </div>
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

  const cards = (
    <>
      <div className="musie-toolrow">
        <CtaButton
          variant="primary"
          size="min"
          loading={busy}
          loadingLabel="Adding"
          onClick={() => {
            if (free === null) return;
            const problems = validateCard(
              { code: free, valence: null, arousal: null }, everUsedCodes,
            );
            if (problems.length > 0) { setToast(problems[0]); return; }
            void run(`${free} added`, () => saveCard(free.toLowerCase(), { code: free }));
          }}
        >
          {free === null ? 'All 99 codes are used' : `Add ${free}`}
        </CtaButton>
        <span className="musie-note">
          {liveCards.length} live of {deck.cards.length} ever made. A code is written once
          and never reused.
        </span>
      </div>

      <ul className="musie-rows">
        {[...deck.cards].sort((a, b) => a.sort - b.sort).map((card, index, all) => (
          <li key={card.id}>
            <div className="musie-row musie-row--split">
              <button type="button" className="musie-row__main" onClick={() => setOpenCard(card.id)}>
                <span className="musie-row__name">
                  {card.code}
                  {card.archived_at !== null && <Badge variant="neutral" hideIcon>retired</Badge>}
                </span>
                <span className="musie-row__meta">
                  {card.valence === null
                    ? 'not on the grid'
                    : `square ${card.valence}, ${card.arousal}`}
                  {' · '}
                  {trackById(cellAt({ valence: card.valence ?? 0, arousal: card.arousal ?? 0 })?.track_id ?? null)?.title ?? 'no music'}
                </span>
              </button>
              <span className="musie-row__actions">
                <CtaButton
                  variant="secondary"
                  size="min"
                  loading={busy}
                  loadingLabel="…"
                  onClick={() => {
                    if (index === 0) return;
                    const order = all.map((c) => c.id);
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
                    const order = all.map((c) => c.id);
                    [order[index], order[index + 1]] = [order[index + 1], order[index]];
                    void run('Order changed', () => reorderCards(order));
                  }}
                >
                  Down
                </CtaButton>
              </span>
            </div>
          </li>
        ))}
      </ul>
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

        <CtaButton
          variant="secondary"
          loading={busy}
          loadingLabel="…"
          onClick={() => {
            const archived = card.archived_at === null;
            if (archived && !window.confirm(
              `Retire ${card.code}? Its square is freed and its code stays taken forever. ` +
              'Every diary entry that drew it keeps it.',
            )) return;
            void run(archived ? 'Card retired' : 'Card restored',
              () => setArchived('card', card.id, archived));
          }}
        >
          {card.archived_at === null ? 'Retire this card' : 'Bring it back'}
        </CtaButton>

        <ContentBox headline="What changed here" headingLevel={3}>
          <History edits={editsFor('card', card.id)} onRevert={revert} busy={busy} />
        </ContentBox>
      </Lightbox>
    );
  })();

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
      <h1 className="musie-placeholder">Maintenance</h1>

      <SegmentedControl
        name="maintenance-view"
        legend="What to work on"
        /* A glyph is REQUIRED on a segmented option, and it is the part that
           survives a narrow viewport where the label is clipped. */
        options={[
          { value: 'grid', label: 'Grid', glyph: LayoutGrid },
          { value: 'music', label: 'Music', glyph: Music },
          { value: 'artwork', label: 'Artwork', glyph: Image },
          { value: 'cards', label: 'Cards', glyph: Layers },
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
      durationSeconds: draft.duration_seconds,
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
      title={draft.title === '' ? track.id : draft.title}
      open
      onOpenChange={(next) => { if (!next) props.onClose(); }}
      closeLabel="Close"
    >
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
            accept="audio/mpeg,audio/mp4,audio/aac,audio/wav"
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

      <div className="musie-toolrow">
        <CtaButton variant="primary" loading={props.busy} loadingLabel="Saving" onClick={save}>
          Save
        </CtaButton>
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
      </div>

      <ContentBox headline="What changed here" headingLevel={3}>
        <History edits={props.edits} onRevert={props.onRevert} busy={props.busy} />
      </ContentBox>
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
