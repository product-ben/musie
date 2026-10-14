/**
 * The pages, checked as a set.
 *
 * `vitepress build` catches a dead link and nothing else about content. These
 * four assertions cover the failures that are invisible in a built page:
 *
 *   1. AN UNBALANCED CONTAINER. `::: devs` without its `:::` swallows the rest
 *      of the page into one audience, and the page still builds and still
 *      looks plausible to whoever is on that tab.
 *   2. A PAGE WITH ONLY ONE HALF. The whole promise of this site is that every
 *      page is written for both readers. A page missing a half is a page that
 *      is blank for half its audience — and blank, not broken, so nothing
 *      complains.
 *   3. A LEFTOVER STUB. The marker every page started life with.
 *   4. AN UNESCAPED `{{`. VitePress compiles markdown as a Vue template, so a
 *      GitHub Actions expression written inline fails SSR with
 *      `Cannot read properties of undefined (reading 'ref')` — which names
 *      neither the file nor the cause. Learned the hard way on the CI/CD page.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SKIP = new Set(['.vitepress', 'node_modules']);

function pages(dir = ROOT): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return SKIP.has(entry.name) ? [] : pages(join(dir, entry.name));
    }
    return entry.name.endsWith('.md') ? [join(dir, entry.name)] : [];
  });
}

/** Every page, as `path → source`. The home page is a frontmatter-only hero. */
const ALL = pages().map((file) => ({
  path: relative(ROOT, file),
  source: readFileSync(file, 'utf8'),
}));

/** Content pages — the home page has no prose and no audience halves. */
const CONTENT = ALL.filter((page) => page.path !== 'index.md');

/** Strip fenced code blocks, where `:::` and `{{` are just characters. */
function withoutFences(source: string): string {
  return source.replace(/^```[\s\S]*?^```/gm, '');
}

describe('every page', () => {
  it('there are pages at all', () => {
    expect(ALL.length).toBeGreaterThan(40);
  });

  it.each(CONTENT.map((p) => p.path))('%s · has balanced audience containers', (path) => {
    const source = withoutFences(ALL.find((p) => p.path === path)!.source);
    const opens = source.match(/^::: (devs|designers)$/gm) ?? [];
    const closes = source.match(/^:::$/gm) ?? [];
    expect(closes.length, 'one `:::` closer per opener').toBe(opens.length);
  });

  it.each(CONTENT.map((p) => p.path))('%s · is written for both audiences', (path) => {
    const source = withoutFences(ALL.find((p) => p.path === path)!.source);
    expect(source, 'a `::: devs` block').toMatch(/^::: devs$/m);
    expect(source, 'a `::: designers` block').toMatch(/^::: designers$/m);
  });

  it.each(ALL.map((p) => p.path))('%s · is not a leftover stub', (path) => {
    expect(ALL.find((p) => p.path === path)!.source).not.toContain('TO-WRITE-MARKER');
  });

  it.each(ALL.map((p) => p.path))('%s · escapes Vue interpolation', (path) => {
    const source = withoutFences(ALL.find((p) => p.path === path)!.source);
    for (const line of source.split('\n')) {
      if (!line.includes('{{')) continue;
      expect(line, 'a line with `{{` must be wrapped in <span v-pre>').toContain('v-pre');
    }
  });

  it.each(CONTENT.map((p) => p.path))('%s · names its source of truth', (path) => {
    expect(ALL.find((p) => p.path === path)!.source).toContain('**Source of truth:**');
  });
});

/**
 * The sidebar, against the pages on disk.
 *
 * `vitepress build` fails on a dead link in MARKDOWN and says nothing about
 * the sidebar — a nav entry pointing at a page that does not exist is a 404
 * that the build reports as success. With 45 entries across six groups that is
 * worth a test rather than a habit.
 */
describe('the sidebar', () => {
  const config = readFileSync(join(ROOT, '.vitepress/config.ts'), 'utf8');
  const links = [...new Set([...config.matchAll(/link: '(\/[^']*)'/g)].map((m) => m[1]))];

  /** '/' → index.md, '/features/' → features/index.md, '/work/backlog' → work/backlog.md */
  function pageFor(link: string): string {
    const path = link.replace(/^\/+/, '');
    if (path === '') return 'index.md';
    return path.endsWith('/') ? `${path}index.md` : `${path}.md`;
  }

  it('links to something', () => {
    expect(links.length).toBeGreaterThan(40);
  });

  it.each(links)('%s · resolves to a page that exists', (link) => {
    expect(ALL.map((p) => p.path)).toContain(pageFor(link));
  });

  it('leaves no page unreachable from the sidebar', () => {
    const reachable = new Set(links.map(pageFor));
    expect(ALL.map((p) => p.path).filter((path) => !reachable.has(path))).toEqual([]);
  });
});

/**
 * Every link into the repository, against the repository.
 *
 * The source-of-truth line at the foot of each page is this site's central
 * promise — it is what makes a derived view honest rather than a second,
 * competing description (DOC1). A link that 404s breaks that promise
 * **silently**: `vitepress build` only checks links between pages, and GitHub
 * answers a missing path with a page rather than an error.
 *
 * So this walks up out of the package and checks each path exists. That
 * coupling is deliberate: a file renamed in `apps/web` SHOULD fail a test in
 * `apps/docs`, because that rename is exactly what makes a page wrong.
 */
describe('links into the repository', () => {
  const REPO = fileURLToPath(new URL('../../../..', import.meta.url));
  const pattern = /https:\/\/github\.com\/product-ben\/musie\/(?:blob|tree)\/main\/([^)\s#]+)/g;

  const targets = [
    ...new Set(ALL.flatMap((page) => [...page.source.matchAll(pattern)].map((m) => m[1]))),
  ].sort();

  it('there are links to check', () => {
    expect(targets.length).toBeGreaterThan(50);
  });

  it.each(targets)('%s exists in the repository', (path) => {
    expect(existsSync(join(REPO, path)), `${path} is linked but not in the repo`).toBe(true);
  });
});
