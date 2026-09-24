/**
 * The reveal, and the thing it is actually for — E.5's done-when.
 *
 * ── THIS WALK WATCHES THE NETWORK, NOT THE SCREEN ─────────────────────────
 * E.5's done-when is *"the Network tab shows no title or artist until you
 * scroll to the reveal"*, and that is a claim about bytes rather than about
 * pixels. A screen can look perfectly withholding while the answer sits in a
 * JSON payload the page simply chose not to render — which is precisely the
 * mistake the column grant, the opaque ids and the Edge Function exist to
 * make impossible, and precisely the mistake no screen assertion would catch.
 *
 * So every response body the page receives is recorded, and the test asserts
 * on what is IN them: the title must appear in nothing, from sign-in to the
 * end of the listening, and then appear exactly once — in the reveal's own
 * reply — after the block has been scrolled to.
 *
 * The card is MC-01, whose recording really exists (E.4), so the title being
 * searched for is a real one: `Little Yellow Petals`.
 */
import { expect, test } from '@playwright/test';
import { enterCode, label, reachTheLibrary, startExercise, withLocale } from './support';
import type { Locale } from './support';

/** MC-01 → trk-01 → a recording that exists and is named this. */
const CARD = 'MC-01';
const TITLE = 'Little Yellow Petals';
const ARTIST = 'Rachel Sandy';

test('the title reaches the browser only at the reveal', async ({ page }, testInfo) => {
  const locale = testInfo.project.name as Locale;
  test.setTimeout(120_000);

  /* EVERY BODY THE PAGE RECEIVES, kept as text. Recorded from before the
     first navigation so the auth and content requests are in it too — the
     leak this guards against would most likely be a `select=*` on tracks,
     which happens long before the listen step. */
  const bodies: { url: string; body: string }[] = [];
  page.on('response', async (response) => {
    const type = response.headers()['content-type'] ?? '';
    if (!type.includes('json') && !type.includes('text')) return;
    try {
      bodies.push({ url: response.url(), body: await response.text() });
    } catch {
      /* A body that cannot be read — a redirect, or a request the browser
         cancelled. Nothing to inspect, and not a failure. */
    }
  });

  const leaked = () => bodies.filter((r) => r.body.includes(TITLE) || r.body.includes(ARTIST));

  await withLocale(page, locale);
  await reachTheLibrary(page, locale);

  await startExercise(page);

  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+\/intro$/);
  await page.getByRole('button', { name: label(locale, 'common.continue'), exact: true }).click();
  await expect(page).toHaveURL(/\/scan$/);

  /* The code lands and the listen step is on screen: naming the card finishes
     the scan step since 2026-09-24, so there is no Continue to press. */
  await enterCode(page, locale, CARD);
  await expect(page).toHaveURL(/\/listen$/, { timeout: 15_000 });

  /* ── THE CLAIM, AT THE MOMENT IT MATTERS MOST ──────────────────────────
     Standing on the listen step, with the track loaded and playable. If the
     title were ever going to arrive early it would be here — this is the
     screen that knows which recording it is. */
  expect(
    leaked().map((r) => r.url),
    'the title or artist reached the browser BEFORE the reveal',
  ).toEqual([]);

  /* ── MEET THE GATE BY SEEKING, NOT BY WAITING ──────────────────────────
     The gate is ninety seconds and the track is real, so waiting it out costs
     ninety seconds of wall clock per locale and puts the walk within seconds
     of its own timeout — which is exactly how it failed the first time it ran
     inside the full suite while passing alone.
   
     Seeking instead is not a weaker test. `position` comes from the element's
     own `timeupdate`, so jumping the playhead exercises the same latch, the
     same effect and the same threshold; what it skips is proving that audio
     advances in real time, which is the browser's job and not this repo's.
   
     `label` is announced by TrackButton and never shown, so the button's
     accessible name is "<action>, <label>" — matched loosely for the action
     word, which changes with the transport's state. */
  /* SCOPED TO THE STAGE. Since E.5b the details view carries a `MusicPlayer`
     that announces the same track, so an unscoped match is ambiguous — which
     Playwright's strict mode catches and a person would not. */
  const transport = page.locator('.musie-listen__view--stage').getByRole('button', {
    name: label(locale, 'session.listen.track'),
    exact: false,
  });

  /* WAIT FOR THE ELEMENT BEFORE PRESSING PLAY, and the reason is a real one
     rather than test hygiene. The `<audio>` is mounted only once the signed
     URL has resolved, and `play()` deliberately does NOTHING while one is in
     flight — otherwise a card with a real recording starts the simulated
     clock. So a press that lands during the signing round-trip is swallowed,
     with no second press coming, and `preload="none"` then means the file is
     never fetched and `duration` stays NaN for ever.
   
     That is how this walk failed inside the full suite while passing alone:
     not slow storage — the whole 6.9 MB fetches in under 50 ms locally — but
     a press that arrived a few milliseconds early. The swallowed press is
     logged in OPEN-QUESTIONS as a product question, because a person tapping
     play in that window gets silence and no explanation either. */
  const audio = page.locator('audio');
  await expect(audio).toBeAttached({ timeout: 30_000 });
  await transport.click();
  /* `preload="none"`, so nothing is fetched until the transport is pressed
     and `duration` is NaN until metadata has arrived. Seeking before then
     silently does nothing.
   
     SIXTY SECONDS, and measured rather than guessed: the first fetch after a
     `supabase db reset` pulls a 6.9 MB object through the storage API cold and
     overran a thirty-second poll once, in one locale, while the other passed
     in seven — the second run reading the first one's cache. A cold fetch is
     the honest case, so the budget is set for it. */
  await expect.poll(
    () => audio.evaluate((el: HTMLAudioElement) => (Number.isFinite(el.duration) ? el.duration : 0)),
    { timeout: 60_000 },
  ).toBeGreaterThan(0);

  await audio.evaluate((el: HTMLAudioElement) => {
    el.currentTime = Math.max(0, el.duration - 2);
  });

  /* ── SCROLL TO THE DETAILS, WHICH IS WHERE THE REVEAL HAPPENS ─────────
     Two locks, and this is the second. `met` is the gate, met above by
     seeking. The observer is the SCROLL: the request fires when this view
     enters the viewport, which is what E.5's done-when is actually about. */
  const detail = page.locator('.musie-listen__view--detail');
  await detail.scrollIntoViewIfNeeded();

  /* ── THE TITLE ARRIVES IN THE PLAYER ITSELF ───────────────────────────
     There is no reveal button and no "what you just heard" heading any more:
     the player said "Your track" while the gate was shut and says the
     recording's name once it is open, so the TITLE CHANGING is the reveal.
     Asserting on `.musy-mplayer__title` is therefore asserting on the
     product's actual claim rather than on a label beside it. */
  await expect(detail.locator('.musy-mplayer__title')).toHaveText(TITLE, { timeout: 30_000 });

  /* And the artist, which the player cannot hold, in the facts below it. */
  await expect(detail.getByText(ARTIST, { exact: true })).toBeVisible();

  /* ── EXACTLY ONE RESPONSE CARRIED IT, AND IT WAS reveal-track ─────────*/
  const carrying = leaked();
  expect(carrying.length, 'the title should arrive in exactly one response').toBe(1);
  expect(
    carrying[0].url,
    'the title came from something other than reveal-track',
  ).toContain('reveal-track');
});
