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
import { CtaButton } from '../src/CtaButton';
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
function Panel({ title, body, innerRef, children }: {
  title: string; body: string;
  innerRef?: React.RefObject<HTMLElement | null>;
  children?: React.ReactNode;
}) {
  return (
    <section ref={innerRef} className="musy-snap-view" style={VIEW}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <p style={MUTED}>{body}</p>
      {children}
    </section>
  );
}

/** The two jumps side by side, so the difference is one tap apart. */
const ROW: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--space-gap-related)',
  alignItems: 'center',
};

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

/**
 * `withoutSnapping`, AND THE ONLY PLACE IT CAN BE SEEN FAIL.
 *
 * A button that scrolls you somewhere and a scroller that insists on a snap
 * position are two things wanting the same scroll, and on iOS the snap engine
 * wins: the jump LANDS on the next view and is then animated back to the one
 * it left. Reported from a phone, 2026-09-24, and fixed by holding the mode
 * off until the scroll has settled.
 *
 * ── IT REPRODUCES ON A PHONE AND NOWHERE ELSE ─────────────────────────────
 * Not in Chromium, and not in WebKit under automation either — measured at
 * 393×620, ×660 and ×844, with the toolbar resizing during and after the
 * scroll, and at a 24px root size. Every one of those lands and stays. So the
 * pair of buttons below is the test rig: the story cannot assert the
 * difference, but a thumb on a real iPhone can see it in one tap.
 *
 * The FIRST view's jump is the control in the experiment — it works either
 * way, because `useViewportFill` gives that view a `scroll-margin-block-start`
 * and therefore a snap RANGE rather than an exact position, and a scroll
 * leaving a range is not pulled back. Views two and three are exactly one
 * snapport each, which is where the fight happens.
 */
function JumpRun() {
  const { withoutSnapping } = useScrollSnap();
  /* THE SHAPE OF THE LISTEN STEP, not three bare panels — the asymmetry only
     exists if the first view measures itself. `useViewportFill` writes the
     offset that `.musy-snap-view` reads as `scroll-margin-block-start`, which
     is what gives that view a snap RANGE instead of an exact position. Without
     it all three would be exact and all three would fight. */
  const one = useViewportFill<HTMLElement>();
  const two = React.useRef<HTMLElement>(null);
  const three = React.useRef<HTMLElement>(null);

  /* The way every control in the app scrolls. */
  const guarded = (to: React.RefObject<HTMLElement | null>) => () => {
    const el = to.current;
    if (el !== null) withoutSnapping(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  /* The same jump with the mode left ON — what the app did before the fix, and
     what bounces on an iPhone. Here so the two can be compared by thumb. */
  const fought = (to: React.RefObject<HTMLElement | null>) => () => {
    to.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div>
      <h2 style={{ margin: 0 }}>Something above the run</h2>
      <p style={{ ...MUTED, marginBlockStart: 'var(--space-gap-related)' }}>
        The listen step&rsquo;s shape: a heading, then a run of views. Tap a pair of
        buttons and watch where you end up.
      </p>

      <Panel
        innerRef={one}
        title="View one, offset"
        body="Both buttons behave from here. This view measured itself, so it has a snap range rather than an exact position, and nothing pulls the jump back."
      >
        <div style={ROW}>
          <CtaButton onClick={guarded(two)}>Jump down · guarded</CtaButton>
          <CtaButton variant="secondary" onClick={fought(two)}>Jump down · unguarded</CtaButton>
        </div>
      </Panel>

      <Panel
        innerRef={two}
        title="View two"
        body="Here is where it shows. On an iPhone the unguarded jump reaches view three and is animated straight back to this one."
      >
        <div style={ROW}>
          <CtaButton onClick={guarded(three)}>Jump down · guarded</CtaButton>
          <CtaButton variant="secondary" onClick={fought(three)}>Jump down · unguarded</CtaButton>
        </div>
      </Panel>

      <Panel
        innerRef={three}
        title="View three"
        body="And the same going back up, which is the rail's case on the listen step."
      >
        <div style={ROW}>
          <CtaButton onClick={() => withoutSnapping(() => window.scrollTo({ top: 0, behavior: 'smooth' }))}>
            Back to the top · guarded
          </CtaButton>
          <CtaButton variant="secondary" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Back to the top · unguarded
          </CtaButton>
        </div>
      </Panel>
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
          '**Scroll from a control through `withoutSnapping`.** The hook returns it,',
          'and every scroll a BUTTON causes should go through it — a scroll a thumb',
          'makes should not, since being snapped is the point. It holds the mode off,',
          'runs the scroll, and puts it back once the scroll has settled (`scrollend`',
          'where the engine has it, a timer otherwise). Restoring cannot flicker: by',
          'then the scroll has arrived at a snap position, so there is nothing left to',
          'correct.',
          '',
          'Without it, on iOS, a programmatic smooth scroll away from a view that is',
          'exactly one snapport tall **lands and is then animated back**. A view with',
          'a `scroll-margin-block-start` — see **Offset** — has a snap *range* instead',
          'of an exact position and is not pulled back, which is why the first view of',
          'a run behaves and the rest do not. See **Jump**.',
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

/**
 * `withoutSnapping`, with the unguarded jump beside it for comparison.
 *
 * ON A DESKTOP BOTH BUTTONS BEHAVE IDENTICALLY, and that is not the story
 * failing — the defect is specific to iOS and did not reproduce under
 * automation in either engine. Open this on an iPhone: from **view two**, the
 * unguarded jump reaches view three and is animated back, and the guarded one
 * stays. From view one both behave, because that view has a snap range.
 */
export const Jump: StoryObj<typeof meta> = {
  render: () => <JumpRun />,
};
