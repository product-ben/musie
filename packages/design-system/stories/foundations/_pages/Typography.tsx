import * as React from 'react';
import { TYPE_STEPS, declaredValue, tokensIn } from '../_lib/tokens';
import { probePx, probeValues } from '../_lib/probe';
import { Cell, Measuring, Note, Row, Table, mono, useProbe } from '../_lib/ui';

/** The three reference widths from Layer 1: iPhone 16, tablet, desktop. */
export const WIDTHS = [393, 834, 1440] as const;

/**
 * Evaluate `clamp(min, calc(a + b*vw), max)` at a viewport width.
 *
 * The CSS is the source of truth here too — the expression is read out of the
 * stylesheet and solved, rather than the three figures being copied from
 * proof-manifest.json. A token whose curve is retuned updates this table.
 */
export function clampAt(expr: string, vw: number): number | null {
  const m = expr.match(
    /clamp\(\s*([\d.]+)px\s*,\s*calc\(\s*([\d.]+)px\s*\+\s*([\d.]+)vw\s*\)\s*,\s*([\d.]+)px\s*\)/,
  );
  if (!m) {
    const flat = expr.match(/^([\d.]+)px$/);
    return flat ? parseFloat(flat[1]) : null;
  }
  const [min, base, vwCoef, max] = [m[1], m[2], m[3], m[4]].map(parseFloat);
  return Math.min(max, Math.max(min, base + (vwCoef / 100) * vw));
}

const SAMPLES: Record<string, string> = {
  'display-xl': 'Willkommen bei Musy',
  'display-lg': 'Klangschale & Atem',
  stage: 'Musie hört dir zu — schöne Grüße aus München.',
  'heading-lg': 'Heutige Sitzung',
  'heading-md': 'Vorbereitung',
  'heading-sm': 'Morgenkreis',
  'body-xl': 'Hör dir den Track an. Denk an die letzten Stunden.',
  'body-lg': 'Setzt euch bequem hin und atmet dreimal langsam ein und aus.',
  'body-md': 'Die Übung dauert etwa zwanzig Minuten und eignet sich für Gruppen.',
  'body-sm': 'Zuletzt gespielt vor drei Tagen · 8 Teilnehmer:innen',
  'label-lg': 'Session öffnen',
  'label-md': 'Filter',
};

export function TypeScale() {
  const live = useProbe(() =>
    Object.fromEntries(TYPE_STEPS.map((s) => [s, probePx(`--type-${s}-size`, 'font-size')])),
  );
  return (
    <>
      <Note>
        {TYPE_STEPS.length} steps. The token JSON has 11 — <code style={mono}>stage</code> exists
        only in the stylesheet, which is why this list is parsed from the CSS. See{' '}
        <code style={mono}>TOKEN-DRIFT.md</code>.
      </Note>
      <Table home head={['Step', ...WIDTHS.map((w) => `${w}px`), 'now', 'Family / weight']}>
        {TYPE_STEPS.map((step) => {
          const expr = declaredValue(`--type-${step}-size`) ?? '';
          const fam = (declaredValue(`--type-${step}-family`) ?? '').replace(/var\(--font-(\w+)\)/, '$1');
          const wt = (declaredValue(`--type-${step}-weight`) ?? '').replace(/var\(--font-weight-(\w+)\)/, '$1');
          return (
            <Row key={step}>
              <Cell code nowrap>
                {/* The five real property names, not just the stem. A table
                    that shows only `--type-display-xl` documents a token that
                    does not exist: the stylesheet declares five separate
                    properties per step, and those are what a consumer writes. */}
                <div>--type-{step}-<strong>size</strong></div>
                {(['line', 'tracking', 'weight', 'family'] as const).map((p) => (
                  <div key={p} style={{ color: 'var(--on-surface-muted)' }}>--type-{step}-{p}</div>
                ))}
              </Cell>
              {WIDTHS.map((w) => {
                const v = clampAt(expr, w);
                return <Cell key={w} code align="right">{v === null ? '—' : `${Math.round(v * 10) / 10}px`}</Cell>;
              })}
              <Cell code align="right" muted>
                {live ? `${Math.round((live[step] ?? 0) * 10) / 10}px` : '…'}
              </Cell>
              <Cell muted nowrap>{fam} · {wt}</Cell>
            </Row>
          );
        })}
      </Table>
    </>
  );
}

