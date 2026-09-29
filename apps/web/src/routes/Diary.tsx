/**
 * /diary — every session that is over, newest first, grouped by when it
 * happened.
 *
 * ── THE SHAPE OF THE SCREEN ────────────────────────────────────────────────
 * A graph, then the filter, then the run — and every entry is a ROW. Opening
 * one is /diary/:id, a lightbox over this page.
 *
 * ── THE MOST RECENT ONE IS MARKED, NOT OPENED — Ben, 2026-09-28 ───────────
 * From 2026-09-20 the newest session was lifted out of the list and drawn as
 * a full `DiaryCard`, open, at the top of the screen. It was the landing:
 * the reflect step lands here rather than on /diary/:id, and the card made
 * that an arrival at the thing you just did rather than a dispersal.
 *
 * The graph does that job better and in one glance, and with both on screen
 * the diary said the same session twice — once as a whole card and again as a
 * row underneath. On a phone the card was most of the first screen, so the
 * diary opened on one session instead of on the diary.
 *
 * So the newest entry is now MARKED in the two places it already appears: a
 * ring on its tile in the graph, and a filled row with a leading bar in the
 * run. `latestId` carries it to both. Colour is never the only signal —
 * `diary.latest` goes into the row's meta and into the tile's accessible name,
 * because a mark nobody can see is not a mark (1.4.1).
 *
 * What went with the card: the `collapsed` state, the split that held the
 * newest entry out of the run, the *Earlier* heading, and one read per
 * arrival — `useDiaryEntry` was fetching the newest session's detail every
 * time this screen opened, for a card many people closed without reading.
 *
 * ── TWO RESOLUTIONS, BECAUSE THIRTY SESSIONS IS NOT TEN — G.1 ──────────────
 * The run used to be grouped by calendar day and nothing else, which reads
 * well at ten entries and becomes three hundred headings at three hundred.
 * `groupByPeriod` now gives the last week a heading per day and everything
 * older a heading per month; `lib/diary.ts` holds the rule and the reasons.
 *
 * The SCREEN still owns every word of those headings. 'Today' and 'Yesterday'
 * are catalogue strings, the rest are `Intl` against the active locale, and
 * Timeline is handed finished text — it holds no locale, and a design system
 * that formatted a date would be choosing copy in whichever language it was
 * built in.
 *
 * ── THE FILTER APPEARS WHEN THERE IS SOMETHING TO FILTER — G.1 ─────────────
 * Three segments: everything, finished, unfinished. Below
 * `FILTER_FROM_ENTRIES` entries it is not drawn at all, because a filter is a
 * way of making a long list shorter and on day one there is no list to
 * shorten.
 *
 * IT NARROWS THE GRAPH TOO, since 2026-09-28 (Ben). It did not before, on the
 * argument that the graph is a constant overview while the segments ask about
 * the list. What changed is that the graph is now the top of this screen
 * rather than a band under a card — and a screen whose picture and whose list
 * answered different questions would contradict itself in the gap between
 * them. Filtering turns the diary from a landing into a query, and clearing it
 * turns it back; *Start a session* goes away for the same reason, because a
 * query about last month's unfinished runs is not a moment to be offered a
 * new one.
 *
 * ── TWO COMPONENTS, BECAUSE THEY ARE TWO THINGS ────────────────────────────
 * `Timeline` groups; `LinkList` is a list of destinations. The screen's whole
 * job is to turn rows into those two shapes.
 *
 * ── THE EMPTY STATES ARE THE SCREEN'S, NOT THE TIMELINE'S ──────────────────
 * Timeline renders nothing for zero groups and deliberately has no empty
 * state, so neither empty case ever reaches it. There are two of them and
 * they are not the same sentence:
 *
 *   the diary is empty    'No sessions yet' — day one, and nothing has
 *                         happened. A dashed ContentBox, which is the
 *                         system's own way of drawing a place where
 *                         something will be.
 *   the filter is empty   thirty sessions, none of them matching. It says
 *                         WHICH — 'No unfinished sessions' — and offers the
 *                         way back, because a dead end with a control that
 *                         caused it and no undo is a trap.
 *
 * ── AND AT THE BOTTOM, THE CONTROL THAT EMPTIES IT — 2026-09-24 ────────────
 * Delete-everything moved here from /settings when that route was deleted. It
 * is below everything, behind a rule, and absent entirely from an empty diary;
 * `DeleteEverything` holds the argument, including the one it reverses.
 *
 * ── AN ABANDONED SESSION IS AN ENTRY ───────────────────────────────────────
 * It appears in the list like any other, carrying *Unfinished* and where it
 * stopped. That is D7 and it is the designer's call: a diary that recorded
 * only completions would flatter, and the session still happened.
 *
 * ── HEADING LEVELS ARE DECIDED HERE, NOT GUESSED ───────────────────────────
 * h1 is the screen title, h2 the graph's name and each period heading, h3 the
 * rows. One case since the *Earlier* heading went with the card, where there
 * used to be two. LinkList has NO default for this on purpose — thirty diary
 * rows as thirty headings is an outline nobody can use unless the screen has
 * decided they should be one.
 *
 * As on /exercises, there is no separator punctuation between the meta lines:
 * a hardcoded '·' is a rendered string literal, and putting punctuation in the
 * catalogue is worse. The slot is a column, so two siblings stack.
 */
