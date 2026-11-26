/**
 * The store: where a visitor's page opens. Each case loads settings.ts afresh
 * against a stand-in window, because the state is read once, at load.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

type Store = typeof import('./settings');

function browser(hash = '', stored: Record<string, string> = {}) {
  const items = new Map(Object.entries(stored));
  const win = {
    location: { hash, pathname: '/experiments/duett/', search: '' },
    history: { replaceState: (_: unknown, __: string, url: string) => (win.location.hash = url.slice(url.indexOf('#'))) },
    localStorage: {
      getItem: (k: string) => items.get(k) ?? null,
      setItem: (k: string, v: string) => void items.set(k, v),
    },
  };
  return { win, items };
}

async function load(win: object): Promise<Store> {
  vi.resetModules();
  vi.stubGlobal('window', win);
  return import('./settings');
}

afterEach(() => vi.unstubAllGlobals());

const OLD = 'on=faster&fig=frage,sequenz,spiegel,erinnerung,bogen,pendel';

describe('where the page opens', () => {
  it('a state stored before START last changed gives way to START', async () => {
    const { win } = browser('', { 'duett-settings': OLD });
    const s = await load(win);
    expect(s.settings()).toEqual(s.START);
  });

  it('so does one stored under an older START', async () => {
    const { win } = browser('', { 'duett-settings': OLD, 'duett-start': 'on=faster&fig=frage,sequenz' });
    const s = await load(win);
    expect(s.settings()).toEqual(s.START);
  });

  it('a state stored under this START is kept across a reload', async () => {
    const first = browser();
    const a = await load(first.win);
    expect(a.settings()).toEqual(a.START);
    a.setSettings((cur) => ({ ...cur, figures: { ...cur.figures, bogen: true } }));
    expect(first.items.get(a.STORAGE_START_KEY)).toBe(a.encode(a.START));

    const again = browser('', Object.fromEntries(first.items));
    const b = await load(again.win);
    expect(b.settings().figures.bogen).toBe(true);
    expect(b.settings()).toEqual({ ...b.START, figures: { ...b.START.figures, bogen: true } });
  });

  it('a link opens on what it says, whatever is stored', async () => {
    const { win } = browser('#fig=bogen', { 'duett-settings': OLD });
    const s = await load(win);
    expect(s.settings()).toEqual(s.decode('#fig=bogen'));
  });

  it('opens with Frage und Antwort and Pendel as the only figures', async () => {
    const s = await load(browser().win);
    const on = Object.entries(s.settings().figures).filter(([, v]) => v).map(([k]) => k);
    expect(on).toEqual(['frage', 'pendel']);
  });
});
