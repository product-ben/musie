/**
 * Local presentational helpers for the foundations pages.
 *
 * NOTHING HERE IMPORTS FROM ../../src. Foundations must prove themselves with
 * the token layer alone: if a page needed a Layer 2 component to render, it
 * would be documenting the component rather than the token. These are plain
 * elements with inline styles, and every value they use is a token.
 *
 * Inline styles rather than a stylesheet, deliberately: a fifth stylesheet in
 * the preview could outrank a token and make a page lie about its own subject.
 */
import * as React from 'react';
import { THEMES, type Theme, tokensReady } from './probe';

/** Run a DOM probe once the stylesheets have applied. Returns undefined until
 *  then, so pages render an honest "measuring…" rather than a wall of nulls. */
export function useProbe<T>(fn: () => T): T | undefined {
  const [value, setValue] = React.useState<T>();
  /* The probe runs ONCE, on mount. Callers pass an inline arrow, so `fn` has a
     new identity every render; holding it in a ref keeps the effect's dep list
     honestly empty instead of re-probing several hundred elements per render. */
  const fnRef = React.useRef(fn);
  fnRef.current = fn;
  React.useEffect(() => {
    let alive = true;
    void tokensReady().then(() => { if (alive) setValue(() => fnRef.current()); });
    return () => { alive = false; };
  }, []);
  return value;
}

export const mono: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '12px',
};

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%', margin: 'var(--sp-4) 0' }}>
      <thead>
        <tr>
          {head.map((h) => (
            <th
              key={h}
              style={{
                textAlign: 'left',
                padding: 'var(--sp-2) var(--sp-3)',
                borderBottom: 'var(--border-width-regular) solid var(--border-strong)',
                fontFamily: 'var(--type-label-md-family)',
                fontSize: 'var(--type-label-md-size)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--on-surface)',
                whiteSpace: 'nowrap',
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return (
    <tr style={{ borderBottom: 'var(--border-width-hairline) solid var(--border-subtle)' }}>
      {children}
    </tr>
  );
}

export function Cell({
  children, code = false, muted = false, nowrap = false, align = 'left',
}: {
  children?: React.ReactNode; code?: boolean; muted?: boolean;
  nowrap?: boolean; align?: 'left' | 'right';
}) {
  return (
    <td
      style={{
        padding: 'var(--sp-2) var(--sp-3)',
        verticalAlign: 'top',
        textAlign: align,
        whiteSpace: nowrap ? 'nowrap' : undefined,
        color: muted ? 'var(--on-surface-muted)' : 'var(--on-surface)',
        fontFamily: code ? mono.fontFamily : 'var(--type-body-sm-family)',
        fontSize: code ? mono.fontSize : 'var(--type-body-sm-size)',
        lineHeight: 'var(--type-body-sm-line)',
      }}
    >
      {children}
    </td>
  );
}

/** A colour chip. Chequerboard behind it, so a transparent token reads as
 *  transparent rather than as "the same as the page". */
export function Chip({ hex, size = 40 }: { hex: string | null; size?: number }) {
  return (
    <span
      title={hex ?? 'transparent'}
      style={{
        display: 'inline-block',
        inlineSize: size,
        blockSize: size,
        borderRadius: 'var(--radius-xs)',
        border: 'var(--border-width-hairline) solid var(--border-subtle)',
        backgroundColor: hex ?? undefined,
        backgroundImage: hex
          ? undefined
          : 'linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%)',
        backgroundSize: hex ? undefined : '8px 8px',
        backgroundPosition: hex ? undefined : '0 0, 4px 4px',
      }}
    />
  );
}

/** Two panes, one per theme, each a real [data-theme] subtree so everything
 *  inside resolves through that theme rather than being faked with hex. */
export function ThemePanes({
  children,
}: {
  children: (theme: Theme) => React.ReactNode;
}) {
  return (
    <div style={{ display: 'grid', gap: 'var(--sp-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
      {THEMES.map((theme) => (
        <div
          key={theme}
          data-theme={theme}
          style={{
            padding: 'var(--sp-4)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--surface)',
            color: 'var(--on-surface)',
            border: 'var(--border-width-hairline) solid var(--border-subtle)',
          }}
        >
          <div style={{ ...mono, marginBottom: 'var(--sp-3)', color: 'var(--on-surface-muted)' }}>
            data-theme="{theme}"
          </div>
          {children(theme)}
        </div>
      ))}
    </div>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: 'var(--type-body-sm-family)',
        fontSize: 'var(--type-body-sm-size)',
        lineHeight: 'var(--type-body-sm-line)',
        color: 'var(--on-surface-muted)',
        maxWidth: 'var(--measure-body)',
        textWrap: 'pretty',
      }}
    >
      {children}
    </p>
  );
}

export function Measuring() {
  return <Note>measuring…</Note>;
}
