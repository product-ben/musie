/**
 * PhotoUpload — see stories/CONVENTIONS.md and the exemplar,
 * stories/SegmentedControl.stories.tsx.
 *
 * Docs text below is taken from the component's own header comment in
 * src/PhotoUpload.tsx and from docs/07-components.md §7.18. Nothing is
 * invented.
 *
 * NO OBJECT URLS. The component calls URL.createObjectURL only in its change
 * handler, and its effect revokes only a src that startsWith('blob:'). Every
 * story here passes a plain static path, so nothing is created and nothing is
 * revoked.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PhotoUpload } from '../src/PhotoUpload';
import type { UploadedPhoto } from '../src/PhotoUpload';
import { bothThemes, Stack } from './_decorators';

/* The prototype's own label and copy — METHOD FLOW · Reflect. */
const LABEL = 'Photo of your handwritten notes';
const DESCRIPTION = 'Nothing leaves your device until you share it.';

/* A STATIC path, never a blob: URL. The prototype's preview thumb is
   assets/web/method-card.png. */
const PHOTO: UploadedPhoto = {
  src: '/assets/web/method-card.png',
  name: 'method-card.png',
  size: 284_160,
};

const meta = {
  title: 'Components/PhotoUpload',
  component: PhotoUpload,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'Attach one image — in the reference flow, a photo of handwritten reflection',
          'notes.',
          '',
          'No APG pattern (a file input is a native control with its own affordances) and',
          'no base-ui primitive. The native `<input type="file">` **is** the control: it is',
          'visually hidden with `.musy-sr-only` and triggered by a real CTA Button, which',
          'is the only accessible way to dress a file input — the input is **displaced,',
          'never restyled**, so keyboard, focus, and the platform picker all behave exactly',
          'as the OS intends.',
          '',
          '**Composed, not re-declared.** The label, description and error here are §7.16',
          'Field’s `.musy-field__label` / `__description` / `__error`. Only the drop zone',
          'and the selected-file row are new, because only those are new.',
          '',
          '**Drop zone, not a drop-target-only.** Drag-and-drop is an enhancement layered',
          'over the button. Everything reachable by drop is reachable by click and by',
          'keyboard (2.1.1).',
          '',
          'The dashed edge is `--border-style-dashed` (token gap G2, staged) with',
          '`--border-subtle`, the documented "awaiting content" treatment — the same one',
          'Content Box uses. It is legal here because the zone’s affordance is the BUTTON',
          'inside it, not the boundary itself (1.4.11).',
          '',
          '`previewAlt` is required by the type because the preview is how the user',
          'confirms they attached the right page (1.1.1). The filename is the one place in',
          'the set where a single-line ellipsis is legal: a filename is a machine string',
          'the user already recognises, not copy they must read to make a choice, and the',
          'full string stays in the DOM.',
          '',
          '**Loading is N/A.** An upload in flight is the consuming app’s state.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-17. Delete once answered.',
          'This is not documentation._',
          '',
          '## PhotoUpload — the error is never referenced by `aria-describedby`',
          'Where: `src/PhotoUpload.tsx:130`, `:191-196`',
          'What I checked: Level 1. `aria-describedby` is set only when `description` is',
          'present, and the error `<div role="alert">` carries no `id`, so it can never be',
          'referenced. Level 3, §7.18’s state matrix lists the invalid state but its a11y',
          'notes do not mention the association.',
          'What I did: wrote `WithError` and `WithErrorAndDescription` stories that show the',
          'state as built.',
          'Why: the association is a component change.',
          'What I need from Ben: **a decision** — an a11y finding. `role="alert"` announces',
          'once on appearance; a user who tabs back to the input hears nothing.',
          '',
          '## PhotoUpload — `data-invalid` is only on the empty zone, so an error on a selected photo has no styling',
          'Where: `src/PhotoUpload.tsx:172` vs `:135-168`',
          'What I checked: Level 1. `data-invalid` is written on `.musy-upload__zone`;',
          '`.musy-upload__preview` gets `data-disabled` but never `data-invalid`. Level 3,',
          '§7.18’s anatomy shows `[data-invalid]` on the zone only, so the CSS and the docs',
          'agree — but "wrong file attached" is exactly the error a preview needs to carry.',
          'What I did: wrote `SelectedWithError` anyway, so the gap is visible.',
          'Why: the story documents the gap rather than hiding it.',
          'What I need from Ben: **a decision.**',
          '',
          '## PhotoUpload — §7.18 says the error renders a `Message`; the component renders `.musy-field__error`',
          'Where: §7.18 state matrix, "invalid → `[data-invalid]` … error Message below" vs',
          '`src/PhotoUpload.tsx:191-196`',
          'What I checked: Level 1, the component renders a bare div with an Icon and a',
          '`musy-sr-only` error word. Level 3, the docs say Message. `RadioGroupText`,',
          '`RadioGroupImage` and `RadioCards` do import `Message` for their `error` prop, so',
          'PhotoUpload is the odd one out.',
          'What I did: nothing.',
          'Why: the source is the authority on the API.',
          'What I need from Ben: nothing, just flagging — it interacts with the "Message is',
          'deleted" question already in this file.',
          '',
          '## PhotoUpload — stories pass a static `src`, never a `blob:` URL',
          'Where: `stories/PhotoUpload.stories.tsx`, the `PHOTO` constant',
          'What I checked: Level 1. `URL.createObjectURL` is called only in the change',
          'handler, and the revoke effect only touches a URL that `startsWith(\'blob:\')`.',
          'What I did: every story with a value uses `src: \'/assets/web/method-card.png\'`.',
          'Why: a story must not create or revoke an object URL; with a static path the',
          'effect’s `created.current` stays `null` and nothing is revoked.',
          'What I need from Ben: nothing, just flagging — the asset is the prototype’s own',
          '`assets/web/method-card.png` and will 404 until Storybook serves a static dir.',
        ].join('\n'),
      },
    },
  },
  args: {
    label: LABEL,
    previewAlt: LABEL,
    description: DESCRIPTION,
  },
  argTypes: {
    label: { control: 'text', description: 'Visible label. Required.' },
    name: { control: 'text', description: 'Identifies the file input when a form is submitted.' },
    value: { control: false, description: 'Controlled selection. `null` renders the empty zone.' },
    onValueChange: { action: 'valueChange', description: 'Fires with the new UploadedPhoto, or null when the photo is removed.' },
    previewAlt: { control: 'text', description: 'Required whenever a photo is shown: the preview carries meaning (1.1.1).' },
    accept: { control: 'text', description: 'File-type filter handed to the native input. Default `image/*`.' },
    description: { control: 'text', description: 'Field description, rendered as §7.16’s `.musy-field__description`.' },
    error: { control: 'text', description: 'Error text. Its presence sets aria-invalid on the input and [data-invalid] on the zone.' },
    disabled: { control: 'boolean', description: 'Disables the input, the choose/replace button and the remove button.' },
    required: { control: 'boolean', description: 'Marks the input required and renders an aria-hidden asterisk on the label.' },
    zoneText: { control: 'text', description: 'Copy. English defaults; the consumer localises. Default "Drag a photo here, or choose one from your device."' },
    chooseLabel: { control: 'text', description: 'Copy. English default "Choose photo".' },
    replaceLabel: { control: 'text', description: 'Copy. English default "Replace".' },
    removeLabel: { control: 'text', description: 'Copy. English default "Remove photo". The remove control’s accessible name.' },
    errorWord: { control: 'text', description: 'Copy. English default "Error". Screen-reader-only prefix on the error line.' },
    id: { control: false, description: 'Overrides the generated control id.' },
    className: { control: false },
  },
} satisfies Meta<typeof PhotoUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Component defaults, with the prototype's own copy: the empty drop zone, the
 *  dashed "awaiting content" edge, and the `secondary` Choose photo button that
 *  opens the platform picker. `value` defaults to `null`. */
