/**
 * InteractiveWizard — the step run for a guided session.
 *
 * Docs text below is taken from the component's own header comment and from
 * docs/07-components.md §7.17. Nothing is invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DoorOpen, Headphones, MessageCircleQuestion, ScanLine } from 'lucide-react';
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
          '**And a fifth that is not on that line — `skipped`** (D14, answered',
          '2026-09-19). A step that is not part of THIS run: the rail still draws its',
          'marker, so every run reads structurally alike, but the number becomes a dash',
          'and the step is not reachable. Neither existing state could say it —',
          '`completed` draws a check for something nobody did, and `disabled` reads as',
          '"not yet" about a step that is never opening. Skipped steps are transparent',
          'to the reachability rule AND to the connector, or every step after one would',
          'be locked forever and the run could not be finished.',
          '',
          '**Narrow screens COLLAPSE rather than stack:** the step on screen keeps its',
          'label, every other step shrinks to its marker. Four stacked rows would spend',
          'on chrome exactly the height a phone needs for content. The hidden labels are',
          'moved out of sight, not removed, so a marker-only step still announces its',
          'name. `compact` forces the same collapse inside a narrow container, which no',
          'media query can see; `vertical` is the opt-in label-first variant for wide',
          'rails.',
          '',
          '**The state word is spoken, never drawn** (changed 2026-09-24, from user',
          'testing). Every label used to carry a second line under it — gesperrt /',
          'verfügbar / aktuell / erledigt / übersprungen — saying what the marker',
          'already says in ink, so every step read as two things where there was one.',
          'It cost no HEIGHT: measured before and after, the trigger is 60px either',
          'way, because the 44px marker sets the height and two short lines fit inside',
          'it. The case is redundancy, not room. The word now lives in the trigger’s',
          '`aria-label` —',
          '"Listen, current" — where it is the only carrier of state for a user who',
          'cannot see the marker. An `aria-label` rather than this package’s usual',
          'hidden span, because a hidden span is absolutely positioned and the name',
          'computation puts a space in front of the comma: "Listen , current",',
          'measured in Chromium. `stateWords`',
          'still overrides the five; `showStateWords` is gone, and so is the second',
          'line, which is why the remaining label sits centred against the marker.',
          '',
          '**A step can carry its own glyph instead of its number** (`icon`, added',
          '2026-09-24 from user testing). It replaces the NUMBER only: `completed`',
          'still swaps to a check and `skipped` to a dash, because that swap is what',
          'keeps the states apart without hue (1.4.1) — an icon that stayed put through',
          'completion would leave `active` and `completed` differing by fill alone. So',
          'a step’s own glyph says WHICH step it is, and the two universal glyphs say',
          'what happened to it. The 1.4.1 argument never rested on the number being a',
          'number; it rests on the glyph CHANGING.',
          '',
          '**The connector is a rule when the run is expanded and a DOT when it',
          'collapses** (2026-09-24, from user testing on a phone). Same element,',
          'same completion colour, two drawings. A long gap wants a line — it says',
          'these are one sequence and there is room to say it. A collapsed run is four',
          'circles almost touching, and three rules in those gaps read as a diagram:',
          'the eye follows a line looking for where it goes, and over 9px it goes',
          'nowhere. The swap follows the same condition the collapse does — under',
          '`--bp-md`, and wherever `compact` forces it — so `Compact` below shows dots',
          'at any width. `vertical` is the exception and keeps its rule, being the',
          'variant for a rail with room rather than one without.',
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
          '## InteractiveWizard — the two state-word questions, answered 2026-09-24',
          'Both entries that stood here are resolved and deleted per this block’s own',
          'rule. The doc comment described a `hideStateWords` prop that did not exist,',
          'and the default rendered a line the prototype never showed. Ben’s answer to',
          'both: the word is not drawn at all. It is screen-reader-only text now,',
          '`showStateWords` is removed, and the duplication this block flagged — the',
          'selected step announcing its position from the word AND from',
          '`aria-current="step"` — is unchanged and deliberate. See',
          'stories/OPEN-QUESTIONS.md for the entry.',
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
          '',
          '## InteractiveWizard — there is no *skipped* state — ANSWERED 2026-09-19',
          'Ben chose a FIFTH STATE over a deliberate reuse of `disabled`. Landed in D.0:',
          '`WizardStepState` gains `skipped`, `InteractiveWizardProps` gains `skipped`,',
          '`wizardStepState()` takes the ids and returns it, and `src/locale.ts` carries',
          'the word in both languages (übersprungen / skipped).',
          'The treatment is a DASH in the marker at --on-surface-disabled — the same ink',
          'as `disabled`, a different glyph. That is deliberate: both states are',
          'unreachable so neither should compete with the live run, and what tells them',
          'apart has to survive greyscale and forced colours (1.4.1), which a second grey',
          'would not. A dashed border and a strike-through were both considered and both',
          'read as an error rather than an omission.',
          'The connector is now folded along the run rather than read per step, so a',
          'skipped step no longer leaves a gap in the line either side of it. A run with',
          'nothing skipped renders exactly as before.',
          'It also let `apps/web/src/lib/sessionMachine.ts` delete its own two lines of',
          'skip logic: there is now one implementation of the rule, which is what',
          '`wizardSteps.ts` was extracted for.',
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
    steps: { control: false, description: 'The ordered steps. Each is { id, label, icon? } — `icon` is any Lucide component and replaces that step’s position NUMBER in the marker. Optional: a step without one draws its number, so an existing run is unchanged. Pass all of them or none; half a rail of numbers reads as a count with holes in it.' },
    current: {
      control: 'select',
      options: ['intro', 'scan', 'listen', 'reflect'],
      description: 'id of the step on screen.',
    },
    completed: { control: false, description: 'ids of finished steps. A completed step is always reachable.' },
    skipped: { control: false, description: 'ids that are NOT part of this run — D14. Derived by the consumer, never stored. Drawn with a dash, not reachable, and transparent to the reachability rule.' },
    onStepChange: { action: 'stepChange', description: 'Fires with the id of the step that was clicked.' },
    vertical: { control: 'boolean', description: 'Opt-in label-first stacking. Narrow screens collapse instead.' },
    compact: { control: 'boolean', description: 'Force the collapsed run inside a narrow container, which no media query can see.' },
    stateWords: { control: false, description: 'Override any of the five state words a step ANNOUNCES — they are screen-reader-only, never drawn. Each defaults to the locale catalogue — gesperrt / verfügbar / aktuell / erledigt / übersprungen in German, locked / available / current / done / skipped in English.' },
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

/**
 * ICONS INSTEAD OF NUMBERS, with Musie's own four. Step 1 is completed, so it
 * shows the CHECK rather than its door — which is the point of the rule that
 * the icon replaces only the number.
 */
