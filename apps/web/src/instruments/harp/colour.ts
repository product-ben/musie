/**
 * The harp's colour blend: a string eases between its rest colour and the
 * played (or answer) colour, mixed in OKLab so the middle does not go grey.
 *
 * The experiment's `hexToOklab`, `oklabToHex` and `mix`, unchanged in their
 * arithmetic. What changed is where the two ends come from: the experiment
 * picked library hex values by shade; here they are the host's palette —
 * CSS colour strings resolved from the instrument tokens, which a browser
 * reports as `rgb(…)`. So the hex reader became a small CSS colour parser.
 * The ends stay exactly the palette's strings, as the experiment's ends were
 * exactly the library's colours.
 */

export type Rgb = readonly [r: number, g: number, b: number];
export type Oklab = readonly [L: number, a: number, b: number];

const channel = (v: string): number => {
  const s = v.trim();
  return s.endsWith('%') ? (Number.parseFloat(s) / 100) * 255 : Number.parseFloat(s);
};

/**
 * `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()` / `rgba()` (commas or
 * spaces, numbers or percentages) and `color(srgb …)`. Alpha is ignored —
 * the instrument tokens are opaque. Null for anything else.
 */
export function parseColour(css: string): Rgb | null {
  const s = css.trim().toLowerCase();
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (!/^[0-9a-f]+$/.test(hex)) return null;
    if (hex.length === 3 || hex.length === 4) {
      return [0, 1, 2].map((i) => parseInt(hex[i] + hex[i], 16)) as unknown as Rgb;
    }
    if (hex.length === 6 || hex.length === 8) {
      return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as unknown as Rgb;
    }
    return null;
  }
  const fn = /^(rgba?|color)\(([^)]*)\)$/.exec(s);
  if (fn === null) return null;
  const parts = fn[2].split('/')[0].trim().split(/[\s,]+/).filter(Boolean);
  if (fn[1] === 'color') {
    if (parts[0] !== 'srgb' || parts.length < 4) return null;
    const rgb = parts.slice(1, 4).map((p) => (p.endsWith('%') ? Number.parseFloat(p) / 100 : Number.parseFloat(p)) * 255);
    return rgb.every(Number.isFinite) ? (rgb as unknown as Rgb) : null;
  }
  if (parts.length < 3) return null;
  const rgb = parts.slice(0, 3).map(channel);
  return rgb.every(Number.isFinite) ? (rgb as unknown as Rgb) : null;
}

const linear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

/** The experiment's `hexToOklab`, from channels instead of a hex string. */
export function rgbToOklab([r8, g8, b8]: Rgb): Oklab {
  const r = linear(r8);
  const g = linear(g8);
  const b = linear(b8);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** The experiment's `oklabToHex`: clamped, rounded, `#rrggbb`. */
export function oklabToHex([L, A, B]: Oklab): string {
  const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
  const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
  const s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
  const enc = (c: number) => {
    const v = Math.max(0, Math.min(1, c));
    const e = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    return Math.round(e * 255).toString(16).padStart(2, '0');
  };
  return (
    '#' +
    enc(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) +
    enc(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) +
    enc(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
  );
}

/**
 * A blender with its conversions cached by colour string — `mix` runs for
 * every string in every frame, and the palette changes only with the theme.
 */
export function createMixer(): (k: number, rest: string, to: string) => string {
  const lab = new Map<string, Oklab | null>();
  const toLab = (css: string) => {
    if (!lab.has(css)) {
      const rgb = parseColour(css);
      lab.set(css, rgb === null ? null : rgbToOklab(rgb));
    }
    return lab.get(css) ?? null;
  };
  /** k = 0 rest, 1 active; the ends are exactly the given strings. */
  return (k, rest, to) => {
    if (k <= 0) return rest;
    if (k >= 1) return to;
    const a = toLab(rest);
    const b = toLab(to);
    /* A colour the parser cannot read is switched at the midpoint instead of
       blended — never a wrong colour, only a harder change. */
    if (a === null || b === null) return k < 0.5 ? rest : to;
    return oklabToHex([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]);
  };
}
