/**
 * /diary — every session that is over, newest first, grouped by the day it
 * happened on.
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
 * ── TWO COMPONENTS, BECAUSE THEY ARE TWO THINGS ────────────────────────────
 * `Timeline` groups; `LinkList` is a list of destinations. The screen's whole
 * job is to turn rows into those two shapes: `groupByDay` makes the groups and
 * `Intl` makes their headings, because Timeline never formats a date — it
 * holds no locale, and a design system that formatted one would be choosing
 * copy in whichever language it was built in.
 *
 * ── THE EMPTY STATE IS THE SCREEN'S, NOT THE TIMELINE'S ────────────────────
 * Timeline renders nothing for zero groups and deliberately has no empty
 * state. So the "no sessions yet" case never reaches it: it is a ContentBox
 * with a headline and a sentence, dashed, which is the system's own way of
 * drawing a place where something will be. Rendering an empty Timeline with an
 * empty LinkList inside it would put the sentence three levels down for no
 * reason, and a labelled list announcing "0 items" says less than the sentence.
 *
 * ── AN ABANDONED SESSION IS AN ENTRY ───────────────────────────────────────
 * It appears in the list like any other, carrying *Unfinished* and where it
 * stopped. That is D7 and it is the designer's call: a diary that recorded
 * only completions would flatter, and the session still happened.
 *
 * ── HEADING LEVELS ARE DECIDED HERE, NOT GUESSED ───────────────────────────
 * h1 is the screen title, so the day headings are h2 (Timeline's default is 3,
 * which would skip nothing but would sit a level below where these belong) and
 * the row headlines are h3. LinkList has NO default for this on purpose —
 * thirty diary rows as thirty headings is an outline nobody can use unless the
 * screen has decided they should be one.
 *
 * As on /exercises, there is no separator punctuation between the meta lines:
 * a hardcoded '·' is a rendered string literal, and putting punctuation in the
 * catalogue is worse. The slot is a column, so two siblings stack.
 */
import * as React from 'react';
import { Link } from 'react-router';
import { ContentBox, LinkList, Message, Timeline } from '@musie/design-system';
import type { LinkListItem } from '@musie/design-system';
import { useLocale, useT } from '../i18n/localeContext';
import { useDiary, useDiaryEntry } from '../lib/useDiary';
import { durationMinutes, formatDay, groupByDay, stepMessageKey } from '../lib/diary';
import type { DiaryEntry } from '../lib/diary';
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

export function Diary() {
  const t = useT();
  const { locale } = useLocale();
  const { data, loading, error } = useDiary();

  /* Per visit, deliberately. Arriving at the diary — above all arriving from
     the reflect step, which lands here rather than on /diary/:id — should show
     the thing you just made, and a preference remembered from last week would
     take that away. Closing it is a "not now", not a setting. */
  const [collapsed, setCollapsed] = React.useState(false);

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
     * THE NEWEST ENTRY IS INLINE UNTIL IT IS CLOSED.
     *
     * Ben, 2026-09-21: every entry has three states — preview (a row in the
     * run below), inline (this card, in the page) and lightbox (the same card
     * at /diary/:id). The newest one opens inline; its X collapses it to a
     * preview, which is when it joins the run with everything else.
     *
     * `rest` follows from that and is the whole of the mechanism: while the
     * card is open the newest entry is held out of the list, because it would
     * otherwise be the same session twice on one screen. Closed, nothing is
     * held out and `data` is the run entire — which is also why closing does
     * not make a row disappear.
     */
    const [latest, ...older] = data;
    const rest = collapsed ? data : older;

    body = (
      <>
        {!collapsed && (
          <LatestEntry id={latest.id} onDismiss={() => setCollapsed(true)} />
        )}

        {/* Nothing at all when this is the only session there has ever been —
            a heading over an empty run says less than its absence does. */}
        {rest.length > 0 && (
          <>
            <h2 className="musie-diary__earlier">{t('diary.earlier')}</h2>
            <Timeline
              label={t('diary.timelineLabel')}
              /* h3: the run now sits under the *Earlier* heading rather than
                 directly under the page title, so its days step down with it
                 and the rows below them become h4. */
              headingLevel={3}
              groups={groupByDay(rest).map((day) => ({
                id: day.key,
                label: formatDay(day.date, locale),
                children: (
                  <LinkList
                    label={t('diary.listLabel')}
                    headingLevel={4}
                    items={day.entries.map((entry) => toItem(entry, t))}
                    /* Unreachable by construction — a day exists because it
                       has entries — but required, and a required string with
                       no default is exactly what cannot leak the wrong
                       language. */
                    emptyLabel={t('diary.empty')}
                  />
                ),
              }))}
            />
          </>
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