import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { CircleCheck, CircleDashed, List, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  ButtonGroup, ContentBox, CtaButton, LinkList, Message, SegmentedControl, Timeline, Toast,
} from '@musie/design-system';
import type { LinkListItem } from '@musie/design-system';
import { useLocale, useT } from '../i18n/localeContext';
import type { Locale, MessageKey } from '../i18n';
import { useProfile } from '../lib/profileContext';
import { deleteAllSessions, useActiveSession } from '../lib/session';
import { useDiary } from '../lib/useDiary';
import {
  DIARY_FILTERS, FILTER_FROM_ENTRIES, dayAnchorId, durationMinutes, filterByStatus, formatMonth,
  formatRecentDay, formatShortDateTime, groupByPeriod, isDiaryFilter, stepMessageKey,
} from '../lib/diary';
import type { DiaryEntry, DiaryFilter, DiaryPeriod } from '../lib/diary';
import { DiaryGraph } from '../components/DiaryGraph';

type Translate = ReturnType<typeof useT>;

/** How long the after-a-session confirmation stays up. Six seconds, which is
 *  the window `VoiceTranscript` already gives its undo offer — one number for
 *  "how long a toast stays", not two. */
const SAVED_TOAST_MS = 6_000;

/**
 * The supporting lines, as SIBLINGS rather than one joined string. The slot is
 * a column with its own gap, so each line is its own element and the component
 * does the stacking; a joined string would hand it one line and a glyph nobody
 * chose.
 *
 * The two statuses read differently on purpose. A finished entry says what it
 * was about and how long it took; an abandoned one says it is unfinished and
 * where it stopped, because a duration for a run that was walked away from
 * measures the gap before the tab was closed, not the session.
 */
function entryMeta(entry: DiaryEntry, t: Translate, latest: boolean) {
  /* THE EXERCISE, FIRST — 2026-09-26. The row's headline is the session now
     ('Session vom 26.09.26, 10:04'), so the exercise name moved down here,
     which is the same move the card made: the headline says WHICH session, and
     the exercise is the first fact about it. Without this the rows would be a
     column of timestamps with no clue what any of them was. */
  const lines: string[] = [entry.exerciseName];

  /* FIRST, and in words. The mark on the row is a fill and a bar, which is a
     visual difference and nothing else; this line is what carries the same
     fact to a screen reader and into a greyscale print. */
  if (latest) lines.unshift(t('diary.latest'));

  if (entry.status === 'abandoned') {
    lines.push(t('session.status.abandoned'));
    /* `diary.stoppedAt` is a <dl> LABEL since 2026-09-26 — 'Aufgehört bei',
       with the step as the value. A meta line is neither, so the two halves
       are joined here with the one separator this screen already uses for a
       label and its value. NOT a new catalogue string: the pair reads the same
       in both languages, and a third spelling of 'stopped at X' is a third
       thing to keep in step. */
    lines.push(`${t('diary.stoppedAt')}: ${t(stepMessageKey(entry.step))}`);
  } else {
    if (entry.cardFeeling !== null) lines.push(entry.cardFeeling);
    const minutes = durationMinutes(entry.startedAt, entry.endedAt);
    if (minutes !== null) lines.push(t('diary.duration', { minutes: String(minutes) }));
  }

  /* Undefined, not an empty fragment: `meta` is optional, and a fragment with
     nothing in it still renders the slot — an empty element under the
     headline, taking its gap. A finished session with no card and an
     unreadable end time is the only way here, and it should look like a row
     that simply has nothing more to say. */
  if (lines.length === 0) return undefined;

  /* The index joins the key: two lines CAN now be the same string — an
     exercise called the same thing as a status word is unlikely, but the list
     is built from three independent sources and a duplicate key is a silent
     React bug rather than a loud one. The lines are never reordered, so the
     index is stable for as long as they are rendered. */
  return <>{lines.map((line, index) => <span key={`${String(index)}-${line}`}>{line}</span>)}</>;
}

