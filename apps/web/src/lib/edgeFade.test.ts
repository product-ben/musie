/**
 * The fade says one thing: there is more of this row past that edge. Every
 * test below is a way of asking whether it can say that when there is not.
 */
import { describe, expect, it } from 'vitest';
import { fadeEdges } from './edgeFade';

describe('fadeEdges', () => {
  it('fades nothing when the row fits', () => {
    expect(fadeEdges(0, 300, 300)).toBe('none');
    expect(fadeEdges(0, 280, 300)).toBe('none');
  });

  /* THE ONE THAT MATTERS: a row that has not been scrolled has nothing past
     its leading edge, and fading there would soften a control that is flush
     against the window. */
  it('fades only the trailing edge before anything is scrolled', () => {
    expect(fadeEdges(0, 600, 300)).toBe('end');
  });

  it('fades only the leading edge at the far end', () => {
    expect(fadeEdges(300, 600, 300)).toBe('start');
  });

  it('fades both in the middle', () => {
    expect(fadeEdges(150, 600, 300)).toBe('both');
  });

  /* Sub-pixel layout, fractional trackpad deltas and a zoomed page all leave
     scrollLeft a hair short of the end. Without the slack the trailing fade
     never switches off, which is the fade claiming more content forever. */
  it('treats a sub-pixel gap at either end as arrival', () => {
    expect(fadeEdges(0.4, 600, 300)).toBe('end');
    expect(fadeEdges(299.6, 600, 300)).toBe('start');
  });

  it('counts a sub-pixel overflow as no overflow at all', () => {
    expect(fadeEdges(0, 300.5, 300)).toBe('none');
  });

  /* `scrollLeft` is negative in RTL in every current engine, and measured from
     the leading edge in both — so the same arithmetic has to answer both
     directions with no branch of its own. */
  it('reads a right-to-left scroller the same way', () => {
    expect(fadeEdges(-0, 600, 300)).toBe('end');
    expect(fadeEdges(-150, 600, 300)).toBe('both');
    expect(fadeEdges(-300, 600, 300)).toBe('start');
  });
});
