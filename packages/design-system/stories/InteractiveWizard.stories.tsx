/**
 * InteractiveWizard — the step run for a guided session.
 *
 * Docs text below is taken from the component's own header comment and from
 * docs/07-components.md §7.17. Nothing is invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { InteractiveWizard } from '../src/InteractiveWizard';
import { bothThemes, Stack } from './_decorators';

/* METHOD FLOW — the prototype's four steps, verbatim and in order. */
const STEPS = [
  { id: 'intro', label: 'Intro' },
  { id: 'scan', label: 'Select Card' },
  { id: 'listen', label: 'Listen' },
  { id: 'reflect', label: 'Reflect' },
];

const meta = {
  title: 'Components/InteractiveWizard',
  component: InteractiveWizard,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'No APG pattern and no base-ui primitive: a wizard is navigation, so it is a',
          '`<nav>` containing an ordered list of buttons.',
          '',
          '**Purpose.** Move through the steps of a guided session, and show where you',
          'are.',
          '',
          '**The interactive sibling of Process Visualisation** — same step geometry, but',
          'each step is a real `<button>` and the step on screen carries',
          '`aria-current="step"`. Process Visualisation deliberately has no current-step',
          'state; keeping them apart is what stops a non-interactive explainer from',
          'growing a tap affordance.',
          '',
          '**Roving focus is NOT applied.** These are links-in-spirit, every one is a tab',
          'stop, which is what a user expects from a navigation region.',
          '',
          '**Reachability is the component’s rule, not the consumer’s.** Every completed',
          'step stays reachable, so going back is always allowed; the only unreachable',
          'step is one whose predecessors are unfinished. That rule lives here so two',
          'screens cannot disagree about it. There is no per-step state prop — pass',
          '`current` and `completed`, and the component derives the rest.',
          '',
          '**Four states, a progression rather than a palette:** disabled → active →',
          'selected → completed. Selection changes the marker FILL and the label WEIGHT;',
          'completion changes the GLYPH (number → check). No state rests on hue (1.4.1).',
          'The label weight follows `aria-current` rather than `data-state`, so a run',
          'whose selected step is also completed still shows where you are.',
          '',
          '**Narrow screens COLLAPSE rather than stack:** the step on screen keeps its',
          'label, every other step shrinks to its marker. Four stacked rows would spend',
          'on chrome exactly the height a phone needs for content. The hidden labels are',
          'moved out of sight, not removed, so a marker-only step still announces its',
          'name. `compact` forces the same collapse inside a narrow container, which no',
          'media query can see; `vertical` is the opt-in label-first variant for wide',
          'rails.',
          '',
          '**Accent families are whole families, not a hue swap:** ocher and purple are',
          'LIGHT solids and take dark ink where terracotta is a dark solid and takes',
          'light ink, so `-on` travels with `-subtle` or the selected marker’s number',
          'fails 1.4.3. Which of the three a screen should use is still undefined —',
          'conflict B12, open question 7.',
          '',
          '**What it is NOT.** Not a progress bar, not a tab list (tabs show sibling',
          'views; steps have an order and a gate), not Process Visualisation.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '## InteractiveWizard — `showStateWords`’s doc comment describes the opposite prop',
          'Where: `src/InteractiveWizard.tsx:70-71`',
          'What I checked: Level 1. The comment reads "Hide the state word under each',
          'label." The prop is `showStateWords`, it defaults to `true`, and `true` SHOWS',
          'the word: `{showStateWords && <span className="musy-wizard__hint">…}`. So the',
          'comment describes a `hideStateWords` prop that does not exist. Level 3’s props',
          'table gives the type and default correctly and offers no prose.',
          'What I did: wrote the argTypes description from the behaviour, not from the',
          'comment, and said so here.',
          'Why: CONVENTIONS §4 says the description is the prop’s own doc comment — but',
          'copying this one would document the inverse of what the prop does.',
          'What I need from Ben: **a fix in the source comment** (one line). This is the',
          'only place in Batch C where I could not use a doc comment verbatim.',
          '',
          '## InteractiveWizard — state words default ON, and the prototype renders none',
          'Where: `src/InteractiveWizard.tsx:88` vs PROTOTYPE-USAGE.md, "InteractiveWizard"',
          'What I checked: Level 1 defaults `showStateWords = true`. Level 2 says',
          'explicitly: "The prototype does **not** render state words under the labels."',
          'Level 3 lists the default as `true` without comment.',
          'What I did: `Default` shows the component default (words on) and',
          '`StateWordsHidden` shows the prototype’s actual appearance.',
          'Why: stories document what the component does; the default is the component’s.',
          'What I need from Ben: **a decision.** The system’s only consumer turns this off,',
          'which usually means the default is wrong. Note also that the state word is',
          'visible text INSIDE the trigger, so it joins the button’s accessible name —',
          '"Intro done", "Listen current" — and the selected step announces its position',
          'twice, once from the word and once from `aria-current="step"`. Flagging only;',
          'not fixed.',
          '',
          '## InteractiveWizard — no whole-component `disabled`, `error` or `emptyLabel`',
          'Where: `src/InteractiveWizard.tsx:60-84` (props)',
          'What I checked: Level 1. The only route to a disabled step is the derived',
          '`disabled` state — a step whose predecessors are unfinished — so a story cannot',
          'disable the run, or one arbitrary step, or the current one. There is also no',
          'validation surface and no empty state: `steps: []` renders `<nav><ol></ol>`,',
          'an empty labelled navigation region with nothing in it and no message. Level 3',
          'documents neither case.',
          'What I did: `StepsLocked` reaches the disabled state the only way the API',
          'allows, and `NoSteps` documents what an empty `steps` array actually renders.',
          'Why: the brief asks for disabled, error and empty states; three of them are not',
          'reachable through this component.',
          'What I need from Ben: **a decision** on the empty case. An empty `<nav>` with an',
          'accessible name is announced as a landmark containing nothing. Every other',
          'list-shaped component in the set takes an `emptyLabel`; this one does not.',
          '',
          '## InteractiveWizard — `WizardPanel` is exported from the same file and has no story',
          'Where: `src/InteractiveWizard.tsx:153-174`',
          'What I checked: Level 1 exports `WizardPanel` (`{ children, actions, className }`)',
          'alongside `InteractiveWizard`. Level 2 says the prototype uses it for every step',
          'body, with `musy-wizard__actions` holding the step’s buttons. CONVENTIONS §1',
          'says components exported from one source file get one story file EACH.',
          'What I did: nothing — this session’s brief fixes Batch C at exactly five files,',
          'named after the five components, and creating a sixth is forbidden.',
          'Why: the two instructions conflict and the file-count rule is the explicit one.',
          'What I need from Ben: **`WizardPanel` needs a story file** in the next pass. It',
          'is currently the only exported component in Batch C with no documentation at',
          'all.',
          '',
          '## InteractiveWizard — which accent a screen should use is undefined',
          'Where: `src/InteractiveWizard.tsx:76-82` (the prop’s own doc comment)',
          'What I checked: Level 1 says so itself: "Which of the three a screen should use',
          'is still undefined — conflict B12, open question 7." Level 2 records one usage,',
          '`accent`. Level 3 repeats the same sentence.',
          'What I did: `Default` uses the component default `primary`; `Accents` shows all',
          'three; nothing recommends one.',
          'Why: picking one would be a design decision.',
          'What I need from Ben: nothing new — this is conflict B12, already open.',
        ].join('\n'),
      },
    },
  },
  args: {
    label: 'Method steps',
    steps: STEPS,
    current: 'scan',
    completed: ['intro'],
  },
  argTypes: {
    label: { control: 'text', description: 'Names the navigation region. Required (4.1.2).' },
    steps: { control: false, description: 'The ordered steps. Each is { id, label }.' },
    current: {
      control: 'select',
      options: ['intro', 'scan', 'listen', 'reflect'],
      description: 'id of the step on screen.',
    },
    completed: { control: false, description: 'ids of finished steps. A completed step is always reachable.' },
    onStepChange: { action: 'stepChange', description: 'Fires with the id of the step that was clicked.' },
    vertical: { control: 'boolean', description: 'Opt-in label-first stacking. Narrow screens collapse instead.' },
    compact: { control: 'boolean', description: 'Force the collapsed run inside a narrow container, which no media query can see.' },
    showStateWords: {
      control: 'boolean',
      // The source comment says "Hide the state word"; true SHOWS it. See Build notes.
      description: 'Show the state word under each label. Default true.',
    },
    stateWords: { control: false, description: 'Override any of the four state words. Each defaults to the locale catalogue — gesperrt / verfügbar / aktuell / erledigt in German, locked / available / current / done in English.' },
    accent: {
      control: 'inline-radio',
      options: ['primary', 'accent', 'accent-alt'],
      description: 'Which solved accent family paints the markers, the current label and the completed connectors.',
    },
    className: { control: false },
  },
} satisfies Meta<typeof InteractiveWizard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults, with the prototype's four steps. Step 1 is completed,
 *  step 2 is current, steps 3 and 4 are reachable in turn. */