function toItem(
  entry: DiaryEntry,
  t: Translate,
  locale: Locale,
  latestId: string | null,
): LinkListItem {
  return {
    id: entry.id,
    /* THE ONE YOU MOST RECENTLY FINISHED — Ben, 2026-09-28, replacing the
       inline card. `LinkList` draws the fill and the leading bar; the WORD
       that says why is in `entryMeta`, because a row that differed only by a
       colour would fail 1.4.1 for anybody who cannot see it. */
    marked: entry.id === latestId,
    /* THE SAME STRING THE CARD'S HEADLINE IS, from the same catalogue key —
       Ben asked for the rows to change too, and one key is what stops the row
       and the card it opens disagreeing about what the session is called. */
    headline: t('diary.sessionTitle', { when: formatShortDateTime(entry.startedAt, locale) }),
    meta: entryMeta(entry, t, entry.id === latestId),
    /* THE ROUTER BOUNDARY. The design system never imports react-router; the
       row becomes whatever element the screen hands it, and here that is a
       Link. Nothing in the package fabricates an anchor. */
    render: <Link to={`/diary/${encodeURIComponent(entry.id)}`} />,
  };
}

/**
 * One period's heading, as a finished string.
 *
 * FOUR CASES AND ONE FUNCTION, because the alternative is the choice being
 * made at the call site inside a `.map`, where the month branch is easy to
 * forget. A day inside the last week is 'Today', 'Yesterday' or its weekday;
 * anything older is its month. `groupByPeriod` has already decided which,
 * and this only spells it.
 *
 * The two words come from the catalogue and the two dates from `Intl`, which
 * is the whole of the split: a formatter can render any date in either
 * language, and neither language's word for the day you are standing in is
 * derivable from one.
 */
function periodLabel(period: DiaryPeriod<DiaryEntry>, locale: Locale, t: Translate): string {
  if (period.kind === 'month') return formatMonth(period.date, locale);
  if (period.dayOffset === 0) return t('diary.today');
  if (period.dayOffset === 1) return t('diary.yesterday');
  return formatRecentDay(period.date, locale);
}

/**
 * The three segments, as data.
 *
 * `Record<DiaryFilter, …>` rather than an array of objects written out, so
 * that a fourth `sessions.status` value — the one `DiaryStatus` is derived
 * from the state machine to catch — fails the typecheck here instead of
 * quietly becoming a filter nobody can select.
 *
 * TWO OF THE THREE LABELS ARE `session.status.*`, not new strings. They are
 * the same words the badge on the entry card shows, and a filter that called
 * a status something else would be a second spelling of one fact.
 *
 * Every option needs a glyph — SegmentedControl requires one, because a label
 * can be clipped and a glyph cannot — and the three chosen say the same thing
 * the words do: a plain list, a closed circle, an open one.
 */
const FILTER_LABEL: Record<DiaryFilter, MessageKey> = {
  all: 'diary.filter.all',
  finished: 'session.status.finished',
  abandoned: 'session.status.abandoned',
};

const FILTER_GLYPH: Record<DiaryFilter, LucideIcon> = {
  all: List,
  finished: CircleCheck,
  abandoned: CircleDashed,
};

/* ── THE INLINE CARD IS GONE — Ben, 2026-09-28 ────────────────────────────
   "Get rid of the full card being displayed inline in any state. Instead,
   highlight the latest one in the calendar and in the list below."

   `LatestEntry` lived here: it re-read the newest session as a
   `DiaryEntryDetail` and drew the same `DiaryCard` the lightbox draws, open
   by default, collapsible by an X.

   WHAT WAS WRONG WITH IT, now that the graph exists. The card was a LANDING —
   "here is the thing you just did" — written when this screen's first element
   was a list of dates. The graph answers that better and in one glance, and
   between the two the screen said the same session twice: once as a card with
   the whole entry in it, and again in the run below. On a phone the card was
   most of the first screen, so the diary opened on one session rather than on
   the diary.

   WHAT REPLACES IT IS A MARK, IN BOTH PLACES the session already appears —
   `latestId` below. The entry is one tap away at /diary/:id, which is where
   the card belongs and where it is already the whole screen.

   WHAT WENT WITH IT: the `collapsed` state, the `showLatest` / `rest` split
   that held the newest entry out of the run, and the *Earlier* heading, which
   was a relative word that needed the card to be earlier THAN. The run is now
   the whole diary and its periods sit directly under the page title.

   ONE READ FEWER, TOO. `useDiaryEntry` was fetching the newest session's
   detail on every arrival at /diary, for a card that many people closed
   without reading. The list read is now the only read this screen makes. */

