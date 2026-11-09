/**
 * What Einsteigen adds for an instruments exercise — 2026-11-09.
 *
 * Under the exercise's own intro copy („Bevor es losgeht“: the volume, a
 * quiet three minutes), THE SETTINGS, made here and nowhere else — Ben,
 * 2026-11-09: the focus sheet has none, and the play step only says how to
 * play. In this order:
 *
 *   1. HOW TO PLAY: Duett mit Musie (the default) or Alleine, each explained
 *      under the control while it is chosen.
 *   2. FEELING THE INSTRUMENT, touch screens only, and only where the device
 *      can vibrate: the vibration switch, on by default.
 *   3. THE MOTION SENSOR, touch screens only, for the instruments that use it
 *      (the kalimba's swing, the marimba's strength) and where the device has
 *      one: a switch, OFF the first time and remembered once on. Switching it
 *      on is what asks the system — inside the press, as iOS requires — and a
 *      refusal turns it off again with the way to change that. The harp has
 *      no `motionMd` and this part is absent.
 *
 * No volume check and no browser hint: a browser cannot read the system
 * volume, and Ben took the browser recommendation out.
 *
 * Presentational: the settings and the permission come in as props;
 * `Session.tsx` holds them, `engine/motion.ts` owns the sensor.
 */
import { User, Users } from 'lucide-react';
import { SegmentedControl, Switch } from '@musie/design-system';
import { Markdown } from './Markdown';
import { useT } from '../i18n/localeContext';
import type { ExerciseInstrument, PlayMode } from '../lib/content';

/** Where the motion permission stands. Safari has no query for it; see motion.ts. */
export type MotionPermission = 'prompt' | 'asking' | 'granted' | 'denied' | 'unavailable';

export interface InstrumentIntroProps {
  instrument: ExerciseInstrument;
  mode: PlayMode;
  onModeChange: (mode: PlayMode) => void;
  vibration: boolean;
  onVibrationChange: (on: boolean) => void;
  /** The vibration switch is offered: a touch screen that can vibrate. */
  canVibrate: boolean;
  /** Undefined where the instrument uses no sensor (the harp) or on a mouse-and-keyboard device. */
  motion?: MotionPermission;
  /** The person's motion switch. */
  motionWanted: boolean;
  /** Must run inside the press: switching on is what asks, and iOS only asks from a gesture. */
  onMotionWantedChange: (on: boolean) => void;
}

export function InstrumentIntro({
  instrument, mode, onModeChange, vibration, onVibrationChange, canVibrate,
  motion, motionWanted, onMotionWantedChange,
}: InstrumentIntroProps) {
  const t = useT();
  const offersMotion = instrument.motionMd !== null && instrument.motionLabel !== null
    && motion !== undefined && motion !== 'unavailable';

  return (
    <div className="musie-intro__instrument">
      <SegmentedControl
        name="play-mode"
        legend={t('session.intro.mode.legend')}
        value={mode}
        onValueChange={(next) => { if (next === 'solo' || next === 'with_musie') onModeChange(next); }}
        options={[
          { value: 'with_musie', label: instrument.modeMusieLabel, glyph: Users, description: instrument.modeMusieMd },
          { value: 'solo', label: instrument.modeSoloLabel, glyph: User, description: instrument.modeSoloMd },
        ]}
      />

      {canVibrate && (
        <div className="musie-intro__setting">
          {/* The subheading and its sentence typeset as the step's own copy
              is, so the three settings read as one list. */}
          <div className="musie-md">
            <h3>{t('session.intro.vibration.title')}</h3>
            <p>{t('session.intro.vibration.body')}</p>
          </div>
          <Switch
            label={t('session.intro.vibration.label')}
            checked={vibration}
            onCheckedChange={(next) => onVibrationChange(next)}
          />
        </div>
      )}

      {offersMotion && (
        <div className="musie-intro__setting">
          <Markdown md={instrument.motionMd ?? ''} />
          <Switch
            label={instrument.motionLabel ?? ''}
            checked={motionWanted && motion !== 'denied'}
            disabled={motion === 'asking'}
            onCheckedChange={(next) => onMotionWantedChange(next)}
          />
          {/* A refusal, said in words and politely, so a screen reader hears
              the answer to the system prompt it just dismissed. */}
          <p className="musie-intro__note" role="status" aria-live="polite">
            {motion === 'denied' && t('session.intro.motion.denied')}
          </p>
        </div>
      )}
    </div>
  );
}
