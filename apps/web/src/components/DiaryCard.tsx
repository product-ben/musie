/**
 * ONE ENTRY, IN THREE STATES.
 *
 * Extracted from `routes/DiaryEntry.tsx` on 2026-09-21 (Ben) so that a diary
 * entry is the SAME card wherever it appears. Before this it existed once, in
 * the lightbox, and /diary drew a lighter lookalike of it with a link — two
 * renderings of one thing, which is how they drift.
 *
 * The three states, and only the first two live here:
 *
 *   preview   a row in the Timeline's LinkList. Not this component.
 *   inline    this card, in the page, for the newest entry. Collapsible.
 *   lightbox  this card, in the overlay at /diary/:id.
 *
 * ── WHAT DIFFERS BETWEEN INLINE AND LIGHTBOX IS TWO PROPS ─────────────────
 * `headingLevel`, because the outline above the card is not the same in both:
 * inside the lightbox the dialog's own title is the h2, so the card is h3;
 * on /diary the page title is the h1 and the card is h2. The box has never
 * guessed this and does not start now (§7.9, 1.3.1).
 *
 * `onDismiss`, which decides whether the card draws a close control at all.
 * The lightbox passes none — `Lightbox` renders its own X, wired to Escape,
 * the scrim and Back, and a second one inside it would be a second thing to
 * keep in step. Inline there is no dialog to close, so the card draws the X
 * itself and collapsing is all it does.
 */
import * as React from 'react';
import { useNavigate } from 'react-router';
import { Trash2, X } from 'lucide-react';
import {
  Badge, BadgeRow, ButtonGroup, ContentBox, ContentList, CtaButton, IconButton,
  Message, TrackButton,
} from '@musie/design-system';
import type { ContentListItem } from '@musie/design-system';
import { useLocale, useT } from '../i18n/localeContext';
import { deleteSession } from '../lib/session';
import { durationMinutes, formatDateTime, stepMessageKey } from '../lib/diary';
import { useTrackSource } from '../lib/audio';
import type { DiaryEntryDetail, DiaryTrack } from '../lib/diary';

export interface DiaryCardProps {
  entry: DiaryEntryDetail;
  /** Never guessed. h3 under a lightbox title, h2 under a page title. */
  headingLevel: 2 | 3;
  /** Present ⇒ the card draws its own close control. Omit inside a Lightbox. */
  onDismiss?: () => void;
  /** The close control's whole accessible name. Required when `onDismiss` is. */
  dismissLabel?: string;
}

