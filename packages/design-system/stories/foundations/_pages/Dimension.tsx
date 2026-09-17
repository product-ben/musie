import * as React from 'react';
import { declaredValue, tokensIn, type GroupName } from '../_lib/tokens';
import { probeColors, probePx, probeValues } from '../_lib/probe';
import { Cell, Measuring, Note, Row, Table, mono, useProbe } from '../_lib/ui';

/** Prose per token. Lifted from the stylesheet's own comments and 01-foundations.md.
 *  Keyed by token, so a token with no note still renders — the LIST is derived,
 *  never this map. */
const USE: Record<string, string> = {
  '--space-inset-control': 'Inside a control — yields a 44px min height at label-lg',
  '--space-inset-card': 'Inside a card',
  '--space-inset-sheet': 'Inside a sheet or modal',
  '--space-gap-inline': 'Icon ↔ its own label. Never widen this',
  '--space-gap-related': 'Atoms that belong together: label+field, title+subtitle',
  '--space-gap-stack': 'Between controls inside one molecule',
  '--space-gap-group': 'Between molecules that do NOT belong together',
  '--space-section': 'Between sections, mobile',
  '--space-section-lg': 'Between sections, ≥lg',
  '--target-min': 'Absolute floor. Inline controls in prose, card controls on a fine pointer — never coarse',
  '--target-primary': 'Every primary action',
  '--target-comfort': 'One-handed reach, noisy room, gloved or shaky hands',
  '--target-guided': 'Kindergarten / assisted use — session choice cards',
  '--radius-xs': 'Checkbox, swatch, tag',
  '--radius-sm': 'Figma Corner/Small — inputs, small media',
  '--radius-md': 'Figma Corner/Medium — cards',
  '--radius-lg': 'Panels, large media',
  '--radius-xl': 'Sheets, bottom drawers',
  '--radius-full': 'Pills and circles',
  '--border-width-hairline': 'Dividers, subtle outlines',
  '--border-width-regular': 'Control boundaries — 3:1 without looking heavy',
  '--border-width-thick': 'Selected / current',
  '--border-width-focus': 'Focus ring only',
  '--icon-size-sm': 'Pairs with body-sm / label-md',
  '--icon-size-md': 'Pairs with body-md / label-lg',
  '--icon-size-lg': 'Pairs with heading-sm / heading-md',
  '--icon-size-xl': 'Pairs with heading-lg and up',
  '--icon-stroke': 'Lucide 24px grid, unrounded',
  '--icon-optical-nudge': 'Optically centre a text-adjacent icon on cap height',
  '--z-base': '0',
  '--z-raised': 'Lifted card, inline popover',
  '--z-sticky': 'Sticky nav / session bar',
  '--z-overlay': 'Scrim',
  '--z-sheet': 'Modal, bottom sheet',
  '--z-tooltip': 'Tooltip',
  '--z-toast': 'Above everything, including a sheet',
  '--focus-ring-clearance': 'Padding an overflow:hidden ancestor must carry so the ring is never clipped (2.4.11)',
  '--focus-ring-offset': 'The gap renders in the parent surface, which is why 3:1 holds even around a terracotta button',
};

/** The generic table: every token in a group, with its declared and resolved value. */
export function TokenGroup({ group }: { group: GroupName }) {
  const names = tokensIn(group);
  const probed = useProbe(() => probeValues(names));
  if (!probed) return <Measuring />;
  return (
    <>
      <Note>{names.length} tokens.</Note>
      <Table home head={['Token', 'Declared', 'Resolved', 'Use']}>
        {names.map((n) => (
          <Row key={n}>
            <Cell code nowrap>{n}</Cell>
            <Cell code muted>{declaredValue(n) ?? '—'}</Cell>
            <Cell code>{probed.light[n] || '—'}</Cell>
            <Cell muted>{USE[n] ?? ''}</Cell>
          </Row>
        ))}
      </Table>
    </>
  );
}

/** Spacing and targets, drawn to scale. */
export function ScaleBars({ group, filter }: { group: GroupName; filter: RegExp }) {
  const names = tokensIn(group).filter((n) => filter.test(n));
  const px = useProbe(() => Object.fromEntries(names.map((n) => [n, probePx(n)])));
  if (!px) return <Measuring />;
  return (
    <Table head={['Token', 'px', '', 'Use']}>
      {names.map((n) => (
        <Row key={n}>
          <Cell code nowrap>{n}</Cell>
          <Cell code align="right">{px[n]}px</Cell>
          <Cell>
            <span style={{ display: 'block', blockSize: 12, inlineSize: Math.min(px[n], 520), backgroundColor: 'var(--interactive-primary)', borderRadius: 2 }} />
          </Cell>
          <Cell muted>{USE[n] ?? ''}</Cell>
        </Row>
      ))}
    </Table>
  );
}

