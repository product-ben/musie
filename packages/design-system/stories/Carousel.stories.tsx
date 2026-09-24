/**
 * Carousel — one step of a sequence at a time.
 *
 * Docs text below is taken from the component's own header comment and from
 * section 8 of `src/musy-components.css`, which predates the component and is
 * where every geometry decision was made. Nothing is invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Heart, MessageSquare, Music, Send, Sparkles, User } from 'lucide-react';
import { Carousel } from '../src/Carousel';
import type { CarouselProps } from '../src/Carousel';
import { fixedWidth } from './_decorators';

/* ABOUT MUSIE — the prototype's five onboarding slides, verbatim, with the
   Lucide glyph each inline `path` corresponds to. */
const SLIDES = [
  { id: 'situation', title: 'You help me understand your situation', glyph: User },
  { id: 'recommend', title: 'I recommend you music based methods for your context', glyph: Sparkles },
  { id: 'listen', title: 'Curated music & instructions will trigger some things in you', glyph: Music },
  { id: 'reflect', title: 'I guide you through a reflection', glyph: MessageSquare },
  { id: 'share', title: 'If you want to, I help you share your thoughts', glyph: Send },
];

/** The three onboarding slides the app ships, in German, shared by every story
 *  that shows what `/` actually renders rather than what the component can do.
 *  Copy passed explicitly, like everywhere else here, so a story does not
 *  change meaning with Storybook's locale. */
const ABOUT_MUSIE: Partial<CarouselProps> = {
  accent: 'accent',
  label: 'Wie eine Session abläuft',
  slides: [
    { id: 'choose', title: 'Wähle mit Musie die Übung, die dich anzieht', glyph: Sparkles },
    { id: 'guide', title: 'Musie führt dich durch die Übung und eine Reflexion', glyph: Music },
    { id: 'understand', title: 'Fühle & verstehe dich selbst besser', glyph: Heart },
  ],
  previousLabel: 'Vorheriger Schritt',
  nextLabel: 'Nächster Schritt',
  dotAriaLabel: (position, total) => `Zu Schritt ${position} von ${total}`,
  slideLabel: (position, total, title) => `Schritt ${position} von ${total}: ${title}`,
};

