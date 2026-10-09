/**
 * THE PRACTICE, AS A PICTURE — Ben, 2026-09-26.
 *
 * Every day is a column; the sessions of that day stack up it as their
 * exercise's artwork. Tapping one opens that entry in the lightbox, which is
 * the route that already exists.
 *
 * ── IT IS A LIST OF LINKS THAT HAPPENS TO BE DRAWN AS A CHART ────────────
 * Not an SVG, not a `<table>`, no charting library. An `<ol>` of days, each
 * holding an `<ol>` of that day's sessions, each of those an `<a>` to
 * `/diary/:id`. Every affordance here is a link or a button, so keyboard
 * order, focus, the browser's own find, middle-click and "open in new tab"
 * all work without a line of script.
 *
 * That is also what makes it honest for a screen reader: there is no "chart"
 * to describe. There is a named region, a named list per week, and a link per
 * session whose accessible name says which session, which exercise and how it
 * ended. The picture is the sighted presentation of a list that is already
 * complete without it.
 *
 * ── A WEEK AT A TIME, SCROLLED NATIVELY ─────────────────────────────────
 * `weeksFrom` builds whole weeks including their empty days — the gaps are
 * what make a run of sessions read as a run — oldest week first, ending with
 * the one containing today. The scroller is CSS `scroll-snap` with
 * `scroll-snap-stop: always`, which is the technique `Carousel` proves and
 * documents: one gesture is one week, with no script deciding it.
 *
 * NO SCRIPT PUTS IT ON THE CURRENT WEEK. The weeks render newest-first into a
 * `row-reverse` scroller, so the engine rests it on the current week by
 * itself — see the note above `pages` for the two scripted attempts that lost
 * a race with the layout engine, and the measurement that settled it.
 *
 * ── IT DOES NOT LISTEN TO THE FILTER ────────────────────────────────────
 * Ben's call, and it holds up: the graph is a constant overview of what you
 * have done, and the segments are a question about the list. A graph that
 * emptied when somebody asked to see only unfinished sessions would be
 * answering a different question with the same picture.
 *
 * ── AN ABANDONED SESSION IS DASHED, NOT ABSENT ──────────────────────────
 * D7: the diary records what happened, and a session you walked out of
 * happened. It is drawn with a dashed edge — the same distinction
 * `Badge variant="outline"` makes on the card — and its accessible name says
 * so in words, because this is the one place in the product where the status
 * has no text beside it.
 *
 * Ben asked for it DIMMED. It is not, and the reason is a token gap rather
 * than a disagreement: Layer 1 ships no opacity token at all, and L14.1 binds
 * this file to tokens. Logged in OPEN-QUESTIONS.md; the stylesheet rule takes
 * the token the day it lands.
 *
 * ── THE PLUS IS ON TODAY ────────────────────────────────────────────────
 * One ghost IconButton at the top of today's stack. It navigates exactly as
 * `StartAnother` does, and for the same two reasons — `/exercises`, or
 * `/about-you` when there is no user type yet — and it is ABSENT while a
 * session is running, because there is no *Start a session* anywhere in the
 * product while one is. Two copies of "continue or start" is how the two
 * drift, so this one simply does not offer.
 *
 * ── A CUSTOM PATTERN, AND WHY IT IS NOT A COMPONENT YET ─────────────────
 * L14: permitted where the system has no component, and it has none for this.
 * Every declaration in `shell.css` resolves to a Layer 1 token or arithmetic
 * over one (L14.1); every class is `musie-`, never `musy-` (L14.2). L14.3 says
 * a pattern that RECURS is a component request — this has exactly one caller,
 * so it is logged in OPEN-QUESTIONS.md as a candidate rather than pushed into
 * the package on its first day.
 *
 * Inside it, the parts that ARE components are components: `IconButton` for
 * the plus and the two pagination chevrons, `Badge` for the overflow count.
 * The day-one state is NOT one of them — see the note where it used to be.
 */
