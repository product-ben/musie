import * as React from 'react';
import {
  byState, count, examplesOf, familyBorders,
  dashedOnControl, focusWidthAsBorder, rawPaletteBorders, subtleOnRestingControl,
  type BorderUse,
} from '../_lib/borders';
import { Cell, Note, Row, Table, mono } from '../_lib/ui';

/** A live demo of one border recipe, drawn with the tokens it names. */
function Sample({ colour, width, style = '--border-style-solid', children }: {
  colour: string; width: string; style?: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      padding: 'var(--sp-3) var(--sp-4)',
      borderRadius: 'var(--radius-sm)',
      border: `var(${width}) var(${style}) var(${colour})`,
      backgroundColor: 'var(--surface-raised)',
      fontFamily: 'var(--type-body-sm-family)',
      fontSize: 'var(--type-body-sm-size)',
      color: 'var(--on-surface)',
      minInlineSize: 180,
    }}>{children}</div>
  );
}

export function Recipes() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-4)', margin: 'var(--sp-4) 0' }}>
      <Sample colour="--border-subtle" width="--border-width-hairline">Container · divider</Sample>
      <Sample colour="--border-strong" width="--border-width-regular">Control at rest</Sample>
      <Sample colour="--interactive-primary-border" width="--border-width-thick">Selected · current</Sample>
      <Sample colour="--feedback-error-border" width="--border-width-thick">Invalid</Sample>
      <Sample colour="--border-subtle" width="--border-width-regular" style="--border-style-dashed">Awaiting content</Sample>
      <Sample colour="--border-subtle" width="--border-width-regular">Disabled</Sample>
    </div>
  );
}

const RULES: Array<{ q: string; answer: string; token: string; why: string }> = [
  {
    q: 'Is it an interactive boundary, at rest?',
    answer: 'Colour --border-strong, width --border-width-regular',
    token: '--border-strong',
    why: 'The only neutral border allowed to carry a control boundary — solved to ≥3:1 (1.4.11). 1.5px rather than 1px so it clears that ratio without reading heavy.',
  },
  {
    q: '…and the control is in an accent or feedback family?',
    answer: 'The family\'s own -border token, same width',
    token: '--interactive-primary-border',
    why: 'Each family carries a solved boundary. Never swap the hue on --border-strong: ocher and purple are light solids and terracotta is a dark one, so the -on foreground travels with it.',
  },
  {
    q: 'Is it selected, current, invalid, valid or live?',
    answer: 'Step the width to --border-width-thick',
    token: '--border-width-thick',
    why: 'A width step is the non-colour cue (1.4.1). Strip the hue and the state still reads. The colour changes too, but the width is what survives greyscale and forced colours.',
  },
  {
    q: 'Is it a divider, or the edge of something you cannot press?',
    answer: 'Colour --border-subtle, width --border-width-hairline',
    token: '--border-subtle',
    why: 'Dividers and decorative outlines only. Never permitted on an interactive boundary — it does not clear 3:1, so a control wearing it fails 1.4.11.',
  },
  {
    q: 'Is the control disabled?',
    answer: 'Drop the colour to --border-subtle, keep the width',
    token: '--border-subtle',
    why: 'The sanctioned exception to the rule above: a disabled control is exempt from 1.4.11, and dropping the boundary is what makes it read as unavailable. The width does not change, so nothing moves.',
  },
  {
    q: 'Is the box waiting for content it does not have yet?',
    answer: '--border-style-dashed with --border-subtle',
    token: '--border-style-dashed',
    why: 'Dashed reads as provisional / awaiting content / placeholder. Never on an interactive boundary: dashing reduces the perceived stroke and would undercut the ratio the solid edge was solved for.',
  },
  {
    q: 'Is it the focus indicator?',
    answer: 'Not a border at all — outline: var(--focus-ring)',
    token: '--border-width-focus',
    why: 'A border participates in layout, so drawing focus with one shifts the page as you tab. --border-width-focus feeds --focus-ring, which is an outline with an offset. Used as a border zero times.',
  },
];

