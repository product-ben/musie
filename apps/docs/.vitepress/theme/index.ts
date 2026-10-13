/**
 * The theme: VitePress's default, plus the audience toggle and mermaid.
 *
 * `extends: DefaultTheme` rather than a fork. Everything this site needs from
 * a docs theme — sidebar, outline, offline search, dark mode, mobile nav — is
 * already there and will keep working through upgrades. What is added is the
 * one thing it has no concept of: two readers for every page.
 */
import type { Theme } from 'vitepress';
import { useRoute } from 'vitepress';
/* `theme-without-fonts`, not `theme`: the default theme bundles and PRELOADS
   Inter. This site renders in Onest and Literata (below), so Inter was 14
   woff2 files shipped for nothing with one of them preloaded ahead of the
   faces actually in use. Everything else about the theme is identical. */
import DefaultTheme from 'vitepress/theme-without-fonts';
import { defineComponent, h, nextTick, onMounted, watch } from 'vue';
import AudienceToggle from './AudienceToggle';
import Mermaid from './Mermaid';
import { audience, initAudience } from './audience';
import { syncOutline } from './outline';

/* The real fonts, self-hosted, from the design system itself — so the docs
   render in Onest and Literata and still make no request off this origin
   (packages/design-system/tokens/musy-fonts.css says why that matters). */
import '@musie/design-system/tokens/musy-fonts.css';
import './style.css';

const Layout = defineComponent({
  name: 'MusieDocsLayout',
  setup() {
    const route = useRoute();

    onMounted(() => {
      initAudience();
      void nextTick(syncOutline);
    });

    /* Both triggers: a new page brings a new outline, and a toggle changes
       which half of the current one is real. */
    watch([() => route.path, audience], () => {
      void nextTick(syncOutline);
    });

    return () =>
      h(DefaultTheme.Layout, null, {
        'nav-bar-content-after': () => h(AudienceToggle, { variant: 'nav' }),
        'doc-before': () => h(AudienceToggle, { variant: 'doc' }),
        /* The home page uses a different layout, where `doc-before` never
           renders — without this the toggle is missing on a phone. */
        'home-hero-actions-after': () => h(AudienceToggle, { variant: 'doc' }),
      });
  },
});

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('Mermaid', Mermaid);
  },
} satisfies Theme;