import * as React from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Badge, IconButton } from '@musie/design-system';
import { useLocale, useT } from '../i18n/localeContext';
import { useProfile } from '../lib/profileContext';
import { useActiveSession } from '../lib/session';
import {
  dayAnchorId, formatDayOfMonth, formatShortDateTime, formatWeekday, stackOf, weeksFrom,
} from '../lib/diary';
import type { DiaryEntry } from '../lib/diary';

/**
 * Where the scroller is, as the two facts the chevrons need.
 *
 * ONE PIXEL OF SLACK. `scrollLeft` is fractional on a trackpad and after a
 * snap settle, and `scrollWidth - clientWidth` is rounded — so an exact
 * comparison leaves the *next* chevron live at the end of the run, pointing at
 * half a pixel of travel. The tolerance is what makes "at the end" mean what a
 * reader means by it.
 */
function measureEdges(element: HTMLElement): {
  atNewest: boolean; atOldest: boolean; index: number;
} {
  const max = element.scrollWidth - element.clientWidth;
  return {
    /* WHICH WEEK IS ON SCREEN, read off the same scroller in the same pass —
       not tracked beside it. A page is `clientWidth` wide by `flex: 0 0 100%`,
       so rounding the ratio is the index, and `scroll-snap` guarantees it
       settles on a whole one. Derived here rather than held in state for the
       reason the whole block below gives: the scroller moves without going
       through the buttons, and a second opinion about where it is would be
       wrong exactly when somebody swiped. */
    index: element.clientWidth === 0
      ? 0
      : Math.round(element.scrollLeft / element.clientWidth),
    /* The weeks run NEWEST FIRST, so the scroller's origin is the current
       week and its far end is the first week in the diary. Named for the
       WEEKS rather than for the edges, because "start" and "end" are exactly
       the two words that would go stale if the order ever flipped back. */
    atNewest: element.scrollLeft <= 1,
    atOldest: element.scrollLeft >= max - 1,
  };
}

