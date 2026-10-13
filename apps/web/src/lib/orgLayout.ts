/**
 * WHERE THE CIRCLES GO — one pure function per view.
 *
 * Output is in plain pixels against an arbitrary origin, because React Flow
 * takes absolute node positions and `fitView` does the scaling. Nothing here
 * knows the size of the viewport, and nothing re-runs on resize.
 *
 * ── AREA CARRIES HEADCOUNT ────────────────────────────────────────────────
 * `r = BASE · √people`. Putting the quantity on the radius is the single most
 * common way a bubble chart lies: it would make a 45-person department look
 * fifty-six times a 6-person one instead of seven and a half.
 *
 * ── TWO DIFFERENT LAYOUT PROBLEMS, TWO DIFFERENT TOOLS ───────────────────
 * The Departments view is a hierarchy — six leaves under one root — and
 * `d3-hierarchy`'s `pack()` is exactly the tool for it.
 *
 * The Pods view is NOT a hierarchy. A pod draws on several departments, so it
 * has no single parent to nest under, and no packing algorithm can express it.
 * That view is a graph: `pack()` only places the six departments, which are
 * then PINNED, and `d3-force` settles the pods around them with link strength
 * proportional to how many people each pod takes from each department. Growth
 * (Eng 4 · P&D 1 · Mktg 2) therefore lands nearest Engineering rather than at
 * the centre of its three departments, which is both truer and easier to read.
 *
 * ── THE SIMULATION IS RUN, NOT ANIMATED ───────────────────────────────────
 * `stop()` then a fixed number of synchronous `tick()`s. React never sees an
 * intermediate frame, the positions are computed once per view, and nothing
 * re-renders sixty times a second to arrive where it was always going.
 */
