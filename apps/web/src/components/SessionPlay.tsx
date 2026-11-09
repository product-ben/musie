/**
 * Musizieren — the instruments' own step (2026-11-09).
 *
 * TWO VIEWS OF ONE STEP, like Hören: the step itself, and the focus sheet the
 * primary button opens (`?focus` on the address, so the browser's Back closes
 * it and a reload keeps it — `SessionListen`'s argument, reused).
 *
 *   THE STEP   the exercise's headline and the two settings. Its buttons —
 *              Back, the one that opens the instrument („Zur Harfe“,
 *              `exercise_i18n.play_cta`) and, once the timer is paused or
 *              done, *Weiter zum Reflektieren* — are the wizard's action row,
 *              built in `Session.tsx` like every other step's.
 *   THE SHEET  head: the headline, the 1:30 timer and one polite status line;
 *              middle: the instrument; foot: the settings icon, which opens the
 *              SAME settings in a „Dialogue (non modal)“, and *Weiter*.
 *
 * ── THE SETTINGS AND THE CLOCK ARE HELD ABOVE ─────────────────────────────
 * `Session.tsx` owns the mode, the vibration switch and the clock, and passes
 * them in: the step and the dialogue draw one state, and the action row needs
 * the clock to know whether *Weiter* is there yet. The session reads the mode
 * on every note, so „allein“ silences an answer that is playing.
 *
 * ── THE PRESS IS THE UNLOCK ───────────────────────────────────────────────
 * iOS only lets a page make sound from inside a gesture, so the primary
 * button unlocks audio in its own click (`lib/playSheet.ts`) before it opens the
 * sheet. The sheet then plays ONE demo note, shown on the instrument and said
 * to a screen reader; it starts no timer and no answer, and the person's first
 * touch cancels it (`engine/onboarding.ts`).
 */
import * as React from 'react';
import { Settings, User, Users } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import {
  Countdown, CtaButton, DialogueNonModal, IconButton, Message, SegmentedControl, Sheet, Switch,
} from '@musie/design-system';
import type { CountdownState } from '@musie/design-system';
import { InstrumentStage } from './InstrumentStage';
import { Markdown } from './Markdown';
import { useT } from '../i18n/localeContext';
import { useAsync } from '../lib/useAsync';
import { getInstrument } from '../lib/instruments';
import { headingOnly, parseMarkdown, plainText, withoutHeading } from '../lib/markdown';
import type { Exercise, ExerciseInstrument, PlayMode } from '../lib/content';
import { PLAY_FOCUS, withFocus } from '../lib/playSheet';
import { supportsVibration } from '../instruments/engine/haptics';
import { announcement, remainingSeconds, showContinue } from '../instruments/engine/clock';
import type { ClockState } from '../instruments/engine/clock';
import type { InstrumentSession } from '../instruments/engine/host';
import { isInstrumentId } from '../instruments/types';

const PHASE_TO_COUNTDOWN: Record<ClockState['phase'], CountdownState> = {
  unstarted: 'unstarted',
  running: 'running',
  paused: 'paused',
  expired: 'ended',
};

export interface SessionPlayProps {
  exercise: Exercise;
  instrument: ExerciseInstrument;
  mode: PlayMode;
  onModeChange: (mode: PlayMode) => void;
  vibration: boolean;
  onVibrationChange: (on: boolean) => void;
  clock: ClockState;
  onClock: (state: ClockState) => void;
  /** *Weiter zum Reflektieren*, from the sheet's foot — the same press as the row's. */
  onAdvance: () => void;
}

