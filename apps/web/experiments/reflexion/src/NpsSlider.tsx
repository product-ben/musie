/**
 * An NPS question: 0–10 on a slider that snaps to its eleven steps, each step
 * labelled with its number, the two ends named underneath. Ben, 2026-11-18:
 * „eine NPS Skala (mit einem stepper slider, bei dem die einzelnen steps
 * beschriftet sind)“.
 *
 * ── THE EXPERIMENT'S OWN, NOT THE SYSTEM'S ────────────────────────────────
 * The design system has no slider. `FeelingsScale` is the nearest thing, and
 * it is specified for three to five points with a glyph each, so 0–10 is
 * outside what it is for. Rule 10 lets an experiment build what it needs;
 * every value in experiment.css is a Layer 1 token anyway. Should NPS ever
 * reach the app, this is a component request (OPEN-QUESTIONS.md), not a file
 * to copy.
 *
 * ── A NATIVE RANGE, SO DRAG, KEYS AND SCREEN READERS COME FREE ────────────
 * `<input type="range" step="1">` snaps by itself, takes the arrow keys,
 * Home and End, and is announced as a slider with its value.
 *
 * ── NOTHING IS CHOSEN UNTIL SOMEBODY CHOOSES ──────────────────────────────
 * A range always has a value, and a thumb already sitting at 5 is an answer
 * nobody gave, and it pulls the next one towards it. So `value` is
 * `number | null`. While it is null the thumb is hidden (experiment.css) and
 * a screen reader hears `unsetText`. The first touch, click, drag or arrow
 * key chooses. A click exactly on the hidden middle changes nothing in the
 * input, so no `change` event fires; `onClick` covers that one case.
 *
 * The numbers under the track are clickable too, for a thumb that is hard to
 * hit on a phone. They are `aria-hidden`, because the slider already says the
 * same thing to a screen reader.
 */
import * as React from 'react';

const STEPS = Array.from({ length: 11 }, (_, n) => n);

export interface NpsSliderProps {
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  lowLabel: string;
  highLabel: string;
  unsetText: string;
}

export function NpsSlider({ id, label, value, onChange, lowLabel, highLabel, unsetText }: NpsSliderProps) {
  const anchorsId = `${id}-anchors`;
  const pick = (event: React.SyntheticEvent<HTMLInputElement>) => {
    onChange(Number(event.currentTarget.value));
  };

  return (
    <div className="musie-nps">
      <label className="musie-nps__question" htmlFor={id}>
        {label}
      </label>
      <div
        className="musie-nps__control"
        data-unset={value === null ? '' : undefined}
        style={{ '--nps-ratio': (value ?? 0) / 10 } as React.CSSProperties}
      >
        <input
          id={id}
          className="musie-nps__input"
          type="range"
          min={0}
          max={10}
          step={1}
          value={value ?? 5}
          aria-valuetext={value === null ? unsetText : String(value)}
          aria-describedby={anchorsId}
          onChange={pick}
          onClick={(event) => {
            if (value === null) pick(event);
          }}
        />
        <ol className="musie-nps__steps" aria-hidden="true">
          {STEPS.map((n) => (
            <li
              key={n}
              className="musie-nps__step"
              data-active={n === value ? '' : undefined}
              onClick={() => onChange(n)}
            >
              {n}
            </li>
          ))}
        </ol>
      </div>
      <p id={anchorsId} className="musie-nps__anchors">
        <span>
          <span className="musy-sr-only">0: </span>
          {lowLabel}
        </span>
        <span>
          <span className="musy-sr-only">10: </span>
          {highLabel}
        </span>
      </p>
    </div>
  );
}