const meta = {
  title: 'Components/Carousel',
  component: Carousel,
  /* The geometry is CONTAINER-relative — a slide is 66cqi of the carousel (68
     under the `@container` query at 420px), not of the window. In a full-width
     docs canvas the story would render a desktop carousel and quietly
     misreport both its slide width and its peek. Same reason RadioCards is
     fixed. */
  decorators: [fixedWidth(393)],
  parameters: {
    docs: {
      description: {
        component: [
          'APG: Carousel (basic — no auto-rotation, so no rotation control is owed).',
          'Semantic HTML: `<ol>`, because the order is the content; the scroll container',
          'IS the `<ol>` and each `<li>` is a slide labelled "n of m".',
          '',
          '**Purpose.** Show a sequence one step at a time with its neighbours peeking,',
          'so a five-step explainer costs one screen instead of a scroll.',
          '',
          '**It replaces Process Visualisation**, which is retired (B.1, answered',
          '2026-09-19). The `.musy-carousel` CSS shipped in the first pass with no',
          'component behind it; this is that component, and not one line of CSS was',
          'written for it.',
          '',
          '**The app owns the index; the component owns the scroller.** Fully controlled,',
          'the same split Music Player and Record Button make. That has a practical edge',
          'here: an onboarding CTA unlocks on the furthest slide ever SEEN, which is a',
          'fact about the session rather than about the carousel, and a component holding',
          'its own index could not express it.',
          '',
          '**Scrolling is native** — `scroll-snap` plus `overflow`, so touch drag and',
          'trackpad swipe work with no script. Two things are scripted: which slide is',
          'nearest the centre once a scroll settles, and a `scrollTo` when `index` changes',
          'from outside.',
          '',
          '**Three things say it can be swiped, and none of them is a sentence.** User',
          'testing on 2026-09-25 found that nobody discovered the gesture, and the cause',
          'was geometry rather than taste: at 393px the next card’s painted edge sat',
          '8.8px PAST the frame — a `82cqi` slide left a 4px sliver, and the off-centre',
          '`scale(0.9)` ate it — so the screen offered a dot row and a filled chevron and',
          'read, correctly, as a stepper.',
          '',
          '- **Peek.** `68cqi` and an `--sp-3` gap under 420px paint 27px of the next',
          '  card. Budgeted AFTER the scale, which is the arithmetic the first version',
          '  missed. Always present, and the only one of the three that survives reduced',
          '  motion.',
          '- **Nudge.** On a coarse pointer, the track drifts one `--motion-travel-lg`',
          '  toward the next slide and settles back, once, on mount. It animates the',
          '  `<li>`s, never the scroller — a transform on the viewport would fight',
          '  `scrollLeft` and the settle handler would report a slide nobody moved to.',
          '  Built from a travel token Layer 1 zeroes under `prefers-reduced-motion`, so',
          '  it flattens without a branch in the component.',
          '- **Grab.** A real mouse drag, with the `grab` / `grabbing` cursor that',
          '  advertises it. Mouse only: touch and trackpad already scroll natively, and',
          '  a mouse had no gesture for a horizontal scroller at all. Snapping is off for',
          '  the length of the drag (`mandatory` re-snaps after every `scrollLeft`',
          '  assignment and the track would jump), and the landing is clamped to one',
          '  slide either way — `scroll-snap-stop: always` written out in script, because',
          '  during the drag there is no snapping left to enforce it.',
          '',
          'A drag under 6px is delivered as a click, so tapping a peeking card still',
          'jumps to it.',
          '',
          '**And one subtraction: the chevrons’ emphasis follows the consuming screen’s',
          'GATE, not the pointer.** `nextVariant` is `primary` while going on is the only',
          'thing to do, and the screen hands it to `ghost` the moment its own CTA lights',
          'up. `/`’s explainer passes `seenAll ? \'ghost\' : \'primary\'`, so the chevrons go',
          'quiet in the same frame the CTA becomes the thing to press.',
          '',
          'This took three goes, and the middle two are the useful part of the record:',
          '',
          '1. `primary` forward throughout — the 2026-09-25 testing found it read as a',
          '   stepper and nobody swiped.',
          '2. `secondary` on a coarse pointer, overriding the consumer. Quieter, but an',
          '   outlined 44px circle is still a BOX, and two boxes bracketing the dots',
          '   still draw a stepper’s chrome.',
          '3. `ghost` on a coarse pointer. Quiet — and measured on a phone it cost the',
          '   flow: with nothing carrying forward momentum, walking three slides to',
          '   unlock the CTA stopped feeling like progress.',
          '',
          'So the pointer override is gone and `ghost` joined the union as the rung below',
          '`secondary`. **The nudge and the `grab` cursor are still pointer decisions** —',
          'a gesture genuinely differs by pointer; emphasis does not.',
          '',
          '**The leading control is derived, never passed:** one rung below the trailing',
          'one, so back can never be louder than forward. `primary` forward ⇒ `secondary`',
          'back; anything quieter ⇒ `ghost` back.',
          '',
          '**Demoted, never hidden**, and that is the accessibility half of the decision.',
          'The dots are `--target-min` (24px) and the chevron is `--target-primary`',
          '(44px); L5 says in as many words that 24px is "comfortable under a cursor and',
          'tight under a thumb". Hiding the 44px control on exactly the pointer that',
          'needs 44px would invert L5 — and on a screen that gates its CTA on reaching',
          'the last slide, it would cost a path to the CTA for the users least able to',
          'spare one. At every rung the target, the tab stop, the disabled logic and the',
          'accessible name are identical; `ghost` drops the fill and the border, and the',
          'glyph keeps `--interactive-ghost-on` (`--sand-12`), full-contrast ink, so',
          '1.4.11 is carried by the chevron rather than by the box that went.',
          '',
          '_Storybook runs on a fine pointer. The emphasis rungs all show in the canvas',
          '(see `GateClosed` and `GateOpened`), but **the nudge does not** — turn on',
          'Chrome’s device toolbar, which makes `(pointer: coarse)` match, and reload._',
          '',
          '**No smooth scroll, and that is the stylesheet’s decision.** A smooth scroll',
          'animation is silently dropped wherever reduced motion is in force, which would',
          'leave the dots and the viewport disagreeing about which slide is current.',
          'Programmatic changes land instantly and the card’s scale carries the',
          'transition.',
          '',
          '**Off-centre cards sit back by SCALE, never by opacity** — dimmed text would',
          'drop below 4.5:1 while still being read (1.4.3). Tapping a peeking card moves',
          'to it, but the card is a `<div>`, not a `<button>`: the dots are the',
          'accessible, focusable control for the same action, and a second set of tab',
          'stops announcing the same five destinations is noise.',
          '',
          '**The dots are 12px and the buttons are 24px** (2.5.8). The current dot is',
          'the same mark at 2:1 — 24px wide, the button’s own minimum — so the selected',
          'state is width AND fill rather than fill alone (1.4.1).',
          '',
          '**The dots carry no words.** The active one used to print its ordinal',
          '("Schritt 1") inside a pill; cut 2026-09-25. It was `aria-hidden`, so no',
          'screen reader ever heard it and nothing moved to the aria layer when it went —',
          'the dot button’s `aria-label` is `carouselGoTo` ("Go to step 1 of 3") and',
          'always was. `dotLabel` and the catalogue’s `carouselDot` and `stepPrefix` are',
          'gone with it.',
          '',
          '**What it is NOT.** Not a gallery (no captions, no zoom), not a tab list, not a',
          'progress indicator — nothing here says a step is done.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-19. Delete once answered.',
          'This is not documentation._',
          '',
          '## Carousel — the slide has a `body` in the prototype data and nowhere to put it',
          'Where: `reference/design_system/Musy MVP 0.3.dc.html`, `_onboarding`',
          'What I checked: each of the five prototype slides carries `title`, `body` and a',
          'glyph `path`. The card markup renders the badge and the title only, and',
          '`musy-components.css` section 8 declares `.musy-carousel__badge` and',
          '`.musy-carousel__title` and no third part. So the five `body` strings were',
          'written and never displayed, in the prototype as well as here.',
          'What I did: `CarouselSlide` is `{ id, title, glyph }`. No `body`.',
          'Why: adding a part the stylesheet has no rule for would be inventing a',
          'component, and L14’s first rule is that a screen does not get to do that',
          'either.',
          '',
          '**ANSWERED 2026-09-20 — CUT.** Ben’s decision: the five second lines go, and',
          'the card keeps a badge and a title. `CarouselSlide` is `{ id, title, glyph }`',
          'permanently, section 8 needs no body part, and the cards do not grow. The',
          'strings are deleted from the prototype’s `_onboarding` too — the only place',
          'they ever existed, because they were never rendered anywhere.',
          '',
          '## Carousel — `--icon-size-xxl` is still the open gap the badge works around',
          'Where: `src/musy-components.css`, `.musy-carousel__badge`',
          'What I checked: the stylesheet says so itself — "Layer 1 stops at',
          '`--icon-size-xl` (32px), so the optical weight comes from the badge around it,',
          'not from a larger glyph. [OPEN · G3] If onboarding wants a genuinely XXL glyph,',
          'Layer 1 needs `--icon-size-xxl` (48px). Not invented here."',
          'What I did: the component passes `size="xl"`, the largest rung that exists.',
          'Why: the note predates this component and is a Layer 1 decision.',
          'What I need from Ben: nothing urgent. Flagging that the `[OPEN · G3]` marker in',
          'that comment is NOT token gap G3 — G3 is `--interactive-ghost-border-hover`,',
          'which landed in D.0. Two different things wearing one label.',
        ].join('\n'),
      },
    },
  },
  args: {
    label: 'How a session works',
    slides: SLIDES,
    index: 0,
  },
  argTypes: {
    label: { control: 'text', description: 'Names the whole carousel. Required (4.1.2).' },
    slides: { control: false, description: 'The ordered slides. Each is { id, title, glyph }.' },
    index: { control: 'number', description: 'The centred slide, by position. Controlled.' },
    onIndexChange: { action: 'indexChange', description: 'Fires with the position the carousel has settled on, or been sent to.' },
    headingLevel: {
      control: 'inline-radio',
      options: [2, 3, 4, 5, 6],
      description: 'Heading level for each slide’s title. Never guessed (1.3.1).',
    },
    nextVariant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'ghost'],
      description:
        'The trailing control’s variant, on every pointer. `primary` while going on is the only thing to do; a screen with a gated CTA hands it to `ghost` the moment the gate opens. `secondary` is the middle rung and is what the pointer override used to force — kept in the union, not what `/` uses. The leading control is derived one rung below this and is never passed.',
    },
    accent: {
      control: 'inline-radio',
      options: ['primary', 'accent', 'accent-alt'],
      description: 'Which solved accent family paints the badge and the active dot.',
    },
    nudge: {
      control: 'boolean',
      description:
        'The one-shot nudge on mount. On by default. Already conditional on a coarse pointer, more than one slide and starting at the first — and on `--motion-travel-lg`, which is 0px under reduced motion. **Storybook renders on a fine pointer, so it will not play here unless the canvas is device-emulated.**',
    },
    previousLabel: { control: 'text', description: 'Defaults to the locale catalogue.' },
    nextLabel: { control: 'text', description: 'Defaults to the locale catalogue.' },
    slideLabel: { control: false, description: '(position, total, title) → the slide’s accessible name.' },
    dotAriaLabel: { control: false, description: '(position, total) → a dot button’s accessible name.' },
    className: { control: false },
  },
} satisfies Meta<typeof Carousel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The first slide, gate closed: the trailing control is `primary`, because
 *  moving on is the only thing to do on the screen until the run has been
 *  seen, and back is derived one rung below at `secondary`. See `GateOpened`
 *  for the other half of the pair. */