export function DiaryGraph({ entries, latestId }: {
  entries: readonly DiaryEntry[];
  /** The session most recently finished, drawn with a ring. Null when a
   *  filter is hiding it, which leaves nothing marked — see Diary.tsx. */
  latestId: string | null;
}) {
  const t = useT();
  const { locale } = useLocale();
  const scroller = React.useRef<HTMLDivElement>(null);

  /* `now` is read ONCE per mount rather than per render: `weeksFrom` defaults
     to `new Date()`, and a component that re-rendered across midnight would
     otherwise rebuild its columns under the reader's thumb. */
  const weeks = React.useMemo(() => weeksFrom(entries), [entries]);

  /**
   * HOW TALL A COLUMN IS, IN MARKS — and it is the BUSIEST DAY, not the cap.
   *
   * The height has to be the same for every column in every week, or the
   * graph resizes as the reader scrolls from a quiet week into a busy one and
   * the page jumps under their thumb. That much was always true.
   *
   * Reserving `GRAPH_STACK_CAP + 2` unconditionally was the first answer and
   * it was wrong: on a diary with one session it drew ~380px of nothing above
   * a single picture, which on a phone is most of the first screen. The rule
   * a graph should follow is the one every axis follows — fit the data, not
   * the theoretical maximum.
   *
   * So: the tallest stack anybody actually has, counting the overflow chip as
   * a row where there is one, plus one for the plus control on today. A floor
   * of two keeps day one from being a single row with the plus crushed onto
   * the axis.
   *
   * It is a COUNT handed to CSS, which does the arithmetic over its own
   * tokens — `calc((--target-primary + --space-gap-stack) * n)`. The number is
   * data; the geometry stays in the stylesheet (L14.1).
   */
  const rows = React.useMemo(() => {
    let tallest = 0;
    for (const week of weeks) {
      for (const day of week.days) {
        const { shown, overflow } = stackOf(day.entries);
        tallest = Math.max(tallest, shown.length + (overflow > 0 ? 1 : 0));
      }
    }
    return Math.max(2, tallest + 1);
  }, [weeks]);

  /**
   * THE CURRENT WEEK IS THE FIRST PAGE, AND THAT IS A DATA DECISION.
   *
   * ── THREE SCRIPTED ATTEMPTS, AND WHY EACH LOST ──────────────────────────
   * The weeks were rendered oldest-first and the scroller was pushed to its
   * end on mount. Every version of that push lost a race with the layout
   * engine, and the measurements are worth keeping because they are what
   * ruled the approach out rather than a hunch:
   *
   *   `scrollLeft = scrollWidth` in a layout effect — left it at 118px of a
   *   361px maximum. The assignment is clamped to the maximum AT THAT INSTANT,
   *   and the weeks were not yet at full width.
   *
   *   The same, re-run from a ResizeObserver — the pin ran three times and set
   *   361 each time, and two and a half seconds later the scroller was back at
   *   118. A patched `scrollLeft` setter and a patched `scrollIntoView`
   *   recorded every programmatic scroll in the page: there were exactly three,
   *   all mine. The engine re-clamped it during a relayout no observer of mine
   *   could see.
   *
   *   `flex-direction: row-reverse`, to make the engine rest there by itself —
   *   Chrome rests a reversed row at `scrollLeft: 0` regardless, which showed
   *   the OLDEST week. The trick works for `column-reverse` and does not
   *   transfer.
   *
   * ── SO THE ORDER CHANGES INSTEAD OF THE SCROLL POSITION ─────────────────
   * The weeks render NEWEST FIRST. The current week is then the first page,
   * at `scrollLeft: 0`, which is where every browser rests a fresh scroller —
   * with nothing to re-run, nothing to observe and nothing to race.
   *
   * THE COST, STATED: scrolling back in time moves RIGHT, where a calendar
   * usually puts the past on the left. What is bought is that the screen is
   * correct on arrival, after a rotate, after an image loads and after a slow
   * read resolves — which is the case that was actually broken, three times.
   * The chevrons are labelled *Woche davor* / *Woche danach* rather than by
   * direction, so what they do is said in words either way.
   *
   * It also matches the rest of the diary, which is newest-first everywhere,
   * and it fixes the reading order: a screen reader now reaches the current
   * week first instead of walking a year to get to it.
   */
  const pages = React.useMemo(() => [...weeks].reverse(), [weeks]);

  /**
   * WHICH CHEVRONS ARE LIVE — read off the scroller, never tracked separately.
   *
   * A page index held in state would be a second opinion about where the
   * scroller is, and the scroller is the one that moves: a swipe, a trackpad,
   * a keyboard tab into a link three weeks back, and `scroll-snap` settling
   * after a flick all change the position without going through the buttons.
   * So the buttons READ the scroller and the scroller stays the truth.
   */
  const [edges, setEdges] = React.useState({ atNewest: true, atOldest: true, index: 0 });

  /* The first read, because no scroll event has fired yet and the chevrons are
     drawn in the same frame. It runs when the number of weeks changes, which
     is the only thing that changes where the ends are. */
  React.useLayoutEffect(() => {
    const element = scroller.current;
    if (element !== null) setEdges(measureEdges(element));
  }, [weeks.length]);

  /**
   * Move one page, which is one week — `clientWidth` is what `flex: 0 0 100%`
   * resolved to, so no arithmetic over column counts can disagree with it.
   *
   * IT TAKES A DIRECTION IN TIME, NOT A SIGN. The weeks run newest-first, so
   * *older* is towards the far end and the sign is `+1` — which is the
   * opposite of what anybody writing `page(-1)` for "back" would expect. The
   * translation happens here, once, where the ordering is documented.
   */
  function page(towards: 'older' | 'newer') {
    const element = scroller.current;
    if (element === null) return;
    /* `behavior: 'auto'` means "use the element's CSS `scroll-behavior`", and
       the stylesheet sets that to `smooth` with a reduced-motion override. So
       the animation and the opt-out are both one declaration away from the
       token layer, and this function stays a statement about direction. */
    element.scrollBy({
      left: (towards === 'older' ? 1 : -1) * element.clientWidth,
      behavior: 'auto',
    });
  }

  return (
    <section
      className="musie-graph"
      aria-labelledby="diary-graph-label"
      /* The row count, for the stack's reserved height. A custom property
         rather than a height: the screen supplies the DATA and the stylesheet
         keeps the arithmetic over its own tokens. */
      style={{ '--musie-graph-rows': rows } as React.CSSProperties}
    >
      <div className="musie-graph__head">
        {/* The region's name. Visible, because it says what the picture IS —
            a sighted reader needs that as much as a screen-reader one, and a
            chart with no title is a chart you have to work out. */}
        <h2 className="musie-graph__label" id="diary-graph-label">
          {t('diary.graph.label')}
        </h2>

        {/* ── WHICH WEEK YOU ARE LOOKING AT ──────────────────────────────
            `diary.graph.weekLabel` has existed since the graph did, as the
            `aria-label` on every week's <ol> and nothing else — so a screen
            reader was told which week it had reached and a sighted reader was
            not. The axis says "Mo 22" but never which month or year, and after
            two chevron presses that is not enough to place yourself.

            It names the week IN VIEW, so it stays beside the controls that
            change it. The per-week `aria-label` stays too: this one says where
            you are, those say what you are moving between. */}
        {weeks.length > 1 && (
          <p className="musie-graph__week-label" aria-live="polite">
            {t('diary.graph.weekLabel', {
              when: formatShortDateTime(
                (pages[edges.index] ?? pages[0]).days.at(-1)!.date,
                locale,
              ),
            })}
          </p>
        )}

        {/* ── PAGINATION ─────────────────────────────────────────────────
            Drawn only when there is more than one week. Two permanently dead
            controls on a one-week diary would be chrome promising a depth the
            diary does not have yet — and the day it gets a second week they
            appear, which is the moment they mean something.

            DISABLED, NOT HIDDEN, at the two ends. A control that vanished at
            the start of the run would move the other one under the thumb
            that was aiming at it; disabled keeps the row still and says why
            it cannot be pressed.

            They are an ADDITION to the swipe, not a replacement: the scroller
            still snaps, still takes a trackpad, and still scrolls when a
            keyboard tabs into a link three weeks back. These are for a mouse,
            which has no swipe. */}
        {weeks.length > 1 && (
          <div className="musie-graph__pager">
            {/* LEFT IS BACK IN TIME, which is what the glyph has to mean
                whatever the scroll direction underneath it is. The weeks run
                newest-first, so this one scrolls FORWARD — `page` takes a
                direction in time and owns that translation. */}
            <IconButton
              glyph={ChevronLeft}
              label={t('diary.graph.prevWeek')}
              variant="ghost"
              size="primary"
              disabled={edges.atOldest}
              onClick={() => page('older')}
            />
            <IconButton
              glyph={ChevronRight}
              label={t('diary.graph.nextWeek')}
              variant="ghost"
              size="primary"
              disabled={edges.atNewest}
              onClick={() => page('newer')}
            />
          </div>
        )}
      </div>

      {/* `tabIndex={0}`: a scroll container that is not otherwise focusable
          cannot be scrolled by keyboard, and its contents here are links that
          a keyboard user reaches by tabbing THROUGH — which scrolls it. The
          role and the name are what stop it announcing as an unlabelled
          group. WCAG 2.1.1, and the same treatment any scrollable region
          owes. */}
      <div
        className="musie-graph__scroller"
        ref={scroller}
        tabIndex={0}
        role="group"
        aria-labelledby="diary-graph-label"
        /* The scroller reports; the buttons read. Every way of moving it —
           swipe, trackpad, keyboard focus, a snap settling after a flick —
           comes through here, which is why the chevrons hold no page index
           of their own. */
        /* The scroller reports; the buttons read. Every way of moving it —
           swipe, trackpad, keyboard focus, a chevron, a snap settling after a
           flick — comes through here, which is why the chevrons hold no page
           index of their own. */
        onScroll={(event) => setEdges(measureEdges(event.currentTarget))}
      >
        {pages.map((week) => (
          <ol
            className="musie-graph__week"
            key={week.key}
            aria-label={t('diary.graph.weekLabel', {
              when: formatShortDateTime(week.days[week.days.length - 1].date, locale),
            })}
          >
            {week.days.map((day) => (
              <Day key={day.key} day={day} latestId={latestId} />
            ))}
          </ol>
        ))}
      </div>

      {/* DAY ONE HAS NO BOX HERE, and it did until 2026-09-28.

          It drew a dashed ContentBox under the week saying "your sessions
          will stack up here" — directly above /diary's own day-one box
          saying "no sessions yet, finish one and it appears here". Two dashed
          boxes, stacked, telling a person with an empty diary the same thing
          twice.

          The calendar says it better than either now that an empty day draws
          a box: seven shapes and a plus on today IS the invitation, and the
          screen's own empty state below carries the sentence. `diary.graph.empty`
          stays in both catalogues, unused, because deleting copy Ben wrote is
          not this change's business — it is one grep away if it is wanted
          back. */}
    </section>
  );
}

