import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Musy design system — Storybook 9, React + Vite builder.
 *
 * NO ADDONS, deliberately. Nothing here is required to render a component, and
 * every addon is another thing that can inject its own CSS into the preview
 * iframe and quietly outrank a token.
 *
 * staticDirs maps ../assets to /assets because Logo's default src is the
 * ROOT-ABSOLUTE path '/assets/web/musy-logo.png' (Logo.tsx). Without this the
 * mark 404s in every story that renders one — including stories that only use
 * Logo indirectly. Mapped even though the one story here is Badge, because the
 * failure is silent and shows up as a broken image long after anyone
 * remembers why.
 */
const config: StorybookConfig = {
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  stories: [
    '../stories/**/*.mdx',
    '../src/**/*.stories.tsx',
  ],
  /* addon-docs ONLY, and it is not a preference: Storybook 9 cannot compile an
     .mdx file without it. No other addon is installed — each one injects CSS
     into the preview iframe and can quietly outrank a token. */
  addons: ['@storybook/addon-docs'],
  staticDirs: [
    { from: '../assets', to: '/assets' },
    /* The Typography page renders real type at 393/834/1440px inside iframes,
       because clamp() resolves against the VIEWPORT — a scaled div would show
       this page's size, not the breakpoint's. Those frames need to <link> the
       token stylesheets, so tokens/ is served as well. */
    { from: '../tokens', to: '/foundations-tokens' },
  ],
};

export default config;
