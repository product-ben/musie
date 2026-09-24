/**
 * QrScanner — see stories/CONVENTIONS.md and the exemplar,
 * stories/SegmentedControl.stories.tsx.
 *
 * Docs text below is taken from the component's own header comment in
 * src/QrScanner.tsx. Nothing is invented.
 *
 * NO CAMERA IS INVOLVED IN ANY STORY. `mode` is a prop, so `live` and
 * `blocked` render here with no permission, no stream and no session — which
 * is the whole reason the component holds no media. What `live` cannot show is
 * a picture: the `<video>` has no stream, so the frame's own surface is what
 * the mask dims. `LiveOverAPicture` stands a photograph in for one, because
 * the mask's entire job is contrast over an image nobody chose.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Field } from '../src/Field';
import { CtaButton } from '../src/CtaButton';
import { QrScanner } from '../src/QrScanner';
import { bothThemes, fixedWidth } from './_decorators';

/* THE LABELS ARE THE APP'S, VERBATIM — apps/web/src/i18n/de.ts. Every one is a
   required prop with no default, so a story has to pass them; passing the real
   strings means the stories also show the German lengths the layout has to
   survive. */
const LABELS = {
  cameraLabel: 'Kamera, sucht nach einem QR-Code',
  scanLabel: 'Karte scannen',
  manualLabel: 'Code eingeben',
  hideCameraLabel: 'Kamera ausblenden',
  backLabel: 'Zurück zum Scannen',
};

/* A stand-in for a camera preview: an inline SVG data URI, so the story needs
   no asset and no network. Two flat halves, one near-white and one near-black,
   because the mask has to hold up over both — that is the case it exists for,
   and a photograph with a comfortable mid-tone would hide exactly the failure
   worth looking at. */
const PICTURE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='1'%3E%3Crect width='1' height='1' fill='%23fbf8f2'/%3E%3Crect x='1' width='1' height='1' fill='%2313100c'/%3E%3C/svg%3E\")";

