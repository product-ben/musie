/**
 * `/s/:code` — where a QR code on a printed card lands. E.0, and since
 * 2026-11-23 the start of a run (PRD „Übungskarten mit QR-Code").
 *
 * ── TWO KINDS OF CARD, AND BOTH START SOMETHING ───────────────────────────
 * An EXERCISE card (`EX-02`) starts its exercise. A DECK card (`MC-04`)
 * starts Freie Bahn with that card (D2): its picture stands in the intro, and
 * „Weiter" writes the card and skips the scan step, straight to the music.
 * Either way the run opens on its intro, where a card exercise asks „Was
 * brauchst du gerade?" (D5, D6).
 *
 * Until this day a deck card was written INTO the running session, a card
 * scanned with nothing running was held for later, and a cardless exercise
 * was told it had no use for one. All three went (D2, D3): the phone's camera
 * app always starts, and whatever is running is asked about.
 *
 * ── SOMETHING IS RUNNING: THE DIALOG, ALWAYS ──────────────────────────────
 * Even for the same exercise, and even while a card exercise waits on its scan
 * step (D3): a QR code is a deliberate request to start fresh. Primary starts
 * the new run and ends the old one as abandoned; secondary continues the old
 * one at its step. The X does what *continue* does (D15) — there is no screen
 * behind this route to go back to.
 *
 * ── HOW THE RUN BEGAN TRAVELS IN THE ADDRESS (V3) ─────────────────────────
 * `lib/startedVia.ts`: `?via=exercise-card`, or `?via=deck-card&card=MC-04`,
 * on the intro. The deck card is written only on „Weiter", once the goal is
 * final (D11), and the address is where it waits until then.
 *
 * ── SAME-ORIGIN, WHICH IS WHY NO DOMAIN IS NEEDED HERE ────────────────────
 * The route is relative and the decoder never compares a host
 * (lib/scanCode.ts), so a card printed for `musie.org` decodes on localhost,
 * on a preview, and on the real domain alike.
 *
 * ── SIGNED OUT ────────────────────────────────────────────────────────────
 * The sign-in gate renders above the router (main.tsx) and keeps the address,
 * so this route runs after signing in, with the code it was opened with (A11).
 */
import * as React from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { ContentBox, Button, Message } from '@musie/design-system';
import { SessionRunningLightbox } from '../components/SessionRunningLightbox';
import { useLocale, useT } from '../i18n/localeContext';
import { useAuth } from '../lib/authContext';
import { getCardByCode, getExercise, getExerciseByCode, getGoals } from '../lib/content';
import type { Exercise } from '../lib/content';
import { readCachedGoal } from '../lib/goals';
import { decodeLink } from '../lib/scanCode';
import type { ActiveSession } from '../lib/session';
import { startSession } from '../lib/startSession';
import { goalForPrintedStart, introPath } from '../lib/startedVia';
import type { StartedVia } from '../lib/startedVia';
import { useAsync } from '../lib/useAsync';
import type { Locale } from '../i18n';

/** The exercise a deck card starts (D2). */
const FREE_REIN = 'free-rein';

/** A run the link asks for, once it is known what it is. */
interface Request {
  exercise: Exercise;
  goalId: string | null;
  via: StartedVia;
  /** The deck card's code, for a deck card. */
  cardCode?: string;
}

/** What the link turned out to mean. */
type Landing =
  /** Not signed in yet — the gate is above this, so this is a frame or two. */
  | { kind: 'waiting' }
  /** Started: the intro is where the person goes. */
  | { kind: 'started'; path: string }
  /** Something is running: the dialog asks. */
  | { kind: 'running'; request: Request; session: ActiveSession | null; runningName: string | null }
  /** The link did not carry a code at all. */
  | { kind: 'malformed' }
  /** A well-formed code that names no card and no exercise. */
  | { kind: 'unknown'; code: string };

/**
 * ── ONE START PER ARRIVAL ─────────────────────────────────────────────────
 * Starting a session is not idempotent, and `useAsync` runs its effect twice
 * under StrictMode in development: the second call would find the first one's
 * session running and open the dialog over the run that was just started.
 * So the resolution is held per arrival — the router's `location.key`, which
 * is new for every navigation and the same for both effect runs.
 */
const arrivals = new Map<string, Promise<Landing>>();

