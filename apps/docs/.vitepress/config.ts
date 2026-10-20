/**
 * The documentation site.
 *
 * BASE PATH. GitHub Pages serves a project site under /<repo>/, not at a
 * domain root, so every asset written as /assets/… would 404. The workflow
 * passes DOCS_BASE_PATH=/musie/; locally it is '/'. Same arrangement as
 * STORYBOOK_BASE_PATH in .storybook/main.ts, for the same reason.
 *
 * ONE SITE, TWO BUILDS. Storybook is served from /musie/storybook/ by the same
 * Pages deployment — .github/workflows/pages.yml assembles both into one
 * artifact, because a Pages deploy replaces the whole site and two workflows
 * uploading separately would take turns clobbering each other.
 *
 * DEAD LINKS FAIL THE BUILD. Deliberately left at the default. Links to files
 * in the repository therefore point at github.com rather than at a relative
 * path: a published page is read in a browser, where ../../CLAUDE.md is not a
 * thing a reader can open.
 */
import { defineConfig } from 'vitepress';
import { audiencePlugin } from './markdown/audience';
import { mermaidPlugin } from './markdown/mermaid';

/** Resolve the audience before the first paint. See theme/audience.ts. */
const AUDIENCE_INIT = `(function(){try{
var k='musie-docs-audience',a=null,
m=/[?&]for=(devs|designers)/.exec(location.search);
if(m){a=m[1]}
if(!a){try{a=localStorage.getItem(k)}catch(e){}}
if(a!=='devs'&&a!=='designers'){a='designers'}
document.documentElement.setAttribute('data-audience',a);
try{localStorage.setItem(k,a)}catch(e){}
}catch(e){document.documentElement.setAttribute('data-audience','designers')}})();`;

const STORYBOOK = 'https://product-ben.github.io/musie/storybook/';

export default defineConfig({
  title: 'Musie',
  description: 'How Musie is built — for developers and for designers.',
  base: process.env.DOCS_BASE_PATH ?? '/',
  lang: 'en',
  cleanUrls: true,
  lastUpdated: true,
  sitemap: { hostname: 'https://product-ben.github.io/musie/' },

  head: [
    ['script', {}, AUDIENCE_INIT],
    ['meta', { name: 'theme-color', content: '#2B5340' }],
    ['meta', { name: 'color-scheme', content: 'light dark' }],
  ],

  markdown: {
    config(md) {
      md.use(audiencePlugin);
      mermaidPlugin(md);
    },
  },

  themeConfig: {
    search: { provider: 'local' },

    nav: [
      { text: 'Start', link: '/start/get-started' },
      { text: 'Product', link: '/product/' },
      { text: 'Architecture', link: '/architecture/' },
      { text: 'Design', link: '/design/' },
      { text: 'Features', link: '/features/' },
      { text: 'Working here', link: '/work/decisions' },
      { text: 'Storybook', link: STORYBOOK, target: '_blank' },
    ],

    sidebar: [
      {
        text: 'Start',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Get started', link: '/start/get-started' },
          { text: 'How to read these docs', link: '/start/how-to-read' },
          { text: 'Repo map', link: '/start/repo-map' },
          { text: 'Glossary', link: '/start/glossary' },
        ],
      },
      {
        text: 'Product',
        collapsed: false,
        items: [
          { text: 'What Musie is', link: '/product/' },
          { text: 'The user journey', link: '/product/journey' },
          { text: 'Content and copy', link: '/product/content' },
        ],
      },
      {
        text: 'Architecture',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/architecture/' },
          { text: 'Data model', link: '/architecture/data-model' },
          { text: 'Auth', link: '/architecture/auth' },
          { text: 'Security', link: '/architecture/security' },
          { text: 'Testing', link: '/architecture/testing' },
          { text: 'CI/CD and deployment', link: '/architecture/ci-cd' },
          { text: 'Local stack and worktrees', link: '/architecture/local-stack' },
        ],
      },
      {
        text: 'Design',
        collapsed: false,
        items: [
          { text: 'The design system', link: '/design/' },
          { text: 'Tokens', link: '/design/tokens' },
          { text: 'Layout (Layer 3)', link: '/design/layout' },
          { text: 'Accessibility', link: '/design/accessibility' },
        ],
      },
      {
        text: 'Features',
        collapsed: false,
        items: [
          { text: 'All of them, at a glance', link: '/features/' },
          { text: 'Entry: where / goes', link: '/features/entry' },
          { text: 'About Musie', link: '/features/about-musie' },
          { text: 'About you', link: '/features/about-you' },
          { text: 'The exercise library', link: '/features/exercises' },
          { text: 'A session', link: '/features/session' },
          { text: 'Scanning a card', link: '/features/scan' },
          { text: 'Listening', link: '/features/listen' },
          { text: 'Reflecting', link: '/features/reflect' },
          { text: 'Voice capture', link: '/features/voice' },
          { text: 'The diary', link: '/features/diary' },
          { text: 'Discovered music', link: '/features/discovered-music' },
          { text: 'The insight map', link: '/features/insight-map' },
          { text: 'Goals', link: '/features/goals' },
          { text: 'The nav drawer', link: '/features/nav-drawer' },
          { text: 'Signing in', link: '/features/sign-in' },
          { text: 'The closed beta', link: '/features/beta' },
          { text: 'Two languages', link: '/features/i18n' },
          { text: 'Light and dark', link: '/features/theming' },
          { text: 'The paper deck', link: '/features/deck-pipeline' },
          { text: 'The music pipeline', link: '/features/music-pipeline' },
          { text: 'Dev tools', link: '/features/dev-tools' },
        ],
      },
      {
        text: 'Working here',
        collapsed: false,
        items: [
          { text: 'Decisions', link: '/work/decisions' },
          { text: 'Agent guidelines', link: '/work/agent-guidelines' },
          { text: 'Open questions', link: '/work/open-questions' },
          { text: 'Backlog', link: '/work/backlog' },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/product-ben/musie' }],

    outline: { level: [2, 3] },

    editLink: {
      pattern: 'https://github.com/product-ben/musie/edit/main/apps/docs/:path',
      text: 'Edit this page on GitHub',
    },

    docFooter: { prev: 'Previous', next: 'Next' },

    lastUpdatedText: 'Last updated',

    /* The two legal links live in the footer MESSAGE rather than in `nav`,
       because they are not documentation: this site is published at
       product-ben.github.io/musie/ and a public website needs an Impressum
       reachable from every page of it, which a footer is and a nav entry
       between *Design* and *Features* is not. Absolute URLs, because the
       pages themselves are served by the app at musie.org — this site has no
       copy of them, and two copies of a legal text is one too many.
       LEGAL-PAGES.md §5.3. */
    footer: {
      message:
        'Musie — a mindfulness app whose active ingredient is music, and whose front door is paper. '
        + '<a href="https://musie.org/impressum">Impressum</a> · '
        + '<a href="https://musie.org/privacy">Privacy</a>',
      copyright: 'Documentation generated from the repository it documents.',
    },
  },
});
