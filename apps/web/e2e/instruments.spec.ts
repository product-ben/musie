/**
 * The instruments, walked — 2026-11-09.
 *
 * One walk per instrument, from the library to the diary, asserting what the
 * brief promised and what no unit test can see:
 *
 *   · Kalimba, Marimba, Harfe are under „Entspannung“;
 *   · Einsteigen shows the volume hint always, and the motion state for the
 *     two instruments that use a sensor (the harp shows none);
 *   · Musizieren starts in „mit Musie“, the vibration switch is on where the
 *     browser can vibrate;
 *   · the button opens the focus sheet and ONE demo note sounds, said in the
 *     status line — and the timer does NOT start from it;
 *   · the person's own note starts the timer, and the demo sentence goes;
 *   · Pause shows „Weiter zum Reflektieren“;
 *   · the settings are made on the step, before: the sheet has none, and
 *     „allein“ chosen on the step is still „allein“ after the sheet;
 *   · Weiter stores the mode and the seconds on the session, and the
 *     reflection reaches the diary as it does for every exercise.
 *
 * German only: the copy under test is the exercises' own, and the English
 * walk would assert the same rows in another language. The account is
 * created by the service role and signed in by password — the sign-in screen
 * mails a one-time code, which this walk is not about.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { label, service, stack } from './support';

const INSTRUMENTS = [
  { id: 'kalimba', name: 'Kalimba', cta: 'Zur Kalimba', sensor: true },
  { id: 'marimba', name: 'Marimba', cta: 'Zur Marimba', sensor: true },
  { id: 'harp', name: 'Harfe', cta: 'Zur Harfe', sensor: false },
] as const;

const locale = 'de' as const;

async function signedIn(page: Page): Promise<string> {
  const admin = service();
  const email = `instruments-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@musie.test`;
  const password = `walk-${Math.random().toString(36).slice(2)}A1!`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error !== null) throw created.error;
  const userId = created.data.user.id;

  /* The two data questions, answered „no“, so the consent card does not
     stand between the walk and the library. */
  const now = new Date().toISOString();
  const answered = await admin.from('profiles').update({
    analytics_consent: 'refused', analytics_consent_at: now, analytics_consent_version: '2026-10-20',
    research_consent: 'refused', research_consent_at: now, research_consent_version: '2026-10-20',
  }).eq('user_id', userId);
  if (answered.error !== null) throw answered.error;

  const signed = await admin.auth.signInWithPassword({ email, password });
  if (signed.error !== null) throw signed.error;
  const storageKey = `sb-${new URL(stack().API_URL).hostname.split('.')[0]}-auth-token`;
  await page.addInitScript(([key, value]) => { localStorage.setItem(key, value); }, [storageKey, JSON.stringify(signed.data.session)]);
  return userId;
}

