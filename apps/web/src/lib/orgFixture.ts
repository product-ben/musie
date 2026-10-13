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

/**
 * The four things somebody looking at this map might care about.
 *
 * They are the scales the insight work has been circling since the start:
 * how good people's breaks are, how they feel, whether they can say what they
 * think, and whether they feel connected to anyone.
 */
export type DimensionId = 'breaks' | 'feeling' | 'safety' | 'connectedness';

export const DIMENSION_IDS: readonly DimensionId[] = [
  'breaks', 'feeling', 'safety', 'connectedness',
] as const;

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
  /**
   * How this pod is doing on each dimension, nought to ten.
   *
   * ── AN ABSENT KEY MEANS NO DATA, AND THAT IS THE POINT ──────────────────
   * Half the pods have nothing to say on any given dimension, and the map
   * draws them grey. That is not a gap in the fixture; it is the most honest
   * thing on the screen. A pod of three or four people cannot be reported on
   * without reporting on individuals, and a question that was not asked in
   * this pod's exercises this month has no answer however much somebody wants
   * one.
   *
   * A VALUE OF 0 WOULD BE A CLAIM — "we measured, and it is terrible" — so
   * nothing is ever stored as 0 to mean absence. `orgModel.test.ts` holds
   * that, and holds the half: exactly nine of the eighteen pods are silent on
   * every dimension, and which nine is different each time.
   */
  scores: Partial<Record<DimensionId, number>>;
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
  { id: 'payments', name: 'Payments', members: { eng: 6, pd: 3 }, scores: { breaks: 6.2, feeling: 6.8, safety: 6.1 } },
  { id: 'platform', name: 'Platform', members: { eng: 7, pd: 1 }, scores: { breaks: 7.4, safety: 7.2, connectedness: 7.5 } },
  { id: 'mobile', name: 'Mobile', members: { eng: 5, pd: 3 }, scores: { feeling: 7.1, connectedness: 7.8 } },
  { id: 'infra', name: 'Infrastructure', shortName: 'Infra', members: { eng: 7 }, scores: { breaks: 7.8, safety: 7.6 } },
  { id: 'growth', name: 'Growth', members: { eng: 4, pd: 1, mktg: 2 }, scores: { breaks: 5.9, feeling: 6.3, connectedness: 8.1 } },
  { id: 'enterprise', name: 'Enterprise', members: { gtm: 7 }, scores: { breaks: 4.6 } },
  { id: 'midmarket', name: 'Mid-Market', members: { gtm: 7 }, scores: {} },
  { id: 'data', name: 'Data', members: { eng: 5, pd: 1 }, scores: { feeling: 7.3, safety: 6.9, connectedness: 7.2 } },
  { id: 'devex', name: 'Developer Experience', shortName: 'DevEx', members: { eng: 5 }, scores: { safety: 7.4 } },
  { id: 'salesops', name: 'Sales Engineering', shortName: 'Sales Eng', members: { gtm: 3, eng: 2 }, scores: { breaks: 6.4, safety: 5.8, connectedness: 7.6 } },
  { id: 'support', name: 'Support', members: { cs: 5 }, scores: { breaks: 3.9, feeling: 4.4 } },
  { id: 'onboarding', name: 'Onboarding', shortName: 'Onboard', members: { cs: 4, pd: 1 }, scores: { breaks: 5.4, feeling: 6.0, safety: 5.1, connectedness: 7.4 } },
  { id: 'quality', name: 'Quality', members: { eng: 4 }, scores: {} },
  { id: 'partnerships', name: 'Partnerships', shortName: 'Partners', members: { gtm: 3, mktg: 1 }, scores: { feeling: 6.6, connectedness: 7.9 } },
  { id: 'content', name: 'Content', members: { mktg: 2, pd: 2 }, scores: { feeling: 7.0, safety: 4.3, connectedness: 6.8 } },
  { id: 'demand', name: 'Demand', members: { mktg: 3 }, scores: {} },
  { id: 'people', name: 'People', members: { ops: 3 }, scores: { breaks: 7.1, safety: 6.7 } },
  { id: 'finance', name: 'Finance', members: { ops: 3 }, scores: { feeling: 5.2, connectedness: 5.4 } },
] as const;
