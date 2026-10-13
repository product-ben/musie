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
import type { DepartmentId, Pod } from './orgFixture';

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
