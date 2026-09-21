/**
 * The camera on this device — E.2, and E.3's decoder underneath it.
 *
 * ── WHAT IS REAL HERE AND WHAT IS NOT ─────────────────────────────────────
 * Everything except the photons. Chromium is launched with a y4m file standing
 * in for a camera (`fakeCamera.ts`), so `getUserMedia` returns a genuine
 * `MediaStream`, the `<video>` genuinely plays it, the polling loop genuinely
 * runs, and the decoder genuinely decodes — and on the Chromium these walks
 * use, the decoder is E.3's WebAssembly one, because `BarcodeDetector` does
 * not exist on macOS Chrome. So this walk exercises both steps at once.
 *
 * What it cannot do is hold a phone up. E.3's done-when is *it scans on iPhone
 * Safari*, and no runner closes that — a physical device is the only thing
 * that proves autoplay under iOS, the back-camera constraint and the wasm
 * fetch over a real connection. This is the rest of it.
 *
 * ── THE SECOND WALK IS THE ONE THAT MATTERS MOST ──────────────────────────
 * A refused permission. The camera is a FALLBACK — the common way in is the
 * phone's own camera app following the printed link — so the promise E.2 makes
 * is that saying no costs nothing. That is a promise about what happens when
 * the feature does not work, which is exactly the kind nobody tests and
 * everybody assumes, so it is walked: refuse, read the sentence, type the code
 * instead, and finish with a card on the session.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { SCANNED_CARD } from './fakeCamera';
import { enterCode, label, reachTheLibrary, service, withLocale } from './support';
import type { Locale } from './support';

/** A card neither other walk uses, so the three of them together prove the
 *  pairing is looked up per card rather than defaulted. */
const TYPED_INSTEAD = { code: 'MC-06', id: 'mc-06', track: 'trk-06' };

/**
 * Explainer → About you → library → the one implemented exercise → intro →
 * scan. Shared by both walks below so they cannot disagree about the preamble.
 */
async function reachTheScanStep(page: Page, locale: Locale): Promise<string> {
  await withLocale(page, locale);
  await reachTheLibrary(page, locale);

  await page.getByRole('radio').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: label(locale, 'exercises.start'), exact: true }).click();

  await expect(page).toHaveURL(/\/session\/[0-9a-f-]+\/intro$/);
  const sessionId = (/\/session\/([0-9a-f-]+)\//.exec(page.url()) ?? [])[1];
  expect(sessionId).toBeTruthy();

  await page.getByRole('button', { name: label(locale, 'common.continue'), exact: true }).click();
  await expect(page).toHaveURL(/\/scan$/);

  return sessionId;
}

test('the camera reads a card and the session takes it', async ({ page, context }, testInfo) => {
  const locale = testInfo.project.name as Locale;
  /* Generous: the first decode on this path downloads and instantiates a
     WebAssembly module, which the other walks never touch. */
  test.setTimeout(180_000);

  /* Granted HERE rather than in the config, so the walk below can refuse. */
  await context.grantPermissions(['camera']);

  const sessionId = await reachTheScanStep(page, locale);

  /* ── THE ONE PRESS ──────────────────────────────────────────────────────
     Nothing has asked for a camera yet, and that is the design: arriving at
     the step must not produce a permission prompt. The button is what does. */
  await page
    .getByRole('button', { name: label(locale, 'session.scan.cameraStart'), exact: true })
    .click();

  /* The preview runs, and the line under the frame says what to do with it.
     Asserted because it is the only thing on screen that distinguishes a
     camera that opened from one that is about to fail. */
  await expect(page.getByText(label(locale, 'session.scan.cameraLive'), { exact: true }))
    .toBeVisible({ timeout: 30_000 });

  /* ── AND THEN IT READS THE CODE ─────────────────────────────────────────
     Nothing is clicked from here on. The loop decodes the frame, the code is
     put in the field, the field is submitted, and the card arrives — which is
     the whole of E.2 in one assertion that nobody helped along. */
  await expect(page.getByText(label(locale, 'session.scan.yourCard'), { exact: true }))
    .toBeVisible({ timeout: 60_000 });

  /* The card's own code, on screen, beside its feeling. It proves WHICH card
     was read rather than that some card was — the clip holds MC-03 and no
     other walk uses it. */
  await expect(page.getByText(new RegExp(SCANNED_CARD.code))).toBeVisible();

  /* ── THE ROW ────────────────────────────────────────────────────────────
     By identity, and both columns: `card_id` and `track_id` are written in one
     update, so a camera path that had grown its own write would fail here
     rather than on screen. */
  const db = service();
  const { data: session } = await db
    .from('sessions')
    .select('id, card_id, track_id, status')
    .eq('id', sessionId)
    .single();

  expect(session).toBeTruthy();
  expect(session!.card_id).toBe(SCANNED_CARD.id);
  expect(session!.track_id).toBe(SCANNED_CARD.track);
  /* Reading a card must not advance the session past the step that shows it. */
  expect(session!.status).toBe('started');

  await expect(page.locator('html')).toHaveAttribute('lang', locale);
});

test('saying no to the camera costs nothing', async ({ page, context }, testInfo) => {
  const locale = testInfo.project.name as Locale;
  test.setTimeout(120_000);

  /* NOT granted. Chromium refuses a permission nobody granted, so
     `getUserMedia` rejects with NotAllowedError — which is the same rejection
     a person produces by pressing Block, and `cameraFailure` maps it to the
     same sentence. */
  await context.clearPermissions();

  const sessionId = await reachTheScanStep(page, locale);

  await page
    .getByRole('button', { name: label(locale, 'session.scan.cameraStart'), exact: true })
    .click();

  /* It says what is true and stops. No apology, and — asserted below — no
     button offering to ask again. */
  await expect(page.getByText(label(locale, 'session.scan.cameraDenied'), { exact: true }))
    .toBeVisible({ timeout: 30_000 });

  await expect(
    page.getByRole('button', { name: label(locale, 'session.scan.cameraRetry'), exact: true }),
  ).toHaveCount(0);

  /* ── THE PROMISE THE WHOLE STEP RESTS ON ────────────────────────────────
     The typed field still works, and it still writes both columns. A refusal
     that left the step unable to name a card would be the camera having taken
     something away by being added. */
  await enterCode(page, locale, TYPED_INSTEAD.code);
  await expect(page.getByText(label(locale, 'session.scan.yourCard'), { exact: true }))
    .toBeVisible({ timeout: 15_000 });

  const db = service();
  const { data: session } = await db
    .from('sessions')
    .select('id, card_id, track_id')
    .eq('id', sessionId)
    .single();

  expect(session).toBeTruthy();
  expect(session!.card_id).toBe(TYPED_INSTEAD.id);
  expect(session!.track_id).toBe(TYPED_INSTEAD.track);
});
