/**
 * The two tabs. Rendered three times — in the desktop nav bar, in the mobile
 * nav screen, and above every document — all three driven by the one `audience`
 * ref, so switching anywhere switches everywhere.
 *
 * Written with `h()` rather than as a .vue file on purpose: the whole theme is
 * four small components, and keeping them as TypeScript means plain
 * `tsc --noEmit` checks them. An SFC would need vue-tsc in `pnpm check` to buy
 * the same thing (CLAUDE.md rule 8).
 */
import { defineComponent, h } from 'vue';
import { AUDIENCES, AUDIENCE_LABEL } from '../markdown/audience';
import { audience, setAudience } from './audience';

export default defineComponent({
  name: 'AudienceToggle',
  props: {
    /** Where it is being rendered; only CSS cares. */
    variant: { type: String, default: 'nav' },
  },
  setup(props) {
    return () =>
      h(
        'div',
        {
          class: ['aud-toggle', `aud-toggle--${props.variant}`],
          role: 'group',
          'aria-label': 'Who these docs are for',
        },
        AUDIENCES.map((value) =>
          h(
            'button',
            {
              type: 'button',
              class: ['aud-toggle__btn', { 'is-on': audience.value === value }],
              'aria-pressed': String(audience.value === value),
              onClick: () => setAudience(value),
            },
            AUDIENCE_LABEL[value],
          ),
        ),
      );
  },
});
