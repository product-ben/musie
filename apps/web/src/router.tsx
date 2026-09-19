/**
 * The route table.
 *
 * A data router (`createBrowserRouter`), which is what makes the step
 * validation below a loader redirect rather than a render-time one.
 *
 * Every screen is a real route. There is no modal-only navigation: /settings
 * presents as a sheet but IS a route, so Back closes it and the URL is
 * linkable. The nav drawer arrives the same way in 2.5.
 */
import { createBrowserRouter, redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { AppShell } from './AppShell';
import { SettingsSheet } from './SettingsSheet';
import { MenuDrawer } from './routes/MenuDrawer';
import { Exercises } from './routes/Exercises';
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
        index: true,
        element: <Placeholder titleKey="route.landing.title" />,
        handle: handle({ titleKey: 'route.landing.title' }),
      },
      {
        path: 'about',
        element: <Placeholder titleKey="route.about.title" />,
        handle: handle({ titleKey: 'route.about.title' }),
      },
      {
        /* A PLACEHOLDER, so the drawer's "Your diary" row is not a dead link
           into Not found. The diary screen itself is a later phase. */
        path: 'diary',
        element: <Placeholder titleKey="route.diary.title" />,
        handle: handle({ titleKey: 'route.diary.title' }),
      },
      {
        path: 'exercises',
        element: <Exercises />,
        handle: handle({ titleKey: 'route.exercises.title', wide: true }),
      },
      {
        path: 'session/:id/:step',
        loader: sessionLoader,
        element: <Placeholder titleKey="route.session.title" />,
        handle: handle({ titleKey: 'route.session.title', wide: true }),
      },
      {
        path: 'done',
        element: <Placeholder titleKey="route.done.title" />,
        handle: handle({ titleKey: 'route.done.title', wide: true }),
      },
      {
        /* An overlay route, like settings: linkable, and Back closes it. */
        path: 'menu',
        element: <MenuDrawer />,
        handle: handle({ titleKey: 'menu.title', overlay: true }),
      },
      {
        path: 'settings',
        element: <SettingsSheet />,
        handle: handle({ titleKey: 'route.settings.title', overlay: true }),
      },
      {
        path: '*',
        element: <Placeholder titleKey="route.notFound.title" />,
        handle: handle({ titleKey: 'route.notFound.title' }),
      },
    ],
  },
]);