export const Default: Story = {};

/** The empty zone with nothing else on it — no description, no error. */
export const EmptyZone: Story = { args: { description: undefined } };

/** A photo selected: the zone is replaced by the preview row — thumbnail, name,
 *  human-readable size, then Replace and Remove. */
export const Selected: Story = { args: { value: PHOTO } };

/** `size` is optional on `UploadedPhoto`; without it the meta row carries the
 *  filename alone. */
export const SelectedWithoutSize: Story = {
  args: { value: { src: PHOTO.src, name: PHOTO.name } },
};

/** The filename is the one place in the set where a single-line ellipsis is
 *  legal — the full string stays in the DOM. */
export const LongFileName: Story = {
  args: {
    value: {
      ...PHOTO,
      name: 'reflection-notes-written-during-the-quick-mindfulness-break-session.png',
    },
  },
};

/** `required` marks the native input required and renders an aria-hidden
 *  asterisk after the label. */
export const Required: Story = { args: { required: true } };

/** Invalid: `[data-invalid]` takes `--feedback-error-border` on the zone, and
 *  the error line renders below with `role="alert"`. */
export const WithError: Story = {
  args: { description: undefined, error: 'That file is not an image.' },
};

/** Error and description together. The error renders above the description, and
 *  only the description is wired into `aria-describedby` — see Build notes. */
export const WithErrorAndDescription: Story = {
  args: { error: 'That file is not an image.' },
};

/** An error while a photo is selected. The preview row carries no
 *  `[data-invalid]`, so only the error line below changes — see Build notes. */
export const SelectedWithError: Story = {
  args: { value: PHOTO, error: 'That photo is larger than 10 MB.' },
};

/** Disabled on the empty zone: `--interactive-primary-disabled` and
 *  `cursor: not-allowed`; drop is ignored as well as click. */
export const Disabled: Story = { args: { disabled: true } };

/** Disabled with a photo attached: the thumbnail drops to 50% and both preview
 *  actions are disabled. */
export const DisabledWithSelection: Story = {
  args: { value: PHOTO, disabled: true },
};

/** Every replaceable string at once, in German — the language the integration
 *  requirement names, and the half of the system this component does not
 *  default to. */
export const CopyOverrides: Story = {
  args: {
    label: 'Foto deiner handschriftlichen Notizen',
    previewAlt: 'Foto deiner handschriftlichen Notizen',
    description: 'Nichts verlässt dein Gerät, bis du es teilst.',
    zoneText: 'Zieh ein Foto hierher oder wähle eines von deinem Gerät.',
    chooseLabel: 'Foto wählen',
    replaceLabel: 'Ersetzen',
    removeLabel: 'Foto entfernen',
    errorWord: 'Fehler',
  },
};

/** The empty zone and the preview side by side — the two halves of the same
 *  control. */
export const BothStates: Story = {
  render: (args) => (
    <Stack>
      <PhotoUpload {...args} value={null} />
      <PhotoUpload {...args} value={PHOTO} />
    </Stack>
  ),
};
