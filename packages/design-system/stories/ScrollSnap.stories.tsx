/**
 * useScrollSnap + `.musy-snap-view` — a run of full-viewport views, moved
 * through one at a time.
 *
 * Docs text below is taken from `src/useScrollSnap.ts`'s header and from the
 * SCROLL SNAP section of `src/musy-components.css`. Nothing is invented.
 *
 * ── WHY THIS FILE DEPARTS FROM CONVENTIONS.md, IN TWO WAYS ────────────────
 * Both are logged in `stories/OPEN-QUESTIONS.md` rather than quietly done.
 *
 *   1. It documents a HOOK, so there is no component, no `component:` on the
 *      meta and no `argTypes` — §1, §4 and the `satisfies Meta<typeof X>` rule
 *      all assume props. The panels below are the harness, not the subject.
 *   2. `singlePane` rather than §6's default `bothThemes`. The hook writes a
 *      mode onto `<html>`, and there is one of those per preview: two panes
 *      would be two runs of views inside one scroller, fighting over where it
 *      is allowed to stop. Same reason `Lightbox` uses it.
 *
 * THIS STORY IS THE ONLY PLACE THE BEHAVIOUR CAN BE EXERCISED. In the app it
 * lives on the listen step, behind a seeded exercise, an audio track and a
 * ninety-second gate; here it is three panels and a thumb. Flick hard: it
 * stops on the next one and will not run past it.
 */
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useScrollSnap } from '../src/useScrollSnap';
import { useViewportFill } from '../src/useViewportFill';
import { singlePane } from './_decorators';

/* Each panel is a full view, the same measure the listen step uses: the window
   less the app shell's sticky header, because a view that is SCROLLED TO has
   `<main>`'s insets behind it already. */
const VIEW: React.CSSProperties = {
  minBlockSize: 'var(--view-block-scrolled)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: 'var(--space-gap-stack)',
  borderBlockStart: 'var(--border-width-hairline) solid var(--border-subtle)',
};

const MUTED: React.CSSProperties = { margin: 0, color: 'var(--on-surface-muted)' };

/** One view in the run. `.musy-snap-view` is the whole of what makes it one. */
function Panel({ title, body, innerRef }: {
  title: string; body: string; innerRef?: React.RefObject<HTMLElement | null>;
}) {
  return (
    <section ref={innerRef} className="musy-snap-view" style={VIEW}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <p style={MUTED}>{body}</p>
    </section>
  );
}

/** Three views and nothing above them: each snaps to its own top. */
function PlainRun() {
  useScrollSnap();
  return (
    <div>
      <Panel title="View one" body="Flick down. The scroll stops here and goes no further." />
      <Panel title="View two" body="Going on takes a second, deliberate gesture." />
      <Panel title="View three" body="The last one. Flick back up the same way." />
    </div>
  );
}

/**
 * The same run, with something above it — the listen step's shape, where the
 * stage begins under an exercise name and a four-step rail.
 */
function OffsetRun() {
  useScrollSnap();
  /* The measuring half. It writes `--musy-fill-offset` onto this element, and
     `.musy-snap-view` reads it as `scroll-margin-block-start` — so the snap
     position is the top of the document rather than the top of the box. */
  const first = useViewportFill<HTMLElement>();
  return (
    <div>
      <h2 style={{ margin: 0 }}>Something above the run</h2>
      <p style={{ ...MUTED, marginBlockStart: 'var(--space-gap-related)' }}>
        Scroll down, then back up. You land here, with this heading on screen —
        not on the top edge of the view below it.
      </p>
      <Panel
        innerRef={first}
        title="View one, offset"
        body="Its snap position is the top of the document, not the top of this box."
      />
      <Panel title="View two" body="From here on the run behaves as it does without an offset." />
      <Panel title="View three" body="The last one." />
    </div>
  );
}

const meta = {
  title: 'Components/ScrollSnap',
  parameters: {
    docs: {
      description: {
        component: [
          'Turns the **document** into a snapping scroller for as long as a screen',
          'needs it, so a run of full-viewport views is moved through one at a time.',
          '',
          '`useScrollSnap()` sets a mode on `<html>` while its consumer is mounted and',
          'removes it on unmount, reference-counted so two overlapping screens cannot',
          'switch it off under each other. `.musy-snap-view` on each section carries',
          'the alignment and `scroll-snap-stop: always`, which is what caps a gesture',
          'at one view.',
          '',
          '**Not a component, and could not be.** `scroll-snap-type` belongs to the',
          'scroll container, and for views in normal document flow that container is',
          'the document — an element no component may own.',
          '',
          '**The other half of `useViewportFill`.** That hook answers how tall a view',
          'is; this one answers what stops a thumb running past it. One declaration',
          'joins them: `.musy-snap-view` reads `--musy-fill-offset`, so a view that',
          'measured its own offset snaps to the top of what is *above* it rather than',
          'to its own top. See **Offset**.',
          '',
          '`mandatory`, not `proximity`: the point is that going on takes another',
          'gesture. A view taller than the window relaxes its own snapping under the',
          'spec, so long copy can still be read through rather than thrown to an edge.',
          '',
          'The host declares `--musy-snap-inset` if it has fixed chrome over the top',
          'of the viewport; the system defaults it to `0`.',
          '',
          '---',
          '### Build notes',
          '',
          '_Temporary review scaffolding, added 2026-09-22. Delete once answered.',
          'This is not documentation._',
          '',
          'Two entries in `stories/OPEN-QUESTIONS.md`: this is the first story for a',
          'hook rather than a component, so CONVENTIONS.md §1/§4 do not describe it,',
          'and §6’s default `bothThemes` decorator cannot be used because there is one',
          '`<html>` per preview.',
        ].join('\n'),
      },
    },
  },
  decorators: [singlePane],
} satisfies Meta;

export default meta;

/** Three views, nothing above them. Each one's snap position is its own top. */
export const Default: StoryObj<typeof meta> = {
  render: () => <PlainRun />,
};

/**
 * The pairing with `useViewportFill`. The first view starts below a heading,
 * measures how far down that puts it, and snaps to the top of the page instead
 * of to its own top — so the heading is never scrolled off.
 */
export const Offset: StoryObj<typeof meta> = {
  render: () => <OffsetRun />,
};
