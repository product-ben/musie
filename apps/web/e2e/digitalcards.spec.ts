/**
 * THE DECK FOR THE PEOPLE WHO HAVE NO DECK — one walk of the digital path.
 *
 * `DIGITAL-CARDS.md`. The switch on Einsteigen, the hand full screen, the grid
 * it is chosen from, and the same two columns in Postgres at the end as a
 * scanned card would have written — which is the property the whole feature
 * rests on (section 1.1, clause 3): the diary, the reveal and the
 * discovered-music listing cannot tell the two paths apart, and nothing below
 * would notice if they could unless it asserted the row.
 *
 * ── WHAT ONLY A WALK CAN PROVE HERE ───────────────────────────────────────
 * Three things, and the unit tests cannot reach any of them:
 *
 *   THE MODE SURVIVES A STEP CHANGE. It lives in the URL and nowhere else, so
 *     a `navigate` that forgot the search string would drop somebody back onto
 *     the paper path mid-run with their hand gone. Asserted on every hop.
 *   THE HAND SURVIVES A RELOAD. `dealtCards` is pure and tested, but that it
 *     is called with the SESSION ID rather than with anything that changes is
 *     a wiring fact. The reload below is the only thing that can catch a
 *     re-deal.
 *   THE SCANNER IS NOT MOUNTED. Not hidden — not mounted. A `display: none`
 *     camera is invisible in a screenshot and asks for a permission on
 *     somebody's phone.
 *
 * ── IT RUNS ONCE PER LOCALE, AND THE GERMAN RUN IS THE POINT ──────────────
 * Every control is found through `label()`, which asks the catalogue for the
 * string exactly as the app asks for it. A hardcoded English label renders
 * identically in the English run and fails the German one. `session.spec.ts`
 * carries the full argument.
 */
import { expect, test } from '@playwright/test';
import { label, reachTheLibrary, service, startExercise, withLocale } from './support';
import type { Locale } from './support';

/** What Achtsame Pause deals, and what the app's own `cardsDealt` says. */
const DEALT = 5;

