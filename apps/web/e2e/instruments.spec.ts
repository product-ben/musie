/**
 * The instruments, walked — 2026-11-09.
 *
 * One walk per instrument, from the library to the diary, asserting what the
 * brief promised and what no unit test can see:
 *
 *   · Kalimba, Marimba, Harfe are under „Entspannen“, behind „Alle Übungen
 *     zeigen“ (they are its fourth to sixth exercises);
 *   · Einsteigen says „Bevor es losgeht“ and holds the settings: „Duett mit
 *     Musie“ is chosen at first; on a desktop there is no vibration or motion
 *     switch (touch screens only — the phone walk below has them);
 *   · Musizieren says „Wenn du bereit bist, spiel auf der …“ and how to play
 *     with mouse and keyboard, and has no settings of its own;
 *   · the button opens the focus sheet and ONE demo note sounds, said in the
 *     status line — and the timer does NOT start from it;
 *   · the person's own note starts the timer, and the demo sentence goes;
 *   · Pause shows „Weiter zum Reflektieren“;
 *   · the sheet has no settings either: „Alleine“ chosen on Einsteigen is
 *     what the session stores;
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
  { id: 'kalimba', name: 'Kalimba', cta: 'Zur Kalimba' },
  { id: 'marimba', name: 'Marimba', cta: 'Zur Marimba' },
  { id: 'harp', name: 'Harfe', cta: 'Zur Harfe' },
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
    test(`${instrument.name}: from Entspannen to the diary`, async ({ page }) => {
      test.setTimeout(120_000);
      const userId = await signedIn(page);

      /* ── the library, under Entspannen ──────────────────────────────── */
      /* NO GOAL TO CHOOSE (2026-11-11): *entspannen* is the default now, so a
         fresh account opens on it — and pressing it in the sheet would change
         nothing and leave the sheet open. The headline's goal is what says
         which goal this is: its accessible name begins with the purpose. The
         instruments are relax's fourth to sixth exercises, and the list shows
         three until *Alle Übungen zeigen* is on. */
      await page.goto('/exercises');
      await page.getByRole('radio', { name: label(locale, 'exercises.view.list'), exact: true }).click();
      await expect(page.getByRole('button', { name: /^entspannen/ })).toBeVisible({ timeout: 15_000 });
      await page.getByRole('switch', { name: label(locale, 'exercises.showAll'), exact: true }).click();
      await page.getByRole('radiogroup', { name: label(locale, 'exercises.legend') })
        .getByRole('radio', { name: new RegExp(instrument.name) })
        .click();

      /* ── Einsteigen ─────────────────────────────────────────────────── */
      await expect(page).toHaveURL(/\/intro$/, { timeout: 15_000 });
      await expect(page.getByRole('heading', { name: 'Bevor es losgeht' })).toBeVisible();
      await expect(page.getByText(/nicht auf voller Lautstärke/)).toBeVisible();
      const mode = page.getByRole('radiogroup', { name: label(locale, 'session.intro.mode.legend') });
      await expect(mode.getByRole('radio', { name: /Duett mit Musie/ })).toBeChecked();
      /* A desktop: no switch to feel the instrument, none for the sensor. */
      await expect(page.getByRole('switch')).toHaveCount(0);
      await mode.getByRole('radio', { name: /Alleine/ }).click();
      await page.getByRole('button', { name: label(locale, 'common.continue'), exact: true }).click();

      /* ── Musizieren, the step: what to do, no settings ─────────────── */
      await expect(page).toHaveURL(/\/play$/);
      await expect(page.getByRole('heading', { name: `Wenn du bereit bist, spiel auf der ${instrument.name}` })).toBeVisible();
      await expect(page.getByText(/indem du deine Tastatur nutzt/)).toBeVisible();
      await expect(page.getByRole('radiogroup')).toHaveCount(0);
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
      /* Started: the instrument's button says „Weiterspielen“ (Ben). */
      await expect(page.getByRole('button', { name: label(locale, 'session.play.keepPlaying'), exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: instrument.cta, exact: true })).toHaveCount(0);

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

/* ── ON A PHONE ──────────────────────────────────────────────────────────────
   What a touch screen adds (Ben, 2026-11-09): on Einsteigen the switch to
   feel the instrument, on by default; on Musizieren the how-to for fingers.
   The motion switch is not walked: an emulated phone sends no motion data and
   has no iOS prompt, so the section stays away — the real phone is its test. */
test.describe('the instruments on a phone', () => {
  test.skip(({ locale: browserLocale }) => browserLocale !== 'de-DE', 'German only — see the header');
  test.use({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });

  test('Kalimba: the vibration switch on Einsteigen, the touch how-to on Musizieren', async ({ page }) => {
    const userId = await signedIn(page);
    const { data: row, error } = await service().from('sessions')
      .insert({ user_id: userId, exercise_id: 'kalimba', goal_id: 'relax', status: 'started', step: 'intro' })
      .select('id').single();
    if (error !== null) throw error;
    await page.goto(`/session/${row.id}/intro`);

    await expect(page.getByRole('heading', { name: 'Bevor es losgeht' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: label(locale, 'session.intro.vibration.title') })).toBeVisible();
    await expect(page.getByRole('switch', { name: label(locale, 'session.intro.vibration.label') })).toBeChecked();
    await page.getByRole('button', { name: label(locale, 'common.continue'), exact: true }).click();

    await expect(page).toHaveURL(/\/play$/);
    await expect(page.getByText(/mehrere Zungen mit deinen Fingern berührst/)).toBeVisible();
    await expect(page.getByText(/Tastatur/)).toHaveCount(0);

    await service().auth.admin.deleteUser(userId);
  });
});
