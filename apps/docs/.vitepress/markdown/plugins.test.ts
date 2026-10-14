/**
 * The two markdown transforms, tested as the pure things they are.
 *
 * These are not decorative tests. The audience containers are the whole
 * mechanism of this site: if `::: devs` silently stops compiling to a
 * `.aud--devs` wrapper, every page shows both halves at once and nothing else
 * in the build fails. `pnpm check` runs this.
 */
import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { audiencePlugin } from './audience';
import { mermaidPlugin } from './mermaid';

function render(source: string): string {
  const md = new MarkdownIt();
  md.use(audiencePlugin);
  mermaidPlugin(md);
  return md.render(source);
}

describe('audiencePlugin', () => {
  it('wraps a devs block so the CSS can find it', () => {
    const html = render('::: devs\nRun `pnpm check`.\n:::');
    expect(html).toContain('class="aud aud--devs"');
    expect(html).toContain('data-aud="devs"');
    expect(html).toContain('data-aud-label="For devs"');
    expect(html).toContain('<code>pnpm check</code>');
  });

  it('wraps a designers block', () => {
    const html = render('::: designers\nThe card is the entry.\n:::');
    expect(html).toContain('class="aud aud--designers"');
    expect(html).toContain('data-aud-label="For designers"');
  });

  it('leaves content outside a block unwrapped, because that is the shared half', () => {
    const html = render('Shared.\n\n::: devs\nNot shared.\n:::');
    expect(html.indexOf('<p>Shared.</p>')).toBeLessThan(html.indexOf('aud--devs'));
    expect(html).toContain('<p>Shared.</p>');
  });

  it('does not invent a block for an unknown name', () => {
    const html = render('::: marketers\nnope\n:::');
    expect(html).not.toContain('class="aud');
  });
});

describe('mermaidPlugin', () => {
  it('turns a mermaid fence into a component with the source as base64', () => {
    const html = render('```mermaid\ngraph TD\n  A --> B\n```');
    expect(html).toContain('<Mermaid code="');
    const encoded = /<Mermaid code="([^"]+)"/.exec(html)?.[1] ?? '';
    expect(Buffer.from(encoded, 'base64').toString('utf8')).toBe('graph TD\n  A --> B\n');
  });

  it('survives a diagram containing the quote that would break an attribute', () => {
    const html = render('```mermaid\ngraph TD\n  A["a \\"quoted\\" label"] --> B\n```');
    expect(html).toMatch(/^<Mermaid code="[A-Za-z0-9+/=]+" \/>/);
  });

  it('leaves every other fence to the default renderer', () => {
    const html = render('```ts\nconst a = 1;\n```');
    expect(html).toContain('<pre>');
    expect(html).not.toContain('<Mermaid');
  });
});