async function resolve(
  scanned: string,
  userId: string,
  locale: Locale,
): Promise<Landing> {
  const decoded = decodeLink(scanned);
  if (decoded === null) return { kind: 'malformed' };

  /* The exercise this code starts, and — for a deck card — the card. Checked
     BEFORE anything is started, so a mistyped or foreign code writes
     nothing. */
  let exercise: Exercise | null;
  let via: StartedVia;
  let cardCode: string | undefined;
  if (decoded.kind === 'card') {
    const card = await getCardByCode(decoded.code, locale);
    if (card === null) return { kind: 'unknown', code: decoded.code };
    exercise = await getExercise(FREE_REIN, locale);
    via = 'deck-card';
    cardCode = card.code;
  } else {
    exercise = await getExerciseByCode(decoded.code, locale);
    via = 'exercise-card';
  }
  if (exercise === null) return { kind: 'unknown', code: decoded.code };

  /* D10 and D12: the goal last chosen in the library if this exercise serves
     it, else its first goal in the sheet's order. The intro may change it. */
  const goals = await getGoals(locale);
  const goalId = goalForPrintedStart(exercise, goals, readCachedGoal(goals));

  const request: Request = { exercise, goalId, via, cardCode };
  const result = await startSession({ userId, exercise, goalId, replacing: null, via });
  if (result.kind === 'started') {
    return { kind: 'started', path: introPath(result.session.id, via, cardCode) };
  }

  const runningName = result.session === null
    ? null
    : (await getExercise(result.session.exerciseId, locale))?.name ?? null;
  return { kind: 'running', request, session: result.session, runningName };
}

export function ScanLink() {
  const t = useT();
  const { locale } = useLocale();
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { userId } = useAuth();

  const scanned = params.code ?? '';
  const arrival = `${location.key}:${userId ?? '-'}:${scanned}:${locale}`;

  const { data, loading, error } = useAsync<Landing>(() => {
    if (userId === null) return Promise.resolve({ kind: 'waiting' });
    let pending = arrivals.get(arrival);
    if (pending === undefined) {
      pending = resolve(scanned, userId, locale);
      arrivals.set(arrival, pending);
    }
    return pending;
  }, `scan:${arrival}`);

  const [replacing, setReplacing] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  if (loading || data?.kind === 'waiting') return <p className="musie-note">{t('scan.working')}</p>;

  if (error !== null || data === null || failed) {
    return (
      <Message
        variant="error"
        live="assertive"
        headingLevel={1}
        headline={t('content.error')}
        text={t('content.errorDetail')}
      />
    );
  }

  /* THE HAPPY PATH RENDERS NOTHING. `replace`, so Back from the intro does not
     land on a resolver that would start another run. */
  if (data.kind === 'started') return <Navigate to={data.path} replace />;

  if (data.kind === 'running') {
    const { request, session } = data;
    const leave = () => navigate(
      session === null ? '/exercises' : `/session/${encodeURIComponent(session.id)}/${session.step}`,
      { replace: true },
    );
    return (
      <SessionRunningLightbox
        name={request.exercise.name}
        runningName={data.runningName}
        session={session}
        starting={replacing}
        onEndAndStart={() => {
          if (userId === null || replacing) return;
          setReplacing(true);
          void startSession({
            userId, exercise: request.exercise, goalId: request.goalId, replacing: session, via: request.via,
          }).then((result) => {
            if (result.kind === 'started') {
              navigate(introPath(result.session.id, request.via, request.cardCode), { replace: true });
              return;
            }
            /* Refused again: something else started a run in between. The
               honest answer is the generic failure, not a loop of dialogs. */
            setFailed(true);
          }, (thrown: unknown) => {
            console.error('[musie] could not start the scanned exercise:', thrown);
            setFailed(true);
          }).finally(() => setReplacing(false));
        }}
        /* D15: no screen behind this route, so closing is continuing. */
        onClose={leave}
      />
    );
  }

  /* The two that end at the library. Both are a mistake, so they differ in
     what they SAY and not in where they go. */
  const [headline, text] =
    data.kind === 'malformed'
      ? [t('scan.malformed.title'), t('scan.malformed.text')]
      : [t('scan.unknown.title'), t('scan.unknown.text', { code: data.code })];

  return (
    <ContentBox headingLevel={1} headline={headline} text={text} outline="dashed">
      <Button variant="secondary" render={<Link to="/exercises" />}>
        {t('scan.chooseExercise')}
      </Button>
    </ContentBox>
  );
}
