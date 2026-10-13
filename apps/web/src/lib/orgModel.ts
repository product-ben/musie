/**
 * THE ORG'S ARITHMETIC — pods in, departments and edges out.
 *
 * Pure, and in `lib/` for the usual reason: `vitest.config.ts` includes
 * `src/**\/*.test.ts` only, in a node environment with no jsdom, so a
 * `.test.tsx` would never run. The screen holds JSX; this holds the sums.
 *
 * ── EVERY NUMBER ABOVE A POD IS DERIVED ───────────────────────────────────
 * A department's headcount is computed from the pods that draw on it, and the
 * company's from the pods. Neither is authored anywhere, so neither can
 * contradict the other — which matters here more than usual, because the three
 * tabs show the same hundred people three different ways and a reader will
 * add them up.
 */
import { COMPANY, DEPARTMENTS, PODS } from './orgFixture';
import type {
  DepartmentId, DimensionId, MetricId, OutcomeId, Pod,
} from './orgFixture';

export type NodeKind = 'company' | 'department' | 'pod';

/** One circle on the canvas, before it has a position. */
export interface OrgNode {
  id: string;
  kind: NodeKind;
  name: string;
  /** What a circle can hold. Equals `name` unless the fixture gives a short form. */
  shortName: string;
  count: number;
}

/** One line between a pod and a department it draws people from. */
export interface OrgLink {
  id: string;
  /** The pod. */
  source: string;
  /** The department. */
  target: string;
  /** How many of the pod's people come from that department. */
  people: number;
}

export function podTotal(pod: Pod): number {
  return Object.values(pod.members).reduce((total, n) => total + (n ?? 0), 0);
}

/** How many people a department has, across every pod that draws on it. */
export function departmentHeadcount(id: DepartmentId): number {
  return PODS.reduce((total, pod) => total + (pod.members[id] ?? 0), 0);
}

export const COMPANY_NODE: OrgNode = {
  id: COMPANY.id,
  kind: 'company',
  name: COMPANY.name,
  shortName: COMPANY.name,
  count: PODS.reduce((total, pod) => total + podTotal(pod), 0),
};

export const DEPARTMENT_NODES: readonly OrgNode[] = DEPARTMENTS.map((department) => ({
  id: department.id,
  kind: 'department',
  name: department.name,
  shortName: department.shortName ?? department.name,
  count: departmentHeadcount(department.id),
}));

export const POD_NODES: readonly OrgNode[] = PODS.map((pod) => ({
  id: pod.id,
  kind: 'pod',
  name: pod.name,
  shortName: pod.shortName ?? pod.name,
  count: podTotal(pod),
}));

/**
 * One link per pod-department pair, in a stable order.
 *
 * The id carries both ends, so React Flow can key on it and a reader of the
 * DOM can tell which line is which without counting.
 */
export const LINKS: readonly OrgLink[] = PODS.flatMap((pod) =>
  (Object.entries(pod.members) as [DepartmentId, number][])
    .filter(([, people]) => people > 0)
    .map(([departmentId, people]) => ({
      id: `${pod.id}--${departmentId}`,
      source: pod.id,
      target: departmentId,
      people,
    })),
);

/** The departments one pod draws on, with its own weight on each. */
export function linksOfPod(podId: string): OrgLink[] {
  return LINKS.filter((link) => link.source === podId);
}

export function nodeById(id: string): OrgNode | null {
  if (id === COMPANY_NODE.id) return COMPANY_NODE;
  return (
    DEPARTMENT_NODES.find((node) => node.id === id)
    ?? POD_NODES.find((node) => node.id === id)
    ?? null
  );
}

/* ═══ HOW PEOPLE ARE DOING ══════════════════════════════════════════════════
   A traffic light per node, per dimension. Four states, and the fourth is the
   one that matters most.                                                    */

/**
 * `none` is NOT a fourth colour of bad news.
 *
 * It means nobody can answer the question for this group — because the pod is
 * three people and reporting on it would be reporting on them, or because the
 * question was not asked here this month. Half the pods are `none` on any
 * given dimension, which is the most honest thing on the map and the reason
 * grey is drawn with a DASHED edge rather than a dim green one: Layer 1's
 * dashed style is its word for "provisional, awaiting content" (token gap G2),
 * which is exactly this and nothing else.
 */
export type Status = 'none' | 'good' | 'watch' | 'poor';

/**
 * Where the light changes.
 *
 * Two thresholds on a nought-to-ten scale, and they are deliberately not
 * symmetrical: 7 is "this is fine", and anything under 5.5 is bad enough to go
 * and ask about rather than to watch. The band in between is the one a reader
 * should neither act on nor ignore.
 */
const GOOD_AT = 7;
const WATCH_AT = 5.5;

export function bandOf(score: number): Exclude<Status, 'none'> {
  if (score >= GOOD_AT) return 'good';
  if (score >= WATCH_AT) return 'watch';
  return 'poor';
}

/** A pod's own score, or null where nobody can answer. */
export function podScore(podId: string, dimension: DimensionId): number | null {
  const pod = PODS.find((p) => p.id === podId);
  return pod?.scores[dimension] ?? null;
}

