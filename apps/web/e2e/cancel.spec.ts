/**
 * ONE WALK OF A SESSION THAT IS CLOSED RATHER THAN FINISHED — and the row it
 * leaves behind.
 *
 * `session.spec.ts` walks the happy path and ends with `status = 'finished'`.
 * The second terminal state has had nothing around it: a session can also be
 * CLOSED from inside (DOMAIN-MODEL, `started --> abandoned`), and D7 says an
 * abandoned run is a diary entry like any other, marked unfinished and saying
 * where it stopped. Everything on that path — the confirmation, the partial
 * unique index that refuses a second session, the drawer's Start/Continue
 * switch, `sessions_ended_at_matches_status` for a status that is not
 * `finished` — was reachable only by hand until this file.
 *
 * ── IT ASSERTS THE ROW, NOT ONLY THE SCREEN ───────────────────────────────
 * Closing navigates to /diary either way, so a `close()` that wrote nothing
 * would look identical on screen to one that wrote correctly. The last block
 * is therefore the database, through the service role, used ONLY to read back
 * what the client wrote.
 *
 * ── EVERY CONTROL IS FOUND BY ACCESSIBLE NAME, THROUGH `label()` ───────────
 * See support.ts's header for the argument. The practical consequence here:
 * the German run looks for the German words, so a control that hardcoded
 * English fails the German run rather than passing both.
 *
 * THE ONE STRING THAT CANNOT COME FROM THE CATALOGUE is the exercise's NAME.
 * It is content — `exercise_i18n.name` — so there is no `MessageKey` for it,
 * and the alternatives were worse: `.first()` on the radio group is the
 * position rule support.ts argues against, and *Let Musie pick* is random
 * among the implemented exercises, which is deterministic only for as long as
 * there is exactly one of them. So the name is read from the same database the
 * browser is using, in the run's own locale, and the card is found by it.
 */
import { expect, test } from '@playwright/test';
import { label, reachTheLibrary, service, withLocale } from './support';
import type { Locale } from './support';

/** The one implemented exercise, and the one the row must come back holding. */
const EXERCISE = 'mindfulness-cards';

/**
 * WHERE THE WALK WALKS AWAY, and it is deliberately not the first step.
 *
 * `sessions.step` means "where you stopped" (Session.tsx), so a session closed
 * on `intro` would prove the column was never written rather than that it was
 * written correctly. Stopping on `scan` is one real step change, which the
 * diary then has to name back.
 */
const STOPPED_AT = 'scan';

/**
 * THE LOCALE COMES FROM THE PROJECT, NOT FROM A LOOP.
 *
 * Same reason as `session.spec.ts`: a loop inside the file is multiplied by
 * the two projects, and half the runs then report German results under the
 * English project.
 */
