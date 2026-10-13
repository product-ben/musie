/**
 * What the card claims, held as tests.
 *
 * The card is the only place on this screen that shows a figure rather than a
 * colour, which makes it the only place a reader could quote. Everything below
 * is something it would be quoted as saying.
 */
import { describe, expect, it } from 'vitest';
import { FEELING_WORDS, MOOD_MIXES, PODS } from './orgFixture';
import { CLOUD_SIZE, breaksCard, cloudCard, exercisesCard, scaleCard } from './orgCard';
import { DEPARTMENT_NODES, POD_NODES, statusForMetric } from './orgModel';

describe('mental health breaks', () => {
  it('reports a pod that takes none as silent rather than as nought a day', () => {
    /* "Nobody here takes a Musie Moment" and "they take 0.0 a day" are the
       same number and different sentences. The card has to be able to say the
       first, so the flag exists rather than being inferred from the figure. */
    const quiet = breaksCard('midmarket');
    expect(quiet.silent).toBe(true);
    expect(quiet.perDay).toBe(0);
    /* And the map agrees: a silent pod is grey on the usage metric. */
    expect(statusForMetric('midmarket', 'breaksUsage')).toBe('none');
  });

  it('matches the map everywhere — silent here is grey there, and vice versa', () => {
    for (const node of POD_NODES) {
      expect(breaksCard(node.id).silent, node.id)
        .toBe(statusForMetric(node.id, 'breaksUsage') === 'none');
    }
  });

  it('averages only the pods that take them', () => {
    /* Folding a zero pod in would answer "how often does a Northwind person
       take one" instead of "how often does somebody who uses Musie take one",
       and the first is already the colour on the map. */
    const eng = breaksCard('eng');
    const taking = PODS.filter((p) => p.breaksPerDay > 0 && p.members.eng !== undefined);
    const lowest = Math.min(...taking.map((p) => p.breaksPerDay));
    const highest = Math.max(...taking.map((p) => p.breaksPerDay));
    expect(eng.perDay).toBeGreaterThanOrEqual(lowest);
    expect(eng.perDay).toBeLessThanOrEqual(highest);
  });

  it('never leaves a department or the company silent', () => {
    expect(breaksCard('northwind').silent).toBe(false);
    for (const node of DEPARTMENT_NODES) {
      expect(breaksCard(node.id).silent, node.id).toBe(false);
    }
  });

  it('gives Support the heaviest use in the company', () => {
    /* The team that needs it most uses it most — the finding the whole
       fixture is arranged around. */
    const perDay = POD_NODES.map((n) => ({ id: n.id, ...breaksCard(n.id) }));
    const busiest = [...perDay].sort((a, b) => b.perDay - a.perDay)[0];
    expect(busiest.id).toBe('support');
  });
});

describe('the word clouds', () => {
  it('sums every authored mix to a hundred', () => {
    for (const [id, mix] of Object.entries(MOOD_MIXES)) {
      expect(mix.during.reduce((a, b) => a + b, 0), `${id} during`).toBe(100);
      expect(mix.after.reduce((a, b) => a + b, 0), `${id} after`).toBe(100);
      expect(mix.during, id).toHaveLength(FEELING_WORDS.length);
      expect(mix.after, id).toHaveLength(FEELING_WORDS.length);
    }
  });

  it('shows the six most common, in order, at every scope', () => {
    for (const node of [...POD_NODES, ...DEPARTMENT_NODES]) {
      for (const when of ['during', 'after'] as const) {
        const cloud = cloudCard(node.id, when);
        expect(cloud, `${node.id}/${when}`).toHaveLength(CLOUD_SIZE);
        for (let i = 1; i < cloud.length; i += 1) {
          expect(cloud[i - 1].share, `${node.id}/${when}`)
            .toBeGreaterThanOrEqual(cloud[i].share);
        }
      }
    }
  });

  it('moves from strain to ease between the two readings', () => {
    /* The thing both cloud cards exist to show. If an edit to the mixes
       inverts it the panel still renders and stops meaning anything. */
    for (const node of POD_NODES) {
      const strain = (when: 'during' | 'after') => cloudCard(node.id, when)
        .filter((w) => w.valence === 'strain')
        .reduce((total, w) => total + w.share, 0);
      expect(strain('after'), node.id).toBeLessThan(strain('during'));
    }
  });

  it('never shows a word nobody said', () => {
    for (const node of POD_NODES) {
      for (const word of cloudCard(node.id, 'after')) {
        expect(word.share, `${node.id}/${word.id}`).toBeGreaterThan(0);
        expect(word.weight, `${node.id}/${word.id}`).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe('the scales', () => {
  it('puts the marker where the score is, on a nought-to-ten track', () => {
    const safe = scaleCard('platform', 'safety');
    expect(safe?.value).toBeCloseTo(7.2, 5);
    expect(safe?.position).toBeCloseTo(72, 5);
  });

  it('returns nothing where there is no score to put on it', () => {
    /* A scale with no marker is a picture of a track. The card draws the
       no-data sentence instead. */
    expect(scaleCard('midmarket', 'safety')).toBeNull();
    expect(scaleCard('eng', 'safety')).not.toBeNull();
  });

  it('keeps every marker on the track', () => {
    for (const node of [...POD_NODES, ...DEPARTMENT_NODES]) {
      for (const metric of ['safety', 'connectedness'] as const) {
        const scale = scaleCard(node.id, metric);
        if (scale === null) continue;
        expect(scale.position, `${node.id}/${metric}`).toBeGreaterThanOrEqual(0);
        expect(scale.position, `${node.id}/${metric}`).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('the exercises', () => {
  it('offers three, and the same three every time', () => {
    const once = exercisesCard('support', 'safety');
    expect(once).toHaveLength(3);
    expect(exercisesCard('support', 'safety')).toEqual(once);
  });

  it('shares nothing between a safety card and a connectedness one', () => {
    /* `serves` is the whole reason the pool is tagged, and "some of them
       differ" was too weak a test: pooling the tagged and the general together
       gave the two cards two of the same three. They must now have NOTHING in
       common, at every node. */
    for (const node of POD_NODES) {
      const safety = exercisesCard(node.id, 'safety');
      const connect = exercisesCard(node.id, 'connectedness');
      expect(safety.filter((name) => connect.includes(name)), node.id).toEqual([]);
    }
  });

  it('never offers a connectedness exercise on a safety card', () => {
    const connectionOnly = ['Two Minutes Out', 'Walk and Listen', 'Three Good Things', 'Close the Day'];
    for (const node of POD_NODES) {
      for (const name of exercisesCard(node.id, 'safety')) {
        expect(connectionOnly, node.id).not.toContain(name);
      }
    }
  });

  it('never repeats one inside a single card', () => {
    for (const node of POD_NODES) {
      for (const metric of ['safety', 'connectedness'] as const) {
        const three = exercisesCard(node.id, metric);
        expect(new Set(three).size, `${node.id}/${metric}`).toBe(3);
      }
    }
  });
});
