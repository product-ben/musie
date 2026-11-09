/**
 * What Einsteigen adds for an instruments exercise — 2026-11-09.
 *
 * Under the exercise's own intro copy (a quiet place), three things the brief
 * asks for, in this order:
 *
 *   1. VOLUME, ALWAYS. A slightly quieter phone sounds better. There is no
 *      volume check behind it and there cannot be one: a browser cannot read
 *      the system volume.
 *   2. THE BROWSER where the exercise works best, and — only where the phone
 *      would otherwise stay silent — the ring/silent switch. All three
 *      instruments set `navigator.audioSession.type = 'playback'`, which plays
 *      through the switch on iOS 17+; `navigator.standalone` exists only in
 *      iOS Safari, so "iOS without audioSession" is detected by feature, not
 *      by user agent (PRD, Browser-Empfehlung).
 *   3. THE MOTION SENSOR, for the instruments that use it (marimba: how hard
 *      a bar was struck; kalimba: the swing). Ben, 2026-11-09: the system
 *      prompt is triggered HERE, from a button, after the copy says what it is
 *      for — and its state is shown. The harp has no `motionMd` and this part
 *      is absent.
 *
 * Presentational: the permission's state and the request come in as props;
 * `engine/motion.ts` owns them, `Session.tsx` wires the two.
 */
import { CtaButton } from '@musie/design-system';
import { Markdown } from './Markdown';
import { useT } from '../i18n/localeContext';
import type { ExerciseInstrument } from '../lib/content';

/** Where the motion permission stands. Safari has no query for it; see motion.ts. */
export type MotionPermission = 'prompt' | 'asking' | 'granted' | 'denied' | 'unavailable';

export interface InstrumentIntroProps {
  instrument: ExerciseInstrument;
  /** Undefined where the instrument uses no sensor (the harp). */
  motion?: MotionPermission;
  /** Must run inside the click: iOS only asks from a user gesture. */
  onRequestMotion?: () => void;
}

/** iOS Safari without the API that plays through the silent switch. */
function silentSwitchMayMute(): boolean {
  if (typeof navigator === 'undefined') return false;
  return 'standalone' in navigator && !('audioSession' in navigator);
}

export function InstrumentIntro({ instrument, motion, onRequestMotion }: InstrumentIntroProps) {
  const t = useT();
  const asksMotion = instrument.motionMd !== null && motion !== undefined;

  return (
    <div className="musie-intro__instrument">
      <Markdown md={instrument.volumeMd} />
      <Markdown md={instrument.browserMd} />
      {silentSwitchMayMute() && (
        <p className="musie-intro__note">{t('session.play.silentSwitch')}</p>
      )}

      {asksMotion && (
        <div className="musie-intro__motion">
          <Markdown md={instrument.motionMd ?? ''} />
          {(motion === 'prompt' || motion === 'asking') && (
            <CtaButton
              variant="secondary"
              loading={motion === 'asking'}
              loadingLabel={t('content.loading')}
              onClick={() => onRequestMotion?.()}
            >
              {t('session.play.motion.allow')}
            </CtaButton>
          )}
          {/* The state, said in words and polite, so a screen reader hears the
              answer to the system prompt it just dismissed. */}
          <p className="musie-intro__note" role="status" aria-live="polite">
            {motion === 'granted' && t('session.play.motion.granted')}
            {motion === 'denied' && t('session.play.motion.denied')}
            {motion === 'unavailable' && t('session.play.motion.unavailable')}
          </p>
        </div>
      )}
    </div>
  );
}
