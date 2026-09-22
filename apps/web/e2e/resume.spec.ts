/**
 * *Continue session* comes back to where you stopped — and does not rewind.
 *
 * ── WHY NOTHING IN THE SUITE COULD SEE THIS ───────────────────────────────
 * Every part of it worked. `sessions.step` tracked the walk correctly,
 * intro → scan → listen. The drawer built the right href, `/session/…/listen`.
 * Only the ARRIVAL was broken: the machine's refusal guard ran one frame
 * before the row reached it, read a reducer that still said `intro`, decided
 * `listen` was unreachable and redirected — and the reconciliation then wrote
 * `intro` back to the row.
 *
 * So the session was not merely resumed at the wrong step. It was REWOUND, and
 * the row it rewound was the only record of where the person had got to. A
 * walk that finishes a session in one sitting never leaves and comes back, so
 * it never sees this. Ben found it by hand on the first try.
 *
 * ── WHAT THIS ASSERTS, AND WHY IT IS THE ROW AND NOT THE URL ──────────────
 * Both. The URL proves the resume landed; the ROW proves it did not overwrite
 * the thing it was resuming from. The second is the one that made this a data
 * bug rather than a navigation one, and a URL-only assertion would have gone
 * green while the damage was done.
 */
import { expect, test } from '@playwright/test';
import { enterCode, label, reachTheLibrary, service, withLocale } from './support';
import type { Locale } from './support';

test('continue session returns to the step you stopped on', async ({ page }, testInfo) => {
  const locale = testInfo.project.name as Locale;
  test.setTimeout(120_000);

  await withLocale(page, locale);
  await reachTheLibrary(page, locale);

  await page.getByRole('radio').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: label(locale, 'exercises.start'), exact: true }).click();

  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+\/intro$/);
  const sessionId = (/\/session\/([0-9a-f-]+)\//.exec(page.url()) ?? [])[1];
  expect(sessionId).toBeTruthy();

  const db = service();
  const storedStep = async () => {
    const { data } = await db.from('sessions').select('step').eq('id', sessionId).single();
    return (data as { step: string } | null)?.step ?? null;
  };

  /* ── Walk in as far as the listen step ────────────────────────────────*/
  await page.getByRole('button', { name: label(locale, 'common.continue'), exact: true }).click();
  await expect(page).toHaveURL(/\/scan$/);

  await enterCode(page, locale, 'MC-01');
  await expect(page.getByText(label(locale, 'session.scan.yourCard'), { exact: true }))
    .toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: label(locale, 'common.continue'), exact: true }).click();
  await expect(page).toHaveURL(/\/listen$/);

  /* The row has to agree before leaving, or the rest of this proves nothing:
     a resume that lands on `intro` is correct if `intro` is what was stored. */
  await expect.poll(storedStep, { timeout: 10_000 }).toBe('listen');

  /* ── Leave, the way a person leaves ───────────────────────────────────*/
  await page.goto('/diary');
  await expect(page).toHaveURL(/\/diary$/);

  /* ── And come back through the drawer's own control ───────────────────*/
  await page.goto('/menu');
  const resume = page.locator('a[href*="/session/"]').first();
  await expect(resume).toBeVisible({ timeout: 15_000 });
  await expect(
    resume,
    'the drawer offered to resume at the wrong step',
  ).toHaveAttribute('href', new RegExp(`/session/${sessionId}/listen$`));

  await resume.click();

  /* THE URL: the resume landed where it was aimed. */
  await expect(page, 'resuming did not land on the stored step')
    .toHaveURL(new RegExp(`/session/${sessionId}/listen$`), { timeout: 15_000 });

  /* THE ROW: and arriving did not overwrite it. This is the assertion the bug
     was actually made of — the URL alone was wrong for one frame and then
     right again, while the row stayed wrong for ever. */
  await page.waitForTimeout(1_000);
  expect(await storedStep(), 'resuming rewound the stored step').toBe('listen');

  /* And the step really is the one on screen, not merely the one in the URL. */
  await expect(
    page.locator('.musie-listen__view--stage'),
    'the listen step did not render after resuming',
  ).toBeVisible();
});