export function DiaryCard({ entry, headingLevel, onDismiss, dismissLabel }: DiaryCardProps) {
  const t = useT();
  const { locale } = useLocale();
  const navigate = useNavigate();

  /**
   * DELETION, AND ITS CONFIRMATION, INLINE.
   *
   * Not a second Lightbox. This box is already inside one, and a dialog over a
   * dialog is where focus management stops being base-ui's problem and starts
   * being ours. The confirm replaces the box's own controls with a `Message`
   * carrying the two answers, so the decision happens where the thing being
   * decided about is on screen.
   *
   * It IS confirmed, though `Ben` asked only for the button: the row and its
   * reflection go for good — `reflections` cascades — and BUILD-PLAN G.2 says
   * deletion is confirmed for exactly that reason. A one-tap irreversible
   * delete on a diary is the wrong default.
   */
  const [confirming, setConfirming] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function remove() {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteSession(entry.id);
      /* A FRESH NAVIGATION, not `useCloseOverlay`'s history pop. Going back
         would restore the diary exactly as it was — including the row that no
         longer exists — because the list is kept mounted beneath this overlay
         and its read is keyed on the arrival, not on a clock. Arriving anew
         is what makes it re-read. See `useDiary`. */
      navigate('/diary', { replace: true });
    } catch (thrown: unknown) {
      console.error('[musie] could not delete the session:', thrown);
      setDeleting(false);
      setConfirming(false);
    }
  }

  const minutes = durationMinutes(entry.startedAt, entry.endedAt);
  const abandoned = entry.status === 'abandoned';

  /**
   * The labelled facts, in the order a person asks for them: when, how long,
   * and what was drawn.
   *
   * BUILT, NOT WRITTEN OUT, because two of the three can be absent and an
   * absent fact must not leave an empty row. A card is ordinary to lack — two
   * of the three exercises draw none — and a duration is unknowable when the
   * timestamps cannot be subtracted, which is the one thing `durationMinutes`
   * returns null to say.
   *
   * THE DURATION IS SHOWN FOR AN ABANDONED SESSION TOO, which is the opposite
   * of what /diary does, on purpose. The list withholds it because a duration
   * for a run that was walked away from measures the gap before the tab was
   * closed, and in a one-line row it would read as how long the session took.
   * Here it cannot: it sits under an *Unfinished* badge and beside *Stopped at
   * Listen*, which is the context the row lacked — and this screen's brief is
   * everything known about the session.
   */
  const facts: ContentListItem[] = [
    { label: t('diary.when'), content: formatDateTime(entry.startedAt, locale) },
  ];
  if (minutes !== null) {
    facts.push({
      label: t('diary.howLong'),
      content: t('diary.duration', { minutes: String(minutes) }),
    });
  }
  if (entry.cardFeeling !== null) {
    facts.push({ label: t('diary.card'), content: entry.cardFeeling });
  }

  /* The box, and nothing around it. The lightbox's own title is the h2 inside
     the popup, so the box is h3 and the answer inside it h4 — the same two
     levels the Timeline's day heading used to leave room for, now left by the
     dialog title instead. */
  return (
    <ContentBox
      headline={entry.exerciseName}
      headingLevel={headingLevel}
      /* The exercise's own description: prose about the exercise, so the
         box's text slot rather than a `<dl>` row labelled with a name
         the heading has already said. */
      text={entry.exerciseDescription}
      /* `header` present ⇒ the box renders framed, and the full-bleed
         hairline then divides what this entry IS from what is known
         about it. That division is the design, not decoration. */
      header={
        /* A NON-STATUS variant, deliberately. Badge's `info` / `success`
           fills each inject a screen-reader status word from the locale
           catalogue ahead of the label — "Erfolg: Beendet" — and this
           screen has no key to override it with. A diary fact is not a
           success message. The two states are told apart by their words,
           which are text, so 1.4.1 never rests on the fill.

           IN A `BadgeRow`, THOUGH THERE IS ONE BADGE, and that is
           measured rather than tidy. `.musy-box__header` is a flex
           column, so a lone `.musy-badge` — `inline-flex`, sized to its
           text — is stretched edge to edge by the default `align-items:
           stretch` and renders as a full-width bar. BadgeRow is the
           wrapper ContentBox's own header comment names, and it lays
           its badges out at their natural width.

           The cost is a `<ul>` of one, announced as "list, 1 item". The
           fix that would avoid it is an `align-self` inside the design
           system, which is exactly the kind of thing a screen must not
           reach in and set (L14, L7). Logged as a gap. */
        <div className="musie-entry__head">
          <BadgeRow>
            <Badge variant={abandoned ? 'outline' : 'primary-subtle'}>
              {t(abandoned ? 'session.status.abandoned' : 'session.status.finished')}
            </Badge>
          </BadgeRow>

          {/* COLLAPSE, not close: inline there is no overlay to dismiss, and
              the card becomes the preview row it sits above. Rendered only
              when the host asked for it — the lightbox has its own X, which
              Escape, the scrim and Back all share, and a second control inside
              it would be a second thing to keep in step.

              `tooltip={false}`: an X in a card header is the case IconButton's
              own docs name for suppressing it. */}
          {onDismiss !== undefined && dismissLabel !== undefined && (
            <IconButton
              glyph={X}
              label={dismissLabel}
              variant="ghost"
              size="primary"
              tooltip={false}
              onClick={onDismiss}
            />
          )}
        </div>
      }
    >
      {/* Where it stopped — a value sentence with no label written for
          it, so a line and not a row. Only an unfinished session has
          one: for a finished session the step it ended on is `reflect`
          every time, which says nothing. */}
      {abandoned && (
        <p className="musie-note">
          {t('diary.stoppedAt', { step: t(stepMessageKey(entry.step)) })}
        </p>
      )}

      {/* No `label`: it is optional here and has NO catalogue default,
          so omitting it leaks nothing, and every written label in the
          set is already the name of a row rather than of the list. */}
      <ContentList items={facts} emptyLabel={t('content.empty')} />

      {/* The recording, offered back — above the answer, so the control
          is in reach while the answer is being read, which is the whole
          of the designer's "listen again while reading what he/she
          wrote". Rendered ONLY when there is a track. */}
      {entry.track !== null && <ListenAgain track={entry.track} />}

      {/* The answer, in its own box: it is prose the person wrote, not a
          fact about the session, and a sunken box says that without a
          new class. `diary.yourAnswer` is its heading. A voice answer is
          here too, as the transcript the reflect step stored; nothing
          else was ever kept. */}
      {entry.reflection !== null && (
        <ContentBox
          headline={t('diary.yourAnswer')}
          headingLevel={(headingLevel + 1) as 3 | 4}
          text={entry.reflection.body}
          outline="sunken"
        />
      )}

      {confirming ? (
        <Message
          variant="warning"
          /* 'assertive': it was injected by an action and it is asking a
             question that has to be answered before anything else. L11. */
          live="assertive"
          headingLevel={(headingLevel + 1) as 3 | 4}
          headline={t('diary.delete.confirm')}
          text={t('diary.delete.text')}
          action={
            <ButtonGroup align="end">
              <CtaButton variant="ghost" onClick={() => setConfirming(false)}>
                {t('common.cancel')}
              </CtaButton>
              <CtaButton
                variant="secondary"
                loading={deleting}
                loadingLabel={t('content.loading')}
                onClick={() => void remove()}
              >
                {t('diary.delete.yes')}
              </CtaButton>
            </ButtonGroup>
          }
        />
      ) : (
        /* One icon, at the trailing edge, quiet. Deleting is something a
           person is entitled to do to their own record and is not what they
           came to this screen for — so it is present and does not compete
           with reading. The label is the whole accessible name; IconButton
           reuses it as the tooltip, so the two cannot disagree. */
        <ButtonGroup align="end">
          <IconButton
            glyph={Trash2}
            label={t('diary.delete')}
            variant="ghost"
            size="primary"
            onClick={() => setConfirming(true)}
          />
        </ButtonGroup>
      )}
    </ContentBox>
  );
}

