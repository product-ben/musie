/**
 * `/s/:code` — the deep link a paper card's QR code carries. E.0's done-when.
 *
 * ── WHY THIS WALK EXISTS SEPARATELY FROM THE TYPED ONE ─────────────────────
 * `session.spec.ts` types a code into the field, which proves E.1. This proves
 * E.0, and they are not the same act: the deep link arrives from OUTSIDE the
 * app, with no session in progress on screen and no step to be on. Everything
 * between the URL and the row — decoding the payload, finding the running
 * session, refusing to write to an exercise that draws no cards, and replacing
 * itself with the scan step — happens in `ScanLink` and is reachable no other
 * way.
 *
 * ── AND IT PROVES THE DOMAIN IS NOT NEEDED, WHICH IS THE POINT OF E.0 ──────
 * `page.goto('/s/MC-01')` is RELATIVE. It resolves against Playwright's
 * `baseURL`, which is the local dev server — so this walk passes on localhost
 * with no domain configured anywhere, which is precisely the claim E.0 makes
 * and the reason the decoder never compares a host. The day a domain exists,
 * nothing here changes.
 *
 * Run twice, once per locale, like every other walk: the three states that
 * render copy do so from the catalogue, and a hardcoded English string would
 * be invisible in the English run.
 */
import { expect, test } from '@playwright/test';
import { card, label, reachTheLibrary, service, startExercise, withLocale } from './support';
import type { Locale } from './support';

/**
 * MC-01, and the recording `exercise_tracks` pairs it with.
 *
 * A different card from the one `session.spec.ts` types (MC-08), deliberately:
 * between them the two walks prove the pairing is looked up per card rather
 * than defaulted, which a single card used by both could not tell apart from a
 * hardcoded answer.
 */
/* Read from deck.json by `card()` rather than retyped — support.ts says why.
   The literal that used to be here went stale in the 2026-09-24 deck repair. */
const CARD = card('MC-01');

test('a deep link puts its card on the running session', async ({ page }, testInfo) => {
  const locale = testInfo.project.name as Locale;
  test.setTimeout(120_000);

  await withLocale(page, locale);
  await reachTheLibrary(page, locale);

  /* Start the one implemented exercise, exactly as the other walks do. The
     deep link needs something RUNNING to write to — that is the whole
     difference between its happy path and its commonest unhappy one. */
  await startExercise(page, locale);

  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+\/intro$/);
  const sessionId = (/\/session\/([0-9a-f-]+)\//.exec(page.url()) ?? [])[1];
  expect(sessionId).toBeTruthy();

  /* ── THE SCAN, AS A PHONE'S CAMERA APP WOULD DELIVER IT ─────────────────
     A full navigation, not a click: the camera app hands the URL to the
     browser cold, so the app boots at this route with no in-memory state. A
     version of ScanLink that relied on anything the session screens had
     already loaded would pass a click and fail this. */
  await page.goto(`/s/${CARD.code}`);

  /* It resolves and replaces itself — ONTO THE LISTEN STEP since 2026-09-24.
     A scan that lands is a finished scan step, so the link goes to the
     recording rather than to a screen naming the card back at somebody who is
     holding it. `replace`, so Back does not land on a resolver that would
     resolve all over again — asserted below.

     THE SESSION WAS STANDING ON `intro` when the link arrived, which is the
     case this assertion is really about: `listen` is unreachable from `intro`
     by the reachability rule, so a resolver that redirected without writing
     the step would be bounced straight back here and this would fail. */
  /* `listen(\?|$)`, NOT `listen$` — the listen step writes its own
     `?overview` token on arrival (`lib/digitalCards.ts`, and the infographic
     work that introduced it), by `replace`, so the address this lands on
     carries it a frame later. Anchored on `listen$` this walk failed on
     `main` for a reason that had nothing to do with the deep link. */
  await expect(page).toHaveURL(new RegExp(`/session/${sessionId}/listen(\\?|$)`), {
    timeout: 15_000,
  });

  /* ── THE ROW ────────────────────────────────────────────────────────────
     By identity. The deep link chose the card, so "some card" would not be an
     assertion — and `card_id` and `track_id` are written in ONE update, so a
     pairing read from the wrong row fails here rather than on screen. */
  const db = service();
  const { data: session } = await db
    .from('sessions')
    .select('id, card_id, track_id, step, status')
    .eq('id', sessionId)
    .single();

  expect(session).toBeTruthy();
  expect(session!.card_id).toBe(CARD.id);
  expect(session!.track_id).toBe(CARD.track);
  /* Still running, and STANDING WHERE THE PERSON IS. The row is not
     bookkeeping here: it is what makes `listen` reachable at all, and a
     version that navigated without writing it would show the right URL for one
     frame and then redirect. Asserting the column is what tells those apart. */
  expect(session!.step).toBe('listen');
  expect(session!.status).toBe('started');

  /* THE ONE LOCALE-SPECIFIC ASSERTION, for the same reason as every other
     walk: a run that fell back to English satisfies everything above. */
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
});

