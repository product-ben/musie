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
import {
  Boxes, Brain, Building2, Check, Coffee, Handshake, Heart, Minus, Shield,
  Send, Sparkles, TrendingUp, Users, X,
} from 'lucide-react';
import {
  Background, Controls, Handle, Position, ReactFlow,
} from '@xyflow/react';
import type { Edge, Node, NodeProps, NodeTypes } from '@xyflow/react';
import {
  Badge, BadgeRow, CtaButton, IconButton, SegmentedControl, useToolSize,
} from '@musie/design-system';
import { NotImplementedLightbox } from '../components/NotImplementedLightbox';
import { breaksCard, cloudCard, exercisesCard, scaleCard } from '../lib/orgCard';
import { parseProse } from '../lib/orgProse';
import type { CloudWord } from '../lib/orgCard';
import { useLocale, useT } from '../i18n/localeContext';
import type { MessageKey } from '../i18n';
import { VIEW_IDS, layoutFor } from '../lib/orgLayout';
import type { ViewId } from '../lib/orgLayout';
import { statusForMetric } from '../lib/orgModel';
import type { NodeKind, Status } from '../lib/orgModel';
import { FILTER_IDS, METRIC_RATIONALE, METRICS_BY_FILTER } from '../lib/orgFixture';
import type { FilterId, MetricId } from '../lib/orgFixture';
import '@xyflow/react/dist/style.css';
import '../insight-map.css';

