import * as React from 'react';
import {
  AUDIT_PAIRS, SCALES, SEMANTIC_GROUPS, STEPS, STEP_PURPOSE, semanticDescription,
  semanticGroupOf, semanticResolvesTo, tokensIn,
} from '../_lib/tokens';
import { probeColors, THEMES } from '../_lib/probe';
import { Cell, Chip, Measuring, Note, Row, Table, mono, useProbe } from '../_lib/ui';

const RAW = tokensIn('colour-raw');
const SEMANTIC = tokensIn('colour-semantic');

export function ColourRaw() {
  const probed = useProbe(() => probeColors(RAW));
  if (!probed) return <Measuring />;
  return (
    <>
      <Note>
        {SCALES.length} scales × {STEPS.length} steps = {SCALES.length * STEPS.length} tokens, plus{' '}
        <code style={mono}>--alpha-scrim</code>. {RAW.length} in total, every one below.
      </Note>
      {SCALES.map((scale) => (
        <section key={scale} style={{ margin: 'var(--sp-6) 0' }}>
          <h3 style={{ fontFamily: 'var(--type-heading-sm-family)', fontSize: 'var(--type-heading-sm-size)', fontWeight: 'var(--type-heading-sm-weight)', margin: '0 0 var(--sp-3)' }}>
            {scale}
          </h3>
          {THEMES.map((theme) => (
            <div key={theme} style={{ marginBottom: 'var(--sp-3)' }}>
              <div style={{ ...mono, color: 'var(--on-surface-muted)', marginBottom: 'var(--sp-1)' }}>
                {theme}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-1)' }}>
                {STEPS.map((step) => {
                  const name = `--${scale}-${step}`;
                  const hex = probed[theme][name] ?? null;
                  return (
                    <div key={step} style={{ inlineSize: 68 }} title={`${name} — ${STEP_PURPOSE[step] ?? ''}`}>
                      <Chip hex={hex} size={64} />
                      <div style={{ ...mono, color: 'var(--on-surface-muted)' }}>{step}</div>
                      <div style={{ ...mono, fontSize: 10, color: 'var(--on-surface-muted)' }}>{hex ?? '—'}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ))}
      <h3 style={{ fontFamily: 'var(--type-heading-sm-family)', fontSize: 'var(--type-heading-sm-size)' }}>Alpha</h3>
      <Table head={['Token', 'light', 'dark', 'Purpose']}>
        <Row>
          <Cell code>--alpha-scrim</Cell>
          <Cell><Chip hex={probed.light['--alpha-scrim'] ?? null} size={24} /></Cell>
          <Cell><Chip hex={probed.dark['--alpha-scrim'] ?? null} size={24} /></Cell>
          <Cell muted>Modal / sheet backdrop. Deeper in dark, because the canvas is already dark.</Cell>
        </Row>
      </Table>
      <Note>
        The two shadow alphas are on <strong>Elevation</strong>: nothing but the
        elevation ramp consumes them, and they are meaningless as swatches.
      </Note>
    </>
  );
}

/**
 * A foreground token's documented background, taken from the contrast audit.
 * The audit already records which pair is meant to be legible together, so a
 * specimen never invents a pairing the system does not claim.
 */
const BG_FOR = new Map<string, string>();
for (const p of AUDIT_PAIRS) if (!BG_FOR.has(`--${p.fg}`)) BG_FOR.set(`--${p.fg}`, `--${p.bg}`);

/** Real text in the token's own colour, on the surface it is solved against.
 *  A swatch shows a colour; only text shows whether it reads as text. */
function Specimen({ fg }: { fg: string }) {
  const bg = BG_FOR.get(fg);
  if (!bg) return <span style={{ color: 'var(--on-surface-muted)', ...mono }}>—</span>;
  return (
    <span
      title={`${fg} on ${bg}`}
      style={{
        display: 'inline-block', padding: '2px var(--sp-2)', borderRadius: 'var(--radius-xs)',
        backgroundColor: `var(${bg})`, color: `var(${fg})`,
        fontFamily: 'var(--type-body-sm-family)', fontSize: 'var(--type-body-sm-size)',
        whiteSpace: 'nowrap',
      }}
    >
      Größe Aa
    </span>
  );
}

export function ColourSemantic() {
  const probed = useProbe(() => probeColors(SEMANTIC));
  if (!probed) return <Measuring />;

  const other = SEMANTIC.filter((n) => semanticGroupOf(n) === 'other');
  const groups = [
    ...SEMANTIC_GROUPS.map((g) => ({ ...g, rows: SEMANTIC.filter((n) => semanticGroupOf(n) === g.id) })),
    /* Never silently dropped: a token no predicate claims shows up here. */
    ...(other.length ? [{ id: 'other', title: 'Ungrouped', rows: other }] : []),
  ].filter((g) => g.rows.length);

  return (
    <>
      <Note>
        {SEMANTIC.length} semantic tokens, in {groups.length} groups. The{' '}
        <strong>specimen</strong> column renders each foreground in its own colour on the
        background the contrast audit pairs it with — a swatch shows a colour, only text
        shows whether it reads as text.
      </Note>
      {groups.map((g) => (
        <section key={g.id} id={`semantic-${g.id}`} style={{ margin: 'var(--sp-6) 0' }}>
          <h3 style={{
            fontFamily: 'var(--type-heading-sm-family)', fontSize: 'var(--type-heading-sm-size)',
            fontWeight: 'var(--type-heading-sm-weight)', margin: '0 0 var(--sp-2)',
          }}>
            {g.title}{' '}
            <span style={{ ...mono, color: 'var(--on-surface-muted)', fontWeight: 400 }}>
              {g.rows.length}
            </span>
          </h3>
          <Table head={['Token', 'light', 'dark', 'Specimen', 'Resolves to', 'Why']}>
            {g.rows.map((name) => (
              <Row key={name}>
                <Cell code nowrap>{name}</Cell>
                <Cell>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Chip hex={probed.light[name] ?? null} size={20} />
                    <span style={mono}>{probed.light[name] ?? '—'}</span>
                  </span>
                </Cell>
                <Cell>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Chip hex={probed.dark[name] ?? null} size={20} />
                    <span style={mono}>{probed.dark[name] ?? '—'}</span>
                  </span>
                </Cell>
                <Cell><Specimen fg={name} /></Cell>
                <Cell code muted nowrap>{semanticResolvesTo(name) || '—'}</Cell>
                <Cell muted>{semanticDescription(name)}</Cell>
              </Row>
            ))}
          </Table>
        </section>
      ))}
    </>
  );
}
