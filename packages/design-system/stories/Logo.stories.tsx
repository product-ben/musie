/**
 * Logo — stories. Shape per stories/CONVENTIONS.md, matching the exemplar
 * stories/SegmentedControl.stories.tsx.
 *
 * Docs text below is taken from the component's own header comment and from
 * docs/07-components.md §7.15. Nothing is invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Logo } from '../src/Logo';
import { bothThemes, Row, Stack } from './_decorators';

const meta = {
  title: 'Components/Logo',
  component: Logo,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'Place the Musy mark. `[LOCKED]`',
          '',
          'base-ui has no logo primitive. Semantic HTML: `<img>` with `alt` when it is',
          'the only naming of the product; aria-hidden + adjacent text when a wordmark',
          'is rendered beside it, so the name is not announced twice. Built on base-ui’s',
          '`useRender` so the wrapper can be composed — which is how the app turns it',
          'into a home link (`render={<Link href="/" />}`) without this component',
          'knowing about routing.',
          '',
          'One asset, both themes: the mark is a full-colour illustration, so Layer 1’s',
          'surface tokens carry the contrast around it rather than through it.',
          '',
          '**Sizes.** `nav` 24px (--icon-size-lg), `splash` 96px (--icon-size-xl * 3).',
          'Chosen by placement, not by viewport — there is no responsive behaviour. The',
          'default `src` is the WEB rendition (192px wide, 2× the splash size). The',
          '1217px Figma original lives at /assets/source/ for handoff — it must never be',
          'the src: a 601 KB bitmap decoded at 24px is pure cost.',
          '',
          '**Not interactive — no states.** And **not a home link**: wrapping it in an',
          '`<a>` is the consuming app’s job, and doing it here would put a link in every',
          'context that shows a logo.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '## Logo — the wordmark says "Musie", the component default says "Musy"',
          'Where: src/Logo.tsx:37 (`alt = ’Musy’`) vs the prototype NAVBAR and DRAWER',
          'What I checked: Level 1 says the default `alt` is `’Musy’`. Level 2, the',
          'prototype renders the wordmark text **"Musie"** in both places, and the repo,',
          'the app and the product copy all say "Musie". The package is named',
          '`musy-design-system` and every CSS class is `musy-`.',
          'What I did: nothing. Stories use the component’s default, so `WithWordmark`',
          'reads "Musy" and not the prototype’s "Musie".',
          'Why: changing a default is a design decision, which is out of scope. This',
          'repeats the Step 1 entry rather than replacing it.',
          'What I need from Ben: **a decision.** "Musy" looks like the system’s name and',
          '"Musie" the product’s, but the Logo’s `alt` is user-facing product copy, so',
          'the default is probably wrong.',
          '',
          '## Logo — the documented default `src` is not the implemented one',
          'Where: src/Logo.tsx:38 (`’/assets/web/musy-logo.png’`) vs',
          'docs/07-components.md §7.15 props table (`’/assets/musy-logo.png’`)',
          'What I checked: Level 1, the source, says `/assets/web/musy-logo.png`. Level 3,',
          'the docs table, says `/assets/musy-logo.png`. Both files exist under',
          'packages/design-system/assets/, and .storybook/main.ts maps `../assets` to',
          '`/assets` specifically so the source’s path resolves.',
          'What I did: used the component default, so every story renders the web',
          'rendition.',
          'Why: the source is Level 1 and the Storybook static mapping was written for it.',
          'What I need from Ben: **a decision** — one line of the docs table is stale, or',
          'two renditions are both shipping and only one is meant to.',
          '',
          '## Logo — `showWordmark` with `alt=""` leaves the logo with no name at all',
          'Where: src/Logo.tsx:40 and src/Logo.tsx:53',
          'What I checked: Level 1. `named = showWordmark ? ’’ : alt`, and the wordmark',
          'span renders `{alt}`. With `showWordmark` and `alt=""` the mark is aria-hidden',
          'AND the wordmark is an empty span: nothing visible, nothing announced. Level 3,',
          '§7.15 says to set `alt` to `’’` "only when adjacent text already names it",',
          'which is exactly the combination that breaks.',
          'What I did: wrote a `NamedByAdjacentText` story for `alt=""` WITHOUT',
          '`showWordmark`, which is the legal reading, and no story for the broken pair.',
          'Why: the docs sentence and the wordmark prop overlap, and only one of the two',
          'readings produces a named logo.',
          'What I need from Ben: **a decision.** Either `alt` should keep naming the mark',
          'when a wordmark is shown, or the wordmark should take its own string.',
          '',
          '## Logo — `alt` is doing two jobs: the accessible name and the wordmark text',
          'Where: src/Logo.tsx:28-29, 53',
          'What I checked: Level 1. There is one string prop and it is rendered as visible',
          'copy when `showWordmark` is set, and as an alt attribute when it is not. Level',
          '3, §7.15 documents it only as "Accessible name".',
          'What I did: nothing.',
          'Why: it is the same word in both jobs today, so nothing is visibly wrong.',
          'What I need from Ben: nothing, just flagging — it is the reason the "Musy" /',
          '"Musie" question above cannot be answered per-call without also changing the',
          'visible wordmark.',
        ].join('\n'),
      },
    },
  },
  args: {},
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['nav', 'splash'],
      description: 'nav 24px (--icon-size-lg), splash 96px (--icon-size-xl * 3).',
    },
    showWordmark: {
      control: 'boolean',
      description: 'Show the "Musy" wordmark next to (nav) or under (splash) the mark.',
    },
    alt: {
      control: 'text',
      description: 'Accessible name. Set to ’’ only when adjacent text already names it.',
    },
    src: { control: 'text' },
    className: { control: false },
    render: {
      control: false,
      description: 'base-ui composition — e.g. render={<Link href="/" />} for a home link.',
    },
  },
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults: `nav`, no wordmark, `alt="Musy"` naming the mark. */
export const Default: Story = {};

