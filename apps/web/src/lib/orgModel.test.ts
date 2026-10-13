/**
 * The arithmetic, held as tests.
 *
 * The map shows the same hundred people three different ways, and a reader
 * will add them up. Every claim below is one the three tabs make to each
 * other, and all of them fail silently: a department that double-counts a
 * shared pod still renders, it just quietly disagrees with the tab beside it.
 */
import { describe, expect, it } from 'vitest';
import { DEPARTMENTS, PODS } from './orgFixture';
import type { DepartmentId } from './orgFixture';
import {
  COMPANY_NODE, DEPARTMENT_NODES, LINKS, POD_NODES, departmentHeadcount, linksOfPod,
  nodeById, podTotal,
} from './orgModel';

const DEPARTMENT_IDS = DEPARTMENTS.map((d) => d.id);

describe('the same hundred people, three ways', () => {
  it('sums the pods to a hundred', () => {
    expect(PODS.reduce((total, pod) => total + podTotal(pod), 0)).toBe(100);
    expect(COMPANY_NODE.count).toBe(100);
  });

  it('sums the departments to the same hundred', () => {
    /* THE CLAIM THE WHOLE MODEL RESTS ON. If a shared pod were counted whole
       by each of its departments this would be 120, and the Departments tab
       would disagree with the Company tab on the same canvas. */
    const total = DEPARTMENT_NODES.reduce((sum, node) => sum + node.count, 0);
    expect(total).toBe(100);
    expect(total).toBe(COMPANY_NODE.count);
  });

  it('builds every department headcount out of the pods that draw on it', () => {
    for (const id of DEPARTMENT_IDS) {
      const byHand = PODS.reduce((total, pod) => total + (pod.members[id] ?? 0), 0);
      expect(departmentHeadcount(id), id).toBe(byHand);
    }
  });

  it('gives the departments the shape the example was designed around', () => {
    expect(Object.fromEntries(DEPARTMENT_NODES.map((n) => [n.id, n.count]))).toEqual({
      eng: 45, gtm: 20, pd: 12, cs: 9, mktg: 8, ops: 6,
    });
  });
});

describe('a pod draws on real departments', () => {
  it('names only departments that exist', () => {
    for (const pod of PODS) {
      for (const key of Object.keys(pod.members)) {
        expect(DEPARTMENT_IDS, pod.id).toContain(key as DepartmentId);
      }
    }
  });

  it('never records a department it takes nobody from', () => {
    /* "0 from Marketing" and "not a marketing pod" must not look alike: a zero
       key would draw a line carrying no people. */
    for (const pod of PODS) {
      for (const [key, people] of Object.entries(pod.members)) {
        expect(people, `${pod.id}/${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('has a unique id, and so does every department', () => {
    const ids = [...PODS.map((p) => p.id), ...DEPARTMENT_IDS];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('the links', () => {
  it('draws one per pod-department pair, and there are twenty-eight', () => {
    const pairs = PODS.reduce((total, pod) => total + Object.keys(pod.members).length, 0);
    expect(LINKS).toHaveLength(pairs);
    expect(LINKS).toHaveLength(28);
  });

  it('joins a pod to a department it genuinely draws from, with the right weight', () => {
    for (const link of LINKS) {
      const pod = PODS.find((p) => p.id === link.source);
      expect(pod, link.id).toBeDefined();
      expect(link.people).toBe(pod?.members[link.target as DepartmentId]);
      expect(DEPARTMENT_IDS).toContain(link.target as DepartmentId);
    }
  });

  it('accounts for every one of a pod‘s people across its own links', () => {
    for (const pod of PODS) {
      const across = linksOfPod(pod.id).reduce((total, link) => total + link.people, 0);
      expect(across, pod.id).toBe(podTotal(pod));
    }
  });

  it('actually exercises the cross-functional case', () => {
    /* Nine of eighteen. If an edit flattens the fixture into a tree the map
       still renders and stops demonstrating the thing it was built for. */
    const shared = PODS.filter((pod) => Object.keys(pod.members).length > 1);
    expect(shared).toHaveLength(9);
    expect(shared.map((p) => p.id)).toContain('growth');
    /* Growth is the three-department one, and the one worth looking at. */
    expect(Object.keys(PODS.find((p) => p.id === 'growth')?.members ?? {})).toHaveLength(3);
  });
});

describe('the nodes', () => {
  it('counts one company, six departments and eighteen pods', () => {
    expect(DEPARTMENT_NODES).toHaveLength(6);
    expect(POD_NODES).toHaveLength(18);
  });

  it('finds any node by id, and nothing by a name that is not one', () => {
    expect(nodeById('growth')?.kind).toBe('pod');
    expect(nodeById('eng')?.kind).toBe('department');
    expect(nodeById('northwind')?.kind).toBe('company');
    expect(nodeById('nope')).toBeNull();
  });

  it('gives every node a short form that fits a circle', () => {
    for (const node of [...DEPARTMENT_NODES, ...POD_NODES]) {
      expect(node.shortName.length, node.id).toBeLessThanOrEqual(12);
    }
  });
});