export function SessionPlay({
  exercise, instrument, mode, onModeChange, vibration, onVibrationChange, clock, onClock, onAdvance,
}: SessionPlayProps) {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const immersive = searchParams.has(PLAY_FOCUS);

  const loadDefinition = React.useCallback(() => getInstrument(instrument.id), [instrument.id]);
  const { data: definition, error: loadError } = useAsync(loadDefinition, `instrument:${instrument.id}`);

  const [session, setSession] = React.useState<InstrumentSession | null>(null);
  const [demoSaid, setDemoSaid] = React.useState(false);
  const [played, setPlayed] = React.useState(false);
  /* The marimba held upright lies turned a quarter turn (the stage says so
     once it has measured); first guess from the window, so the sheet does
     not open in the wrong layout for a frame. */
  const [turned, setTurned] = React.useState(
    () => typeof matchMedia === 'function' && matchMedia('(orientation: portrait)').matches,
  );
  const [stageError, setStageError] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const canVibrate = React.useMemo(() => supportsVibration(), []);

  /* The demo, once the sheet's session exists — and never again after the
     person has played. */
  React.useEffect(() => {
    if (session !== null && !played) session.startOnboarding();
  }, [session, played]);

  function close() {
    setSettingsOpen(false);
    if (location.key === 'default') {
      navigate({ search: withFocus(location.search, false) }, { replace: true });
      return;
    }
    navigate(-1);
  }

  /* ── THE SETTINGS, drawn twice from one state ────────────────────────── */
  const modeControl = (name: string) => (
    <SegmentedControl
      name={name}
      legend={t('session.play.mode.legend')}
      value={mode}
      onValueChange={(next) => { if (next === 'solo' || next === 'with_musie') onModeChange(next); }}
      options={[
        { value: 'solo', label: instrument.modeSoloLabel, glyph: User, description: instrument.modeSoloMd },
        { value: 'with_musie', label: instrument.modeMusieLabel, glyph: Users, description: instrument.modeMusieMd },
      ]}
    />
  );
  /* Only where the device can vibrate at all — `navigator.vibrate`, or the
     iPhone's switch haptics. Feature detection, never the user agent. */
  const vibrationControl = (size: 'md' | 'sm') => canVibrate && (
    <Switch
      size={size}
      label={t('session.play.vibration')}
      checked={vibration}
      onCheckedChange={(next) => onVibrationChange(next)}
    />
  );

  const said = announcement(clock);
  const marimba = instrument.id === 'marimba';
  /* The marimba keeps its own experiment's layout in landscape (Ben, after
     R0). Upright, its bars are turned and there is height to spare, so it
     takes the harp's layout like the other two. */
  const compact = marimba && !turned;
  /* THE SHEET'S HEADLINE IS A SENTENCE, as each experiment's <h1> was —
     heading and body in one line of heading type. The marimba's was its
     heading alone („Spiel, bis du ruhig bist.“); its body is the step's
     advice to lay the phone sideways. */
  const headline = React.useMemo(() => {
    const blocks = parseMarkdown(instrument.playMd);
    const head = plainText(headingOnly(blocks)).trim();
    const body = plainText(withoutHeading(blocks)).trim();
    const closed = /[.:!?…]$/.test(head) ? head : `${head}.`;
    return marimba || body === '' ? closed : `${closed} ${body}`;
  }, [instrument.playMd, marimba]);
  const headRef = React.useRef<HTMLDivElement>(null);
  const footRef = React.useRef<HTMLDivElement>(null);
  const canvasLabel = isInstrumentId(instrument.id) ? t(`session.play.canvas.${instrument.id}`) : exercise.name;

  return (
    <>
      <Markdown md={instrument.playMd} />

      <div className="musie-play__settings">
        {vibrationControl('md')}
        {modeControl('play-mode-step')}
      </div>

      {loadError !== null && (
        <Message variant="error" live="assertive" headline={t('session.play.loadError')} />
      )}

      {definition !== null && (
        <Sheet
          open={immersive}
          onOpenChange={(next) => { if (!next) close(); }}
          title={exercise.name}
          closeLabel={t('session.play.close')}
          /* The marimba keeps its experiment's layout (Ben, after R0): one line
             at the very top, the small clock in the foot row. */
          density={compact ? 'compact' : 'default'}
          actions={
            <DialogueNonModal
              open={settingsOpen}
              onOpenChange={setSettingsOpen}
              title={t('session.play.settings.title')}
              closeLabel={t('session.play.settings.close')}
              placement="top-end"
              trigger={<IconButton glyph={Settings} label={t('session.play.settings.open')} variant="secondary" />}
            >
              <div className="musie-play__dialogue">
                {modeControl('play-mode-sheet')}
                {vibrationControl('sm')}
              </div>
            </DialogueNonModal>
          }
          stage={immersive ? (
            <InstrumentStage
              definition={definition}
              durationSeconds={exercise.listenGateSeconds}
              mode={mode}
              vibration={vibration}
              clock={clock}
              onClock={onClock}
              onSession={setSession}
              onDemo={() => setDemoSaid(true)}
              onPlayed={() => setPlayed(true)}
              onTurn={setTurned}
              onError={(error) => { console.error('[musie] instrument:', error); setStageError(true); }}
              label={canvasLabel}
              insetTop={headRef}
              insetBottom={footRef}
            />
          ) : undefined}
          header={
            <div ref={headRef} className="musie-play__head" data-compact={compact ? 'true' : undefined}>
              <h2 className="musie-play__headline">{headline}</h2>
              {/* The demo, a load failure: polite, and in the marimba's one
                  line where its experiment kept its note. For the harp and the
                  kalimba it is said, not drawn — their experiments had no line
                  there, and a line appearing would move the instrument. */}
              <p
                className={compact ? 'musie-play__note' : 'musy-sr-only'}
                role="status"
                aria-live="polite"
              >
                {stageError ? t('session.play.loadError') : demoSaid && !played ? t('session.play.demo') : ''}
              </p>
            </div>
          }
          foot={
            <div ref={footRef} className="musie-play__foot" data-compact={compact ? 'true' : undefined}>
              <Countdown
                className="musie-play__clock"
                size={compact ? 'compact' : 'display'}
                remainingSeconds={remainingSeconds(clock, performance.now())}
                state={PHASE_TO_COUNTDOWN[clock.phase]}
                onToggle={() => session?.clock.dispatch({ type: 'TOGGLE', at: performance.now() })}
                caption={clock.phase === 'expired' ? t('session.play.timer.done') : t('session.play.timer.caption')}
                playLabel={t('session.play.timer.play')}
                resumeLabel={t('session.play.timer.resume')}
                pauseLabel={t('session.play.timer.pause')}
                restartLabel={t('session.play.timer.restart')}
                trackLabel={t('session.play.timer.name')}
                announcement={said === null ? '' : t(`session.play.timer.${said.key}`)}
              />
              {/* ALWAYS LAID OUT, shown only on pause or at 0:00 — the harp's
                  `data-waiting`: the clock must not move when it appears. */}
              <div className="musie-play__done" data-waiting={showContinue(clock) ? undefined : 'true'} inert={!showContinue(clock)}>
                <CtaButton onClick={onAdvance}>{t('session.play.continue')}</CtaButton>
              </div>
            </div>
          }
        />
      )}
    </>
  );
}
