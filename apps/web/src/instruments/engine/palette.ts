/**
 * The instruments' colours and shadow, from the tokens (amendments G5) — a
 * canvas cannot read `var(--…)`, so they are resolved here and handed over as
 * plain colour strings and shadow layers (`InstrumentHost.palette`/`shadow`).
 *
 * RESOLVED THROUGH A PROBE, NOT READ OFF THE TOKEN. The tokens are
 * `light-dark(#…, #…)` (musy-foundations.css), so the custom property's own
 * value is that expression, not a colour. A hidden probe INSIDE the scope
 * takes `color: var(--instrument-…)` and its computed colour is the answer for
 * the scheme that applies there — the scope is inside `[data-theme]`, which
 * is what makes the amendments apply at all.
 *
 * Which tokens: `--instrument-surface` behind the instrument (--sand-1, not
 * --surface: the amendments say why), `--instrument-string` or
 * `--instrument-key` at rest by family (Ben, round 2: keys draw lighter than strings),
 * `--instrument-played`, `--instrument-answer`, `--instrument-detail`.
 *
 * RE-RESOLVED on a theme change: the `data-theme` attribute anywhere in the
 * document, and `prefers-color-scheme` (the theme may follow the system).
 * The shadow also follows `prefers-contrast` and `forced-colors`.
 *
 * SHADOW: the design system's `readInstrumentShadowParams`,
 * `instrumentShadowLayers`, `instrumentShadowColor` and `hslToRgb`. None at
 * level 0, under `prefers-contrast: more` (the token already drops to 0 there)
 * and under `forced-colors: active` — the adapter then draws no shadow.
 */
import {
  hslToRgb,
  instrumentShadowColor,
  instrumentShadowLayers,
  readInstrumentShadowParams,
} from '@musie/design-system';
import { readInstrumentTapParams } from '@musie/design-system';
import type { InstrumentShadowLayer, InstrumentTapParams } from '@musie/design-system';
import type { InstrumentFamily, InstrumentPalette } from '../types';

export type InstrumentShadow = { layers: readonly InstrumentShadowLayer[]; rgb: readonly [number, number, number] } | null;

export const INSTRUMENT_TOKENS = {
  surface: '--instrument-surface',
  string: '--instrument-string',
  key: '--instrument-key',
  played: '--instrument-played',
  answer: '--instrument-answer',
  detail: '--instrument-detail',
} as const;

/** The palette, given a way to resolve one token to a colour. Pure. */
export function paletteFrom(family: InstrumentFamily, resolve: (token: string) => string): InstrumentPalette {
  return {
    rest: resolve(family === 'string' ? INSTRUMENT_TOKENS.string : INSTRUMENT_TOKENS.key),
    played: resolve(INSTRUMENT_TOKENS.played),
    answer: resolve(INSTRUMENT_TOKENS.answer),
    background: resolve(INSTRUMENT_TOKENS.surface),
    detail: resolve(INSTRUMENT_TOKENS.detail),
  };
}

/** `rgb(…)`, `rgba(…)` (comma or space syntax) or `#rgb` / `#rrggbb` → `#rrggbb`; null otherwise. */
export function cssColorToHex(css: string): string | null {
  const s = css.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(s);
  if (hex) {
    const h = hex[1];
    return h.length === 3 ? `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}` : `#${h}`;
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(s);
  if (!rgb) return null;
  const byte = (v: string) => Math.max(0, Math.min(255, Math.round(Number(v)))).toString(16).padStart(2, '0');
  return `#${byte(rgb[1])}${byte(rgb[2])}${byte(rgb[3])}`;
}

export interface ShadowMedia {
  contrastMore: boolean;
  forcedColors: boolean;
}

/**
 * The shadow, from the computed style that carries the `--instrument-shadow-*`
 * tokens and the resolved surface colour. Pure.
 */
export function shadowFrom(style: Pick<CSSStyleDeclaration, 'getPropertyValue'>, surface: string, media: ShadowMedia): InstrumentShadow {
  if (media.contrastMore || media.forcedColors) return null;
  const params = readInstrumentShadowParams(style as CSSStyleDeclaration);
  if (params.level === 0) return null;
  const layers = instrumentShadowLayers(params);
  if (!layers.length) return null;
  const [h, s, l] = instrumentShadowColor(params, cssColorToHex(surface) ?? '#000000');
  return { layers, rgb: hslToRgb(h, s, l) };
}

export interface PaletteWatch {
  palette(): InstrumentPalette;
  shadow(): InstrumentShadow;
  tap(): InstrumentTapParams;
  dispose(): void;
}

export type WatchPalette = (scope: HTMLElement, family: InstrumentFamily, onChange: () => void) => PaletteWatch;

const QUERIES = ['(prefers-color-scheme: dark)', '(prefers-contrast: more)', '(forced-colors: active)'] as const;

/** The browser's: a probe in `scope`, observers on the theme. */
export const watchPalette: WatchPalette = (scope, family, onChange) => {
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';
  scope.appendChild(probe);
  const media = QUERIES.map((q) => window.matchMedia(q));

  let palette: InstrumentPalette;
  let shadow: InstrumentShadow;
  let tap: InstrumentTapParams;
  const resolve = (token: string) => {
    probe.style.color = `var(${token})`;
    return getComputedStyle(probe).color;
  };
  const compute = () => {
    palette = paletteFrom(family, resolve);
    shadow = shadowFrom(getComputedStyle(probe), palette.background, {
      contrastMore: media[1].matches,
      forcedColors: media[2].matches,
    });
    tap = readInstrumentTapParams(getComputedStyle(probe));
  };
  compute();

  const changed = () => {
    compute();
    onChange();
  };
  const observer = new MutationObserver(changed);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'], subtree: true });
  media.forEach((m) => m.addEventListener('change', changed));

  return {
    palette: () => palette,
    shadow: () => shadow,
    tap: () => tap,
    dispose() {
      observer.disconnect();
      media.forEach((m) => m.removeEventListener('change', changed));
      probe.remove();
    },
  };
};
