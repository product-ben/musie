/**
 * The panel: switches, sliders and the ten figures, read live by the answer.
 * Plain inputs — the design system has no checkbox or slider, and this page
 * lives a few weeks (CLAUDE.md rule 10). Colours and type are its tokens.
 */
import * as React from 'react';
import type { InstrumentId } from '../../../src/instruments/types';
import { INSTRUMENT_NAMES } from './instruments';
import type { AnswerEntry } from './run';
import { resetRun, runState, subscribeRun } from './run';
import {
  DEFAULTS, FIGURE_TEXT, ORNAMENTS, RANGES, SHAPES, setSettings, settings, subscribe,
} from './settings';
import type { BoolKey, FigureId, NumberKey } from './settings';

export function useSettings() {
  return React.useSyncExternalStore(subscribe, settings);
}
function useRun() {
  return React.useSyncExternalStore(subscribeRun, runState);
}

const de = (v: number, digits = 1) => v.toFixed(digits).replace('.', ',');
const seconds = (ms: number) => `${de(ms / 1000)} s`;
const percent = (v: number) => `${Math.round(v * 100)} %`;

function Toggle({ id, label, hint, children }: { id: BoolKey; label: string; hint: string; children?: React.ReactNode }) {
  const s = useSettings();
  const on = s[id];
  return (
    <div className="duett-opt" data-on={on ? 'true' : undefined}>
      <label className="duett-opt__row">
        <span className="duett-opt__text">
          <span className="duett-opt__label">{label}</span>
          <span className="duett-opt__hint">{hint}</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          className="duett-switch"
          checked={on}
          onChange={(e) => setSettings((cur) => ({ ...cur, [id]: e.target.checked }))}
        />
      </label>
      {on && children ? <div className="duett-opt__more">{children}</div> : null}
    </div>
  );
}

function Slider({ id, label, format }: { id: NumberKey; label: string; format: (v: number) => string }) {
  const s = useSettings();
  const [min, max, step] = RANGES[id];
  return (
    <label className="duett-slider">
      <span className="duett-slider__head">
        <span>{label}</span>
        <output className="duett-slider__value">{format(s[id])}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={s[id]}
        onChange={(e) => setSettings((cur) => ({ ...cur, [id]: Number(e.target.value) }))}
      />
    </label>
  );
}

function Figure({ id }: { id: FigureId }) {
  const s = useSettings();
  return (
    <label className="duett-figure">
      <input
        type="checkbox"
        checked={s.figures[id]}
        onChange={(e) => setSettings((cur) => ({ ...cur, figures: { ...cur.figures, [id]: e.target.checked } }))}
      />
      <span className="duett-opt__text">
        <span className="duett-opt__label">{FIGURE_TEXT[id].label}</span>
        <span className="duett-opt__hint">{FIGURE_TEXT[id].hint}</span>
      </span>
    </label>
  );
}

const ENDING: Record<AnswerEntry['ending'], string> = { closed: 'klang fertig', open: 'klang offen', neutral: '' };

function Entry({ e }: { e: AnswerEntry }) {
  const name = e.figure === 'heute' ? 'Wie heute' : FIGURE_TEXT[e.figure].label;
  const extra = e.ornaments.map((o) => FIGURE_TEXT[o].label);
  const from = e.fromRound !== undefined ? ` aus Runde ${e.fromRound}` : '';
  const why = [ENDING[e.ending], e.learn !== 1 ? `gelernt × ${de(e.learn, 2)}` : ''].filter(Boolean).join(', ');
  return (
    <li className="duett-log__item">
      <span className="duett-log__head">
        {e.round}. {[name + from, ...extra].join(' + ')}
      </span>
      <span className="duett-log__line">
        {e.notes} {e.notes === 1 ? 'Ton' : 'Töne'} (bis {e.cap}) auf deine {e.heard} · nach {seconds(e.waitMs)}
        {why ? ` · ${why}` : ''}
      </span>
      {e.turn ? (
        <span className="duett-log__line" data-collision={e.turn.collision ? 'true' : undefined}>
          {e.turn.collision
            ? `Du hast nach ${seconds(e.turn.afterMs)} weitergespielt: zu früh eingestiegen?`
            : e.turn.interrupted
              ? `Du hast Musie nach ${seconds(e.turn.afterMs)} unterbrochen`
              : `Du kamst ${seconds(e.turn.afterMs)} nach Musies Einsatz wieder`}
        </span>
      ) : null}
    </li>
  );
}