/**
 * START ANOTHER ONE — Ben, 2026-09-24, and it sits BEHIND THE NEWEST ENTRY.
 *
 * ── WHY HERE AND NOT AT THE TOP OR THE BOTTOM ─────────────────────────────
 * The diary is where a finished run lands: the reflect step navigates to
 * /diary and the newest entry opens inline, so the first thing on this screen
 * is the thing you just did. Directly under it is where somebody has finished
 * reading it — which is the moment the only forward move on this screen is
 * worth offering. Above the card it would interrupt the landing; at the foot
 * of the page it would sit next to *Delete your whole diary*, which is the one
 * neighbour a start button must not have.
 *
 * ── IT GOES WITH THE UNFILTERED DIARY ─────────────────────────────────────
 * It used to be rendered only while the latest entry's card was open. That
 * card is gone (2026-09-28), so what is left of the condition is the half
 * that was about the SCREEN rather than about the card: setting a filter turns
 * the diary from a landing into a query, and a query about last month's
 * unfinished sessions is not a moment to be offered a new one.
 *
 * It sits under the graph now, which is where somebody has finished taking in
 * what they have done — the same position relative to the landing that it held
 * under the card. The drawer's *Start a session* is always there and is not
 * going anywhere, and so is the plus on today's column.
 *
 * ── IT NAVIGATES; IT DOES NOT START ANYTHING ──────────────────────────────
 * Two gates, the same two the drawer applies and for the same reasons: no user
 * type recorded → /about-you asks who they are here as first; otherwise
 * /exercises, which is the only screen that writes a session. So this is a
 * `Link`, and every way a start can fail — no account, a session already
 * running, a refused insert — is answered where it is already answered rather
 * than in a second copy here.
 *
 * ── EXCEPT ONE, WHICH IS WHY IT READS THE RUNNING SESSION ─────────────────
 * While a session is running there is no *Start a session* anywhere in the
 * product: the drawer offers *Continue session* instead, because starting a
 * second one is refused by a partial unique index. This follows that rule
 * rather than restating it — with a run in progress the control is simply
 * absent, and the drawer's row is the one place that offers the way back in.
 * Two copies of "continue or start" is how the two drift.
 *
 * UNTIL THE READ LANDS, THE BUTTON IS BUSY AND DISABLED — the drawer's third
 * branch, for the drawer's reason. Guessing *Start a session* and removing it
 * a beat later moves the page under a thumb that is already travelling toward
 * it; a failed read is treated as "we do not know", and the honest answer to
 * not knowing is not to offer.
 */
function StartAnother() {
  const t = useT();
  const { profile } = useProfile();
  const { data: running, loading, error } = useActiveSession();

  const unknown = loading || error !== null;
  if (!unknown && running !== null) return null;

  /* /about-you while the profile is still loading, for the drawer's reason:
     asking who somebody is here as a second time is recoverable, and skipping
     the question is not. */
  const href = profile?.user_type_id ? '/exercises' : '/about-you';

  return (
    /* WRAPPED, like the filter row below it: what the screen owns is where the
       control sits in the column, and the group's own geometry is the
       component's (L14). The margins collapse with the filter's, so the two
       are one gap apart and not two. */
    <div className="musie-diary__start">
      <ButtonGroup align="start">
        <CtaButton
          variant="primary"
          loading={unknown}
          loadingLabel={t('content.loading')}
          render={<Link to={href} />}
        >
          {t('menu.startSession')}
        </CtaButton>
      </ButtonGroup>
    </div>
  );
}

/**
 * A filter that matched nothing — the empty state for a diary that is full.
 *
 * It names WHICH filter came up empty rather than saying "no results", because
 * "no results" makes the reader look back at the control to work out what they
 * asked. And it carries the way out: the only thing that produced this screen
 * is a control the person pressed, so the screen owes them the press that
 * undoes it. A dashed box, like the day-one empty state — the same "there is
 * nothing here" treatment, with a different sentence inside it.
 *
 * `all` cannot reach this component: an empty diary under no filter is the
 * day-one state, which is handled above and reads quite differently. The
 * signature says so by taking the two status values rather than a
 * `DiaryFilter`, so the impossible case is a typecheck error rather than a
 * branch nobody maintains.
 */
function FilterEmpty(
  { filter, onShowAll }: { filter: Exclude<DiaryFilter, 'all'>; onShowAll: () => void },
) {
  const t = useT();
  const finished = filter === 'finished';

  return (
    <ContentBox
      headline={t(finished ? 'diary.filter.noneFinished' : 'diary.filter.noneAbandoned')}
      headingLevel={2}
      text={t(finished ? 'diary.filter.noneFinishedText' : 'diary.filter.noneAbandonedText')}
      outline="dashed"
    >
      {/* `start`, so the way back sits under the sentence that explains it
          rather than at the far edge of the box. Ghost, because it undoes a
          choice rather than being the screen's purpose. */}
      <ButtonGroup align="start">
        <CtaButton variant="ghost" onClick={onShowAll}>
          {t('diary.filter.showAll')}
        </CtaButton>
      </ButtonGroup>
    </ContentBox>
  );
}