const meta = {
  title: 'Components/QrScanner',
  component: QrScanner,
  decorators: [bothThemes],
  parameters: {
    docs: {
      description: {
        component: [
          'The viewfinder a paper card is held up to, and the two ways out of it.',
          '',
          '**It holds no camera, and that is the main decision.** The same split Record',
          'Button makes: that component draws the meter and never records, this one draws',
          'the frame and never calls `getUserMedia`. `mode` is passed in, `videoRef` is',
          'attached to the `<video>` this renders, and every press goes straight back out.',
          'So the app owns the stream, the decode loop, the permission prompt and the',
          'seven reasons a camera does not open — none of which a design system can have',
          'an opinion about — and this owns the picture. It also means all five states are',
          'reachable in Storybook with no camera, no permission and no session, which is',
          'the only way anybody ever looks at `blocked` on purpose.',
          '',
          '**Five modes, and the frame never moves between four of them.** `idle` (two ways',
          'in, centred in an otherwise empty frame), `starting` (the same two, the first of',
          'them spinning, so the frame does not reflow while somebody answers a permission',
          'prompt over the top of it), `live` (the preview, the mask, two icon controls',
          'bottom-right), `manual` (the typed-code form, inside the frame), `blocked` (why',
          'not, and what to do instead — never an apology).',
          '',
          '`manual` is the one that changes shape, and it has to: the frame is a square',
          'capped at five guided targets (320px), and a label, a field, a hint and two',
          'buttons do not fit in a 320px square on a phone. There the square is dropped and',
          'the box fits its form. The square matters while this is a viewfinder; a form has',
          'no reason to be one.',
          '',
          '**Nothing is written on the picture without a background under it.** The mask',
          'dims everything outside the card window (`--alpha-scrim`, the same token the',
          'Lightbox backdrop uses) and the corner brackets are drawn in `--on-scrim`, which',
          'is light in BOTH themes because the scrim is dark in both (token gap G3). The',
          'two icon controls are `secondary`, the one variant that carries an opaque',
          '`--surface-raised` and a `--border-strong` edge of its own.',
          '',
          'That is not decoration. L15 asks for contrast against every surface an indicator',
          'can land on, and a camera preview is not a surface with a colour — it is',
          'whatever the phone is pointed at, which is a white table as often as a dark',
          'room. Anything drawn plainly over it is legible half the time.',
          '',
          '**Every label is required.** No copy defaults, unlike Lightbox and Photo Upload.',
          'A default here would be German in an English session — and this is a screen',
          'somebody reaches while holding a physical card, where a control saying the wrong',
          'thing is worse than one saying nothing.',
        ].join('\n'),
      },
    },
  },
  args: {
    mode: 'idle',
    ...LABELS,
    /* The four handlers are REQUIRED props — a frame whose controls do nothing
       is not a scanner — so they are args rather than argTypes actions. `fn()`
       keeps them in the Actions panel, which is what an `action:` entry would
       otherwise have given. */
    onScan: fn(),
    onManual: fn(),
    onHideCamera: fn(),
    onBack: fn(),
  },
  argTypes: {
    mode: {
      control: 'select',
      options: ['idle', 'starting', 'live', 'manual', 'blocked'],
      description: 'Which of the five the frame is showing. Required — the component derives nothing.',
    },
    videoRef: { control: false, description: 'Attach to the <video> this renders while live. The consumer’s hook owns the stream; this owns the element.' },
    cameraLabel: { control: 'text', description: 'The preview’s accessible name — what a screen reader gets for a picture that has no alternative text to give.' },
    scanLabel: { control: 'text', description: 'Start the camera. The primary way in.' },
    manualLabel: { control: 'text', description: 'Type the code instead. Both a button (idle, blocked) and an icon control (live).' },
    hideCameraLabel: { control: 'text', description: 'Put the camera away, back to idle.' },
    backLabel: { control: 'text', description: 'Leave manual for the scanner again.' },
    onScan: { control: false, description: 'Start the camera, from idle or from a retryable blocked.' },
    onManual: { control: false, description: 'Show the typed-code form. Fired by a button and by an icon control.' },
    onHideCamera: { control: false, description: 'Put the camera away.' },
    onBack: { control: false, description: 'Leave the typed-code form.' },
    retryLabel: { control: 'text', description: 'Offer the camera again after a refusal — PRESENT means offer it. Not a boolean: whether a reason can change on this screen is the app’s knowledge.' },
    notice: { control: false, description: 'One sentence. Under the frame while live; inside it while blocked.' },
    children: { control: false, description: 'The typed-code form. Rendered inside the frame, in manual only.' },
    busy: { control: 'boolean', description: 'Something is already being looked up. Nothing new starts during it.' },
    loadingLabel: { control: 'text', description: 'Announced while the camera is opening. Defaults to the locale catalogue’s word through CTA Button.' },
    className: { control: false },
  },
} satisfies Meta<typeof QrScanner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The resting state: a dashed square holding nothing but the two ways in.
 *  No text — the step's own instructions sit above the frame, and the two
 *  buttons say what they do. */
export const Default: Story = {};

/** `idle` — the camera, primary, and typing the code, ghost, under it. The
 *  order is the one the step wants people to take. */
export const Idle: Story = { args: { mode: 'idle' } };

/** `starting` — the permission prompt is probably over the top of this. The
 *  same two buttons in the same places, the first of them spinning, so nothing
 *  reflows under a dialog somebody is reading. */
export const Starting: Story = { args: { mode: 'starting' } };

/** `live`, with no stream — which is what Storybook can produce, and it is
 *  still the honest geometry: the window, the four brackets, and the two
 *  controls bottom-right. The dimmed area here is the frame's own surface.
 *
 *  Look at the controls rather than the mask in this one: `secondary` is the
 *  variant that brings its own opaque pill, and this is the story that shows
 *  it doing that against a surface rather than against a picture. */
export const Live: Story = {
  args: { mode: 'live', notice: 'Halte den QR-Code deiner Karte in den Rahmen.' },
};

/** THE ONE THAT MATTERS: the mask over a picture with no mid-tone — half
 *  near-white, half near-black, which is the range a real preview covers when
 *  a card is held over a pale table in a dark room.
 *
 *  What to check: the brackets hold on BOTH halves, and the two controls do
 *  too. If either disappears on one side, the scrim is too light or `--on-scrim`
 *  has been resolved against the wrong end of the scale.
 *
 *  THE PICTURE HAS TO GO ON THE FRAME ITSELF, not on a wrapper: the frame
 *  carries an opaque `--surface-sunken`, which a real `<video>` covers and a
 *  background on anything outside it does not. That is what the `<style>`
 *  below is for, and it is the one place in these stories that reaches past a
 *  prop — a story standing a camera in has nothing else to reach for. */
