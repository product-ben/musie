/**
 * A markdown renderer for exactly the constructs 10-layout.md uses, and no more.
 *
 * WHY NOT A LIBRARY. The output has to be styled from Layer 1 tokens — this is
 * the design system documenting itself, and a page about the gap ladder that
 * renders its own gaps from a library's defaults would be quietly lying. A
 * generic renderer emits bare HTML and then needs a stylesheet to dress it,
 * which is a fifth stylesheet in the preview that could outrank a token.
 *
 * WHY NOT TRANSCRIBE THE RULES INTO MDX. Then the page is a copy, and copies
 * drift. The markdown file is the source of truth and is read at build time,
 * so editing the rule edits the page.
 *
 * Supported, because that is what the document contains: headings, paragraphs,
 * tables, fenced and indented code, blockquotes, bullet and ordered lists,
 * thematic breaks, and inline bold / italic / code / links. Anything else
 * falls through as text rather than being silently dropped.
 */
import * as React from 'react';

const mono: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};

/**
 * Inline: **bold**, *italic*, `code`, [text](href) — and nesting.
 *
 * CODE SPANS ARE MASKED FIRST, not matched first. The document writes
 * "**… the component's own `size` prop.**" — inline code INSIDE a bold run.
 * A single alternation that tries code before emphasis consumes the backticks
 * and leaves the surrounding `**` as literal asterisks on the page; trying
 * emphasis first breaks a code span that contains an asterisk. Masking sidesteps
 * both: the code spans are lifted out, emphasis is parsed over the holes, and
 * the code is put back as it is emitted.
 */