/**
 * DELETE MY WHOLE DIARY — G.2's second half, and since 2026-09-24 it is HERE.
 *
 * ── THE ARGUMENT THAT PUT IT IN /settings, AND WHY IT LOST ─────────────────
 * It lived in the settings sheet, and the reasoning above it there was that
 * /diary IS the thing being destroyed — so a control that empties the diary,
 * sitting under the diary, is a control adjacent to thirty rows the user is
 * scrolling past. Ben reversed it with /settings itself: a sheet holding three
 * preferences and one destructive button is a second place to look, and the
 * cost of keeping it was a header icon, a route and an overlay that existed for
 * four controls.
 *
 * The old argument was not wrong, so what answered it is kept rather than
 * dropped:
 *
 *   IT IS BELOW EVERYTHING, behind a rule, past the last entry — the end of a
 *   scroll rather than anywhere a thumb arrives on the way to something else.
 *   IT IS NOT DRAWN AT ALL FOR AN EMPTY DIARY, so the one screen where it could
 *   be tapped without scrolling is the one screen it is absent from. (It also
 *   stops *Delete your whole diary* sitting under *No sessions yet*, which is
 *   an offer to destroy nothing.)
 *   AND THE INLINE CONFIRMATION IS UNCHANGED. It was the third line of defence
 *   and is now the second, which is the honest cost of the move.
 *
 * ── THE CONFIRMATION IS INLINE, AS THE ENTRY CARD'S IS ─────────────────────
 * A `Message variant="warning"` replacing this section's own control, not a
 * dialog. The decision happens where the thing being decided about is on
 * screen — and here that is the entire screen behind it, which is the strongest
 * version of that argument this control has ever had.
 *
 * The affirmative is `secondary`, not `primary`, matching the entry card: the
 * loudest button on a screen should not be the irreversible one.
 *
 * ── WHERE IT LEAVES YOU ────────────────────────────────────────────────────
 * /diary — the screen you are already on, navigated to again with `replace`.
 * That is not a no-op, and it is doing three jobs:
 *
 *   THE LIST RE-READS, because `useDiary` keys on `location.key` and every
 *   navigation mints a new one. It is the same mechanism that stops a deleted
 *   row lingering after a single delete (lib/useDiary.ts) — and now that the
 *   control is on this screen, the re-read is what turns the diary into its
 *   own empty state in front of the person who emptied it.
 *   IT IS ALSO THE CONFIRMATION. There is no toast and no dialog saying it
 *   worked; the screen says so by becoming empty.
 *   AND IT LEAVES NO ROUTE POINTING AT A ROW THAT IS GONE. `deleteAllSessions`
 *   takes a running session with the rest, so a /session/:id/:step somewhere
 *   back in the history is already dead — `replace` means Back does not return
 *   to the list that still showed these entries.
 *
 * ── A FAILURE IS SAID OUT LOUD ─────────────────────────────────────────────
 * Unlike the latest entry's quiet failure above, which has a working list
 * beside it to infer from. A destructive action that silently did nothing is
 * the worst of the three possible endings: the person believes their diary is
 * gone and it is not.
 *
 * The text does NOT claim nothing was deleted. A single `delete` is atomic in
 * Postgres, but a connection lost after it commits looks exactly like one lost
 * before, and this is not the screen to guess on. It says what to do instead.
 */