/**
 * One column: the stack, then the day's own label under it.
 *
 * THE LABEL IS UNDER THE STACK because the stack grows UP from it — the label
 * is the axis, and an axis sits at the foot of what it measures. It is also
 * why the column is a flex column reversed rather than ordered by hand: the
 * DOM order is stack-then-label, which is what a screen reader should hear.
 */
function Day({ day, latestId }: {
  day: { key: string; date: string; dayOffset: number; entries: DiaryEntry[] };
  latestId: string | null;
}) {
  const t = useT();
  const { locale } = useLocale();
  const { shown, overflow } = stackOf(day.entries);
  const today = day.dayOffset === 0;

  return (
    <li className="musie-graph__day" data-today={today ? '' : undefined}>
      <div className="musie-graph__stack">
        {/* The plus, on top of today's stack and nowhere else. */}
        {today && <StartToday />}

        {/* A DAY WITH NOTHING ON IT STILL GETS A BOX — Ben, 2026-09-28.
            "The calendar looks weird when empty."

            It was blank, and a blank column has no floor: seven days of
            nothing read as a missing element rather than as seven days of
            nothing. One filled shape per empty day gives the row a baseline,
            and the stacks then visibly rise off it.

            FILL ONLY, NO OUTLINE — Ben's words, and the reason is that an
            outline is what a MARK has. A bordered empty box would read as a
            session whose picture failed to load; an unbordered one reads as
            the space a session would occupy.

            `aria-hidden`, and it is not in the `<ol>`: the list is sessions,
            and an empty day has none. A screen reader hears nothing here,
            which is exactly what happened that day. */}
        {shown.length === 0 && <div className="musie-graph__blank" aria-hidden="true" />}

        {/* `stackOf` returns these NEWEST FIRST — the query's own order, which
            rendered top to bottom puts the day's earliest session at the
            bottom and each later one above it. A stack that grows upward. */}
        {shown.length > 0 && (
          <ol className="musie-graph__sessions">
            {shown.map((entry) => (
              <li key={entry.id}>
                <SessionMark entry={entry} latest={entry.id === latestId} />
              </li>
            ))}
          </ol>
        )}

        {/* THE COUNT, UNDER THE FOUR IT COUNTS — and under them because of
            WHAT it counts. The cap keeps the most recent four, so the
            overflow is the day's EARLIEST sessions, and a stack that grows
            upward puts those beneath the ones that are drawn. It sat on top
            until 2026-09-28, where it read as "and more after these" about
            sessions that came before them.

            A `Badge` rather than a number in a div: it is a small labelled
            token, which is what a badge is, and it inherits the set's own
            geometry and contrast. It takes the reader to that day in the list
            below — the one place every session is reachable in full. */}
        {overflow > 0 && (
          /* ── A BUTTON THAT SCROLLS, NOT A LINK THAT NAVIGATES ──────────
             It was `<Link to={'#' + dayAnchorId(...)}>`, and that was wrong
             twice over on this screen.

             `useDiary` keys its cache on `location.key`, and EVERY router
             navigation mints a new one — including a hash-only one. So a tap
             on this chip would have re-read the whole diary, remounted the
             graph and thrown the reader back to the current week: the exact
             opposite of "take me to that day".

             And it is honest about what it is. This does not go anywhere —
             the day is already on the page, a few hundred pixels down. A
             control that moves the viewport is a button; a control that
             changes what page you are on is a link. `scrollIntoView` with no
             URL change is the whole implementation.

             A missing target is a no-op rather than a throw: the day's group
             is only in the DOM while the timeline is drawn, and a filter can
             take it away underneath this chip. Doing nothing is the right
             answer to "scroll to something that is not there". */
          <button
            type="button"
            className="musie-graph__more"
            /* THE WHOLE SENTENCE IS HERE, and only `+1` is drawn. A
               seven-column grid on a 393px phone gives each day about 44px,
               and 'Noch 1 an diesem Tag' spilled out through the scroller's
               edge — measured, and it read as a clipped label rather than as
               a control.

               So the two audiences get what each can use: the eye gets a
               token that fits the column, and a screen reader gets a sentence
               that says what pressing it does. `+1` alone as an accessible
               name would be a button called "plus one". */
            aria-label={t('diary.graph.more', { count: String(overflow) })}
            onClick={() => {
              document.getElementById(dayAnchorId(day.key))?.scrollIntoView({
                /* CENTRE, NOT START, and the reason is the sticky header.
                   `block: 'start'` puts the group's top edge at the viewport's
                   top edge — which is UNDER `.musie-header`, so the heading
                   the reader was sent to is the one thing they cannot see.

                   The usual fix is `scroll-margin-block-start` on the target.
                   The target is `.musy-timeline__group`, a DESIGN-SYSTEM
                   class, and a screen reaching in to set geometry on one is
                   exactly what CLAUDE.md rule 1 and L14 forbid. Centring needs
                   no CSS at all and clears the header by construction.

                   `behavior: 'auto'`, so the OS's reduced-motion setting is
                   respected by not animating in the first place. */
                block: 'center',
                behavior: 'auto',
              });
            }}
          >
            {/* `aria-hidden`, because the button above it is already named.
                Without it a screen reader hears the label AND the badge's
                text — 'Noch 1 an diesem Tag, plus 1'.

                No `statusWord`: `outline` is not a status variant, so it has
                no word to suppress and passing one would be noise. */}
            <span aria-hidden="true">
              <Badge variant="outline">{`+${String(overflow)}`}</Badge>
            </span>
          </button>
        )}

      </div>

      {/* The axis. `aria-hidden`: the weekday and the number are a visual
          index into a list whose every item already names its own date, and
          a screen reader walking seven unlabelled "Mo 22" pairs between the
          links would be reading the grid lines aloud. */}
      <p className="musie-graph__axis" aria-hidden="true">
        <span className="musie-graph__weekday">{formatWeekday(day.date, locale)}</span>
        <span className="musie-graph__date">{formatDayOfMonth(day.date, locale)}</span>
      </p>
    </li>
  );
}