function Code_({ children }: { children: React.ReactNode }) {
  return (
    <code style={{ ...mono, fontSize: '0.9em', padding: '1px 4px', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--surface-sunken)' }}>
      {children}
    </code>
  );
}

const SENT = '\u0000';

export function inline(text: string, key: number | string = 0): React.ReactNode[] {
  const codes: string[] = [];
  const masked = text.replace(/`([^`]+)`/g, (_, c: string) => {
    codes.push(c);
    return `${SENT}${codes.length - 1}${SENT}`;
  });
  return parse(masked, codes, String(key));
}

/** Expand masked code spans in a plain run. */
function expand(run: string, codes: string[], key: string): React.ReactNode[] {
  if (!run.includes(SENT)) return run ? [run] : [];
  const out: React.ReactNode[] = [];
  const parts = run.split(new RegExp(`${SENT}(\\d+)${SENT}`, 'g'));
  parts.forEach((p, i) => {
    if (i % 2 === 1) out.push(<Code_ key={`${key}c${i}`}>{codes[Number(p)]}</Code_>);
    else if (p) out.push(p);
  });
  return out;
}

function parse(src: string, codes: string[], key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[\s\S]+?\*\*)|(\[[^\]]+\]\([^)]+\))|(\*[^*\n]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) out.push(...expand(src.slice(last, m.index), codes, `${key}-${i}`));
    const t = m[0];
    const k = `${key}-${i++}`;
    if (t.startsWith('**')) {
      out.push(
        <strong key={k} style={{ fontWeight: 'var(--font-weight-bold)' }}>
          {parse(t.slice(2, -2), codes, k)}
        </strong>,
      );
    } else if (t.startsWith('[')) {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(t)!;
      /* Links point at sibling markdown files in the repo, which do not exist
         as routes here. Rendered as emphasised text carrying the target, so the
         cross-reference survives without a dead link. */
      out.push(
        <span key={k} title={mm[2]} style={{ borderBottom: '1px dotted var(--border-strong)' }}>
          {expand(mm[1], codes, k)}
        </span>,
      );
    } else {
      out.push(<em key={k}>{parse(t.slice(1, -1), codes, k)}</em>);
    }
    last = m.index + t.length;
  }
  if (last < src.length) out.push(...expand(src.slice(last), codes, `${key}-end`));
  return out;
}

const P: React.CSSProperties = {
  fontFamily: 'var(--type-body-md-family)',
  fontSize: 'var(--type-body-md-size)',
  lineHeight: 'var(--type-body-md-line)',
  color: 'var(--on-surface)',
  maxWidth: 'var(--measure-body)',
  textWrap: 'pretty',
  margin: '0 0 var(--space-gap-related)',
};

function Code({ lang, body }: { lang: string; body: string }) {
  return (
    <pre
      style={{
        ...mono, fontSize: 12, lineHeight: 1.55, overflowX: 'auto',
        padding: 'var(--sp-4)', margin: '0 0 var(--space-gap-stack)',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'var(--surface-sunken)',
        border: 'var(--border-width-hairline) solid var(--border-subtle)',
        color: 'var(--on-surface)',
      }}
    >
      {lang && (
        <span style={{ display: 'block', marginBottom: 4, color: 'var(--on-surface-muted)' }}>{lang}</span>
      )}
      <code>{body}</code>
    </pre>
  );
}

/** Blocks, in document order. Returns React nodes; never drops a line. */
export function renderMarkdown(src: string, keyPrefix = ''): React.ReactNode[] {
  const lines = src.split('\n');
  const out: React.ReactNode[] = [];
  let i = 0;
  let k = 0;
  const key = () => `${keyPrefix}${k++}`;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') { i++; continue; }

    if (/^---+$/.test(line.trim())) {
      out.push(<hr key={key()} style={{ border: 0, borderTop: 'var(--border-width-hairline) solid var(--border-subtle)', margin: 'var(--space-gap-group) 0' }} />);
      i++; continue;
    }

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const step = level <= 1 ? 'display-lg' : level === 2 ? 'heading-lg' : level === 3 ? 'heading-md' : 'heading-sm';
      const Tag = `h${Math.min(level + 1, 6)}` as 'h2';
      out.push(
        <Tag key={key()} style={{
          fontFamily: `var(--type-${step}-family)`, fontSize: `var(--type-${step}-size)`,
          fontWeight: `var(--type-${step}-weight)`, lineHeight: `var(--type-${step}-line)`,
          letterSpacing: `var(--type-${step}-tracking)`, color: 'var(--on-surface)',
          margin: 'var(--space-gap-group) 0 var(--space-gap-related)',
          maxWidth: 'var(--measure-heading)', textWrap: 'balance',
        }}>{inline(h[2], k)}</Tag>,
      );
      i++; continue;
    }

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++]);
      i++;
      out.push(<Code key={key()} lang={lang} body={body.join('\n')} />);
      continue;
    }

    /* Indented code — the layer table at the top of the document. */
    if (/^ {4}\S/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && (/^ {4}/.test(lines[i]) || lines[i].trim() === '')) {
        if (lines[i].trim() === '' && !/^ {4}/.test(lines[i + 1] ?? '')) break;
        body.push(lines[i++].replace(/^ {4}/, ''));
      }
      out.push(<Code key={key()} lang="" body={body.join('\n')} />);
      continue;
    }

    if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i].split('|').slice(1, -1).map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      out.push(
        <table key={key()} style={{ borderCollapse: 'collapse', width: '100%', margin: '0 0 var(--space-gap-stack)' }}>
          <thead>
            <tr>{head.map((c, j) => (
              <th key={j} style={{
                textAlign: 'left', padding: 'var(--sp-2) var(--sp-3)',
                borderBottom: 'var(--border-width-regular) solid var(--border-strong)',
                fontFamily: 'var(--type-label-md-family)', fontSize: 'var(--type-label-md-size)',
                fontWeight: 'var(--font-weight-medium)', color: 'var(--on-surface)',
              }}>{inline(c, k)}</th>
            ))}</tr>
          </thead>
          <tbody>{body.map((r, ri) => (
            <tr key={ri} style={{ borderBottom: 'var(--border-width-hairline) solid var(--border-subtle)' }}>
              {r.map((c, j) => (
                <td key={j} style={{
                  padding: 'var(--sp-2) var(--sp-3)', verticalAlign: 'top',
                  fontFamily: 'var(--type-body-sm-family)', fontSize: 'var(--type-body-sm-size)',
                  lineHeight: 'var(--type-body-sm-line)', color: 'var(--on-surface)',
                }}>{inline(c, k)}</td>
              ))}
            </tr>
          ))}</tbody>
        </table>,
      );
      continue;
    }

    if (line.startsWith('>')) {
      const body: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) body.push(lines[i++].replace(/^>\s?/, ''));
      out.push(
        <blockquote key={key()} style={{
          margin: '0 0 var(--space-gap-stack)', padding: 'var(--sp-3) var(--sp-4)',
          borderInlineStart: 'var(--border-width-thick) solid var(--border-strong)',
          backgroundColor: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)',
        }}>{renderMarkdown(body.join('\n'), `${keyPrefix}q${k}-`)}</blockquote>,
      );
      continue;
    }

    const bullet = /^[-*]\s+/.test(line);
    const ordered = /^\d+\.\s+/.test(line);
    if (bullet || ordered) {
      const items: string[] = [];
      const re = bullet ? /^[-*]\s+/ : /^\d+\.\s+/;
      while (i < lines.length && (re.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
        if (re.test(lines[i])) items.push(lines[i].replace(re, ''));
        else items[items.length - 1] += ' ' + lines[i].trim();
        i++;
      }
      const List = (bullet ? 'ul' : 'ol') as 'ul';
      out.push(
        <List key={key()} style={{ ...P, paddingInlineStart: 'var(--sp-5)' }}>
          {items.map((it, j) => <li key={j} style={{ marginBottom: 'var(--sp-1)' }}>{inline(it, k)}</li>)}
        </List>,
      );
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length && lines[i].trim() !== '' &&
      !/^(#{1,6}\s|```|\||>|---+$|[-*]\s|\d+\.\s)/.test(lines[i]) && !/^ {4}\S/.test(lines[i])
    ) para.push(lines[i++]);
    out.push(<p key={key()} style={P}>{inline(para.join(' '), k)}</p>);
  }
  return out;
}
