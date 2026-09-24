/**
 * /diary — every session that is over, newest first, grouped by when it
 * happened.
 *
 * ── THE MOST RECENT ONE LEADS, IN A BOX OF ITS OWN ─────────────────────────
 * Ben, 2026-09-20. The newest session is lifted out of the list and given a
 * ContentBox with its facts spelled out; everything older stays in the grouped
 * list the rest of this file describes.
 *
 * WHY IT IS NOT ALSO IN THE LIST: it would be the same entry twice, once
 * under a heading saying "your last session" and again under today's date.
 * `rest` is therefore `data.slice(1)`, and the list disappears entirely when
 * there has only ever been one session — which is the right shape for day one
 * rather than a heading over an empty run.
 *
 * It ALSO lands here from finishing a run: the reflect step navigates to
 * /diary rather than to /diary/:id, and this box is what makes that a landing
 * rather than a dispersal — the thing you just did is the first thing you see.
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
 * CHOOSING ONE PUTS THE LATEST CARD AWAY, and that is deliberate rather than
 * incidental. The card is a landing — *here is the thing you just did* — and
 * a filter is a question about the whole diary. Keeping a finished session
 * open at the top of a screen that says *Unfinished* would be the screen
 * answering two questions at once and contradicting itself in the gap. So
 * filtering turns the diary from a landing into a query, and clearing it
 * turns it back.
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
 * h1 is the screen title. The *Earlier* heading, when there is one, is h2 and
 * pushes the period headings to h3 and the rows to h4; with no *Earlier* above
 * it the run sits directly under the page title and takes h2 / h3 instead.
 * LinkList has NO default for this on purpose — thirty diary rows as thirty
 * headings is an outline nobody can use unless the screen has decided they
 * should be one.
 *
 * As on /exercises, there is no separator punctuation between the meta lines:
 * a hardcoded '·' is a rendered string literal, and putting punctuation in the
 * catalogue is worse. The slot is a column, so two siblings stack.
 */
import * as React from 'react';
import { Link, useNavigate } from 'react-router';
import { CircleCheck, CircleDashed, List, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  ButtonGroup, ContentBox, CtaButton, LinkList, Message, SegmentedControl, Timeline,
} from '@musie/design-system';
import type { LinkListItem } from '@musie/design-system';
import { useLocale, useT } from '../i18n/localeContext';
import type { Locale, MessageKey } from '../i18n';
import { useProfile } from '../lib/profileContext';
import { deleteAllSessions, useActiveSession } from '../lib/session';
import { useDiary, useDiaryEntry } from '../lib/useDiary';
import {
  DIARY_FILTERS, FILTER_FROM_ENTRIES, durationMinutes, filterByStatus, formatMonth,
  formatRecentDay, groupByPeriod, isDiaryFilter, stepMessageKey,
} from '../lib/diary';
import type { DiaryEntry, DiaryFilter, DiaryPeriod } from '../lib/diary';
import { DiaryCard } from '../components/DiaryCard';

