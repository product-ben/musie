/**
 * Badge — smoke story.
 *
 * ONE story, and it exists to prove the harness rather than to document the
 * component. Badge is the simplest thing in the set: no base-ui primitive, no
 * state, no controlled value — a <span> with a fill. So anything that fails
 * here is the Storybook wiring, not the component.
 *
 * What rendering this actually proves:
 *   · musy-components.css reached the preview  — .musy-badge has a fill
 *   · musy-foundations.css reached it          — that fill is a token
 *   · musy-fonts.css reached it                — the label is Inter, not a
 *                                                system fallback
 *   · data-theme was set before first paint    — light-dark() resolved light
 *   · Icon composes                            — the status variants render a
 *                                                Lucide glyph
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, BadgeRow } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Smoke/Badge',
  component: Badge,
};

export default meta;

/**
 * The four status variants plus the two neutrals. Each status badge carries a
 * German screen-reader status word ahead of its label — 'Hinweis', 'Warnung',
 * 'Erfolg', 'Fehler' — which is why the preview is lang="de".
 */
export const Smoke: StoryObj<typeof Badge> = {
  render: () => (
    <BadgeRow>
      <Badge variant="neutral">Neutral</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="info">Hinweis</Badge>
      <Badge variant="warning">Warnung</Badge>
      <Badge variant="success">Erfolg</Badge>
      <Badge variant="error">Fehler</Badge>
    </BadgeRow>
  ),
};
