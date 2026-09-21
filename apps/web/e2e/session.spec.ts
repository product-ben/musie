/**
 * ONE WALK OF A WHOLE SESSION, and then the rows it left in Postgres.
 *
 * D.6's done-when is "deleting a line from the reducer makes it fail", which is
 * why this asserts the DATABASE and not only the screen. A test that only read
 * the UI would pass against a flow that draws four steps and writes nothing —
 * which is exactly what the flow was before D.4.
 *
 * ── IT RUNS TWICE, ONCE PER LOCALE, AND THE GERMAN RUN IS THE POINT ────────
 * A string hardcoded in English renders identically in the English run and is
 * invisible there. So nothing below matches on user-visible copy: every step
 * is found by ROLE, by a stable `aria-label` built from the catalogue, or by
 * the URL. The one German-specific assertion is the last one — that the page
 * is in German at all — because a run that silently fell back to English would
 * otherwise pass.
 *
 * ── WHY IT TALKS TO THE DATABASE DIRECTLY AT THE END ───────────────────────
 * The service role bypasses RLS, so the assertions can see the row regardless
 * of which anonymous user the browser happens to be. That is the same posture
 * `db.support.ts` takes for the security suite, and for the same reason: it is
 * used ONLY to read back what the client wrote, never to set up state the
 * client should be creating itself.
 */
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/** The stack's keys, read from the running stack rather than committed. */
function stack(): { API_URL: string; SERVICE_ROLE_KEY: string } {
  let raw: string;
  try {
    raw = execFileSync('supabase', ['status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    throw new Error(
      'The local Supabase stack is not reachable. Run `supabase start`, then ' +
        '`pnpm test:e2e` again. This test is deliberately NOT in `pnpm check` ' +
        'and is never skipped.',
    );
  }
  const parsed = JSON.parse(raw) as Partial<{ API_URL: string; SERVICE_ROLE_KEY: string }>;
  if (!parsed.API_URL || !parsed.SERVICE_ROLE_KEY) {
    throw new Error('`supabase status -o json` returned no keys.');
  }
  return { API_URL: parsed.API_URL, SERVICE_ROLE_KEY: parsed.SERVICE_ROLE_KEY };
}

const service = () => {
  const { API_URL, SERVICE_ROLE_KEY } = stack();
  return createClient(API_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

/**
 * Put the locale in before the first paint, exactly where index.html looks for
 * it. This is what makes the German run a German SESSION rather than a German
 * browser looking at an English app.
 */
async function withLocale(page: Page, locale: 'en' | 'de') {
  await page.addInitScript((value) => {
    try {
      window.localStorage.setItem('musie-locale', value);
    } catch {
      /* Private mode. The detection path then decides, which is fine. */
    }
  }, locale);
}

/** The answer we type, per locale, so the assertion can tell the runs apart. */
const ANSWER = {
  en: 'A tightness behind the ribs, and then less of it.',
  de: 'Eine Enge hinter den Rippen, und dann weniger davon.',
};

/**
 * THE LOCALE COMES FROM THE PROJECT, NOT FROM A LOOP.
 *
 * An earlier version looped over both locales inside the file, which the two
 * projects then multiplied: four runs, two of them testing German under an
 * English project and reporting it as English. One test, declared once, run
 * once per project — which is what `projects` is for.
 */
test('a whole session lands in Postgres', async ({ page }, testInfo) => {
    const locale = testInfo.project.name as 'en' | 'de';
    test.setTimeout(120_000);

    await withLocale(page, locale);

    /* ── The way in ────────────────────────────────────────────────────────
       A fresh browser profile has no user type, so `/` is the explainer. The
       CTA is locked until the last slide has been SEEN — which is the gate
       D.1 built, and walking it is the only way past. */
    await page.goto('/');

    const carousel = page.getByRole('group', { name: /.+/ }).first();
    await expect(carousel).toBeVisible({ timeout: 15_000 });

    /* Press Next until it is disabled. Found by position in the carousel's own
       controls rather than by its label, so the German run finds the same
       button without the test knowing German. */
    const next = page.locator('.musy-carousel__controls button').last();
    for (let i = 0; i < 10; i += 1) {
      if (await next.isDisabled()) break;
      await next.click();
      await page.waitForTimeout(150);
    }
    await expect(next).toBeDisabled();

    /* The stage's single action, now unlocked. */
    const start = page.locator('.musie-cta-stack button');
    await expect(start).toBeEnabled();
    await start.click();

    /* ── About you ─────────────────────────────────────────────────────────
       "By myself" is PRESELECTED, so Continue is live on arrival and nothing
       has to be clicked. The walk accepts the default deliberately — that is
       the path almost everyone takes, and it is the one where Continue has to
       do the writing, because no pick ever fired. If it did not, the drawer
       would bounce this session straight back here. */
    await expect(page).toHaveURL(/\/about-you$/);
    await expect(page.getByRole('radio').first()).toBeChecked();

    const carryOn = page.locator('.musie-cta-stack button');
    await expect(carryOn).toBeEnabled();
    await carryOn.click();

    /* ── The library ───────────────────────────────────────────────────────
       The first card is Quick Mindfulness Break, the one exercise that is
       implemented. Tapping it opens the detail; the detail starts the run. */
    await expect(page).toHaveURL(/\/exercises$/);
    await page.locator('.musy-rcard__body').first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    /* NOT `.last()`. `Lightbox` renders its close X AFTER `children`, so the
       last button in the dialog is Close — which dismissed the detail and left
       the walk on /exercises wondering why no session had started. The start
       control is the only button in the detail's `ButtonGroup`. */
    await dialog.locator('.musy-btn-group button').click();

    /* ── Intro → scan ──────────────────────────────────────────────────────*/
    await expect(page).toHaveURL(/\/session\/[0-9a-f-]+\/intro$/);
    const sessionId = (/\/session\/([0-9a-f-]+)\//.exec(page.url()) ?? [])[1];
    expect(sessionId).toBeTruthy();

    await page.locator('.musy-wizard__actions button').last().click();
    await expect(page).toHaveURL(/\/scan$/);

    /* The simulated scan. It writes `card_id` AND `track_id` in one update,
       which is what the assertions at the foot of this test check. */
    await page.locator('.musy-msg__action button').click();
    await expect(page.locator('.musy-clist')).toBeVisible({ timeout: 15_000 });

    /* *Scan a different card* RESETS the step rather than re-rolling: the
       reader comes back and the next draw is an act the person takes. Walked
       here because the reset writes nulls to two columns, and a version that
       silently kept the old track would still look right on screen. */
    await page.locator('.musy-wizard__actions button').nth(1).click();
    await expect(page.locator('.musy-msg__action button')).toBeVisible({ timeout: 15_000 });
    await page.locator('.musy-msg__action button').click();
    await expect(page.locator('.musy-clist')).toBeVisible({ timeout: 15_000 });

    await page.locator('.musy-wizard__actions button').last().click();
    await expect(page).toHaveURL(/\/listen$/);

    /* ── Listen, and the gate ──────────────────────────────────────────────
       Ninety seconds of a ~200-second track is ninety real seconds, which no
       test should sit through. The gate is a PRODUCT rule, not a timing one,
       so it is satisfied the way the product satisfies it — by playing — and
       the waiting is what gets skipped.

       THE FAKE CLOCK IS INSTALLED BEFORE THE PLAY, NOT AFTER. There are no
       audio files, so the step falls back to a `setInterval` that it creates
       WHEN PLAYBACK STARTS; a clock installed afterwards does not own that
       interval and `fastForward` moves nothing. Installed first, the interval
       is created against the fake timers and the countdown is ours to run.
       (That ordering is the whole of the fix — the first version of this test
       installed it after the click and sat there watching a disabled button.) */
    await page.clock.install();

    const transport = page.locator('.musy-mbtn');
    await expect(transport).toBeVisible();

    const onwards = page.locator('.musy-wizard__actions button').last();
    await expect(onwards).toBeDisabled();

    await transport.click();
    /* WAIT FOR PLAYBACK TO ACTUALLY START BEFORE RUNNING THE CLOCK. `play()`
       has to go to the network and be refused before the step falls back to
       its interval, and that refusal is a real round trip — so a `runFor`
       issued immediately advances a clock that nothing is listening to yet,
       and the interval then starts against a clock that has stopped moving.
       `TrackButton` puts its transport state on the element, which is the
       honest signal that the fallback is running. */
    await expect(transport).toHaveAttribute('data-state', 'playing', { timeout: 15_000 });

    /* `runFor`, not `fastForward`: the interval has to actually FIRE, because
       each tick is the state update the gate reads. */
    await page.clock.runFor('01:35');

    await expect(onwards).toBeEnabled({ timeout: 15_000 });
    await onwards.click();

    /* ── Reflect ───────────────────────────────────────────────────────────
       Text is the only mode that can complete the step: voice and photo are
       interactive mockups and write nothing (MOCKUPS.md 1 and 2). */
    await expect(page).toHaveURL(/\/reflect$/);

    const written = page.getByRole('radio').nth(1);
    await written.click();
    await page.locator('textarea').fill(ANSWER[locale]);

    const finish = page.locator('.musy-wizard__actions button').last();
    await expect(finish).toBeEnabled();
    await finish.click();

    /* ── It lands in the DIARY LIST, and there is no end screen ────────────
       Not the entry: finishing hands you your diary rather than one page of
       it, and the list leads with the session you just finished. */
    await expect(page).toHaveURL(/\/diary$/);
    await expect(page.locator('.musy-box--framed')).toBeVisible({ timeout: 15_000 });

    /* ── AND THE ROWS ARE IN POSTGRES ──────────────────────────────────────*/
    const db = service();

    const { data: session } = await db
      .from('sessions')
      .select('id, exercise_id, card_id, track_id, status, step, started_at, ended_at')
      .eq('id', sessionId)
      .single();

    expect(session).toBeTruthy();
    expect(session!.exercise_id).toBe('mindfulness-cards');
    expect(session!.status).toBe('finished');
    expect(session!.step).toBe('reflect');
    /* The scan wrote both, together. */
    expect(session!.card_id).toMatch(/^mc-\d\d$/);
    expect(session!.track_id).toMatch(/^trk-\d\d$/);
    /* `sessions_ended_at_matches_status` guarantees this, and asserting it is
       how we find out the day somebody drops the constraint. */
    expect(session!.ended_at).not.toBeNull();

    const { data: reflection } = await db
      .from('reflections')
      .select('mode, body')
      .eq('session_id', sessionId)
      .single();

    expect(reflection).toBeTruthy();
    expect(reflection!.mode).toBe('text');
    expect(reflection!.body).toBe(ANSWER[locale]);

    /* THE ONE LOCALE-SPECIFIC ASSERTION. A run that silently fell back to
       English would satisfy everything above. */
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
  });