export const Default: Story = {};

/** Mid-run. Both controls are live and the neighbours peek on either side. */
export const MiddleSlide: Story = { args: { index: 2 } };

/** The last slide. `Next` is disabled, and a screen that has its own CTA hands
 *  the filled treatment over at exactly this point — see `NextHandedOver`. */
export const LastSlide: Story = { args: { index: 4 } };

/** The middle rung, `secondary`. This is what the retired pointer override
 *  forced on every touch device, and looking at it is the argument against it:
 *  two outlined circles bracketing the dots still draw a stepper's chrome.
 *  Kept in the union because a screen with no CTA of its own may want it; `/`
 *  does not use it. */
export const NextHandedOver: Story = {
  args: { index: 4, nextVariant: 'secondary' },
};

/**
 * GATE CLOSED, the first half of the pair `/` renders — `seenAll` is false, so
 * `nextVariant` is `primary` and the forward chevron carries the momentum.
 * Three slides, as the app ships them.
 */
export const GateClosed: Story = {
  args: { ...ABOUT_MUSIE, index: 0, nextVariant: 'primary' },
};

/**
 * GATE OPENED, the second half — `seenAll` has gone true, the screen's own CTA
 * has just become `primary`, and the chevrons get out of its way at `ghost`:
 * no fill, no border, the bare chevron.
 *
 * The two stories are one frame apart in the real screen, which is the point.
 * One thing takes the emphasis from the other; neither moment has both loud or
 * both quiet.
 *
 * What must be IDENTICAL to `GateClosed`: both buttons still 44px, still tab
 * stops, still named, and the leading one still disabled on the first slide.
 * Only the fill and the border go. If a control DISAPPEARS, something has
 * replaced the demotion with a `display: none` — the change this component
 * refused to make, for the reason in the docs above.
 */