test('a closed session lands in Postgres as abandoned', async ({ page }, testInfo) => {
  const locale = testInfo.project.name as Locale;
  test.setTimeout(120_000);

  await withLocale(page, locale);

  /* The same stack the browser writes to — `stack()` refuses to let those two
     drift apart, which is the whole reason it exists. */
  const db = service();

  /* ── The way in ──────────────────────────────────────────────────────────
     The explainer, the gated CTA and /about-you, all of it shared so this walk
     cannot get the preamble subtly different from the one next door. */
  await reachTheLibrary(page, locale);

  /* The exercise's own name, in this run's language. Read rather than written
     down: a literal here would be English copy in a German run, invisible in
     exactly the way `label()` exists to prevent. */
  const { data: copy } = await db
    .from('exercise_i18n')
    .select('name')
    .eq('exercise_id', EXERCISE)
    .eq('locale', locale)
    .single();
  expect(copy).toBeTruthy();
  const exerciseName = copy!.name as string;

  /* ── Start it ────────────────────────────────────────────────────────────
     A card is a summary; the DETAIL carries the only control that writes. The
     card's accessible name is its headline followed by its description and its
     fact chips, so the match is on a substring — `exact` would demand the
     whole announcement and find nothing. */
  await page.getByRole('radio', { name: exerciseName }).click();

  const detail = page.getByRole('dialog');
  await expect(detail).toBeVisible();
  await detail
    .getByRole('button', { name: label(locale, 'exercises.start'), exact: true })
    .click();

  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+\/intro$/);
  const sessionId = (/\/session\/([0-9a-f-]+)\//.exec(page.url()) ?? [])[1];
  expect(sessionId).toBeTruthy();

  /* One step in, so there is something for the diary to report back. */
  await page.getByRole('button', { name: label(locale, 'common.continue'), exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${STOPPED_AT}$`));

  /* ── WHILE IT RUNS, THE APP SAYS SO — and it says so in two places ───────

     FIRST, THE DRAWER'S ACTION ROW. It is one row, not two: *Continue
     session* and *Start a session* are alternatives, and exactly one of them
     is rendered (MenuDrawer.tsx). So the absence of the start row is the
     assertion, not a hidden attribute on it.

     THE ORDER OF THESE TWO MATTERS. Until the active-session read lands the
     drawer renders a THIRD state — the start LABEL, busy and disabled — so a
     count of zero asserted first would pass against a drawer that had simply
     not answered yet. Waiting for *Continue session* is what proves the read
     landed; only then does the absence of the other row mean anything. */
  await page.getByRole('button', { name: label(locale, 'shell.menuLabel'), exact: true }).click();

  const drawer = page.getByRole('dialog', { name: label(locale, 'menu.title') });
  await expect(drawer).toBeVisible();

  const continueRow = drawer.getByRole('link', {
    name: label(locale, 'menu.continueSession'),
    exact: true,
  });
  await expect(continueRow).toBeVisible({ timeout: 15_000 });
  await expect(
    drawer.getByRole('link', { name: label(locale, 'menu.startSession'), exact: true }),
  ).toHaveCount(0);

  /* And it goes back to the step the person was actually on. */
  await continueRow.click();
  await expect(page).toHaveURL(new RegExp(`/session/${sessionId}/${STOPPED_AT}$`));

  /* SECOND, THE LIBRARY REFUSES A SECOND SESSION. That refusal is
     `sessions_one_running_per_user` coming back 23505 and being rendered as a
     sentence rather than an error, which is a real outcome and the only one
     this suite has no other way to reach.

     REACHED BY URL, NOT BY THE SESSION'S OWN *Back*. Back on `intro` does
     leave for /exercises — but getting to `intro` means walking the step
     BACKWARDS, and every step change writes `sessions.step`. That would
     rewrite the one column this walk exists to assert. */
  await page.goto('/exercises');
  await page.getByRole('radio', { name: exerciseName }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: label(locale, 'exercises.start'), exact: true })
    .click();

  /* NOT `exact`. `Message` puts a screen-reader status word inside the
     heading — "Warning: A session is already running" — so the accessible name
     is the sentence with a word in front of it. */
  await expect(
    page.getByRole('heading', { name: label(locale, 'exercises.alreadyRunning') }),
  ).toBeVisible({ timeout: 15_000 });

  /* The refusal offers the way back, and the way back is where we were. */
  await page
    .getByRole('link', { name: label(locale, 'exercises.goToSession'), exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/session/${sessionId}/${STOPPED_AT}$`));

  /* ── CLOSING IT, AND THE CONFIRMATION IS A REAL GATE ─────────────────────
     Walked twice on purpose: once dismissed, once confirmed. A confirmation
     that wrote on open — or whose *Cancel* fell through to the same handler —
     would be indistinguishable from this one if only the second press were
     tested, and the row it writes is permanent. */
  const closeSession = page.getByRole('button', {
    name: label(locale, 'session.close'),
    exact: true,
  });
  await closeSession.click();

  const confirm = page.getByRole('dialog', { name: label(locale, 'session.close.title') });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: label(locale, 'common.cancel'), exact: true }).click();

  await expect(confirm).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`/session/${sessionId}/${STOPPED_AT}$`));

  /* Backing out wrote NOTHING — asserted in the database, because on screen a
     dismissed dialog and a dismissed dialog that ended the session look the
     same until the next navigation. */
  const { data: stillRunning } = await db
    .from('sessions')
    .select('status, ended_at')
    .eq('id', sessionId)
    .single();
  expect(stillRunning).toBeTruthy();
  expect(stillRunning!.status).toBe('started');
  expect(stillRunning!.ended_at).toBeNull();

  /* Now mean it. `session.close` and `session.close.confirm` are two different
     sentences — *Close this session* and *Close the session* — which is what
     `exact` is carrying here. */
  await closeSession.click();
  await expect(confirm).toBeVisible();
  await confirm
    .getByRole('button', { name: label(locale, 'session.close.confirm'), exact: true })
    .click();

  /* ── THE DIARY, AND IT SAYS UNFINISHED ───────────────────────────────────
     Closing lands on the LIST, exactly as finishing does, and the newest entry
     opens inline there — so the badge and the stopped-at line are on this
     screen rather than one tap further in.

     Both are TEXT, not controls, so they are matched as text. They still come
     from the catalogue: `diary.stoppedAt` is a template, and the step inside
     it is `session.step.scan` translated first, which is precisely what the
     screen does with it. */
  await expect(page).toHaveURL(/\/diary$/);

  await expect(
    page.getByText(label(locale, 'session.status.abandoned'), { exact: true }),
  ).toBeVisible({ timeout: 15_000 });

  await expect(
    page.getByText(
      label(locale, 'diary.stoppedAt', { step: label(locale, `session.step.${STOPPED_AT}`) }),
      { exact: true },
    ),
  ).toBeVisible();

  /* ── AND STARTING IS OFFERED AGAIN ───────────────────────────────────────
     The mirror of the check above: with nothing running, the action row is the
     start row and *Continue session* is gone.

     `aria-busy` is asserted rather than assumed. An `exact` name match already
     excludes the busy row — `CtaButton` adds an sr-only "Loading" to the
     accessible name while it waits — but that is a property of the component,
     and this assertion is the one that would still fail loudly if it changed. */
  await page.getByRole('button', { name: label(locale, 'shell.menuLabel'), exact: true }).click();
  await expect(drawer).toBeVisible();

  const startRow = drawer.getByRole('link', {
    name: label(locale, 'menu.startSession'),
    exact: true,
  });
  await expect(startRow).toBeVisible({ timeout: 15_000 });
  await expect(startRow).not.toHaveAttribute('aria-busy', 'true');
  await expect(
    drawer.getByRole('link', { name: label(locale, 'menu.continueSession'), exact: true }),
  ).toHaveCount(0);

  /* Offered, and it works: the library takes the start again rather than
     refusing it a second time. */
  await startRow.click();
  await expect(page).toHaveURL(/\/exercises$/);
  await expect(
    page.getByRole('heading', { name: label(locale, 'exercises.alreadyRunning') }),
  ).toHaveCount(0);

  /* ── AND THE ROW IS IN POSTGRES ──────────────────────────────────────────*/
  const { data: session } = await db
    .from('sessions')
    .select('id, exercise_id, status, step, started_at, ended_at')
    .eq('id', sessionId)
    .single();

  expect(session).toBeTruthy();
  expect(session!.exercise_id).toBe(EXERCISE);
  expect(session!.status).toBe('abandoned');
  /* Where it stopped, which is the column the diary read back above. */
  expect(session!.step).toBe(STOPPED_AT);
  /* `sessions_ended_at_matches_status` requires this of BOTH terminal states,
     and `abandoned` is the one no other test reaches. */
  expect(session!.ended_at).not.toBeNull();

  /* NOTHING WAS WRITTEN THAT THE PERSON DID NOT WRITE. A closed session never
     reached the reflect step, so an answer here would mean the close path had
     borrowed `finish()`'s. */
  const { data: reflections } = await db
    .from('reflections')
    .select('id')
    .eq('session_id', sessionId);
  expect(reflections).toEqual([]);

  /* THE ONE LOCALE-SPECIFIC ASSERTION, as next door: a run that silently fell
     back to English would satisfy everything above. */
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
});