/**
 * A department's score, built from the pods that DO have data — weighted by
 * the people it draws from each of them.
 *
 * ── A DEPARTMENT IS NEVER GREY, AND THAT IS NOT A FUDGE ──────────────────
 * Weighting by people is what makes this true: a department is twenty to
 * forty-five people, so some pod inside it has always answered, and the
 * aggregate is never small enough to be about an individual. The same fact
 * that silences half the pods is what lets every department speak.
 *
 * Pods with no data are SKIPPED rather than counted as zero. Counting them
 * would drag every department toward the bottom of the scale in proportion to
 * how little it had measured, which is the opposite of what the reader should
 * conclude from missing data.
 */
export function departmentScore(id: DepartmentId, dimension: DimensionId): number | null {
  let people = 0;
  let total = 0;
  for (const pod of PODS) {
    const score = pod.scores[dimension];
    const members = pod.members[id];
    if (score === undefined || members === undefined) continue;
    people += members;
    total += score * members;
  }
  return people === 0 ? null : total / people;
}

/** The company's, weighted by each pod's whole size. */
export function companyScore(dimension: DimensionId): number | null {
  let people = 0;
  let total = 0;
  for (const pod of PODS) {
    const score = pod.scores[dimension];
    if (score === undefined) continue;
    const size = podTotal(pod);
    people += size;
    total += score * size;
  }
  return people === 0 ? null : total / people;
}

/** The score behind any node's light, or null where there is none. */
export function scoreOf(nodeId: string, dimension: DimensionId): number | null {
  if (nodeId === COMPANY.id) return companyScore(dimension);
  if (DEPARTMENTS.some((d) => d.id === nodeId)) {
    return departmentScore(nodeId as DepartmentId, dimension);
  }
  return podScore(nodeId, dimension);
}

/** The one call the screen makes. */
export function statusOf(nodeId: string, dimension: DimensionId): Status {
  const score = scoreOf(nodeId, dimension);
  return score === null ? 'none' : bandOf(score);
}

/* ═══ THE MEASURED OUTCOMES ════════════════════════════════════════════════
   A different kind of reading, and a different kind of grey.                */

const OUTCOME_STATUS: Readonly<Record<OutcomeId, Readonly<Record<string, Status>>>> = {
  breaksUsage: { regular: 'good', none: 'none' },
  moodLift: { positive: 'good', flat: 'watch' },
};

function podOutcome(pod: Pod, outcome: OutcomeId): Status {
  return OUTCOME_STATUS[outcome][pod.outcomes[outcome]] ?? 'none';
}

/**
 * A parent's outcome: whichever reading MOST OF ITS PEOPLE are covered by.
 *
 * Not an average, because `regular` and `none` are not two ends of a scale —
 * there is nothing halfway between a pod that uses Musie and one that does
 * not. Weighted by people rather than by pods, so a department is not swung by
 * the two smallest teams in it.
 *
 * A TIE GOES TO THE WORSE READING. "Half of this department does not use it"
 * is the more useful thing for somebody to see, and a board that rounds ties
 * up is a board that flatters.
 */
function majorityOutcome(
  outcome: OutcomeId,
  weight: (pod: Pod) => number,
): Status {
  const tally = new Map<Status, number>();
  for (const pod of PODS) {
    const people = weight(pod);
    if (people <= 0) continue;
    const status = podOutcome(pod, outcome);
    tally.set(status, (tally.get(status) ?? 0) + people);
  }
  if (tally.size === 0) return 'none';
  const rank: Status[] = ['none', 'poor', 'watch', 'good'];
  let best: Status = 'none';
  let bestPeople = -1;
  for (const [status, people] of tally) {
    if (people > bestPeople
      || (people === bestPeople && rank.indexOf(status) < rank.indexOf(best))) {
      best = status;
      bestPeople = people;
    }
  }
  return best;
}

export function outcomeStatus(nodeId: string, outcome: OutcomeId): Status {
  if (nodeId === COMPANY.id) {
    return majorityOutcome(outcome, (pod) => podTotal(pod));
  }
  if (DEPARTMENTS.some((d) => d.id === nodeId)) {
    return majorityOutcome(outcome, (pod) => pod.members[nodeId as DepartmentId] ?? 0);
  }
  const pod = PODS.find((p) => p.id === nodeId);
  return pod === undefined ? 'none' : podOutcome(pod, outcome);
}

function isOutcome(metric: MetricId): metric is OutcomeId {
  return metric === 'breaksUsage' || metric === 'moodLift';
}

/**
 * The one call the screen makes, whichever filter is on.
 *
 * Both halves return the same four-value `Status`, and that is deliberate: a
 * reader learns one set of colours. What the grey MEANS differs between them —
 * "nobody can tell you" against "nobody used it" — and the legend changes with
 * the metric to say which, because the colour cannot.
 */
export function statusForMetric(nodeId: string, metric: MetricId): Status {
  return isOutcome(metric) ? outcomeStatus(nodeId, metric) : statusOf(nodeId, metric);
}
