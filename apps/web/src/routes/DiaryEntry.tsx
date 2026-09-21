/**
 * /diary/:id — one entry, presented as a LIGHTBOX over the diary.
 *
 * ── THE DESIGN ─────────────────────────────────────────────────────────────
 * "Timeline with one nicely designed content box with all data available on
 * the session & exercise (user can e.g. listen again to the track while
 * reading what he/she wrote)" — and then, on review: "a lightbox and content
 * card", opening over the list instead of replacing it, "better for the flow".
 *
 * So: ONE framed `ContentBox` carrying everything the client is allowed to
 * know about that session, its exercise, its card and its answer — with the
 * recording offered back beside the answer rather than on a screen of its own
 * — brought forward over /diary rather than drawn in place of it.
 *
 * ── STILL A ROUTE, AND THAT IS THE POINT ───────────────────────────────────
 * This is NOT a modal rendered from the list's state. `/diary/:id` is a real
 * route that declares `overlay: true` (router.tsx), which is the same thing
 * /menu and /settings do: Back closes it, the URL is linkable, and AppShell
 * keeps the last non-overlay page mounted beneath and re-renders it. The rule
 * router.tsx opens with — every screen is a real route, there is no modal-only
 * navigation — is what made a lightbox affordable here at all.
 *
 * ── THE TIMELINE IS GONE ───────────────────────────────────────────────────
 * A `Timeline` of exactly one group was right while this REPLACED the diary:
 * the two screens then drew the same furniture and the day heading sat in the
 * same place on both. Inside a lightbox it is noise — a rail and a marker for
 * a single box, repeating a date the box already states as its *When* row, on
 * top of a list that is still visible behind the scrim and already grouped by
 * day. Nothing is lost: the date is a `<dl>` row, which is where a labelled
 * fact belonged all along.
 *
 * ── AND SO IS THE BACK CTA ─────────────────────────────────────────────────
 * "Back to your diary" existed because this screen COVERED the diary and a
 * screen whose data is missing is exactly the screen a user needs a way out
 * of. The overlay answers that better than the button did: the diary is on
 * screen behind the scrim, and Escape, the close X and the scrim itself all
 * return to it. A fourth affordance doing what the X does would read, at the
 * bottom of a card, as an action on the card.
 *
 * ── WHAT IS A ROW AND WHAT IS NOT ──────────────────────────────────────────
 * `ContentList` is a `<dl>`, and a `<dl>` row is a LABEL and its content. So
 * the facts the catalogue has WRITTEN a label for are rows — when, how long,
 * the card — and the facts it has written as values are rendered as what they
 * are: the exercise name is the box's heading, its description the box's
 * supporting text, the status a badge, and *Stopped at …* a quiet line.
 *
 * That split is the catalogue's own, not an invention. `diary.when`,
 * `diary.howLong` and `diary.card` are labels; `diary.duration`,
 * `diary.stoppedAt`, `session.status.finished` and `session.status.abandoned`
 * are values with no label written beside them. Inventing a "Status" key to
 * make every fact a row would be writing copy this step was told not to write,
 * and labelling a row with a value reads as a definition of the wrong term.
 *
 * ── STRUCTURE FROM COMPONENTS, NOT FROM A NEW CLASS ────────────────────────
 * `Lightbox` + `ContentBox` (framed, via `header`) + `ContentList` +
 * `Badge` / `BadgeRow` + `TrackButton`, with a nested `sunken` `ContentBox`
 * for the answer. Not one `musie-` block was added, because a custom pattern
 * is permitted only where the system has NO component (10-layout.md L14) and
 * here it has six. Nothing below styles a component from outside — where the
 * layout needed something the box does not do, the answer was another
 * component rather than a class. The one thing the system could NOT do was
 * be opened by a URL, and that went into the system: `Lightbox.trigger` is
 * now optional, which is L14's own instruction and CtaButton's `align` all
 * over again. The only app class left here is the shell's `.musie-note`.
 *
 * ── EVERY STRING IS PASSED ─────────────────────────────────────────────────
 * `ContentList`'s `emptyLabel` is passed even on a list that cannot be empty
 * when it renders, because the rule is the habit. The one deliberate exception
 * is documented on `ListenAgain`: three transport verbs, one key, and the
 * right source for the other two is the package's own locale catalogue.
 *
 * ── A MISSING ENTRY IS A 404; A RUNNING ONE IS A REDIRECT ──────────────────
 * Nothing failed: there is no such entry, or it is not this person's, and RLS
 * makes those indistinguishable on purpose. So it is a sentence and a way
 * back, not an error banner — an error would blame the network for a URL.
 *
 * A session that is still RUNNING used to get that same sentence, which was
 * true of the diary and useless to the person: the session exists, it is
 * theirs, and the nav drawer is already offering it as *Continue session*. It
 * now redirects into the session at the step it is on — see the `<Navigate>`
 * at the top of `DiaryEntry`, where the choice is argued against router.tsx's
 * reason for this route having no loader.
 */
import { Navigate, useParams } from 'react-router';
import { Lightbox, Message } from '@musie/design-system';
import { useT } from '../i18n/localeContext';
import { useCloseOverlay } from '../lib/useCloseOverlay';
import { useDiaryEntry } from '../lib/useDiary';
import { sessionPath } from '../lib/diary';
/* THE CARD ITSELF LIVES IN A COMPONENT, because /diary renders the same one
   inline for the newest entry. This route is now the frame and the four
   states around it, and nothing else. */
import { DiaryCard } from '../components/DiaryCard';

