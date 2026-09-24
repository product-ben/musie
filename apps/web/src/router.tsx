/**
 * The route table.
 *
 * A data router (`createBrowserRouter`), which is what makes the step
 * validation below a loader redirect rather than a render-time one.
 *
 * Every screen is a real route. There is no modal-only navigation: /menu
 * presents as a drawer but IS a route, so Back closes it and the URL is
 * linkable, and /diary/:id — a lightbox over the diary — arrives the same way.
 * `handle.overlay` is the whole of the difference between a screen that
 * replaces the page and one that comes forward over it.
 *
 * /settings WAS THE THIRD, and it is gone (Ben, 2026-09-24): its three
 * preferences moved into the drawer, delete-everything moved onto /diary, and
 * *Here as* went entirely — /about-you already asks it. One overlay to find
 * instead of two, and one fewer icon in the header. Nothing redirects /settings
 * to anything: it was two weeks old, linked from one icon in our own header and
 * never printed or sent anywhere, so a stale URL lands on the not-found route
 * like any other typo.
 */
import { createBrowserRouter, redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { AppShell } from './AppShell';
import { AboutMusie } from './routes/AboutMusie';
import { AboutYou } from './routes/AboutYou';
import { MenuDrawer } from './routes/MenuDrawer';
import { Diary } from './routes/Diary';
import { DiaryEntry } from './routes/DiaryEntry';
import { Exercises } from './routes/Exercises';
import { ScanLink } from './routes/ScanLink';
import { Session } from './routes/Session';
import { Placeholder } from './routes/Placeholder';
import { isStepId } from './routeHandle';
import type { RouteHandle } from './routeHandle';

/** `handle` is `any` on RouteObject; this puts the type back. */
const handle = (value: RouteHandle): RouteHandle => value;

/**
 * Validate `:step` against the four step ids and send an unknown one to intro.
 *
 * In a LOADER, not in the component. A loader redirect resolves before
 * anything renders, so a bad step never paints — where a `<Navigate>` would
 * mount the wrong step first and flash it. It also means a directly typed
 * /session/x/banana behaves identically to one reached by clicking.
 *
 * `:id` is carried, not looked up. There is no session data yet, and the
 * redirect preserves the id so the carry is observable in the address bar.
 */
function sessionLoader({ params }: LoaderFunctionArgs) {
  if (!isStepId(params.step)) {
    return redirect(`/session/${encodeURIComponent(params.id ?? '')}/intro`);
  }
  return null;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        /* `/` IS About Musie, rather than a redirect to `/about-musie`. A root
           that only redirects costs a round trip and leaves the site with no
           home — and the pair then reads right: `/` is about the product,
           `/about-you` is about the reader. */
        index: true,
        element: <AboutMusie />,
        handle: handle({ titleKey: 'route.aboutMusie.title' }),
      },
      {
        /* `about-you`, not `about`: one spelling per route, and the path now
           says which "about" it is. */
        path: 'about-you',
        element: <AboutYou />,
        handle: handle({ titleKey: 'route.aboutYou.title' }),
      },
      {
        path: 'diary',
        element: <Diary />,
        handle: handle({ titleKey: 'route.diary.title' }),
      },
      {
        /* The `:id` IS looked up now — that is what C.7 changed. No loader,
           though: the screen reads it through the same hook every other screen
           uses, so loading, failure and a missing entry are one set of states
           written once. A loader would move the 404 into the router and leave
           the other two here.

           THAT SURVIVED THE SCREEN GAINING A REDIRECT. Deep-linking a session
           that is still running now sends the person into the session rather
           than to "this entry does not exist", which is the one thing a loader
           would ordinarily be for — sessionLoader below is exactly that. It
           stays out of one anyway, because the redirect needs the ROW: only
           the session's own status and step can say whether to redirect and to
           where. A loader would have to read it, and the screen would read it
           again to draw it — two fetches of one row, and two places holding
           the locale fallback and the status narrowing, to save one render
           that nothing has painted from. `sessionLoader` has no such cost: it
           reads a URL segment, not a table. See DiaryEntry.tsx.

           AND IT SURVIVED THE ENTRY BECOMING AN OVERLAY as well, because
           `overlay` changes nothing about the fetch: the screen still reads
           the id through the same hook, still holds loading, failure and the
           404 in one place, and now shows all three inside the lightbox
           rather than behind it. What `overlay: true` changes is where the
           element is rendered — AppShell keeps the last non-overlay page
           mounted beneath it, so the diary is still on screen behind the
           scrim. The route is still a route: Back closes it and the URL is
           still linkable, which is this file's opening rule and the only
           reason a modal was allowed here at all. */
        path: 'diary/:id',
        element: <DiaryEntry />,
        handle: handle({
          titleKey: 'route.diaryEntry.title',
          overlay: true,
          /* And on a COLD deep-link there is no held page, so the route names
             the one it belongs to. /menu cannot: it covers whatever page you
             were on and belongs to none of them. An entry can — it is an entry
             OF this list, and pasting its URL should open it over the diary
             rather than over nothing. Same element the `diary` route renders. */
          beneath: { element: <Diary />, path: '/diary' },
        }),
      },
      {
        path: 'exercises',
        element: <Exercises />,
        handle: handle({ titleKey: 'route.exercises.title', wide: true }),
      },
      {
        path: 'session/:id/:step',
        loader: sessionLoader,
        element: <Session />,
        handle: handle({ titleKey: 'route.session.title', wide: true }),
      },
      {
        /* WHAT THE QR CODE ON A PAPER CARD POINTS AT — E.0.
           `/s/:code`, and the path is two characters because it is printed:
           every character in it is a character of a URL somebody's camera has
           to resolve and somebody's eye has to check against the card.

           SAME-ORIGIN, deliberately. The route is relative, so it works on
           localhost, on a LAN address a phone can reach, on a preview and on
           a domain that does not exist yet — which is what let E.0 be built
           and tested with no domain at all. The decoder never compares a
           host; see lib/scanCode.ts.

           NO LOADER, unlike the session below. `sessionLoader` validates a URL
           segment and nothing else, which is why it can be a loader; this
           route has to READ — the card, the running session and its exercise —
           and every one of those reads has a loading, failing and empty state
           that the screen already knows how to draw. Same argument diary/:id
           makes above, for the same reason. */
        path: 's/:code',
        element: <ScanLink />,
        handle: handle({ titleKey: 'scan.route.title' }),
      },
      {
        /* THE DEV QR SHEET, AND IT IS LAZY ON PURPOSE — E.0.
           `lazy` rather than `element`, because this module is the only
           importer of `qrcode` in the app: loaded this way the encoder lands
           in its own chunk and a visitor who never types /dev/qr downloads
           none of it. Measured, not assumed — the main bundle is unchanged by
           this route's existence.

           It is a TOOL, not a screen: it exists so E.2 and E.3 have something
           to point a camera at before the deck is printed. It is not linked
           from anywhere in the product, and nothing should link to it. */
        path: 'dev/qr',
        lazy: async () => {
          const { DevQrSheet } = await import('./routes/DevQrSheet');
          return { Component: DevQrSheet };
        },
        handle: handle({ titleKey: 'scan.dev.title' }),
      },
      /* `/done` IS GONE. The prototype ended on a screen that acknowledged the
         session and offered to share it; C.2 cut sharing, and D.5 routes a
         finished run straight into its own diary entry — which already says
         what happened, in the place the person will look for it again. An end
         screen between the two would be a page whose only content is that it
         is not the diary yet. */
      {
        /* An overlay route: linkable, and Back closes it. */
        path: 'menu',
        element: <MenuDrawer />,
        handle: handle({ titleKey: 'menu.title', overlay: true }),
      },
      {
        path: '*',
        element: <Placeholder titleKey="route.notFound.title" />,
        handle: handle({ titleKey: 'route.notFound.title' }),
      },
    ],
  },
]);