/** Both sizes. `nav` is the only one the prototype uses — NAVBAR and DRAWER.
 *  `splash` never appears there. */
export const Sizes: Story = {
  render: (args) => (
    <Stack>
      <Row label="size: nav (24px) — default"><Logo {...args} size="nav" /></Row>
      <Row label="size: splash (96px)"><Logo {...args} size="splash" /></Row>
    </Stack>
  ),
};

/** With the wordmark, which is how the prototype uses it in both places. The
 *  mark goes aria-hidden and the wordmark carries the name, so it is announced
 *  once. Note the wordmark here reads "Musy" — see the build notes. */
export const WithWordmark: Story = { args: { showWordmark: true } };

/** `splash` with the wordmark: the lockup stacks, mark above name. */
export const SplashWithWordmark: Story = {
  args: { size: 'splash', showWordmark: true },
};

/** `alt=""`, for the case §7.15 names: adjacent text already names the product,
 *  so the mark is decorative and aria-hidden. */
export const NamedByAdjacentText: Story = {
  args: { alt: '' },
  render: (args) => (
    <Row label="alt='' — the heading beside it does the naming">
      <Logo {...args} />
      <span>Musie</span>
    </Row>
  ),
};

/** A custom accessible name, for a context where the mark names something more
 *  specific than the product. */
export const CustomAlt: Story = { args: { alt: 'Musy — back to the start' } };

/** The other rendition that ships in the package. The default `src` is the web
 *  one; see the build notes. */
export const CustomSrc: Story = { args: { src: '/assets/musy-logo.png' } };

/** `render` composes the wrapper, which is how the consuming app makes a home
 *  link without the component knowing about routing. The component itself is
 *  **not** a link. */
export const Composed: Story = {
  args: { showWordmark: true, render: <a href="/" /> },
};

/** A missing asset. `alt` is what is left, which is the whole reason the
 *  `alt`/aria-hidden fork is a prop and not a guess. */
export const BrokenSrc: Story = {
  args: { src: '/assets/web/does-not-exist.png' },
};