export function RadiusSwatches() {
  const names = tokensIn('radius');
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-4)', margin: 'var(--sp-4) 0' }}>
      {names.map((n) => (
        <div key={n} style={{ textAlign: 'center' }}>
          <div style={{ inlineSize: 88, blockSize: 88, borderRadius: `var(${n})`, backgroundColor: 'var(--surface-sunken)', border: 'var(--border-width-regular) solid var(--border-strong)' }} />
          <div style={{ ...mono, marginTop: 'var(--sp-1)', color: 'var(--on-surface-muted)' }}>{n.replace('--radius-', '')}</div>
        </div>
      ))}
    </div>
  );
}

export function BorderWidths() {
  const names = tokensIn('border-width');
  return (
    <div style={{ display: 'grid', gap: 'var(--sp-3)', margin: 'var(--sp-4) 0' }}>
      {names.map((n) => (
        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <span style={{ ...mono, inlineSize: 220, color: 'var(--on-surface-muted)' }}>{n}</span>
          <span style={{ flex: 1, borderTop: `var(${n}) solid var(--border-strong)` }} />
        </div>
      ))}
    </div>
  );
}

export function ElevationRamp() {
  const names = tokensIn('elevation').filter((n) => /^--elevation-\d$/.test(n));
  const probed = useProbe(() => probeColors(['--elevation-ring', '--alpha-shadow-key', '--alpha-shadow-ambient']));
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-5)', margin: 'var(--sp-5) 0' }}>
        {names.map((n) => (
          <div key={n} style={{ textAlign: 'center' }}>
            <div style={{ inlineSize: 120, blockSize: 80, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-raised)', boxShadow: `var(${n})` }} />
            <div style={{ ...mono, marginTop: 'var(--sp-2)', color: 'var(--on-surface-muted)' }}>{n.replace('--', '')}</div>
          </div>
        ))}
      </div>
      <Note>
        Geometry is identical in both themes; only colours are themed. In light the
        warm shadow does the work and the ring is transparent. In dark the shadow
        barely reads, so elevation comes from <em>both</em> surface-lightening and a
        1px inset ring — stated strategy: both, always. That is why{' '}
        <code style={mono}>--elevation-ring</code> probes as transparent in light
        {probed ? ` (${probed.light['--elevation-ring'] ?? 'transparent'}) and as ${probed.dark['--elevation-ring'] ?? '—'} in dark` : ''}.
      </Note>
      <TokenGroup group="elevation" />
    </>
  );
}

export function FocusDemo() {
  return (
    <>
      <div style={{ display: 'flex', gap: 'var(--sp-5)', alignItems: 'center', margin: 'var(--sp-5) 0', flexWrap: 'wrap' }}>
        <span
          tabIndex={0}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minBlockSize: 'var(--target-primary)', padding: 'var(--space-inset-control)',
            borderRadius: 'var(--radius-control)', backgroundColor: 'var(--interactive-primary)',
            color: 'var(--interactive-primary-on)', fontFamily: 'var(--type-label-lg-family)',
            fontSize: 'var(--type-label-lg-size)', outline: 'var(--focus-ring)',
            outlineOffset: 'var(--focus-ring-offset)',
          }}
        >
          Ring always on
        </span>
        <button
          type="button"
          style={{
            minBlockSize: 'var(--target-primary)', padding: 'var(--space-inset-control)',
            borderRadius: 'var(--radius-control)', cursor: 'pointer',
            border: 'var(--border-width-regular) solid var(--border-strong)',
            backgroundColor: 'transparent', color: 'var(--on-surface)',
            fontFamily: 'var(--type-label-lg-family)', fontSize: 'var(--type-label-lg-size)',
          }}
        >
          Tab to me
        </button>
      </div>
      <TokenGroup group="focus" />
    </>
  );
}

const EASINGS = ['--motion-ease-standard', '--motion-ease-entrance', '--motion-ease-exit', '--motion-ease-emphasis'];

