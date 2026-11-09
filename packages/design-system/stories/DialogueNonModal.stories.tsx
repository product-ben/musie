/**
 * DialogueNonModal — „Dialogue (non modal)“.
 *
 * Docs text below is taken from the component's own header comment and from
 * docs/07-components.md §7.26. Nothing is invented.
 *
 * Every story uses `singlePane`: the panel is portaled to the document root,
 * so two theme panes would fight over one panel. See CONVENTIONS §6.
 *
 * And every story renders in ITS OWN IFRAME on the docs page
 * (`docs.story.inline: false`). The panel is `position: fixed` to a corner of
 * the viewport, and inline on one docs page every open story would stack its
 * panel in the same corner of the same window.
 */
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Settings, User, Users } from 'lucide-react';
import { DialogueNonModal } from '../src/DialogueNonModal';
import { IconButton } from '../src/IconButton';
import { Switch } from '../src/Switch';
import { SegmentedControl } from '../src/SegmentedControl';
import { singlePane } from './_decorators';

/* The first use, in the harp's own words (harp/261104-1443: „Einstellungen
   öffnen“, „Einstellungen schließen“, „Vibration“) and the exercise copy the
   instruments migration ships for the harp (`mode_solo_*`, `mode_musie_*`). */
const TRIGGER = <IconButton glyph={Settings} label="Einstellungen öffnen" variant="secondary" />;

const ZUSAMMENSPIEL = (
  <SegmentedControl
    name="zusammenspiel"
    legend="Zusammenspiel"
    legendAsLabel
    value="with_musie"
    options={[
      {
        value: 'solo',
        label: 'Ich spiele allein',
        glyph: User,
        description: 'Die Harfe antwortet nicht. Spiel frei, so lange du magst.',
      },
      {
        value: 'with_musie',
        label: 'Ich spiele mit Musie',
        glyph: Users,
        description:
          'Machst du eine Pause, antwortet die Harfe. Sie greift etwas aus deinem Spiel auf, ohne es nachzuspielen. Ihre Saiten leuchten grün. Tippst du dazwischen, hört sie auf, und du bist wieder dran.',
      },
    ]}
  />
);

const WITH_VIBRATION = (
  <>
    <Switch size="sm" label="Vibration" checked />
    {ZUSAMMENSPIEL}
  </>
);

/**
 * WHERE THE TRIGGER STANDS in the instruments: on the sheet inset, in the
 * bottom corner the panel floats above. Presentation only — it puts the story's
 * trigger where the panel expects one, so the pairing can be seen.
 */
function Corner({ end = false, children }: { end?: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed',
        insetBlockEnd: 'var(--space-inset-sheet)',
        ...(end
          ? { insetInlineEnd: 'var(--space-inset-sheet)' }
          : { insetInlineStart: 'var(--space-inset-sheet)' }),
      }}
    >
      {children}
    </div>
  );
}

