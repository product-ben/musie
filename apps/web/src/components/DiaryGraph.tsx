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
 * The only script is the initial scroll to the end, which is a `scrollLeft`
 * written once on mount. `behavior: 'auto'` deliberately — this is not an
 * animation the reader asked for, it is where the scroller starts, and a
 * smooth scroll on arrival would be motion for its own sake.
 *
 * ── IT DOES NOT LISTEN TO THE FILTER ────────────────────────────────────
 * Ben's call, and it holds up: the graph is a constant overview of what you
 * have done, and the segments are a question about the list. A graph that
 * emptied when somebody asked to see only unfinished sessions would be
 * answering a different question with the same picture.
 *
 * ── AN ABANDONED SESSION IS DIMMED, NOT ABSENT ──────────────────────────
 * D7: the diary records what happened, and a session you walked out of
 * happened. It is drawn with reduced opacity and a dashed outline — the same
 * distinction the `outline` badge variant makes on the card — and, because
 * neither of those survives a colour-blind or high-contrast reading, its
 * accessible name says so in words too.
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
 * the plus, `Badge` for the overflow count, `ContentBox` for the empty state.
 */
import * as React from 'react';
import { Link, useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import { Badge, ContentBox, IconButton } from '@musie/design-system';
import { useLocale, useT } from '../i18n/localeContext';
import { useProfile } from '../lib/profileContext';
import { useActiveSession } from '../lib/session';
import {
  dayAnchorId, formatDayOfMonth, formatShortDateTime, formatWeekday, stackOf, weeksFrom,
} from '../lib/diary';
import type { DiaryEntry } from '../lib/diary';

export function DiaryGraph({ entries }: { entries: readonly DiaryEntry[] }) {
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
   * START AT THE CURRENT WEEK, which is the last page.
   *
   * A layout effect, not an effect: the scroll has to be in place before the
   * browser paints, or the reader sees the oldest week for a frame and then
   * the scroller jumps. It runs when the number of weeks changes — a deleted
   * session can shorten the run — and `scrollWidth` is read at that moment
   * rather than derived, because the page width is the container's and this
   * component does not know it.
   */
  React.useLayoutEffect(() => {
    const element = scroller.current;
    if (element === null) return;
    element.scrollLeft = element.scrollWidth;
  }, [weeks.length]);

  return (
    <section
      className="musie-graph"
      aria-labelledby="diary-graph-label"
      /* The row count, for the stack's reserved height. A custom property
         rather than a height: the screen supplies the DATA and the stylesheet
         keeps the arithmetic over its own tokens. */
      style={{ '--musie-graph-rows': rows } as React.CSSProperties}
    >
      {/* The region's name. Visible, because it says what the picture IS —
          a sighted reader needs that as much as a screen-reader one, and a
          chart with no title is a chart you have to work out. */}
      <h2 className="musie-graph__label" id="diary-graph-label">
        {t('diary.graph.label')}
      </h2>

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
      >
        {weeks.map((week) => (
          <ol
            className="musie-graph__week"
            key={week.key}
            aria-label={t('diary.graph.weekLabel', {
              when: formatShortDateTime(week.days[week.days.length - 1].date, locale),
            })}
          >
            {week.days.map((day) => (
              <Day key={day.key} day={day} />
            ))}
          </ol>
        ))}
      </div>

      {/* DAY ONE. Drawn UNDER the week rather than instead of it: the columns
          and the plus are the invitation, and a box saying "nothing here yet"
          on top of a perfectly good empty calendar would say less than the
          calendar does. `outline="dashed"` is the system's own way of drawing
          a place where something will be, which is what both of /diary's
          other empty states use. */}
      {entries.length === 0 && (
        <ContentBox
          headline={t('diary.empty')}
          headingLevel={3}
          headlineHidden
          text={t('diary.graph.empty')}
          outline="dashed"
        />
      )}
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
function Day({ day }: { day: { key: string; date: string; dayOffset: number; entries: DiaryEntry[] } }) {
  const t = useT();
  const { locale } = useLocale();
  const { shown, overflow } = stackOf(day.entries);
  const today = day.dayOffset === 0;

  return (
    <li className="musie-graph__day" data-today={today ? '' : undefined}>
      <div className="musie-graph__stack">
        {/* The plus, on top of today's stack and nowhere else. */}
        {today && <StartToday />}

        {/* THE COUNT, ABOVE THE FOUR IT COUNTS. A `Badge` rather than a
            number in a div: it is a small labelled token, which is what a
            badge is, and it inherits the set's own geometry and contrast.
            It is a Link, so the way out of a capped day is the list below —
            the one place every session is reachable in full. */}
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

        {/* `stackOf` returns these OLDEST FIRST within the day, which is the
            one place this app reverses the query's order: a stack grows
            upward, and the session you did first is at the bottom of it. */}
        <ol className="musie-graph__sessions">
          {shown.map((entry) => (
            <li key={entry.id}>
              <SessionMark entry={entry} />
            </li>
          ))}
        </ol>
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
function SessionMark({ entry }: { entry: DiaryEntry }) {
  const t = useT();
  const { locale } = useLocale();
  const abandoned = entry.status === 'abandoned';

  const name = t('diary.graph.session', {
    title: t('diary.sessionTitle', { when: formatShortDateTime(entry.startedAt, locale) }),
    exercise: entry.exerciseName,
    /* THE STATUS IN WORDS, because the dim and the dash do not survive a
       colour-blind reading, a high-contrast mode or a screen reader. 1.4.1,
       and the same three-way redundancy the status badge on the card uses. */
    status: t(abandoned ? 'session.status.abandoned' : 'session.status.finished'),
  });

  return (
    <Link
      className="musie-graph__mark"
      to={`/diary/${encodeURIComponent(entry.id)}`}
      aria-label={name}
      data-status={entry.status}
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