export const GateOpened: Story = {
  args: { ...ABOUT_MUSIE, index: 2, nextVariant: 'ghost' },
};

/** All three accent families. Musie's onboarding uses `accent`. */
export const Accents: Story = { args: { index: 1, accent: 'accent' } };

/** `accent-alt` — the warning-safe family. */
export const AccentAlt: Story = { args: { index: 1, accent: 'accent-alt' } };

/** Two slides: the shortest run that is still a sequence. */
export const TwoSlides: Story = {
  args: { slides: SLIDES.slice(0, 2), index: 0 },
};

/** One slide. Both controls are disabled and the single dot is the whole
 *  indicator — legal, and a sign the carousel is the wrong component. */
export const OneSlide: Story = {
  args: { slides: SLIDES.slice(0, 1), index: 0 },
};

/**
 * The German strings, at the width they have to survive.
 *
 * German runs ~30% longer, and since the dots stopped carrying words the card's
 * title is the part that gives first — it is capped at `--measure-heading` and
 * hyphenates, and the narrow-container rule buys its measure back out of the
 * card's inline padding rather than out of the type. Passed explicitly here
 * rather than relying on the catalogue, so the story shows the same thing
 * whatever locale Storybook is in.
 */
export const GermanCopy: Story = {
  args: {
    index: 2,
    label: 'Wie eine Sitzung abläuft',
    slides: [
      { id: 'situation', title: 'Du hilfst mir, deine Situation zu verstehen', glyph: User },
      { id: 'recommend', title: 'Ich empfehle dir musikbasierte Methoden für deinen Kontext', glyph: Sparkles },
      { id: 'listen', title: 'Kuratierte Musik und Anleitungen lösen etwas in dir aus', glyph: Music },
      { id: 'reflect', title: 'Ich führe dich durch eine Reflexion', glyph: MessageSquare },
      { id: 'share', title: 'Wenn du magst, hilft dir Musie beim Teilen deiner Gedanken', glyph: Send },
    ],
    previousLabel: 'Vorheriger Schritt',
    nextLabel: 'Nächster Schritt',
    dotAriaLabel: (position: number, total: number) => `Zu Schritt ${position} von ${total}`,
    slideLabel: (position: number, total: number, title: string) =>
      `Schritt ${position} von ${total}: ${title}`,
  },
};

/** The same carousel in an 834px container — the tablet reference. A slide is
 *  66% of the CONTAINER, so this is the only way to see the wider anatomy. */
export const Tablet: Story = { args: { index: 2 }, decorators: [fixedWidth(834)] };

/**
 * THE PEEK, WHICH IS THE POINT OF THE 393px DECORATOR.
 *
 * Measured on the real onboarding screen: 27px of the next card, border and
 * the start of its badge. The value of looking at this story is the edge on
 * the right — if it is not there, the container is wider than 420px and the
 * `@container` rule is not the one being demonstrated.
 *
 * The three onboarding slides the app actually ships, so the story and the
 * screen say the same thing.
 */
export const AboutMusieToday: Story = { args: { ...ABOUT_MUSIE, index: 0 } };

/** The nudge turned off — what a second carousel further down a page gets, so
 *  the screen does not have two things moving for no reason. Static here
 *  either way: Storybook is a fine pointer. */
export const WithoutNudge: Story = { args: { nudge: false } };
