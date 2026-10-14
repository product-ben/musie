/**
 * The audience containers: `::: devs` and `::: designers`.
 *
 * Every page carries both halves in full. Which one a reader sees is decided
 * by `data-audience` on <html>, set pre-paint by the inline script in
 * config.ts and switched at runtime by the toggle. The CSS in
 * theme/style.css is the whole of the hiding — see WHY CSS AND NOT v-if.
 *
 * WHY CSS AND NOT v-if. Three reasons, and the third decides it.
 *   1. No flash. The inline head script sets the attribute before the first
 *      paint, the same trick the app uses for `data-theme` and for
 *      `<html lang>` (CLAUDE.md rule 5). A Vue conditional cannot run that
 *      early, so the wrong half would paint first.
 *   2. Both halves stay in the DOM, so the browser's own Find-in-page and
 *      VitePress's local search index reach text in the half you are not
 *      reading. A reader searching for `reveal-track` finds it whichever tab
 *      they are on.
 *   3. With JavaScript off, nothing is hidden and the page reads as both
 *      halves end to end. That is the correct degradation for documentation,
 *      and it is what a crawler sees.
 *
 * The cost is stated so it is not discovered: the right-hand outline is built
 * from the markdown at build time and lists the headings of BOTH halves.
 * theme/outline.ts hides the ones whose heading is inside a hidden block.
 */
import container from 'markdown-it-container';
import type MarkdownIt from 'markdown-it';

export const AUDIENCES = ['devs', 'designers'] as const;

export type Audience = (typeof AUDIENCES)[number];

/** What the toggle, and the chip at the top of each block, call each one. */
export const AUDIENCE_LABEL: Record<Audience, string> = {
  devs: 'For devs',
  designers: 'For designers',
};

/**
 * The audience a first-time reader lands on. Designers, on Ben's call: the
 * designer half explains the product, which reads better for anyone new to
 * Musie — including a developer on day one. One click changes it and the
 * choice is remembered.
 */
export const DEFAULT_AUDIENCE: Audience = 'designers';

export function audiencePlugin(md: MarkdownIt): void {
  for (const audience of AUDIENCES) {
    md.use(container, audience, {
      render(tokens: { nesting: number }[], idx: number) {
        if (tokens[idx].nesting === 1) {
          return (
            `<div class="aud aud--${audience}" data-aud="${audience}"` +
            ` data-aud-label="${AUDIENCE_LABEL[audience]}">\n`
          );
        }
        return '</div>\n';
      },
    });
  }
}
