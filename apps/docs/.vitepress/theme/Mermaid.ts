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
  darkMode: false,
  background: '#F3EEE4', // sand-2 — mermaid derives contrasts from this
  edgeLabelBackground: '#F3EEE4',
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
  darkMode: true,
  background: '#191D1A',
  edgeLabelBackground: '#191D1A',
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

/**
 * Render the diagram at the size it was laid out for.
 *
 * `useMaxWidth: false` is not enough on its own. Mermaid draws into a
 * `viewBox` and then sets the element's width — so an ER diagram laid out at
 * 1200px, handed a 624px element, is SCALED: the geometry is right and the
 * type comes out at five pixels. Measured on the data-model page, which is
 * why this exists.
 *
 * So the width and height are taken back from the `viewBox`, which is the
 * layout's own coordinate space, and mermaid's inline `max-width` is removed.
 * What that buys is a correct INTRINSIC size: the stylesheet's
 * `max-width: 100%; height: auto` then scales a wide diagram with its aspect
 * ratio intact, and a diagram narrower than the column renders at 1:1 instead
 * of being stretched.
 *
 * It writes no inline `style` of its own. It did, briefly, and an inline
 * `max-width: none` beats a stylesheet — which is how six diagrams ended up
 * scrolling after a change meant to stop them scrolling.
 */
function fitToViewBox(svg: string): string {
  const open = /<svg\b[^>]*>/.exec(svg);
  if (!open) return svg;

  const box = /viewBox="([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)"/.exec(open[0]);
  if (!box) return svg;

  const width = Math.ceil(Number(box[3]));
  const height = Math.ceil(Number(box[4]));
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0) return svg;

  const fixed = open[0]
    .replace(/\swidth="[^"]*"/, '')
    .replace(/\sheight="[^"]*"/, '')
    .replace(/\sstyle="[^"]*"/, '')
    .replace(/<svg\b/, `<svg width="${width}" height="${height}"`);

  return svg.replace(open[0], fixed);
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

    /** One retry, then the error. See `render` below for why. */
    async function draw(): Promise<void> {
      /* ── WAIT FOR THE FONT. This is not politeness, it is correctness ──
         Mermaid sizes every box and every table column by MEASURING its
         label, once, at render time. Onest is a webfont, so a render that
         happens first measures the fallback — which is narrower — and the
         real face then overflows the box it was given.

         What that looks like: `uuid` drawn as `uuic`, `RESTRICT` as
         `RESTRIC`, every cell in the ER diagram clipped by a character or
         two. Measured on the data-model page; the geometry was right and
         every label was a few pixels too wide for it.

         `document.fonts.ready` resolves once the faces in use have loaded.
         The `catch` matters: in a browser without the Font Loading API this
         must still draw, slightly wrong, rather than not at all. */
      await document.fonts?.ready?.catch?.(() => undefined);

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
        /* useMaxWidth: FALSE, so mermaid reports the size the diagram was
           LAID OUT at rather than pre-scaling it into the column. The
           scaling is then the stylesheet's job — `fitToViewBox` turns that
           layout size into the element's intrinsic width and height, and
           `max-width: 100%` scales it with its aspect ratio intact.
           Measured: with `true`, the ER diagram's type came out at about
           three pixels. */
        flowchart: { htmlLabels: true, curve: 'basis', useMaxWidth: false },
        sequence: { useMaxWidth: false },
        er: { useMaxWidth: false },
        stateDiagram: { useMaxWidth: false },
      });
      const { svg: out } = await mermaid.render(`mmd-${++seq}`, decode(props.code));
      svg.value = fitToViewBox(out);
      error.value = '';
    }

    /**
     * Draw, and retry once.
     *
     * Two unrelated things can fail here and they deserve different
     * treatment. A diagram that will not PARSE fails identically every time,
     * and must say so on the page — silently rendering nothing is how a broken
     * diagram survives a review. But mermaid arrives as a lazy chunk, and so
     * does its layout engine, so a flaky connection produces `Failed to fetch
     * dynamically imported module` for a file that is served perfectly well.
     * Seen once on a phone, against a URL that answers 200.
     *
     * A permanent error panel is the wrong answer to a dropped request, so
     * the first failure is retried after a moment. The second is reported.
     */
    async function render(): Promise<void> {
      try {
        await draw();
      } catch {
        try {
          await new Promise((resolve) => setTimeout(resolve, 400));
          await draw();
        } catch (cause) {
          error.value = cause instanceof Error ? cause.message : String(cause);
          svg.value = '';
        }
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
