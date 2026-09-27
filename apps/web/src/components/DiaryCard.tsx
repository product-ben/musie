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
 *
 * ══ THE 2026-09-26 ITERATION ══════════════════════════════════════════════
 *
 * Four changes, and they are one change: the card used to be a list of facts
 * with the person's own words somewhere inside it, and it is now the person's
 * words with the facts folded away behind a control.
 *
 * ── THE HEADLINE IS THE SESSION, NOT THE EXERCISE ────────────────────────
 * `Session vom 26.09.26, 10:04`. The exercise name moved down into the
 * labelled rows, where it is what it actually is: a fact ABOUT this session,
 * like the card that was drawn and how long it took.
 *
 * What that buys is identity. Three sessions of Achtsame Pause used to be
 * three cards with one headline between them, and the only thing telling them
 * apart was a *Wann* row four lines down. The diary is a record of occasions,
 * and an occasion is named by when it happened.
 *
 * The same string is the row in the timeline, the inline card's headline, the
 * lightbox card's headline and the lightbox's own accessible title — one
 * catalogue key, `diary.sessionTitle`, so the four cannot drift.
 *
 * ── THE QUESTION, THEN THE ANSWER ────────────────────────────────────────
 * The reflect step's own question, at `body-lg`, directly under the headline —
 * so the answer below it is read as an answer rather than as a paragraph that
 * starts from nowhere.
 *
 * IT IS DERIVED, NOT STORED. There is no `exercise_i18n.question` any more; it
 * was dropped on 2026-09-23 because the listen step and the reflect step ask
 * different questions on purpose. `reflectQuestionOf` in `lib/diary.ts` takes
 * the first `##` out of `reflect_md`, which is the heading the person was
 * actually looking at while they wrote. Null renders as nothing.
 *
 * ── THE FACTS ARE BEHIND A CONTROL ───────────────────────────────────────
 * *Session-Details* reveals the labelled rows and the status badge. The
 * question, the answer, the recording and the DELETE control stay on the card
 * at all times — the first three because they are what the card is for, and
 * the fourth because a destructive action hidden behind a disclosure is worse
 * than one in plain sight, not better.
 *
 * This is also half the fix for the card being CUT OFF in the lightbox. The
 * other half is in `musy-components.css` §14, where the popup was painting its
 * scrolling child through its own bottom inset; but a card that is only as
 * long as the thing you came to read is what stops the scroll happening at
 * all on a phone.
 *
 * ── *AUFGEHÖRT BEI* IS A ROW ─────────────────────────────────────────────
 * It was a quiet sentence under the answer, built from one string that held
 * the preposition and the step together. It is a `<dl>` row now, with the rest
 * of what is known about the session, which meant splitting `diary.stoppedAt`
 * into a label and leaving the step as the value: the old string as a row's
 * content would have read *Aufgehört bei: Aufgehört bei Einsteigen*.
 */