export const Icons: Story = {
  args: {
    steps: [
      { id: 'intro', label: 'Intro', icon: DoorOpen },
      { id: 'scan', label: 'Select Card', icon: ScanLine },
      { id: 'listen', label: 'Listen', icon: Headphones },
      { id: 'reflect', label: 'Reflect', icon: MessageCircleQuestion },
    ],
  },
};

/** `vertical` is the opt-in label-first variant for wide rails. */
export const Vertical: Story = { args: { vertical: true } };

/** `compact` forces the collapsed run — the current step keeps its label, every
 *  other step shrinks to its marker. The hidden labels are moved out of sight,
 *  not removed. It is also what swaps the connecting rules for dots at a width
 *  where the media query would not: the two go together, because they answer
 *  the same question about how much room the run has. */
export const Compact: Story = { args: { compact: true } };

/**
 * WHAT EACH STEP ANNOUNCES. There is nothing to see here that `Default` does
 * not show — that is the point, and it is why the story is kept rather than
 * deleted with the `showStateWords` prop it used to set. The state word is the
 * tail of each trigger's `aria-label`, so the four buttons below carry the
 * accessible names:
 *
 *   "Intro, erledigt" · "Select Card, aktuell" · "Listen, verfügbar" ·
 *   "Reflect, gesperrt"
 *
 * Read them with the accessibility panel, or with a screen reader. A step that
 * has collapsed to its marker announces the same thing — the name is on the
 * button, so clipping the visible label cannot take it away.
 */
export const SpokenStateWords: Story = { args: { compact: true } };

/** The state words now default to the locale catalogue, so this story passes
 *  the same German the catalogue ships — what it demonstrates is that a
 *  per-call override still wins. Nothing here is visible: an override changes
 *  what the step ANNOUNCES. */
export const CustomStateWords: Story = {
  args: {
    stateWords: {
      disabled: 'gesperrt',
      active: 'verfügbar',
      selected: 'aktuell',
      completed: 'erledigt',
      skipped: 'übersprungen',
    },
  },
};

/**
 * A SKIPPED STEP — D14's case, and the reason the fifth state exists.
 *
 * Two of Musie's three exercises draw no card, so their `scan` step has nothing
 * to do and is not part of the run. The rail still shows four markers, so every
 * exercise reads structurally alike; `scan` carries a dash instead of its
 * number and cannot be reached.
 *
 * Note the connector: the line runs THROUGH the skipped step rather than
 * breaking either side of it, because the run does.
 */
export const StepSkipped: Story = {
  args: { current: 'listen', completed: ['intro'], skipped: ['scan'] },
};

/** The same run, finished. `scan` never completes — that is the whole point —
 *  and the run is still finishable, which before D.0 it was not. */
export const SkippedAndFinished: Story = {
  args: {
    current: 'reflect',
    completed: ['intro', 'listen', 'reflect'],
    skipped: ['scan'],
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