const meta = {
  title: 'Components/Dialogue (non modal)',
  component: DialogueNonModal,
  decorators: [singlePane],
  render: (args) => (
    <Corner end={args.placement === 'bottom-end'}>
      <DialogueNonModal {...args} />
    </Corner>
  ),
  parameters: {
    docs: {
      story: { inline: false, iframeHeight: 640 },
      description: {
        component: [
          'base-ui: Dialog (Root `modal={false}` / Trigger / Portal / Popup / Title /',
          'Description / Close). APG pattern: none of its own — the Modal Dialog',
          'pattern’s role, naming and focus handoff, without the containment.',
          '',
          '**Purpose.** A panel that comes forward WITHOUT taking the screen away.',
          'The page behind stays exactly as usable as it was: nothing is made inert,',
          'the scroll is not locked, there is no scrim, and Tab is not trapped — it',
          'walks out of the panel and on to whatever follows the control that opened',
          'it. What a dialogue still owes a keyboard and a screen reader, base-ui does',
          'here as it does for Lightbox: focus moves INTO the panel on open and back',
          'to the trigger on close, Escape closes, and the panel is named by its title',
          '(`role="dialog"`).',
          '',
          '**Why not Lightbox with a flag.** Lightbox’s whole contract is the modal',
          'one — scrim, inert background, scroll lock. This is the opposite promise:',
          'you keep playing, reading or scrolling while it is open. The instruments',
          'are the first use (Ben, 2026-11-09): the settings come up over the',
          'instrument and the instrument still sounds when you touch it, so a change',
          'can be HEARD while the panel that made it is still open.',
          '',
          '**It stays open until it is closed.** A press outside does not dismiss it,',
          'and neither does focus leaving it. base-ui’s default for a non-modal',
          'dialog is to close on both, which is right for a menu and wrong here. The',
          'ways out are the three a person can find on purpose — the close control,',
          'Escape, and the trigger again.',
          '',
          '**Where it floats.** A raised panel above the bottom edge, at the start or',
          'the end corner (`placement`). The band one `--target-primary` tall above',
          'the sheet inset is left free, because that is where the control that',
          'opened it stands — the instruments’ settings icon at the bottom left — and',
          'the panel sits above it rather than over it, so the trigger stays visible',
          'and keeps saying `aria-expanded="true"`.',
          '',
          '**`title` is required by the type:** a dialog with no name announces as',
          '"dialog" (4.1.2). **`description` is visible** here, unlike Lightbox’s,',
          'and hidden with the title when `titleHidden`.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-11-09. Delete once answered.',
          'This is not documentation._',
          '',
          'No open questions.',
        ].join('\n'),
      },
    },
  },
  args: {
    trigger: TRIGGER,
    title: 'Einstellungen',
    closeLabel: 'Einstellungen schließen',
    children: WITH_VIBRATION,
  },
  argTypes: {
    open: { control: 'boolean', description: 'Controlled open state. Omit for an uncontrolled dialogue the trigger opens.' },
    onOpenChange: { action: 'openChange', description: 'Fires with the requested open state.' },
    trigger: {
      control: false,
      description: 'The control that opens it, rendered through Dialog.Trigger — it gets aria-haspopup / aria-expanded and is where focus returns on close. Optional: omit it and drive `open`.',
    },
    title: { control: 'text', description: 'Accessible name. REQUIRED: a dialog with no name announces as "dialog" (4.1.2).' },
    titleHidden: { control: 'boolean', description: 'Hide the title visually. It stays in the accessible name.' },
    description: {
      control: 'text',
      description: 'One short sentence under the title, announced with it. Visible here, unlike Lightbox’s; hidden with the title when `titleHidden`.',
    },
    closeLabel: { control: 'text', description: 'Label for the close control. Defaults to the locale catalogue — “Schließen” unless the app mounts MusyLocaleProvider with another locale.' },
    children: { control: false, description: 'The panel’s content — the instruments’ Switch and SegmentedControl.' },
    placement: {
      control: 'inline-radio',
      options: ['bottom-start', 'bottom-end'],
      description: 'Which bottom corner it floats in. `bottom-start` by default.',
    },
    className: { control: false },
  },
} satisfies Meta<typeof DialogueNonModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults, uncontrolled: `open` is omitted, so base-ui owns the
 *  state and the trigger opens it. Only the trigger is on screen at rest. */
export const Default: Story = {};

/** Both corners. `bottom-start` is the instruments' case, above the settings
 *  icon at the bottom left; `bottom-end` mirrors it. Both are logical, so they
 *  swap sides in a right-to-left document. */
export const Placements: Story = {
  render: (args) => (
    <>
      <Corner>
        <DialogueNonModal {...args} open placement="bottom-start" title="bottom-start (default)" />
      </Corner>
      <Corner end>
        <DialogueNonModal {...args} open placement="bottom-end" title="bottom-end" />
      </Corner>
    </>
  ),
  args: { children: ZUSAMMENSPIEL },
};

/** The instruments' settings where the device can vibrate: a `sm` Switch for
 *  „Vibration“, then „Zusammenspiel“ with the selected option's description
 *  under it. */
export const WithVibrationSwitch: Story = { args: { open: true, children: WITH_VIBRATION } };

/** `top-end`: under a trigger in the top bar, beside a sheet's X — where the
 *  instruments' settings icon moved (Ben, 2026-11-09). It falls in from
 *  above rather than rising. */
export const TopEnd: Story = { args: { open: true, placement: 'top-end', children: WITH_VIBRATION } };

/** The same settings where it cannot — no `navigator.vibrate` and no iOS
 *  switch haptic — so the Switch is not offered at all and „Zusammenspiel“
 *  stands alone. */
export const WithoutVibrationSwitch: Story = { args: { open: true, children: ZUSAMMENSPIEL } };

/** `description` is visible here, set like Field's description under the
 *  title, and announced with it. The sentence is the PRD's own rule for these
 *  settings — one state per session — not shipped copy. */
export const WithDescription: Story = {
  args: {
    open: true,
    description: 'Die Einstellungen gelten für diese Session.',
  },
};

/** The title leaves the screen, not the accessible name; the close control
 *  still takes the trailing edge. A description goes with it. */
export const TitleHidden: Story = { args: { open: true, titleHidden: true } };

/** Controlled open — `open` is an arg, so the state is inspectable rather than
 *  reached by clicking. The page behind stays live: nothing is inert, nothing
 *  is dimmed, nothing is locked. */
export const Open: Story = { args: { open: true } };

/** Controlled closed. The trigger is rendered, the panel is not; clicking will
 *  not open it, because the state is the story's, not the component's. */
export const Closed: Story = { args: { open: false } };
