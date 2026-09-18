import type { Preview } from '@storybook/react-vite';

/**
 * ORDER IS LOAD-BEARING. ESM evaluates imports in source order, so these four
 * statements ARE the cascade. Reordering them is not a style question.
 *
 *   1 musy-fonts.css                   @font-face for Space Grotesk + Inter.
 *                                      Omit it and every token still resolves,
 *                                      but everything renders in a system
 *                                      fallback — the failure looks like a
 *                                      design problem, not a missing import.
 *   2 musy-foundations.css             The token system. [LOCKED].
 *   3 musy-foundations-amendments.css  Token gaps G1 (--icon-stroke-sm) and
 *                                      G2 (--border-style-dashed). Components
 *                                      reference both, and only this file
 *                                      defines them.
 *   4 musy-components.css              Layer 2. Consumes 2 and 3.
 *
 * WHAT IS NOT HERE: theme-init. It must run before the stylesheets above, and
 * an import cannot — imports are deferred. It is inlined in preview-head.html,
 * which is also where <html lang> is set. See that file.
 */
import '../tokens/musy-fonts.css';
import '../tokens/musy-foundations.css';
import '../tokens/musy-foundations-amendments.css';
import '../src/musy-components.css';

const preview: Preview = {
  /* A component gets a Docs page only when it is tagged `autodocs`. Without
     this, every `parameters.docs.description.component` written into the story
     files — which is where each component's purpose, its prop rationale and its
     "Build notes" review block live — renders nowhere at all: the sidebar shows
     the stories and nothing else. Set globally rather than repeated in 26 metas. */
  tags: ['autodocs'],
  parameters: {
    /* Storybook's own background switcher is off: the canvas is painted from
       --surface / --on-surface in preview-head.html, so it follows data-theme
       instead of a hardcoded swatch list. A story is never judged against a
       background the app cannot produce. */
    backgrounds: { disable: true },
  },
};

export default preview;