interface OrgNodeData extends Record<string, unknown> {
  kind: NodeKind;
  name: string;
  shortName: string;
  count: number;
  status: Status;
  /* The word for this node's light UNDER THIS METRIC — grey is "no data" on an
     insight dimension and "not used" on an outcome, and the node's accessible
     name has to say which. */
  statusLabel: MessageKey;
  selected: boolean;
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

const FILTER_LABEL: Record<FilterId, MessageKey> = {
  outcomes: 'insightMap.filter.outcomes',
  insight: 'insightMap.filter.insight',
};

const FILTER_GLYPH: Record<FilterId, typeof Users> = {
  outcomes: Sparkles,
  insight: Brain,
};

const METRIC_LABEL: Record<MetricId, MessageKey> = {
  breaksUsage: 'insightMap.care.breaksUsage',
  moodLift: 'insightMap.care.moodLift',
  breaks: 'insightMap.care.breaks',
  feeling: 'insightMap.care.feeling',
  safety: 'insightMap.care.safety',
  connectedness: 'insightMap.care.connectedness',
};

const METRIC_GLYPH: Record<MetricId, typeof Users> = {
  breaksUsage: Coffee,
  moodLift: TrendingUp,
  breaks: Coffee,
  feeling: Heart,
  safety: Shield,
  connectedness: Handshake,
};

/**
 * Which lights a metric can actually show, in the order a legend reads them.
 *
 * A LEGEND THAT KEYS COLOURS THE MAP CANNOT PRODUCE IS WORSE THAN NO LEGEND:
 * it invites a reader to go looking for a red pod that does not exist. Usage
 * is two-valued — a pod takes its Musie Moments or it does not — and mood lift
 * is two-valued as well. Only the four insight dimensions use the full set.
 */
const METRIC_LIGHTS: Record<MetricId, readonly Status[]> = {
  breaksUsage: ['good', 'none'],
  moodLift: ['good', 'watch'],
  breaks: ['good', 'watch', 'poor', 'none'],
  feeling: ['good', 'watch', 'poor', 'none'],
  safety: ['good', 'watch', 'poor', 'none'],
  connectedness: ['good', 'watch', 'poor', 'none'],
};

/**
 * What a light is CALLED under a given metric.
 *
 * The same grey means two different things depending on which half of the map
 * you are in — "nobody can tell you" on an insight dimension, "nobody used it"
 * on an outcome — and the colour cannot say which. So the words change with
 * the metric and the colours do not, which is the right way round: a reader
 * learns one set of colours and reads the legend for what they mean here.
 */
const METRIC_STATUS_LABEL: Partial<Record<MetricId, Partial<Record<Status, MessageKey>>>> = {
  breaksUsage: { good: 'insightMap.usage.regular', none: 'insightMap.usage.none' },
  moodLift: { good: 'insightMap.lift.positive', watch: 'insightMap.lift.flat' },
};

const GENERIC_STATUS_LABEL: Record<Status, MessageKey> = {
  good: 'insightMap.status.good',
  watch: 'insightMap.status.watch',
  poor: 'insightMap.status.poor',
  none: 'insightMap.status.none',
};

function statusLabel(metric: MetricId, status: Status): MessageKey {
  return METRIC_STATUS_LABEL[metric]?.[status] ?? GENERIC_STATUS_LABEL[status];
}

/**
 * `primary-subtle` for good, and not `success`.
 *
 * Ben asked for a traffic light, and a traffic light's green is green. Layer 1
 * re-hued `--success-9` to a yellow-green on purpose, so that success could
 * never be mistaken for the brand — which makes it the wrong token for the
 * "go" of a traffic light and the right one for "that worked". Warning and
 * error are the status families as they stand.
 *
 * `neutral` carries no data, which is the one state here that is not a verdict.
 */
const STATUS_BADGE: Record<Status, 'primary-subtle' | 'warning' | 'error' | 'neutral'> = {
  good: 'primary-subtle',
  watch: 'warning',
  poor: 'error',
  none: 'neutral',
};

/* The two the status families do not supply themselves. */
const STATUS_GLYPH: Partial<Record<Status, typeof Users>> = {
  good: Check,
  none: Minus,
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
    /* A REAL <button>, not a div with a click handler. React Flow's own node
       wrapper is told not to be focusable (`nodesFocusable={false}`), so this
       is the single tab stop per node: it clicks, it takes Enter and Space
       without a keydown handler, and `aria-pressed` says whether it is the one
       the card is about. */
    <button
      type="button"
      className="musie-orgmap__node"
      data-kind={data.kind}
      data-status={data.status}
      data-selected={data.selected ? '1' : '0'}
      aria-pressed={data.selected}
      /* THE STATUS IS IN THE NAME, not only in the fill. Green, orange and red
         are the classic three a colour-blind reader cannot separate, so the
         light is said in words here, drawn with an inset ring that thickens
         with severity, and keyed by a legend on the canvas. Colour is the
         glance; none of the three channels is alone. */
      aria-label={t('insightMap.node.aria', {
        name: data.name,
        count: String(data.count),
        status: t(data.statusLabel as MessageKey),
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
    </button>
  );
}

const NODE_TYPES: NodeTypes = { orgCircle: OrgCircleNode };

/**
 * Why the selected measure is worth measuring.
 *
 * ── THE ONE THING ON THIS SCREEN THAT IS NOT INVENTED ────────────────────
 * Northwind is fiction and every number on the map was written by hand. This
 * is not: it is real research with its sources attached, and the links are the
 * reason it earns its place — a citation whose source cannot be followed is
 * decoration, and this screen already has enough shapes that merely look like
 * evidence.
 *
 * It is parsed by `lib/orgProse.ts` rather than by `lib/markdown.ts`, because
 * that parser deliberately has no link branch. Its header says why, and the
 * short of it is that it renders content from the DATABASE; this prose is
 * written in the repository. Two trust levels, two parsers.
 *
 * TWO METRICS HAVE NO TEXT YET, so this renders nothing for them rather than
 * drawing an empty panel where a paragraph should be.
 */
function MetricRationale({ metric }: { metric: MetricId }) {
  const { locale } = useLocale();
  const source = METRIC_RATIONALE[metric];
  if (source === undefined) return null;
  /* HEADINGS DROPPED — Ben. They are kept in the source because they say what
     each piece is about to anybody editing it, and because the parity test
     reads them; nothing renders them. One line to put back. */
  const blocks = parseProse(locale === 'de' ? source.de : source.en)
    .filter((block) => block.kind === 'paragraph');

  return (
    <section className="musie-rationale">
      {blocks.map((block, index) => {
        const spans = block.spans.map((span, i) => (span.href === undefined
          ? <React.Fragment key={i}>{span.text}</React.Fragment>
          : (
            /* EXTERNAL, AND IT SAYS SO BY OPENING ELSEWHERE. A citation is a
               document somebody else published; sending a reader out of the
               board and losing their selection to read it would be the wrong
               trade. `rel` is not optional on a target of `_blank`. */
            <a
              key={i}
              className="musie-rationale__link"
              href={span.href}
              target="_blank"
              rel="noreferrer noopener"
            >
              {span.text}
            </a>
          )));
        return <p className="musie-rationale__text" key={index}>{spans}</p>;
      })}
    </section>
  );
}

/* ═══ WHAT THE CARD SHOWS ══════════════════════════════════════════════════
   Five shapes, one per metric, because the five metrics are not variations of
   one question. The card is about three hundred pixels wide, and every one of
   them is written against that.                                             */

/** A figure and its unit, for the one card that is a number. */
function CardFigure(
  { value, unit, delta }: { value: string; unit: string; delta?: string },
) {
  return (
    <div className="musie-card__figure">
      <p className="musie-card__figure-value">{value}</p>
      <p className="musie-card__figure-unit">{unit}</p>
      {delta !== undefined && <p className="musie-card__figure-delta">{delta}</p>}
    </div>
  );
}

/**
 * A cloud of the six most common words.
 *
 * Six and not ten, and the heading says "most common" rather than implying
 * these were all the words — see `cloudCard`. The share is printed beside each
 * one because four type steps cannot carry a range that runs past fifteen to
 * one, and because a word cloud without numbers is a mood board.
 */
function CardCloud({ title, words }: { title: string; words: CloudWord[] }) {
  return (
    <section className="musie-card__section">
      <h4 className="musie-card__section-title">{title}</h4>
      <ul className="musie-card__cloud">
        {words.map((word) => (
          <li className="musie-card__cloud-item" key={word.id}>
            <span
              className="musie-card__cloud-word"
              data-rung={word.weight}
              data-valence={word.valence}
            >
              {word.word}
            </span>
            <span className="musie-card__cloud-share">{Math.round(word.share)}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * A marker on a track between two named ends.
 *
 * THE ENDS ARE NAMED AND THE NUMBER IS PRINTED, because a dot on an unlabelled
 * line is a decoration. The marker takes the one hue this screen spends: it
 * marks a position, and the traffic light on the map has already given the
 * verdict.
 */
function CardScale(
  { low, high, value, position }: { low: string; high: string; value: string; position: number },
) {
  return (
    <div className="musie-card__scale">
      <p className="musie-card__scale-value">{value}</p>
      <div
        className="musie-card__scale-track"
        style={{ '--musie-scale-at': `${position}%` } as React.CSSProperties}
      >
        <span className="musie-card__scale-mark" aria-hidden="true" />
      </div>
      <p className="musie-card__scale-ends">
        <span>{low}</span>
        <span>{high}</span>
      </p>
    </div>
  );
}

function CardExercises({ title, names }: { title: string; names: string[] }) {
  return (
    <section className="musie-card__section">
      <h4 className="musie-card__section-title">{title}</h4>
      <ol className="musie-card__exercises">
        {names.map((name) => <li key={name}>{name}</li>)}
      </ol>
    </section>
  );
}

/**
 * The body of the card, chosen by the metric.
 *
 * ── "Quality Breaks" IS MY READING, NOT BEN'S SPEC ───────────────────────
 * He named a card for the other five and not for this one. Rather than leave
 * it empty it shows the thing the Quality Breaks score is MADE of — how often
 * a Musie Moment is taken — which is the only content that cannot contradict
 * the number on the map. Flagged rather than quietly invented.
 */
function CardBody({ nodeId, metric }: { nodeId: string; metric: MetricId }) {
  const t = useT();

  if (metric === 'breaksUsage' || metric === 'breaks') {
    const card = breaksCard(nodeId);
    if (card.silent) return <p className="musie-note">{t('insightMap.card.unused')}</p>;
    const sign = card.delta > 0 ? '+' : card.delta < 0 ? '\u2212' : '\u00b1';
    return (
      <CardFigure
        value={card.perDay.toFixed(1)}
        unit={t('insightMap.card.perDay')}
        delta={t('insightMap.card.vsMonth', {
          delta: `${sign}${Math.abs(card.delta).toFixed(1)}`,
        })}
      />
    );
  }

  if (metric === 'moodLift') {
    return (
      <>
        <CardCloud title={t('insightMap.card.before')} words={cloudCard(nodeId, 'during')} />
        <CardCloud title={t('insightMap.card.after')} words={cloudCard(nodeId, 'after')} />
      </>
    );
  }

  if (metric === 'feeling') {
    /* AFTER FIRST, because it is the half Musie has anything to do with. */
    return (
      <>
        <CardCloud title={t('insightMap.card.afterMusie')} words={cloudCard(nodeId, 'after')} />
        <CardCloud title={t('insightMap.card.duringWork')} words={cloudCard(nodeId, 'during')} />
      </>
    );
  }

  const scale = scaleCard(nodeId, metric);
  const ends: { low: MessageKey; high: MessageKey } = metric === 'safety'
    ? { low: 'insightMap.card.unsafe', high: 'insightMap.card.safe' }
    : { low: 'insightMap.card.apart', high: 'insightMap.card.together' };
  return (
    <>
      {scale === null
        ? <p className="musie-note">{t('insightMap.card.noScore')}</p>
        : (
          <CardScale
            low={t(ends.low)}
            high={t(ends.high)}
            value={scale.value.toFixed(1)}
            position={scale.position}
          />
        )}
      <CardExercises
        title={t('insightMap.card.exercises')}
        names={exercisesCard(nodeId, metric)}
      />
    </>
  );
}


function isView(value: string): value is ViewId {
  return (VIEW_IDS as readonly string[]).includes(value);
}

function isFilter(value: string): value is FilterId {
  return (FILTER_IDS as readonly string[]).includes(value);
}

function isMetric(value: string, filter: FilterId): value is MetricId {
  return (METRICS_BY_FILTER[filter] as readonly string[]).includes(value);
}

export function InsightMap() {
  const t = useT();
  const [view, setView] = React.useState<ViewId>('company');
  const [filter, setFilter] = React.useState<FilterId>('outcomes');
  const [metric, setMetric] = React.useState<MetricId>('breaksUsage');

  const [selected, setSelected] = React.useState<string | null>(null);
  const [sharing, setSharing] = React.useState(false);
  const [hovered, setHovered] = React.useState<MetricId | null>(null);
  const [tipAt, setTipAt] = React.useState(0);
  const tool = useToolSize();

  const metrics = METRICS_BY_FILTER[filter];

  /**
   * Which option the pointer or the keyboard is on, and where it sits.
   *
   * ── IT ANSWERS TO FOCUS AS WELL AS HOVER ─────────────────────────────────
   * Ben asked for hover. Hover alone would mean a keyboard user never sees a
   * word of it, and 1.4.13 wants content shown on hover to be reachable,
   * dismissable and hoverable — so: focus opens it too, Escape closes it, and
   * the bubble lives INSIDE the wrapper so the pointer can travel into it
   * without the bubble vanishing. The last of those is not decoration either:
   * the text is full of citations, and a link you cannot reach is a link.
   */
  const onTipPoint = React.useCallback((event: React.SyntheticEvent<HTMLDivElement>) => {
    const wrapper = event.currentTarget;
    const buttons = [...wrapper.querySelectorAll('button')];
    const option = (event.target as HTMLElement).closest('button');
    const index = option === null ? -1 : buttons.indexOf(option);
    if (index < 0 || index >= metricsRef.current.length) return;
    const box = wrapper.getBoundingClientRect();
    const at = option!.getBoundingClientRect();
    setTipAt(at.left - box.left + at.width / 2);
    setHovered(metricsRef.current[index]);
  }, []);

  const clearTip = React.useCallback(() => setHovered(null), []);

  /**
   * SELECTION IS CLEARED BY THE LEVEL AND NOTHING ELSE. Changing the metric
   * recolours the same nodes, so the card stays on the one you were reading;
   * changing the level replaces them, and a card about a pod that is no longer
   * drawn is a card about nothing.
   *
   * IT HANGS OFF `onNodeClick` RATHER THAN THE BUTTON'S OWN `onClick`, and
   * that is not a style choice. React Flow sets each node's `pointer-events`
   * as an INLINE style, computed from whether IT has anything to do with the
   * node — not draggable, not selectable, no click handler, so `none`, and the
   * pan surface underneath swallows every press. No stylesheet can outrank an
   * inline style, so the fix is to give React Flow the handler it is looking
   * for rather than to fight it.
   *
   * The circle stays a real `<button>` for everything else: it is the tab
   * stop, it announces itself as a button, it carries `aria-pressed`, and
   * Enter or Space on it dispatches a click that bubbles to this same handler.
   * One path, both input methods.
   */
  const onNodeClick = React.useCallback((_: React.MouseEvent, node: { id: string }) => {
    setSelected((current) => (current === node.id ? null : node.id));
  }, []);

  /* 1.4.13: content shown on hover must be DISMISSABLE without moving the
     pointer. Escape is the way, and it is the only keyboard handler on this
     screen. */
  React.useEffect(() => {
    if (hovered === null) return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setHovered(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hovered]);

  /* CHANGING THE FILTER CHANGES WHAT CAN BE ASKED, so the selected metric has
     to move with it — "Connectedness" is not an option once the question is
     whether Musie is being used at all. It lands on the first of the new set
     rather than trying to find an equivalent, because there is no equivalent:
     the two halves measure different things. */
  /* The handler is stable across renders, so the metric list reaches it
     through a ref rather than through its dependency array — otherwise every
     filter change would rebuild it and React Flow would see new props. */
  const metricsRef = React.useRef(metrics);
  metricsRef.current = metrics;

  const onFilter = React.useCallback((next: string) => {
    if (!isFilter(next)) return;
    setFilter(next);
    setMetric(METRICS_BY_FILTER[next][0]);
  }, []);

  /* TWO MEMOS, AND THE SPLIT IS THE POINT. Where a node sits has nothing to do
     with what somebody cares about, so changing the dimension must not re-run
     four hundred ticks of force simulation and shuffle the map under the
     reader. The layout is keyed on the view alone; only the colours are keyed
     on both. */
  const laid = React.useMemo(() => layoutFor(view), [view]);

  const { nodes, edges } = React.useMemo(() => {
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
        status: statusForMetric(circle.id, metric),
        statusLabel: statusLabel(metric, statusForMetric(circle.id, metric)),
        selected: circle.id === selected,
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
  }, [laid, metric, selected]);

  const selectedNode = selected === null
    ? null
    : laid.circles.find((circle) => circle.id === selected) ?? null;

  return (
    <div className="musie-orgmap-page">
      {/* THE LEDE IS THE h1. The route still has a title — `handle.titleKey`
          puts it in the document title — but on the page the heading is this,
          because a screen with no h1 has no outline and "Org map" was telling
          a reader something they could already see. */}
      <header className="musie-lede">
        <h1 className="musie-lede__figure">{t('insightMap.lede.figure')}</h1>
        <p className="musie-lede__text">{t('insightMap.lede.text')}</p>
      </header>

      <div className="musie-orgmap__controls">
        {/* FIRST, because it decides what the other two are even asking. */}
        <SegmentedControl
          name="insight-map-filter"
          legend={t('insightMap.filter.legend')}
          options={FILTER_IDS.map((id) => ({
            value: id,
            label: t(FILTER_LABEL[id]),
            glyph: FILTER_GLYPH[id],
          }))}
          value={filter}
          onValueChange={onFilter}
        />

        {/* TWO OPTIONS UNDER Musie Outcomes AND FOUR UNDER Emotional Insight,
            which is why it is keyed on the filter: SegmentedControl is
            specified for two to four and warns outside that, and a control
            holding stale options would offer a question this half of the map
            cannot answer. */}
        {/* ── THE RATIONALE IS A HOVER BUBBLE NOW ─────────────────────────
            Ben: show it only while the option is hovered, under the element.
            So the control is wrapped, the wrapper owns the bubble, and the
            control itself is untouched — `SegmentedControl` renders its own
            options and nothing here reaches inside it.

            WHICH option is read from its INDEX among the wrapper's buttons,
            not from a `musy-` class or a base-ui attribute. The options are
            built from `metrics` in order, so the index IS the metric, and the
            app stays out of the design system's internals. */}
        <div
          className="musie-tip"
          onMouseOver={onTipPoint}
          onMouseLeave={clearTip}
          onFocus={onTipPoint}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) clearTip();
          }}
        >
          <SegmentedControl
            key={filter}
            name="insight-map-metric"
            legend={t('insightMap.care.legend')}
            options={metrics.map((id) => ({
              value: id,
              label: t(METRIC_LABEL[id]),
              glyph: METRIC_GLYPH[id],
            }))}
            value={metric}
            onValueChange={(next) => { if (isMetric(next, filter)) setMetric(next); }}
          />

          {hovered !== null && METRIC_RATIONALE[hovered] !== undefined && (
            <div
              className="musie-tip__bubble"
              role="tooltip"
              style={{ '--musie-tip-at': `${tipAt}px` } as React.CSSProperties}
            >
              <MetricRationale metric={hovered} />
            </div>
          )}
        </div>


        {/* THIRD, by Ben. It is the only one of the three that changes WHICH
            nodes are drawn rather than what they say, so it reads last: you
            choose the question, then the measure, then how close you stand. */}
        <SegmentedControl
          name="insight-map-level"
          legend={t('insightMap.level.legend')}
          options={VIEW_IDS.map((id) => ({
            value: id,
            label: t(VIEW_LABEL[id]),
            glyph: VIEW_GLYPH[id],
          }))}
          value={view}
          onValueChange={(next) => {
            if (!isView(next)) return;
            setView(next);
            setSelected(null);
          }}
        />
      </div>

      <section
        className="musie-orgmap"
        data-card={selected === null ? '0' : '1'}
        aria-label={t('insightMap.canvas.label')}
      >
        <div className="musie-orgmap__canvas">
        {/* `key={view}` REMOUNTS THE CANVAS PER TAB, which is what makes
            `fitView` re-frame on every switch rather than only on first paint.
            It also drops the viewport, and that is the right behaviour here:
            a zoom into one department means nothing in the view that has no
            departments in it. Twenty-four nodes make the remount free. */}
        <ReactFlow
          key={`${view}-${selected === null ? 'wide' : 'narrow'}`}
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          fitView
          /* 0.1, not 0.18: the graph's bounding box is near square and the
             canvas is wide, so `fitView` fits the tighter axis and the padding
             is spent twice over. At 0.18 the map used about a third of the
             space it had. */
          fitViewOptions={{ padding: 0.1 }}
          onNodeClick={onNodeClick}
          nodesFocusable={false}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          minZoom={0.2}
          maxZoom={2.5}
          proOptions={{ hideAttribution: false }}
        >
          <Background gap={32} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
        </div>

        {selectedNode !== null && (
          <aside
            className="musie-orgmap__card"
            aria-label={t('insightMap.card.label', { name: selectedNode.name })}
          >
            <div className="musie-orgmap__card-head">
              <h3 className="musie-orgmap__card-title">{selectedNode.name}</h3>
              <IconButton
                glyph={X}
                label={t('insightMap.card.close')}
                variant="ghost"
                size={tool}
                onClick={() => setSelected(null)}
              />
            </div>

            <CardBody nodeId={selectedNode.id} metric={metric} />

            {/* ── ONLY ON A RED NODE ──────────────────────────────────────
                The one place this screen offers to DO something, and it is
                deliberately the only one: an action beside every reading
                would turn a map into a worklist, and most of these readings
                are not a problem to solve. "Needs attention" is, by its own
                name.

                It opens the app's own not-implemented dialog rather than
                pretending to post. A prototype may show a button; it may not
                imply it sent a message to a channel. */}
            {statusForMetric(selectedNode.id, metric) === 'poor' && (
              <CtaButton
                variant="secondary"
                align="start"
                leadingIcon={Send}
                wrap
                onClick={() => setSharing(true)}
              >
                {t('insightMap.card.share')}
              </CtaButton>
            )}
          </aside>
        )}

        {/* ── OUT OF THE CANVAS AND UNDER IT ─────────────────────────────
            Both of these floated over the map as React Flow `Panel`s until
            the card started taking a third of the width: a caption and a key
            that cover the picture they are about. As a footer row inside the
            same box they explain the map without hiding any of it, and they
            cost the canvas about sixty pixels rather than a third of it. */}
        <footer className="musie-orgmap__foot">
          <p className="musie-orgmap__hint">
            {t(VIEW_HINT[view])}
            {' '}
            {/* ── THE DISCLAIMER SURVIVED THE BOX IT LIVED IN ──────────────
                Ben asked for the notice at the top to go, and it has. The
                SENTENCE has not: an HR board full of invented figures with
                nothing anywhere saying so is the one thing this screen must
                not become, and it costs a line down here. Easy to delete if
                that is the call — but it should be a call. */}
            <strong className="musie-orgmap__unreal">
              {t('insightMap.notReal.headline')}
            </strong>
          </p>
          <div
            className="musie-orgmap__legend"
            role="group"
            aria-label={t('insightMap.legend.label')}
          >
            <BadgeRow>
              {METRIC_LIGHTS[metric].map((status) => (
                <Badge key={status} variant={STATUS_BADGE[status]} glyph={STATUS_GLYPH[status]}>
                  {t(statusLabel(metric, status))}
                </Badge>
              ))}
            </BadgeRow>
          </div>
        </footer>
      </section>

      {sharing && selectedNode !== null && (
        <NotImplementedLightbox
          what={t('insightMap.card.share')}
          onClose={() => setSharing(false)}
        />
      )}
    </div>
  );
}
