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
import { Link } from 'react-router';
import { CircleCheck, CircleDashed, List } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  ButtonGroup, ContentBox, CtaButton, LinkList, Message, SegmentedControl, Timeline,
} from '@musie/design-system';
import type { LinkListItem } from '@musie/design-system';
import { useLocale, useT } from '../i18n/localeContext';
import type { Locale, MessageKey } from '../i18n';
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
          <LatestEntry id={data[0].id} onDismiss={() => setCollapsed(true)} />
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
    </>
  );
}
