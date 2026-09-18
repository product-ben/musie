/**
 * ContentBox — stories. Shape per stories/CONVENTIONS.md, matching the exemplar
 * stories/SegmentedControl.stories.tsx.
 *
 * Docs text below is taken from the component's own header comment and from
 * docs/07-components.md §7.9. Nothing is invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ContentBox } from '../src/ContentBox';
import { ContentList } from '../src/ContentList';
import { CtaButton } from '../src/CtaButton';
import { bothThemes, Stack } from './_decorators';

/* Every step `TypeStep` declares, in the scale's own order — largest first,
   display through label. Declared once and reused by the argTypes below and by
   the HeadlineSteps story, so the two cannot drift from the union. */
const STEPS = [
  'display-xl', 'display-lg', 'stage',
  'heading-lg', 'heading-md', 'heading-sm',
  'body-lg', 'body-md', 'body-sm',
  'label-lg', 'label-md',
] as const;

/* The prototype's own opening panel — ONBOARDING, headline at display-lg and
   body at stage. See PROTOTYPE-USAGE.md. */
const ONBOARDING_TEXT =
  'Nine paper cards, one feeling each. Scan the card you relate to and listen to the track behind it.';

const meta = {
  title: 'Components/ContentBox',
  component: ContentBox,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'A titled container for arbitrary content.',
          '',
          'No APG pattern (not a widget), and base-ui has no card primitive — a card has',
          'no behaviour to own. Semantic HTML: `<article>` with a real heading, so the',
          'box appears in the document outline as a unit rather than as an anonymous div',
          'stack. Built on base-ui’s `useRender` so it accepts the same `render`',
          'composition prop as the rest of the set.',
          '',
          'Type steps are **props**, not a hardcoded heading-sm / body-md pair — the same',
          'box is a session card at heading-sm and an onboarding panel at heading-lg. The',
          'heading LEVEL is also a prop, because the correct level depends on where the',
          'box sits in the page, which the box cannot know (1.3.1).',
          '',
          '**`headlineHidden` — hidden, never absent.** A card that shows its content',
          'alone still needs the heading: it is what puts the box in the document',
          'outline, which is the documented reason this is an `<article>`. It moves to',
          '`.musy-sr-only` and drops its type step; it stays in the outline and in the',
          'accessible name. Mirrors Switch’s `labelHidden`. Never remove the headline to',
          'hide it.',
          '',
          '**Framed (header slot).** Passing `header` splits the card into two regions',
          'divided by a full-bleed hairline. The line is full-bleed on purpose: an inset',
          'line reads as a rule under the text above it, an edge-to-edge line reads as',
          'the card being in two parts. The card then owns no padding at all — the',
          'regions do — so the line needs no negative margin to reach the edges.',
          '',
          '**Not interactive — no states.** If a box needs to be clickable, the consumer',
          'puts a link or button inside it; making the whole `<article>` a click target',
          'would swallow the nested action. Not a Message (§7.10, tighter padding and a',
          'status role), not a clickable card, not a dialog.',
          '',
          '`outline="raised"` was removed in review: an elevation-1 card and a',
          'solid-outlined card were doing the same job, and the shadow read as a second,',
          'competing boundary next to the outline. Depth stays with `sunken`.',
          '',
          'PROVISIONAL: `outline="dashed"` consumes `--border-style-dashed` (token gap',
          'G2). The dashed variant reads as "provisional / awaiting content" and is never',
          'permitted on an interactive boundary (1.4.11).',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '## ContentBox — the headline has no overflow-wrap safety net',
          'Where: src/musy-components.css:1374',
          'What I checked: Level 1. `.musy-box__headline` sets `text-wrap`,',
          '`max-width` and colour, and nothing else — it computes',
          '`overflow-wrap: normal` and carries no `hyphens`. The line directly below',
          'it, `.musy-box__text`, does carry `hyphens: var(--text-hyphens)`. Level 3,',
          'docs/07-components.md:46 promises the opposite: "Every affected part also',
          'carries overflow-wrap: break-word as the safety net for a word with no',
          'legal hyphenation point in range." The headline is not one of them.',
          'What I did: nothing to the CSS. Changed this page\u2019s own labels so they',
          'contain a space and can wrap, and measured the rest: at display-xl an',
          'unbreakable 25-character string renders 691px wide inside a 568px box and',
          'is simply clipped.',
          'Why: editing the stylesheet is a design-system change, not a story fix.',
          'What I need from Ben: **a decision.** German compounds are exactly the case',
          '\u00a746 raises \u2014 "Partnerschaftsberatung" at display-xl in a phone-width',
          'card has no legal break point and will overflow the same way. Either the',
          'headline gets `overflow-wrap: break-word` like the text beside it, or \u00a746',
          'should stop claiming every wrapping part has it.',
          '',
          '## ContentBox — framed with no `children` renders an empty padded body',
          'Where: src/ContentBox.tsx:73 and 87-89',
          'What I checked: Level 1. `body` is `children && <div class="musy-box__slot">…`,',
          'but in the framed branch it is placed inside an unconditional',
          '`<div class="musy-box__body">`, which the CSS gives `--space-inset-card` of',
          'padding. So `header` without `children` draws the hairline and then an empty',
          '24px band. The unframed branch has no such problem: `body` is simply absent.',
          'What I did: shipped `FramedWithoutChildren` so the behaviour is visible, and',
          'gave every other framed story real children.',
          'Why: the framed variant is described as "header, hairline, body", and a body',
          'with nothing in it is the state the description does not cover.',
          'What I need from Ben: **a decision.** Either the body region should collapse',
          'when there are no children, or framed should require them.',
          '',
          '## ContentBox — `outline="plain"` also removes the padding',
          'Where: src/musy-components.css:1346',
          'What I checked: Level 1. `.musy-box--plain` sets `padding: 0` along with the',
          'transparent border and fill. Level 3, §7.9 describes the outline prop only as',
          'an edge treatment and its Responsive section says `--space-inset-card` (24px)',
          'is constant — which is not true for `plain`.',
          'What I did: shipped `Outlines` covering all four, so the padding difference is',
          'visible side by side.',
          'Why: it is real behaviour and the story documents what is.',
          'What I need from Ben: nothing, just flagging — §7.9’s "constant" sentence',
          'needs the `plain` exception, or `plain` needs its padding back.',
          '',
          '## ContentBox — `outline="dashed"` is PROVISIONAL and used by nothing',
          'Where: src/ContentBox.tsx:20, src/musy-components.css:1340-1344',
          'What I checked: Level 1 flags G2 in the component header and again in the CSS.',
          'Level 2 says `outline="dashed"` never appears in the prototype, and',
          'PROTOTYPE-USAGE.md lists it among the things with no prototype usage at all.',
          'Level 3 gives it a meaning ("provisional / awaiting content") and a rule (never',
          'on an interactive boundary).',
          'What I did: covered it in `Outlines` and gave it its own story with the docs’',
          'own meaning in the description.',
          'Why: the brief asks for every variant the component declares.',
          'What I need from Ben: nothing, just flagging — G2 and G2b are already tracked.',
          '',
          '## ContentBox — `headlineHidden` silently drops `headlineStep`',
          'Where: src/ContentBox.tsx:68-69',
          'What I checked: Level 1. When `headlineHidden` is set, `data-type-step` is',
          '`undefined` and the class becomes `.musy-sr-only`. Level 3, §7.9 states this',
          'deliberately ("moves it to .musy-sr-only and drops its type step").',
          'What I did: nothing — resolved, and the two agree. `HeadlineHidden` passes no',
          '`headlineStep` so the story does not imply one is honoured.',
          'Why: source and docs say the same thing; logging it only so the next reader',
          'does not re-derive it.',
          'What I need from Ben: nothing, just flagging.',
          '',
          '## ContentBox — `stage` is a type step the prototype uses for BODY text',
          'Where: stories/PROTOTYPE-USAGE.md, ContentBox table; src/ContentBox.tsx:25-30',
          'What I checked: Level 1 declares `stage` among the eleven steps with no note',
          'on where it belongs. Level 2 says the opening ONBOARDING box uses `stage` as a',
          '`textStep`, between a `display-lg` headline and `body-lg`.',
          'What I did: shipped `TypeSteps` using the prototype’s own pairing — headline',
          '`display-lg`, text `stage`.',
          'Why: Level 2 is the authority on intent, and it is unambiguous here.',
          'What I need from Ben: nothing, just flagging — `stage` reads like a heading',
          'step by name and is used as a body step in the one place it appears.',
        ].join('\n'),
      },
    },
  },
  args: {
    headline: 'What would you like to start with now?',
  },
  argTypes: {
    headline: { control: 'text' },
    headlineHidden: {
      control: 'boolean',
      description: 'Hide the headline visually. It stays in the outline and in the accessible name. Never remove the headline to hide it.',
    },
    headingLevel: {
      control: 'select',
      options: [2, 3, 4, 5, 6],
      description: 'Heading level for the document outline. Never guessed.',
    },
    headlineStep: {
      control: 'select',
      options: [...STEPS],
    },
    text: { control: 'text' },
    textStep: {
      control: 'select',
      options: [...STEPS],
    },
    outline: {
      control: 'inline-radio',
      options: ['solid', 'dashed', 'sunken', 'plain'],
    },
    header: {
      control: false,
      description: 'Header region. Present ⇒ the card renders framed: header, hairline, body.',
    },
    children: { control: false, description: 'Arbitrary content, below the text.' },
    className: { control: false },
    render: {
      control: false,
      description: 'base-ui composition: swap <article> for another element or component.',
    },
  },
} satisfies Meta<typeof ContentBox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults: `solid`, `heading-sm`, `h3`, no text and no slot. The
 *  prototype's own METHOD RECOMMENDATION headline. */
