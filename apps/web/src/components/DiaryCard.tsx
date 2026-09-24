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
import { answerParagraphs, durationMinutes, formatDateTime, stepMessageKey } from '../lib/diary';
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

  /* The answer, as the lines to draw. Empty for an entry with no reflection —
     a declined one, or an abandoned run — which is the same absence the box
     below tests for, so the two cases need no branch of their own. */
  const answer = entry.reflection === null ? [] : answerParagraphs(entry.reflection);

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
    /* THE EXERCISE'S OWN DESCRIPTION, AS A ROW — Ben, 2026-09-23. It was the
       box's `text` slot: prose directly under the headline, at the top of the
       card, in front of the thing the person opened the card to read. It is
       not what this entry IS; it is a fact about the exercise the entry is of,
       which is what every other row in here already is. First in the list,
       because it is the one that says what the rest is about. */
    { label: t('diary.about'), content: entry.exerciseDescription },
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
      /* NO `text`. The description is a `<dl>` row now — see `facts`.
         ──
         `header` present ⇒ the box renders framed, and the hairline then
         divides what this entry IS from what is known about it. It is
         rendered only when there is something to put in it, which since
         2026-09-23 means only inline: the status badge moved to the foot
         of the card, beside the delete control, and what is left up here
         is the collapse control that only the inline card draws.

         So the lightbox's card is unframed, and the hairline is not
         missed — it divided the entry from its metadata, and the metadata
         is no longer the thing directly under it. */
      header={onDismiss === undefined || dismissLabel === undefined ? undefined : (
        <div className="musie-entry__head">
          {/* COLLAPSE, not close: inline there is no overlay to dismiss, and
              the card becomes the preview row it sits above. The lightbox has
              its own X, which Escape, the scrim and Back all share, and a
              second control inside it would be a second thing to keep in step.

              `tooltip={false}`: an X in a card header is the case IconButton's
              own docs name for suppressing it. */}
          <IconButton
            glyph={X}
            label={dismissLabel}
            variant="ghost"
            size="primary"
            tooltip={false}
            onClick={onDismiss}
          />
        </div>
      )}
    >
      {/* ── THE ANSWER FIRST, THEN THE TRACK, THEN THE FACTS ─────────────
          Ben, 2026-09-23. The card used to open with the labelled facts and
          reach the person's own words third, under the date, the duration and
          the card that was drawn. Nobody opens a diary entry to find out when
          it was: they open it to read what they said, and the metadata is what
          they check afterwards.

          THE ORDER OF THE FIRST TWO IS A REVERSAL, and the argument it
          overturns was a good one — *Listen again* sat ABOVE the answer so the
          control was in reach while the answer was being read, which is the
          designer's "listen again while reading what he/she wrote". It still
          is in reach: the button is one line below the box, on a card this
          short, and it is not worth putting a control in front of the writing
          it is a control for. */}

      {/* The answer, in its own box: it is prose the person wrote, not a
          fact about the session, and a sunken box says that without a
          new class. `diary.yourAnswer` is its heading. A voice answer is
          here too, as the transcript the reflect step stored; nothing
          else was ever kept.

          ── IN THE PIECES IT WAS GIVEN IN — Ben, 2026-09-24 ──────────────
          It was the box's `text` slot, which is ONE `<p>`: a spoken answer
          arrived here as four sentences glued with spaces and a typed one
          lost every line break the person pressed. The statements survive in
          `reflection_statements` and the diary was the one screen that threw
          them away again — so the card renders a paragraph per statement and
          `answerParagraphs` decides what a statement is.

          `.musie-prose` rather than four `text` props or a `<br>` run: it is
          the app's existing pattern for a column of plain paragraphs (L14).
          This is its second caller and the prose family's third, which is
          L14.3 exactly — appended to OPEN-QUESTIONS.md rather than merged
          here, because the answer is a Layer 2 component and not an app
          class. The box keeps its heading and its sunken fill; what changed
          is that the slot holds the answer instead of the text line.

          NOTHING TO SHOW IS NO BOX. A reflection row cannot have an empty
          body — `body` is `not null` — but a body of nothing but whitespace
          would otherwise draw a heading over silence. */}
      {answer.length > 0 && (
        <ContentBox
          headline={t('diary.yourAnswer')}
          headingLevel={(headingLevel + 1) as 3 | 4}
          outline="sunken"
        >
          <div className="musie-prose">
            {/* The index is in the key because two statements CAN be the same
                sentence — "Und dann?" twice is a person repeating themselves,
                not a duplicate to collapse. The list is re-read, never
                reordered in place, so the index is stable for as long as it
                is rendered. */}
            {answer.map((paragraph, index) => (
              <p key={`${String(index)}-${paragraph}`}>{paragraph}</p>
            ))}
          </div>
        </ContentBox>
      )}

      {/* The recording, offered back. Rendered ONLY when there is a track.
          The plain <div> is what makes it hug its own label instead of being
          stretched the width of the card: `.musy-box__slot` is a flex column,
          and `TrackButton` is inline-flex. */}
      {entry.track !== null && (
        <div>
          <ListenAgain track={entry.track} />
        </div>
      )}

      {/* Where it stopped — a value sentence with no label written for
          it, so a line and not a row. Only an unfinished session has
          one: for a finished session the step it ended on is `reflect`
          every time, which says nothing. With the metadata it belongs to,
          rather than at the top of the card. */}
      {abandoned && (
        <p className="musie-note">
          {t('diary.stoppedAt', { step: t(stepMessageKey(entry.step)) })}
        </p>
      )}

      {/* No `label`: it is optional here and has NO catalogue default,
          so omitting it leaks nothing, and every written label in the
          set is already the name of a row rather than of the list. */}
      <ContentList items={facts} emptyLabel={t('content.empty')} />

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
        /* ── THE STATUS AND THE DELETE CONTROL, ON ONE ROW AT THE FOOT ────
           Ben, 2026-09-23. The badge used to sit in the box's header, above
           the hairline, where it was the first thing the card said — and what
           a card in a diary says first should be what is in it, not whether
           the run that produced it reached the end.

           At the foot it is what it actually is: a fact about the session, in
           the row of things that are about the session rather than in it. The
           delete control was already alone down here, at the trailing edge and
           quiet, because deleting is something a person is entitled to do to
           their own record and is not what they came for.

           A `BadgeRow` STILL WRAPS THE ONE BADGE, and the reason survives the
           move: `.musy-badge` is inline-flex, and a lone one in a stretch
           context renders as a full-width bar. The cost is a `<ul>` of one,
           announced as "list, 1 item", and the fix that would avoid it is an
           `align-self` inside the design system — which is exactly what a
           screen must not reach in and set (L14, L7). Logged as a gap.

           NOT A `ButtonGroup` ANY MORE. That component lays out BUTTONS, and
           a badge is not one — it is a <span> with a fill and deliberately has
           no role (Badge.tsx says why). Putting a label in a group of actions
           would announce it as one. `.musie-entry__foot` is the row, under
           L14: the system has no component for "a fact and an action, at the
           trailing edge". */
        <div className="musie-entry__foot">
          <BadgeRow>
            <Badge
              variant={abandoned ? 'outline' : 'success'}
              /* THE STATUS FILL, AND THE WORD IT WOULD OTHERWISE INJECT.
                 `success` reads as what finishing a session is, and Ben asked
                 for it in those words — "this is something great". What comes
                 with the variant is a screen-reader status word before the
                 label, which would announce "Erfolg: Abgeschlossen": the
                 severity word in front of a label that is already the status,
                 said twice. An empty string is the prop's documented way to
                 drop it, and 1.4.1 still holds three times over — the variant
                 draws its own check glyph, the label is text, and the two
                 states differ in their words rather than in their fill. */
              statusWord=""
            >
              {t(abandoned ? 'session.status.abandoned' : 'session.status.finished')}
            </Badge>
          </BadgeRow>

          {/* The label is the whole accessible name; IconButton reuses it as
              the tooltip, so the two cannot disagree. */}
          <IconButton
            glyph={Trash2}
            label={t('diary.delete')}
            variant="ghost"
            size="primary"
            onClick={() => setConfirming(true)}
          />
        </div>
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