/**
 * Listen again — the one control on this screen that does something.
 *
 * ── TrackButton, NOT MusicPlayer, AND THE GRANT DECIDED IT ─────────────────
 * `MusicPlayer.title` is REQUIRED and VISIBLE: it renders in
 * `.musy-mplayer__title` and goes into the play button's accessible name as
 * "Abspielen: <title>". This screen cannot name the track — `tracks.title` and
 * `tracks.artist` are not granted to the client at all, and asking for either
 * fails the request rather than returning null — so the only things it could
 * pass are a fabricated title or the action word twice. TrackButton is built
 * for exactly this case: its `label` is ANNOUNCED and never shown, and the
 * visible label is the verb. Its own header says so — "the flows this button
 * exists for withhold the track name on purpose".
 *
 * It is also the right shape twice over. A diary entry is a re-listen, not a
 * study: nobody needs to scrub to 2:14 of something they have already heard,
 * and a player with a scrubber under a paragraph of someone's own writing is a
 * second row of chrome outweighing the thing it controls. One pill that says
 * the action and counts down is the whole control.
 *
 * ── THE APP HOLDS THE MEDIA ELEMENT ────────────────────────────────────────
 * TrackButton is fully controlled and owns no `<audio>`, no fetch and no
 * timer, which is the split MusicPlayer.tsx documents: the consuming app holds
 * the media element and feeds `position` back. So the `<audio>` is here. It
 * carries no class and no styling — it is a media element, not a pattern, and
 * L14 has nothing to say about it.
 *
 * `preload="none"`: a diary entry that is being read is not a track that is
 * being played, and a page that fetches four minutes of audio nobody asked for
 * spends somebody's data. The element's own events are the source of truth for
 * `playing`, rather than a flag flipped on click — the browser can pause
 * playback without asking (a phone call, another tab claiming the audio
 * session), and a hopeful boolean would leave a Pause glyph over silence.
 *
 * ── THE STRINGS, AND THE ONE DEFAULT THAT IS NOT A LEAK ────────────────────
 * `label` is `diary.listenAgain`, which is what the app owns and what the
 * catalogue entry was written for. The three transport verbs — play, pause,
 * replay — are left to the package's locale catalogue, driven per-locale by
 * the `MusyLocaleProvider` main.tsx mounts. That is not rule 7's leaked
 * default: the app has ONE key here and the button needs THREE words, so
 * passing `diary.listenAgain` to all three would make the pause button say
 * "Listen again" while playing. The catalogue is the floor under the strings a
 * screen cannot pass, in the right language, which is what src/locale.ts
 * exists for.
 *
 * ── IT RENDERS ONLY WHEN THERE IS A TRACK ──────────────────────────────────
 * `sessions.track_id` is nullable and mostly null — no session WRITES it yet
 * (E.4) — so for most entries `entry.track` is null and this block is simply
 * absent, which is honest: a disabled control would promise a recording that
 * is not there. Where a row does carry one, the button appears and counts
 * down. (An earlier note here claimed the column was null for EVERY row and
 * that this never rendered. It is not: the local stack has rows with a
 * track_id and the control draws.)
 *
 * SINCE E.4 THE FILES EXIST, for four of the nine cards. `track.src` is an
 * object key signed on mount; where it is NULL there is no recording and this
 * block renders nothing at all, which is the same honesty as before by a
 * different route — absence stated by the schema rather than discovered by a
 * browser failing to load a path. `play()`'s catch still stands, because a
 * signed URL can expire and a codec can still be refused.
 */
