/**
 * ```mermaid fences become <Mermaid>, rendered in the browser.
 *
 * WHY NOT vitepress-plugin-mermaid. That plugin exists and does this. It also
 * owns the mermaid configuration, which is the one thing worth controlling
 * here: the diagrams have to be legible in both themes and they have to look
 * like Musie rather than like mermaid's defaults. Doing the two steps by hand
 * — this file, and theme/Mermaid.ts — is about sixty lines and keeps the
 * colour mapping in one readable place.
 *
 * WHY CLIENT-SIDE. mermaid is ~3 MB and needs a DOM to measure text in. It is
 * behind a dynamic import in the component, so it is one lazy chunk that only
 * pages with a diagram ever fetch, and it never runs during prerender.
 *
 * THE CODE TRAVELS AS BASE64. A diagram is multi-line text full of quotes,
 * angle brackets and `|`, and it is being written into a Vue template
 * attribute. Base64 is the only encoding that needs no escaping rules to
 * remember and cannot be broken by a diagram that happens to contain `"`.
 */
import type MarkdownIt from 'markdown-it';

export function mermaidPlugin(md: MarkdownIt): void {
  const fallback = md.renderer.rules.fence;

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const lang = token.info.trim().split(/\s+/)[0];

    if (lang !== 'mermaid') {
      /* Not ours. markdown-it always has a default fence renderer; the
         fallback to renderToken is for the type, not for a real case. */
      return fallback
        ? fallback(tokens, idx, options, env, self)
        : self.renderToken(tokens, idx, options);
    }

    const code = Buffer.from(token.content, 'utf8').toString('base64');
    return `<Mermaid code="${code}" />\n`;
  };
}
