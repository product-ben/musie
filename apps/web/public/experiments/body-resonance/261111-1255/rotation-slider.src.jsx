/* Der Drehregler des Körpers: Base UI Slider im Aussehen des Scrubbers aus MusicPlayer (musy-mplayer__*).
   window.musieSlider(el, opts) → { set(value) }: die Seite stellt ihn, wenn am Körper gezogen wird. */
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Slider } from '@base-ui/react/slider';

function RotationSlider({ api, label, min, max, step, initial, onChange, onCommit, valueText }) {
  const [value, setValue] = React.useState(initial);
  api.set = (v) => flushSync(() => setValue(v));
  return (
    <Slider.Root
      value={value}
      min={min}
      max={max}
      step={step}
      onValueChange={(v) => { const n = Array.isArray(v) ? v[0] : v; setValue(n); onChange?.(n); }}
      onValueCommitted={(v) => onCommit?.(Array.isArray(v) ? v[0] : v)}
    >
      <Slider.Control className="musy-mplayer__slider">
        <Slider.Track className="musy-mplayer__control">
          <span className="musy-mplayer__track" />
          <Slider.Thumb className="musy-mplayer__thumb" aria-label={label} getAriaValueText={valueText ? (_f, v) => valueText(v) : undefined} />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}

window.musieSlider = function mount(el, opts) {
  const api = { set() {} };
  createRoot(el).render(<RotationSlider api={api} {...opts} />);
  return api;
};