import * as React from 'react';
import { useNavigate } from 'react-router';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import {
  Badge, BadgeRow, ButtonGroup, ContentBox, ContentList, CtaButton, IconButton,
  Message, TrackButton,
} from '@musie/design-system';
import type { ContentListItem } from '@musie/design-system';
import { useLocale, useT } from '../i18n/localeContext';
import { deleteSession } from '../lib/session';
import {
  answerParagraphs, durationMinutes, formatDateTime, formatShortDateTime, stepMessageKey,
} from '../lib/diary';
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

  /**
   * THE DISCLOSURE, AND IT OPENS CLOSED EVERY TIME.
   *
   * Per card, not per screen, and not remembered across visits — Ben's call.
   * A card is a thing you open to read what you wrote; the facts are what you
   * check afterwards, and a diary that remembered you once wanted the metadata
   * would show it over your own words for ever after.
   *
   * `aria-controls` needs an id that is unique on a page that can hold two of
   * these at once (the inline card and, over it, the lightbox's). The session
   * id is the only thing here that is unique by construction.
   */
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const detailsId = `diary-details-${entry.id}`;

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
   * The labelled facts, in the order a person asks for them: which exercise,
   * what it is, when, how long, what was drawn, and — for a run that stopped —
   * where.
   *
   * BUILT, NOT WRITTEN OUT, because three of the six can be absent and an
   * absent fact must not leave an empty row. A card is ordinary to lack — two
   * of the three exercises draw none — a duration is unknowable when the
   * timestamps cannot be subtracted, and *Aufgehört bei* is meaningless for a
   * finished session, whose last step is `reflect` every time.
   *
   * THE DURATION IS SHOWN FOR AN ABANDONED SESSION TOO, which is the opposite
   * of what /diary's rows do, on purpose. The list withholds it because a
   * duration for a run that was walked away from measures the gap before the
   * tab was closed, and in a one-line row it would read as how long the
   * session took. Here it cannot: it sits beside *Aufgehört bei — Einsteigen*
   * and under an *Unfinished* badge, which is the context the row lacked.
   */
  const facts: ContentListItem[] = [
    /* FIRST, because it is the one fact the other five are about. It was the
       box's headline until 2026-09-26; the headline is the session now, and
       the exercise is a fact about it. */
    { label: t('diary.exercise'), content: entry.exerciseName },
    /* THE EXERCISE'S OWN DESCRIPTION, AS A ROW — Ben, 2026-09-23. It was the
       box's `text` slot: prose directly under the headline, at the top of the
       card, in front of the thing the person opened the card to read. It is
       not what this entry IS; it is a fact about the exercise the entry is of,
       which is what every other row in here already is. (The `text` slot now
       carries the reflect step's question, which IS what the entry is of.) */
    { label: t('diary.about'), content: entry.exerciseDescription },
    /* THE LONG FORM, where the headline carries the short one. Not a
       duplicate: the headline IDENTIFIES the session — it has to fit one line
       beside a close control at 320px — and this STATES it, with a whole row
       to do it in. */
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
  if (abandoned) {
    /* The step, translated, as the VALUE — the label holds the preposition.
       Only an unfinished session has one: for a finished session the step it
       ended on is `reflect` every time, which says nothing. */
    facts.push({ label: t('diary.stoppedAt'), content: t(stepMessageKey(entry.step)) });
  }

  const title = t('diary.sessionTitle', { when: formatShortDateTime(entry.startedAt, locale) });

  return (
    <ContentBox
      headline={title}
      headingLevel={headingLevel}
      /**
       * THE QUESTION, AT body-lg. The reflect step's own `##`, which is what
       * the person was looking at while they wrote the paragraph below it.
       *
       * `undefined` rather than an empty string when there is none: the slot
       * is skipped entirely, where `''` would render an empty `<p>` and take
       * its gap. Two exercises have no `reflect_md` written yet.
       */
      text={entry.reflectQuestion ?? undefined}
      textStep="body-lg"
      /**
       * CLOSEABLE, NOT FRAMED — 2026-09-26.
       *
       * This used to pass `header={<div className="musie-entry__head">…}` with
       * an `IconButton` in it, which forced the box framed: a header band, the
       * X on its own line under the headline, and a hairline under the pair.
       * `ContentBox` draws the control in the headline row itself now, which
       * is the same two props `Message` and `Toast` have always taken.
       *
       * Both or neither, and the box tests the same pair: a close control with
       * no accessible name announces as "button".
       */
      onDismiss={onDismiss}
      dismissLabel={dismissLabel}
    >
      {/* ── THE ANSWER FIRST, THEN THE TRACK, THEN THE DISCLOSURE ────────
          Ben, 2026-09-23, and unchanged by the 09-26 pass except that what
          follows the track is now a control rather than the facts themselves.
          Nobody opens a diary entry to find out when it was: they open it to
          read what they said.

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

      {/**
        * ── SESSION-DETAILS ──────────────────────────────────────────────
        *
        * A disclosure, spelled out rather than taken from a component: the
        * system has no disclosure, and L14 permits a custom pattern exactly
        * where it has none. What is custom is ONE class for the row; the
        * control is a `CtaButton` and the revealed region is a `ContentList`
        * and a `BadgeRow`, which are three components doing what they do.
        *
        * THE LABEL CHANGES AND `aria-expanded` CARRIES THE STATE. Ben asked
        * for the label to change; both are here because a control whose name
        * changes under the cursor is a known screen-reader annoyance, and the
        * attribute costs nothing. `aria-controls` points at the region, which
        * is why it has an id built from the session's.
        *
        * NOT RENDERED AT ALL WHEN THERE IS NOTHING BEHIND IT — which cannot
        * happen today, because `diary.exercise` and `diary.when` are always
        * pushed. It is guarded anyway: a control that opens onto nothing is
        * the kind of thing a later change makes true without noticing.
        */}
      {facts.length > 0 && (
        <div className="musie-entry__details">
          <ButtonGroup align="start">
            <CtaButton
              variant="ghost"
              leadingIcon={detailsOpen ? ChevronUp : ChevronDown}
              aria-expanded={detailsOpen}
              aria-controls={detailsId}
              onClick={() => setDetailsOpen((open) => !open)}
            >
              {t(detailsOpen ? 'diary.detailsHide' : 'diary.details')}
            </CtaButton>
          </ButtonGroup>

          {/* `hidden` rather than unmounting: the id `aria-controls` names has
              to exist for the relationship to resolve, and a region that comes
              and goes leaves the attribute pointing at nothing half the time.
              It also means the rows are in the DOM for a find-in-page. */}
          <div id={detailsId} hidden={!detailsOpen} className="musie-entry__facts">
            {/* No `label`: it is optional here and has NO catalogue default,
                so omitting it leaks nothing, and every written label in the
                set is already the name of a row rather than of the list. */}
            <ContentList items={facts} emptyLabel={t('content.empty')} />

            {/* ── THE STATUS, INSIDE THE DISCLOSURE ──────────────────────
                It sat at the foot of the card beside the delete control from
                2026-09-23. It is metadata — whether the run reached the end —
                and on 09-26 the metadata went behind the control, so it went
                with it rather than being the one fact left outside.

                A `BadgeRow` STILL WRAPS THE ONE BADGE, and the reason is
                unchanged: `.musy-badge` is inline-flex, and a lone one in a
                stretch context renders as a full-width bar. The cost is a
                `<ul>` of one, announced as "list, 1 item", and the fix that
                would avoid it is an `align-self` inside the design system —
                which is exactly what a screen must not reach in and set (L14,
                L7). Logged as a gap. */}
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
          </div>
        </div>
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
        /* ── THE DELETE CONTROL, ALONE AT THE FOOT ───────────────────────
           The badge that used to share this row moved into the disclosure on
           2026-09-26, and the delete control deliberately did NOT go with it.
           Hiding a destructive action behind a disclosure does not protect
           anybody: it makes it harder to find when you want it and no harder
           to hit when you do not, and the inline confirmation is what actually
           protects the row.

           It stays at the trailing edge and quiet, because deleting is
           something a person is entitled to do to their own record and is not
           what they came for.

           `.musie-entry__foot` survives the badge's departure as a one-item
           row, and it is still not a `ButtonGroup`: that component lays out a
           GROUP of buttons, and the trailing-edge alignment of a single
           destructive control is this screen's layout decision (L14). */
        <div className="musie-entry__foot">
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
