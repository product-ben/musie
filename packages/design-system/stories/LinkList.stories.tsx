/**
 * LinkList — stories. Shape per stories/CONVENTIONS.md, matching the exemplar
 * stories/SegmentedControl.stories.tsx.
 *
 * Docs text below is taken from the component's own header comment. Nothing is
 * invented.
 *
 * COPY NOTE. The prototype has no diary and never uses this component, so
 * there is no prototype copy to lift — see PROTOTYPE-USAGE.md, which lists the
 * twelve screens it does have. The strings below are plain demo content.
 *
 * ROUTER NOTE. Every navigable story uses a bare `<a href>`. The design system
 * must not import react-router; `render` is the boundary that keeps it out, and
 * a story that imported a `Link` would be the first thing to cross it.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { LinkList } from '../src/LinkList';
import type { LinkListItem } from '../src/LinkList';
import { asset, bothThemes } from './_decorators';

/* A short run of diary entries. Static: no `render`, so no destination. */
const ENTRIES: LinkListItem[] = [
  { id: 'a', headline: 'Quick Mindfulness Break' },
  { id: 'b', headline: 'A walk before the call' },
  { id: 'c', headline: 'Reading the card I avoided' },
];

/* The same run, navigable. A plain anchor stands in for a router Link. */
const LINKED: LinkListItem[] = ENTRIES.map((item) => ({
  ...item,
  render: <a href={`#/diary/${item.id}`} />,
}));

/* Two and three meta lines — the diary row's real shape. Each line is its own
   element, which is what makes the meta slot stack rather than run together. */
const WITH_META: LinkListItem[] = [
  {
    id: 'a',
    headline: 'Quick Mindfulness Break',
    meta: (
      <>
        <span>14 September · 09:12</span>
        <span>Voice note · 1:48</span>
      </>
    ),
    render: <a href="#/diary/a" />,
  },
  {
    id: 'b',
    headline: 'A walk before the call',
    meta: (
      <>
        <span>13 September · 18:40</span>
        <span>Written answer</span>
        <span>2 photos</span>
      </>
    ),
    render: <a href="#/diary/b" />,
  },
];

const meta = {
  title: 'Components/LinkList',
  component: LinkList,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'A list of DESTINATIONS. Every row is one hit target, and the element that',
          'makes the row navigable comes from the consumer through the item’s `render`',
          'prop. **Deliberately basic** — the bones are correct, the visual detail lands',
          'in Phase G.1.',
          '',
          '**Why it exists.** Nothing in the set was a navigable list row. `RadioCards` is',
          'a radio, and an interactive control inside a radio’s label is a nested control',
          '(4.1.2), so a card that navigates cannot be a RadioCard. `ContentList` is a',
          'non-interactive `<dl>` of term/definition pairs. `ContentBox` is clickable only',
          'by replacing its whole `<article>` through `render`, which makes ONE box a link,',
          'not a list of them.',
          '',
          '**No APG pattern.** A run of links is content, not a widget: no roving',
          'tabindex and no arrow keys, because each row is its own tab stop and that is',
          'what a list of links is.',
          '',
          '**L3 — a real `<ul>` of `<li>`.** The count and each position reach assistive',
          'tech instead of being drawn. `aria-label` is honest here in a way it is not on',
          'ContentList’s `<dl>`: `<ul>` has an implicit `list` role, so a bare',
          '`aria-label` on it is exposed.',
          '',
          '**`render` is the router boundary.** This package must never import',
          'react-router. A screen writes `render={<Link to="/diary/abc" />}` and the row',
          'becomes that element, built on base-ui’s `useRender` exactly as ContentBox is.',
          'An item with no `render` is a static row — nothing here fabricates an anchor',
          'without a destination.',
          '',
          '**Target size.** The whole row is the target, at `--target-primary` (44px) on',
          'every pointer. There is nothing for L5’s pointer split to choose between, so',
          'there is no `size` prop and no media query.',
          '',
          '**Type steps are fixed, not props.** The headline is `label-lg`: `body-md`’s',
          'size at weight 500, so the row is emphasised without dropping below L8’s',
          'floor — `label-md` and `body-sm` are barred from essential prose by Layer 1',
          '§4. `meta` is `body-sm`, L8’s captions / counts / timestamps row.',
          '',
          '**Every user-visible string is a required prop.** `label` and `emptyLabel`',
          'have no defaults, so neither can leak the wrong language.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-19. Delete once answered.',
          'This is not documentation._',
          '',
          '## LinkList — a navigable row is visually identical to a static one',
          'Where: src/musy-components.css, the LINK LIST block (`.musy-llist__row`), src/LinkList.tsx',
          'What I checked: the brief asks for "no hover choreography, no elevation, no',
          'motion", and the row drops the anchor underline because the affordance is the',
          'whole row rather than a coloured word inside it. The result is that a row with',
          '`render={<a …>}` and a row without it look the same until focus or a pointer',
          'lands on them.',
          'What I did: shipped it that way, and said so here. The row is still a real',
          'link — cursor, status bar, context menu, focus ring and AT all report it.',
          'Why: the affordance is a visual decision, and adding a chevron or a hover fill',
          'now would be taking Phase G.1’s decision in Phase C.',
          'What I need from Ben: **Phase G.1 owes this row its affordance** — a trailing',
          'chevron is the obvious candidate, and it would make `media` and a trailing',
          'slot the row’s two ends.',
          '',
          '## LinkList — the empty state drops the list’s accessible name',
          'Where: src/LinkList.tsx, the `items.length === 0` branch',
          'What I checked: this is ContentList’s open question ("the empty state loses the',
          'list’s accessible name") arriving a second time. The alternatives each mislead:',
          'an empty labelled `<ul>` announces "list, 0 items" and says less than the',
          'sentence does; a `<ul>` holding the message as its one `<li>` announces a count',
          'that is a lie; a labelled `<section>` makes every empty list a landmark.',
          'What I did: rendered a paragraph, matching ContentList, and did not re-decide',
          'it here.',
          'Why: one component should not answer a question the component beside it has',
          'open — whatever is decided should be decided for both at once.',
          'What I need from Ben: **one decision covering ContentList and LinkList.**',
          '',
          '## LinkList — no trailing slot, so a row cannot carry a control',
          'Where: src/LinkList.tsx, LinkListItem',
          'What I checked: an item carries `media`, `headline` and `meta`. A diary row',
          'that needs a per-row action (delete, favourite) cannot have one: a button',
          'inside the row would be a control inside a link, which is exactly the nesting',
          'that rules RadioCards out for this job in the first place.',
          'What I did: nothing. The brief specifies the item’s fields and I kept to them.',
          'Why: the fix is not a slot — it is L4’s card anatomy, where the controls are',
          'positioned into a float spacer as SIBLINGS of the link rather than inside it.',
          'What I need from Ben: **a note that per-row actions are out of scope** until a',
          'screen needs them, and then that they arrive as L4 geometry, not as a child of',
          'the row.',
        ].join('\n'),
      },
    },
  },
  args: {
    label: 'Diary entries',
    items: LINKED,
    emptyLabel: 'No entries yet.',
  },
  argTypes: {
    label: { control: 'text', description: 'Accessible name for the list. Required — never defaulted.' },
    items: {
      control: false,
      description: 'Each item carries a stable id, a headline, and optional meta, media and a render prop.',
    },
    emptyLabel: {
      control: 'text',
      description: 'Rendered as a paragraph instead of an empty <ul>. Required — never defaulted.',
    },
    headingLevel: {
      control: 'select',
      options: [2, 3, 4, 5, 6],
      description: 'Render every row’s headline as this heading level instead of a <span>. No default, and not guessed.',
    },
    className: { control: false },
  },
} satisfies Meta<typeof LinkList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults: three navigable rows, headline only. Each row is one
 *  44px hit target and its own tab stop. */