export const Default: Story = {};

/** Every outline the component declares. `solid` is the default and carries ten
 *  of the prototype's twelve boxes; `sunken` is the CONTEXT COLUMN; `dashed`
 *  appears nowhere. Note `plain` also drops the card's padding. */
export const Outlines: Story = {
  render: (args) => (
    <Stack>
      <ContentBox {...args} outline="solid" headline="outline: solid (default)" text={ONBOARDING_TEXT} />
      <ContentBox {...args} outline="dashed" headline="outline: dashed (G2)" text={ONBOARDING_TEXT} />
      <ContentBox {...args} outline="sunken" headline="outline: sunken" text={ONBOARDING_TEXT} />
      <ContentBox {...args} outline="plain" headline="outline: plain" text={ONBOARDING_TEXT} />
    </Stack>
  ),
};

/** The dashed edge on its own. §7.9: it reads as "provisional / awaiting
 *  content", and it is never permitted on an interactive boundary — dashing
 *  lowers the perceived stroke (1.4.11). */
export const Dashed: Story = {
  args: { outline: 'dashed', text: ONBOARDING_TEXT },
};

/** The sunken surface, which is how depth is expressed since `raised` was
 *  removed. The prototype uses it for the CONTEXT COLUMN, "This session". */
export const Sunken: Story = {
  args: { outline: 'sunken', headline: 'This session' },
};

