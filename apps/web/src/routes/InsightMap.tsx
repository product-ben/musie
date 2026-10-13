/**
 * `/insight-map` — the organisation, as a canvas you can move around in.
 *
 * Step one of the real click prototype. Three levels, pill tabs, and a React
 * Flow canvas that redraws underneath. Nothing is clickable yet; that is the
 * next step, deliberately not reached for here.
 *
 * It is a TOOL in the sense `/goal-mappings` and `/dev/qr` are: `lazy` in the
 * route table and linked from nowhere. The `lazy` is load-bearing rather than
 * tidy — this screen is the only importer of React Flow and the two d3
 * packages, and a visitor who never types the path should download none of it.
 *
 * ── THE POD IS THE UNIT, AND IT BELONGS TO SEVERAL DEPARTMENTS ────────────
 * A pod is cross-functional, so it draws people from more than one department
 * and the org is a graph rather than a tree. That is the fact the whole screen
 * is arranged around; `lib/orgFixture.ts` has the argument and
 * `lib/orgLayout.ts` has its consequence for layout.
 *
 * ── WHY A CANVAS AND NOT THE CSS CIRCLES THE BOARD USES ───────────────────
 * `components/DiaryGraph.tsx` argues — correctly — that a picture which is
 * really a list should be built as a list of links. That argument holds while
 * the picture is a PICTURE. This one is a surface you pan and zoom, and will
 * shortly be one you drag teams around on, which is a different object: the
 * viewport has state, the nodes have positions that change, and the thing a
 * reader does with it is explore rather than read.
 *
 * So it takes a canvas library, and the cost is paid where it is visible: the
 * nodes are `role="group"` with a readable accessible name rather than links,
 * React Flow handles tab order and arrow-key movement, and nothing here is yet
 * a navigation target that a list would have to carry instead.
 *
 * ── THE ATTRIBUTION STAYS ─────────────────────────────────────────────────
 * Hiding React Flow's badge requires a Pro subscription. On the free licence
 * it is part of the canvas, bottom-right. It is not styled away and it is not
 * hidden — doing either would breach the licence we are using.
 */
import * as React from 'react';
import { Boxes, Building2, Users } from 'lucide-react';
import {
  Background, Controls, Handle, Panel, Position, ReactFlow,
} from '@xyflow/react';
import type { Edge, Node, NodeProps, NodeTypes } from '@xyflow/react';
import { Message, SegmentedControl } from '@musie/design-system';
import { useT } from '../i18n/localeContext';
import type { MessageKey } from '../i18n';
import { VIEW_IDS, layoutFor } from '../lib/orgLayout';
import type { ViewId } from '../lib/orgLayout';
import type { NodeKind } from '../lib/orgModel';
import '@xyflow/react/dist/style.css';
import '../insight-map.css';

interface OrgNodeData extends Record<string, unknown> {
  kind: NodeKind;
  name: string;
  shortName: string;
  count: number;
}

type OrgFlowNode = Node<OrgNodeData, 'orgCircle'>;

const VIEW_LABEL: Record<ViewId, MessageKey> = {
  company: 'insightMap.level.company',
  departments: 'insightMap.level.departments',
  pods: 'insightMap.level.pods',
};

const VIEW_GLYPH: Record<ViewId, typeof Users> = {
  company: Building2,
  departments: Boxes,
  pods: Users,
};

/* One line per view, INSIDE the canvas rather than above it. It began as a
   paragraph under the title and was moved: a sentence explaining a picture
   belongs beside the picture, and on a 1000px window the preamble was pushing
   the only thing worth looking at below the fold. */
const VIEW_HINT: Record<ViewId, MessageKey> = {
  company: 'insightMap.hint.company',
  departments: 'insightMap.hint.departments',
  pods: 'insightMap.hint.pods',
};

/**
 * How many people a line carries, as one of four rungs.
 *
 * The rungs are Layer 1's border widths — hairline, regular, thick, focus —
 * because a line's weight is the one thing on this canvas that is a width, and
 * inventing a second scale for it would mean two ladders doing one job. Four
 * rungs for one to seven people: thickness is the glance, and the exact number
 * belongs on the node rather than on the line.
 */
function weightRung(people: number): 1 | 2 | 3 | 4 {
  if (people <= 1) return 1;
  if (people <= 3) return 2;
  if (people <= 5) return 3;
  return 4;
}