test('a deep link with nothing running holds the card and offers the library', async ({ page }, testInfo) => {
  const locale = testInfo.project.name as Locale;
  test.setTimeout(120_000);

  await withLocale(page, locale);

  /* COUNTED BEFORE, because the walk above this one deliberately leaves a
     session holding MC-01 and `workers: 1` means it has already run. Asking
     "are there no sessions with this card" would therefore find that one and
     fail for a reason that has nothing to do with this test. What is actually
     being claimed is that THIS visit created nothing, which is a delta. */
  const db = service();
  const before = (await db.from('sessions').select('id')).data?.length ?? 0;

  /* Far enough to be a known visitor, and no further. THIS IS THE COMMONEST
     REAL CASE, not an edge: somebody holding the deck scans a card before
     choosing an exercise, because the card is the thing in their hand. It is
     therefore not dressed as an error — it says what was scanned and offers
     the one thing to do next. */
  await reachTheLibrary(page, locale);

  await page.goto(`/s/${CARD.code}`);

  /* The code appears in the headline, interpolated — which is also what proves
     the decoder ran rather than the route merely rendering. */
  await expect(
    page.getByText(label(locale, 'scan.noSession.title', { code: CARD.code }), { exact: true }),
  ).toBeVisible({ timeout: 15_000 });

  await page
    .getByRole('link', { name: label(locale, 'scan.chooseExercise'), exact: true })
    .click();
  await expect(page).toHaveURL(/\/exercises$/);

  /* NOTHING WAS WRITTEN. There was no session to write to, and a resolver that
     created one to have somewhere to put the card would be inventing a session
     nobody asked for — which is the failure this asserts against, because it
     would look entirely correct on screen. */
  const after = (await db.from('sessions').select('id')).data?.length ?? 0;
  expect(after).toBe(before);
});

/**
 * A DEEP LINK INTO A DIGITAL SESSION ENDS THE DIGITAL RUN.
 *
 * Ben, 2026-10-13, when the two could disagree: *Scan gewinnt*. Somebody turns
 * the switch off because the deck is not to hand, then finds it — and the
 * printed code is proof of that, where the switch was only an answer given
 * before they went looking.
 *
 * WHAT MAKES IT MORE THAN A COLUMN. `sessions.digital_cards` decides which
 * steps the run HAS (`20261014113500_view_and_select_are_steps.sql`), so a row
 * left saying `true` would put this person on `listen` under a rail naming
 * *Auswählen* — a step they never walked, offering the five cards the
 * deterministic deal picked, which need not include the one in their hand.
 * Asserted on the rail as well as on the row, because the rail is the part
 * they would see.
 *
 * Only a walk can reach it: `ScanLink` is a resolver with no screen, and the
 * disagreement is between a column it writes and a step list computed
 * somewhere else entirely.
 */
test('a deep link into a digital session turns the mode off', async ({ page }, testInfo) => {
  const locale = testInfo.project.name as Locale;
  test.setTimeout(120_000);

  await withLocale(page, locale);
  await reachTheLibrary(page, locale);
  /* Named rather than taken by position: one Supabase stack, and a
     maintenance UI that reorders this table is being built against it. */
  await startExercise(page, locale, locale === 'de' ? 'Achtsame Pause' : 'Mindful Break');

  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+\/intro$/, { timeout: 15_000 });
  const sessionId = (/\/session\/([0-9a-f-]+)\//.exec(page.url()) ?? [])[1];
  expect(sessionId).toBeTruthy();

  /* THE SWITCH OFF — the run is digital from here, and the rail says so. */
  const cards = page.getByRole('switch', {
    name: label(locale, 'session.intro.cardsPresent'),
  });
  await expect(cards).toBeVisible({ timeout: 15_000 });
  await cards.click();
  await expect(cards).not.toBeChecked();

  const rail = page.getByRole('navigation', { name: label(locale, 'session.wizardLabel') });
  await expect(
    rail.getByRole('button', { name: new RegExp(`^${label(locale, 'session.step.select')},`) }),
  ).toBeVisible();

  /* ── AND THEN THE DECK TURNS UP ─────────────────────────────────────────
     Cold, as a phone's camera app delivers it. The mode was never written to
     the row before this point — `advance` writes it on the way out of
     Einsteigen — so the loader has to read what the switch did, and this walk
     would pass against a version that only looked at its own URL. */
  await page.goto(`/s/${CARD.code}`);
  /* `listen(\?|$)`, NOT `listen$` — the listen step writes its own
     `?overview` token on arrival (`lib/digitalCards.ts`, and the infographic
     work that introduced it), by `replace`, so the address this lands on
     carries it a frame later. Anchored on `listen$` this walk failed on
     `main` for a reason that had nothing to do with the deep link. */
  await expect(page).toHaveURL(new RegExp(`/session/${sessionId}/listen(\\?|$)`), {
    timeout: 15_000,
  });

  const db = service();
  const { data: session } = await db
    .from('sessions')
    .select('card_id, track_id, step, digital_cards')
    .eq('id', sessionId)
    .single();

  expect(session).toBeTruthy();
  expect(session!.card_id).toBe(CARD.id);
  expect(session!.track_id).toBe(CARD.track);
  expect(session!.step).toBe('listen');
  /* THE DECISION, on the row. */
  expect(session!.digital_cards, 'the scan did not win').toBe(false);

  /* THE RAIL THE PERSON IS LOOKING AT — the paper run's, four markers, naming
     the step the scan actually finished. */
  await expect(
    rail.getByRole('button', { name: new RegExp(`^${label(locale, 'session.step.scan')},`) }),
  ).toBeVisible();
  await expect(
    rail.getByRole('button', { name: new RegExp(`^${label(locale, 'session.step.select')},`) }),
  ).toHaveCount(0);
  await expect(rail.getByRole('button')).toHaveCount(4);
});