function DeleteEverything() {
  const t = useT();
  const navigate = useNavigate();

  /* One state rather than three booleans: 'confirming and failed' and
     'deleting and idle' are not states this control has, and a union cannot
     represent them. */
  const [status, setStatus] = React.useState<'idle' | 'confirming' | 'deleting' | 'failed'>(
    'idle',
  );

  async function removeEverything() {
    if (status === 'deleting') return;
    setStatus('deleting');
    try {
      await deleteAllSessions();
      navigate('/diary', { replace: true });
    } catch (thrown: unknown) {
      console.error('[musie] could not delete the diary:', thrown);
      setStatus('failed');
    }
  }

  const deciding = status === 'confirming' || status === 'deleting';

  return (
    /* NO HEADING, where the sheet's version had one.
       There it was a `ContentBox` headlined `route.diary.title` — *Your diary* —
       because a button in a sheet full of preferences has to name what it acts
       on. On this screen that headline is the h1 two hundred pixels up, and
       repeating it as an h2 would put the same three words on the page twice and
       add a section to the outline that says nothing the page has not said.

       So the section is the rule above it plus the control, and what it acts on
       is everything the reader just scrolled through. */
    <section className="musie-diary__danger">
      {status === 'failed' && (
        <Message
          variant="error"
          /* 'assertive': it answers an action the person took and is the only
             thing on screen that says how it went. L11. */
          live="assertive"
          headingLevel={2}
          headline={t('diary.deleteAll.failed')}
          text={t('content.errorDetail')}
        />
      )}

      {deciding ? (
        <Message
          variant="warning"
          live="assertive"
          headingLevel={2}
          headline={t('diary.deleteAll.confirm')}
          text={t('diary.deleteAll.text')}
          action={
            <ButtonGroup align="end">
              <CtaButton variant="ghost" onClick={() => setStatus('idle')}>
                {t('common.cancel')}
              </CtaButton>
              <CtaButton
                variant="secondary"
                loading={status === 'deleting'}
                loadingLabel={t('content.loading')}
                onClick={() => void removeEverything()}
              >
                {t('diary.deleteAll.yes')}
              </CtaButton>
            </ButtonGroup>
          }
        />
      ) : (
        /* A LABELLED BUTTON, not the entry card's bare trash icon. That icon is
           unambiguous because it sits inside the card it deletes; here there is
           no object beside it, and a glyph alone would be a control whose scope
           you have to guess at. The glyph stays as the leading icon, so the two
           controls still read as the same kind of act.

           `ghost`, and at the start edge: it is not what this screen is for. */
        <ButtonGroup align="start">
          <CtaButton variant="ghost" leadingIcon={Trash2} onClick={() => setStatus('confirming')}>
            {t('diary.deleteAll')}
          </CtaButton>
        </ButtonGroup>
      )}
    </section>
  );
}

/**
 * THE CONFIRMATION AFTER A SESSION — Ben, 2026-09-26.
 *
 * "Im Tagebuch findest du einen Eintrag für jede beendete Übung", at the top
 * of the screen, in success colours, dismissable — shown when you ARRIVE here
 * from a session, and never when you come through the nav.
 *
 * ── THE SIGNAL IS ROUTE STATE, AND THAT IS WHAT MAKES THE RULE FREE ──────
 * `Session.tsx` navigates with `state: { sessionSaved: true }` on both ways
 * out of a run. Nothing else in the app sets it — so "only when you come from
 * a session" is not a rule this screen enforces, it is the only way the flag
 * can exist. A drawer link, a typed URL, a Back into the diary: none of them
 * carry it, and none of them need a check.
 *
 * ── AND WHY IT IS CLEARED WITH `history.replaceState` ────────────────────
 * React Router keeps route state in the history entry, so it SURVIVES A
 * RELOAD: without clearing, refreshing /diary would re-confirm a session
 * finished an hour ago.
 *
 * The obvious clear — `navigate(pathname, { replace: true, state: null })` —
 * is wrong here for a reason specific to this screen: `useDiary` keys its
 * cache on `location.key`, and every navigation mints a new one. A tidy-up
 * would silently re-read the whole diary. `window.history.replaceState` edits
 * the entry in place, leaves the key alone, and React Router picks the change
 * up on its next read. It is the platform call rather than the router's, and
 * that is exactly why it costs nothing.
 *
 * ── THE TIMER IS HERE, NOT IN THE COMPONENT ──────────────────────────────
 * §7.23's contract: `label` going null is what removes a Toast, so the
 * consumer's window is the single source of truth and a second timer inside
 * the component could only disagree with it. Six seconds, which is the window
 * `VoiceTranscript` already uses for its undo offer — one number for "how long
 * a toast stays" rather than two.
 *
 * It is also gone the moment this screen unmounts, which is the "and on
 * navigation" half of what was asked for, with no listener: leaving /diary
 * unmounts the component and the toast with it.
 *
 * ── `statusWord=""`, AND THE SAME ARGUMENT THE BADGE MAKES ───────────────
 * Not passed. The badge on the card drops its status word because its label
 * IS the status — "Erfolg: Abgeschlossen" says it twice. This label is a
 * sentence about the diary, not a status, so "Erfolg: Im Tagebuch findest
 * du…" is the announcement doing its job rather than repeating itself.
 */