test.describe('the instruments', () => {
  test.skip(({ locale: browserLocale }) => browserLocale !== 'de-DE', 'German only — see the header');

  for (const instrument of INSTRUMENTS) {
    test(`${instrument.name}: from Entspannung to the diary`, async ({ page }) => {
      test.setTimeout(120_000);
      const userId = await signedIn(page);

      /* ── the library, under Entspannung ─────────────────────────────── */
      await page.goto('/exercises');
      await page.getByRole('radio', { name: label(locale, 'exercises.view.list'), exact: true }).click();
      await page.getByRole('button', { name: new RegExp(label(locale, 'exercises.goal.change')) }).click();
      const goals = page.getByRole('radiogroup', { name: label(locale, 'exercises.goal.question') });
      await goals.getByRole('radio', { name: /Entspannung/ }).click();
      await expect(goals).toBeHidden();
      await page.getByRole('radiogroup', { name: label(locale, 'exercises.legend') })
        .getByRole('radio', { name: new RegExp(instrument.name) })
        .click();

      /* ── Einsteigen ─────────────────────────────────────────────────── */
      await expect(page).toHaveURL(/\/intro$/, { timeout: 15_000 });
      await expect(page.getByText(/Stell dein Handy etwas leiser als sonst\./)).toBeVisible();
      /* The motion section: not asked yet, so the button; pressed, a state
         is said — Chromium on a desktop has no sensor prompt, so it is
         „allowed“, „not allowed“ or „no movement reported“. The harp has no
         motion section at all. */
      const allow = page.getByRole('button', { name: label(locale, 'session.play.motion.allow'), exact: true });
      if (instrument.sensor) {
        await allow.click();
        const said = [
          label(locale, 'session.play.motion.granted'),
          label(locale, 'session.play.motion.denied'),
          label(locale, 'session.play.motion.unavailable'),
        ].map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        await expect(page.getByRole('status').filter({ hasText: new RegExp(said.join('|')) })).toBeVisible();
      } else {
        await expect(allow).toHaveCount(0);
      }
      await page.getByRole('button', { name: label(locale, 'common.continue'), exact: true }).click();

      /* ── Musizieren, the step ───────────────────────────────────────── */
      await expect(page).toHaveURL(/\/play$/);
      const stepMode = page.getByRole('radiogroup', { name: label(locale, 'session.play.mode.legend') });
      await expect(stepMode.getByRole('radio', { name: /mit Musie/ })).toBeChecked();
      await expect(page.getByRole('switch', { name: label(locale, 'session.play.vibration') })).toBeChecked();
      await stepMode.getByRole('radio', { name: /allein/ }).click();
      await page.getByRole('button', { name: instrument.cta, exact: true }).click();

      /* ── the sheet: one demo note, and it does not start the timer ─── */
      await expect(page).toHaveURL(/focus/);
      await expect(page.getByText(label(locale, 'session.play.demo'))).toBeVisible({ timeout: 10_000 });
      const timer = page.getByRole('timer');
      await page.waitForTimeout(1500);
      await expect(timer).toHaveText('01:30');

      /* ── the person's own note starts it ────────────────────────────── */
      const canvas = page.locator('canvas.musie-instrument__canvas');
      const box = await canvas.boundingBox();
      if (box === null) throw new Error('no canvas');
      for (const fx of [0.3, 0.5, 0.42]) {
        const x = box.x + box.width * fx;
        const y = box.y + box.height * 0.5;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + 25, y, { steps: 3 });
        await page.mouse.up();
        await page.waitForTimeout(300);
      }
      await expect(timer).not.toHaveText('01:30', { timeout: 3_000 });
      await expect(page.getByText(label(locale, 'session.play.demo'))).toHaveCount(0);

      /* ── Pause shows the way on ─────────────────────────────────────── */
      await expect(page.getByRole('button', { name: label(locale, 'session.play.continue') })).toHaveCount(0);
      await page.getByRole('button', { name: new RegExp(`^${label(locale, 'session.play.timer.pause')}`) }).click();
      await expect(page.getByRole('button', { name: label(locale, 'session.play.continue') }).first()).toBeVisible();

      /* ── the sheet has no settings; the step's choice survives it ────── */
      const sheet = page.locator('.musy-sheet');
      await expect(sheet.getByRole('radiogroup')).toHaveCount(0);
      await expect(sheet.getByRole('switch')).toHaveCount(0);
      await page.getByRole('button', { name: label(locale, 'session.play.close') }).click();
      await expect(page).not.toHaveURL(/focus/);
      /* Gone, not only closing: during its exit the sheet's own Weiter is
         still there beside the row's. */
      await expect(sheet).toHaveCount(0);
      await expect(stepMode.getByRole('radio', { name: /allein/ })).toBeChecked();

      /* ── Weiter: mode and seconds on the row ────────────────────────── */
      await page.getByRole('button', { name: label(locale, 'session.play.continue'), exact: true }).click();
      await expect(page).toHaveURL(/\/reflect$/);
      await expect.poll(async () => {
        const { data } = await service().from('sessions')
          .select('exercise_id, play_mode, play_seconds').eq('user_id', userId).maybeSingle();
        return data;
      }).toMatchObject({ exercise_id: instrument.id, play_mode: 'solo' });
      const { data: row } = await service().from('sessions').select('play_seconds').eq('user_id', userId).single();
      expect(row?.play_seconds).toBeGreaterThanOrEqual(1);

      /* ── the reflection reaches the diary, as for every exercise ────── */
      await page.getByRole('button', { name: label(locale, 'reflect.save'), exact: true }).click();
      await page.getByRole('button', { name: label(locale, 'reflect.incomplete.save'), exact: true }).click();
      await expect(page).toHaveURL(/\/diary$/, { timeout: 15_000 });
      await expect(page.getByText(label(locale, 'diary.latest'))).toBeVisible();
      const { data: done } = await service().from('sessions').select('status').eq('user_id', userId).single();
      expect(done?.status).toBe('finished');

      await service().auth.admin.deleteUser(userId);
    });
  }
});
