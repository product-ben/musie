/**
 * The experiment's own state: who is taking part, and the copy in the active
 * language. Participant = `{ id, name }` in localStorage, so a second link on
 * the same device pre-fills the name and reuses the id.
 */
import * as React from 'react';
import { useLocale } from '../../../src/i18n/localeContext';
import { COPY, type Copy, type ExperimentExercise } from './config';
import { RUN } from './run';

export interface Participant {
  id: string;
  name: string;
}

const PARTICIPANT_KEY = 'reflexion-01.participant';

export function readStoredParticipant(): Participant | null {
  try {
    const raw = localStorage.getItem(PARTICIPANT_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Partial<Participant>;
    if (typeof parsed.id === 'string' && typeof parsed.name === 'string') {
      return { id: parsed.id, name: parsed.name };
    }
  } catch {
    /* private mode or a broken value: treat as a new participant */
  }
  return null;
}

export function storeParticipant(participant: Participant): void {
  try {
    localStorage.setItem(PARTICIPANT_KEY, JSON.stringify(participant));
  } catch {
    /* the run still works; the next link just asks again */
  }
}

export interface ExperimentState {
  exercise: ExperimentExercise;
  /** null until the name modal is submitted — on EVERY page load. */
  participant: Participant | null;
  /** Called by the name modal. Stores it and starts the run. */
  start: (participant: Participant) => void;
}

export const ExperimentContext = React.createContext<ExperimentState | null>(null);

export function useExperiment(): ExperimentState {
  const value = React.useContext(ExperimentContext);
  if (value === null) throw new Error('useExperiment outside <ExperimentProvider>');
  return value;
}

export function ExperimentProvider({
  exercise,
  onStart,
  children,
}: {
  exercise: ExperimentExercise;
  onStart?: (participant: Participant, returning: boolean) => void;
  children: React.ReactNode;
}) {
  const [participant, setParticipant] = React.useState<Participant | null>(null);
  const start = React.useCallback(
    (next: Participant) => {
      const returning = readStoredParticipant()?.id === next.id;
      storeParticipant(next);
      setParticipant(next);
      onStart?.(next, returning);
    },
    [onStart],
  );
  const value = React.useMemo(() => ({ exercise, participant, start }), [exercise, participant, start]);
  return <ExperimentContext.Provider value={value}>{children}</ExperimentContext.Provider>;
}

/** The experiment's own strings in the active language. */
export function useCopy(): Copy {
  const { locale } = useLocale();
  return COPY[locale];
}

export { RUN };