export function Panel() {
  const s = useSettings();
  const run = useRun();
  const [open, setOpen] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const anyShape = SHAPES.some((id) => s.figures[id]);
  const anyOrnament = ORNAMENTS.some((id) => s.figures[id]);

  function copyLink() {
    void navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <aside className="duett-panel" data-open={open ? 'true' : 'false'} aria-label="Einstellungen">
      <div className="duett-panel__bar">
        <div className="duett-panel__instruments" role="radiogroup" aria-label="Instrument">
          {(['harp', 'kalimba', 'marimba'] as InstrumentId[]).map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={s.instrument === id}
              className="duett-chip"
              onClick={() => setSettings((cur) => ({ ...cur, instrument: id }))}
            >
              {INSTRUMENT_NAMES[id]}
            </button>
          ))}
        </div>
        <button type="button" className="duett-panel__toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Zuklappen' : 'Einstellungen'}
        </button>
      </div>

      <div className="duett-panel__body">
        <section className="duett-section">
          <h2>Einsteigen</h2>
          <p className="duett-section__today">Heute frühestens nach 1,8 s, sonst nach 2,5 × deiner mittleren Pause.</p>
          <Toggle id="faster" label="Schneller einsteigen" hint="Niedrigere Untergrenze, weniger Geduld.">
            <Slider id="minMs" label="Frühestens nach" format={seconds} />
            <Slider id="patience" label="Geduld (100 % = heute)" format={percent} />
          </Toggle>
          <Toggle id="onLift" label="Sofort beim Loslassen" hint="Liegt ein Finger noch auf, antwortet Musie gleich beim Loslassen statt bis zu 0,4 s später." />
          <Toggle
            id="phraseEnd"
            label="Phrasenende hören"
            hint="Klingt es fertig (Grundton, leiser, gedehnt), wartet Musie gut halb so lange. Mitten im Lauf etwas länger."
          />
          <Toggle
            id="learn"
            label="Lernt mit"
            hint="Spielst du in Musies erster halben Sekunde weiter, wartet Musie danach länger, sonst jedes Mal etwas kürzer."
          >
            <p className="duett-readout">Gerade: Wartezeit × {de(run.learn, 2)}</p>
          </Toggle>
        </section>

        <section className="duett-section">
          <h2>Aufnehmen</h2>
          <Toggle id="keepRhythm" label="Rhythmus behalten" hint="Deine Abstände in deiner Reihenfolge. Heute kommen sie verschoben zurück." />
          <Toggle id="followTempo" label="Tempo folgen" hint="Auch sehr schnell und sehr langsam. Heute bleibt jeder Abstand zwischen 0,22 und 1,4 s." />
          <Toggle id="followDynamics" label="Lautstärke folgen" hint="Fängt so laut an, wie du aufgehört hast, und schwingt stärker." />
        </section>

        <section className="duett-section">
          <h2>Länger und spannender</h2>
          <p className="duett-section__today">Heute nie mehr Töne und nie länger als du, höchstens 8 Töne.</p>
          <Toggle id="longer" label="Darf länger spielen" hint="Mehr Töne und mehr Zeit als dein Spiel.">
            <Slider id="timesYours" label="Bis zu" format={(v) => `${de(v)} × deine Länge`} />
            <Slider id="maxNotes" label="Höchstens" format={(v) => `${v} Töne`} />
          </Toggle>
          <Toggle id="growing" label="Kommt in Fahrt" hint="Fängt mit halber Länge an und wächst mit jeder Antwort.">
            <Slider id="growRounds" label="Volle Länge nach" format={(v) => `${v} Antworten`} />
            <p className="duett-readout">Gerade: {run.round}. Antwort</p>
          </Toggle>
          <Toggle id="noTiny" label="Keine Mini-Antworten" hint="Auf längeres Spiel nie nur 2–3 Töne. Heute ist das jede dritte Antwort." />
          <Toggle id="wider" label="Größerer Tonraum" hint="Darf weiter aus deiner Lage heraus. Heute höchstens eine Stufe.">
            <Slider id="widerBy" label="Bis zu" format={(v) => `${v} ${v === 1 ? 'Stufe' : 'Stufen'}`} />
          </Toggle>
        </section>

        <section className="duett-section">
          <h2>Figuren</h2>
          <h3>Gestalten</h3>
          <p className="duett-section__today">Musie wählt pro Antwort eine der angehakten. Passt keine zu deinem Spiel, antwortet Musie wie heute.</p>
          {SHAPES.map((id) => <Figure key={id} id={id} />)}
          {anyShape ? <Slider id="figureShare" label="Figur statt heutiger Antwort" format={percent} /> : null}
          <h3>Verzierungen</h3>
          <p className="duett-section__today">Kommen obendrauf, auf jede Antwort.</p>
          {ORNAMENTS.map((id) => <Figure key={id} id={id} />)}
          {anyOrnament ? <Slider id="ornamentChance" label="Wie oft" format={percent} /> : null}
          {run.memory.length ? (
            <p className="duett-readout">Erinnerung kennt {run.memory.length} {run.memory.length === 1 ? 'Motiv' : 'Motive'}.</p>
          ) : null}
        </section>

        <section className="duett-section">
          <h2>Zuletzt</h2>
          {run.entries.length ? (
            <ol className="duett-log">
              {run.entries.map((e) => <Entry key={e.round} e={e} />)}
            </ol>
          ) : (
            <p className="duett-section__today">Noch keine Antwort.</p>
          )}
        </section>

        <div className="duett-panel__foot">
          <button type="button" className="duett-button" onClick={() => setSettings((cur) => ({ ...DEFAULTS, instrument: cur.instrument }))}>
            Alles wie heute
          </button>
          <button type="button" className="duett-button" onClick={resetRun}>
            Neu beginnen
          </button>
          <button type="button" className="duett-button" onClick={copyLink}>
            {copied ? 'Kopiert' : 'Link kopieren'}
          </button>
        </div>
      </div>
    </aside>
  );
}
