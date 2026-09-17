import * as React from 'react';
import { AUDIT_PAIRS, AUDITED } from '../_lib/tokens';
import { probeColors, THEMES, type Theme } from '../_lib/probe';
import { passes, ratio } from '../_lib/contrast';
import { Cell, Measuring, Note, Row, Table, mono, useProbe } from '../_lib/ui';

/* Only the tokens the pairs actually name — derived, never listed. */
const NEEDED = [...new Set(AUDIT_PAIRS.flatMap((p) => [`--${p.fg}`, `--${p.bg}`]))];

const auditedFor = (fg: string, bg: string) =>
  AUDITED.find((a) => a.fg === fg && a.bg === bg);

function Ratio({ r, req }: { r: number | null; req: number }) {
  if (r === null) return <span style={{ ...mono, color: 'var(--on-surface-muted)' }}>n/a</span>;
  const ok = passes(r, req);
  const colour =
    ok === null ? 'var(--on-surface-muted)'
      : ok ? 'var(--feedback-success-text)' : 'var(--feedback-error-text)';
  return (
    <span style={{ ...mono, color: colour, fontWeight: 'var(--font-weight-medium)' }}>
      {r.toFixed(2)}{ok === null ? '' : ok ? ' ✓' : ' ✗'}
    </span>
  );
}

export function ContrastTable() {
  const probed = useProbe(() => probeColors(NEEDED));
  const [only, setOnly] = React.useState<'all' | 'req' | 'exempt'>('all');
  if (!probed) return <Measuring />;

  const rows = AUDIT_PAIRS.map((p) => {
    const live: Record<Theme, number | null> = { light: null, dark: null };
    for (const t of THEMES) live[t] = ratio(probed[t][`--${p.fg}`], probed[t][`--${p.bg}`]);
    const stored = auditedFor(p.fg, p.bg);
    const drift = THEMES.map((t) => {
      const was = stored?.[t]?.r;
      const now = live[t];
      if (was === undefined || now === null) return null;
      return Math.abs(now - was) >= 0.01 ? `${t} ${was.toFixed(2)}→${now.toFixed(2)}` : null;
    }).filter(Boolean);
    return { ...p, live, drift };
  });

  let pass = 0, fail = 0;
  for (const r of rows) {
    if (r.req === 0) continue;
    for (const t of THEMES) {
      const ok = passes(r.live[t], r.req);
      if (ok === true) pass++; else if (ok === false) fail++;
    }
  }
  const drifted = rows.filter((r) => r.drift.length).length;
  const shown = rows.filter((r) => only === 'all' || (only === 'req' ? r.req > 0 : r.req === 0));

  return (
    <>
      <Note>
        <strong>{pass} measurements pass</strong> ·{' '}
        <strong style={{ color: fail ? 'var(--feedback-error-text)' : undefined }}>
          {fail === 0 ? 'no failures' : `${fail} FAILURES`}
        </strong>{' '}
        · {rows.length} pairs × 2 themes ·{' '}
        {drifted === 0 ? 'no drift from the stored audit' : `${drifted} pairs drifted`}
      </Note>
      <div style={{ display: 'flex', gap: 'var(--sp-2)', margin: 'var(--sp-3) 0' }}>
        {(['all', 'req', 'exempt'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setOnly(k)}
            style={{
              minBlockSize: 'var(--target-min)',
              padding: 'var(--sp-1) var(--sp-3)',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              fontFamily: 'var(--type-label-md-family)',
              fontSize: 'var(--type-label-md-size)',
              border: only === k ? 'none' : 'var(--border-width-regular) solid var(--border-strong)',
              backgroundColor: only === k ? 'var(--interactive-primary)' : 'transparent',
              color: only === k ? 'var(--interactive-primary-on)' : 'var(--on-surface)',
            }}
          >
            {k === 'all' ? 'All' : k === 'req' ? 'Required' : 'Exempt'}
          </button>
        ))}
      </div>
      <Table head={['Foreground', 'Background', 'req', 'light', 'dark', 'Drift', 'Why']}>
        {shown.map((r) => (
          <Row key={`${r.fg}|${r.bg}`}>
            <Cell code nowrap>--{r.fg}</Cell>
            <Cell code nowrap>--{r.bg}</Cell>
            <Cell code muted align="right">{r.req === 0 ? '—' : r.req.toFixed(1)}</Cell>
            <Cell><Ratio r={r.live.light} req={r.req} /></Cell>
            <Cell><Ratio r={r.live.dark} req={r.req} /></Cell>
            <Cell code muted>{r.drift.length ? r.drift.join(', ') : '—'}</Cell>
            <Cell muted>{r.why}</Cell>
          </Row>
        ))}
      </Table>
    </>
  );
}