export function RuleTable() {
  return (
    <Table head={['If…', 'Then', 'Uses in components', 'Why']}>
      {RULES.map((r) => (
        <Row key={r.q}>
          <Cell>{r.q}</Cell>
          <Cell code>{r.answer}</Cell>
          <Cell code align="right">{count(r.token)}</Cell>
          <Cell muted>{r.why}</Cell>
        </Row>
      ))}
    </Table>
  );
}

function Uses({ list }: { list: BorderUse[] }) {
  return (
    <>{list.map((u, i) => (
      <div key={i} style={{ ...mono, color: 'var(--on-surface-muted)' }}>
        {u.selector.length > 62 ? `${u.selector.slice(0, 62)}…` : u.selector}
      </div>
    ))}</>
  );
}

/** Counted from musy-components.css, so the rules stay answerable to the code. */
export function Evidence() {
  const tokens = ['--border-strong', '--border-subtle', '--border-width-regular',
    '--border-width-thick', '--border-width-hairline', '--border-style-dashed',
    '--border-width-focus'];
  return (
    <>
      <Table head={['Token', 'Uses', 'By state', 'Example selectors']}>
        {tokens.map((t) => (
          <Row key={t}>
            <Cell code nowrap>{t}</Cell>
            <Cell code align="right">{count(t)}</Cell>
            <Cell code muted>{byState(t).map(([s, n]) => `${s} ${n}`).join(' · ') || '—'}</Cell>
            <Cell><Uses list={examplesOf(t)} /></Cell>
          </Row>
        ))}
      </Table>
      <h3 style={{ fontFamily: 'var(--type-heading-sm-family)', fontSize: 'var(--type-heading-sm-size)' }}>
        Family boundaries
      </h3>
      <Note>
        A control in an accent or feedback family takes that family&apos;s own solved
        boundary rather than a tinted <code style={mono}>--border-strong</code>.
      </Note>
      <Table head={['Token', 'Uses']}>
        {familyBorders().map(([t, n]) => (
          <Row key={t}><Cell code nowrap>{t}</Cell><Cell code align="right">{n}</Cell></Row>
        ))}
      </Table>
    </>
  );
}

const CHECKS: Array<{ label: string; run: () => BorderUse[]; note: string }> = [
  { label: 'No raw palette step used as a border colour', run: rawPaletteBorders,
    note: 'Layer 1\'s scales are never consumed directly — Layer 2 is the API.' },
  { label: 'Dashed is never on a control boundary', run: dashedOnControl,
    note: 'Dashing reduces the perceived stroke below the ratio the solid edge was solved for.' },
  { label: '--border-width-focus is never used as a border', run: focusWidthAsBorder,
    note: 'The focus indicator is an outline; a border would shift layout on focus.' },
  { label: '--border-subtle is never on a resting control boundary', run: subtleOnRestingControl,
    note: 'Subtle does not clear 3:1. The disabled state is the one sanctioned exception.' },
];

export function Checks() {
  return (
    <Table head={['Rule', 'Result', 'Where', 'Note']}>
      {CHECKS.map((c) => {
        const bad = c.run();
        return (
          <Row key={c.label}>
            <Cell>{c.label}</Cell>
            <Cell>
              <span style={{
                ...mono, fontWeight: 'var(--font-weight-medium)',
                color: bad.length ? 'var(--feedback-error-text)' : 'var(--feedback-success-text)',
              }}>{bad.length ? `${bad.length} ✗` : 'holds ✓'}</span>
            </Cell>
            <Cell>{bad.length ? <Uses list={bad} /> : <span style={{ ...mono, color: 'var(--on-surface-muted)' }}>—</span>}</Cell>
            <Cell muted>{c.note}</Cell>
          </Row>
        );
      })}
    </Table>
  );
}