type Translate = ReturnType<typeof useT>;

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
function entryMeta(entry: DiaryEntry, t: Translate) {
  const lines: string[] = [];

  if (entry.status === 'abandoned') {
    lines.push(t('session.status.abandoned'));
    lines.push(t('diary.stoppedAt', { step: t(stepMessageKey(entry.step)) }));
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

  return <>{lines.map((line) => <span key={line}>{line}</span>)}</>;
}

function toItem(entry: DiaryEntry, t: Translate): LinkListItem {
  return {
    id: entry.id,
    headline: entry.exerciseName,
    meta: entryMeta(entry, t),
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

/**
 * The newest entry, inline — the SAME card the lightbox renders, not a
 * lookalike of it.
 *
 * Before 2026-09-21 this drew its own lighter version: a ContentBox with three
 * facts and a link saying *Open entry*. Two renderings of one thing, which is
 * how they drift — and the reason the answer, the track and the delete control
 * were reachable in one of them and not the other.
 *
 * ── WHY IT FETCHES, AND WHY IT IS ITS OWN COMPONENT ───────────────────────
 * `useDiary` returns SUMMARIES: enough for a row, and not the reflection, the
 * track or anything else the card shows. The card needs `DiaryEntryDetail`, so
 * one more read is unavoidable — and a hook cannot be called conditionally, so
 * the read lives in a component that is only mounted when there is an id to
 * read and the card is open. That is also what stops a collapsed card holding
 * a request nobody is waiting for.
 *
 * ── ITS FAILURES ARE QUIET, AND THAT IS THE POINT ─────────────────────────
 * The run below is already on screen and already lists this session. So a slow
 * or failed detail read renders NOTHING here rather than an error panel above
 * a perfectly good list: the entry is still reachable by tapping its row, and
 * a second failure message for a screen that is working would be the loudest
 * thing on it. `/diary/:id` is where the failure is worth stating, because
 * there the card IS the screen.
 */
function LatestEntry({ id, onDismiss }: { id: string; onDismiss: () => void }) {
  const t = useT();
  const { data } = useDiaryEntry(id);

  /* `DiaryEntryView` also covers "still running", which cannot reach here:
     the diary reads only sessions that are over. Narrowed rather than
     asserted — a cast would be a promise this component cannot keep. */
  if (data === null || data.kind !== 'entry') return null;

  return (
    <DiaryCard
      entry={data.entry}
      /* h2, under the page's h1 — where the lightbox's copy is an h3 under the
         dialog title. The one thing that genuinely differs between the two. */
      headingLevel={2}
      onDismiss={onDismiss}
      dismissLabel={t('diary.collapse')}
    />
  );
}

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
 * ── IT GOES WITH THE CARD ──────────────────────────────────────────────────
 * Rendered only while the latest entry is open, for the reason the card itself
 * is: collapsing it, or setting a filter, turns the diary from a landing into
 * a query, and a query about last month's sessions is not a moment to be
 * offered a new one. The drawer's *Start a session* is always there and is not
 * going anywhere.
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

export function Diary() {
  const t = useT();
  const { locale } = useLocale();
  const { data, loading, error } = useDiary();

  /* Per visit, deliberately. Arriving at the diary — above all arriving from
     the reflect step, which lands here rather than on /diary/:id — should show
     the thing you just made, and a preference remembered from last week would
     take that away. Closing it is a "not now", not a setting. */
  const [collapsed, setCollapsed] = React.useState(false);

  /* Per visit for the same reason, and one rung stronger: a filter remembered
     across visits is a diary that hides sessions and does not say why. */
  const [filter, setFilter] = React.useState<DiaryFilter>('all');

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
     * THE NEWEST ENTRY IS INLINE UNTIL IT IS CLOSED — OR UNTIL A FILTER IS SET.
     *
     * Ben, 2026-09-21: every entry has three states — preview (a row in the
     * run below), inline (this card, in the page) and lightbox (the same card
     * at /diary/:id). The newest one opens inline; its X collapses it to a
     * preview, which is when it joins the run with everything else.
     *
     * `rest` follows from that and is the whole of the mechanism: while the
     * card is open the newest entry is held out of the list, because it would
     * otherwise be the same session twice on one screen. Closed — or hidden by
     * a filter — nothing is held out and the run is entire, which is also why
     * closing does not make a row disappear.
     */
    const showFilter = data.length >= FILTER_FROM_ENTRIES;

    /* The control is what clears the filter, so a filter surviving the control
       going away would be a hidden narrowing with nothing to undo it. It CAN
       happen: deleting entries re-reads the list, and a diary that drops back
       under FILTER_FROM_ENTRIES loses the segments. Reading through this
       constant rather than `filter` means the state can never outlive its
       control by more than the render that removed it. */
    const active: DiaryFilter = showFilter ? filter : 'all';

    const visible = filterByStatus(data, active);
    const showLatest = !collapsed && active === 'all';
    const rest = showLatest ? visible.slice(1) : visible;

    /* *Earlier* is a relative word and needs something to be earlier THAN.
       With the card on screen it separates the session you just finished from
       the ones before it; with the card away the run is the whole diary and
       the heading would be claiming a division that is not there — so it goes,
       and the periods step up a level to sit under the page title instead. */
    const earlier = showLatest && rest.length > 0;
    const periodLevel = earlier ? 3 : 2;

    body = (
      <>
        {showLatest && (
          <>
            <LatestEntry id={data[0].id} onDismiss={() => setCollapsed(true)} />
            <StartAnother />
          </>
        )}

        {showFilter && (
          /* WRAPPED rather than given a className. The gap between this control
             and what surrounds it is the screen's business; everything inside
             the control is the component's, and L14's opening rule is that a
             screen never reaches into a component's own geometry. */
          <div className="musie-diary__filter">
            <SegmentedControl
              name="diary-filter"
              legend={t('diary.filter.legend')}
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

        {earlier && <h2 className="musie-diary__earlier">{t('diary.earlier')}</h2>}

        {rest.length > 0 && (
          <Timeline
            label={t('diary.timelineLabel')}
            headingLevel={periodLevel}
            groups={groupByPeriod(rest).map((period) => ({
              id: period.key,
              label: periodLabel(period, locale, t),
              children: (
                <LinkList
                  label={t('diary.listLabel')}
                  headingLevel={(periodLevel + 1) as 3 | 4}
                  items={period.entries.map((entry) => toItem(entry, t))}
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
        {rest.length === 0 && active !== 'all' && (
          <FilterEmpty filter={active} onShowAll={() => setFilter('all')} />
        )}
      </>
    );
  }

  return (
    <>
      <h1 className="musie-placeholder">{t('route.diary.title')}</h1>
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
