import * as React from 'react';
import {
  INSTRUMENT_SHADOW_LEVELS, hslToRgb, instrumentShadowColor, instrumentShadowLayers,
  instrumentShadowProfile, readInstrumentShadowParams,
} from '../../../src/instrumentShadow';
import type { InstrumentShadowParams } from '../../../src/instrumentShadow';
import { THEMES, type Theme } from '../_lib/probe';
import { Note, mono } from '../_lib/ui';

/**
 * The instruments' tokens, painted the way the instruments paint them: on a
 * canvas, string and bar, at every shadow level, in both themes.
 *
 * Nothing here is transcribed. Each tile resolves the tokens inside its own
 * `data-theme` subtree — colours through a probe element, the shadow's
 * parameters through `readInstrumentShadowParams` — and draws with the same
 * `instrumentShadowLayers` / `instrumentShadowProfile` the app calls.
 */

const W = 140;
const H = 170;

function rgbToHex(rgb: string): string {
  const [r = 0, g = 0, b = 0] = (rgb.match(/[\d.]+/g) ?? []).map(Number);
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function resolve(scope: HTMLElement, token: string): string {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  scope.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function paint(canvas: HTMLCanvasElement, scope: HTMLElement, level: InstrumentShadowParams['level']) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const g = canvas.getContext('2d');
  if (g === null) return;
  const params = { ...readInstrumentShadowParams(getComputedStyle(scope)), level };
  const surface = resolve(scope, '--instrument-surface');
  const [h, s, l] = instrumentShadowColor(params, rgbToHex(surface));
  const [r, gr, b] = hslToRgb(h, s, l);

  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = surface;
  g.fillRect(0, 0, W, H);

  /* A string (6px, the harp's lowest) and a bar (36px, a marimba bar), both
     upright, so one profile per layer stretched along the length does it. */
  const shapes = [
    { x: 40, width: 6, top: -4, bottom: H + 4, fill: resolve(scope, '--instrument-string') },
    { x: 100, width: 36, top: 30, bottom: H - 30, fill: resolve(scope, '--instrument-key') },
  ];
  const layers = instrumentShadowLayers(params);
  for (const shape of shapes) {
    for (const layer of layers) {
      const { alphas, half } = instrumentShadowProfile(shape.width, layer, dpr);
      const row = g.createImageData(alphas.length, 1);
      alphas.forEach((a, i) => {
        row.data.set([r, gr, b, Math.round(255 * a)], i * 4);
      });
      const strip = document.createElement('canvas');
      strip.width = alphas.length;
      strip.height = 1;
      strip.getContext('2d')?.putImageData(row, 0, 0);
      g.drawImage(strip, 0, 0, strip.width, 1,
        shape.x + layer[0] - half, shape.top + layer[1], strip.width / dpr, shape.bottom - shape.top);
    }
  }
  for (const shape of shapes) {
    g.fillStyle = shape.fill;
    g.fillRect(shape.x - shape.width / 2, shape.top, shape.width, shape.bottom - shape.top);
  }
}

function Tile({ theme, level }: { theme: Theme; level: InstrumentShadowParams['level'] }) {
  const scope = React.useRef<HTMLDivElement>(null);
  const canvas = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    if (scope.current !== null && canvas.current !== null) paint(canvas.current, scope.current, level);
  }, [level]);
  return (
    <div ref={scope} data-theme={theme} style={{ textAlign: 'center', background: 'transparent' }}>
      <canvas
        ref={canvas}
        role="img"
        aria-label={`${INSTRUMENT_SHADOW_LEVELS[level]}, ${theme}`}
        style={{ inlineSize: W, blockSize: H, borderRadius: 'var(--radius-md)', display: 'block' }}
      />
      <div style={{ ...mono, marginTop: 'var(--sp-2)', color: 'var(--on-surface-muted)' }}>
        {level} · {INSTRUMENT_SHADOW_LEVELS[level]}
      </div>
    </div>
  );
}

export function InstrumentShadowRamp() {
  return (
    <>
      {THEMES.map((theme) => (
        <div key={theme} style={{ margin: 'var(--sp-5) 0' }}>
          <div style={{ ...mono, marginBottom: 'var(--sp-2)' }}>{theme}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-5)' }}>
            {([0, 1, 2, 3] as const).map((level) => <Tile key={level} theme={theme} level={level} />)}
          </div>
        </div>
      ))}
      <Note>
        The instruments use level 3, Hoch — <code style={mono}>--instrument-shadow-level</code>.
        Under <code style={mono}>prefers-contrast: more</code> the level is 0, as the
        elevation ramp drops its shadows there too, and under forced colours the
        instruments draw none.
      </Note>
    </>
  );
}

const SWATCHES = [
  ['--instrument-surface', 'What the instruments are drawn on — the app canvas, sand-1'],
  ['--instrument-string', 'A string instrument at rest (harp) — lighter'],
  ['--instrument-key', 'A key instrument at rest (marimba, kalimba) — darker'],
  ['--instrument-played', 'What the person touched'],
  ['--instrument-answer', 'What Musie answered'],
  ['--instrument-detail', 'Cords, holes, the bridge'],
] as const;

export function InstrumentColours() {
  return (
    <div style={{ display: 'grid', gap: 'var(--sp-3)', margin: 'var(--sp-5) 0' }}>
      {SWATCHES.map(([token, use]) => (
        <div key={token} style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'center' }}>
          {THEMES.map((theme) => (
            <div
              key={theme}
              data-theme={theme}
              aria-hidden="true"
              style={{
                inlineSize: 48, blockSize: 32, borderRadius: 'var(--radius-xs)', background: `var(${token})`,
                boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
              }}
            />
          ))}
          <code style={mono}>{token}</code>
          <span style={{ color: 'var(--on-surface-muted)' }}>{use}</span>
        </div>
      ))}
    </div>
  );
}
