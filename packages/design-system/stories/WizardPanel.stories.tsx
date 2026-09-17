/**
 * WizardPanel — Batch E. Exported from src/InteractiveWizard.tsx alongside
 * InteractiveWizard, which Batch C documented; the batch was fixed at five
 * files, so this one was left over and is written here.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WizardPanel } from '../src/InteractiveWizard';
import { CtaButton } from '../src/CtaButton';
import { ContentList } from '../src/ContentList';
import { bothThemes } from './_decorators';

const meta = {
  title: 'Components/WizardPanel',
  component: WizardPanel,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'The panel the wizard drives. Content Box geometry — **the wizard owns the',
          'header, not the body.**',
          '',
          'It renders `.musy-wizard__panel`, and an optional `.musy-wizard__actions`',
          'row below the body when `actions` is supplied. That is the whole',
          'component: it has no state, no variants and no props beyond its content.',
          '',
          'In the prototype every step of the METHOD FLOW wizard — Intro, Select Card,',
          'Listen, Reflect — is a panel, with the step\'s buttons in the actions row.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '**WizardPanel — no section of its own in docs/07-components.md.** §7.17',
          'covers InteractiveWizard and mentions the panel only in passing. The',
          'component\'s two-line source comment is the entire specification, so this',
          'page\'s prose is nearly all of what exists.',
          '',
          '**WizardPanel — nothing ties it to InteractiveWizard.** It takes no `step`,',
          'no `current` and no `id`, and the wizard does not render it. The two are',
          'coupled only by the `musy-wizard__` class prefix and by convention, so',
          'nothing stops a panel being used without a wizard or a wizard without a',
          'panel, and nothing associates the panel with the step it belongs to for',
          'assistive tech — there is no `aria-labelledby` back to the step trigger.',
          '',
          '**WizardPanel — the actions row has no alignment control.** §7.17 pairs it',
          'with the wizard, and the prototype uses `musy-wizard__actions` twice with',
          'different alignments, but the component exposes no prop; the CSS decides.',
          'Compare ButtonGroup, which takes `align` for the same job. Which of the two',
          'a wizard step should use is not recorded anywhere.',
        ].join('\n'),
      },
    },
  },
  args: {
    children: null,
  },
  argTypes: {
    children: { control: false, description: 'The panel body.' },
    actions: { control: false, description: 'The action row below the panel body.' },
    className: { control: false },
  },
} satisfies Meta<typeof WizardPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Body only. Without `actions` no action row is rendered at all. */
export const Default: Story = {
  args: {
    children: (
      <p data-type-step="body-md" style={{ margin: 0, maxWidth: 'var(--measure-body)' }}>
        Sit somewhere you can stay for the next fifteen minutes. You will need your
        Mindfulness Cards deck and something to listen with.
      </p>
    ),
  },
};

/** With an action row. The prototype's own Intro step: a ghost Back and a
 *  primary Continue. */
export const WithActions: Story = {
  args: {
    children: (
      <p data-type-step="body-md" style={{ margin: 0, maxWidth: 'var(--measure-body)' }}>
        Sit somewhere you can stay for the next fifteen minutes.
      </p>
    ),
    actions: (
      <>
        <CtaButton variant="ghost">Back</CtaButton>
        <CtaButton variant="primary">Continue</CtaButton>
      </>
    ),
  },
};

/** A single action. The prototype's Listen step ends this way. */
export const OneAction: Story = {
  args: {
    children: (
      <p data-type-step="body-md" style={{ margin: 0 }}>Ready when you are.</p>
    ),
    actions: <CtaButton variant="primary">Start Reflection</CtaButton>,
  },
};

/** Composed with another system component, which is the real usage — the
 *  prototype's Select Card step puts a ContentList in the body. */
export const WithContentList: Story = {
  args: {
    children: (
      <ContentList
        label="Your card"
        items={[
          { label: 'Your card', content: 'Where do I feel this in my body?' },
          { label: 'Listening instructions', content: 'Eyes closed, headphones on, and let the track finish before you answer.' },
        ]}
      />
    ),
    actions: (
      <>
        <CtaButton variant="secondary">Scan a different card</CtaButton>
        <CtaButton variant="primary">Complete Exercise with this card</CtaButton>
      </>
    ),
  },
};

/** An empty body. The panel still renders its own box, which is the case a
 *  step in flight produces. */
export const EmptyBody: Story = { args: { children: null } };

/** Long copy, to show the panel does not constrain its own measure — the body
 *  content carries `--measure-body` or it runs the full panel width. */
export const LongCopy: Story = {
  args: {
    children: (
      <p data-type-step="body-md" style={{ margin: 0 }}>
        This paragraph deliberately carries no max-width, so it runs the whole panel.
        Layer 1 sets --measure-body at 62ch for exactly this reason: the panel does
        not impose a measure on what you put inside it, so the content has to.
      </p>
    ),
    actions: <CtaButton variant="primary">Continue</CtaButton>,
  },
};
