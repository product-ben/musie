/**
 * /diary — every session that is over, newest first, grouped by the day it
 * happened on.
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
import { Link } from 'react-router';
import { ContentBox, LinkList, Message, Timeline } from '@musie/design-system';
import type { LinkListItem } from '@musie/design-system';
import { useLocale, useT } from '../i18n/localeContext';
import { useDiary } from '../lib/useDiary';
import { durationMinutes, formatDay, groupByDay, stepMessageKey } from '../lib/diary';
import type { DiaryEntry } from '../lib/diary';

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

export function Diary() {
  const t = useT();
  const { locale } = useLocale();
  const { data, loading, error } = useDiary();

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
    body = (
      <Timeline
        label={t('diary.timelineLabel')}
        headingLevel={2}
        groups={groupByDay(data).map((day) => ({
          id: day.key,
          label: formatDay(day.date, locale),
          children: (
            <LinkList
              label={t('diary.listLabel')}
              headingLevel={3}
              items={day.entries.map((entry) => toItem(entry, t))}
              /* Unreachable by construction — a day exists because it has
                 entries — but required, and a required string with no default
                 is exactly what cannot leak the wrong language. */
              emptyLabel={t('diary.empty')}
            />
          ),
        }))}
      />
    );
  }

  return (
    <>
      <h1 className="musie-placeholder">{t('route.diary.title')}</h1>
      {body}
    </>
  );
}
