/**
 * Experiment „Duett 01“ (Ben, 2026-11-20): the app's three instruments, the
 * app's own stage, and a panel beside it that switches how Musie answers —
 * while playing. The question: which combination makes Musie take up the
 * playing better, come in sooner, and play more exciting, longer answers?
 *
 * The stage is `InstrumentStage` from the app, unchanged; only the answer is
 * the experiment's (shims/instruments__engine__answer.ts). No timer that
 * matters (an hour), no demo note, no motion sensor — none of them is the
 * question.
 */
import * as React from 'react';
import { InstrumentStage } from '../../../src/components/InstrumentStage';
import { unlockNow } from '../../../src/instruments/engine/audio';
import { DEFINITIONS, INSTRUMENT_NAMES } from './instruments';
import { Panel, useSettings } from './Panel';
import { startTracking } from './track';

const PLAY_SECONDS = 3600;
const noop = () => {};

export function App() {
  const s = useSettings();
  const [started, setStarted] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const definition = DEFINITIONS[s.instrument];

  function start(record: boolean) {
    unlockNow(); // inside the click: iOS only unlocks audio in a gesture
    if (record) startTracking();
    setStarted(true);
  }

  return (
    <div className="duett">
      <main className="duett__stage" aria-label={INSTRUMENT_NAMES[s.instrument]}>
        {started ? (
          <InstrumentStage
            key={s.instrument}
            definition={definition}
            durationSeconds={PLAY_SECONDS}
            mode="with_musie"
            vibration
            motion={false}
            onClock={noop}
            onSession={noop}
            onDemo={noop}
            onPlayed={noop}
            onError={(error) => {
              console.error('[duett] instrument:', error);
              setFailed(true);
            }}
            label={`${INSTRUMENT_NAMES[s.instrument]}: mit Finger, Maus oder Tastatur spielen`}
          />
        ) : (
          <div className="duett__start">
            <div className="duett__card">
              <h1 className="duett__title">Duett mit Musie · Experiment</h1>
              <p>
                Spiel etwas und mach eine Pause, dann antwortet Musie. Wie Musie antwortet, stellst du im Panel ein,
                auch während du spielst. Alles aus heißt: so wie heute in der App.
              </p>
              <p className="duett__small">
                Damit wir sehen, welche Einstellungen gut klingen, zeichnet PostHog auf, wie das Duett läuft: deine
                Einstellungen, Musies Antworten, wann du wieder spielst, und eine Aufnahme des Bildschirms. Kein Ton,
                keine Namen.
              </p>
              <div className="duett__actions">
                <button type="button" className="duett-button duett-button--primary" onClick={() => start(true)}>
                  Einverstanden, los
                </button>
                <button type="button" className="duett-button" onClick={() => start(false)}>
                  Ohne Aufzeichnung spielen
                </button>
              </div>
            </div>
          </div>
        )}
        {failed && <p className="duett__error" role="alert">Die Töne konnten nicht geladen werden. Lade die Seite neu.</p>}
      </main>
      <Panel />
    </div>
  );
}