export function MotionDemo() {
  const [on, setOn] = React.useState(false);
  const durations = tokensIn('motion').filter((n) => /^--motion-duration-/.test(n));
  const travels = tokensIn('motion').filter((n) => /^--motion-travel-/.test(n));
  const reduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const Track = ({ dur, ease }: { dur: string; ease: string }) => (
    <div style={{ position: 'relative', blockSize: 28, backgroundColor: 'var(--surface-sunken)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
      <span style={{
        position: 'absolute', insetBlockStart: 2, inlineSize: 24, blockSize: 24,
        borderRadius: 'var(--radius-full)', backgroundColor: 'var(--accent-1)',
        transition: `transform var(${dur}) var(${ease})`,
        transform: on ? 'translateX(calc(100cqw - 28px))' : 'translateX(2px)',
      }} />
    </div>
  );
  return (
    <>
      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        style={{
          minBlockSize: 'var(--target-primary)', padding: 'var(--space-inset-control)',
          borderRadius: 'var(--radius-control)', cursor: 'pointer', border: 'none',
          backgroundColor: 'var(--interactive-primary)', color: 'var(--interactive-primary-on)',
          fontFamily: 'var(--type-label-lg-family)', fontSize: 'var(--type-label-lg-size)',
          marginBottom: 'var(--sp-4)',
        }}
      >
        {on ? 'Reset' : 'Play'}
      </button>
      <Note>
        {reduced
          ? 'prefers-reduced-motion: reduce is ACTIVE — every duration is 1ms and every travel token is 0px, with no component-level media query.'
          : 'prefers-reduced-motion is off. Turn it on in your OS and reload: every dot jumps instantly, because durations are tokens.'}
      </Note>
      <h3 style={{ fontFamily: 'var(--type-heading-sm-family)', fontSize: 'var(--type-heading-sm-size)' }}>One per duration</h3>
      <div style={{ containerType: 'inline-size', display: 'grid', gap: 'var(--sp-3)' }}>
        {durations.map((d) => (
          <div key={d}>
            <div style={{ ...mono, color: 'var(--on-surface-muted)' }}>{d} · {declaredValue(d)}</div>
            <Track dur={d} ease="--motion-ease-standard" />
          </div>
        ))}
      </div>
      <h3 style={{ fontFamily: 'var(--type-heading-sm-family)', fontSize: 'var(--type-heading-sm-size)' }}>One per easing</h3>
      <div style={{ containerType: 'inline-size', display: 'grid', gap: 'var(--sp-3)' }}>
        {EASINGS.map((e) => (
          <div key={e}>
            <div style={{ ...mono, color: 'var(--on-surface-muted)' }}>{e} · {declaredValue(e)}</div>
            <Track dur="--motion-duration-slower" ease={e} />
          </div>
        ))}
      </div>
      <h3 style={{ fontFamily: 'var(--type-heading-sm-family)', fontSize: 'var(--type-heading-sm-size)' }}>Travel</h3>
      <Note>
        {travels.length} travel tokens. Reduced motion sets all of them to 0px, which is
        how a slide becomes a cross-fade without a component branch.
      </Note>
      <TokenGroup group="motion" />
    </>
  );
}

export function IconSizes() {
  const names = tokensIn('icon').filter((n) => /^--icon-size-/.test(n));
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--sp-5)', margin: 'var(--sp-4) 0' }}>
        {names.map((n) => (
          <div key={n} style={{ textAlign: 'center' }}>
            <svg width={`var(${n})`} style={{ inlineSize: `var(${n})`, blockSize: `var(${n})` }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" />
            </svg>
            <div style={{ ...mono, color: 'var(--on-surface-muted)' }}>{n.replace('--icon-size-', '')}</div>
          </div>
        ))}
      </div>
      <TokenGroup group="icon" />
    </>
  );
}

export function ZStack() {
  const names = tokensIn('z-index');
  return (
    <>
      <div style={{ position: 'relative', blockSize: 150, margin: 'var(--sp-4) 0' }}>
        {names.map((n, i) => (
          <div key={n} style={{
            position: 'absolute', insetInlineStart: i * 54, insetBlockStart: i * 14,
            inlineSize: 150, blockSize: 56, zIndex: `var(${n})` as unknown as number,
            borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-raised)',
            border: 'var(--border-width-regular) solid var(--border-strong)',
            boxShadow: 'var(--elevation-1)', display: 'grid', placeItems: 'center',
            ...mono, color: 'var(--on-surface)',
          }}>{n.replace('--z-', '')}</div>
        ))}
      </div>
      <TokenGroup group="z-index" />
    </>
  );
}

export function Grid() {
  const live = useProbe(() => ({
    cols: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--columns'), 10) || 4,
    gutter: getComputedStyle(document.documentElement).getPropertyValue('--gutter').trim(),
    vw: window.innerWidth,
  }));
  return (
    <>
      {live && (
        <Note>
          At {live.vw}px: <strong>{live.cols} columns</strong>, {live.gutter} gutter. Resize and reload —
          the grid tokens step at 768 / 1024 / 1280.
        </Note>
      )}
      {live && (
        <div style={{ display: 'grid', gap: 'var(--grid-gap)', gridTemplateColumns: `repeat(${live.cols}, minmax(0, 1fr))`, margin: 'var(--sp-4) 0' }}>
          {Array.from({ length: live.cols }, (_, i) => (
            <div key={i} style={{ blockSize: 56, borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--interactive-primary-subtle)' }} />
          ))}
        </div>
      )}
      <TokenGroup group="breakpoints" />
    </>
  );
}
