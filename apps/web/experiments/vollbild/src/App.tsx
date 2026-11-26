/**
 * The page: the listen step's overview inside the session's own panel, and
 * the focus sheet opening in FULLSCREEN when the transport is pressed.
 *
 * ── WHAT IS THE APP'S, AND WHAT IS THIS PAGE'S ────────────────────────────
 * `SessionListen` is the real step, unmodified: the overview, the transport,
 * and the `Sheet` it opens on `?focus`. This page adds two things and nothing
 * else (spikes stay spikes):
 *
 *   · INTO FULLSCREEN ON THE PRESS. A capturing click handler on the wrapper
 *     sees the tap on the stage's transport BEFORE the step's own handler
 *     navigates to `?focus`, and asks for fullscreen right there — inside the
 *     gesture, which is the only place a browser grants it.
 *   · OUT OF FULLSCREEN WITH THE SHEET. However the sheet closes — its X,
 *     Escape, the scrim, the browser's Back — `?focus` leaves the address, and
 *     the falling edge of that leaves fullscreen too.
 *
 * LEAVING FULLSCREEN DOES NOT CLOSE THE SHEET. On Android the first Back
 * gesture ends fullscreen and the second closes the sheet; that is the
 * browser's order and the experiment keeps it, so Ben can judge it.
 *
 * A browser router, not a memory router as in Reflexion: the browser's own
 * Back is one of the ways out of the sheet, and that is part of what is being
 * tried here. `main.tsx` writes `?overview` before the first render.
 */
import * as React from 'react';
import { RouterProvider, createBrowserRouter, useLocation, useNavigate, useSearchParams } from 'react-router';
import {
  InteractiveWizard, MusyLocaleProvider, MusyTooltipProvider, WizardPanel,
} from '@musie/design-system';
import { SessionListen } from '../../../src/components/SessionListen';
import { LocaleContext, useT } from '../../../src/i18n/localeContext';
import type { LocaleState } from '../../../src/i18n/localeContext';
import { skippedForRun, stepsForRun } from '../../../src/lib/exerciseKind';
import { questionText, questionsFor } from '../../../src/lib/questions';
import type { SessionQuestion } from '../../../src/lib/useQuestion';
import { STEP_ICON } from '../../../src/lib/stepIcons';
import { stepMessageKey } from '../../../src/routeHandle';
import { AUDIO, CARD, EXERCISE, LENGTH_SECONDS, SESSION_ID } from './fixture';
import {
  enterFullscreen, exitFullscreen, fullscreenAvailable, isFullscreen, isStandalone, onFullscreenChange,
} from './fullscreen';

const LOCALE: LocaleState = { locale: 'de', resolved: true, setLocale: () => {} };

/* The run's shape: a digital card run with one card — Einsteigen, Karte,
   Hören, Reflektieren. The rail shows the first two as done. */
const RUN = { digital: true, cardsDealt: 1 } as const;
const STEPS = stepsForRun(EXERCISE.kind, RUN);
const SKIPPED = skippedForRun(EXERCISE.kind, RUN);
const DONE = STEPS.slice(0, STEPS.indexOf('listen'));

/** The stage's transport — `SessionListen`'s own wrapper around `TrackButton`. */
const TRANSPORT = '.musie-listen__transport';

/**
 * The rotating question without a session row: Freie Bahn's set, in order.
 * Turning one down takes the next; at the end the step shows its dead end
 * and *Fragen zurücksetzen* starts again.
 */
function useFixtureQuestion(): SessionQuestion {
  const ids = questionsFor(EXERCISE.id);
  const [at, setAt] = React.useState(0);
  const id = at < ids.length ? ids[at] : null;
  const reject = React.useCallback(() => setAt((current) => current + 1), []);
  const reset = React.useCallback(() => setAt(0), []);
  return {
    id,
    text: id === null ? null : questionText(id, 'de'),
    rotates: ids.length > 0,
    assigning: false,
    canSwap: at < ids.length - 1,
    exhausted: ids.length > 0 && id === null,
    reject,
    reset,
  };
}

function useFullscreenNow(): boolean {
  const [now, setNow] = React.useState(isFullscreen);
  React.useEffect(() => onFullscreenChange(() => setNow(isFullscreen())), []);
  return now;
}