test('a digital session deals, chooses, and writes the same two columns', async ({ page }, testInfo) => {
  const locale = testInfo.project.name as Locale;
  test.setTimeout(120_000);

  await withLocale(page, locale);
  await reachTheLibrary(page, locale);
  /* No name: the first row is `sort = 1`, which is Achtsame Pause — the
     exercise that deals five. Freie Bahn's one-card shape is a different walk
     and is not this one. */
  await startExercise(page, locale);

  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+\/intro$/);
  const sessionId = (/\/session\/([0-9a-f-]+)\//.exec(page.url()) ?? [])[1];
  expect(sessionId).toBeTruthy();

  /* ── THE SWITCH IS ON, EVERY TIME ───────────────────────────────────────
     Not a remembered answer: the deck is what Musie pushes people to, so the
     paper path is what a fresh session offers (section 3). A walk is the only
     place that can see "every time", because nothing is stored for a unit test
     to read back. */
  const cards = page.getByRole('switch', {
    name: label(locale, 'session.intro.cardsPresent'),
  });
  await expect(cards).toBeVisible({ timeout: 15_000 });
  await expect(cards).toBeChecked();

  /* The paper path's own forward action, before the switch moves. */
  await expect(
    page.getByRole('button', { name: label(locale, 'common.continue'), exact: true }),
  ).toBeVisible();

  await cards.click();

  /* ── THE MODE IS THE ROW, NOT THE URL ───────────────────────────────────
     It was `?digitalcards` for a day. The step list depends on the mode now,
     so it is `sessions.digital_cards` — read back at the foot of this walk. The
     address does not change when the switch moves; the RAIL does. */
  await expect(page).toHaveURL(/\/intro$/);
  await expect(cards).not.toBeChecked();

  /* *Weiter* is REPLACED rather than joined while there is a hand to deal. */
  await expect(
    page.getByRole('button', { name: label(locale, 'common.continue'), exact: true }),
  ).toHaveCount(0);

  /* ── THE SECOND STEP IS A DIFFERENT STEP, NOT A RENAMED ONE ─────────────
     Since 2026-10-14 the rail reads `select` because the run HAS a step called
     `select` — and the row says so too, which is read back at the foot of this
     walk. A step marker is a <button> inside `<nav aria-label>` whose name is
     "<label>, <state>", so the match is on the prefix and scoped to the rail.

     STILL FOUR MARKERS. Ben's rule: flipping the switch must not change the
     rail's length, only which second step it names. */
  const rail = page.getByRole('navigation', { name: label(locale, 'session.wizardLabel') });
  await expect(
    rail.getByRole('button', { name: new RegExp(`^${label(locale, 'session.step.select')},`) }),
  ).toBeVisible();
  await expect(rail.getByRole('button')).toHaveCount(4);

  /* ── DEALING ────────────────────────────────────────────────────────────*/
  const deal = page.getByRole('button', {
    name: label(locale, 'session.intro.deal', { count: String(DEALT) }),
    exact: true,
  });
  await expect(deal).toBeEnabled({ timeout: 15_000 });
  await deal.click();

  /* ── THE STEP OPENS WITH ITS SHEET ──────────────────────────────────────
     Einsteigen's button is only a way on now; `select` opens the walk itself,
     by REPLACE, so the sheet is a phase of the step rather than something to
     go and find. */
  await expect(page).toHaveURL(/\/select/);
  const sheet = page.getByRole('dialog', { name: label(locale, 'session.cards.title') });
  await expect(sheet).toBeVisible({ timeout: 15_000 });

  /* ── AN OPEN SHEET IS IN THE ADDRESS ────────────────────────────────────
     Ben, 2026-10-14. The same `?focus` the listen step uses, so the browser's
     own Back closes it and a reload keeps it — which is the half a unit test
     cannot reach, because it is the router doing the work. */
  await expect(page).toHaveURL(/focus/);

  await page.reload();
  await expect(sheet).toBeVisible({ timeout: 15_000 });

  /* ── CLOSING IT EARLY LEAVES THE GRID, AND THE WALK IS STILL REACHABLE ──
     The sheet is a phase, not a gate: the X collapses it onto the step, and
     the step's own button opens it again. Without that button somebody who
     closed early would have no way back to the five pictures, which is the
     hole this assertion exists to keep shut. */
  await sheet.getByRole('button', { name: label(locale, 'session.cards.close'), exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await expect(page).toHaveURL(/\/select$/);

  await page.getByRole('button', { name: label(locale, 'session.select.lookAgain'), exact: true }).click();
  await expect(sheet).toBeVisible({ timeout: 15_000 });

  /* SIX PAGES: the instruction, then five cards. The dots say how many, which
     is also the one place a miscounted hand would show up on screen. */
  await expect(sheet.getByRole('button', {
    name: label(locale, 'session.cards.dot', { position: '1', total: String(DEALT + 1) }),
  })).toBeVisible();

  /* The first page offers exactly one thing, and it is not a chevron. */
  await expect(sheet.getByRole('button', {
    name: label(locale, 'session.cards.previous'), exact: true,
  })).toHaveCount(0);

  await sheet.getByRole('button', { name: label(locale, 'session.cards.first'), exact: true }).click();

  /* ── THE WALK THROUGH THE HAND ──────────────────────────────────────────
     Once the first page is behind you the chevrons appear — and *previous* is
     ENABLED on the second page, which is the one place the brief was read
     against and was asked about first (section 5.5). */
  const previous = sheet.getByRole('button', { name: label(locale, 'session.cards.previous'), exact: true });
  const next = sheet.getByRole('button', { name: label(locale, 'session.cards.next'), exact: true });
  await expect(previous).toBeEnabled({ timeout: 15_000 });

  /* Nothing to go on with until the hand has been seen. */
  const onwards = sheet.getByRole('button', { name: label(locale, 'common.continue'), exact: true });
  await expect(onwards).toHaveCount(0);

  for (let i = 1; i < DEALT; i += 1) {
    await next.click();
  }

  /* THE LAST PAGE GAINS THE WAY ON, and the forward chevron stops offering
     one — there is nothing after the last card. */
  await expect(onwards).toBeVisible({ timeout: 15_000 });
  await expect(next).toBeDisabled();

  /* ── THE SHEET COLLAPSES ONTO THE GRID, IN THE SAME STEP ────────────────
     Ben's shape: *Weiter* on the last card does not advance — it takes the
     phase token off and leaves the step showing its grid. */
  await onwards.click();
  await expect(sheet).toHaveCount(0);
  await expect(page).toHaveURL(/\/select$/);

  /* THE SCANNER IS NOT MOUNTED. Its primary control exists in no other state
     of the paper step, so its absence is the assertion. */
  await expect(
    page.getByRole('button', { name: label(locale, 'session.scan.scanCard'), exact: true }),
  ).toHaveCount(0);

  /* A radio group since 2026-10-14, when the grid became `RadioImage`. The
     legend is visually hidden — the step's own headline asks the question —
     and is still the group's accessible name, which is what this asks for. */
  const grid = page.getByRole('radiogroup', { name: label(locale, 'session.select.gridLabel') });
  await expect(grid).toBeVisible({ timeout: 15_000 });
  const pictures = grid.getByRole('radio');
  await expect(pictures).toHaveCount(DEALT);

  /* ── THE SAME HAND AFTER A RELOAD ───────────────────────────────────────
     The hand is derived from the session id and stored nowhere, so this is
     the assertion that it is derived from the right thing. Compared by image
     source, which is the card's identity on screen. */
  const before = await grid.getByRole('img').evaluateAll(
    (nodes) => nodes.map((node) => (node as HTMLImageElement).getAttribute('src')),
  );
  expect(before).toHaveLength(DEALT);

  await page.reload();
  await expect(grid).toBeVisible({ timeout: 15_000 });
  const after = await grid.getByRole('img').evaluateAll(
    (nodes) => nodes.map((node) => (node as HTMLImageElement).getAttribute('src')),
  );
  expect(after, 'a reload re-dealt the hand').toEqual(before);

  /* ── CHOOSING IS THE COMMIT ─────────────────────────────────────────────
     No Continue to confirm: the press writes both columns and the step moves
     on by itself. */
  const chosenSrc = before[2];
  await pictures.nth(2).click();
  await expect(page).toHaveURL(/\/listen/, { timeout: 20_000 });

  /* THE INFOGRAPHIC TEACHES THE DECK, so it is not here. Found by its own alt
     text, from the catalogue like everything else. */
  await expect(
    page.getByRole('img', { name: label(locale, 'session.listen.infographicAlt') }),
  ).toHaveCount(0);

  /* ── AND THE FOCUS SHEET'S CONTROLS ARE REACHABLE ───────────────────────
     A regression guard, from a real one: the sheet paints a field across
     itself for the pages that are pictures, and for a day that field covered
     two controls on the listen sheet — `Hilf mir bitte` and the transport —
     because their slots were not lifted above it. They rendered perfectly and
     did nothing.

     `trial: true` is the whole point of this block. It runs Playwright's
     actionability checks — visible, stable, ENABLED, and HIT-TESTABLE at the
     point it would press — and then does not press. A `toBeVisible` would have
     passed throughout the bug; only hit-testing sees a transparent layer. */
  await page.getByRole('button', {
    name: new RegExp(label(locale, 'session.listen.listenUnstarted', { time: '1:30' })
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  }).click();
  await expect(page).toHaveURL(/focus/, { timeout: 20_000 });

  const sheetNow = page.getByRole('dialog', { name: label(locale, 'session.listen.immersiveTitle') });
  await expect(sheetNow).toBeVisible({ timeout: 15_000 });
  await sheetNow.getByRole('button', { name: label(locale, 'session.listen.questionHelp'), exact: true })
    .click({ trial: true });
  /* THE TRANSPORT, BY THE PART OF ITS NAME THAT DOES NOT MOVE. It announces
     "Play , Your music" or "Pause , Your music" depending on whether anything
     is playing — and whether anything is playing is not what this block is
     about. Matching on `Pause` passed in German and timed out in English for
     that reason alone, which is the two-locale run earning its keep. */
  await sheetNow.getByRole('button', { name: new RegExp(label(locale, 'session.listen.track')) })
    .click({ trial: true });

  /* ── AND THE ROW ────────────────────────────────────────────────────────
     The point of the whole walk. A digitally chosen card writes `card_id` AND
     `track_id` in one update, exactly as a scanned one does, and the step id
     is still `scan` however the rail labelled it. */
  const db = service();
  const { data: row, error } = await db
    .from('sessions')
    .select('card_id, track_id, step, status, digital_cards')
    .eq('id', sessionId as string)
    .single();

  expect(error).toBeNull();
  expect(row?.card_id, 'no card on the row').toBeTruthy();
  expect(row?.track_id, 'a card with no recording behind it').toBeTruthy();
  expect(row?.step).toBe('listen');
  expect(row?.status).toBe('started');
  /* THE RUN IS ON THE ROW. A resume reads this and computes the step list from
     it — without it the rule would refuse the step the row is sitting on. */
  expect(row?.digital_cards).toBe(true);

  /* The card that was pressed is the card that was written — not merely some
     card. `image_url` is what the grid drew, so it joins the two. */
  const { data: card } = await db
    .from('cards')
    .select('image_url')
    .eq('id', row?.card_id as string)
    .single();
  expect(chosenSrc).toContain(card?.image_url);
});

/**
 * THE OTHER DIGITAL SHAPE — one card, looked at rather than chosen between.
 *
 * Freie Bahn deals a single card, so its second step is `view`: its own route,
 * its own row in `sessions.step`, and a screen that draws the card itself. The
 * walk above covers `select`; this one exists because the two are different
 * STEPS now rather than two shapes of one, and a test that only walked the
 * five-card path would not notice if the one-card route stopped resolving.
 */
test('a one-card digital session draws on arrival and looks before it listens', async ({ page }, testInfo) => {
  const locale = testInfo.project.name as Locale;
  test.setTimeout(120_000);

  await withLocale(page, locale);
  await reachTheLibrary(page, locale);
  await startExercise(page, locale, locale === 'de' ? 'Freie Bahn' : 'Free Rein');

  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+\/intro$/);
  const sessionId = (/\/session\/([0-9a-f-]+)\//.exec(page.url()) ?? [])[1];

  await page.getByRole('switch', { name: label(locale, 'session.intro.cardsPresent') }).click();

  /* ── THE RAIL SAYS *ANSEHEN*, AND STILL HAS FOUR MARKERS ────────────────
     Ben, 2026-10-14: the two card exercises do different things at the second
     step — one chooses, one is dealt — so the rail says which. What it must
     not do is change length. */
  const rail = page.getByRole('navigation', { name: label(locale, 'session.wizardLabel') });
  await expect(
    rail.getByRole('button', { name: new RegExp(`^${label(locale, 'session.step.view')},`) }),
  ).toBeVisible();
  await expect(rail.getByRole('button')).toHaveCount(4);

  /* Einsteigen has nothing to prepare, and says so. */
  await expect(
    page.getByText(label(locale, 'session.intro.nothingToLayOut'), { exact: true }),
  ).toBeVisible();

  /* ── THE STEP DRAWS, NOT THE BUTTON ─────────────────────────────────────
     The forward action carries a label and nothing else; the card is written
     on arrival at `view`. The picture appearing is that write having landed —
     and the row is read back at the foot of this walk to prove it. */
  await page.getByRole('button', {
    name: label(locale, 'session.intro.drawRandom'), exact: true,
  }).click();

  await expect(page).toHaveURL(/\/view$/);
  await expect(
    page.getByRole('heading', { name: label(locale, 'session.view.headline') }),
  ).toBeVisible({ timeout: 15_000 });

  /* ── THE WAY TO SEE IT PROPERLY IS ON THE PICTURE ───────────────────────
     Not a third button in the action row. One page, so no dots and no
     chevrons — which falls out of the card count rather than out of a prop. */
  const expand = page.getByRole('button', { name: label(locale, 'session.view.expand'), exact: true });
  await expect(expand).toBeVisible({ timeout: 15_000 });
  await expand.click();

  const sheet = page.getByRole('dialog', { name: label(locale, 'session.cards.title') });
  await expect(sheet).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/focus/);
  await expect(
    sheet.getByRole('button', { name: label(locale, 'session.cards.next'), exact: true }),
  ).toHaveCount(0);

  await sheet.getByRole('button', { name: label(locale, 'common.continue'), exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await expect(page).toHaveURL(/\/view$/);

  await page.getByRole('button', { name: label(locale, 'common.continue'), exact: true }).click();
  await expect(page).toHaveURL(/\/listen/, { timeout: 20_000 });

  /* ── AND THE ROW ────────────────────────────────────────────────────────
     The same two columns a scanned card writes, and the run on the row so a
     resume computes the step list it actually had. */
  const db = service();
  const { data: row, error } = await db
    .from('sessions')
    .select('card_id, track_id, step, digital_cards')
    .eq('id', sessionId as string)
    .single();

  expect(error).toBeNull();
  expect(row?.card_id, 'the step did not draw').toBeTruthy();
  expect(row?.track_id, 'a card with no recording behind it').toBeTruthy();
  expect(row?.step).toBe('listen');
  expect(row?.digital_cards).toBe(true);
});
