/**
 * Icon — stories. Shape per stories/CONVENTIONS.md, matching the exemplar
 * stories/SegmentedControl.stories.tsx.
 *
 * Docs text below is taken from the component's own header comment and from
 * docs/07-components.md §7.1. Nothing is invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Clock, Layers, Volume2, Mic, ArrowLeft, ChevronUp, Menu, Check,
} from 'lucide-react';
import { Icon } from '../src/Icon';
import { bothThemes, Row, Stack } from './_decorators';

/* The prototype's own card-fact glyphs — METHOD RECOMMENDATION, three facts
   per card (clock, deck, sound). See PROTOTYPE-USAGE.md. */
const FACT_GLYPHS = [Clock, Layers, Volume2];

const meta = {
  title: 'Components/Icon',
  component: Icon,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'Render one static Lucide glyph at a system size, in the system stroke, in',
          'the colour of whatever contains it.',
          '',
          '**Decision 1: STATIC Lucide is the default.** Animation is a per-component',
          'opt-in gated by BOTH a user setting and prefers-reduced-motion; it is never',
          'a default and it is never implicit.',
          '',
          'base-ui has no Icon primitive — an icon is not a behaviour. It is built on',
          'base-ui’s `useRender` instead, so it accepts the same `render` composition',
          'prop as every other component in the set and stays consistent to use.',
          '',
          '**Not interactive — no states.** It has no hover, active, focus, disabled,',
          'loading, error or empty state, and it must not acquire one: an icon that',
          'reacts to the pointer is an Icon Button.',
          '',
          'The `label`/no-`label` fork is the whole accessibility surface, and it is',
          'deliberately not defaulted: an icon that is sometimes decorative and',
          'sometimes meaningful cannot have a safe default. Size and stroke come from',
          'CSS custom properties, so the SVG’s own `width`/`height`/`stroke-width`',
          'attributes are stripped rather than left to compete.',
          '',
          'Sizes are 16 / 20 / 24 / 32. Every non-inherit tone clears 3:1.',
          '',
          'PROVISIONAL: `size="sm"` consumes `--icon-stroke-sm` (token gap G1).',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '## Icon — `glyph` is required even when `render` replaces the rendered element',
          'Where: src/Icon.tsx:25 and src/Icon.tsx:58 (`render: render ?? <Glyph />`)',
          'What I checked: Level 1, the source. `glyph` is non-optional on IconProps, but',
          'when `render` is passed the Glyph component is never used. Level 3, §7.1 lists',
          '`glyph` as required and never mentions its interaction with `render`.',
          'What I did: wrote no story for `render`, and kept `glyph` in the meta args so',
          'every story has one.',
          'Why: a story for `render` would have to pass a `glyph` it does not use, which',
          'documents a contradiction rather than a component.',
          'What I need from Ben: nothing, just flagging — `glyph` could be optional when',
          '`render` is given, but that is an API change, not a story.',
          '',
          '## Icon — `animate` has no visible effect in a static story',
          'Where: src/Icon.tsx:39, src/musy-components.css:136',
          'What I checked: Level 1. `animate` only sets `data-animate="on"`; the CSS rule',
          'it enables adds a `transition`, and §7.1 says there is no animated default',
          'anywhere in the system.',
          'What I did: shipped an `Animated` story that shows the flag being set, and said',
          'in its description that the difference is a transition between two states.',
          'Why: the prop is public and has to appear somewhere, but a story cannot show',
          'motion that only exists while something else changes.',
          'What I need from Ben: nothing, just flagging.',
          '',
          '## Icon — no `tone` is used anywhere in the prototype',
          'Where: stories/PROTOTYPE-USAGE.md, the Icon table',
          'What I checked: Level 2 says every icon inherits its colour from its container',
          'and no tone is ever set. Level 3, §7.1 declares eight tones and says all of',
          'them clear 3:1.',
          'What I did: shipped a `Tones` story covering all eight, and kept `inherit` for',
          'the `Default` story.',
          'Why: the brief asks for every tone the component declares; the prototype’s',
          'silence is not evidence that a tone is wrong.',
          'What I need from Ben: nothing, just flagging — seven of the eight tones are',
          'currently used by no screen at all.',
          '',
          '## Icon — the `sm` stroke is PROVISIONAL (token gap G1)',
          'Where: src/Icon.tsx:11, src/musy-components.css:112-114,',
          'tokens/musy-foundations-amendments.css:33',
          'What I checked: Level 1. `--icon-stroke-sm: 1.5px` lives in the amendments',
          'sheet, not in Layer 1, and both the component header and the CSS say so.',
          'What I did: nothing beyond covering `sm` in the `Sizes` story.',
          'Why: G1 is a Layer 1 decision and absorbing it is not a story’s job.',
          'What I need from Ben: nothing, just flagging — G1 is already tracked.',
        ].join('\n'),
      },
    },
  },
  args: {
    glyph: Clock,
  },
  argTypes: {
    glyph: {
      control: false,
      description: 'Any static Lucide component. Pass the component, not a name string — a name string forces the whole icon set into the bundle.',
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg', 'xl'],
      description: '16 / 20 / 24 / 32.',
    },
    tone: {
      control: 'select',
      options: ['inherit', 'muted', 'strong', 'primary', 'info', 'warning', 'success', 'error'],
      description: 'Every non-inherit tone clears 3:1.',
    },
    label: {
      control: 'text',
      description: 'Accessible name. Omit for a decorative icon: the icon is then aria-hidden and the adjacent text carries the meaning.',
    },
    inline: {
      control: 'boolean',
      description: 'True when the icon sits next to text — applies --icon-optical-nudge.',
    },
    animate: {
      control: 'boolean',
      description: 'Animated variant opt-in. Requires the user setting to be on AND prefers-reduced-motion to be no-preference. Leave undefined for every ordinary use.',
    },
    className: { control: false },
    render: {
      control: false,
      description: 'base-ui composition: replace or wrap the rendered element.',
    },
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults: `md`, `inherit`, decorative. `md` is the normal size in
 *  the prototype — 45 usages, most of them md. */
export const Default: Story = {};

/** Every size the component declares: 16 / 20 / 24 / 32. `sm` is the prototype's
 *  metadata and card-fact size; `xl` appears on onboarding slide glyphs. */
export const Sizes: Story = {
  render: (args) => (
    <Stack>
      <Row label="size: sm (16)"><Icon {...args} size="sm" /></Row>
      <Row label="size: md (20) — default"><Icon {...args} size="md" /></Row>
      <Row label="size: lg (24)"><Icon {...args} size="lg" /></Row>
      <Row label="size: xl (32)"><Icon {...args} size="xl" /></Row>
    </Stack>
  ),
};

/** All eight tones. `inherit` is the default and the only one the prototype
 *  uses — every icon there takes its colour from its container. */
export const Tones: Story = {
  render: (args) => (
    <Stack>
      <Row label="tone: inherit (default)"><Icon {...args} tone="inherit" /></Row>
      <Row label="tone: muted"><Icon {...args} tone="muted" /></Row>
      <Row label="tone: strong"><Icon {...args} tone="strong" /></Row>
      <Row label="tone: primary"><Icon {...args} tone="primary" /></Row>
      <Row label="tone: info"><Icon {...args} tone="info" /></Row>
      <Row label="tone: warning"><Icon {...args} tone="warning" /></Row>
      <Row label="tone: success"><Icon {...args} tone="success" /></Row>
      <Row label="tone: error"><Icon {...args} tone="error" /></Row>
    </Stack>
  ),
};

/** `inline` applies --icon-optical-nudge, which centres the glyph on the cap
 *  height of the text beside it. The prototype sets it whenever an icon leads a
 *  button label — "Back", "Scroll up", "Let Musie pick an exercise". */
export const Inline: Story = {
  args: { glyph: ArrowLeft },
  render: (args) => (
    <Stack>
      <Row label="inline: false (default)">
        <span><Icon {...args} inline={false} /> Back</span>
      </Row>
      <Row label="inline: true">
        <span><Icon {...args} inline /> Back</span>
      </Row>
    </Stack>
  ),
};

/** `label` present: the glyph is the only carrier of meaning, so it gets
 *  role="img" and an accessible name. */
export const Labelled: Story = {
  args: { glyph: Volume2, label: 'Sound on — headphones recommended' },
};

/** No `label`: the icon is aria-hidden and the adjacent text carries the
 *  meaning. This is the prototype's usual case. */
export const Decorative: Story = {
  args: { glyph: Check },
  render: (args) => (
    <Row label="label omitted — aria-hidden, the text names it">
      <span><Icon {...args} inline /> Selected</span>
    </Row>
  ),
};

/** `animate` sets data-animate="on". The CSS it enables adds a transition, and
 *  removes it again under prefers-reduced-motion — so a still frame looks
 *  identical to the default. */
export const Animated: Story = {
  args: { glyph: Menu, animate: true },
};

/** The prototype's three card-fact glyphs at `sm`, the size it uses for
 *  metadata and compact card facts. */
export const CardFacts: Story = {
  render: (args) => (
    <Row label="sm — clock, deck, sound">
      {FACT_GLYPHS.map((glyph, i) => (
        <Icon {...args} key={i} glyph={glyph} size="sm" />
      ))}
    </Row>
  ),
};

/** The largest glyph next to the smallest, for the stroke comparison: `sm`
 *  takes --icon-stroke-sm (G1), every other size takes --icon-stroke. */
export const StrokeComparison: Story = {
  args: { glyph: ChevronUp },
  render: (args) => (
    <Row label="sm (--icon-stroke-sm, G1) vs xl (--icon-stroke)">
      <Icon {...args} size="sm" />
      <Icon {...args} size="xl" />
    </Row>
  ),
};

/** Named but small: a `sm` glyph with a `label`, the combination the prototype
 *  never uses and the one where the 3:1 tone rule matters most. */
export const LabelledSmall: Story = {
  args: { glyph: Mic, size: 'sm', tone: 'primary', label: 'Record audio' },
};
