/**
 * The page: header, the app's REAL stepper in a memory router, the name modal
 * over it, our own reflect step and thank-you state.
 *
 * ── HOW THE REFLECT STEP IS SWAPPED WITHOUT TOUCHING Session.tsx ──────────
 * Session navigates to `/session/:id/<step>`. In this router the static
 * segment `/session/:id/reflect` outranks `/session/:id/:step`, so every
 * navigation into reflect lands on <ReflectionStep/> instead of Session's own
 * reflect UI. Everything before it is Session.tsx, unmodified, reading the
 * baked content through the shims (see vite.config.ts).
 *
 * A memory router, not a browser router: a reload of a sub-path would fall
 * back to the app's index.html and show the sign-in gate. Paths Session
 * reaches for that do not exist here (/exercises, /diary) land back on intro.
 */
import * as React from 'react';
import { Navigate, RouterProvider, createMemoryRouter, redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { MusyLocaleProvider, MusyTooltipProvider } from '@musie/design-system';
import { Session } from '../../../src/routes/Session';
import { isStepId } from '../../../src/routeHandle';
import { useLocale } from '../../../src/i18n/localeContext';
import { ENABLED } from './config';
import { ExperimentProvider, useCopy, useExperiment, type Participant } from './context';
import { ExperimentLocaleProvider } from './locale';
import { RUN } from './run';
import { Header } from './Header';
import { NameModal } from './NameModal';
import { ReflectionStep } from './ReflectionStep';
import { ThankYou } from './ThankYou';
import { languageChanged, landingViewed, participantStarted } from './track';

export const INTRO_PATH = `/session/${RUN.sessionId}/intro`;
export const DONE_PATH = '/done';

function stepLoader({ params }: LoaderFunctionArgs) {
  if (!isStepId(params.step)) return redirect(INTRO_PATH);
  return null;
}

const router = createMemoryRouter(
  [
    { path: '/session/:id/reflect', element: <ReflectionStep /> },
    { path: '/session/:id/:step', loader: stepLoader, element: <Session /> },
    { path: DONE_PATH, element: <ThankYou /> },
    { path: '*', element: <Navigate to={INTRO_PATH} replace /> },
  ],
  { initialEntries: [initialPath()] },
);

/** DEV ONLY: `?step=reflect` (or `listen`, `play`, `done` …) opens that step
    directly — for demos and checks without listening 90 s first. A production
    build ignores it: `import.meta.env.DEV` is false there. */
function initialPath(): string {
  if (!import.meta.env.DEV || typeof window === 'undefined') return INTRO_PATH;
  const step = new URLSearchParams(window.location.search).get('step');
  if (step === 'done') return DONE_PATH;
  if (step !== null && isStepId(step)) return `/session/${RUN.sessionId}/${step}`;
  return INTRO_PATH;
}

/** The current memory-router location, for the header and tracking. */
export function currentStepKey(): string {
  const path = router.state.location.pathname;
  if (path === DONE_PATH) return 'done';
  return path.split('/').pop() ?? '';
}

function DesignSystemLocale({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  return <MusyLocaleProvider locale={locale}>{children}</MusyLocaleProvider>;
}

function Notice({ text }: { text: string }) {
  return (
    <div className="musie-stage">
      <p className="musie-reflexion-notice">{text}</p>
    </div>
  );
}

function Run() {
  const { participant } = useExperiment();
  React.useEffect(() => {
    landingViewed();
  }, []);
  return (
    <>
      <RouterProvider router={router} />
      {participant === null && <NameModal />}
    </>
  );
}

function Page() {
  const copy = useCopy();
  let body: React.ReactNode;
  if (RUN.exercise === null) body = <Notice text={copy.unknownLink} />;
  else if (!ENABLED) body = <Notice text={copy.ended} />;
  else body = <Run />;
  return (
    <div className="musie-app musie-reflexion">
      <Header />
      <main id="main" className="musie-main" data-wide="1">
        {body}
      </main>
    </div>
  );
}

export function App() {
  const exercise = RUN.exercise;
  const onStart = React.useCallback((participant: Participant, returning: boolean) => {
    participantStarted(participant, returning);
  }, []);
  const onLanguage = React.useCallback((from: string, to: string) => {
    languageChanged(from, to, currentStepKey());
  }, []);

  const page = (
    <DesignSystemLocale>
      <MusyTooltipProvider>
        <Page />
      </MusyTooltipProvider>
    </DesignSystemLocale>
  );

  return (
    <ExperimentLocaleProvider germanOnly={exercise?.languages.length === 1} onChange={onLanguage}>
      {exercise === null ? page : (
        <ExperimentProvider exercise={exercise} onStart={onStart}>
          {page}
        </ExperimentProvider>
      )}
    </ExperimentLocaleProvider>
  );
}
