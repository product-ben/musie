/**
 * The motion sensor's permission, for the intro step — 2026-11-09.
 *
 * Ben: the system prompt is asked on Einsteigen, the person is told what it is
 * for, and its state is shown. `engine/motion.ts` owns the sensor (one per
 * page, shared with the play step); this hook only mirrors its state into
 * React and adds `asking`, the moment between the press and Safari's answer.
 *
 * Listening while the intro is up is what lets Android (which never prompts)
 * report `granted` as soon as data arrives, so the screen says the truth there
 * too.
 */
import * as React from 'react';
import { motionSensor } from '../instruments/engine/motion';
import type { MotionPermission as SensorPermission } from '../instruments/engine/motion';
import type { MotionPermission } from '../components/InstrumentIntro';

export function useMotionPermission(active: boolean): {
  permission: MotionPermission | undefined;
  request: () => void;
} {
  const [permission, setPermission] = React.useState<SensorPermission | null>(null);
  const [asking, setAsking] = React.useState(false);

  React.useEffect(() => {
    if (!active) return undefined;
    const sensor = motionSensor();
    const release = sensor.listen();
    setPermission(sensor.permission());
    const unsubscribe = sensor.subscribe(setPermission);
    return () => {
      unsubscribe();
      release();
    };
  }, [active]);

  /* Must stay synchronous up to `ask()`: iOS only prompts from inside the
     click, and an `await` before it would leave the gesture. */
  const request = React.useCallback(() => {
    setAsking(true);
    void motionSensor().ask().then(setPermission).finally(() => setAsking(false));
  }, []);

  if (!active || permission === null) return { permission: undefined, request };
  return { permission: asking ? 'asking' : permission, request };
}