/**
 * Real type at a real width. An iframe is the only honest way to show clamp()
 * interpolating: the expression resolves against the VIEWPORT, so a scaled or
 * width-constrained div would render the docs page's own size, not the
 * breakpoint's. The iframe loads the same token stylesheets this page does.
 */
export function TypeAtWidth({ width }: { width: number }) {
  const srcDoc = React.useMemo(() => {
    const rows = TYPE_STEPS.map(
      (s) => `<div class="r"><code>--type-${s}</code>
        <p style="font-family:var(--type-${s}-family);font-size:var(--type-${s}-size);
                  line-height:var(--type-${s}-line);letter-spacing:var(--type-${s}-tracking);
                  font-weight:var(--type-${s}-weight)">${SAMPLES[s] ?? s}</p></div>`,
    ).join('');
    return `<!doctype html><html lang="de"><head>
      <link rel="stylesheet" href="/foundations-tokens/musy-fonts.css">
      <link rel="stylesheet" href="/foundations-tokens/musy-foundations.css">
      <link rel="stylesheet" href="/foundations-tokens/musy-foundations-amendments.css">
      <style>
        body{margin:0;padding:12px;background:var(--surface);color:var(--on-surface)}
        .r{padding:6px 0;border-bottom:1px solid var(--border-subtle)}
        .r p{margin:2px 0;text-wrap:pretty}
        code{font:11px ui-monospace,Menlo,monospace;color:var(--on-surface-muted)}
      </style></head><body>${rows}</body></html>`;
  }, []);
  return (
    <figure style={{ margin: 'var(--sp-4) 0' }}>
      <figcaption style={{ ...mono, color: 'var(--on-surface-muted)', marginBottom: 'var(--sp-2)' }}>
        viewport {width}px
      </figcaption>
      {/* THE FRAME MUST KEEP ITS FULL WIDTH. Constraining it — max-inline-size,
          a flex parent, anything — shrinks the iframe's VIEWPORT, and clamp()
          then resolves against that instead of the width in the caption. The
          page silently shows the wrong number: a 1440px frame squeezed to the
          docs column rendered its type at 716px and looked plausible. So the
          wrapper scrolls rather than the frame shrinking. */}
      <div style={{ overflowX: 'auto', maxInlineSize: '100%' }}>
        <iframe
          title={`Type scale at ${width}px`}
          srcDoc={srcDoc}
          width={width}
          height={560}
          style={{
            display: 'block',
            inlineSize: width,
            minInlineSize: width,
            border: 'var(--border-width-hairline) solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
          }}
        />
      </div>
    </figure>
  );
}

/** Everything in the typography group that is not a per-step property.
 *
 *  The exclusion is built from TYPE_STEPS rather than from a pattern. A regex
 *  like /^--type-[a-z-]+-(size|line|...)$/ also swallows --type-body-min-size,
 *  which is NOT a step — it is the body-size floor — and that token then
 *  appeared on no page at all while every predicate still passed. */
export function TypeRules() {
  const stepProps = new Set(
    TYPE_STEPS.flatMap((s) => ['size', 'line', 'tracking', 'weight', 'family'].map((p) => `--type-${s}-${p}`)),
  );
  const names = tokensIn('typography').filter((n) => !stepProps.has(n));
  const probed = useProbe(() => probeValues(names));
  if (!probed) return <Measuring />;
  return (
    <Table home head={['Token', 'Value']}>
      {names.map((n) => (
        <Row key={n}>
          <Cell code nowrap>{n}</Cell>
          <Cell code>{probed.light[n] || '—'}</Cell>
        </Row>
      ))}
    </Table>
  );
}
