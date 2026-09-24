/**
 * The listen step opens on its stage, whichever way you reached it.
 *
 * ── WHAT WENT WRONG, AND WHY NOTHING CAUGHT IT ────────────────────────────
 * Reported from a card scan (Ben, 2026-09-24): arrive at `listen` and the page
 * is where the previous step left it rather than at the top. The stage is the
 * step's first view — the question to hold and the button that starts the
 * track — so opening below it is opening past the only thing the step asks
 * for.
 *
 * `AppShell` already scrolls to the top on every arrival, and it really does
 * fire here. It loses: `<html>` is a MANDATORY snap container for as long as
 * this step is mounted (`useScrollSnap`), and the engine pulls a plain
 * `window.scrollTo` back to a snap position. MEASURED on this walk, before the
 * fix: the shell scrolled to 0 and the page settled at 195.
 *
 * ── A SHORT WINDOW, AND THAT IS THE WHOLE TEST ────────────────────────────
 * The bug only shows when the offset carried in is far enough down that the
 * snap engine parks somewhere other than the top — near the top it snaps to
 * the first view and hides the defect completely. A tall phone in portrait
 * cannot scroll the scan step far enough; a phone in LANDSCAPE can, which is
 * what 375 block-size is. Same defect, a window that can see it.
 *
 * ── AND IT WALKS FORWARD WITH *Continue*, NOT WITH A CODE ─────────────────
 * Naming a card re-reads the row (`onRescan`), so the arrival frame is the
 * loading note — a window-high page, which clamps the offset to 0 on the way
 * past and hides the same defect on a browser that clamps promptly. Continue
 * from a card already drawn changes the step and nothing else, so the page
 * never shrinks and the offset is carried in exactly as a device carries it.
 */
import { expect, test } from '@playwright/test';
import { enterCode, label, reachTheLibrary, startExercise, withLocale } from './support';
import type { Locale } from './support';

/** A landscape phone. See the header: portrait cannot scroll the scan step far
 *  enough to tell a working reset from a snap that happened to agree with it. */
test.use({ viewport: { width: 390, height: 375 } });

const scrollY = (page: import('@playwright/test').Page) =>
  page.evaluate(() => window.scrollY);

test('the listen step opens at the top of its stage', async ({ page }, testInfo) => {
  const locale = testInfo.project.name as Locale;
  test.setTimeout(120_000);

  await withLocale(page, locale);
  await reachTheLibrary(page, locale);
  await startExercise(page);

  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+\/intro$/);
  await page.getByRole('button', { name: label(locale, 'common.continue'), exact: true }).click();
  await expect(page).toHaveURL(/\/scan$/);

  /* A card, so the step ahead has a recording and the step behind has its
     drawn-card state — which is what Back returns to and Continue leaves. */
  await enterCode(page, locale, 'MC-06');
  await expect(page).toHaveURL(/\/listen$/, { timeout: 15_000 });

  /* Back to the card, down the page, and forward again. */
  await page.getByRole('button', { name: label(locale, 'common.back'), exact: true }).click();
  await expect(page).toHaveURL(/\/scan$/, { timeout: 15_000 });
  /* THE STEP ITSELF, not just the URL. The address changes a render before the
     step is drawn, and measuring in between measures the page being left. */
  await expect(
    page.getByRole('button', { name: label(locale, 'session.scan.again'), exact: true }),
  ).toBeVisible({ timeout: 15_000 });

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => scrollY(page)).toBeGreaterThan(0);
  const carried = await scrollY(page);

  await page.getByRole('button', { name: label(locale, 'common.continue'), exact: true }).click();
  await expect(page).toHaveURL(/\/listen$/, { timeout: 15_000 });

  /* SETTLED, not sampled once. The defect is a scroll that lands and is then
     pulled back, so a single read straight after the navigation could see the
     right number on its way to the wrong one. */
  await expect.poll(() => scrollY(page), { timeout: 5_000, intervals: [100, 200, 500, 1000] })
    .toBe(0);
  expect(carried).toBeGreaterThan(0);

  /* AND SNAPPING IS BACK ON. The jump holds it off for as long as the scroll
     takes (`withoutSnapping`); a walk that only asserted the position would
     pass just as well with it held off forever. */
  await expect(page.locator('html')).toHaveAttribute('data-musy-scroll-snap', 'y');
});