export const LiveOverAPicture: Story = {
  args: { mode: 'live', notice: 'Halte den QR-Code deiner Karte in den Rahmen.' },
  render: (args) => (
    <div className="story-shot">
      <style>{`.story-shot .musy-scanner__frame--live {
        background-image: ${PICTURE};
        background-size: 100% 100%;
      }`}</style>
      <QrScanner {...args} />
    </div>
  ),
};

/** `live`, with the other sentence. One region, so this REPLACES the line
 *  above rather than appearing beneath it — one line of commentary, changing,
 *  not a growing list of advice. */
export const LiveWithAForeignCode: Story = {
  args: {
    mode: 'live',
    notice: 'Dieser QR-Code gehört nicht zu Musie. Der Code einer Karte sieht aus wie MC-01.',
  },
};

/** `manual` — the form inside the frame, and the way back out under it. The
 *  form is the CONSUMER's: the component contributes the box, the column and
 *  the return, and knows nothing about codes.
 *
 *  This is the mode that drops the square. */
export const Manual: Story = {
  args: { mode: 'manual' },
  render: (args) => (
    <QrScanner {...args}>
      <Field
        label="Kartencode"
        name="card-code"
        placeholder="MC-01"
        description="Der Code steht neben dem QR-Code auf der Karte, zum Beispiel MC-01."
      />
      <div>
        {/* PRIMARY: in this mode the form is the unit and this is its way
            on — see §7.4's "one primary per unit, and it is the way on". */}
        <CtaButton>Diese Karte nehmen</CtaButton>
      </div>
    </QrScanner>
  ),
};

/** `blocked`, refused. The sentence, and the one thing that still works — no
 *  retry, because offering to ask again is the app declining to take no for an
 *  answer. `retryLabel` is simply not passed.
 *
 *  TYPING THE CODE IS PRIMARY HERE. With the camera gone and no retry on
 *  offer it is the only way out of this state, and §7.4's rule gives the
 *  filled treatment to the way on. Compare `BlockedWithARetry`, where the
 *  same control is a ghost. */
export const BlockedAfterARefusal: Story = {
  args: {
    mode: 'blocked',
    notice: 'Die Kamera bleibt aus. Tippe stattdessen den Code ein, der auf deiner Karte steht.',
  },
};

/** `blocked`, for a reason that can change — another app had the camera. Here
 *  `retryLabel` IS passed, and the offer appears above the fallback.
 *
 *  AND THE PRIMARY MOVES TO IT. The retry is now the way back to the thing
 *  the person asked for, so it is filled and typing the code drops to a ghost
 *  beneath it — the same control, a different treatment, because the state
 *  around it changed. Never two primaries. */
export const BlockedWithARetry: Story = {
  args: {
    mode: 'blocked',
    notice: 'Eine andere App benutzt die Kamera. Schließe sie und versuch es noch einmal, oder tippe den Code von deiner Karte ein.',
    retryLabel: 'Kamera noch mal versuchen',
  },
};

/** `busy` — a code is already being looked up, so the camera does not start a
 *  second time. Typing stays available: the field is where the answer about
 *  the last code will appear. */
export const Busy: Story = { args: { mode: 'idle', busy: true } };

/** THE EDGE CASE, and the one to check first: Layer 1's phone reference at
 *  393px, with the longest sentence on the step — `cameraDecoder`, 130
 *  characters in German. The frame is capped at 320px, so this is the column
 *  the step actually gets on a phone. */
export const AtPhoneWidth: Story = {
  decorators: [fixedWidth(393)],
  args: {
    mode: 'blocked',
    notice: 'Der Code-Leser ließ sich nicht laden. Prüfe deine Verbindung und versuch es noch einmal, oder tippe den Code von deiner Karte ein.',
    retryLabel: 'Kamera noch mal versuchen',
  },
};