function SessionSaved() {
  const t = useT();
  const location = useLocation();

  /* Read ONCE, on the render that arrives. Held in state rather than read from
     `location` each time, because the clear below removes it from history
     immediately — and a component that read it live would show the toast for
     exactly one frame. */
  const [showing, setShowing] = React.useState(
    () => (location.state as { sessionSaved?: boolean } | null)?.sessionSaved === true,
  );

  React.useEffect(() => {
    if (!showing) return undefined;

    /* Out of the history entry, so a reload does not re-confirm. In place, so
       `location.key` is untouched and `useDiary` does not re-read. */
    window.history.replaceState(null, '');

    const timer = window.setTimeout(() => setShowing(false), SAVED_TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [showing]);

  return (
    <Toast
      /* `null` is how a Toast is hidden — it has no visibility state of its
         own, which is the whole of §7.23's no-timer contract. */
      label={showing ? t('diary.saved') : null}
      tone="success"
      placement="top"
      onDismiss={() => setShowing(false)}
      dismissLabel={t('diary.saved.dismiss')}
    />
  );
}

export function Diary() {
  const t = useT();
  const { locale } = useLocale();
  const { data, loading, error } = useDiary();

  /* Per visit, deliberately, and one rung stronger than a collapsed card was:
     a filter remembered across visits is a diary that hides sessions and does
     not say why. */
  const [filter, setFilter] = React.useState<DiaryFilter>('all');

  /**
   * THE FILTER IS RESOLVED ONCE, UP HERE, BECAUSE TWO THINGS READ IT NOW.
   *
   * It used to live inside the branch that draws the list, which was fine
   * while the list was the only thing it narrowed. Since 2026-09-28 the GRAPH
   * takes it too (Ben), and the graph is rendered outside that branch — above
   * the page's body, under the title.
   *
   * ── THE GRAPH FOLLOWS THE FILTER, WHICH REVERSES A CALL ─────────────────
   * It did not, and the reasoning was that the graph is a constant overview
   * while the segments are a question about the list. Ben's call on
   * 2026-09-28 reverses it, and the new arrangement is what makes it right:
   * with the inline card gone, the graph IS the top of this screen, and a
   * screen whose picture and whose list answered different questions would
   * contradict itself in the gap between them.
   */
  const rows = data ?? [];

  /* The control is what clears the filter, so a filter surviving the control
     going away would be a hidden narrowing with nothing to undo it. It CAN
     happen: deleting entries re-reads the list, and a diary that drops back
     under FILTER_FROM_ENTRIES loses the segments. Reading through this
     constant rather than `filter` means the state can never outlive its
     control by more than the render that removed it. */
  const showFilter = rows.length >= FILTER_FROM_ENTRIES;
  const active: DiaryFilter = showFilter ? filter : 'all';
  const visible = filterByStatus(rows, active);

  /**
   * THE SESSION YOU MOST RECENTLY FINISHED, marked in both places it appears —
   * the graph and the run. It replaces the inline card (see the note above
   * `StartAnother`).
   *
   * `rows[0]`, not `visible[0]`: it is the newest session there IS, not the
   * newest one that survived a filter. Marking "the latest unfinished session"
   * as *the latest* would be this screen answering the filter's question with
   * the word for a different one. When a filter hides it, nothing is marked,
   * which is honest.
   *
   * The query orders by `started_at desc`, so index 0 is it — the same
   * ordering `groupByPeriod` relies on and deliberately does not re-sort.
   */
  const latestId = rows[0]?.id ?? null;

  let body;
  if (loading) {
    body = <p className="musie-note">{t('content.loading')}</p>;
  } else if (error !== null) {
    /* The same error treatment /exercises uses, for the same reasons:
       `live="assertive"` is the whole of the wiring, no `onDismiss` because
       the error is still true after any dismissal, and headingLevel={2}
       because it replaces the list under the h1. */
    body = (
      <Message
        variant="error"
        live="assertive"
        headingLevel={2}
        headline={t('content.error')}
        text={t('content.errorDetail')}
      />
    );
  } else if (data === null || data.length === 0) {
    body = (
      <ContentBox
        headline={t('diary.empty')}
        headingLevel={2}
        text={t('diary.emptyText')}
        outline="dashed"
      />
    );
  } else {
    /**
     * EVERY ENTRY IS A ROW NOW — Ben, 2026-09-28.
     *
     * An entry has two states since the inline card went: a preview (a row in
     * the run, and a mark in the graph) and the lightbox at /diary/:id. There
     * is nothing to hold out of the list any more, so `visible` IS the run.
     */
    /* The run sits directly under the page title: *Earlier* is gone with the
       card it was earlier THAN, so the period headings take h2 and their rows
       h3. No ternary, because there is no longer a second case. */
    const periodLevel = 2 as const;

    body = (
      <>
        {/* Under the graph, not under a card — see StartAnother. Absent while
            a filter is set, which is the half of its old condition that was
            about this screen rather than about the card. */}
        {active === 'all' && <StartAnother />}

        {showFilter && (
          /* WRAPPED rather than given a className. The gap between this control
             and what surrounds it is the screen's business; everything inside
             the control is the component's, and L14's opening rule is that a
             screen never reaches into a component's own geometry. */
          <div className="musie-diary__filter">
            <SegmentedControl
              name="diary-filter"
              /* HIDDEN, NOT DROPPED — Ben, 2026-09-26: "get rid of the
                 'Anzeigen' label". The word leaves the screen; the group keeps
                 its accessible name, because an unnamed radio group announces
                 as a bare list of buttons and a screen reader would hear three
                 options with nothing saying what they are FOR.

                 `legendHidden` is the component's own prop for exactly this,
                 and the reflect step already uses it for the same reason. The
                 string stays in both catalogues: it is still said, just not
                 drawn. */
              legend={t('diary.filter.legend')}
              legendHidden
              accent="accent"
              value={active}
              options={DIARY_FILTERS.map((value) => ({
                value,
                label: t(FILTER_LABEL[value]),
                glyph: FILTER_GLYPH[value],
              }))}
              onValueChange={(next) => {
                /* The callback hands back a bare string; narrow it before it
                   reaches state that the rest of this screen switches on. */
                if (isDiaryFilter(next)) setFilter(next);
              }}
            />
          </div>
        )}

        {visible.length > 0 && (
          <Timeline
            label={t('diary.timelineLabel')}
            headingLevel={periodLevel}
            groups={groupByPeriod(visible).map((period) => ({
              /* THE ANCHOR THE GRAPH'S OVERFLOW CHIP POINTS AT. `dayAnchorId`
                 is built from the same local day key `groupByPeriod` uses, so
                 the two agree by construction rather than by a convention
                 someone has to remember. A MONTH period gets the same
                 treatment and is simply never linked to — the chip only ever
                 appears on a day inside the graph's reach, and an id that is
                 not a target costs nothing. */
              id: dayAnchorId(period.key),
              label: periodLabel(period, locale, t),
              children: (
                <LinkList
                  label={t('diary.listLabel')}
                  headingLevel={(periodLevel + 1) as 3 | 4}
                  items={period.entries.map((entry) => toItem(entry, t, locale, latestId))}
                  /* Unreachable by construction — a period exists because it
                     has entries — but required, and a required string with
                     no default is exactly what cannot leak the wrong
                     language. */
                  emptyLabel={t('diary.empty')}
                />
              ),
            }))}
          />
        )}

        {/* Nothing matched. Only reachable with a filter set: an empty run
            under 'all' means this is the only session there has ever been,
            and a heading over an empty list says less than its absence. */}
        {visible.length === 0 && active !== 'all' && (
          <FilterEmpty filter={active} onShowAll={() => setFilter('all')} />
        )}
      </>
    );
  }

  return (
    <>
      {/* THE CONFIRMATION, ABOVE EVERYTHING — see `SessionSaved`. First in the
          DOM as well as at the top of the screen: it is `position: fixed`, so
          the order is about reading order rather than painting, and a
          confirmation of the thing that brought you here belongs before the
          thing it confirms. */}
      <SessionSaved />

      <h1 className="musie-placeholder">{t('route.diary.title')}</h1>

      {/* THE GRAPH, UNDER THE TITLE AND ABOVE EVERYTHING ELSE — Ben's call.
          It is an overview; the card below it is the landing and the list
          below that is the record.

          `data` rather than `visible`: the graph deliberately does not listen
          to the filter (DiaryGraph's header says why), so it is handed every
          session including the ones the segments are hiding.

          Drawn while LOADING too, as an empty week — the columns and the axis
          are the same whatever the read returns, and a graph that appeared a
          beat after the title would move the page under a thumb. It is not
          drawn on a FAILED read, because a week of empty days is a claim that
          nothing happened, and a failed read knows nothing at all. */}
      {error === null && !loading && (
        /* `visible`, not `rows` — the segments narrow the picture and the run
           together since 2026-09-28. `latestId` is still the true newest, so a
           filter that hides it simply leaves nothing marked. */
        <DiaryGraph entries={visible} latestId={latestId} />
      )}

      {body}
      {/* LAST ON THE SCREEN, AND ONLY WHEN THERE IS A DIARY TO DELETE.
          `data` rather than `visible`: a filter narrows what you are LOOKING
          at, and this control has never been about the visible subset — it
          takes every session, including the ones the segments are hiding and
          including one that is still running. So it appears whenever the diary
          holds anything at all, and the sentence inside the confirmation is
          what says how much "anything" is. */}
      {data !== null && data.length > 0 && <DeleteEverything />}
    </>
  );
}