export const Default: Story = {};

/** All three accent families. The prototype's one usage is
 *  `accent`. */
export const Accents: Story = {
  render: (args) => (
    <Stack>
      <InteractiveWizard {...args} accent="primary" label="accent: primary (default)" />
      <InteractiveWizard {...args} accent="accent" label="accent: accent" />
      <InteractiveWizard {...args} accent="accent-alt" label="accent: accent-alt" />
    </Stack>
  ),
};

/** `vertical` is the opt-in label-first variant for wide rails. */
export const Vertical: Story = { args: { vertical: true } };

/** `compact` forces the collapsed run — the current step keeps its label, every
 *  other step shrinks to its marker. The hidden labels are moved out of sight,
 *  not removed. */
export const Compact: Story = { args: { compact: true } };

/** The prototype's actual appearance: no state words under the labels. */
export const StateWordsHidden: Story = { args: { showStateWords: false } };

/** The state words now default to the locale catalogue, so this story passes
 *  the same German the catalogue ships — what it demonstrates is that a
 *  per-call override still wins. */
export const CustomStateWords: Story = {
  args: {
    stateWords: {
      disabled: 'gesperrt',
      active: 'verfügbar',
      selected: 'aktuell',
      completed: 'erledigt',
    },
  },
};

/** The start of the run. Nothing is completed, so only step 1 is reachable and
 *  steps 2–4 are disabled — the only way the API reaches that state. */
export const StepsLocked: Story = { args: { current: 'intro', completed: [] } };

/** The end of the run. Every step is completed, so every step stays reachable
 *  and going back is always allowed. */
export const AllCompleted: Story = {
  args: { current: 'reflect', completed: ['intro', 'scan', 'listen', 'reflect'] },
};

/** Two steps — the shortest run that still reads as a sequence. */
export const TwoSteps: Story = {
  args: {
    steps: [
      { id: 'listen', label: 'Listen' },
      { id: 'reflect', label: 'Reflect' },
    ],
    current: 'reflect',
    completed: ['listen'],
  },
};

/** No steps. There is no `emptyLabel` on this component: an empty `steps` array
 *  renders an empty, named navigation landmark. See Build notes. */
export const NoSteps: Story = { args: { steps: [], current: '', completed: [] } };
