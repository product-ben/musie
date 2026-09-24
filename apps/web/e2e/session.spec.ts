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
import { expect, test } from '@playwright/test';
import { enterCode, label, reachTheLibrary, service, startExercise, withLocale } from './support';
import type { Locale } from './support';

/**
 * THE CARD THIS WALK DRAWS, AND THE RECORDING IT MUST COME BACK HOLDING.
 *
 * It used to be whichever of the nine the simulated scan picked, so the walk
 * could only assert "a card, and some track". E.1 deleted the random draw: a
 * typed code names one card, `exercise_tracks` pairs it with one recording,
 * and both are knowable here — which turns a shape assertion into an identity
 * one. A pairing written the wrong way round would now fail.
 */
const CARD = { code: 'MC-08', id: 'mc-08', track: 'trk-08' };

/** The answer we type, per locale, so the assertion can tell the runs apart. */
const ANSWER: Record<Locale, string> = {
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
    const locale = testInfo.project.name as Locale;
    test.setTimeout(120_000);

    await withLocale(page, locale);

    /* Explainer → About you → the library. Shared with the cancel walk, so
       the two cannot disagree about where the product begins. */
    await reachTheLibrary(page, locale);

    /* ── The library ───────────────────────────────────────────────────────
       One click. The card is the control since 2026-09-24 — there is no detail
       lightbox between the library and the session — and `startExercise` is
       where that is said once for every walk. */
    await startExercise(page);

    /* ── Intro → scan ──────────────────────────────────────────────────────*/
    await expect(page).toHaveURL(/\/session\/[0-9a-f-]+\/intro$/);
    const sessionId = (/\/session\/([0-9a-f-]+)\//.exec(page.url()) ?? [])[1];
    expect(sessionId).toBeTruthy();

    await page.getByRole('button', { name: label(locale, 'common.continue'), exact: true }).click();
    await expect(page).toHaveURL(/\/scan$/);

    /* THE CODE PRINTED ON THE CARD, TYPED — E.1, and the end of the simulated
       draw. It writes `card_id` AND `track_id` in one update, which is what
       the assertions at the foot of this test check.

       `enterCode` owns the field itself, including opening the disclosure it
       is folded behind (2026-09-23). What this walk watches for is the RESULT:
       the card, named back at you. */
    const scanned = page.getByText(label(locale, 'session.scan.yourCard'), { exact: true });

    await enterCode(page, locale, CARD.code);

    /* NAMING THE CARD FINISHES THE STEP — 2026-09-24. The code lands and the
       listen step is on screen with nothing tapped in between, which is the
       assertion for the second half of that change. */
    await expect(page).toHaveURL(/\/listen$/, { timeout: 15_000 });

    /* ── AND CHANGING YOUR MIND IS STILL ONE STEP BACK ──────────────────────
       The scan step keeps both its states, so Back from `listen` is the card
       you drew with *Scan a different card* under it — which is the route the
       flow change deliberately left open, and therefore the one this walk has
       to prove is still there.

       *Scan a different card* RESETS the step rather than re-rolling: the
       reader comes back and the next draw is an act the person takes. Walked
       here because the reset writes nulls to two columns, and a version that
       silently kept the old track would still look right on screen. */
    await page.getByRole('button', { name: label(locale, 'common.back'), exact: true }).click();
    await expect(page).toHaveURL(/\/scan$/);
    await expect(scanned).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: label(locale, 'session.scan.again'), exact: true }).click();
    /* THE READER IS BACK, AND THE FIELD IS NOT — the step's resting state
       changed on 2026-09-23 and again on 2026-09-24. Typing the code is a mode
       of the frame now, so what says the reset happened is the frame's own two
       ways in returning, not a textbox. Asserted on the primary one, *Karte
       scannen*, which exists in no other state of this step; `enterCode` below
       opens the form the way a person does. */
    await expect(
      page.getByRole('button', { name: label(locale, 'session.scan.scanCard'), exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    await enterCode(page, locale, CARD.code);
    await expect(page).toHaveURL(/\/listen$/, { timeout: 15_000 });

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

    /* `exact: false`: TrackButton's accessible name is its ACTION plus its
       label — "Start Listening, <label>" — because the action word is what
       changes as the transport moves and the label is what it is acting on.
       So the stable half is the label, matched as a substring. */
    /* SCOPED TO THE STAGE since E.5b: the details view two viewports down
       carries a `MusicPlayer` announcing the same track, so an unscoped match
       is ambiguous. */
    const transport = page.locator('.musie-listen__view--stage').getByRole('button', {
      name: label(locale, 'session.listen.track'),
      exact: false,
    });
    await expect(transport).toBeVisible();

    /* NOT Continue: the listen step's forward control is the reflection
       button, because what it does is named rather than numbered. Finding it
       by name is what surfaced that — the old `.last()` would have clicked it
       under any label at all.

       IT ANSWERS TO TWO NAMES SINCE 2026-09-24, and that is the point of the
       change rather than an inconvenience: the button carries the gate itself
       now, so while it is shut it is named for the condition and once it opens
       it is named for the act. A single locator would have to match both, and
       a locator loose enough to do that would match the transport too.

       The shut name interpolates a LIVE countdown, so it cannot be matched
       exactly — the clock ticks between locating and asserting. A sentinel is
       interpolated instead and the stable half taken from in front of it,
       which keeps this out of the business of knowing any literal. */
    const lockedName = label(locale, 'session.listen.startLocked', { countdown: '\u0000' })
      .split('\u0000')[0]
      .trim();
    const locked = page.locator('.musie-listen__view--stage').getByRole('button', {
      name: lockedName,
      exact: false,
    });
    await expect(locked).toBeDisabled();

    const onwards = page.getByRole('button', { name: label(locale, 'session.listen.start'), exact: true });

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

    await page.getByRole('radio', { name: label(locale, 'reflect.mode.text'), exact: true }).click();
    await page
      .getByRole('textbox', { name: label(locale, 'reflect.text.label'), exact: true })
      .fill(ANSWER[locale]);

    const finish = page.getByRole('button', { name: label(locale, 'reflect.finish'), exact: true });
    await expect(finish).toBeEnabled();
    await finish.click();

    /* ── It lands in the DIARY LIST, and there is no end screen ────────────
       Not the entry: finishing hands you your diary rather than one page of
       it, and the list leads with the session you just finished. */
    await expect(page).toHaveURL(/\/diary$/);

    /* ── THE THREE STATES ──────────────────────────────────────────────────
       Every entry has a preview, an inline state and a lightbox (Ben,
       2026-09-21; components/DiaryCard.tsx). The newest one arrives INLINE,
       which is what makes finishing a landing rather than a dispersal — the
       thing you just made is the thing you see.

       This used to assert that "a framed box is visible" and nothing else. It
       would pass against a diary showing the wrong entry, or one whose X did
       nothing, so it was the one check on this walk that could stay green
       while the screen was wrong. */
    const answer = page.getByText(ANSWER[locale], { exact: true });
    const collapse = page.getByRole('button', {
      name: label(locale, 'diary.collapse'),
      exact: true,
    });

    /* INLINE means the whole card, not a summary of it: the answer just typed
       is on screen without anything being opened. That is the assertion that
       distinguishes the inline state from the preview row, which carries a
       headline and two meta lines and never the reflection. */
    await expect(answer).toBeVisible({ timeout: 15_000 });
    await expect(collapse).toBeVisible();

    /* ── AND THE WAY BACK INTO ANOTHER ONE, BEHIND THE CARD ────────────────
       Ben, 2026-09-24. The landing offers the only forward move this screen
       has, under the entry rather than above it or at the foot of the page.
       A LINK, not a button: it goes to the library, which is the one screen
       that writes a session — so this walk checks where it points rather than
       pressing it, and the start it would reach is the one the walk already
       took at the top of this file.

       Its name is `menu.startSession`, the same words the drawer and the
       explainer use for the same act, so a screen that invented a third
       spelling fails here. */
    const startAnother = page.getByRole('link', {
      name: label(locale, 'menu.startSession'),
      exact: true,
    });
    await expect(startAnother).toBeVisible();
    await expect(startAnother).toHaveAttribute('href', '/exercises');

    /* PREVIEW. The X collapses the card; the entry does not disappear with it,
       because a collapsed card rejoins the run below rather than being held
       out of it. Both halves are asserted — a version that simply unmounted
       the card would satisfy the first and lose the session from the screen. */
    await collapse.click();
    await expect(answer).toBeHidden();

    /* The offer goes with the card. Collapsing turns the diary from a landing
       into a list, and the drawer is where *Start a session* lives from then
       on — asserted because the alternative, a control that outlives the thing
       it belongs to, is invisible in a screenshot. */
    await expect(startAnother).toBeHidden();

    /* THIS session's row, found by where it goes rather than by what it looks
       like. `href` is a semantic attribute, not a design-system class, and it
       is the one thing about a preview row that cannot be true of the wrong
       entry — which is what the old "a framed box is visible" could not say. */
    const row = page.locator(`a[href$="/diary/${sessionId}"]`);
    await expect(row).toBeVisible();

    /* LIGHTBOX. The row opens the same card in an overlay — the same
       component, which is the whole point of extracting it — and `/diary/:id`
       is a real route, so the URL changes and Back would close it. */
    await row.click();
    await expect(page).toHaveURL(new RegExp(`/diary/${sessionId}$`));
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('dialog').getByText(ANSWER[locale], { exact: true })).toBeVisible();

    /* Back to the list, so the assertions below read a screen in its resting
       state rather than one with an overlay open over it. */
    await page.goBack();
    await expect(page).toHaveURL(/\/diary$/);

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
    /* The scan wrote both, together — and BY IDENTITY now, not by shape. The
       simulated draw could only ever be asserted as "some card and some
       track", because the walk did not choose which. A typed code does choose,
       so this fails if `exercise_tracks` pairs MC-08 with anything but trk-08,
       or if the one update ever writes its two columns from different rows. */
    expect(session!.card_id).toBe(CARD.id);
    expect(session!.track_id).toBe(CARD.track);
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
