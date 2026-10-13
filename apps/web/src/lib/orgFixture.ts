/**
 * NORTHWIND — the invented company the org map is drawn from. 100 people.
 *
 * "Northwind" is the software industry's canonical sample-data company, so
 * anyone technical reads it as fixture data before they read anything else.
 *
 * ── A POD IS CROSS-FUNCTIONAL, SO IT IS AUTHORED AS A COMPOSITION ─────────
 * The decision this whole file turns on: a pod is a squad with engineers, a
 * designer and a PM in it, so it draws people from several departments at
 * once. The org is a graph, not a tree.
 *
 * Therefore **only pods are authored**, and each one says how many people it
 * takes from each department. A department's headcount is the sum of its
 * people across every pod; the company is the sum of the pods. Nothing is
 * counted twice, every view agrees with every other, and the total is exactly
 * 100 — asserted in orgModel.test.ts rather than hoped for.
 *
 * The alternative — every connected department counting the whole pod — was
 * refused: the Departments tab would total 120 while the Company tab said 100,
 * and a map whose own two views disagree is worse than one view.
 *
 * ── NINE OF EIGHTEEN SPAN MORE THAN ONE DEPARTMENT ───────────────────────
 * Enough that the shared edges are the normal case rather than a curiosity,
 * and few enough that the canvas does not turn into a mesh. Growth is the one
 * to look at: Eng 4 · P&D 1 · Mktg 2, which is what a growth squad actually
 * looks like and why it settles nearest Engineering rather than halfway
 * between its three departments.
 */

export type DepartmentId = 'eng' | 'gtm' | 'pd' | 'cs' | 'mktg' | 'ops';

export interface Department {
  id: DepartmentId;
  name: string;
  /** What a circle can hold when the full name cannot. Not a truncation. */
  shortName?: string;
}

export interface Pod {
  id: string;
  name: string;
  shortName?: string;
  /**
   * How many people this pod draws from each department.
   *
   * A department absent from this map contributes nobody — never a key with 0.
   * `orgModel.test.ts` holds that, because "0 from Marketing" and "not a
   * marketing pod" would otherwise draw an edge of no people.
   */
  members: Partial<Record<DepartmentId, number>>;
}

export const COMPANY = { id: 'northwind', name: 'Northwind' } as const;

export const DEPARTMENTS: readonly Department[] = [
  { id: 'eng', name: 'Engineering', shortName: 'Eng' },
  { id: 'gtm', name: 'Go-to-Market', shortName: 'GTM' },
  { id: 'pd', name: 'Product & Design', shortName: 'Product' },
  { id: 'cs', name: 'Customer Success', shortName: 'Success' },
  { id: 'mktg', name: 'Marketing', shortName: 'Marketing' },
  { id: 'ops', name: 'Operations', shortName: 'Ops' },
] as const;

/**
 * The eighteen pods.
 *
 * Ordered largest first, which is only for reading this file — the layout
 * sorts for itself and nothing downstream depends on this order.
 */
export const PODS: readonly Pod[] = [
  { id: 'payments', name: 'Payments', members: { eng: 6, pd: 3 } },
  { id: 'platform', name: 'Platform', members: { eng: 7, pd: 1 } },
  { id: 'mobile', name: 'Mobile', members: { eng: 5, pd: 3 } },
  { id: 'infra', name: 'Infrastructure', shortName: 'Infra', members: { eng: 7 } },
  { id: 'growth', name: 'Growth', members: { eng: 4, pd: 1, mktg: 2 } },
  { id: 'enterprise', name: 'Enterprise', members: { gtm: 7 } },
  { id: 'midmarket', name: 'Mid-Market', members: { gtm: 7 } },
  { id: 'data', name: 'Data', members: { eng: 5, pd: 1 } },
  { id: 'devex', name: 'Developer Experience', shortName: 'DevEx', members: { eng: 5 } },
  { id: 'salesops', name: 'Sales Engineering', shortName: 'Sales Eng', members: { gtm: 3, eng: 2 } },
  { id: 'support', name: 'Support', members: { cs: 5 } },
  { id: 'onboarding', name: 'Onboarding', shortName: 'Onboard', members: { cs: 4, pd: 1 } },
  { id: 'quality', name: 'Quality', members: { eng: 4 } },
  { id: 'partnerships', name: 'Partnerships', shortName: 'Partners', members: { gtm: 3, mktg: 1 } },
  { id: 'content', name: 'Content', members: { mktg: 2, pd: 2 } },
  { id: 'demand', name: 'Demand', members: { mktg: 3 } },
  { id: 'people', name: 'People', members: { ops: 3 } },
  { id: 'finance', name: 'Finance', members: { ops: 3 } },
] as const;
