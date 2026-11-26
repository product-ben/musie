/**
 * The panel: switches, sliders, the ten figures and the chords, read live by
 * the answer. Plain inputs — the design system has no checkbox or slider, and
 * this page lives a few weeks (CLAUDE.md rule 10). Colours and type are its tokens.
 */
import * as React from 'react';
import type { InstrumentId } from '../../../src/instruments/types';
import { INSTRUMENT_NAMES } from './instruments';
import type { AnswerEntry } from './run';
import { resetRun, runState, subscribeRun } from './run';
import {
  CHORD_KIND_TEXT, CHORD_KINDS, CHORD_MOMENT_TEXT, CHORD_MOMENTS, DEFAULTS, FIGURE_TEXT, ORNAMENTS, RANGES, SHAPES,
  setSettings, settings, subscribe,
} from './settings';
import type { BoolKey, ChordKind, ChordMoment, FigureId, NumberKey } from './settings';

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

function Check({ checked, onChange, text }: { checked: boolean; onChange: (on: boolean) => void; text: { label: string; hint: string } }) {
  return (
    <label className="duett-figure">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="duett-opt__text">
        <span className="duett-opt__label">{text.label}</span>
        <span className="duett-opt__hint">{text.hint}</span>
      </span>
    </label>
  );
}

function Figure({ id }: { id: FigureId }) {
  const s = useSettings();
  return (
    <Check
      checked={s.figures[id]}
      onChange={(on) => setSettings((cur) => ({ ...cur, figures: { ...cur.figures, [id]: on } }))}
      text={FIGURE_TEXT[id]}
    />
  );
}

function Moment({ id }: { id: ChordMoment }) {
  const s = useSettings();
  return (
    <Check
      checked={s.chordWhen[id]}
      onChange={(on) => setSettings((cur) => ({ ...cur, chordWhen: { ...cur.chordWhen, [id]: on } }))}
      text={CHORD_MOMENT_TEXT[id]}
    />
  );
}

function Kind({ id }: { id: ChordKind }) {
  const s = useSettings();
  return (
    <Check
      checked={s.chordKinds[id]}
      onChange={(on) => setSettings((cur) => ({ ...cur, chordKinds: { ...cur.chordKinds, [id]: on } }))}
      text={CHORD_KIND_TEXT[id]}
    />
  );
}

/** „Dreiklang × 2, Quinte“ */
function chordList(kinds: readonly ChordKind[]): string {
  const counts = new Map<ChordKind, number>();
  kinds.forEach((k) => counts.set(k, (counts.get(k) ?? 0) + 1));
  return [...counts].map(([k, c]) => (c > 1 ? `${CHORD_KIND_TEXT[k].label} × ${c}` : CHORD_KIND_TEXT[k].label)).join(', ');
}

const ENDING: Record<AnswerEntry['ending'], string> = { closed: 'klang fertig', open: 'klang offen', neutral: '' };

function Entry({ e }: { e: AnswerEntry }) {
  const name = e.figure === 'heute' ? 'Wie heute' : e.figure === 'akkord' ? 'Ein Akkord' : FIGURE_TEXT[e.figure].label;
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
      {e.chords.length || e.under ? (
        <span className="duett-log__line">
          {[
            e.under ? `Unter deinem ersten Ton: ${CHORD_KIND_TEXT[e.under].label}` : '',
            e.chords.length ? `Akkorde: ${chordList(e.chords)}` : '',
          ].filter(Boolean).join(' · ')}
        </span>
      ) : null}
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
  const anyMoment = CHORD_MOMENTS.some((id) => s.chordWhen[id]);
  const anyKind = CHORD_KINDS.some((id) => s.chordKinds[id]);

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
          <h2>Akkorde</h2>
          <p className="duett-section__today">Heute spielt Musie immer nur einen Ton auf einmal.</p>
          <h3>Wann</h3>
          {CHORD_MOMENTS.map((id) => <Moment key={id} id={id} />)}
          <h3>Welche</h3>
          <p className="duett-section__today">
            Musie wählt pro Akkord einen der angehakten. Alle sind aus den Tönen des Instruments gebaut, der Melodieton bleibt meist oben.
          </p>
          {CHORD_KINDS.map((id) => <Kind key={id} id={id} />)}
          {anyMoment !== anyKind ? (
            <p className="duett-readout" role="status">
              {anyMoment ? 'Kreuze noch an, welche Akkorde.' : 'Kreuze noch an, wann ein Akkord kommt.'}
            </p>
          ) : null}
          {anyMoment && anyKind ? (
            <>
              <Slider id="chordChance" label="Wie oft, wo einer passt" format={percent} />
              <Slider id="chordSpread" label="Gebrochen" format={(v) => (v === 0 ? 'alle Töne zugleich' : `${v} ms von Ton zu Ton`)} />
              <Slider id="chordVolume" label="Lautstärke der Akkordtöne" format={(v) => `${percent(v)} des Melodietons`} />
            </>
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