export function DiaryEntry() {
  const t = useT();
  const params = useParams();
  /**
   * Closing, and the ONE thing this overlay needed that the other two did not.
   *
   * `useCloseOverlay` goes back a history entry, and falls back to a path when
   * there is nothing to go back to — a cold deep-link, where React Router
   * labels the only entry 'default'. /menu and /settings take the default '/',
   * because they cover whatever page you were on and belong to no one page.
   * An ENTRY belongs to the list it is an entry of, so this one passes
   * '/diary': closing it lands where closing it means to land, whether the
   * person clicked a row to get here or pasted the URL.
   */
  const close = useCloseOverlay('/diary');
  /* No route matches /diary/ with an empty segment, so the fallback is for the
     type rather than for a user: an empty id reads as no entry, which is the
     404 branch and already correct. */
  const { data, loading, error } = useDiaryEntry(params.id ?? '');

  /**
   * THE RUNNING-SESSION REDIRECT, and why it is here rather than in a loader.
   *
   * router.tsx says the diary entry deliberately has no loader: the screen
   * reads the id through the same hook every other screen uses, so loading,
   * failure and a missing entry are one set of states written once, where a
   * loader would move the 404 into the router and leave the other two here.
   * That argument holds for the redirect too — and gets stronger. A loader
   * would have to read the row ITSELF to find out the status, so the row would
   * be fetched twice on every entry: once to decide whether to redirect, once
   * to draw. Two reads, two places where the locale fallback and the status
   * narrowing live, to save nothing.
   *
   * `<Navigate>` costs what a loader redirect was avoiding — one render before
   * the navigation — and that render is already reached AFTER the read
   * resolved, so nothing of this screen has painted: the loading line is what
   * was on screen, and it is replaced by the session. A `<Navigate>` that
   * flashes the wrong step, which is what sessionLoader exists to prevent,
   * would need this screen to render the session, and it renders no part of it.
   *
   * `replace`, so Back goes where the person came from rather than to a URL
   * that only ever bounces them forward again.
   */
  if (data !== null && data.kind === 'running') {
    return <Navigate to={sessionPath(data.session)} replace />;
  }

  /* `data.kind === 'running'` already returned above, so anything non-null
     here is the entry. Narrowed once, into a plain `entry | null`, because the
     title and the body both have to ask the same question. */
  const entry = data === null ? null : data.entry;

  let body;
  if (loading) {
    body = <p className="musie-note">{t('content.loading')}</p>;
  } else if (error !== null) {
    body = (
      <Message
        variant="error"
        live="assertive"
        /* h3, not h2: the lightbox's own title is the h2 inside the popup, so
           a banner that REPLACES the box sits where the box's headline sat. */
        headingLevel={3}
        headline={t('content.error')}
        text={t('content.errorDetail')}
      />
    );
  } else if (entry === null) {
    body = <p className="musie-note">{t('diary.notFound')}</p>;
  } else {
    /* h3: the lightbox's own title is the h2 above it. On /diary the same
       card is an h2, under the page title — which is exactly why the level is
       a prop rather than a default. */
    body = <DiaryCard entry={entry} headingLevel={3} />;
  }

  /**
   * ── THE LIGHTBOX OPENS IMMEDIATELY, AND WAITS INSIDE ITSELF ──────────────
   * `open` is a literal, not `entry !== null`. The alternative — open it once
   * the read lands — leaves the loading line, the error banner and the 404
   * sentence rendered into `<main>` BEHIND the scrim of a lightbox that has
   * not opened yet, which is a page nobody can read and nobody can dismiss.
   * Worse for the failures than for the success: the states that most need a
   * way out are exactly the ones that would not have one.
   *
   * So the frame arrives with the navigation and the four states happen inside
   * it. The popup is content-sized, so it grows from the loading line to the
   * entry rather than reserving a box-shaped hole.
   *
   * ── ONE STRING, AND THE BOX'S HEADLINE WON ───────────────────────────────
   * `title` is required and the exercise name is already the ContentBox's
   * headline, so one of the two has to go. The BOX's wins, and `titleHidden`
   * keeps the name as the dialog's accessible name without drawing it twice:
   * the box's headline is the one the framed header is built around — it sits
   * above the hairline with the status badge and the exercise's description.
   * Hiding it and re-drawing the same string above the box would move the
   * headline out of the header it belongs to, for nothing. It is also the
   * pattern Lightbox itself documents for this, and the one its `TitleHidden`
   * story shows.
   *
   * The string IS still in the accessible tree twice — an sr-only h2 (the
   * dialog's name) and the visible h3 — which SettingsSheet avoided by making
   * Dialog.Title the h1 itself. Lightbox offers no way to do that, since it
   * renders Dialog.Title for you. Logged as a gap rather than worked around
   * with a second heading level of invention.
   *
   * In the other three states there IS no box and so no visible heading, so
   * the route's own title is shown rather than hidden: a popup holding one
   * grey sentence and no name is a box of text that arrived from nowhere.
   */
  return (
    <Lightbox
      open
      title={entry === null ? t('route.diaryEntry.title') : entry.exerciseName}
      titleHidden={entry !== null}
      /* Rule 7: the package's catalogue would answer in the right language
         here, and it is still passed — the app owns this word. */
      closeLabel={t('common.closeLabel')}
      /* Escape, the close X and the scrim all arrive as `false` here, so all
         three do exactly what Back does and cannot drift apart. */
      onOpenChange={(next) => {
        if (!next) close();
      }}
      /* `finalFocus` is deliberately NOT passed. Unset, base-ui returns focus
         to whatever was focused as the popup mounted — the diary row that was
         clicked, which is still mounted behind the scrim because AppShell
         keeps the page beneath an overlay alive. That is the right answer and
         the row is the only element this screen could name anyway; it lives in
         Diary.tsx and there is no ref to reach it by. On a cold deep-link
         there was no row, and focus returns to where it came from: nothing. */
    >
      {body}
    </Lightbox>
  );
}