/** One line in the header band: what this browser can do, so a phone says it itself. */
function Status({ ended, fullscreen }: { ended: boolean; fullscreen: boolean }) {
  let text: string;
  if (ended) {
    text = 'Ende des Experiments. In der App ginge es jetzt weiter zum Reflektieren.';
  } else if (fullscreen) {
    text = 'Vollbild ist an.';
  } else if (isStandalone()) {
    text = 'Vom Home-Bildschirm geöffnet: Hier gibt es keine Browserleisten, die verschwinden könnten.';
  } else if (fullscreenAvailable()) {
    text = 'Dieser Browser kann Vollbild. Der Play-Knopf öffnet das Sheet ohne Adress- und Tab-Leiste.';
  } else {
    text = 'Dieser Browser kann kein Vollbild für Webseiten – Safari auf dem iPhone kann das nur für Videos. '
      + 'Das Sheet öffnet deshalb wie in der App.';
  }
  return <p className="musie-vollbild-status" role="status">{text}</p>;
}

function ListenPage() {
  const t = useT();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const focus = searchParams.has('focus');
  const [listened, setListened] = React.useState(false);
  const [ended, setEnded] = React.useState(false);
  const question = useFixtureQuestion();
  const fullscreen = useFullscreenNow();

  /* OUT WITH THE SHEET — on the falling edge only, so a page loaded straight
     on `?overview` does not ask to leave a fullscreen it never entered. */
  const wasFocus = React.useRef(focus);
  React.useEffect(() => {
    if (wasFocus.current && !focus) exitFullscreen();
    wasFocus.current = focus;
  }, [focus]);

  /* IN WITH THE PRESS. Capture phase, so this runs before the transport's own
     onClick navigates — and synchronously inside the tap, which is what the
     browser checks. While the sheet is open nothing here fires: a press on the
     sheet's own transport is play/pause, not a way back into fullscreen. */
  function onClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (focus) return;
    if (!(event.target instanceof Element)) return;
    if (event.target.closest(TRANSPORT) === null) return;
    enterFullscreen();
  }

  /* *Weiter zum Reflektieren*: there is no reflect step here. The sheet closes
     the way its own X closes it, and the line under the panel says so. */
  const advance = React.useCallback(() => {
    setEnded(true);
    if (!focus) return;
    if (location.key === 'default') navigate({ search: '?overview' }, { replace: true });
    else navigate(-1);
  }, [focus, location.key, navigate]);

  return (
    <div className="musie-session" onClickCapture={onClickCapture}>
      <Status ended={ended} fullscreen={fullscreen} />
      <WizardPanel
        headingLevel={1}
        headlineStep="heading-sm"
        headlineHidden
        headline={EXERCISE.name}
        stepper={(
          <InteractiveWizard
            label={t('session.wizardLabel')}
            steps={STEPS.map((step) => ({
              id: step,
              label: t(stepMessageKey(step)),
              icon: STEP_ICON[step],
            }))}
            current="listen"
            completed={[...DONE]}
            skipped={[...SKIPPED]}
          />
        )}
        actions={null}
      >
        <SessionListen
          exercise={EXERCISE}
          digital
          audio={AUDIO}
          sessionId={SESSION_ID}
          card={CARD}
          listened={listened}
          onListened={() => setListened(true)}
          onAdvance={advance}
          back={null}
          question={question}
          lengthSeconds={LENGTH_SECONDS}
        />
      </WizardPanel>
    </div>
  );
}

/* THE ADDRESS SAYS WHICH VIEW from the first frame — written here, before the
   router reads the location. The step writes `?overview` itself only on a
   path ending in /listen, and this page's path is the experiment's folder.
   Replace, so Back still leaves the page. A link straight to `?focus` is left
   alone and opens the sheet — without fullscreen, because nobody tapped. */
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('focus') && !params.has('overview')) {
    const search = window.location.search === '' ? '?overview' : `${window.location.search}&overview`;
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`);
  }
}

/* NO `basename`, because the one route matches every path: with one, the
   router dropped the folder's trailing slash on the first navigation
   (`/experiments/vollbild?focus`). Without, the step's own `navigate({ search })`
   keeps the path exactly as Cloudflare served it. */
const router = createBrowserRouter([{ path: '*', element: <ListenPage /> }]);

export function App() {
  return (
    <LocaleContext.Provider value={LOCALE}>
      <MusyLocaleProvider locale="de">
        <MusyTooltipProvider>
          <div className="musie-app">
            <main id="main" className="musie-main" data-wide="1">
              <RouterProvider router={router} />
            </main>
          </div>
        </MusyTooltipProvider>
      </MusyLocaleProvider>
    </LocaleContext.Provider>
  );
}