/**
 * One circle. The same component draws all three kinds — a company, a
 * department and a pod differ in what they mean, not in how they are built.
 *
 * THE HANDLES ARE AT THE CENTRE, which is what makes a line run centre to
 * centre and disappear under the circles at each end. React Flow draws an edge
 * between handle positions, so putting them anywhere else would make the
 * spokes meet the circle at a point that has no meaning. They are inert:
 * nothing on this canvas can be connected by hand.
 */
function OrgCircleNode({ data }: NodeProps<OrgFlowNode>) {
  const t = useT();
  return (
    <div
      className="musie-orgmap__node"
      data-kind={data.kind}
      role="img"
      aria-label={t('insightMap.node.aria', {
        name: data.name,
        count: String(data.count),
      })}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="musie-orgmap__handle"
        isConnectable={false}
      />
      <span className="musie-orgmap__name" aria-hidden="true">{data.shortName}</span>
      <span className="musie-orgmap__count" aria-hidden="true">{data.count}</span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="musie-orgmap__handle"
        isConnectable={false}
      />
    </div>
  );
}

const NODE_TYPES: NodeTypes = { orgCircle: OrgCircleNode };

function isView(value: string): value is ViewId {
  return (VIEW_IDS as readonly string[]).includes(value);
}

export function InsightMap() {
  const t = useT();
  const [view, setView] = React.useState<ViewId>('company');

  /* The layout is pure and deterministic, so it is memoised per view rather
     than recomputed on every render. Three results, computed at most once
     each, and identical every time — see lib/orgLayout.ts on `jiggle`. */
  const { nodes, edges } = React.useMemo(() => {
    const laid = layoutFor(view);
    const flowNodes: OrgFlowNode[] = laid.circles.map((circle) => ({
      id: circle.id,
      type: 'orgCircle',
      /* React Flow positions a node by its top-left corner; the layout works
         in centres, because that is what a circle has. */
      position: { x: circle.x - circle.r, y: circle.y - circle.r },
      data: {
        kind: circle.kind,
        name: circle.name,
        shortName: circle.shortName,
        count: circle.count,
      },
      style: { width: circle.r * 2, height: circle.r * 2 },
      draggable: false,
      selectable: false,
      connectable: false,
    }));

    const flowEdges: Edge[] = laid.links.map((link) => ({
      id: link.id,
      source: link.source,
      target: link.target,
      type: 'straight',
      focusable: false,
      className: `musie-orgmap__edge musie-orgmap__edge--w${weightRung(link.people)}`,
    }));

    return { nodes: flowNodes, edges: flowEdges };
  }, [view]);

  return (
    <div className="musie-orgmap-page">
      <h1 className="musie-placeholder">{t('route.insightMap.title')}</h1>

      {/* L11: context present on load is `info` at `live="off"`. It does not
          dismiss, because what it says never stops being true. */}
      <Message
        variant="info"
        headline={t('insightMap.notReal.headline')}
        text={t('insightMap.notReal.text')}
        headingLevel={2}
        live="off"
      />

      <SegmentedControl
        name="insight-map-level"
        legend={t('insightMap.level.legend')}
        options={VIEW_IDS.map((id) => ({
          value: id,
          label: t(VIEW_LABEL[id]),
          glyph: VIEW_GLYPH[id],
        }))}
        value={view}
        onValueChange={(next) => { if (isView(next)) setView(next); }}
      />

      <section className="musie-orgmap" aria-label={t('insightMap.canvas.label')}>
        {/* `key={view}` REMOUNTS THE CANVAS PER TAB, which is what makes
            `fitView` re-frame on every switch rather than only on first paint.
            It also drops the viewport, and that is the right behaviour here:
            a zoom into one department means nothing in the view that has no
            departments in it. Twenty-four nodes make the remount free. */}
        <ReactFlow
          key={view}
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          fitView
          /* 0.1, not 0.18: the graph's bounding box is near square and the
             canvas is wide, so `fitView` fits the tighter axis and the padding
             is spent twice over. At 0.18 the map used about a third of the
             space it had. */
          fitViewOptions={{ padding: 0.1 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          minZoom={0.2}
          maxZoom={2.5}
          proOptions={{ hideAttribution: false }}
        >
          <Background gap={32} size={1} />
          <Controls showInteractive={false} />
          <Panel position="top-left" className="musie-orgmap__hint">
            {t(VIEW_HINT[view])}
          </Panel>
        </ReactFlow>
      </section>
    </div>
  );
}
