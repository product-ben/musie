/**
 * One diagram. The code arrives base64-encoded from markdown/mermaid.ts.
 *
 * Re-renders when the theme flips, because mermaid bakes its colours into the
 * SVG it returns — there is no CSS-variable path through it, so dark mode is a
 * second render and not a restyle.
 */
import { defineComponent, h, onMounted, ref, watch } from 'vue';
import { useData } from 'vitepress';

/* Musie's own palette, read off packages/design-system/tokens/musy-foundations.css.
   Hard-coded rather than read from the token file because mermaid needs
   concrete colours at render time and the tokens resolve through light-dark(),
   which only a browser can collapse. Kept to the same six roles in both
   themes so a diagram cannot look right in one and wrong in the other. */
const LIGHT = {
  background: 'transparent',
  primaryColor: '#E9EFE9', // green-2   — node fill
  primaryBorderColor: '#678271', // green-edge
  primaryTextColor: '#16281D', // green-12
  secondaryColor: '#F9EDE5', // terracotta-2 — the second kind of node
  secondaryBorderColor: '#B5704F', // terracotta-edge
  secondaryTextColor: '#4A2718', // terracotta-12
  tertiaryColor: '#F3EEE4', // sand-2  — clusters, notes
  tertiaryBorderColor: '#6E7068', // sand-edge
  tertiaryTextColor: '#1A1F1C', // sand-12
  lineColor: '#6E7068', // sand-edge
  textColor: '#1A1F1C',
};

const DARK = {
  background: 'transparent',
  primaryColor: '#16281E',
  primaryBorderColor: '#6B8F79',
  primaryTextColor: '#D8E8DF',
  secondaryColor: '#2F1F16',
  secondaryBorderColor: '#A2694B',
  secondaryTextColor: '#F6DACB',
  tertiaryColor: '#222723',
  tertiaryBorderColor: '#7F867F',
  tertiaryTextColor: '#EDF0EC',
  lineColor: '#7F867F',
  textColor: '#EDF0EC',
};

/** base64 → text, via bytes. `atob` alone mangles anything non-ASCII, and the
    diagrams carry German labels. */
function decode(encoded: string): string {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

let seq = 0;

export default defineComponent({
  name: 'Mermaid',
  props: {
    code: { type: String, required: true },
  },
  setup(props) {
    const svg = ref('');
    const error = ref('');
    const { isDark } = useData();

    async function render(): Promise<void> {
      try {
        /* Lazy, and the only reason mermaid is not in the main bundle. */
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          themeVariables: {
            ...(isDark.value ? DARK : LIGHT),
            fontFamily: 'Onest, ui-sans-serif, system-ui, sans-serif',
            fontSize: '15px',
          },
          flowchart: { htmlLabels: true, curve: 'basis', useMaxWidth: true },
          sequence: { useMaxWidth: true },
          er: { useMaxWidth: true },
        });
        const { svg: out } = await mermaid.render(`mmd-${++seq}`, decode(props.code));
        svg.value = out;
        error.value = '';
      } catch (cause) {
        /* A diagram that will not parse must say so on the page. Silently
           rendering nothing is how a broken diagram survives a review. */
        error.value = cause instanceof Error ? cause.message : String(cause);
        svg.value = '';
      }
    }

    onMounted(render);
    watch(isDark, render);

    return () =>
      h('figure', { class: 'mermaid-figure' }, [
        error.value
          ? h('pre', { class: 'mermaid-error' }, `Diagram failed to render:\n${error.value}`)
          : h('div', { class: 'mermaid-svg', innerHTML: svg.value }),
      ]);
  },
});
