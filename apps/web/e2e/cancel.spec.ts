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
import type { SupabaseClient } from '@supabase/supabase-js';
import { label, reachTheLibrary, service, startExercise, withLocale } from './support';
import type { Locale } from './support';

/** The one implemented exercise, and the one the row must come back holding. */
const EXERCISE = 'mindfulness-cards';

/**
 * The exercise's own name, in the run's language.
 *
 * Read rather than written down: a literal here would be English copy in a
 * German run, invisible in exactly the way `label()` exists to prevent. Shared
 * by both walks in this file — the second one needs it twice over, because the
 * button it presses has the name INSIDE it.
 */
async function exerciseName(db: SupabaseClient, locale: Locale): Promise<string> {
  const { data } = await db
    .from('exercise_i18n')
    .select('name')
    .eq('exercise_id', EXERCISE)
    .eq('locale', locale)
    .single();
  expect(data, 'the exercise has no name in this locale').toBeTruthy();
  return (data as { name: string }).name;
}

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

  const name = await exerciseName(db, locale);

  /* ── Start it ────────────────────────────────────────────────────────────
     THE CARD IS THE CONTROL since 2026-09-24: one click, no detail lightbox.
     By name rather than by position, because this walk knows which exercise it
     is asserting about — `startExercise` matches on a substring, since a card's
     accessible name is its headline followed by its description and its fact
     chips. */
  await startExercise(page, name);

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
  await startExercise(page, name);

  /* NOT `exact`. `Message` puts a screen-reader status word inside the
     heading — "Warning: A session is already running" — so the accessible name
     is the sentence with a word in front of it. */
  await expect(
    page.getByRole('heading', { name: label(locale, 'exercises.alreadyRunning') }),
  ).toBeVisible({ timeout: 15_000 });

  /* ── THE LIST HOLDS STILL, AND IT KEEPS WHAT WAS CHOSEN ─────────────────
     Ben, 2026-09-24. Both halves matter and they pull against each other: a
     card that stayed tappable would let somebody start a different exercise
     than the one the message is talking about, and a card that lost its
     selection would leave that message asking about nothing. Asserted on the
     same element, because it is one requirement. */
  const refusedCard = page.getByRole('radio', { name });
  await expect(refusedCard, 'the refused card lost its selection').toBeChecked();
  await expect(refusedCard, 'the list stayed live under the refusal').toBeDisabled();

  /* AND BOTH WAYS FORWARD ARE OFFERED. The second one is walked by the test
     below — here it is enough that it is on screen and names the exercise,
     which is the half of it that a hardcoded English label would fail. */
  await expect(
    page.getByRole('button', {
      name: label(locale, 'exercises.endAndStart', { name }),
      exact: true,
    }),
  ).toBeVisible();

  /* ── AND DISMISSING IT GIVES THE LIST BACK — regression, 2026-09-24 ─────
     `RadioCards` reports CHANGES. A card left checked after its question has
     been answered therefore CANNOT BE TAPPED AGAIN: the tap is not a change,
     `onValueChange` never fires, and the card is dead until the page is
     reloaded. That shipped for about an hour and Ben hit it on the first try —
     dismiss the refusal, press the same card, nothing at all happens.

     The walk presses it a second time and expects THE SAME ANSWER BACK, which
     is the only on-screen proof that the tap was heard: a refusal that returns
     is a start that was attempted. */
  await page
    .getByRole('button', { name: label(locale, 'common.closeLabel'), exact: true })
    .click();
  await expect(refusedCard, 'the card kept its selection after the question closed')
    .not.toBeChecked();
  await expect(refusedCard).toBeEnabled();

  await refusedCard.click();
  await expect(
    page.getByRole('heading', { name: label(locale, 'exercises.alreadyRunning') }),
    'tapping the same card a second time did nothing',
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

/**
 * THE OTHER WAY OUT OF THE REFUSAL — Ben, 2026-09-24.
 *
 * The walk above proves a session can be closed FROM INSIDE. This one proves
 * it can be ended from the LIBRARY, by somebody who came back to start
 * something else and does not want to go and tidy up first.
 *
 * ── IT IS IN THIS FILE BECAUSE IT WRITES THE SAME ROW ──────────────────────
 * `abandoned`, with `ended_at` set — the second terminal state, which is what
 * this file is about. The button is on /exercises rather than inside the
 * session, and `finished` would be a lie: DOMAIN-MODEL's diagram reads
 * `started --> finished : completes the reflection`, and nothing was
 * reflected.
 *
 * ── TWO ROWS, AND BOTH HALVES HAVE TO BE TRUE ──────────────────────────────
 * The one it replaced is ended, and the one it asked for is running. Asserting
 * only the second would pass against a version that started a session and left
 * the old one running — which the database would then have refused, but only
 * on the NEXT start, somewhere else entirely.
 */
test('the library ends the running session and starts the one that was asked for', async ({ page }, testInfo) => {
  const locale = testInfo.project.name as Locale;
  test.setTimeout(120_000);

  await withLocale(page, locale);
  const db = service();

  await reachTheLibrary(page, locale);
  const name = await exerciseName(db, locale);

  /* ── One running session, one step in ───────────────────────────────────
     A step in, so the row that gets ended is a row with something in it — an
     end that only ever happened on `intro` would not prove that `step` is left
     alone, and the diary reads that column for an unfinished run. */
  await startExercise(page, name);
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+\/intro$/);
  const firstId = (/\/session\/([0-9a-f-]+)\//.exec(page.url()) ?? [])[1];
  expect(firstId).toBeTruthy();

  await page.getByRole('button', { name: label(locale, 'common.continue'), exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${STOPPED_AT}$`));

  /* WAIT FOR THE ROW TO AGREE BEFORE LEAVING, and this is not test hygiene.
     `saveStep` is deliberately fire-and-forget (`void saveStep(...)` in
     Session.tsx), so a `goto` issued in the same breath as the step change
     ABORTS the PATCH in flight and the row stays on `intro`. Measured here:
     without this poll the assertion at the foot of this walk read `intro`,
     which would have looked exactly like an end that rewound the row. The
     walk waits the way a person does — by taking longer than 50ms. */
  await expect
    .poll(async () => {
      const { data } = await db.from('sessions').select('step').eq('id', firstId).single();
      return (data as { step: string } | null)?.step ?? null;
    }, { timeout: 10_000 })
    .toBe(STOPPED_AT);

  /* ── Back to the library, and ask for it again ──────────────────────────
     By URL rather than by the session's own Back, for the same reason the walk
     above gives: walking backwards would rewrite `sessions.step`, and this
     test asserts that the end left that column alone. */
  await page.goto('/exercises');
  await startExercise(page, name);

  await expect(
    page.getByRole('heading', { name: label(locale, 'exercises.alreadyRunning') }),
  ).toBeVisible({ timeout: 15_000 });

  /* THE BUTTON NAMES THE EXERCISE, and `exact` is carrying that: the label is
     a template with the content name interpolated into it, so this fails both
     for a hardcoded English sentence in the German run and for a button that
     forgot to say which exercise it means. */
  await page
    .getByRole('button', {
      name: label(locale, 'exercises.endAndStart', { name }),
      exact: true,
    })
    .click();

  /* ── A DIFFERENT SESSION, AT ITS FIRST STEP ─────────────────────────────*/
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+\/intro$/, { timeout: 15_000 });
  const secondId = (/\/session\/([0-9a-f-]+)\//.exec(page.url()) ?? [])[1];
  expect(secondId).toBeTruthy();
  expect(secondId, 'the same session was handed back rather than a new one')
    .not.toBe(firstId);

  /* ── AND BOTH ROWS IN POSTGRES ──────────────────────────────────────────*/
  const { data: ended } = await db
    .from('sessions')
    .select('id, status, step, ended_at')
    .eq('id', firstId)
    .single();

  expect(ended).toBeTruthy();
  expect(ended!.status, 'the session it replaced is still running').toBe('abandoned');
  /* `sessions_ended_at_matches_status` requires it, and the diary prints it. */
  expect(ended!.ended_at).not.toBeNull();
  /* WHERE IT STOPPED, UNTOUCHED. Ending is not a step change, and a version
     that rewound the row on its way out would report the wrong step in the
     diary for ever. */
  expect(ended!.step).toBe(STOPPED_AT);

  const { data: started } = await db
    .from('sessions')
    .select('id, exercise_id, status, step')
    .eq('id', secondId)
    .single();

  expect(started).toBeTruthy();
  expect(started!.exercise_id).toBe(EXERCISE);
  expect(started!.status).toBe('started');
  expect(started!.step).toBe('intro');

  /* THE ONE LOCALE-SPECIFIC ASSERTION, for the same reason as every other
     walk: a run that fell back to English satisfies everything above. */
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
});

/**
 * THE THIRD DOOR OUT OF A RUNNING SESSION — Ben, 2026-09-24.
 *
 * The walks above end a session from INSIDE it and from the LIBRARY's refusal.
 * This one ends it from the MENU, which is the door for somebody who is not in
 * the session and has not tried to start anything: they opened the drawer,
 * they are done with what is running, and they want to pick something else.
 *
 * ── ONE WRITE, THREE DOORS, AND THAT IS THE POINT ──────────────────────────
 * All three produce the same row — `abandoned`, `ended_at` set, `step` left
 * where the person stopped — so the diary does not have to know which door was
 * used. This asserts that row, and then asserts the diary actually shows it,
 * because "it is added to the diary" is half of what the row promises and the
 * database alone cannot prove the screen kept its side.
 */
test('the menu ends the running session and hands back the library', async ({ page }, testInfo) => {
  const locale = testInfo.project.name as Locale;
  test.setTimeout(120_000);

  await withLocale(page, locale);
  const db = service();

  await reachTheLibrary(page, locale);
  const name = await exerciseName(db, locale);

  await startExercise(page, name);
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+\/intro$/);
  const sessionId = (/\/session\/([0-9a-f-]+)\//.exec(page.url()) ?? [])[1];
  expect(sessionId).toBeTruthy();

  /* One step in, so the row that gets ended has somewhere to have stopped. */
  await page.getByRole('button', { name: label(locale, 'common.continue'), exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${STOPPED_AT}$`));

  /* The step write is fire-and-forget, so wait for the row before navigating —
     the walk above this one explains what happens otherwise. */
  await expect
    .poll(async () => {
      const { data } = await db.from('sessions').select('step').eq('id', sessionId).single();
      return (data as { step: string } | null)?.step ?? null;
    }, { timeout: 10_000 })
    .toBe(STOPPED_AT);

  /* ── THE DRAWER, AND WHERE THE ROW SITS IN IT ───────────────────────────
     Directly under *Continue session*, with no rule between them: they are the
     two things you can do about the run you are in. Asserted as DOM ORDER
     through the list items, which is semantic markup rather than a class — the
     rows are `<li>` because L3 makes the menu a list. */
  await page.goto('/menu');
  const drawer = page.getByRole('dialog', { name: label(locale, 'menu.title') });
  await expect(drawer).toBeVisible({ timeout: 15_000 });

  const rows = drawer.locator('nav li');
  await expect(rows.nth(0)).toHaveText(label(locale, 'menu.continueSession'));
  await expect(rows.nth(1)).toHaveText(label(locale, 'menu.endSession'));

  /* A BUTTON, NOT A LINK, and that is the requirement rather than a detail: it
     writes before it goes anywhere, and an anchor would have navigated first. */
  const endRow = drawer.getByRole('button', {
    name: label(locale, 'menu.endSession'),
    exact: true,
  });
  await expect(endRow).toBeVisible();
  await endRow.click();

  /* ── THE LIBRARY, AND IT IS NOT REFUSING ANYTHING ───────────────────────
     The drawer's route is REPLACED, so this is a fresh library with nothing
     running — which is exactly what the row promised, and it is the assertion
     that the end actually landed before the navigation did. */
  await expect(page).toHaveURL(/\/exercises$/, { timeout: 15_000 });
  await expect(
    page.getByRole('heading', { name: label(locale, 'exercises.alreadyRunning') }),
  ).toHaveCount(0);

  /* ── THE ROW ────────────────────────────────────────────────────────────*/
  const { data: ended } = await db
    .from('sessions')
    .select('id, status, step, ended_at')
    .eq('id', sessionId)
    .single();

  expect(ended).toBeTruthy();
  expect(ended!.status).toBe('abandoned');
  expect(ended!.ended_at).not.toBeNull();
  /* Where it stopped, untouched: ending is not a step change. */
  expect(ended!.step).toBe(STOPPED_AT);

  /* ── AND THE DIARY SAYS SO ──────────────────────────────────────────────
     The newest entry opens inline on the list, so the badge and the stopped-at
     line are both on this screen. Same two assertions the walk above makes
     about a session closed from inside — one write, one diary entry, whichever
     door was used. */
  await page.goto('/diary');
  await expect(
    page.getByText(label(locale, 'session.status.abandoned'), { exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByText(
      label(locale, 'diary.stoppedAt', { step: label(locale, `session.step.${STOPPED_AT}`) }),
      { exact: true },
    ),
  ).toBeVisible();

  /* ── AND STARTING WORKS AGAIN ───────────────────────────────────────────
     The end is only worth anything if the next start is not refused. */
  await page.goto('/exercises');
  await startExercise(page, name);
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+\/intro$/, { timeout: 15_000 });
  expect((/\/session\/([0-9a-f-]+)\//.exec(page.url()) ?? [])[1]).not.toBe(sessionId);

  await expect(page.locator('html')).toHaveAttribute('lang', locale);
});
