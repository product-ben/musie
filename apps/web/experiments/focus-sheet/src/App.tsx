/**
 * The page: the listen step's overview inside the session's own panel, and —
 * since 2026-11-27 — the NEW listening view (`Hoeren.tsx`, Figma page 30)
 * opening in FULLSCREEN when the transport is pressed. The immersive Sheet is
 * gone from this experiment (Ben: „get rid of the immersive sheet again“).
 *
 * ── WHAT IS THE APP'S, AND WHAT IS THIS PAGE'S ────────────────────────────
 * `SessionListen` is the real step and still draws the overview. Its own
 * press is never reached: a capturing click handler on the wrapper takes the
 * tap on the stage's transport FIRST, stops it there, and inside that same
 * tap asks for fullscreen, starts this page's own player (iOS grants playback
 * to the gesture) and pushes `?hoeren`. So the step never navigates to
 * `?focus`, and its Sheet never opens.
 *
 * OUT WITH THE VIEW. Its X, Escape and the browser's Back all take `?hoeren`
 * off the address; the falling edge pauses and leaves fullscreen. Leaving
 * fullscreen alone (Android's first Back) does not close the view.
 *
 * THE GATE. The view counts the minimum on its own player; reaching it sets
 * the step's `listened`, so the overview's „Beginne zu reflektieren“ opens.
 *
 * A browser router, not a memory router as in Reflexion: the browser's own
 * Back is one of the ways out, and that is part of what is being tried.
 */
import * as React from 'react';
import { createPortal } from 'react-dom';
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
import { AUDIO, AUDIO_SRC, CARD, EXERCISE, LENGTH_SECONDS, SESSION_ID } from './fixture';
import {
  enterFullscreen, exitFullscreen, fullscreenAvailable, isFullscreen, isStandalone, onFullscreenChange,
} from './fullscreen';
import { Hoeren } from './Hoeren';
import { usePlayer } from './player';
import { SESSION_EFFECT, effectUrl } from './effect';

/** The view's token in the address — not `?focus`, which would open the step's own Sheet. */
const HOEREN = 'hoeren';

/** The minimum: the chosen length, capped by the piece (as `SessionListen` does). */
const GATE_SECONDS = Math.min(LENGTH_SECONDS, AUDIO.durationSeconds);

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
    text = 'Dieser Browser kann Vollbild. Der Play-Knopf öffnet die Karte ohne Adress- und Tab-Leiste.';
  } else {
    text = 'Dieser Browser kann kein Vollbild für Webseiten – Safari auf dem iPhone kann das nur für Videos. '
      + 'Die Karte öffnet deshalb mit den Leisten des Browsers.';
  }
  /* Which of the four this tab drew — so a tester knows what they are trying. */
  text += ` Effekt in diesem Tab: ${SESSION_EFFECT.name}.`;
  return <p className="musie-focus-sheet-status" role="status">{text}</p>;
}

function ListenPage() {
  const t = useT();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const open = searchParams.has(HOEREN);
  const [listened, setListened] = React.useState(false);
  const [ended, setEnded] = React.useState(false);
  const question = useFixtureQuestion();
  const fullscreen = useFullscreenNow();
  const player = usePlayer(AUDIO_SRC);

  /* The gate, on this page's own clock. Latched upward, like the step's. */
  React.useEffect(() => {
    if (!listened && player.position >= GATE_SECONDS) setListened(true);
  }, [listened, player.position]);

  /* OUT WITH THE VIEW — on the falling edge only, so a page loaded straight
     on `?overview` does not ask to leave a fullscreen it never entered. */
  const { pause } = player;
  const wasOpen = React.useRef(open);
  React.useEffect(() => {
    if (wasOpen.current && !open) {
      pause();
      exitFullscreen();
    }
    wasOpen.current = open;
  }, [open, pause]);

  /* IN WITH THE PRESS. Capture phase, so this runs before the transport's own
     onClick — and it STOPS the tap there, so the step never opens its Sheet.
     All three requests happen synchronously inside the tap, which is what the
     browser checks for fullscreen and iOS checks for playback. */
  function onClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (open) return;
    if (!(event.target instanceof Element)) return;
    if (event.target.closest(TRANSPORT) === null) return;
    event.stopPropagation();
    event.preventDefault();
    enterFullscreen();
    player.play();
    navigate({ search: `?${HOEREN}` });
  }

  /* The X and Escape: back, so the browser's history stays one entry deep. */
  const close = React.useCallback(() => {
    if (location.key === 'default') navigate({ search: '?overview' }, { replace: true });
    else navigate(-1);
  }, [location.key, navigate]);

  /* „Beginne zu reflektieren“ on the overview: there is no reflect step here. */
  const advance = React.useCallback(() => setEnded(true), []);

  return (
    <div className="musie-session" onClickCapture={onClickCapture}>
      {open && createPortal(
        <Hoeren
          imageSrc={CARD.imageUrl ?? ''}
          imageAlt={CARD.imageAlt ?? ''}
          effectSrc={CARD.imageUrl === null ? null : effectUrl(SESSION_EFFECT, CARD.imageUrl)}
          effectName={SESSION_EFFECT.name}
          effectSettleMs={SESSION_EFFECT.settleMs}
          instruction={question.text?.listen ?? EXERCISE.name}
          progress={player.position / GATE_SECONDS}
          player={player}
          onClose={close}
        />,
        document.body,
      )}
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
   Replace, so Back still leaves the page. A link straight to `?hoeren` is left
   alone and opens the view — without fullscreen or sound, because nobody
   tapped; its own play button starts the piece. */
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  if (!params.has(HOEREN) && !params.has('focus') && !params.has('overview')) {
    const search = window.location.search === '' ? '?overview' : `${window.location.search}&overview`;
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`);
  }
}

/* NO `basename`, because the one route matches every path: with one, the
   router dropped the folder's trailing slash on the first navigation
   (`/experiments/focus-sheet/261127-1218?focus`). Without, the step's own `navigate({ search })`
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