/** The three headline steps the prototype sets explicitly, with its own copy.
 *  `stage` appears once, as the opening box's `textStep`. */
export const TypeSteps: Story = {
  render: (args) => (
    <Stack>
      <ContentBox
        {...args}
        headline="Hi, I’m Musie."
        headlineStep="display-lg"
        text={ONBOARDING_TEXT}
        textStep="stage"
      />
      <ContentBox
        {...args}
        headline="How we play with music"
        headlineStep="heading-md"
        text={ONBOARDING_TEXT}
        textStep="body-lg"
      />
      <ContentBox
        {...args}
        headline="Session complete"
        headlineStep="heading-sm"
        text={ONBOARDING_TEXT}
      />
    </Stack>
  ),
};

/**
 * The headline at **every step the type scale defines**, largest to smallest.
 *
 * This is the prop that changes the picture. `headingLevel` changes the tag;
 * `headlineStep` changes the size, weight, family, line height and tracking —
 * all five come from the Layer 1 token for that step, and every one is fluid,
 * so the figures move with the viewport. Resize the canvas and watch them.
 *
 * Two of these are not heading steps and are here because the prop accepts
 * them: `stage` is Musie speaking — display family at heading-lg's size but
 * regular weight and an open line height — and the `body-*` / `label-*` rungs
 * are for a card whose title should not shout.
 *
 * Each label reads `headlineStep: <step>` rather than `headlineStep="<step>"`
 * on purpose: the quoted form has no space in it, so it cannot wrap, and at
 * `display-xl` it ran 691px wide out of a 568px box. That is a property of the
 * label, not of the component — but see Build notes, because the headline has
 * no `overflow-wrap` safety net for a genuinely long word either.
 */
