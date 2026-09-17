import * as React from 'react';
import { EVIDENCE, PREAMBLE, RULES, summarise } from '../_lib/rules';
import { renderMarkdown } from '../_lib/markdown';

const mono: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 12,
};

export function Preamble() {
  return <>{renderMarkdown(PREAMBLE, 'pre-')}</>;
}

/** The index. Every rule, with its thesis, so the whole layer is one glance. */
export function RuleIndex() {
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%', margin: 'var(--space-gap-stack) 0' }}>
      <thead>
        <tr>
          {['Rule', 'Name', 'In one line'].map((h) => (
            <th key={h} style={{
              textAlign: 'left', padding: 'var(--sp-2) var(--sp-3)',
              borderBottom: 'var(--border-width-regular) solid var(--border-strong)',
              fontFamily: 'var(--type-label-md-family)', fontSize: 'var(--type-label-md-size)',
              fontWeight: 'var(--font-weight-medium)', color: 'var(--on-surface)',
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {RULES.map((r) => (
          <tr key={r.id} style={{ borderBottom: 'var(--border-width-hairline) solid var(--border-subtle)' }}>
            <td style={{ padding: 'var(--sp-2) var(--sp-3)', verticalAlign: 'top', ...mono, color: 'var(--on-surface-muted)' }}>
              <a href={`#${r.id.toLowerCase()}`} style={{ color: 'inherit' }}>{r.id}</a>
            </td>
            <td style={{
              padding: 'var(--sp-2) var(--sp-3)', verticalAlign: 'top',
              fontFamily: 'var(--type-label-md-family)', fontSize: 'var(--type-label-md-size)',
              fontWeight: 'var(--font-weight-medium)', color: 'var(--on-surface)',
            }}>{r.title}</td>
            <td style={{
              padding: 'var(--sp-2) var(--sp-3)', verticalAlign: 'top',
              fontFamily: 'var(--type-body-sm-family)', fontSize: 'var(--type-body-sm-size)',
              lineHeight: 'var(--type-body-sm-line)', color: 'var(--on-surface-muted)',
            }}>{summarise(r)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Every rule, in full, in document order. */
export function AllRules() {
  return (
    <>
      {RULES.map((r) => (
        <section
          key={r.id}
          id={r.id.toLowerCase()}
          style={{
            margin: 'var(--space-gap-group) 0',
            paddingBlockStart: 'var(--sp-2)',
            scrollMarginBlockStart: 'var(--sp-5)',
          }}
        >
          <h2 style={{
            fontFamily: 'var(--type-heading-lg-family)', fontSize: 'var(--type-heading-lg-size)',
            fontWeight: 'var(--type-heading-lg-weight)', lineHeight: 'var(--type-heading-lg-line)',
            letterSpacing: 'var(--type-heading-lg-tracking)', color: 'var(--on-surface)',
            margin: '0 0 var(--space-gap-related)', maxWidth: 'var(--measure-heading)',
            textWrap: 'balance', display: 'flex', alignItems: 'baseline', gap: 'var(--space-gap-inline)',
          }}>
            <span style={{
              ...mono, fontSize: 14, color: 'var(--interactive-primary-on-subtle)',
              backgroundColor: 'var(--interactive-primary-subtle)',
              padding: '2px var(--sp-2)', borderRadius: 'var(--radius-full)', flex: 'none',
            }}>{r.id}</span>
            <span>{r.title}</span>
          </h2>
          {renderMarkdown(r.body, `${r.id}-`)}
        </section>
      ))}
    </>
  );
}

export function Evidence() {
  return <>{renderMarkdown(EVIDENCE.replace(/^# .*$/m, '').trim(), 'ev-')}</>;
}

/** Stated so the page cannot quietly go stale. */
export function SourceNote() {
  return (
    <p style={{
      fontFamily: 'var(--type-body-sm-family)', fontSize: 'var(--type-body-sm-size)',
      lineHeight: 'var(--type-body-sm-line)', color: 'var(--on-surface-muted)',
      maxWidth: 'var(--measure-body)', textWrap: 'pretty',
    }}>
      {RULES.length} rules, parsed from <code style={mono}>docs/10-layout.md</code> at build time.
      Nothing on this page is transcribed: edit the markdown and the page follows.
    </p>
  );
}
