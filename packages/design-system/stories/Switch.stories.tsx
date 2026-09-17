/**
 * Switch — Batch B (controls).
 *
 * Docs text below comes from the component's own header comment and from
 * docs/07-components.md §7.5. Nothing is invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import { Switch } from '../src/Switch';
import { bothThemes, Stack } from './_decorators';

/* The prototype's only Switch — SETTINGS, `reverse` + `accent-placeholder1`,
   label "Dark mode", Moon / Sun knob glyphs. See PROTOTYPE-USAGE.md. */

const meta = {
  title: 'Components/Switch',
  component: Switch,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'base-ui: Switch (`@base-ui/react/switch`).',
          'APG pattern: Switch.',
          '',
          'Flip one setting that takes effect immediately.',
          '',
          '`Switch.Root` is the TRACK and is the focusable element; `Switch.Thumb` is the',
          'knob. base-ui renders the hidden `<input>` itself and owns form participation, so',
          'there is no input in this component and no sibling-selector styling.',
          '',
          '**Labelling (2.5.3): a VISIBLE label is preferred.** base-ui’s own guidance is an',
          'enclosing `<label>`, but this component uses the sibling pattern (`htmlFor`/`id`)',
          'because the label needs to sit on either side of the track for the settings row —',
          'so `Switch.Root` renders a native `<button>` and takes `nativeButton`, exactly as',
          'base-ui documents for that case. `labelHidden` keeps the label in the accessible',
          'name rather than swapping to `aria-label`.',
          '',
          '**Knob glyphs are a prop.** Check / X is the generic on-off reading and stays the',
          'default. A *domain* pair says what is switching rather than only that something',
          'is — Sun / Moon for dark mode, Volume2 / VolumeX for the accompaniment sounds.',
          'Both glyphs stay mounted and crossfade, so the knob never resizes mid-toggle. The',
          'pair is decorative: it is a redundant cue for a state `role="switch"` already',
          'announces, which is why it carries no label and why `showStateIcons={false}` is a',
          'legitimate choice.',
          '',
          'Geometry is **derived**, not invented: knob = `--icon-size-lg` (24), inset =',
          '`--sp-1` (4), so the track is 32 high and 60 wide. `guided` raises the *row* to',
          '`--target-guided`; the track never grows, because a 64px track would read as a',
          'slider. The 44px target is the whole row, not the 32px track, which is what makes',
          'it usable one-handed.',
          '',
          'Three cues carry the state — fill, knob travel, and the embedded glyph — so',
          'removing the hue leaves it readable (1.4.1).',
          '',
          '**There is no loading state and no invalid state.** §7.5: loading is "N/A at',
          'component level. A switch bound to a request is the consuming app’s state; it',
          'should disable the switch and render a Message." Error is "N/A. A switch cannot',
          'be invalid — either value is legal."',
          '',
          '**What it is NOT.** Not a checkbox (no form-submit semantics implied, no',
          'indeterminate state), not a two-option radio group, not a button.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '## Switch — inherited base-ui Switch.Root props cannot be filtered out of the docs table',
          'Where: `src/Switch.tsx:31` (`extends Omit<React.ComponentPropsWithoutRef<typeof BaseSwitch.Root>, \'className\' | \'render\' | \'nativeButton\'>`), `.storybook/main.ts`',
          'What I checked: Level 1, the component source. react-docgen cannot follow an',
          '`Omit<ComponentPropsWithoutRef<>>`, so the docs table gets either nothing or the',
          'whole DOM surface. The fix is a `propFilter` in `.storybook/main.ts`, which this',
          'session may not touch.',
          'What I did: hand-wrote `argTypes` for the component’s own props only, plus the',
          'three inherited ones the stories genuinely need. Did not add a `propFilter`.',
          'Why: config is off limits and the brief says to log it rather than fight the',
          'inference.',
          'What I need from Ben: **a `propFilter` in `.storybook/main.ts`**. Same entry as',
          'IconButton and CtaButton — one fix covers all three.',
          '',
          '## Switch — `checked` and `onCheckedChange` are inherited, not own props, but every state story needs them',
          'Where: `src/Switch.tsx:31`',
          'What I checked: Level 1. The component’s own interface declares only `label`,',
          '`labelHidden`, `reverse`, `accent`, `guided`, `showStateIcons`, `onGlyph`,',
          '`offGlyph` and `className`. `checked`, `disabled` and `onCheckedChange` all',
          'arrive from base-ui through the `Omit<>`.',
          'What I did: hand-wrote `argTypes` for the own props plus `checked`, `disabled`',
          'and `onCheckedChange`, because CONVENTIONS §5 requires every state to come from',
          'props and a Switch with no `checked` arg can only ever document one of its two',
          'states.',
          'Why: the batch note’s "own props only" is about suppressing the DOM surface, not',
          'about hiding the control’s value.',
          'What I need from Ben: nothing, just flagging the judgement call.',
          '',
          '## Switch — the dark-mode knob pair is written "Moon / Sun" in one place and "Sun / Moon" in the other',
          'Where: `stories/PROTOTYPE-USAGE.md`, "Switch" ("Knob glyphs are a **Moon / Sun**',
          'pair") vs `docs/07-components.md` §7.5 ("Sun / Moon for dark mode")',
          'What I checked: Level 1 says only that `onGlyph` shows when on and `offGlyph`',
          'when off; it does not name a dark-mode pair. Level 2 writes Moon first, Level 3',
          'writes Sun first, and neither says which slot it means.',
          'What I did: used `onGlyph={Moon}` / `offGlyph={Sun}` in the `DarkModePair` story —',
          'dark mode ON shows the moon.',
          'Why: it is the only reading in which the glyph describes the state it is shown',
          'in, which is what the prop’s own doc comment asks of a domain pair.',
          'What I need from Ben: **confirm the orientation**, and say which of the two',
          'documents is the one to correct.',
          '',
          '## Switch — has no invalid, loading, required or readOnly state, so those stories do not exist',
          'Where: `docs/07-components.md` §7.5 state matrix, `src/Switch.tsx:31-56`',
          'What I checked: Level 3 is explicit — loading is "N/A at component level" and',
          'error is "N/A. A switch cannot be invalid — either value is legal". Level 1',
          'declares no `required` and no `readOnly` of its own.',
          'What I did: wrote no `Loading`, `WithError`, `Required` or `ReadOnly` story for',
          'Switch.',
          'Why: the brief asks for those states "where they exist"; here they are documented',
          'as deliberately absent.',
          'What I need from Ben: nothing, just flagging so the omission does not read as a',
          'miss.',
          '',
          '## Switch — pairing it with FieldItem produces two labels for one control',
          'Where: `src/Switch.tsx:88-90` and `src/Field.tsx` `FieldItem`',
          'What I checked: Level 1. `Switch` always renders its own `<label htmlFor>`;',
          '`FieldItem` renders a second `<label htmlFor>` for the control it is given. Level',
          '3, §7.16, names Switch as FieldItem’s example control. Nothing reconciles the two.',
          'What I did: `FieldItem`’s Switch stories pass `labelHidden` to the Switch so only',
          'one label is visible. Both labels still point at the same control and both are',
          'still in the accessible name.',
          'Why: `labelHidden` is the only prop that reduces the duplication without editing',
          'a component.',
          'What I need from Ben: **a decision.** Either Switch needs a way to render no',
          'label at all, or FieldItem should not be documented as taking a Switch.',
        ].join('\n'),
      },
    },
  },
  args: {
    label: 'Dark mode',
    checked: false,
  },
  argTypes: {
    label: { control: 'text', description: 'Visible label text. Strongly preferred over labelHidden.' },
    labelHidden: { control: 'boolean', description: 'Hide the label visually. It stays in the accessible name.' },
    reverse: {
      control: 'boolean',
      description:
        'Label after the track instead of before, pushed to the far edge — the settings-row layout.',
    },
    accent: {
      control: 'inline-radio',
      options: ['primary', 'accent-placeholder1', 'accent-placeholder2'],
      description: 'Solved accent family. Literal placeholder names per Decision 3.',
    },
    guided: { control: 'boolean', description: 'Raise the row to --target-guided for assisted use.' },
    showStateIcons: {
      control: 'boolean',
      description:
        'Embedded knob glyphs. On by default per the brief; they are the non-colour cue for the on/off state (1.4.1).',
    },
    onGlyph: {
      control: false,
      description:
        'The knob glyph pair. Defaults to Check / X — the generic on/off reading. Pass a domain pair when the switch controls something the user pictures.',
    },
    offGlyph: { control: false, description: 'The off half of the knob glyph pair. Defaults to X.' },
    checked: { control: 'boolean', description: 'Controlled state. Inherited from base-ui Switch.Root.' },
    disabled: { control: 'boolean', description: 'Inherited from base-ui Switch.Root.' },
    onCheckedChange: { action: 'checkedChange', description: 'Fires with the new checked state.' },
    className: { control: false },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults, off — `primary` accent, label before the track, the
 *  Check / X knob pair. */
export const Default: Story = {};

/** On. Every state exists twice, once per checked value; the fill, the knob
 *  travel and the embedded glyph all move. */
export const Checked: Story = { args: { checked: true } };

/** All three accent families, on and off. The prototype uses
 *  `accent-placeholder1`. */
export const Accents: Story = {
  render: (args) => (
    <Stack>
      <Switch {...args} accent="primary" label="accent: primary (default) — off" checked={false} />
      <Switch {...args} accent="primary" label="accent: primary (default) — on" checked />
      <Switch {...args} accent="accent-placeholder1" label="accent: accent-placeholder1 — off" checked={false} />
      <Switch {...args} accent="accent-placeholder1" label="accent: accent-placeholder1 — on" checked />
      <Switch {...args} accent="accent-placeholder2" label="accent: accent-placeholder2 — off" checked={false} />
      <Switch {...args} accent="accent-placeholder2" label="accent: accent-placeholder2 — on" checked />
    </Stack>
  ),
};

/** `reverse` puts the label after the track and pushes it to the far edge —
 *  the settings-row layout, and the only layout the prototype uses. */
export const Reverse: Story = { args: { reverse: true } };

/** `guided` raises the ROW to `--target-guided`. The track never grows, because
 *  a 64px track would read as a slider. */
export const Guided: Story = { args: { guided: true, label: 'guided — 64px row' } };

/** `showStateIcons={false}`. The pair is decorative — a redundant cue for a
 *  state `role="switch"` already announces — so removing it is legitimate. */
export const WithoutStateIcons: Story = { args: { showStateIcons: false, checked: true } };

/** The prototype's own SETTINGS control: `reverse`, `accent-placeholder1`, a
 *  Moon / Sun domain pair instead of the Check / X default. */
export const DarkModePair: Story = {
  args: {
    label: 'Dark mode',
    reverse: true,
    accent: 'accent-placeholder1',
    onGlyph: Moon,
    offGlyph: Sun,
    checked: true,
  },
};

/** The other domain pair §7.5 names — Volume2 / VolumeX for the accompaniment
 *  sounds. */
export const SoundPair: Story = {
  args: { label: 'Accompaniment sounds', onGlyph: Volume2, offGlyph: VolumeX, checked: true },
};

/** The label goes out of sight, not out of the accessible name. A visible label
 *  is the documented preference (2.5.3); this is the exception. */
export const LabelHidden: Story = { args: { labelHidden: true } };

/** Disabled, off. The track takes `--interactive-primary-disabled`, the edge
 *  `--border-subtle`, the label `--on-surface-disabled`, and the knob loses its
 *  elevation. */
export const Disabled: Story = { args: { disabled: true } };

/** Disabled, on. Every state exists twice, and disabled is no exception. */
export const DisabledChecked: Story = { args: { disabled: true, checked: true } };

/** The longest label the settings screen could carry, in German — the row is a
 *  grid, so the label takes the remaining measure and the track holds its
 *  derived 60×32. */
export const LongLabel: Story = {
  args: {
    reverse: true,
    label: 'Begleitgeräusche während der Hörübung automatisch stummschalten',
  },
};