import { hierarchy, pack } from 'd3-hierarchy';
import { forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3-force';
import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';
import { COMPANY_NODE, DEPARTMENT_NODES, LINKS, POD_NODES, linksOfPod } from './orgModel';
import type { NodeKind, OrgLink, OrgNode } from './orgModel';

export type ViewId = 'company' | 'departments' | 'pods';

export const VIEW_IDS: readonly ViewId[] = ['company', 'departments', 'pods'] as const;

export interface PlacedCircle extends OrgNode {
  x: number;
  y: number;
  r: number;
}

export interface OrgView {
  circles: PlacedCircle[];
  links: OrgLink[];
}

/* ═══ SIZES ═════════════════════════════════════════════════════════════════ */

/** `r = BASE · √people`. 100 people → 200px; 3 people → 34.6px. */
const BASE = 20;

/**
 * The smallest a circle may be drawn, whatever its headcount.
 *
 * BELOW THIS THE AREA ENCODING STOPS BEING TRUE, and that is a deliberate
 * trade rather than an oversight: a 3-person pod comes out at 34.6px of radius
 * and cannot hold the word "Finance" at the type floor. Only the three
 * 3-person pods clamp, and they clamp by under two pixels — small enough that
 * nothing visibly lies, large enough that nothing is illegible.
 * `orgLayout.test.ts` holds the proportionality for everything above the floor.
 */
const MIN_R = 36;

/**
 * A department in the PODS view is an anchor, not a quantity.
 *
 * Its pods are its people — drawing a 45-person circle with its own 45 people
 * orbiting it would put the same headcount on the canvas twice. So there the
 * department is a fixed, modest disc carrying its name and total as text, and
 * the area encoding belongs to the pods alone. In the DEPARTMENTS view, where
 * there are no pods to double it, the department is sized normally.
 *
 * 66 AND NOT 58, from looking at it: at 58 a department sat inside the range
 * the pods already occupy (36–60) and stopped reading as the thing they hang
 * off. It is now larger than every pod, which is the one visual claim an
 * anchor has to make.
 */
const ANCHOR_R = 66;

function radiusOf(count: number): number {
  return Math.max(MIN_R, BASE * Math.sqrt(Math.max(count, 0)));
}

/* ═══ THE SIMPLE TWO ════════════════════════════════════════════════════════ */

function companyView(): OrgView {
  return {
    circles: [{ ...COMPANY_NODE, x: 0, y: 0, r: radiusOf(COMPANY_NODE.count) }],
    links: [],
  };
}

/**
 * Six leaves under one root, packed — and then RESCALED, which is the part
 * that is easy to get wrong.
 *
 * `pack()` computes its own radii and squeezes them into the box it is given,
 * so its circles are tangent in ITS scale and not in ours. Drawing them at our
 * radii against its positions is what put visible gaps between six circles
 * that should have been touching: two different scales, one picture.
 *
 * Because `pack()` makes `r ∝ √value` and the value handed to it is our radius
 * squared, the two scales differ by one constant factor for every leaf. So the
 * factor is read off a single leaf and applied to every position, about the
 * centre of the pack. Nothing approximates and nothing is tuned.
 *
 * (That holds only while no department hits `MIN_R` — the floor would break
 * the proportion. The smallest department is Operations at 6 people, which is
 * a radius of 49, so there is room to spare. `orgLayout.test.ts` asserts the
 * ratio the floor would quietly break.)
 */
function packDepartments(radiusFor: (node: OrgNode) => number): Map<string, { x: number; y: number }> {
  const root = hierarchy<{ id: string; node?: OrgNode; children?: unknown[] }>(
    { id: 'root', children: DEPARTMENT_NODES.map((node) => ({ id: node.id, node })) },
    (d) => d.children as { id: string; node?: OrgNode }[] | undefined,
  ).sum((d) => (d.node === undefined ? 0 : Math.pow(radiusFor(d.node), 2)));

  const box = 1000;
  const laid = pack<{ id: string; node?: OrgNode }>().size([box, box]).padding(2)(root as never);

  const leaves = laid.leaves().filter((leaf) => leaf.data.node !== undefined);
  const out = new Map<string, { x: number; y: number }>();
  if (leaves.length === 0) return out;

  const reference = leaves[0];
  const scale = reference.r === 0
    ? 1
    : radiusFor(reference.data.node as OrgNode) / reference.r;

  const half = box / 2;
  for (const leaf of leaves) {
    out.set((leaf.data.node as OrgNode).id, {
      x: (leaf.x - half) * scale,
      y: (leaf.y - half) * scale,
    });
  }
  return out;
}

/**
 * How much room a department is packed with in the PODS view.
 *
 * In the Departments view a department is packed at its own radius and the six
 * circles end up touching, which is what `pack()` is for. In the Pods view the
 * same six have to hold their pods in the space between them, so they are
 * packed at twice the radius and then drawn at the anchor size — the
 * territory is sized by headcount, the disc is not.
 */
const SPREAD = 2;

function departmentsView(): OrgView {
  const centres = packDepartments((node) => radiusOf(node.count));
  return {
    circles: DEPARTMENT_NODES.map((node) => {
      const at = centres.get(node.id) ?? { x: 0, y: 0 };
      return { ...node, x: at.x, y: at.y, r: radiusOf(node.count) };
    }),
    links: [],
  };
}

/* ═══ THE PODS VIEW ═════════════════════════════════════════════════════════ */

interface SimNode extends SimulationNodeDatum {
  id: string;
  kind: NodeKind;
  r: number;
}

/**
 * How far apart two nodes are allowed to settle, and how hard the simulation
 * is run. All four are tuned by looking at the result, which is the only way
 * force parameters are ever chosen honestly.
 */
const LINK_GAP = 34;
const COLLIDE_GAP = 18;
const CHARGE = -220;
const TICKS = 400;

/**
 * The golden angle, for seeding.
 *
 * ── THIS IS WHAT MAKES THE LAYOUT DETERMINISTIC ──────────────────────────
 * `d3-force` is deterministic in every respect but one: `jiggle` calls
 * `Math.random()` to separate two nodes that sit at exactly the same
 * coordinates. Link, collide and many-body all use it.
 *
 * So no two nodes are ever allowed to start coincident. Each pod is seeded at
 * the weighted centroid of its own departments — which is already roughly
 * where it belongs, so the simulation converges faster — plus an offset along
 * a golden-angle spiral unique to its index. `jiggle` never fires, and
 * `orgLayout.test.ts` runs the whole layout twice and compares coordinates in
 * case that reasoning is wrong.
 */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function podsView(): OrgView {
  /* Departments are packed by the room their pods will need — their headcount,
     times SPREAD — and then drawn at the fixed anchor size. Engineering gets
     the widest territory because it has the most people in it, not because its
     disc is bigger. */
  const centres = packDepartments((node) => radiusOf(node.count) * SPREAD);

  const departments: SimNode[] = DEPARTMENT_NODES.map((node) => {
    const at = centres.get(node.id) ?? { x: 0, y: 0 };
    return {
      id: node.id, kind: 'department', r: ANCHOR_R,
      x: at.x, y: at.y, fx: at.x, fy: at.y,
    };
  });
  const byId = new Map(departments.map((d) => [d.id, d]));

  const pods: SimNode[] = POD_NODES.map((node, index) => {
    const links = linksOfPod(node.id);
    const weight = links.reduce((total, link) => total + link.people, 0);
    let cx = 0;
    let cy = 0;
    for (const link of links) {
      const department = byId.get(link.target);
      if (department === undefined) continue;
      cx += (department.x ?? 0) * link.people;
      cy += (department.y ?? 0) * link.people;
    }
    if (weight > 0) { cx /= weight; cy /= weight; }

    /* The deterministic offset. Distinct per index, so nothing starts on top
       of anything else and `jiggle` never runs. */
    const angle = index * GOLDEN_ANGLE;
    const spread = 40 + index * 7;
    return {
      id: node.id, kind: 'pod', r: radiusOf(node.count),
      x: cx + Math.cos(angle) * spread,
      y: cy + Math.sin(angle) * spread,
    };
  });

  const nodes = [...departments, ...pods];
  const simLinks: SimulationLinkDatum<SimNode>[] = LINKS.map((link) => ({
    source: link.source,
    target: link.target,
  }));

  const simulation = forceSimulation(nodes)
    .force('link', forceLink<SimNode, SimulationLinkDatum<SimNode>>(simLinks)
      .id((node) => node.id)
      .distance((link) => {
        const source = link.source as SimNode;
        const target = link.target as SimNode;
        return source.r + target.r + LINK_GAP;
      })
      /* Strength by SHARE of the pod, not by headcount: a pod is pulled
         hardest toward the department most of it comes from, and a pod that
         is split evenly is pulled evenly. Using raw people would make big
         pods cling harder than small ones for no reason a reader could see. */
      .strength((link) => {
        const source = link.source as SimNode;
        const pod = POD_NODES.find((node) => node.id === source.id);
        const edge = LINKS.find(
          (l) => l.source === source.id && l.target === (link.target as SimNode).id,
        );
        if (pod === undefined || edge === undefined || pod.count === 0) return 0.3;
        return 0.2 + 0.8 * (edge.people / pod.count);
      }))
    .force('charge', forceManyBody<SimNode>().strength(CHARGE))
    .force('collide', forceCollide<SimNode>().radius((node) => node.r + COLLIDE_GAP).iterations(4));

  simulation.stop();
  for (let i = 0; i < TICKS; i += 1) simulation.tick();

  const placed = new Map(nodes.map((node) => [node.id, node]));
  const circles: PlacedCircle[] = [
    ...DEPARTMENT_NODES.map((node) => {
      const sim = placed.get(node.id);
      return { ...node, x: sim?.x ?? 0, y: sim?.y ?? 0, r: ANCHOR_R };
    }),
    ...POD_NODES.map((node) => {
      const sim = placed.get(node.id);
      return { ...node, x: sim?.x ?? 0, y: sim?.y ?? 0, r: radiusOf(node.count) };
    }),
  ];

  return { circles, links: [...LINKS] };
}

/** The one entry point. Pure: same view id in, same coordinates out. */
export function layoutFor(view: ViewId): OrgView {
  if (view === 'company') return companyView();
  if (view === 'departments') return departmentsView();
  return podsView();
}

/** The gap between two circles' edges. Negative means they overlap. */
export function clearance(a: PlacedCircle, b: PlacedCircle): number {
  return Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
}

export { ANCHOR_R, BASE, MIN_R, SPREAD };