/**
 * ONE SESSION, AS ITS EXERCISE'S PICTURE.
 *
 * ── THE NAME IS ON THE LINK; THE IMAGE IS SILENT ────────────────────────
 * `alt=""`, deliberately, and this is the one place in the app where the
 * exercise's `image_alt` is fetched and not used. The link's accessible name
 * already says which session, which exercise and how it ended — an image
 * inside it describing the same artwork would make the link announce twice,
 * and the second half would be a description of a picture rather than of a
 * destination.
 *
 * ── AN EXERCISE WITH NO ARTWORK STILL GETS A MARK ───────────────────────
 * `image_url` is nullable, and `public.cards` and `public.user_types` still
 * point at artwork that was never created (see 20260924140000's header). A
 * missing picture renders as the empty tile the stylesheet draws — a filled
 * shape with the exercise's initial — rather than as a broken image or a gap
 * in the stack. The session happened either way, and the stack is a count of
 * sessions before it is a gallery.
 */
function SessionMark({ entry, latest }: { entry: DiaryEntry; latest: boolean }) {
  const t = useT();
  const { locale } = useLocale();
  const abandoned = entry.status === 'abandoned';

  const name = t('diary.graph.session', {
    title: t('diary.sessionTitle', { when: formatShortDateTime(entry.startedAt, locale) }),
    exercise: entry.exerciseName,
    /* THE STATUS IN WORDS, because the dash does not survive a colour-blind
       reading, a high-contrast mode or a screen reader. 1.4.1, and the same
       three-way redundancy the status badge on the card uses. */
    status: t(abandoned ? 'session.status.abandoned' : 'session.status.finished'),
  });

  return (
    <Link
      className="musie-graph__mark"
      to={`/diary/${encodeURIComponent(entry.id)}`}
      /* THE MARK IS A RING; THE NAME SAYS WHY — Ben, 2026-09-28, replacing the
         inline card. The ring is a colour and a width, so the word goes into
         the accessible name beside it or the highlight exists only for people
         who can see it (1.4.1). Appended rather than prefixed: which session
         it is comes first, and *neueste Session* is a qualifier on it. */
      aria-label={latest ? `${name}, ${t('diary.latest')}` : name}
      data-status={entry.status}
      data-latest={latest ? '' : undefined}
    >
      {entry.imageUrl === null ? (
        /* The initial, as a stand-in. `aria-hidden` because the link is
           already named — this is the visual half of a link that speaks for
           itself. */
        <span className="musie-graph__initial" aria-hidden="true">
          {entry.exerciseName.slice(0, 1)}
        </span>
      ) : (
        <img
          className="musie-graph__image"
          src={entry.imageUrl}
          alt=""
          /* `lazy`: a diary spanning a year builds every week's columns, and
             the reader sees one week. Nothing off-screen should cost a
             request. */
          loading="lazy"
          decoding="async"
        />
      )}
    </Link>
  );
}

