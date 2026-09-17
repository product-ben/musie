/**
 * Shared story decorators. Groundwork — written once, used by every story file.
 *
 * WHY A DECORATOR AND NOT A TOOLBAR SWITCH. Both themes have to be visible at
 * once. Every themed token resolves through light-dark(), and the two halves
 * are solved independently — --surface-raised takes sand-1 in light and sand-4
 * in dark — so a reviewer comparing them has to see them side by side, not one
 * after a click. Tokens are declared on `:root, [data-theme]`, which is what
 * makes a nested pane re-resolve rather than inherit.
 */
import * as React from 'react';
import type { Decorator } from '@storybook/react-vite';

const THEMES = ['light', 'dark'] as const;

const paneLabel: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 11,
  color: 'var(--on-surface-muted)',
  marginBlockEnd: 'var(--sp-3)',
};

function Pane({ theme, children, width }: {
  theme: string; children: React.ReactNode; width?: number;
}) {
  return (
    <div
      data-theme={theme}
      style={{
        padding: 'var(--space-inset-card)',
        borderRadius: 'var(--radius-panel)',
        backgroundColor: 'var(--surface)',
        color: 'var(--on-surface)',
        border: 'var(--border-width-hairline) solid var(--border-subtle)',
        inlineSize: width,
        flex: width ? '0 0 auto' : '1 1 320px',
        minInlineSize: 0,
      }}
    >
      <div style={paneLabel}>data-theme=&quot;{theme}&quot;</div>
      {children}
    </div>
  );
}

/**
 * THE DEFAULT. Renders the story once per theme, side by side.
 * Use this unless the component is container-query driven.
 */
export const bothThemes: Decorator = (Story) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-gap-group)' }}>
    {THEMES.map((theme) => (
      <Pane key={theme} theme={theme}><Story /></Pane>
    ))}
  </div>
);

/**
 * For components whose layout answers to their CONTAINER's inline size rather
 * than the viewport — RadioCards caps its grid with an auto-fit rule and
 * switches its card anatomy at a @container query on `musy-rcard-group`.
 * Inside a full-width docs canvas such a story renders a desktop grid and
 * quietly misreports its own column count.
 *
 * 393px is Layer 1's phone reference; 834px is the tablet one.
 */
export const fixedWidth = (px: number): Decorator => (Story) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-gap-group)' }}>
    {THEMES.map((theme) => (
      <Pane key={theme} theme={theme} width={px}>
        <div style={{ ...paneLabel, marginBlockEnd: 'var(--sp-2)' }}>container {px}px</div>
        <Story />
      </Pane>
    ))}
  </div>
);

/**
 * A single light pane. Only for a story that is ABOUT the theme mechanism, or
 * one whose duplicate would be misleading (a portalled popup renders once, at
 * the document root, so two panes would fight over one popup).
 */
export const singlePane: Decorator = (Story) => (
  <div style={{ display: 'flex' }}>
    <Pane theme="light"><Story /></Pane>
  </div>
);

/** A labelled row of variants inside one story. Presentation only. */
export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBlockEnd: 'var(--space-gap-stack)' }}>
      <div style={paneLabel}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-gap-related)', alignItems: 'center' }}>
        {children}
      </div>
    </div>
  );
}

/** A vertical stack of labelled examples. Presentation only. */
export function Stack({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-gap-stack)' }}>
      {children}
    </div>
  );
}