export const HeadlineSteps: Story = {
  render: (args) => (
    <Stack>
      {STEPS.map((step) => (
        <ContentBox key={step} {...args} headlineStep={step} headline={`headlineStep: ${step}`} />
      ))}
    </Stack>
  ),
};

/** Headline and text together. `textStep` defaults to `body-md`. */
export const WithText: Story = { args: { text: ONBOARDING_TEXT } };

/** The slot: arbitrary content below the text. Here the prototype's own
 *  lightbox pairing — a method detail list and its CTA. */
export const WithChildren: Story = {
  args: {
    headline: 'Quick Mindfulness Break',
    headlineStep: 'heading-md',
    text: 'For getting aware of feelings',
    children: (
      <>
        <ContentList
          label="Method details"
          items={[
            { label: 'Duration', content: 'About 15 minutes' },
            { label: 'You need', content: 'Your physical Mindfulness Cards deck' },
          ]}
        />
        <CtaButton variant="primary">Start Exercise</CtaButton>
      </>
    ),
  },
};

/** Framed: passing `header` splits the card into a header and a body divided by
 *  a full-bleed hairline. The prototype's one framed box is the Method shell. */
export const Framed: Story = {
  args: {
    headline: 'Quick Mindfulness Break',
    headlineStep: 'heading-md',
    header: <span>Intro · Select Card · Listen · Reflect</span>,
    children: <p>{ONBOARDING_TEXT}</p>,
  },
};

/** Framed with no children. The body region still renders and still takes its
 *  inset, so the card ends in an empty band — see the build notes. */
export const FramedWithoutChildren: Story = {
  args: {
    headline: 'Quick Mindfulness Break',
    header: <span>Intro · Select Card · Listen · Reflect</span>,
  },
};

/** The headline is hidden, never absent: it stays in the document outline and
 *  in the accessible name. */
export const HeadlineHidden: Story = {
  args: { headlineHidden: true, children: <p>{ONBOARDING_TEXT}</p> },
};

/**
 * `headingLevel` changes the emitted tag — `<h2>` … `<h6>` — and nothing else.
 *
 * **All five boxes look identical on purpose.** Size comes from a separate
 * prop, `headlineStep`, which is `heading-sm` for every box here. §7.9 keeps
 * them apart because the correct level depends on where the box sits in the
 * page, which the box cannot know (1.3.1) — so a card can be an `<h4>` in the
 * outline while still looking like every other card.
 *
 * Inspect the elements to see the difference; it is in the document outline,
 * not in the rendering.
 */
export const HeadingLevels: Story = {
  render: (args) => (
    <Stack>
      {([2, 3, 4, 5, 6] as const).map((level) => (
        <ContentBox
          key={level}
          {...args}
          headingLevel={level}
          headline={`headingLevel={${level}} renders <h${level}>`}
          text={
            level === 3
              ? 'The component default. Every box on this page is heading-sm, so the level changes the document outline and not the picture.'
              : undefined
          }
        />
      ))}
    </Stack>
  ),
};

/** `render` swaps the `<article>` for another element — base-ui composition,
 *  the same prop the rest of the set takes. */
export const Composed: Story = {
  args: { render: <section />, text: ONBOARDING_TEXT },
};

/** The longest copy in the prototype, at the largest headline step: the measure
 *  tokens cap the line length rather than the container. */
export const LongCopy: Story = {
  args: {
    headline: 'Complete Exercise with this card, then start your reflection',
    headlineStep: 'display-lg',
    text: 'Work with the card you are drawn to, not the one you think you should pick. Nine paper cards, one feeling each. Scan the card you relate to and listen to the track behind it.',
    textStep: 'body-lg',
  },
};
