/**
 * The geometry — the three defects a reader would actually see, plus the one
 * nobody sees and everybody is misled by.
 *
 * The determinism test is the load-bearing one. `d3-force` reaches for
 * `Math.random()` whenever two nodes sit at identical coordinates, and a map
 * that is subtly different on every reload is the kind of bug that gets blamed
 * on the data.
 */
import { describe, expect, it } from 'vitest';
import { BASE, MIN_R, SPREAD, VIEW_IDS, clearance, layoutFor } from './orgLayout';
import { LINKS } from './orgModel';

describe('every view has the right shape', () => {
  it('draws one circle for the company and no lines', () => {
    const view = layoutFor('company');
    expect(view.circles).toHaveLength(1);
    expect(view.circles[0].count).toBe(100);
    expect(view.links).toHaveLength(0);
  });

  it('draws six departments and no lines', () => {
    const view = layoutFor('departments');
    expect(view.circles).toHaveLength(6);
    expect(view.circles.every((c) => c.kind === 'department')).toBe(true);
    expect(view.links).toHaveLength(0);
  });

  it('draws six departments, eighteen pods and twenty-eight lines', () => {
    const view = layoutFor('pods');
    expect(view.circles.filter((c) => c.kind === 'department')).toHaveLength(6);
    expect(view.circles.filter((c) => c.kind === 'pod')).toHaveLength(18);
    expect(view.links).toHaveLength(28);
    expect(view.links).toEqual([...LINKS]);
  });
});

describe('no two circles overlap', () => {
  it('holds in every view', () => {
    for (const view of VIEW_IDS) {
      const { circles } = layoutFor(view);
      for (let i = 0; i < circles.length; i += 1) {
        for (let j = i + 1; j < circles.length; j += 1) {
          expect(
            clearance(circles[i], circles[j]),
            `${view}: ${circles[i].id} / ${circles[j].id}`,
          ).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('size means what it looks like', () => {
  it('scales by area, so four times the people is twice the radius', () => {
    /* Payments has 9 and Quality has 4 — both above the floor, so both are
       honestly proportional. √(9/4) = 1.5. */
    const { circles } = layoutFor('pods');
    const payments = circles.find((c) => c.id === 'payments');
    const quality = circles.find((c) => c.id === 'quality');
    expect((payments?.r ?? 0) / (quality?.r ?? 1)).toBeCloseTo(1.5, 5);
  });

  it('is exactly BASE · √people for everything above the floor', () => {
    const { circles } = layoutFor('pods');
    for (const circle of circles.filter((c) => c.kind === 'pod')) {
      const honest = BASE * Math.sqrt(circle.count);
      if (honest < MIN_R) continue;
      expect(circle.r, circle.id).toBeCloseTo(honest, 5);
    }
  });

  it('clamps only the three-person pods, and only just', () => {
    /* The floor is a deliberate trade and this is its whole extent: if an edit
       makes it bite harder, the encoding stops being true somewhere a reader
       would notice. */
    const { circles } = layoutFor('pods');
    const clamped = circles.filter(
      (c) => c.kind === 'pod' && BASE * Math.sqrt(c.count) < MIN_R,
    );
    expect(clamped.map((c) => c.id).sort()).toEqual(['demand', 'finance', 'people']);
    for (const circle of clamped) {
      expect(MIN_R - BASE * Math.sqrt(circle.count)).toBeLessThan(2);
    }
  });

  it('draws departments as anchors in the pods view and as quantities in their own', () => {
    /* The pods ARE the department's people, so a headcount-sized hub would put
       the same 45 on the canvas twice. */
    const pods = layoutFor('pods').circles.filter((c) => c.kind === 'department');
    expect(new Set(pods.map((c) => c.r)).size).toBe(1);

    const departments = layoutFor('departments').circles;
    expect(new Set(departments.map((c) => c.r)).size).toBe(6);
    const eng = departments.find((c) => c.id === 'eng');
    const ops = departments.find((c) => c.id === 'ops');
    expect((eng?.r ?? 0) / (ops?.r ?? 1)).toBeCloseTo(Math.sqrt(45 / 6), 5);
  });
});

describe('the layout is deterministic', () => {
  it('produces identical coordinates on a second run, in every view', () => {
    /* THE `jiggle` GUARD. d3-force calls Math.random() to separate coincident
       nodes, so every node is seeded at a distinct position. If that ever
       stops being true, this is what says so. */
    for (const view of VIEW_IDS) {
      expect(layoutFor(view), view).toEqual(layoutFor(view));
    }
  });

  it('shows the same six departments in the same arrangement, one scaled', () => {
    /* THE CLAIM IS SIMILARITY, NOT IDENTITY. The Pods view packs the
       departments at SPREAD times their radius so their pods have somewhere to
       go, which makes every centre exactly SPREAD times as far from the
       middle — the same picture, enlarged. `fitView` then rescales it, so on
       screen the two tabs show the departments in the same places and
       switching does not reshuffle the part that did not change.

       Asserting identical coordinates instead is what this test did until the
       pack was rescaled, and it was asserting a coincidence. */
    const inPods = layoutFor('pods').circles.filter((c) => c.kind === 'department');
    const inDepartments = layoutFor('departments').circles;
    expect(inPods).toHaveLength(inDepartments.length);
    for (const node of inPods) {
      const twin = inDepartments.find((c) => c.id === node.id);
      expect(node.x, node.id).toBeCloseTo((twin?.x ?? NaN) * SPREAD, 5);
      expect(node.y, node.id).toBeCloseTo((twin?.y ?? NaN) * SPREAD, 5);
    }
  });

  it('packs the departments so they touch, in their own view', () => {
    /* What the rescaling bought. `pack()` returns tangent circles in its own
       scale; drawing them at ours without rescaling left visible gaps between
       six circles that should have been nested together. The tightest pair is
       now within a few pixels of touching rather than tens. */
    const circles = layoutFor('departments').circles;
    let tightest = Infinity;
    for (let i = 0; i < circles.length; i += 1) {
      for (let j = i + 1; j < circles.length; j += 1) {
        tightest = Math.min(tightest, clearance(circles[i], circles[j]));
      }
    }
    expect(tightest).toBeGreaterThan(0);
    expect(tightest).toBeLessThan(8);
  });
});

describe('a shared pod sits between its departments', () => {
  it('puts Growth nearer Engineering than its other two', () => {
    /* Growth is Eng 4 · P&D 1 · Mktg 2 — the link strength is the share, so
       it should settle closest to the department most of it comes from. This
       is the one visible consequence of weighting the links at all. */
    const { circles } = layoutFor('pods');
    const at = (id: string) => circles.find((c) => c.id === id);
    const growth = at('growth');
    const distance = (id: string) => Math.hypot(
      (growth?.x ?? 0) - (at(id)?.x ?? 0),
      (growth?.y ?? 0) - (at(id)?.y ?? 0),
    );
    expect(distance('eng')).toBeLessThan(distance('pd'));
    expect(distance('eng')).toBeLessThan(distance('mktg'));
  });
});
