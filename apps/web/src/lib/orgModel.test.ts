/**
 * The arithmetic, held as tests.
 *
 * The map shows the same hundred people three different ways, and a reader
 * will add them up. Every claim below is one the three tabs make to each
 * other, and all of them fail silently: a department that double-counts a
 * shared pod still renders, it just quietly disagrees with the tab beside it.
 */
import { describe, expect, it } from 'vitest';
import { DEPARTMENTS, DIMENSION_IDS, FILTER_IDS, METRICS_BY_FILTER, PODS } from './orgFixture';
import type { DepartmentId } from './orgFixture';
import {
  COMPANY_NODE, DEPARTMENT_NODES, LINKS, POD_NODES, bandOf, companyScore,
  departmentHeadcount, departmentScore, linksOfPod, nodeById, podTotal, scoreOf, statusOf,
  statusForMetric,
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

describe('the traffic light', () => {
  it('leaves exactly half the pods with nothing to say, on every dimension', () => {
    /* Ben's number, and it is the honest half rather than a gap in the
       fixture: a pod of three or four cannot be reported on without reporting
       on individuals. If an edit fills these in, the map stops making the
       point it exists to make. */
    for (const dimension of DIMENSION_IDS) {
      const silent = PODS.filter((pod) => pod.scores[dimension] === undefined);
      expect(silent, dimension).toHaveLength(9);
      expect(silent.length / PODS.length, dimension).toBe(0.5);
    }
  });

  it('silences a different nine each time, so each dimension is a new picture', () => {
    const sets = DIMENSION_IDS.map((d) =>
      PODS.filter((pod) => pod.scores[d] === undefined).map((p) => p.id).sort().join(','));
    expect(new Set(sets).size).toBe(DIMENSION_IDS.length);
  });

  it('never leaves a department or the company grey', () => {
    /* The other half of Ben's number: 0% no-data above pod level. It holds
       because a department is twenty to forty-five people and some pod inside
       it has always answered — not because anything is filled in by hand. */
    for (const dimension of DIMENSION_IDS) {
      expect(companyScore(dimension), dimension).not.toBeNull();
      for (const node of DEPARTMENT_NODES) {
        expect(scoreOf(node.id, dimension), `${node.id}/${dimension}`).not.toBeNull();
        expect(statusOf(node.id, dimension), `${node.id}/${dimension}`).not.toBe('none');
      }
    }
  });

  it('never stores a nought, because a nought is a claim', () => {
    for (const pod of PODS) {
      for (const [dimension, score] of Object.entries(pod.scores)) {
        expect(score, `${pod.id}/${dimension}`).toBeGreaterThan(0);
        expect(score, `${pod.id}/${dimension}`).toBeLessThanOrEqual(10);
      }
    }
  });

  it('skips the silent pods rather than counting them as zero', () => {
    /* Counting a pod with no data as 0 would drag a department down in
       proportion to how little it had measured — the opposite of what a reader
       should take from missing data. Engineering has nine pods and only some
       speak on any dimension; its score must sit inside the range of those
       that do. */
    for (const dimension of DIMENSION_IDS) {
      const heard = PODS
        .filter((pod) => pod.scores[dimension] !== undefined && pod.members.eng !== undefined)
        .map((pod) => pod.scores[dimension] as number);
      const score = departmentScore('eng', dimension);
      expect(score, dimension).not.toBeNull();
      expect(score as number, dimension).toBeGreaterThanOrEqual(Math.min(...heard));
      expect(score as number, dimension).toBeLessThanOrEqual(Math.max(...heard));
    }
  });

  it('bands on seven and five and a half', () => {
    expect(bandOf(7)).toBe('good');
    expect(bandOf(6.9)).toBe('watch');
    expect(bandOf(5.5)).toBe('watch');
    expect(bandOf(5.4)).toBe('poor');
  });

  it('gives a pod with no data the status none, and one with data a colour', () => {
    expect(statusOf('midmarket', 'breaks')).toBe('none');
    expect(statusOf('support', 'breaks')).toBe('poor');
    expect(statusOf('infra', 'breaks')).toBe('good');
  });

  it('shows all four lights on at least one dimension', () => {
    /* A traffic light with one bulb is a dot. Every dimension must produce a
       picture rather than a wash. */
    for (const dimension of DIMENSION_IDS) {
      const lights = new Set(POD_NODES.map((node) => statusOf(node.id, dimension)));
      expect(lights.has('none'), dimension).toBe(true);
      expect(lights.size, dimension).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('the Musie Outcomes half', () => {
  it('offers two measures under outcomes and four under insight', () => {
    expect(METRICS_BY_FILTER.outcomes).toEqual(['breaksUsage', 'moodLift']);
    expect(METRICS_BY_FILTER.insight).toHaveLength(4);
    /* SegmentedControl is specified for two to four and warns outside it. */
    for (const id of FILTER_IDS) {
      expect(METRICS_BY_FILTER[id].length, id).toBeGreaterThanOrEqual(2);
      expect(METRICS_BY_FILTER[id].length, id).toBeLessThanOrEqual(4);
    }
  });

  it('shows only green and grey for breaks usage — never orange or red', () => {
    /* A pod takes its Musie Moments or it does not. There is no halfway, so
       the legend keys two lights and the map must not produce a third. */
    const lights = new Set(POD_NODES.map((n) => statusForMetric(n.id, 'breaksUsage')));
    expect([...lights].sort()).toEqual(['good', 'none']);
  });

  it('shows almost all green and exactly one orange for mood lift', () => {
    const lights = POD_NODES.map((n) => statusForMetric(n.id, 'moodLift'));
    expect(lights.filter((s) => s === 'watch')).toHaveLength(1);
    expect(lights.filter((s) => s === 'good')).toHaveLength(17);
    /* No grey at all here: every pod that uses Musie has an answer about
       whether it helped, so absence would be a different claim. */
    expect(lights.filter((s) => s === 'none')).toHaveLength(0);
    expect(lights.filter((s) => s === 'poor')).toHaveLength(0);
  });

  it('names the one pod Musie is not reaching', () => {
    const flat = POD_NODES.filter((n) => statusForMetric(n.id, 'moodLift') === 'watch');
    expect(flat.map((n) => n.id)).toEqual(['midmarket']);
    /* And it is the same pod that does not take the breaks — which is the
       point of having both measures rather than one. */
    expect(statusForMetric('midmarket', 'breaksUsage')).toBe('none');
  });

  it('never greys a department or the company on an outcome either', () => {
    for (const metric of METRICS_BY_FILTER.outcomes) {
      expect(statusForMetric('northwind', metric), metric).not.toBe('none');
      for (const node of DEPARTMENT_NODES) {
        expect(statusForMetric(node.id, metric), `${node.id}/${metric}`).not.toBe('none');
      }
    }
  });

  it('settles a parent by the reading most of its people are covered by', () => {
    /* Not an average: there is nothing halfway between a pod that uses Musie
       and one that does not. Engineering has fourteen people in pods that do
       not, out of forty-five — so Engineering uses it. */
    const notUsing = PODS
      .filter((pod) => pod.outcomes.breaksUsage === 'none')
      .reduce((total, pod) => total + (pod.members.eng ?? 0), 0);
    expect(notUsing).toBe(14);
    expect(notUsing * 2).toBeLessThan(departmentHeadcount('eng'));
    expect(statusForMetric('eng', 'breaksUsage')).toBe('good');
  });

  it('routes every metric through one call', () => {
    for (const metric of [...METRICS_BY_FILTER.outcomes, ...METRICS_BY_FILTER.insight]) {
      for (const node of POD_NODES) {
        expect(['none', 'good', 'watch', 'poor'], `${node.id}/${metric}`)
          .toContain(statusForMetric(node.id, metric));
      }
    }
  });
});