/**
 * START ONE TODAY — the plus at the top of today's stack.
 *
 * ── THE SAME TWO GATES `StartAnother` APPLIES, AND FOR ITS REASONS ──────
 * No user type recorded → `/about-you` asks who they are here as first;
 * otherwise `/exercises`, which is the only screen that writes a session. So
 * this is a `Link`, and every way a start can fail is answered where it is
 * already answered rather than in a second copy here.
 *
 * ── AND THE THIRD, WHICH IS WHY IT READS THE RUNNING SESSION ────────────
 * While a session is running there is no *Start a session* anywhere in the
 * product: the drawer offers *Continue session* instead, because starting a
 * second one is refused by a partial unique index. This follows that rule
 * rather than restating it — with a run in progress the control is simply
 * absent.
 *
 * UNTIL THE READ LANDS IT IS ALSO ABSENT, which is where this differs from
 * `StartAnother`'s busy-and-disabled button, and deliberately. That control is
 * the forward move on the screen and its absence would be a hole; this one is
 * a 44px glyph on top of a column, and a disabled-then-enabled plus is a
 * target appearing under a thumb that is already travelling. Not knowing is
 * answered by not offering.
 */
function StartToday() {
  const t = useT();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { data: running, loading, error } = useActiveSession();

  if (loading || error !== null) return null;
  if (running !== null) return null;

  /* /about-you while the profile is still loading, for the drawer's reason:
     asking who somebody is here as a second time is recoverable, and skipping
     the question is not. */
  const href = profile?.user_type_id ? '/exercises' : '/about-you';

  return (
    <div className="musie-graph__start">
      {/* A BUTTON THAT NAVIGATES, not a link — and that is IconButton's shape
          rather than this screen's preference: the component `Omit`s `render`
          from its props, because it wraps its trigger in a Tooltip and owns
          that composition itself. The header's menu control does exactly this
          (`AppShell`), so this is the app's existing answer rather than a new
          one.

          The cost is real and worth naming: no middle-click, no "open in new
          tab", no href in the status bar. For the four image links in a stack
          that cost would be wrong, which is why those ARE links; for a control
          that starts something it is acceptable — starting a session in a
          second tab is not a thing anybody wants. Logged with the component
          gap in OPEN-QUESTIONS.md. */}
      <IconButton
        glyph={Plus}
        label={t('diary.graph.start')}
        variant="ghost"
        size="primary"
        onClick={() => navigate(href)}
      />
    </div>
  );
}
