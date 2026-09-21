/**
 * Carousel — one step of a sequence at a time.
 *
 * Docs text below is taken from the component's own header comment and from
 * section 8 of `src/musy-components.css`, which predates the component and is
 * where every geometry decision was made. Nothing is invented.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MessageSquare, Music, Send, Sparkles, User } from 'lucide-react';
import { Carousel } from '../src/Carousel';
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

const meta = {
  title: 'Components/Carousel',
  component: Carousel,
  /* The geometry is CONTAINER-relative — a slide is 66cqi of the carousel, not
     of the window, and the narrow rule is an `@container` query at 420px. In a
     full-width docs canvas the story would render a desktop carousel and
     quietly misreport its own slide width. Same reason RadioCards is fixed. */
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
          '**The dots are 12px and the buttons are 24px** (2.5.8). The active dot grows',
          'into a pill carrying its ordinal, capped at `--measure-heading` so a long',
          'German ordinal cannot push the row onto a second line.',
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
      options: ['primary', 'secondary'],
      description: 'The trailing control’s variant. A screen hands it down to `secondary` once its own CTA has unlocked — two filled primaries on one screen compete.',
    },
    accent: {
      control: 'inline-radio',
      options: ['primary', 'accent', 'accent-alt'],
      description: 'Which solved accent family paints the badge and the active dot.',
    },
    previousLabel: { control: 'text', description: 'Defaults to the locale catalogue.' },
    nextLabel: { control: 'text', description: 'Defaults to the locale catalogue.' },
    slideLabel: { control: false, description: '(position, total, title) → the slide’s accessible name.' },
    dotLabel: { control: false, description: 'The word riding inside the active dot — "Step 3".' },
    dotAriaLabel: { control: false, description: '(position, total) → a dot button’s accessible name.' },
    className: { control: false },
  },
} satisfies Meta<typeof Carousel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The first slide. The trailing control is `primary`, because moving on is the
 *  only thing to do on the screen until the run has been seen. */
export const Default: Story = {};

/** Mid-run. Both controls are live and the neighbours peek on either side. */
export const MiddleSlide: Story = { args: { index: 2 } };

/** The last slide. `Next` is disabled, and a screen that has its own CTA hands
 *  the filled treatment over at exactly this point — see `NextHandedOver`. */
export const LastSlide: Story = { args: { index: 4 } };

/** What the onboarding screen actually renders once its CTA unlocks: the
 *  carousel's own forward control steps back to `secondary`. */
export const NextHandedOver: Story = {
  args: { index: 4, nextVariant: 'secondary' },
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
 * German runs ~30% longer, and the dot pill is the part that gives first: it is
 * capped at `--measure-heading` precisely so a long ordinal cannot push the dot
 * row onto a second line. Passed explicitly here rather than relying on the
 * catalogue, so the story shows the same thing whatever locale Storybook is in.
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
    dotLabel: (position: number) => `Schritt ${position}`,
    dotAriaLabel: (position: number, total: number) => `Zu Schritt ${position} von ${total}`,
    slideLabel: (position: number, total: number, title: string) =>
      `Schritt ${position} von ${total}: ${title}`,
  },
};

/** The same carousel in an 834px container — the tablet reference. A slide is
 *  66% of the CONTAINER, so this is the only way to see the wider anatomy. */
export const Tablet: Story = { args: { index: 2 }, decorators: [fixedWidth(834)] };