function ListenAgain({ track }: { track: DiaryTrack }) {
  const t = useT();
  const media = React.useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [position, setPosition] = React.useState(0);
  const { url } = useTrackSource(track.src);

  /* NOTHING TO OFFER, SO NOTHING IS DRAWN. Either the row has no recording
     (`src` null — five of the nine cards) or the signed URL did not come
     back. A TrackButton with no file behind it is a promise the diary cannot
     keep, and this screen's whole posture is that an absent control says more
     than a disabled one. */
  if (url === null) return null;

  /* `play()` rejects when the browser refuses — no gesture it trusts, a
     missing file, a codec it will not decode. Logged, and nothing else: no
     event fires, so `playing` stays false and the glyph stays Play, which is
     the truth. Swallowing it silently would leave a control that does nothing
     and says nothing about why. */
  function play() {
    const element = media.current;
    if (element === null) return;
    element.play().catch((thrown: unknown) => {
      console.error(`[musie] could not play ${track.id}:`, thrown);
    });
  }

  return (
    <>
      <audio
        ref={media}
        src={url}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
        /* Pinned to the FULL duration rather than left wherever the last
           timeupdate landed: that is what puts TrackButton into its `ended`
           state, where the glyph becomes a replay arrow — so "it finished" and
           "it never started" are not the same picture. */
        onEnded={() => setPosition(track.durationSeconds)}
      />
      <TrackButton
        label={t('diary.listenAgain')}
        duration={track.durationSeconds}
        position={position}
        playing={playing}
        onTogglePlay={() => {
          const element = media.current;
          if (element === null) return;
          if (element.paused) play();
          else element.pause();
        }}
        onRestart={() => {
          const element = media.current;
          if (element === null) return;
          element.currentTime = 0;
          /* Set here as well as by the seek: `timeupdate` is throttled, and
             one frame of a replay arrow over a restarted track is a frame
             where the control contradicts itself. */
          setPosition(0);
          play();
        }}
      />
    </>
  );
}