export const Default: Story = {};

/** No `render` on any item, so every row is a static `<div>`. Legal and inert:
 *  the component never fabricates an anchor without a destination. */
export const Static: Story = { args: { items: ENTRIES } };

/** The diary row's real shape — two or three meta lines under the headline.
 *  Each line is its own element, which is what makes them stack. */
export const WithMeta: Story = { args: { items: WITH_META } };

/** A thumbnail per row. The square is `--target-primary`, so a row with media
 *  is the same height as a row without it. `alt` is required alongside `src`. */
export const WithMedia: Story = {
  args: {
    items: [
      {
        id: 'a',
        headline: 'Quick Mindfulness Break',
        meta: <span>14 September · 09:12</span>,
        media: {
          src: asset('assets/web/method-card.png'),
          alt: 'The Mindfulness Cards deck laid out on a table',
        },
        render: <a href="#/diary/a" />,
      },
      {
        id: 'b',
        headline: 'A walk before the call',
        meta: <span>13 September · 18:40</span>,
        media: { node: <img src={asset('assets/web/musy-logo.png')} alt="The Musy mark" /> },
        render: <a href="#/diary/b" />,
      },
    ],
  },
};

/** `headingLevel` opts each row's headline into the document outline. Omit it
 *  and the headline is a `<span>`; there is no default, because thirty rows as
 *  thirty headings is an outline nobody can use. Inside a Timeline whose group
 *  headings are level 3, rows take level 4. */
export const Headings: Story = { args: { headingLevel: 4, items: WITH_META } };

/** `items: []` renders `emptyLabel` as a paragraph instead of an empty `<ul>`.
 *  The list's accessible name is not carried into this branch — see the build
 *  notes. */
export const Empty: Story = { args: { items: [] } };

/** Edge case: a German compound past the column. The headline wraps and
 *  hyphenates (`--text-hyphens`), which needs `<html lang="de">` to break at
 *  German points — an integration requirement, not a component prop. */
export const LongHeadline: Story = {
  args: {
    label: 'Tagebucheinträge',
    emptyLabel: 'Noch keine Einträge.',
    items: [
      {
        id: 'a',
        headline: 'Aufmerksamkeitsübung mit der Karte, die ich sonst immer überspringe',
        meta: (
          <>
            <span>14. September · 09:12</span>
            <span>Sprachnotiz · 1:48</span>
          </>
        ),
        render: <a href="#/diary/a" />,
      },
      { id: 'b', headline: 'Kurz durchatmen', render: <a href="#/diary/b" /> },
    ],
  },
};

/** Edge case: one row. The rule between rows is an adjacent-sibling rule, so a
 *  single row has no line above or below it. */
export const SingleItem: Story = { args: { items: [LINKED[0]] } };
